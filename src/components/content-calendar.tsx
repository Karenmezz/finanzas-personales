"use client";

import { useState } from "react";
import { ContentKanban } from "@/components/content-kanban";
import { colombianHolidays } from "@/lib/colombia-holidays";
import type { Campaign } from "@/lib/finance";
import { calendarCells, scheduledContents, kanbanContents } from "@/lib/content-calendar";
import { bogotaDate } from "@/lib/usd";

const weekDays=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
export function ContentCalendar({campaigns,period,onEdit,monthColor}:{campaigns:Campaign[];period:string;onEdit:(campaign:Campaign)=>void;monthColor?:string}) {
  const [selectedDate,setSelectedDate]=useState<string | null>(null);
  const [includeUndated,setIncludeUndated]=useState(true);
  const accent=monthColor&&/^#[0-9a-f]{6}$/i.test(monthColor)?monthColor:"#ddd6fe";
  const holidays=colombianHolidays(Number(period.slice(0,4)));
  const dated=scheduledContents(campaigns,period);
  const board=kanbanContents(campaigns,period,selectedDate,includeUndated);
  const monthName=new Intl.DateTimeFormat("es-CO",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${period}-01T00:00:00Z`));
  const formatDate=(date:string)=>new Intl.DateTimeFormat("es-CO",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"}).format(new Date(`${date}T00:00:00Z`));
  const today=bogotaDate();
  return <section id="calendario" className="min-w-0" aria-label="Calendario de contenido">
    <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-4" style={{borderTopColor:accent,borderTopWidth:3}}><div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1"><h2 className="text-sm font-bold">{monthName.charAt(0).toUpperCase()+monthName.slice(1)}</h2><span className="rounded-full px-2.5 py-1 text-xs font-semibold text-slate-700" style={{backgroundColor:`${accent}30`}}>{dated.length} {dated.length===1?"entrega":"entregas"}</span></div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200" aria-label="Días del mes">
        {weekDays.map((day)=><div key={day} className="bg-slate-50 py-2 text-center text-[10px] font-semibold text-slate-500 sm:text-xs">{day}</div>)}
        {calendarCells(period).map((day,index)=>{if(!day)return <div key={`empty-${index}`} className="min-h-14 bg-slate-50 sm:min-h-24" />;const date=`${period}-${String(day).padStart(2,"0")}`;const items=dated.filter((campaign)=>campaign.contentDueDate===date);const selected=selectedDate===date;const holiday=holidays[date]?.join(" · ");
          return <button key={date} type="button" aria-label={`${formatDate(date)}: ${items.length} entregas${holiday?`, Festivo: ${holiday}`:""}`} title={holiday?`Festivo: ${holiday}`:undefined} aria-pressed={selected} aria-current={date===today?"date":undefined} onClick={()=>setSelectedDate(selected?null:date)} style={{backgroundColor:selected?`${accent}40`:holiday?`${accent}20`:undefined,boxShadow:selected?`inset 0 0 0 2px ${accent}`:undefined}} className={`flex min-h-14 min-w-0 flex-col items-center gap-1 px-0.5 py-2 text-left transition focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-violet-600 sm:min-h-24 sm:items-stretch sm:px-2 bg-white hover:bg-slate-50`}>
            <span className={`flex h-6 w-6 items-center justify-center self-center rounded-full text-xs font-semibold sm:self-start ${date===today?"bg-slate-900 text-white":selected?"bg-slate-700 text-white":"text-slate-700"}`}>{day}</span>
            {holiday&&<span className="w-full truncate text-center text-[8px] font-medium text-slate-500 sm:text-left sm:text-[9px]" aria-hidden="true">Festivo</span>}
            {items.length>0 && <><span className="flex items-center gap-0.5 sm:hidden" aria-hidden="true">{items.slice(0,3).map((campaign)=><span key={campaign.id} className={`h-1.5 w-1.5 rounded-full ${campaign.status==="Realizado"?"bg-emerald-500":campaign.status==="En producción"?"bg-amber-500":"bg-violet-500"}`} />)}{items.length>3&&<span className="text-[8px] text-violet-800">+</span>}</span><span className="sr-only sm:not-sr-only sm:space-y-1">{items.slice(0,2).map((campaign)=><span key={campaign.id} className={`block truncate rounded px-1 py-0.5 text-[10px] ${campaign.status==="Realizado"?"bg-emerald-50 text-emerald-800":campaign.status==="En producción"?"bg-amber-50 text-amber-800":"bg-violet-50 text-violet-800"}`}>{campaign.name}</span>)}{items.length>2&&<span className="block text-[10px] text-slate-500">+{items.length-2} más</span>}</span></>}
          </button>;})}
      </div>{selectedDate&&holidays[selectedDate]&&<p className="mt-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-700" style={{backgroundColor:`${accent}20`}}>Festivo: {holidays[selectedDate].join(" · ")}</p>}<p className="mt-3 px-1 text-[11px] text-slate-500">Selecciona un día para ver sus entregas. Incluye pagas, canjes y mixtas, aunque ya estén pagadas.</p>
    </div>
    <section className="mt-6 min-w-0" aria-label="Kanban de contenidos"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Tablero de contenidos</h2><p className="mt-1 text-xs text-slate-500">{selectedDate?`Entregas del ${formatDate(selectedDate)}`:includeUndated?"Entregas del mes y contenidos sin fecha.":"Entregas del mes seleccionado."}</p></div>{selectedDate?<button type="button" className="button-secondary text-xs" onClick={()=>setSelectedDate(null)}>Ver todo el mes</button>:<label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={includeUndated} onChange={(event)=>setIncludeUndated(event.target.checked)} />Incluir sin fecha</label>}</div>
      <ContentKanban campaigns={board} onEdit={onEdit} monthColor={accent} />
    </section>
    <p className="mt-4 text-xs text-slate-500">Asigna la fecha de entrega al crear o editar un contenido para verlo en el calendario. Los días marcados como festivos corresponden a Colombia.</p>
  </section>;
}
