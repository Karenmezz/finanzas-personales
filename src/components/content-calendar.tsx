"use client";

import type { Campaign } from "@/lib/finance";
import { collaborationKind } from "@/lib/finance-insights";

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export function ContentCalendar({ campaigns, period, onEdit }: { campaigns: Campaign[]; period: string; onEdit: (campaign: Campaign) => void }) {
  const [year, month] = period.split("-").map(Number);
  const monthName = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${period}-01T00:00:00Z`));
  const dated = campaigns.filter((campaign) => campaign.contentDueDate?.startsWith(period));
  const cells: (number | null)[] = [...Array.from({ length: (new Date(year, month - 1, 1).getDay() + 6) % 7 }, () => null), ...Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => index + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  return <section id="calendario" className="card min-w-0" aria-label="Calendario de contenido">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Calendario de contenido</h2><p className="text-sm capitalize text-slate-500">{monthName} · Pagas, canjes y mixtas</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{dated.length} con fecha</span></div>
    <div className="mt-4 overflow-x-auto pb-1"><div className="min-w-[560px] overflow-hidden rounded-xl border border-slate-200 bg-slate-200"><div className="grid grid-cols-7 gap-px">
      {weekDays.map((day) => <div key={day} className="bg-slate-50 px-1 py-1.5 text-center text-[10px] font-bold uppercase text-slate-500">{day}</div>)}
      {cells.map((day, index) => { const date = day ? `${period}-${String(day).padStart(2, "0")}` : ""; return <div key={`${day ?? "empty"}-${index}`} className={`min-h-20 p-1.5 ${day ? "bg-white" : "bg-slate-50"}`}>{day && <><p className="mb-1 text-xs font-bold text-slate-700">{day}</p><div className="space-y-1">{dated.filter((campaign) => campaign.contentDueDate === date).map((campaign) => { const kind = collaborationKind(campaign); return <button key={campaign.id} type="button" onClick={() => onEdit(campaign)} className={`block w-full truncate rounded-md px-1.5 py-1 text-left text-[9px] font-semibold leading-tight ${campaign.status === "Realizado" ? "bg-green-100 text-green-900" : campaign.status === "En producción" ? "bg-yellow-100 text-yellow-900" : "bg-red-100 text-red-900"}`} title={`${kind === "barter" ? "Canje" : kind === "mixed" ? "Mixta" : "Paga"} · ${campaign.name} · ${campaign.status === "Realizado" ? "Publicado" : campaign.status}`}>{kind === "barter" ? "🎁 " : kind === "mixed" ? "＋ " : ""}{campaign.name}</button>; })}</div></>}</div>; })}
    </div></div></div>
    {dated.length === 0 && <p className="mt-3 text-sm text-slate-500">No hay fechas de publicación para este mes.</p>}
    <p className="mt-3 text-[11px] text-slate-500">Los canjes sin fecha siguen visibles en Canjes como “Sin fecha definida”.</p>
  </section>;
}
