"use client";

import { useFinance } from "@/components/finance-provider";
import { currency } from "@/lib/finance";

export default function ReceivablesPage() {
  const { data, addPayment } = useFinance();
  const pending = data.campaigns.map((campaign) => ({ campaign, paid: campaign.payments.reduce((sum, payment) => sum + payment.amount, 0) })).filter(({ campaign, paid }) => campaign.value > paid);
  const total = pending.reduce((sum, item) => sum + item.campaign.value - item.paid, 0);
  function pay(id: string, maximum: number) { addPayment(id, maximum); }
  return <div className="mx-auto max-w-6xl"><header className="mb-7"><p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Dinero pendiente</p><h1 className="mt-2 text-3xl font-bold">Cuentas por cobrar</h1><p className="mt-2 text-slate-600">Las campañas que todavía no han sido pagadas completamente.</p></header><div className="mb-6 rounded-3xl bg-emerald-100 p-6"><p className="text-sm text-emerald-800">Total pendiente</p><p className="mt-2 text-3xl font-bold text-emerald-950">{currency.format(total)}</p></div><div className="grid gap-4 lg:grid-cols-2">{pending.map(({ campaign, paid }) => <article className="card" key={campaign.id}><div className="flex justify-between gap-4"><div><h2 className="font-semibold">{campaign.name}</h2><p className="mt-1 text-sm text-slate-500">{campaign.brand} · {campaign.month}</p></div><div className="text-right"><p className="font-bold text-rose-600">{currency.format(campaign.value - paid)}</p><p className="text-xs text-slate-500">de {currency.format(campaign.value)}</p></div></div><button className="button mt-4" onClick={() => pay(campaign.id, campaign.value - paid)}>Registrar pago</button></article>)}</div></div>;
}
