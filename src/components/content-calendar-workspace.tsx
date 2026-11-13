"use client";
import { useEffect, useRef, useState } from "react";
import { useFinance } from "@/components/finance-provider";
import { ContentNavigation } from "@/components/content-navigation";
import { ContentCalendar } from "@/components/content-calendar";
import { CollaborationForm } from "@/components/collaboration-form";
import { selectFinanceArea } from "@/lib/finance-insights";
import { shiftCalendarMonth } from "@/lib/content-calendar";
import { bogotaDate } from "@/lib/usd";
export function ContentCalendarWorkspace({initialPeriod}:{initialPeriod?:string}) {
  const {data}=useFinance();
  const currentPeriod=bogotaDate().slice(0,7);
  const [period,setPeriod]=useState(initialPeriod??currentPeriod);
  const [calendarRevision,setCalendarRevision]=useState(0);
  const [editingId,setEditingId]=useState<string | null>(null);
  const editorRef=useRef<HTMLDivElement>(null);
  const campaigns=selectFinanceArea(data,"content").campaigns;
  const editing=campaigns.find((campaign)=>campaign.id===editingId);
  useEffect(()=>{if(editingId){editorRef.current?.scrollIntoView({block:"start"});editorRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({preventScroll:true});}},[editingId]);
  return <div className="mx-auto max-w-7xl"><ContentNavigation /><header className="mb-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contenidos</p><h1 className="mt-2 text-3xl font-bold">Calendario de entregas</h1><p className="mt-2 text-sm text-slate-500">Todas tus campañas pagas, canjes y mixtas con fecha de entrega, en un solo lugar.</p></header>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><label><span className="label">Mes del calendario</span><input className="field max-w-44" type="month" min="1900-01" max="9998-12" value={period} onChange={(event)=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)&&event.target.value>="1900-01"&&event.target.value<="9998-12")setPeriod(event.target.value);}} /></label><div className="flex items-center gap-2"><button type="button" aria-label="Mes anterior" className="button-secondary h-10 w-10 px-0" disabled={period==="1900-01"} onClick={()=>setPeriod(shiftCalendarMonth(period,-1))}>‹</button><button type="button" className="button-secondary h-10" onClick={()=>{setPeriod(bogotaDate().slice(0,7));setCalendarRevision((value)=>value+1);}}>Hoy</button><button type="button" aria-label="Mes siguiente" className="button-secondary h-10 w-10 px-0" disabled={period==="9998-12"} onClick={()=>setPeriod(shiftCalendarMonth(period,1))}>›</button></div></div>
    {editing&&<div ref={editorRef} className="scroll-mt-5"><CollaborationForm key={editing.id} campaign={editing} period={editing.month??period} onSaved={(campaign)=>{setEditingId(null);if(campaign.contentDueDate)setPeriod(campaign.contentDueDate.slice(0,7));}} onCancel={()=>setEditingId(null)} /></div>}
    <ContentCalendar key={`${period}-${calendarRevision}`} campaigns={campaigns} period={period} onEdit={(campaign)=>setEditingId(campaign.id)} />
  </div>;
}
