"use client";

import { useState } from "react";
import { useFinance } from "@/components/finance-provider";
import { availableYears, currency } from "@/lib/finance";
import { CollapsibleSection } from "@/components/collapsible-section";

const months = [
  ["01", "Enero"], ["02", "Febrero"], ["03", "Marzo"],
  ["04", "Abril"], ["05", "Mayo"], ["06", "Junio"],
  ["07", "Julio"], ["08", "Agosto"], ["09", "Septiembre"],
  ["10", "Octubre"], ["11", "Noviembre"], ["12", "Diciembre"],
];

export default function TransactionsPage() {
  const { data } = useFinance();
  const [selectedMonth, setSelectedMonth] = useState(() =>
    String(new Date().getMonth() + 1).padStart(2, "0"),
  );
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const years = availableYears(data);
  const selectedPeriod = `${selectedYear}-${selectedMonth}`;
  const monthName = months.find(([month]) => month === selectedMonth)?.[1];
  const campaigns = data.campaigns.filter((item) => item.month === selectedPeriod);
  const bills = data.bills.filter((item) => item.paid && item.dueDate.startsWith(selectedPeriod));
  const extras = data.expenses.filter((item) => item.status === "Comprado" && item.date.startsWith(selectedPeriod));
  const earned = campaigns.reduce((sum, item) => sum + item.value, 0);
  const spent = bills.reduce((sum, item) => sum + item.amount, 0) + extras.reduce((sum, item) => sum + item.amount, 0);
  const movements = [
    ...campaigns.map((item) => ({ id: `campaign-${item.id}`, concept: item.name, detail: `${item.brand} · ${item.network}`, amount: item.value, type: "Ganado" as const })),
    ...bills.map((item) => ({ id: `bill-${item.id}`, concept: item.name, detail: item.category, amount: item.amount, type: "Gastado" as const })),
    ...extras.map((item) => ({ id: `expense-${item.id}`, concept: item.concept, detail: item.category, amount: item.amount, type: "Gastado" as const })),
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Historial anual</p>
        <h1 className="mt-2 text-3xl font-bold">Movimientos</h1>
        <p className="mt-2 text-slate-600">Selecciona un mes para ver lo ganado y gastado.</p></div>
        <label><span className="sr-only">Año</span><select className="h-10 min-w-[148px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
      </header>

      <div className="mb-7 sm:hidden"><label htmlFor="movement-month" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Mes</label><select id="movement-month" className="w-44 rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold" style={{ borderColor: data.monthColors[selectedMonth], backgroundColor: `${data.monthColors[selectedMonth]}33` }} value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>{months.map(([month, name]) => <option key={month} value={month}>{name}</option>)}</select></div>
      <nav className="mb-7 hidden gap-3 sm:grid sm:grid-cols-3 lg:grid-cols-6" aria-label="Seleccionar mes">
        {months.map(([month, name]) => {
          const monthCampaigns = data.campaigns.filter((item) => item.month === `${selectedYear}-${month}`).length;
          const active = selectedMonth === month;
          return (
            <button key={month} onClick={() => setSelectedMonth(month)} className="rounded-2xl border p-4 text-left transition hover:shadow-sm" style={{ borderColor: data.monthColors[month], backgroundColor: active ? `${data.monthColors[month]}55` : "white" }}>
              <span className="block font-semibold">{name}</span>
              <span className="mt-1 block text-xs text-slate-500">{monthCampaigns} campañas</span>
            </button>
          );
        })}
      </nav>

      <CollapsibleSection title={`Movimientos de ${monthName}`}>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div><h2 className="text-xl font-bold">{monthName} {selectedYear}</h2><p className="mt-1 text-sm text-slate-500">{movements.length} movimientos</p></div>
          <div className="grid w-full grid-cols-3 gap-2 text-left sm:w-auto sm:gap-8 sm:text-right">
            <Summary label="Ganado" value={earned} color="text-green-700" />
            <Summary label="Gastado" value={spent} color="text-red-700" />
            <Summary label="Balance" value={earned - spent} color="text-slate-900" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {movements.map((item) => (
            <article key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
              <div><h3 className="font-medium">{item.concept}</h3><p className="mt-1 text-xs text-slate-500">{item.detail}</p></div>
              <div className="text-right"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.type === "Ganado" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{item.type}</span><p className={`mt-2 font-bold ${item.type === "Ganado" ? "text-green-700" : "text-red-700"}`}>{item.type === "Ganado" ? "+" : "−"}{currency.format(item.amount)}</p></div>
            </article>
          ))}
          {movements.length === 0 && <p className="py-10 text-center text-sm text-slate-500 lg:col-span-2">No hay movimientos en este mes.</p>}
        </div>
      </section>
      </CollapsibleSection>
    </div>
  );
}

function Summary({ label, value, color }: { label: string; value: number; color: string }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 text-sm font-bold sm:text-base ${color}`}>{currency.format(value)}</p></div>;
}
