"use client";

import { useState } from "react";
import { ContentNavigation } from "@/components/content-navigation";
import { useFinance } from "@/components/finance-provider";
import { BrandRanking } from "@/components/brand-ranking";
import { campaignsByBrand } from "@/lib/finance-insights";
import { currency } from "@/lib/finance";

export default function BrandsPage() {
  const { data } = useFinance();
  const [selectedBrand, setSelectedBrand] = useState("");
  const [showPaid, setShowPaid] = useState(false);
  const brands = campaignsByBrand(data.campaigns);
  const selected = brands.find((brand) => brand.id === selectedBrand);
  const campaigns = selected?.campaigns ?? [];
  const agreed = campaigns.reduce((sum, campaign) => sum + campaign.value, 0);
  const paid = campaigns.reduce((sum, campaign) => sum + campaign.payments.reduce((total, payment) => total + payment.amount, 0), 0);
  const pending = (campaign: (typeof campaigns)[number]) => Math.max(campaign.value - campaign.payments.reduce((sum, payment) => sum + payment.amount, 0), 0);
  const visible = campaigns.filter((campaign) => showPaid || pending(campaign) > 0 || campaign.value === 0)
    .sort((a, b) => (b.month ?? b.dueDate).localeCompare(a.month ?? a.dueDate));
  const paidCount = campaigns.filter((campaign) => campaign.value > 0 && pending(campaign) === 0).length;

  return <div className="mx-auto max-w-7xl">
    <ContentNavigation />
    <header className="mb-6"><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Contenidos</p><h1 className="mt-2 text-3xl font-bold">Marcas</h1><p className="mt-2 text-slate-600">Selecciona una marca para consultar sus campañas y pagos de todos los meses.</p></header>
    <label className="mb-6 block max-w-md"><span className="label">Seleccionar marca</span><select className="field" aria-label="Seleccionar marca" value={selected?.id ?? ""} onChange={(event) => { setSelectedBrand(event.target.value); setShowPaid(false); }}>
      <option value="">Selecciona una marca</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name} ({brand.campaigns.length})</option>)}
    </select></label>
    {selected ? <section aria-label={`Campañas de ${selected.name}`}>
      <div className="flex items-start justify-between gap-3"><h2 className="min-w-0 text-xl font-bold">{selected.name}</h2>{paidCount > 0 && <button type="button" className="button-secondary ml-auto shrink-0" aria-pressed={showPaid} onClick={() => setShowPaid(!showPaid)}>{showPaid ? `Ocultar pagados (${paidCount})` : `Mostrar pagados (${paidCount})`}</button>}</div>
      <dl className="my-3 grid grid-cols-2 gap-2 xl:grid-cols-4" aria-label="Resumen de marca">
        {[["Campañas", String(campaigns.length)], ["Total acordado", currency.format(agreed)], ["Recibido", currency.format(paid)], ["Por cobrar", currency.format(campaigns.reduce((sum, campaign) => sum + pending(campaign), 0))]].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 sm:p-4"><dt className="text-[10px] font-medium text-slate-500 sm:text-xs">{label}</dt><dd className="mt-1 break-words text-base font-bold tracking-tight tabular-nums sm:text-xl">{value}</dd></div>)}
      </dl>
      <div className="grid gap-4 lg:grid-cols-2">{visible.map((campaign) => <article className="card" key={campaign.id}>
        <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{campaign.name}</h3><p className="mt-1 text-sm text-slate-500">{campaign.month ?? campaign.dueDate.slice(0, 7)} · {campaign.network}</p><p className="mt-1 text-sm text-slate-500">{campaign.collaborationType ?? "Paga"} · {campaign.status}</p></div><div className="text-right"><p className="font-bold">{currency.format(campaign.value)}</p><p className="mt-1 text-sm text-slate-500">{campaign.value === 0 ? "Canje / sin cobro" : pending(campaign) > 0 ? `${currency.format(pending(campaign))} por cobrar` : "Pagada"}</p></div></div>
        <p className="mt-3 text-sm text-slate-500">Pago esperado: {campaign.dueDate}</p>{campaign.contentDueDate && <p className="mt-1 text-sm text-slate-500">Publicación: {campaign.contentDueDate}</p>}
      </article>)}</div>
      {visible.length === 0 && <p className="card text-slate-500">No hay campañas pendientes de pago. Puedes consultar el historial con Mostrar pagados.</p>}
    </section> : <>{brands.length === 0 ? <p className="card text-slate-500">Las marcas aparecerán cuando registres campañas en Contenidos.</p> : <p className="text-sm text-slate-500">Elige una marca del selector para ver su historial.</p>}<BrandRanking campaigns={data.campaigns} period="Todos los meses" /></>}
  </div>;
}
