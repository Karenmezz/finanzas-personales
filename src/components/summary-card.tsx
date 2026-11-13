type SummaryCardProps = {
  titulo: string;
  valor: string;
  detalle: string;
  compacto?: boolean;
};

export function SummaryCard({
  titulo,
  valor,
  detalle,
  compacto = false,
}: SummaryCardProps) {
  return (
    <article className={compacto ? "flex aspect-square w-full max-w-[180px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" : "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"}>
      <p className={compacto ? "text-xs font-medium leading-tight text-slate-600" : "text-sm font-medium text-slate-600"}>{titulo}</p>
      <p className={compacto ? "break-words text-sm font-bold leading-tight tracking-tight tabular-nums sm:text-base lg:text-lg" : "mt-3 text-3xl font-bold tracking-tight"}>{valor}</p>
      <p className={compacto ? "text-[10px] leading-snug text-slate-500" : "mt-3 text-sm leading-6 text-slate-500"}>{detalle}</p>
    </article>
  );
}
