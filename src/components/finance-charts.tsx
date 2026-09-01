"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FinanceData } from "@/lib/finance";
import { currency } from "@/lib/finance";

const monthNames: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};
const socialColors = ["#ec4899", "#8b5cf6", "#06b6d4", "#f97316", "#22c55e", "#ef4444", "#3b82f6"];
const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

export function FinanceCharts({ data, year }: { data: FinanceData; year: number }) {
  const monthly = Object.entries(monthNames).map(([month, name]) => {
    const period = `${year}-${month}`;
    const campaigns = data.campaigns.filter((item) => item.month === period);
    const generated = campaigns.reduce((sum, item) => sum + item.value, 0);
    const received = campaigns.reduce((sum, item) => sum + item.payments.reduce((total, payment) => total + payment.amount, 0), 0);
    const spent = data.bills.filter((item) => item.dueDate.startsWith(period) && item.paid).reduce((sum, item) => sum + item.amount, 0)
      + data.expenses.filter((item) => item.date.startsWith(period) && item.status === "Comprado").reduce((sum, item) => sum + item.amount, 0);
    return { month, name, generated, received, pending: generated - received, spent, balance: generated - spent };
  });

  const yearCampaigns = data.campaigns.filter((item) => item.month?.startsWith(`${year}-`));
  const networks = Array.from(new Set(yearCampaigns.map((item) => item.network))).map((network) => ({
    name: network.replace("TikTok y Instagram", "TikTok + Instagram"),
    value: yearCampaigns.filter((item) => item.network === network).reduce((sum, item) => sum + item.value, 0),
  })).sort((a, b) => b.value - a.value);

  return (
    <section className="mt-7 space-y-6" aria-label="Gráficas financieras">
      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Evolución anual</p><h2 className="mt-2 text-xl font-bold">Cómo transcurre cada mes</h2><p className="mt-1 text-sm text-slate-500">Las barras muestran lo generado y la línea muestra el balance después de gastos.</p></div>
          <div className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500">Valores en pesos colombianos</div>
        </div>
        <div className="mt-7 h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthly} margin={{ top: 28, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tickFormatter={(value) => compact.format(Number(value))} tickLine={false} axisLine={false} width={52} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip formatter={(value, name) => [currency.format(Number(value)), name === "generated" ? "Generado" : "Balance"]} contentStyle={{ borderRadius: 16, borderColor: "#e2e8f0", boxShadow: "0 8px 30px rgba(15,23,42,.08)" }} />
              <Legend formatter={(value) => value === "generated" ? "Generado" : "Balance"} />
              <ReferenceLine y={0} stroke="#cbd5e1" />
              <Bar dataKey="generated" radius={[9, 9, 0, 0]} maxBarSize={46}>
                {monthly.map((item) => <Cell key={item.month} fill={data.monthColors[item.month]} />)}
                <LabelList dataKey="generated" position="top" formatter={(value) => Number(value) > 0 ? compact.format(Number(value)) : ""} style={{ fill: "#475569", fontSize: 10, fontWeight: 600 }} />
              </Bar>
              <Line type="monotone" dataKey="balance" stroke="#0f172a" strokeWidth={3} dot={{ fill: "white", stroke: "#0f172a", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-5">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 xl:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Estado de cobro</p><h2 className="mt-2 text-xl font-bold">Cobrado y pendiente por mes</h2><p className="mt-1 text-sm text-slate-500">Permite identificar en qué meses todavía falta recibir dinero.</p>
          <div className="mt-6 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => compact.format(Number(value))} tickLine={false} axisLine={false} width={50} /><Tooltip formatter={(value, name) => [currency.format(Number(value)), name === "received" ? "Cobrado" : "Pendiente"]} contentStyle={{ borderRadius: 16, borderColor: "#e2e8f0" }} /><Legend formatter={(value) => value === "received" ? "Cobrado" : "Pendiente"} /><Bar dataKey="received" stackId="money" fill="#86efac" radius={[0, 0, 5, 5]} /><Bar dataKey="pending" stackId="money" fill="#fde68a" radius={[7, 7, 0, 0]}><LabelList dataKey="pending" position="top" formatter={(value) => Number(value) > 0 ? compact.format(Number(value)) : ""} style={{ fill: "#92400e", fontSize: 10, fontWeight: 600 }} /></Bar></BarChart></ResponsiveContainer></div>
        </article>

        <article className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 xl:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Origen</p><h2 className="mt-2 text-xl font-bold">Ingresos por red social</h2><p className="mt-1 text-sm text-slate-500">Distribución del valor generado.</p>
          <div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={networks} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={3}>{networks.map((item, index) => <Cell key={item.name} fill={socialColors[index % socialColors.length]} />)}</Pie><Tooltip formatter={(value) => currency.format(Number(value))} contentStyle={{ borderRadius: 16, borderColor: "#e2e8f0" }} /></PieChart></ResponsiveContainer></div>
          <div className="space-y-2">{networks.slice(0, 5).map((item, index) => <div key={item.name} className="flex min-w-0 items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: socialColors[index % socialColors.length] }} /><span className="truncate">{item.name}</span></span><strong className="shrink-0">{compact.format(item.value)}</strong></div>)}</div>
        </article>
      </div>
    </section>
  );
}
