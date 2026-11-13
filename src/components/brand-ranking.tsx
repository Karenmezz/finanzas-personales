import type { Campaign } from "@/lib/finance";
import { currency } from "@/lib/finance";
import { brandRanking } from "@/lib/finance-insights";

export function BrandRanking({ campaigns, period }: { campaigns: Campaign[]; period: string }) {
  const ranking = brandRanking(campaigns);
  return <section className="card my-6" aria-label="Marcas que más pagan">
    <h2 className="text-lg font-bold">Marcas que más pagan</h2>
    <p className="mt-1 text-sm text-slate-500">{period} · Ordenadas por dinero recibido. El promedio usa el valor acordado por campaña. No incluye el salario.</p>
    {ranking.length === 0 ? <p className="mt-4 text-sm text-slate-500">Aún no hay campañas de marcas en este período.</p> :
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
        <thead><tr className="border-b border-slate-200"><th className="p-3">Marca</th><th className="p-3 text-right">Recibido</th><th className="p-3 text-right">Acordado</th><th className="p-3 text-right">Promedio por campaña</th><th className="p-3 text-right">Campañas</th></tr></thead>
        <tbody>{ranking.map((row, index) => <tr key={row.brand} className="border-b border-slate-100"><th className="p-3 font-semibold">{index + 1}. {row.brand}</th><td className="p-3 text-right font-semibold text-emerald-700">{currency.format(row.received)}</td><td className="p-3 text-right">{currency.format(row.agreed)}</td><td className="p-3 text-right">{currency.format(row.agreed / row.count)}</td><td className="p-3 text-right">{row.count}</td></tr>)}</tbody>
      </table></div>}
  </section>;
}
