"use client";
import { useState } from "react";
import type { Campaign } from "@/lib/finance";
import { useFinance } from "@/components/finance-provider";
import { collaborationKind } from "@/lib/finance-insights";

const columns = [{status:"Pendiente",label:"Pendiente",dot:"bg-slate-400"},{status:"En producción",label:"En producción",dot:"bg-amber-400"},{status:"Realizado",label:"Publicado",dot:"bg-emerald-500"}] as const;
export function ContentKanban({campaigns,onEdit,monthColor}:{campaigns:Campaign[];onEdit:(campaign:Campaign)=>void;monthColor:string}) {
  const {updateCampaign}=useFinance();
  const [dragging,setDragging]=useState<string | null>(null);
  const [over,setOver]=useState<Campaign["status"] | null>(null);
  const [message,setMessage]=useState("");
  function move(id:string,status:Campaign["status"]) {
    const campaign=campaigns.find((item)=>item.id===id);
    if(campaign&&campaign.status!==status){updateCampaign(id,{status});setMessage(`${campaign.name}: ${status==="Realizado"?"Publicado":status}`);}
    setDragging(null);setOver(null);
  }
  return <><div className="relative mt-3 grid w-full min-w-0 grid-cols-3 items-start gap-1.5 lg:items-stretch pb-3 sm:gap-2 lg:gap-3" aria-label="Columnas del kanban">
    {columns.map(({status,label,dot})=>{const items=campaigns.filter((campaign)=>campaign.status===status);return <section key={status} aria-label={`Columna ${label}`} onDragOver={(event)=>{if(dragging){event.preventDefault();event.dataTransfer.dropEffect="move";setOver(status);}}} onDrop={(event)=>{event.preventDefault();const id=event.dataTransfer.getData("application/x-content-id");if(id&&id===dragging)move(id,status);}} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-1 sm:p-1.5 lg:rounded-2xl lg:p-2.5" style={over===status?{borderColor:monthColor,backgroundColor:`${monthColor}20`}:undefined}>
      <header className="mb-1.5 flex min-h-8 items-center justify-between gap-1 py-1 lg:mb-3 lg:gap-2 lg:px-1"><h3 className="flex min-w-0 items-center gap-1 text-[9px] font-semibold leading-tight sm:text-[10px] lg:gap-2 lg:text-sm"><span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full lg:h-2 lg:w-2 ${dot}`} />{label}</h3><span className="shrink-0 rounded-md bg-white px-1 py-0.5 text-[9px] font-semibold lg:rounded-lg lg:px-2 lg:text-xs text-slate-500">{items.length}</span></header>
      <div className="max-h-[min(60dvh,480px)] space-y-1.5 overflow-y-auto pb-1 lg:max-h-[560px] lg:space-y-2 lg:px-0.5">{items.map((campaign)=>{const kind=collaborationKind(campaign);return <article key={campaign.id} aria-label={`Tarjeta ${campaign.name}`} draggable onDragStart={(event)=>{event.dataTransfer.setData("application/x-content-id",campaign.id);event.dataTransfer.effectAllowed="move";setDragging(campaign.id);}} onDragEnd={()=>{setDragging(null);setOver(null);}} className={`min-w-0 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm sm:p-2 lg:rounded-xl lg:p-3 ${dragging===campaign.id?"opacity-50":""}`}>
        <div className="flex min-w-0 items-start justify-between gap-1 lg:gap-2"><h4 className="line-clamp-3 min-w-0 break-words text-[10px] font-semibold lg:line-clamp-none leading-snug sm:text-xs lg:text-sm" title={campaign.name}>{campaign.name}</h4><span className="hidden shrink-0 rounded-md bg-slate-50 lg:inline-block px-1.5 py-0.5 text-[10px] text-slate-500">{kind==="barter"?"Canje":kind==="mixed"?"Mixta":"Paga"}</span></div><p className="mt-1 truncate text-[9px] text-slate-500 lg:whitespace-normal lg:break-words lg:text-[11px]" title={`${campaign.brand} · ${campaign.network}`}>{campaign.brand} · {campaign.network}</p>
        <p className="mt-1 break-words text-[9px] text-slate-600 lg:mt-2 lg:text-xs">{campaign.contentDueDate?new Intl.DateTimeFormat("es-CO",{day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(`${campaign.contentDueDate}T00:00:00Z`)):<><span className="lg:hidden">Sin fecha</span><span className="hidden lg:inline">Sin fecha definida</span></>}</p>
        <div className="mt-2 flex min-w-0 flex-col gap-1 lg:mt-3 lg:flex-row lg:items-center lg:gap-2">
          <label className="relative min-w-0 lg:hidden"><span className="sr-only">Mover {campaign.name}</span><select className="field min-h-8 px-1 py-1 text-[9px]" aria-label={`Mover ${campaign.name}`} value="" onChange={(event)=>move(campaign.id,event.target.value as Campaign["status"])}><option value="" disabled>Mover…</option>{columns.map((column)=><option key={column.status} value={column.status}>{column.label}</option>)}</select></label>
          <label className="relative hidden min-w-0 flex-1 lg:block"><span className="sr-only">Estado de {campaign.name}</span><select className="field px-2 py-1.5 text-xs" aria-label={`Estado de ${campaign.name}`} value={campaign.status} onChange={(event)=>move(campaign.id,event.target.value as Campaign["status"])}>{columns.map((column)=><option key={column.status} value={column.status}>{column.label}</option>)}</select></label>
          <button type="button" className="button-secondary min-h-8 w-full px-1 py-1 text-[9px] lg:min-h-0 lg:w-auto lg:px-2 lg:py-1.5 lg:text-xs" aria-label={`Editar ${campaign.name}`} onClick={()=>onEdit(campaign)}>Editar</button>
        </div>
      </article>;})}{items.length===0&&<p className="rounded-lg border border-dashed border-slate-200 px-1 py-3 text-center text-[9px] text-slate-400 lg:rounded-xl lg:p-4 lg:text-xs"><span className="lg:hidden">Sin contenidos</span><span className="hidden lg:inline">Sin contenidos en esta columna.</span></p>}</div>
    </section>;})}
  </div><p className="mt-1 text-[11px] text-slate-500">Arrastra las tarjetas entre columnas en computador o cambia su estado desde la tarjeta en el teléfono.</p><p className="sr-only" role="status">{message}</p></>;
}
