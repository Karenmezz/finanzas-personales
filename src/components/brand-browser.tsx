"use client";

import { CampaignBenefitDetails } from "@/components/campaign-benefit-details";
import { CampaignUsdDetails } from "@/components/campaign-usd-details";
import { useState } from "react";
import { BrandRanking } from "@/components/brand-ranking";
import { campaignsByBrand, isBarterCampaign, isBarterComplete } from "@/lib/finance-insights";
import type { Campaign } from "@/lib/finance";
import { currency } from "@/lib/finance";

export function BrandBrowser({campaigns:allCampaigns,period}:{campaigns:Campaign[];period:string}) {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [showPaid, setShowPaid] = useState(false);
  const brands = campaignsByBrand(allCampaigns);
  const selected = brands.find((brand) => brand.id === selectedBrand);
  const campaigns = selected?.campaigns ?? [];
  const moneyCampaigns = campaigns.filter((campaign) => !isBarterCampaign(campaign));
  const agreed = moneyCampaigns.reduce((sum, campaign) => sum + campaign.value, 0);
  const paid = moneyCampaigns.reduce((sum, campaign) => sum + campaign.payments.reduce((total, payment) => total + payment.amount, 0), 0);
  const pending = (campaign: (typeof campaigns)[number]) => Math.max(campaign.value - campaign.payments.reduce((sum, payment) => sum + payment.amount, 0), 0);
  const visible = campaigns.filter((campaign) => showPaid || (isBarterCampaign(campaign) ? !isBarterComplete(campaign) : pending(campaign) > 0 || campaign.value === 0))
    .sort((a, b) => (b.month ?? b.dueDate).localeCompare(a.month ?? a.dueDate));
  const paidCount = campaigns.filter((campaign) => isBarterCampaign(campaign) ? isBarterComplete(campaign) : campaign.value > 0 && pending(campaign) === 0).length;

  return <div className="mx-auto max-w-7xl">
    <p className="mb-4 text-sm text-slate-500">Selecciona una marca para consultar sus campañas y pagos de {period}.</p>
    <label className="mb-6 block max-w-md"><span className="label">Seleccionar marca</span><select className="field" aria-label="Seleccionar marca" value={selected?.id ?? ""} onChange={(event) => { setSelectedBrand(event.target.value); setShowPaid(false); }}>
      <option value="">Selecciona una marca</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name} ({brand.campaigns.length})</option>)}
    </select></label>
    {selected ? <section aria-label={`Campañas de ${selected.name}`}>
      <div className="flex items-start justify-between gap-3"><h2 className="min-w-0 text-xl font-bold">{selected.name}</h2>{paidCount > 0 && <button type="button" className="button-secondary ml-auto shrink-0" aria-pressed={showPaid} onClick={() => setShowPaid(!showPaid)}>{showPaid ? `Ocultar finalizadas (${paidCount})` : `Mostrar finalizadas (${paidCount})`}</button>}</div>
      <dl className="my-3 grid grid-cols-2 gap-2 xl:grid-cols-4" aria-label="Resumen de marca">
        {[["Campañas", String(campaigns.length)], ["Canjes", String(campaigns.filter(isBarterCampaign).length)], ...(moneyCampaigns.length ? [["Pago acordado", currency.format(agreed)], ["Pago recibido", currency.format(paid)], ["Por cobrar", currency.format(moneyCampaigns.reduce((sum, campaign) => sum + pending(campaign), 0))]] : [])].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 sm:p-4"><dt className="text-[10px] font-medium text-slate-500 sm:text-xs">{label}</dt><dd className="mt-1 break-words text-base font-bold tracking-tight tabular-nums sm:text-xl">{value}</dd></div>)}
      </dl>
      <div className="grid gap-4 lg:grid-cols-2">{visible.map((campaign) => <article className="card" key={campaign.id}>
        <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{campaign.name}</h3><p className="mt-1 text-sm text-slate-500">{campaign.month ?? campaign.dueDate.slice(0, 7)} · {campaign.network}</p><p className="mt-1 text-sm text-slate-500">{campaign.collaborationType ?? "Paga"} · {campaign.status}</p></div>{!isBarterCampaign(campaign) && <div className="text-right"><p className="font-bold">{currency.format(campaign.value)}</p><p className="mt-1 text-sm text-slate-500">{campaign.value === 0 ? "Canje / sin cobro" : pending(campaign) > 0 ? `${currency.format(pending(campaign))} por cobrar` : "Pagada"}</p></div>}</div>
        <CampaignUsdDetails campaign={campaign} /><CampaignBenefitDetails campaign={campaign} />{!isBarterCampaign(campaign) && <p className="mt-3 text-sm text-slate-500">Pago esperado: {campaign.dueDate}</p>}<p className="mt-1 text-sm text-slate-500">Entrega: {campaign.contentDueDate ?? "Sin fecha definida"}</p>
      </article>)}</div>
      {visible.length === 0 && <p className="card text-slate-500">No hay colaboraciones pendientes. Puedes consultar el historial con Mostrar finalizadas.</p>}
    </section> : <>{brands.length === 0 ? <p className="card text-slate-500">Las marcas aparecerán cuando registres campañas en Contenidos.</p> : <p className="text-sm text-slate-500">Elige una marca del selector para ver su historial.</p>}<BrandRanking campaigns={allCampaigns} period={period} scrollable /></>}
  </div>;
}
