"use client";

import { useState } from "react";
import type { Campaign } from "@/lib/finance";
import { collaborationKind } from "@/lib/finance-insights";
import { calendarCells, scheduledContents } from "@/lib/content-calendar";
import { bogotaDate } from "@/lib/usd";

const weekDays=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
export function ContentCalendar({campaigns,period,onEdit}:{campaigns:Campaign[];period:string;onEdit:(campaign:Campaign)=>void}) {
  const [selectedDate,setSelectedDate]=useState<string | null>(null);
  const dated=scheduledContents(campaigns,period);
  const visible=selectedDate ? dated.filter((campaign)=>campaign.contentDueDate===selectedDate) : dated;
  const monthName=new Intl.DateTimeFormat("es-CO",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${period}-01T00:00:00Z`));
  const formatDate=(date:string)=>new Intl.DateTimeFormat("es-CO",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"}).format(new Date(`${date}T00:00:00Z`));
  const today=bogotaDate();
  return <section id="calendario" className="min-w-0" aria-label="Calendario de contenido">
    <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1"><h2 className="text-sm font-bold capitalize">{monthName}</h2><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">{dated.length} {dated.length===1?"entrega":"entregas"}</span></div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200" aria-label="Días del mes">
        {weekDays.map((day)=><div key={day} className="bg-slate-50 py-2 text-center text-[10px] font-semibold text-slate-500 sm:text-xs">{day}</div>)}
        {calendarCells(period).map((day,index)=>{if(!day)return <div key={`empty-${index}`} className="min-h-14 bg-slate-50 sm:min-h-24" />;const date=`${period}-${String(day).padStart(2,"0")}`;const items=dated.filter((campaign)=>campaign.contentDueDate===date);const selected=selectedDate===date;
          return <button key={date} type="button" aria-label={`${formatDate(date)}: ${items.length} entregas`} aria-pressed={selected} aria-current={date===today?"date":undefined} onClick={()=>setSelectedDate(selected?null:date)} className={`flex min-h-14 min-w-0 flex-col items-center gap-1 px-0.5 py-2 text-left transition focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-violet-600 sm:min-h-24 sm:items-stretch sm:px-2 ${selected?"bg-violet-100":"bg-white hover:bg-violet-50"}`}>
            <span className={`flex h-6 w-6 items-center justify-center self-center rounded-full text-xs font-semibold sm:self-start ${date===today?"bg-slate-900 text-white":selected?"bg-violet-700 text-white":"text-slate-700"}`}>{day}</span>
            {items.length>0 && <><span className="flex items-center gap-0.5 sm:hidden" aria-hidden="true">{items.slice(0,3).map((campaign)=><span key={campaign.id} className={`h-1.5 w-1.5 rounded-full ${campaign.status==="Realizado"?"bg-emerald-500":campaign.status==="En producción"?"bg-amber-500":"bg-violet-500"}`} />)}{items.length>3&&<span className="text-[8px] text-violet-800">+</span>}</span><span className="sr-only sm:not-sr-only sm:space-y-1">{items.slice(0,2).map((campaign)=><span key={campaign.id} className={`block truncate rounded px-1 py-0.5 text-[10px] ${campaign.status==="Realizado"?"bg-emerald-50 text-emerald-800":campaign.status==="En producción"?"bg-amber-50 text-amber-800":"bg-violet-50 text-violet-800"}`}>{campaign.name}</span>)}{items.length>2&&<span className="block text-[10px] text-slate-500">+{items.length-2} más</span>}</span></>}
          </button>;})}
      </div><p className="mt-3 px-1 text-[11px] text-slate-500">Selecciona un día para ver sus entregas. Incluye pagas, canjes y mixtas, aunque ya estén pagadas.</p>
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold">{selectedDate?`Entregas del ${formatDate(selectedDate)}`:"Todas las entregas del mes"}</h2>{selectedDate&&<button type="button" className="button-secondary text-xs" onClick={()=>setSelectedDate(null)}>Ver todo el mes</button>}</div>
    <div className="mt-3 grid gap-3 lg:grid-cols-2" aria-live="polite">{visible.map((campaign)=>{const kind=collaborationKind(campaign);return <article key={campaign.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4" aria-label={`Entrega de ${campaign.name}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold">{campaign.name}</h3><p className="mt-1 break-words text-xs text-slate-500">{campaign.brand} · {campaign.network}</p></div><span className="shrink-0 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-800">{kind==="barter"?"Canje":kind==="mixed"?"Mixta":"Paga"}</span></div><p className="mt-3 text-xs font-medium capitalize text-slate-700">{formatDate(campaign.contentDueDate!)}</p><div className="mt-3 flex items-center justify-between gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${campaign.status==="Realizado"?"bg-emerald-50 text-emerald-800":campaign.status==="En producción"?"bg-amber-50 text-amber-800":"bg-slate-100 text-slate-600"}`}>{campaign.status==="Realizado"?"Publicado":campaign.status}</span><button type="button" className="button-secondary text-xs" onClick={()=>onEdit(campaign)}>Editar contenido</button></div></article>;})}</div>
    {visible.length===0&&<p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{selectedDate?"No hay entregas para este día.":"No hay contenidos con fecha de entrega en este mes."}</p>}
    <p className="mt-4 text-xs text-slate-500">Asigna la fecha de entrega al crear o editar una campaña o un canje para verlo aquí.</p>
  </section>;
}
