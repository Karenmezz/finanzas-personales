"use client";

import { dashboardSummary } from "@/lib/finance-insights";
import { useState } from "react";
import { SummaryCard } from "@/components/summary-card";
import { useFinance } from "@/components/finance-provider";
import { availableYears, currency } from "@/lib/finance";
import { FinanceCharts } from "@/components/finance-charts";
import { BrandRanking } from "@/components/brand-ranking";
import { CollapsibleSection } from "@/components/collapsible-section";

export default function Home() {
  const { data } = useFinance();
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const years = availableYears(data);
  const { generated, received, pending, expenses, pendingExpenses, balance, salaries, brandCampaigns } = dashboardSummary(data, selectedYear);
  const salaryTotal = salaries.reduce((sum, salary) => sum + salary.value, 0);
  const brandTotal = brandCampaigns.reduce((sum, campaign) => sum + campaign.value, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Resumen general</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Dashboard financiero</h1>
        <p className="mt-2 text-slate-600">Salario, marcas, cuentas de la casa y gastos extras en un solo resumen.</p></div>
        <label><span className="sr-only">Año</span><select className="h-10 min-w-[148px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
      </header>
      <CollapsibleSection title="Indicadores generales">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores financieros">
        <SummaryCard titulo="Ingresos totales" valor={currency.format(generated)} detalle="Salario y campañas de marcas" />
        <SummaryCard titulo="Recibido" valor={currency.format(received)} detalle="Pagos registrados" />
        <SummaryCard titulo="Por cobrar" valor={currency.format(pending)} detalle="Saldo pendiente de salario y marcas" />
        <SummaryCard titulo="Balance" valor={currency.format(balance)} detalle="Recibido menos gastos" />
      </section>
      </CollapsibleSection>
    <section className="mt-6 grid gap-4 sm:grid-cols-2" aria-label="Origen de los ingresos">
      <SummaryCard titulo="Salario de Fundación de la Mujer" valor={currency.format(salaryTotal)} detalle="Fijo mensual de $3.100.000 desde octubre de 2026" />
      <SummaryCard titulo="Campañas de marcas" valor={currency.format(brandTotal)} detalle={`${brandCampaigns.length} campañas en el año seleccionado`} />
    </section>
    <BrandRanking campaigns={brandCampaigns} period={String(selectedYear)} />
      <CollapsibleSection title="Gráficas y evolución">
      <FinanceCharts data={data} year={selectedYear} />
      </CollapsibleSection>
      <CollapsibleSection title="Actividad y ayuda">
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="card">
          <h2 className="text-lg font-semibold">Actividad</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt>Campañas de marcas</dt><dd className="font-semibold">{brandCampaigns.length}</dd></div>
            <div className="flex justify-between"><dt>Gastos acumulados</dt><dd className="font-semibold">{currency.format(expenses)}</dd></div>
            <div className="flex justify-between"><dt>Cuentas pendientes</dt><dd className="font-semibold text-slate-700">{currency.format(pendingExpenses)}</dd></div>
          </dl>
        </article>
        <article className="card">
          <h2 className="text-lg font-semibold">Organiza cada sección</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">En Contenidos administra campañas, marcas y publicaciones. En Finanzas administra el salario, las cuentas de la casa y todos los gastos extras. El Dashboard reúne ambas áreas. En Movimientos puedes consultar el historial de cada sección.</p>
        </article>
      </section>
      </CollapsibleSection>
    </div>
  );
}
