"use client";

import { useEffect, useRef, useState } from "react";
import type { Campaign, ExchangeRate } from "@/lib/finance";
import { currency } from "@/lib/finance";
import { trmCurrency, bogotaDate, makeUsdPayment, pendingUsdCents, usdCentsToCop, usdToCents } from "@/lib/usd";
import { fetchExchangeRate } from "@/lib/usd-client";
import { useFinance } from "@/components/finance-provider";

export function campaignMoneyFromForm(form: FormData, quote?: ExchangeRate, campaign?: Campaign): Pick<Campaign, "value" | "currency" | "usdValueCents" | "exchangeRate" | "exchangeRateDate"> {
  const money = String(form.get("currency") ?? "COP");
  if (money === "USD") {
    const cents = usdToCents(String(form.get("value")));
    if (campaign?.currency === "USD" && pendingUsdCents(campaign) === 0 && cents === campaign.usdValueCents) return { currency: "USD", usdValueCents: cents, value: campaign.value, exchangeRate: campaign.exchangeRate, exchangeRateDate: campaign.exchangeRateDate };
    if (!quote || quote.date !== bogotaDate()) throw new Error("Actualiza la TRM vigente antes de guardar la campaña en dólares");
    return { currency: "USD", usdValueCents: cents, exchangeRate: quote.value, exchangeRateDate: quote.date, value: usdCentsToCop(cents, quote.value) };
  }
  return { currency: "COP", usdValueCents: undefined, exchangeRate: undefined, exchangeRateDate: undefined, value: Number(form.get("value")) };
}

export async function prepareCampaignMoney(form: FormData, quote: ExchangeRate | undefined, campaign: Campaign) {
  const money = campaignMoneyFromForm(form, quote, campaign);
  if (money.currency !== "USD" || campaign.currency === "USD" || campaign.payments.length === 0) return money;
  const inputs = campaign.payments.map((payment) => ({
    payment,
    cents: usdToCents(String(form.get(`historical-usd-${payment.id}`) ?? "")),
    date: String(form.get(`historical-date-${payment.id}`) ?? payment.date),
  }));
  const rates = new Map(await Promise.all([...new Set(inputs.map((input) => input.date))].map(async (date) => [date, await fetchExchangeRate(date)] as const)));
  const converted: Campaign = { ...campaign, ...money, payments: [] };
  for (const { payment, cents, date } of inputs) {
    converted.payments.push(makeUsdPayment(converted, cents, date, rates.get(date)!, payment.id));
  }
  return { ...money, payments: converted.payments };
}

export function CampaignCurrencyFields({ campaign }: { campaign?: Campaign }) {
  const { data, refreshExchangeRate, exchangeRateError } = useFinance();
  const [money, setMoney] = useState(campaign?.currency ?? "COP");
  const [amount, setAmount] = useState(String(campaign?.currency === "USD" ? (campaign.usdValueCents ?? 0) / 100 : campaign?.value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);
  const quote = data.exchangeRate?.date === bogotaDate() ? data.exchangeRate : undefined;
  const locked = campaign?.currency === "USD" && Boolean(campaign.payments.length);
  const convertingPaid = money === "USD" && campaign?.currency !== "USD" && Boolean(campaign?.payments.length);
  const minimum = money === "USD" ? (campaign?.payments.reduce((sum, payment) => sum + (payment.usdAmountCents ?? 0), 0) ?? 0) / 100 : campaign?.payments.reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
  let fixed = false;
  try { fixed = money === "USD" && campaign?.currency === "USD" && pendingUsdCents(campaign) === 0 && usdToCents(amount) === campaign.usdValueCents; } catch { /* Amount is still being edited. */ }
  useEffect(() => {
    inputRef.current?.setCustomValidity(money === "USD" && !quote && !fixed ? "Espera o actualiza la TRM vigente para guardar en dólares" : "");
  }, [money, quote, fixed]);
  let converted: string | null = null;
  try { if (money === "USD" && quote && amount) converted = currency.format(usdCentsToCop(usdToCents(amount), quote.value)); } catch { /* The input validation and submit handler report invalid decimals. */ }
  return <>
    <label><span className="label">Moneda de la campaña</span><select className="field" name={locked ? undefined : "currency"} value={money} disabled={locked} onChange={(event) => { setMoney(event.target.value as "COP" | "USD"); setAmount(""); }}><option value="COP">Pesos colombianos (COP)</option><option value="USD">Dólares (USD)</option></select>{locked && <><input type="hidden" name="currency" value={money} /><span className="mt-1 block text-[10px] text-slate-500">La moneda se conserva porque hay pagos registrados.</span></>}</label>
    <label><span className="label">{money === "USD" ? "Valor acordado en dólares (USD)" : "Valor acordado en pesos (COP)"}</span><input ref={inputRef} className="field" name="value" aria-label={money === "USD" ? "Valor en dólares" : "Valor en pesos"} type="number" inputMode="decimal" min={minimum} step={money === "USD" ? "0.01" : "1"} value={amount} onChange={(event) => setAmount(event.target.value)} required />{money === "USD" && <span className="mt-1 block text-xs text-slate-500">{fixed ? `Pagos fijados: ${currency.format(campaign!.value)} COP · TRM de cada pago` : converted ? `≈ ${converted} COP · TRM ${trmCurrency.format(quote!.value)} del ${quote!.date}` : "Consultando la TRM vigente…"}</span>}{money === "USD" && !fixed && exchangeRateError && <span className="mt-1 block text-xs text-amber-700">{exchangeRateError} <button className="underline" type="button" onClick={() => { void refreshExchangeRate(); }}>Reintentar TRM</button></span>}</label>
    {convertingPaid && <fieldset className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:col-span-2">
      <legend className="px-1 text-sm font-semibold text-amber-950">Pagos anteriores en dólares</legend>
      <p className="text-xs text-amber-900">Indica el importe original en USD de cada pago. Al guardar, sus valores en pesos se recalculan con la TRM de la fecha de recepción. No se adivinan los dólares a partir de los pesos.</p>
      {campaign!.payments.map((payment, index) => <div key={payment.id} className="grid gap-2 rounded-lg bg-white p-2 sm:grid-cols-2"><label><span className="label">Pago {index + 1} en USD (antes: {currency.format(payment.amount)} COP)</span><input className="field" type="number" name={`historical-usd-${payment.id}`} min="0.01" step="0.01" inputMode="decimal" required /></label><label><span className="label">Fecha real del pago {index + 1}</span><input className="field" type="date" name={`historical-date-${payment.id}`} defaultValue={payment.date} max={bogotaDate()} required /></label></div>)}
    </fieldset>}
  </>;
}
