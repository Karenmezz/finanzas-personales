type CardTone = "slate" | "emerald" | "amber" | "indigo";

type SummaryCardProps = {
  titulo: string;
  valor: string;
  detalle: string;
  compacto?: boolean;
  tono?: CardTone;
};

const tones = {
  slate: { card: "border-slate-200 bg-slate-50/80", icon: "bg-slate-200/70 text-slate-600", value: "text-slate-900", path: "M4 16V8m5 8V4m5 12v-6m5 6V6" },
  emerald: { card: "border-emerald-100 bg-emerald-50/70", icon: "bg-emerald-100 text-emerald-700", value: "text-emerald-950", path: "M5 12l4 4L19 6" },
  amber: { card: "border-amber-100 bg-amber-50/70", icon: "bg-amber-100 text-amber-700", value: "text-amber-950", path: "M12 5v7l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" },
  indigo: { card: "border-indigo-100 bg-indigo-50/70", icon: "bg-indigo-100 text-indigo-700", value: "text-indigo-950", path: "M4 17l6-6 4 4 6-9m-6 0h6v6" },
};

export function SummaryCard({ titulo, valor, detalle, compacto = false, tono = "slate" }: SummaryCardProps) {
  const theme = tones[tono];
  return <article className={`min-w-0 rounded-2xl border ${theme.card} ${compacto ? "px-3 py-3 sm:px-4" : "p-4"}`}>
    <div className="flex items-start justify-between gap-2">
      <p className={`${compacto ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm"} font-medium leading-snug text-slate-600`}>{titulo}</p>
      <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${theme.icon}`}>
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={theme.path} /></svg>
      </span>
    </div>
    <p className={`mt-1 break-words font-bold leading-tight tracking-tight tabular-nums ${theme.value} ${compacto ? "text-base min-[375px]:text-lg sm:text-xl" : "text-xl sm:text-2xl"}`}>{valor}</p>
    <p className={`mt-1.5 leading-snug text-slate-500 ${compacto ? "text-[10px] sm:text-[11px]" : "text-[11px] sm:text-xs"}`}>{detalle}</p>
  </article>;
}
