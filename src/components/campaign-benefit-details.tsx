import type { Campaign } from "@/lib/finance";
import { currency } from "@/lib/finance";
import { collaborationKind } from "@/lib/finance-insights";
import { bogotaDate } from "@/lib/usd";

export function CampaignBenefitDetails({ campaign }: { campaign: Campaign }) {
  const benefit = campaign.benefit;
  if (!benefit) return collaborationKind(campaign) === "paid" ? null : <p className="mt-2 rounded-xl bg-violet-50 p-3 text-xs text-violet-800">Beneficio por definir. Puedes completar sus datos desde Editar.</p>;
  const expired = benefit.kind === "voucher" && benefit.expiresOn && benefit.expiresOn < bogotaDate();
  return <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3" aria-label="Beneficio de la colaboración">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-violet-950">{benefit.kind === "products" ? "🎁 Canje por productos" : "🎟 Bono o saldo"}</p><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${benefit.received ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{benefit.received ? "Recibido" : "Por recibir"}</span></div>
    <p className="mt-2 break-words text-sm font-medium text-slate-800">{benefit.description}</p>
    {benefit.kind === "products" ? <p className="mt-1 text-xs text-slate-500">{benefit.quantity} {benefit.quantity === 1 ? "producto" : "productos"}</p> : <>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-slate-500">Valor del bono</dt><dd className="mt-1 font-bold">{currency.format(benefit.amount)}</dd></div><div><dt className="text-slate-500">{benefit.received ? "Saldo del bono" : "Estado del bono"}</dt><dd className="mt-1 font-bold">{benefit.received ? currency.format(benefit.amount - benefit.usedAmount) : "Por recibir"}</dd></div></dl>
      {benefit.usedAmount > 0 && <p className="mt-2 text-[11px] text-slate-500">Utilizado: {currency.format(benefit.usedAmount)}</p>}
      {benefit.expiresOn && <p className={`mt-2 text-[11px] ${expired ? "font-semibold text-rose-700" : "text-slate-500"}`}>{expired ? "Bono vencido" : "Vence"}: {benefit.expiresOn}</p>}
      <p className="mt-2 text-[10px] text-violet-800">Beneficio para usar, no dinero disponible.</p>
    </>}
  </div>;
}
