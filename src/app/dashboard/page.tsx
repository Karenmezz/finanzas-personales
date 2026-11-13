"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { dashboardSummary, isBarterCampaign, isPersonalIncome, selectFinanceArea } from "@/lib/finance-insights";
import { SummaryCard } from "@/components/summary-card";
import { useFinance } from "@/components/finance-provider";
import { availableYears, currency } from "@/lib/finance";
import { FinanceCharts } from "@/components/finance-charts";
import { BrandBrowser } from "@/components/brand-browser";
import { BrandRanking } from "@/components/brand-ranking";

const tabs = [
  { id: "general", label: "General" },
  { id: "finances", label: "Finanzas" },
  { id: "content", label: "Contenidos" },
  { id: "barter", label: "Canjes" },
  { id: "brands", label: "Marcas" },
  { id: "movements", label: "Movimientos" },
] as const;
type DashboardTab = (typeof tabs)[number]["id"];
type Indicator = { titulo: string; valor: string; detalle: string };

export default function DashboardPage() {
  const { data } = useFinance();
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [tab, setTab] = useState<DashboardTab>("general");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const years = availableYears(data);
  const scopedData = tab === "finances" ? selectFinanceArea(data, "finances") : tab === "content" || tab === "brands" ? selectFinanceArea(data, "content") : data;
  const summary = dashboardSummary(scopedData, selectedYear);
  const salaryTotal = summary.salaries.reduce((sum, salary) => sum + salary.value, 0);
  const brandTotal = summary.brandCampaigns.reduce((sum, campaign) => sum + campaign.value, 0);
  const movements = [
    ...data.campaigns.filter((campaign) => !isBarterCampaign(campaign)).flatMap((campaign) => campaign.payments.map((payment) => ({ id: `payment-${campaign.id}-${payment.id}`, concept: campaign.name, category: isPersonalIncome(campaign) ? "Salario" : campaign.brand, date: payment.date, amount: payment.amount, income: true }))),
    ...data.bills.filter((bill) => bill.paid).map((bill) => ({ id: `bill-${bill.id}`, concept: bill.name, category: "Cuenta de la casa", date: bill.dueDate, amount: bill.amount, income: false })),
    ...data.expenses.filter((expense) => expense.status === "Comprado").map((expense) => ({ id: `expense-${expense.id}`, concept: expense.concept, category: expense.category, date: expense.date, amount: expense.amount, income: false })),
  ].filter((movement) => movement.date.startsWith(`${selectedYear}-`)).sort((a, b) => b.date.localeCompare(a.date));
  const movementIncome = movements.filter((item) => item.income).reduce((sum, item) => sum + item.amount, 0);
  const movementExpenses = movements.filter((item) => !item.income).reduce((sum, item) => sum + item.amount, 0);
  const labels = {
    general: "Salario, marcas, cuentas de la casa y gastos extras en un solo resumen.",
    finances: "Tu salario, las cuentas de la casa y todos los gastos extras.",
    barter: "Productos y bonos recibidos, separados de tus ingresos en dinero.",
    content: "Campañas, publicaciones y cobros de tus colaboraciones.",
    brands: "Compara las marcas y consulta cuánto generan y cuánto han pagado.",
    movements: "Ingresos recibidos y gastos pagados durante el año seleccionado.",
  };
  let indicators: Indicator[] = [
    { titulo: "Ingresos totales", valor: currency.format(summary.generated), detalle: "Salario y campañas de marcas" },
    { titulo: "Recibido", valor: currency.format(summary.received), detalle: "Pagos registrados" },
    { titulo: "Por cobrar", valor: currency.format(summary.pending), detalle: "Saldo de salario y marcas" },
    { titulo: "Balance", valor: currency.format(summary.balance), detalle: "Recibido menos gastos pagados" },
  ];
  if (tab === "finances") indicators = [
    { titulo: "Ingresos personales", valor: currency.format(summary.generated), detalle: "Según tus ingresos configurados" },
    { titulo: "Recibido", valor: currency.format(summary.received), detalle: "Pagos del salario" },
    { titulo: "Gastos pagados", valor: currency.format(summary.expenses), detalle: "Casa y gastos extras" },
    { titulo: "Balance", valor: currency.format(summary.balance), detalle: "Salario recibido menos gastos" },
  ];
  if (tab === "content" || tab === "brands") indicators = [
    { titulo: "Campañas", valor: String(summary.contentCampaigns.length), detalle: "Pagas, canjes y mixtas" },
    { titulo: "Acordado", valor: currency.format(summary.generated), detalle: "Valor de las campañas" },
    { titulo: "Recibido", valor: currency.format(summary.received), detalle: "Pagos de marcas" },
    { titulo: "Por cobrar", valor: currency.format(summary.pending), detalle: "Saldo pendiente de marcas" },
  ];
  if (tab === "barter") indicators = [
    { titulo: "Colaboraciones con canje", valor: String(summary.benefits.count), detalle: "Canjes y campañas mixtas" },
    { titulo: "Por recibir", valor: String(summary.benefits.pending), detalle: "Beneficios pendientes" },
    { titulo: "Productos recibidos", valor: String(summary.benefits.products), detalle: "Cantidad, sin precio" },
    { titulo: "Saldo en bonos", valor: currency.format(summary.benefits.voucherBalance), detalle: "Beneficios para usar, no efectivo" },
  ];
  if (tab === "movements") indicators = [
    { titulo: "Movimientos", valor: String(movements.length), detalle: "Ingresos y salidas registrados" },
    { titulo: "Ingresos", valor: currency.format(movementIncome), detalle: "Pagos recibidos durante el año" },
    { titulo: "Gastos", valor: currency.format(movementExpenses), detalle: "Cuentas y extras pagados" },
    { titulo: "Balance", valor: currency.format(movementIncome - movementExpenses), detalle: "Ingresos menos salidas" },
  ];

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    setTab(tabs[next].id);
    tabRefs.current[next]?.focus();
    tabRefs.current[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  return <div className="mx-auto max-w-6xl">
    <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Resumen general</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Dashboard financiero</h1><p className="mt-2 text-slate-600">{labels[tab]}</p></div>
      <label><span className="sr-only">Año</span><select aria-label="Año del Dashboard" className="h-10 min-w-[128px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
    </header>
    <div role="tablist" aria-label="Categorías del Dashboard" className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
      {tabs.map((item, index) => <button key={item.id} ref={(element) => { tabRefs.current[index] = element; }} type="button" role="tab" id={`dashboard-tab-${item.id}`} aria-controls="dashboard-panel" aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} onKeyDown={(event) => navigateTabs(event, index)} onClick={() => setTab(item.id)} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 sm:flex-1 ${tab === item.id ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:bg-white"}`}>{item.label}</button>)}
    </div>
    <div role="tabpanel" id="dashboard-panel" aria-labelledby={`dashboard-tab-${tab}`}>
      <h2 className="mb-2 text-sm font-semibold text-slate-600">{tab === "general" ? "Indicadores generales" : `Indicadores de ${tabs.find((item) => item.id === tab)?.label}`}</h2>
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores financieros">{indicators.map((indicator, index) => <SummaryCard key={indicator.titulo} {...indicator} compacto tono={(["slate", "emerald", "amber", "indigo"] as const)[index]} />)}</section>

      {tab === "general" && <>
        <section className="mt-3 grid grid-cols-2 gap-2" aria-label="Origen de los ingresos">
          <SummaryCard tono="indigo" titulo="Ingresos personales" valor={currency.format(salaryTotal)} detalle="Ingresos guardados en tu cuenta" />
          <SummaryCard tono="emerald" titulo="Campañas de marcas" valor={currency.format(brandTotal)} detalle={`${summary.brandCampaigns.length} campañas en el año seleccionado`} />
        </section>
        <FinanceCharts data={data} year={selectedYear} />
        <BrandRanking campaigns={summary.brandCampaigns} period={String(selectedYear)} scrollable />
      </>}
      {(tab === "general" || tab === "content" || tab === "barter") && summary.benefits.count > 0 && <section className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/60 p-4" aria-label="Beneficios de canjes"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-violet-950">Canjes y beneficios</h2><Link className="button-secondary" href="/contenidos/canjes">Ver canjes</Link></div><p className="mt-2 text-sm text-violet-900">{summary.benefits.received} recibidos · {summary.benefits.pending} por recibir · {summary.benefits.withoutDate} sin fecha de publicación</p><p className="mt-2 text-xs text-slate-500">Los bonos y productos se controlan aparte del dinero ganado y del balance.</p></section>}
      {tab === "barter" && summary.benefits.count === 0 && <p className="card mt-4 text-sm text-slate-500">Todavía no hay canjes en este año. <Link className="font-semibold text-violet-800" href="/contenidos/canjes">Registrar un canje</Link></p>}
      {tab === "finances" && <>
        <section className="card mt-6" aria-label="Finanzas del hogar"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Casa y salario</h2><Link className="button-secondary" href="/">Abrir Finanzas</Link></div><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt>Salario pendiente de recibir</dt><dd className="font-semibold">{currency.format(summary.pending)}</dd></div><div className="flex justify-between gap-3"><dt>Cuentas y gastos pendientes</dt><dd className="font-semibold">{currency.format(summary.pendingExpenses)}</dd></div></dl></section>
        <FinanceCharts data={scopedData} year={selectedYear} scope="finances" />
      </>}
      {tab === "content" && <>
        <section className="card mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Estado del contenido</h2><Link className="button-secondary" href="/contenidos">Campañas y calendario</Link></div><dl className="mt-4 grid gap-3 sm:grid-cols-3">{["Pendiente", "En producción", "Realizado"].map((status) => <div key={status} className="rounded-xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">{status}</dt><dd className="mt-2 text-xl font-bold">{summary.contentCampaigns.filter((campaign) => campaign.status === status).length}</dd></div>)}</dl></section>
        <FinanceCharts data={scopedData} year={selectedYear} scope="content" />
      </>}
      {tab === "brands" && <div className="mt-5"><BrandBrowser key={selectedYear} campaigns={summary.contentCampaigns} period={String(selectedYear)} /></div>}
      {tab === "movements" && <section className="card mt-6" aria-label="Últimos movimientos"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Últimos movimientos</h2><p className="mt-1 text-xs text-slate-500">Los pagos de cuentas usan la fecha de vencimiento registrada.</p></div><Link className="button-secondary" href="/movimientos">Ver historial</Link></div><div className="mt-4 divide-y divide-slate-100">{movements.slice(0, 12).map((movement) => <article key={movement.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{movement.concept}</h3><p className="mt-1 text-xs text-slate-500">{movement.category} · {movement.date}</p></div><p className={`shrink-0 text-sm font-bold ${movement.income ? "text-emerald-700" : "text-rose-700"}`}>{movement.income ? "+" : "−"}{currency.format(movement.amount)}</p></article>)}</div>{movements.length === 0 && <p className="mt-4 text-sm text-slate-500">No hay movimientos registrados para este año.</p>}</section>}
    </div>
  </div>;
}
