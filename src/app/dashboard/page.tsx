"use client";

import { useState } from "react";
import { SummaryCard } from "@/components/summary-card";
import { useFinance } from "@/components/finance-provider";
import { availableYears, currency } from "@/lib/finance";
import { FinanceCharts } from "@/components/finance-charts";
import { CollapsibleSection } from "@/components/collapsible-section";

export default function Home() {
  const { data } = useFinance();
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const years = availableYears(data);
  const campaigns = data.campaigns.filter((item) => item.month?.startsWith(`${selectedYear}-`));
  const bills = data.bills.filter((item) => item.dueDate.startsWith(`${selectedYear}-`));
  const extraExpenses = data.expenses.filter((item) => item.date.startsWith(`${selectedYear}-`));
  const generated = campaigns.reduce((sum, item) => sum + item.value, 0);
  const received = campaigns.reduce(
    (sum, item) => sum + item.payments.reduce((total, payment) => total + payment.amount, 0),
    0,
  );
  const registeredExpenses = extraExpenses.filter((item) => item.status === "Comprado").reduce((sum, item) => sum + item.amount, 0);
  const paidBills = bills.filter((bill) => bill.paid).reduce((sum, bill) => sum + bill.amount, 0);
  const expenses = registeredExpenses + paidBills;
  const pendingBills = bills.filter((bill) => !bill.paid).reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Resumen general</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Dashboard financiero</h1>
        <p className="mt-2 text-slate-600">Tus cifras se actualizan con cada registro.</p></div>
        <label><span className="sr-only">Año</span><select className="h-10 min-w-[148px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
      </header>
      <CollapsibleSection title="Indicadores generales">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores financieros">
        <SummaryCard titulo="Generado" valor={currency.format(generated)} detalle="Valor de todas las campañas" />
        <SummaryCard titulo="Recibido" valor={currency.format(received)} detalle="Pagos registrados" />
        <SummaryCard titulo="Por cobrar" valor={currency.format(generated - received)} detalle="Saldo de campañas" />
        <SummaryCard titulo="Balance" valor={currency.format(received - expenses)} detalle="Recibido menos gastos" />
      </section>
      </CollapsibleSection>
      <CollapsibleSection title="Gráficas y evolución">
      <FinanceCharts data={data} year={selectedYear} />
      </CollapsibleSection>
      <CollapsibleSection title="Actividad y ayuda">
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="card">
          <h2 className="text-lg font-semibold">Actividad</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt>Campañas</dt><dd className="font-semibold">{campaigns.length}</dd></div>
            <div className="flex justify-between"><dt>Gastos acumulados</dt><dd className="font-semibold">{currency.format(expenses)}</dd></div>
            <div className="flex justify-between"><dt>Cuentas pendientes</dt><dd className="font-semibold text-slate-700">{currency.format(pendingBills)}</dd></div>
          </dl>
        </article>
        <article className="card">
          <h2 className="text-lg font-semibold">Cómo usar este MVP</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Registra campañas y sus pagos, agrega gastos, controla cuentas y revisa el historial consolidado en Movimientos.</p>
        </article>
      </section>
      </CollapsibleSection>
    </div>
  );
}
