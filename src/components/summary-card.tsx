type SummaryCardProps = {
  titulo: string;
  valor: string;
  detalle: string;
};

export function SummaryCard({
  titulo,
  valor,
  detalle,
}: SummaryCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{titulo}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight">{valor}</p>
      <p className="mt-3 text-sm leading-6 text-slate-500">{detalle}</p>
    </article>
  );
}
