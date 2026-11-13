import type { Campaign } from "@/lib/finance";
import { currency } from "@/lib/finance";
import { trmCurrency, pendingUsdCents, scheduledTrmDate, usdCurrency } from "@/lib/usd";

export function CampaignUsdDetails({ campaign }: { campaign: Campaign }) {
  if (campaign.currency !== "USD") return null;
  const pending = pendingUsdCents(campaign);
  return <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-2.5 py-2 text-[11px] text-indigo-950">
    <p className="font-semibold">Acordado: {usdCurrency.format((campaign.usdValueCents ?? 0) / 100)}{pending > 0 ? ` · Pendiente: ${usdCurrency.format(pending / 100)}` : " · Pagada"}</p>
    {pending > 0 ? <p className="mt-1">Valor en COP estimado · TRM {trmCurrency.format(campaign.exchangeRate ?? 0)} del {campaign.exchangeRateDate ?? "sin fecha"}{(!campaign.exchangeRateDate || campaign.exchangeRateDate < scheduledTrmDate()) ? " (última disponible; pendiente de actualizar)" : ""}.</p> : <p className="mt-1">Valor en COP fijado con la TRM de cada pago.</p>}
    {campaign.payments.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-medium">Pagos en dólares ({campaign.payments.length})</summary><ul className="mt-2 space-y-2">{campaign.payments.map((payment) => <li key={payment.id}>{payment.date} · {usdCurrency.format((payment.usdAmountCents ?? 0) / 100)} → <strong>{currency.format(payment.amount)} COP</strong><span className="block text-indigo-800">TRM guardada: {trmCurrency.format(payment.exchangeRate ?? 0)} · {payment.exchangeRateDate}</span></li>)}</ul></details>}
  </div>;
}
