"use client";
import { useEffect, useRef, useState } from "react";
import { NavigationIcon } from "@/components/navigation-icon";
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
  return <div className="mx-auto max-w-7xl"><ContentNavigation /><header className="relative mb-4 overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-rose-50 p-4 sm:p-5"><div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-fuchsia-200/30 blur-xl" /><div className="relative flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 text-violet-700 shadow-sm"><NavigationIcon name="calendar" className="h-4 w-4" /></span><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">Tu agenda creativa</p></div><h1 className="relative mt-3 text-2xl font-bold tracking-tight text-violet-950 sm:text-3xl">Calendario de entregas</h1><p className="relative mt-1.5 max-w-xl text-sm leading-relaxed text-violet-900/70">Todas tus campañas pagas, canjes y mixtas con fecha de entrega, en un solo lugar.</p></header>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-3"><label><span className="label">Mes del calendario</span><input className="field max-w-40 border-violet-200 bg-white text-violet-950" type="month" min="1900-01" max="9998-12" value={period} onChange={(event)=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)&&event.target.value>="1900-01"&&event.target.value<="9998-12")setPeriod(event.target.value);}} /></label><div className="flex items-center gap-1.5"><button type="button" aria-label="Mes anterior" className="button-secondary h-10 w-10 border-violet-200 px-0 text-violet-800 hover:bg-violet-100" disabled={period==="1900-01"} onClick={()=>setPeriod(shiftCalendarMonth(period,-1))}>‹</button><button type="button" className="button h-10 bg-violet-600 shadow-sm shadow-violet-200 hover:bg-violet-700" onClick={()=>{setPeriod(bogotaDate().slice(0,7));setCalendarRevision((value)=>value+1);}}>Hoy</button><button type="button" aria-label="Mes siguiente" className="button-secondary h-10 w-10 border-violet-200 px-0 text-violet-800 hover:bg-violet-100" disabled={period==="9998-12"} onClick={()=>setPeriod(shiftCalendarMonth(period,1))}>›</button></div></div>
    {editing&&<div ref={editorRef} className="scroll-mt-5"><CollaborationForm key={editing.id} campaign={editing} period={editing.month??period} onSaved={(campaign)=>{setEditingId(null);if(campaign.contentDueDate)setPeriod(campaign.contentDueDate.slice(0,7));}} onCancel={()=>setEditingId(null)} /></div>}
    <ContentCalendar key={`${period}-${calendarRevision}`} campaigns={campaigns} period={period} onEdit={(campaign)=>setEditingId(campaign.id)} />
  </div>;
}
