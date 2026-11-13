"use client";

import type { FinanceArea } from "@/lib/finance-insights";

export function AreaFilter({ value, onChange }: { value: FinanceArea; onChange: (area: FinanceArea) => void }) {
  return <div className="mb-6 flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5" role="group" aria-label="Seleccionar sección">
    {([['finances', 'Finanzas · Casa y salario'], ['content', 'Contenidos · Campañas']] as const).map(([area, label]) =>
      <button key={area} type="button" aria-pressed={value === area} className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${value === area ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:bg-white'}`} onClick={() => onChange(area)}>{label}</button>)}
  </div>;
}
