"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Campaign, ExchangeRate } from "@/lib/finance";
import { currency } from "@/lib/finance";
import { trmCurrency, bogotaDate, pendingUsdCents, usdCentsToCop, usdCurrency, usdToCents } from "@/lib/usd";
import { fetchExchangeRate } from "@/lib/usd-client";
import { useFinance } from "@/components/finance-provider";

export function UsdPaymentDialog({ campaign, onClose, onSaved }: { campaign: Campaign; onClose: () => void; onSaved?: (amount: number) => void }) {
  const { addUsdPayment } = useFinance();
  const dialog = useRef<HTMLDialogElement>(null);
  const [amount, setAmount] = useState(String(pendingUsdCents(campaign) / 100));
  const [date, setDate] = useState(bogotaDate());
  const [quote, setQuote] = useState<ExchangeRate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetchExchangeRate(date, controller.signal).then((rate) => { if (!controller.signal.aborted) { setQuote(rate); setError(null); } }).catch((failure) => { if (!controller.signal.aborted) { setQuote(null); setError(failure instanceof Error ? failure.message : "No fue posible consultar la TRM"); } });
    return () => controller.abort();
  }, [date]);
  const ready = quote?.date === date;
  let cents = 0;
  try { cents = usdToCents(amount); } catch { /* Invalid input keeps the submit disabled. */ }
  let converted: number | null = null;
  try { if (ready && quote && cents > 0) converted = usdCentsToCop(cents, quote.value); } catch { /* Out-of-range amounts cannot be saved. */ }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !quote || saving) return;
    setSaving(true);
    try { addUsdPayment(campaign.id, cents, date, quote); onSaved?.(usdCentsToCop(cents, quote.value)); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible registrar el pago"); setSaving(false); }
  }
  return <dialog ref={dialog} aria-labelledby="usd-payment-title" onCancel={onClose} className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl border-0 bg-white p-5 text-slate-800 shadow-xl backdrop:bg-slate-950/40">
    <div className="flex items-start justify-between gap-3"><div><h2 id="usd-payment-title" className="text-lg font-bold">Registrar pago en dólares</h2><p className="mt-1 text-sm text-slate-500">{campaign.name}</p></div><button className="button-secondary" type="button" aria-label="Cerrar registro de pago" onClick={onClose}>✕</button></div>
    <p className="mt-3 text-sm">Pendiente: <strong>{usdCurrency.format(pendingUsdCents(campaign) / 100)}</strong></p>
    <form className="mt-4 space-y-4" onSubmit={submit}>
      <label className="block"><span className="label">Pago recibido en USD</span><input className="field" name="usdPayment" type="number" inputMode="decimal" step="0.01" min="0.01" max={pendingUsdCents(campaign) / 100} value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
      <label className="block"><span className="label">Fecha real de recepción</span><input className="field" name="paymentDate" type="date" value={date} max={bogotaDate()} onChange={(event) => setDate(event.target.value)} required /></label>
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3" aria-live="polite">{ready && quote ? <><p className="text-xs text-emerald-800">TRM oficial del {quote.date}: {trmCurrency.format(quote.value)} COP por USD</p><p className="mt-1 text-xl font-bold text-emerald-950">{converted !== null ? currency.format(converted) : "—"}</p><p className="mt-1 text-[11px] text-emerald-800">Este valor quedará fijo. Solo el saldo en dólares pendiente cambiará con la TRM.</p></> : <p className="text-sm text-emerald-800">{error ? "La TRM no está disponible para esa fecha." : "Consultando la TRM de esa fecha…"}</p>}</div>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <button className="button w-full disabled:opacity-50" disabled={!ready || converted === null || cents <= 0 || cents > pendingUsdCents(campaign) || saving} type="submit">Guardar pago</button>
    </form>
  </dialog>;
}
