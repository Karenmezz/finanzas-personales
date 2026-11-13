"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ContentNavigation } from "@/components/content-navigation";
import { ContentCalendar } from "@/components/content-calendar";
import { CollaborationForm } from "@/components/collaboration-form";
import { CampaignBenefitDetails } from "@/components/campaign-benefit-details";
import { CampaignBenefitActions } from "@/components/campaign-benefit-actions";
import { useFinance } from "@/components/finance-provider";
import { benefitSummary, isBarterCampaign, isBarterComplete, selectFinanceArea } from "@/lib/finance-insights";
import type { Campaign } from "@/lib/finance";
import { currency } from "@/lib/finance";
import { bogotaDate } from "@/lib/usd";

export function BarterWorkspace({ initialPeriod, initialEditId }: { initialPeriod?: string; initialEditId?: string }) {
  const { data, updateCampaign, deleteCampaign } = useFinance();
  const router = useRouter();
  const todayPeriod = bogotaDate().slice(0, 7);
  const [period, setPeriod] = useState(initialPeriod ?? "");
  const [showCompleted, setShowCompleted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(initialEditId ?? null);
  const content = selectFinanceArea(data, "content").campaigns;
  const all = content.filter(isBarterCampaign);
  const periods = [...new Set([todayPeriod, ...(initialPeriod ? [initialPeriod] : []), ...all.map((campaign) => campaign.month ?? campaign.dueDate.slice(0, 7))])].sort().reverse();
  const selected = all.filter((campaign) => !period || (campaign.month ?? campaign.dueDate.slice(0, 7)) === period);
  const completed = selected.filter(isBarterComplete).length;
  const visible = selected.filter((campaign) => showCompleted || !isBarterComplete(campaign)).sort((a, b) => (a.contentDueDate || "9999").localeCompare(b.contentDueDate || "9999") || a.name.localeCompare(b.name));
  const editing = all.find((campaign) => campaign.id === editingId);
  const summary = benefitSummary(selected);
  function saved(campaign: Campaign) {
    setCreating(false); setEditingId(null);
    if (!isBarterCampaign(campaign)) router.push(`/contenidos?month=${campaign.month}`);
    else if (period && campaign.month !== period) setPeriod(campaign.month ?? "");
  }
  function editFromCalendar(campaign: Campaign) {
    if (isBarterCampaign(campaign)) { setCreating(false); setEditingId(campaign.id); }
    else router.push(`/contenidos?month=${campaign.month ?? (period || todayPeriod)}&edit=${encodeURIComponent(campaign.id)}`);
  }
  return <div className="mx-auto max-w-7xl">
    <ContentNavigation />
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Contenidos</p><h1 className="mt-2 text-3xl font-bold">Canjes</h1><p className="mt-2 text-sm text-slate-500">Bonos y productos. La recepción del beneficio y el contenido se controlan por separado.</p></div><button className="button" onClick={() => { setEditingId(null); setCreating(!creating); }}>+ Nuevo canje</button></header>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><label><span className="label">Mes de los canjes</span><select className="field" value={period} onChange={(event) => { setPeriod(event.target.value); setShowCompleted(false); }}><option value="">Todos los meses</option>{periods.map((value) => <option key={value} value={value}>{new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T00:00:00Z`))}</option>)}</select></label>{completed > 0 && <button type="button" className="button-secondary" onClick={() => setShowCompleted(!showCompleted)}>{showCompleted ? `Ocultar completados (${completed})` : `Mostrar completados (${completed})`}</button>}</div>
    <dl className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Resumen de canjes">{[["Por recibir", String(summary.pending)], ["Contenido pendiente", String(selected.filter((campaign) => campaign.status !== "Realizado").length)], ["Sin fecha definida", String(summary.withoutDate)], ["Saldo en bonos", currency.format(summary.voucherBalance)]].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border border-violet-100 bg-violet-50/60 p-3"><dt className="text-[10px] text-slate-500">{label}</dt><dd className="mt-1 text-lg font-bold tracking-tight text-violet-950">{value}</dd></div>)}</dl>
    {creating && <CollaborationForm key="new-barter" period={period || todayPeriod} defaultType="Canje" onSaved={saved} onCancel={() => setCreating(false)} />}
    {editing && <CollaborationForm key={editing.id} campaign={editing} period={editing.month ?? todayPeriod} onSaved={saved} onCancel={() => setEditingId(null)} />}
    <div className="grid gap-4 lg:grid-cols-2">{visible.map((campaign) => <article key={campaign.id} className="card min-w-0" aria-label={`Canje ${campaign.name}`}>
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words font-bold">{campaign.name}</h2><p className="mt-1 text-xs text-slate-500">{campaign.brand} · {campaign.network} · {campaign.month}</p></div><span className="shrink-0 rounded-full bg-violet-100 px-2 py-1 text-[10px] font-semibold text-violet-800">Canje</span></div>
      <CampaignBenefitDetails campaign={campaign} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><label><span className="label">Estado del contenido</span><select className="field" aria-label={`Estado del contenido de ${campaign.name}`} value={campaign.status} onChange={(event) => updateCampaign(campaign.id, { status: event.target.value as Campaign["status"] })}><option value="Pendiente">Pendiente</option><option value="En producción">En producción</option><option value="Realizado">Publicado</option></select></label><div className="self-center"><p className="text-[11px] font-medium text-slate-500">Fecha para subir el video</p><p className={`mt-1 text-xs font-semibold ${campaign.contentDueDate ? "text-slate-700" : "text-amber-700"}`}>{campaign.contentDueDate ?? "Sin fecha definida"}</p></div></div>
      <CampaignBenefitActions campaign={campaign} />
      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3"><button className="button-secondary" onClick={() => { setCreating(false); setEditingId(campaign.id); }}>Editar</button><button className="button-danger" onClick={() => deleteCampaign(campaign.id)}>Eliminar</button></div>
    </article>)}</div>
    {visible.length === 0 && <p className="card text-sm text-slate-500">{selected.length === 0 ? "No hay canjes en este filtro. Agrega un bono o productos con Nuevo canje." : "No hay canjes pendientes. Puedes consultar los completados con el botón de arriba."}</p>}
    <div className="mt-6"><ContentCalendar campaigns={content} period={period || todayPeriod} onEdit={editFromCalendar} /></div>
  </div>;
}
