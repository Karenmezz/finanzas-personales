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
  return <><div className="relative mt-3 grid min-w-0 auto-cols-[minmax(240px,85%)] grid-flow-col gap-3 overflow-x-auto pb-3 xl:auto-cols-auto xl:grid-flow-row xl:grid-cols-3" aria-label="Columnas del kanban">
    {columns.map(({status,label,dot})=>{const items=campaigns.filter((campaign)=>campaign.status===status);return <section key={status} aria-label={`Columna ${label}`} onDragOver={(event)=>{if(dragging){event.preventDefault();event.dataTransfer.dropEffect="move";setOver(status);}}} onDrop={(event)=>{event.preventDefault();const id=event.dataTransfer.getData("application/x-content-id");if(id&&id===dragging)move(id,status);}} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5" style={over===status?{borderColor:monthColor,backgroundColor:`${monthColor}20`}:undefined}>
      <header className="mb-3 flex items-center justify-between gap-2 px-1 py-1"><h3 className="flex items-center gap-2 text-sm font-semibold"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />{label}</h3><span className="rounded-lg bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">{items.length}</span></header>
      <div className="max-h-[560px] space-y-2 overflow-y-auto px-0.5 pb-1">{items.map((campaign)=>{const kind=collaborationKind(campaign);return <article key={campaign.id} aria-label={`Tarjeta ${campaign.name}`} draggable onDragStart={(event)=>{event.dataTransfer.setData("application/x-content-id",campaign.id);event.dataTransfer.effectAllowed="move";setDragging(campaign.id);}} onDragEnd={()=>{setDragging(null);setOver(null);}} className={`min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${dragging===campaign.id?"opacity-50":""}`}>
        <div className="flex items-start justify-between gap-2"><h4 className="min-w-0 break-words text-sm font-semibold">{campaign.name}</h4><span className="shrink-0 rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">{kind==="barter"?"Canje":kind==="mixed"?"Mixta":"Paga"}</span></div><p className="mt-1 break-words text-[11px] text-slate-500">{campaign.brand} · {campaign.network}</p>
        <p className="mt-2 text-xs text-slate-600">{campaign.contentDueDate?new Intl.DateTimeFormat("es-CO",{day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(`${campaign.contentDueDate}T00:00:00Z`)):"Sin fecha definida"}</p>
        <div className="mt-3 flex items-center gap-2"><label className="relative min-w-0 flex-1"><span className="sr-only">Estado de {campaign.name}</span><select className="field px-2 py-1.5 text-xs" aria-label={`Estado de ${campaign.name}`} value={campaign.status} onChange={(event)=>move(campaign.id,event.target.value as Campaign["status"])}>{columns.map((column)=><option key={column.status} value={column.status}>{column.label}</option>)}</select></label><button type="button" className="button-secondary px-2 py-1.5 text-xs" aria-label={`Editar ${campaign.name}`} onClick={()=>onEdit(campaign)}>Editar</button></div>
      </article>;})}{items.length===0&&<p className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">Sin contenidos en esta columna.</p>}</div>
    </section>;})}
  </div><p className="mt-1 text-[11px] text-slate-500">Arrastra las tarjetas entre columnas en computador o cambia su estado desde la tarjeta en el teléfono. Desliza para ver las columnas.</p><p className="sr-only" role="status">{message}</p></>;
}
