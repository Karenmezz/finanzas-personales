"use client";
import { useId } from "react";
import { shiftCalendarMonth } from "@/lib/content-calendar";
import { bogotaDate } from "@/lib/usd";

export function MonthNavigator({period,onChange,label="Mes",onToday}:{period:string;onChange:(period:string)=>void;label?:string;onToday?:()=>void}) {
  const id=useId();
  return <div className="mb-4 flex flex-wrap items-end justify-between gap-3" aria-label="Navegación por mes"><label htmlFor={id} className="w-44 max-w-full"><span className="label">{label}</span><input id={id} className="field max-w-44" type="month" min="1900-01" max="9998-12" value={period} onChange={event=>{const next=event.target.value;if(/^\d{4}-(0[1-9]|1[0-2])$/.test(next)&&next>="1900-01"&&next<="9998-12")onChange(next);}} /></label><div className="flex items-center gap-2"><button type="button" aria-label="Mes anterior" className="button-secondary h-10 w-10 px-0" disabled={period==="1900-01"} onClick={()=>onChange(shiftCalendarMonth(period,-1))}>‹</button><button type="button" className="button-secondary h-10" onClick={()=>{onChange(bogotaDate().slice(0,7));onToday?.();}}>Hoy</button><button type="button" aria-label="Mes siguiente" className="button-secondary h-10 w-10 px-0" disabled={period==="9998-12"} onClick={()=>onChange(shiftCalendarMonth(period,1))}>›</button></div></div>;
}
