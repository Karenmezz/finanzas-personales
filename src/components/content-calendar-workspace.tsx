"use client";
import { useEffect, useRef, useState } from "react";
import { useFinance } from "@/components/finance-provider";
import { ContentNavigation } from "@/components/content-navigation";
import { ContentCalendar } from "@/components/content-calendar";
import { CollaborationForm } from "@/components/collaboration-form";
import { selectFinanceArea } from "@/lib/finance-insights";
import { MonthNavigator } from "@/components/month-navigator";
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
  useEffect(()=>{if(editingId){editorRef.current?.scrollIntoView({block:"start"});if(window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches)editorRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({preventScroll:true});}},[editingId]);
  return <div className="mx-auto max-w-7xl"><ContentNavigation /><header className="mb-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contenidos</p><h1 className="mt-2 text-3xl font-bold">Calendario de entregas</h1><p className="mt-2 text-sm text-slate-500">Todas tus campañas pagas, canjes y mixtas con fecha de entrega, en un solo lugar.</p></header>
    <MonthNavigator period={period} onChange={setPeriod} label="Mes del calendario" onToday={()=>setCalendarRevision(value=>value+1)} />
    {editing&&<div ref={editorRef} className="scroll-mt-5"><CollaborationForm key={editing.id} campaign={editing} period={editing.month??period} onSaved={(campaign)=>{setEditingId(null);if(campaign.contentDueDate)setPeriod(campaign.contentDueDate.slice(0,7));}} onCancel={()=>setEditingId(null)} /></div>}
    <ContentCalendar monthColor={data.monthColors[period.slice(5,7)]} key={`${period}-${calendarRevision}`} campaigns={campaigns} period={period} onEdit={(campaign)=>setEditingId(campaign.id)} />
  </div>;
}
