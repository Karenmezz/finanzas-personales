"use client";

import Link from "next/link";
import { MonthlyAmountForm } from "@/components/monthly-amount-form";
import { CollaborationForm } from "@/components/collaboration-form";
import { ContentCalendar } from "@/components/content-calendar";
import { CampaignBenefitDetails } from "@/components/campaign-benefit-details";
import { CampaignBenefitActions } from "@/components/campaign-benefit-actions";
import { useRouter } from "next/navigation";
import type { Campaign } from "@/lib/finance";
import { UsdPaymentDialog } from "@/components/usd-payment-dialog";
import { CampaignUsdDetails } from "@/components/campaign-usd-details";
import { FormEvent, useState } from "react";
import { useFinance } from "@/components/finance-provider";
import { availableYears, createId, currency } from "@/lib/finance";
import { selectFinanceArea, type FinanceArea, previousPendingCampaigns, isBarterCampaign, resetBenefit } from "@/lib/finance-insights";
import { CollapsibleSection } from "@/components/collapsible-section";

const months = [
  ["01", "Enero"], ["02", "Febrero"],
  ["03", "Marzo"], ["04", "Abril"], ["05", "Mayo"], ["06", "Junio"],
  ["07", "Julio"], ["08", "Agosto"], ["09", "Septiembre"],
  ["10", "Octubre"], ["11", "Noviembre"], ["12", "Diciembre"],
];
export function MonthlyWorkspace({ area, initialPeriod, initialEditId, initialCreate }: { area: FinanceArea; initialPeriod?: string; initialEditId?: string; initialCreate?: "expense" | "campaign" }) {
  const router = useRouter();
  const isContent = area === "content";
  const { data: allData, addBill, addCampaign, addExpense, addPayment, deleteBill, deleteCampaign, deleteExpense, removeLastPayment, toggleBill, updateBill, updateCampaign, updateExpense, updateMonthColor } = useFinance();
  const data = selectFinanceArea(allData, area);
  const [usdPaymentId, setUsdPaymentId] = useState<string | null>(null);
  const usdPaymentCampaign = allData.campaigns.find((campaign) => campaign.id === usdPaymentId);
  const [selectedMonth, setSelectedMonth] = useState(() => initialPeriod?.slice(5, 7) ?? String(new Date().getMonth() + 1).padStart(2, "0"));
  const [selectedYear, setSelectedYear] = useState(() => initialPeriod ? Number(initialPeriod.slice(0, 4)) : new Date().getFullYear());
  const [editingCampaign, setEditingCampaign] = useState<string | null>(initialEditId ?? null);
  const [adjustingIncome, setAdjustingIncome] = useState<string | null>(null);
  const [adjustingBill, setAdjustingBill] = useState<string | null>(null);
  const [editingBill, setEditingBill] = useState<string | null>(null);
  const [creatingCampaign, setCreatingCampaign] = useState(initialCreate === "campaign");
  const [creatingBill, setCreatingBill] = useState(false);
  const [creatingExpense, setCreatingExpense] = useState(initialCreate === "expense");
  const [customizingColor, setCustomizingColor] = useState(false);
  const [hidePaidCampaigns, setHidePaidCampaigns] = useState(!initialEditId);
  const [hidePaidBills, setHidePaidBills] = useState(true);
  const [showPaidExpenses, setShowPaidExpenses] = useState(false);
  const [lastRegisteredPayment, setLastRegisteredPayment] = useState<{ campaignId: string; campaignName: string; amount: number } | null>(null);
  const monthName = months.find(([value]) => value === selectedMonth)?.[1];
  const years = availableYears(allData);
  const selectedPeriod = `${selectedYear}-${selectedMonth}`;
  const campaigns = data.campaigns
    .filter((item) => (item.month ?? item.dueDate.slice(0, 7)) === selectedPeriod && !isBarterCampaign(item))
    .sort((a, b) => {
      const pendingA = a.value - a.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const pendingB = b.value - b.payments.reduce((sum, payment) => sum + payment.amount, 0);
      if ((pendingA > 0) !== (pendingB > 0)) return pendingA > 0 ? -1 : 1;
      return b.value - a.value;
    });
  const bills = data.bills
    .filter((item) => item.dueDate.startsWith(selectedPeriod))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const expenses = data.expenses.filter((item) => item.date.startsWith(selectedPeriod));
  const generated = campaigns.reduce((sum, item) => sum + item.value, 0);
  const received = campaigns.reduce((sum, item) => sum + item.payments.reduce((total, payment) => total + payment.amount, 0), 0);
  const allCampaignsPaid = campaigns.length > 0 && campaigns.every((campaign) => campaign.payments.reduce((sum, payment) => sum + payment.amount, 0) >= campaign.value);
  const visibleCampaigns = hidePaidCampaigns ? campaigns.filter((campaign) => campaign.payments.reduce((sum, payment) => sum + payment.amount, 0) < campaign.value) : campaigns;
  const otherPendingCampaigns = previousPendingCampaigns(data.campaigns, selectedPeriod);
  const billTotal = bills.reduce((sum, item) => sum + item.amount, 0);
  const pendingBills = bills.filter((bill) => !bill.paid);
  const paidBillTotal = bills.filter((bill) => bill.paid).reduce((sum, bill) => sum + bill.amount, 0);
  const pendingBillTotal = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);
  const paidBillCount = bills.length - pendingBills.length;
  const visibleBills = hidePaidBills ? pendingBills : bills;
  const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const pendingExtraTotal = expenses.filter((item) => item.status === "Pendiente").reduce((sum, item) => sum + item.amount, 0);

  function registerPayment(id: string, maximum: number) {
    const campaign = data.campaigns.find((item) => item.id === id);
    if (campaign?.currency === "USD") { setUsdPaymentId(id); return; }
    addPayment(id, maximum);
    if (campaign) setLastRegisteredPayment({ campaignId: id, campaignName: campaign.name, amount: maximum });
  }

  function undoPayment(campaignId: string) {
    removeLastPayment(campaignId);
    setLastRegisteredPayment((payment) => payment?.campaignId === campaignId ? null : payment);
  }

  function onSavedCollaboration(campaign: Campaign) {
    setCreatingCampaign(false); setEditingCampaign(null);
    if (isBarterCampaign(campaign)) router.push(`/contenidos/canjes?month=${campaign.month}`);
    else if (campaign.month) { setSelectedYear(Number(campaign.month.slice(0, 4))); setSelectedMonth(campaign.month.slice(5, 7)); }
  }

  function createBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    addBill({ id: createId(), name: String(form.get("name")), category: String(form.get("category")), amount: Number(form.get("amount")), dueDate: `${selectedPeriod}-28`, paid: false });
    event.currentTarget.reset(); setCreatingBill(false);
  }

  function createExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    addExpense({ id: createId(), concept: String(form.get("concept")), category: String(form.get("category")), amount: Number(form.get("amount")), date: `${selectedPeriod}-28`, status: String(form.get("status")) as "Pendiente" | "Comprado" });
    event.currentTarget.reset(); setCreatingExpense(false);
  }

  function saveBill(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    updateBill(id, { name: String(form.get("name")), category: String(form.get("category")), amount: Number(form.get("amount")) });
    setEditingBill(null);
  }

  function duplicateCampaign(campaign: (typeof campaigns)[number]) {
    addCampaign({ ...campaign, id: createId(), name: `${campaign.name} (copia)`, status: "Pendiente", payments: [], benefit: resetBenefit(campaign.benefit), contentDueDate: undefined });
  }

  function duplicateBill(bill: (typeof bills)[number]) {
    addBill({ ...bill, id: createId(), name: `${bill.name} (copia)`, recurringId: undefined, manualOverride: false, paid: false });
  }

  return <div className="mx-auto max-w-7xl">
    {usdPaymentCampaign && <UsdPaymentDialog key={usdPaymentCampaign.id} campaign={usdPaymentCampaign} onClose={() => setUsdPaymentId(null)} onSaved={(amount) => setLastRegisteredPayment({ campaignId: usdPaymentCampaign.id, campaignName: usdPaymentCampaign.name, amount })} />}
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Organización mensual</p><h1 className="mt-2 text-3xl font-bold">{isContent ? "Contenidos" : "Finanzas"}</h1><p className="mt-2 text-slate-600">{isContent ? "Organiza tus campañas, cobros, marcas y fechas de publicación." : "Tu salario, las cuentas de la casa, transporte y gastos personales."}</p></div><div className="flex flex-wrap items-center gap-2"><label><span className="sr-only">Año</span><select className="h-10 min-w-[128px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold" value={selectedYear} onChange={(event) => { setSelectedYear(Number(event.target.value)); setHidePaidCampaigns(true); setHidePaidBills(true); setShowPaidExpenses(false); }}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>{isContent && <button className="button h-10" onClick={() => { setCreatingCampaign(!creatingCampaign); setCreatingBill(false); setCreatingExpense(false); }}>+ Nueva campaña</button>}{!isContent && <button className="button-secondary h-10" onClick={() => { setCreatingBill(!creatingBill); setCreatingCampaign(false); setCreatingExpense(false); }}>+ Nuevo servicio</button>}{!isContent && <button className="button-secondary h-10" onClick={() => { setCreatingExpense(!creatingExpense); setCreatingCampaign(false); setCreatingBill(false); }}>+ Nuevo gasto</button>}</div></header>
    <div className="mb-5 sm:hidden"><label className="block w-44"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Mes</span><select id="finance-month" className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold" style={{ borderColor: data.monthColors[selectedMonth], backgroundColor: `${data.monthColors[selectedMonth]}33` }} value={selectedMonth} onChange={(event) => { setSelectedMonth(event.target.value); setHidePaidCampaigns(true); setHidePaidBills(true); setShowPaidExpenses(false); setCustomizingColor(false); }}>{months.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    <nav className="mb-5 hidden gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-1.5 sm:flex" aria-label="Seleccionar mes">{months.map(([value, label]) => <button key={value} onClick={() => { setSelectedMonth(value); setHidePaidCampaigns(true); setHidePaidBills(true); setShowPaidExpenses(false); setCustomizingColor(false); }} className="min-w-[72px] flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition" style={{ borderColor: selectedMonth === value ? data.monthColors[value] : "transparent", backgroundColor: selectedMonth === value ? `${data.monthColors[value]}55` : "transparent" }}>{label}</button>)}</nav>

    {creatingCampaign && <CollaborationForm period={selectedPeriod} onSaved={onSavedCollaboration} onCancel={() => setCreatingCampaign(false)} />}
    {creatingBill && <form onSubmit={createBill} className="card mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label><span className="label">Servicio</span><input className="field" name="name" required /></label><label><span className="label">Categoría</span><input className="field" name="category" placeholder="Hogar, comunicación..." required /></label><label><span className="label">Valor</span><input className="field" name="amount" type="number" min="0" required /></label><div className="flex gap-2 sm:col-span-2"><button className="button" type="submit">Guardar en {monthName}</button><button className="button-secondary" type="button" onClick={() => setCreatingBill(false)}>Cancelar</button></div></form>}
    {!isContent && creatingExpense && <form id="nuevo-registro" onSubmit={createExpense} className="card mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label><span className="label">Concepto</span><input className="field" name="concept" required /></label><label><span className="label">Categoría</span><select className="field" name="category">{["Hogar", "Vivienda", "Servicios", "Transporte", "Alimentación", "Salud", "Trabajo", "Producción", "Contenido", "Publicidad", "Otro"].map((category) => <option key={category}>{category}</option>)}</select></label><label><span className="label">Valor</span><input className="field" name="amount" type="number" min="1" required /></label><label><span className="label">Estado</span><select className="field" name="status"><option>Pendiente</option><option>Comprado</option></select></label><div className="flex gap-2 sm:col-span-2"><button className="button" type="submit">Guardar en {monthName}</button><button className="button-secondary" type="button" onClick={() => setCreatingExpense(false)}>Cancelar</button></div></form>}

    <CollapsibleSection title="Resumen del mes">
    <section aria-label="Resumen mensual" className="mb-4 rounded-2xl border p-3 sm:rounded-3xl sm:p-5" style={{ borderColor: data.monthColors[selectedMonth], backgroundColor: `${data.monthColors[selectedMonth]}33` }}><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{monthName} {selectedYear}</p><div className="flex items-center gap-2">{customizingColor && <><label htmlFor="month-color" className="sr-only">Color de {monthName}</label><input id="month-color" type="color" value={data.monthColors[selectedMonth]} onChange={(event) => updateMonthColor(selectedMonth, event.target.value)} className="h-8 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" /></>}<button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => setCustomizingColor(!customizingColor)}>{customizingColor ? "Listo" : "Personalizar"}</button></div></div><div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4"><MonthlyTotal label={isContent ? "Generado en campañas" : "Ingresos del mes"} value={generated} /><MonthlyTotal label="Recibido" value={received} /><MonthlyTotal label={isContent ? "Por cobrar" : "Balance disponible"} value={isContent ? generated - received : received - paidBillTotal - expenses.filter((item) => item.status === "Comprado").reduce((sum, item) => sum + item.amount, 0)} warning /><MonthlyTotal label={isContent ? "Promedio por campaña" : "Por pagar"} value={isContent ? (campaigns.length ? generated / campaigns.length : 0) : pendingBillTotal + pendingExtraTotal} warning={!isContent} /></div></section>
    </CollapsibleSection>

    <div className={isContent ? "space-y-6" : "grid gap-6 lg:grid-cols-2"}>
      {isContent ? <CollapsibleSection title="Dinero por cobrar">
      <section className="card min-w-0"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-lg font-bold">Dinero por cobrar</h2><p className="text-sm text-slate-500">{campaigns.length} campañas en {monthName}</p></div>{campaigns.length > visibleCampaigns.length || !hidePaidCampaigns ? <button type="button" className="ml-auto inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-semibold leading-tight text-slate-600 transition hover:bg-slate-100 sm:text-xs" aria-label={hidePaidCampaigns ? "Mostrar campañas pagadas" : "Ocultar campañas pagadas"} aria-pressed={hidePaidCampaigns} onClick={() => setHidePaidCampaigns(!hidePaidCampaigns)}>{hidePaidCampaigns ? "Mostrar pagadas" : "Ocultar pagadas"}</button> : null}</div><MoneyStatusSummary items={[{ label: "Total ganado", value: generated, tone: "neutral" }, { label: "Ya recibiste", value: received, tone: "positive" }, { label: "Falta recibir", value: generated - received, tone: "warning" }]} />{lastRegisteredPayment && <div role="status" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div><p className="font-bold text-emerald-950">Pago registrado</p><p className="mt-1 text-sm text-emerald-800">{lastRegisteredPayment.campaignName} · {currency.format(lastRegisteredPayment.amount)}</p></div><button type="button" className="button-secondary" onClick={() => undoPayment(lastRegisteredPayment.campaignId)}>Deshacer pago</button></div>}{otherPendingCampaigns.length > 0 && <PendingReceivables items={otherPendingCampaigns} onDateChange={(id, dueDate) => updateCampaign(id, { dueDate })} onPay={registerPayment} />}{allCampaignsPaid && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900"><div role="status" className="flex items-center gap-3"><span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 font-bold text-white">✓</span><div><p className="font-bold">¡Estás al día!</p><p className="text-sm text-green-700">Recibiste todos los pagos de {monthName}.</p></div></div></div>}<div className="mt-5 space-y-3">{visibleCampaigns.map((campaign) => { const paid = campaign.payments.reduce((sum, item) => sum + item.amount, 0); const pending = campaign.value - paid; const paymentLabel = pending === 0 ? "Pagada" : campaign.status === "Realizado" ? "Esperando pago" : "Contenido pendiente"; return <article key={campaign.id} className="rounded-2xl border border-slate-100 bg-white p-4">{editingCampaign === campaign.id ? <CollaborationForm key={campaign.id} embedded campaign={campaign} period={selectedPeriod} onSaved={onSavedCollaboration} onCancel={() => setEditingCampaign(null)} /> : <><div className="flex justify-between gap-3"><div><h3 className="font-semibold">{campaign.name}</h3><p className="mt-1 text-xs text-slate-500">{campaign.brand} · {campaign.network}</p><span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${campaign.status === "Realizado" ? "bg-green-100 text-green-800" : campaign.status === "En producción" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>Contenido: {campaign.status}</span>{campaign.contentDueDate && <p className="mt-2 text-xs font-medium text-slate-600">📅 Límite: {formatContentDate(campaign.contentDueDate)}</p>}{pending > 0 && <div className="mt-2"><PaymentDueReminder dueDate={campaign.dueDate} /></div>}</div><div className="text-right"><p className="font-semibold">{currency.format(campaign.value)}</p><p className={`text-xs ${pending > 0 ? "text-slate-700" : "text-slate-600"}`}>{pending > 0 ? `${currency.format(pending)} por cobrar` : "Pagada"}</p><p className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-semibold ${paymentLabel === "Pagada" ? "bg-green-100 text-green-800" : paymentLabel === "Esperando pago" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>{paymentLabel}</p></div></div><CampaignUsdDetails campaign={campaign} /><CampaignBenefitDetails campaign={campaign} /><CampaignBenefitActions campaign={campaign} /><div className="mt-3 flex flex-wrap gap-2"><button className="button-secondary" onClick={() => setEditingCampaign(campaign.id)}>Editar o mover</button><button className="button-secondary" onClick={() => duplicateCampaign(campaign)}>Duplicar</button>{pending > 0 && <button className="button" onClick={() => registerPayment(campaign.id, pending)}>Registrar pago</button>}{campaign.payments.length > 0 && <button className="button-secondary" onClick={() => undoPayment(campaign.id)}>Deshacer último pago</button>}<button className="button-danger" onClick={() => deleteCampaign(campaign.id)}>Eliminar</button></div></>}</article>; })}{campaigns.length === 0 && <p className="py-6 text-center text-slate-500">No hay campañas este mes.</p>}</div></section>
      </CollapsibleSection> : <section className="card" aria-label="Ingresos personales">
        <h2 className="text-lg font-bold">Ingresos personales</h2>
        <Link className="mt-1 inline-block text-sm font-medium text-indigo-700" href="/configuracion">Configurar ingresos y gastos fijos</Link>
        <MoneyStatusSummary items={[{ label: "Ingresos del mes", value: generated, tone: "neutral" }, { label: "Recibido", value: received, tone: "positive" }, { label: "Por recibir", value: Math.max(generated - received, 0), tone: "warning" }]} />
        {campaigns.length > visibleCampaigns.length || !hidePaidCampaigns ? <button type="button" className="button-secondary mt-4" onClick={() => setHidePaidCampaigns(!hidePaidCampaigns)}>{hidePaidCampaigns ? "Mostrar ingresos recibidos" : "Ocultar ingresos recibidos"}</button> : null}
        {visibleCampaigns.map((salary) => { const paid = salary.payments.reduce((sum, payment) => sum + payment.amount, 0); const pending = Math.max(salary.value - paid, 0); return <article key={salary.id} className="mt-4 rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{salary.name} · {monthName}</h3><p className="mt-1 text-sm text-slate-500">Fecha esperada: {salary.dueDate}</p></div><p className="font-bold">{currency.format(salary.value)}</p></div>
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">{salary.payments.length > 0 && <button className="button-secondary" onClick={() => undoPayment(salary.id)}>Deshacer último pago</button>}{salary.payments.length === 0 && <button className="button-secondary" onClick={() => setAdjustingIncome(salary.id)}>Ajustar valor</button>}{pending > 0 && <button className="button" onClick={() => registerPayment(salary.id, pending)}>Registrar ingreso recibido</button>}</div>{adjustingIncome === salary.id && <MonthlyAmountForm kind="income" id={salary.id} amount={salary.value} period={selectedPeriod} recurring={Boolean(salary.recurringId)} onClose={() => setAdjustingIncome(null)} />}
        </article>; })}
        {campaigns.length === 0 && <p className="mt-4 text-sm text-slate-500">No hay ingresos para este mes. Puedes agregarlos desde Configuración.</p>}
      </section>}


      {!isContent && <CollapsibleSection title="Dinero por pagar">
      <section className="card min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold">Dinero por pagar</h2><p className="text-sm text-slate-500">Servicios de {monthName}</p></div>
          {paidBillCount > 0 && pendingBills.length > 0 && <button type="button" className="button-secondary" aria-pressed={hidePaidBills} onClick={() => setHidePaidBills(!hidePaidBills)}>{hidePaidBills ? `Mostrar pagados (${paidBillCount})` : `Ocultar pagados (${paidBillCount})`}</button>}
        </div>
        <MoneyStatusSummary items={[{ label: "Total de obligaciones", value: billTotal, tone: "neutral" }, { label: "Ya pagaste", value: paidBillTotal, tone: "positive" }, { label: "Falta pagar", value: pendingBillTotal, tone: "warning" }]} />
        {bills.length > 0 && pendingBills.length === 0 && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900"><div role="status" className="flex items-center gap-3"><span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 font-bold text-white">✓</span><div><p className="font-bold">¡Estás al día!</p><p className="text-sm text-green-700">Pagaste todos los servicios de {monthName}.</p></div></div><button type="button" className="button-secondary" aria-pressed={hidePaidBills} onClick={() => setHidePaidBills(!hidePaidBills)}>{hidePaidBills ? "Mostrar servicios pagados" : "Ocultar servicios pagados"}</button></div>}
        <div className="mt-5 space-y-3">{visibleBills.map((bill) => <article key={bill.id} className="rounded-2xl border border-slate-100 bg-white p-4">{adjustingBill === bill.id ? <div><h3 className="font-semibold">{bill.name}</h3><MonthlyAmountForm kind="expense" id={bill.id} amount={bill.amount} period={selectedPeriod} recurring={Boolean(bill.recurringId)} onClose={() => setAdjustingBill(null)} /></div> : editingBill === bill.id ? <form onSubmit={(event) => saveBill(event, bill.id)} className="grid gap-3 sm:grid-cols-2"><input className="field" name="name" defaultValue={bill.name} aria-label="Cuenta" required /><input className="field" name="category" defaultValue={bill.category} aria-label="Categoría" required /><input className="field" name="amount" type="number" min="0" defaultValue={bill.amount} aria-label="Valor" required /><div className="flex gap-2"><button className="button" type="submit">Guardar</button><button className="button-secondary" type="button" onClick={() => setEditingBill(null)}>Cancelar</button></div></form> : <><div className="flex items-center justify-between"><div><h3 className="font-semibold">{bill.name}</h3><p className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-semibold ${bill.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{bill.paid ? "Pagada" : "Pendiente"}</p></div><p className="font-semibold">{bill.amount ? currency.format(bill.amount) : "Sin valor"}</p></div><div className="mt-3 flex flex-wrap gap-2"><button className="button-secondary" disabled={bill.paid} onClick={() => bill.recurringId ? setAdjustingBill(bill.id) : setEditingBill(bill.id)}>{bill.recurringId ? "Ajustar valor" : "Editar"}</button><button className="button-secondary" onClick={() => duplicateBill(bill)}>Duplicar</button><button className={bill.paid ? "button-secondary" : "button"} onClick={() => toggleBill(bill.id)}>{bill.paid ? "Marcar pendiente" : "Marcar pagada"}</button><button className="button-danger" onClick={() => deleteBill(bill.id)}>Eliminar</button></div></>}</article>)}</div>
      </section>
      </CollapsibleSection>}
    </div>

    <div className="mt-6">
      {isContent && <CollapsibleSection title="Calendario de contenido"><ContentCalendar campaigns={data.campaigns} period={selectedPeriod} onEdit={(campaign) => { if (isBarterCampaign(campaign)) router.push(`/contenidos/canjes?month=${campaign.month ?? selectedPeriod}&edit=${encodeURIComponent(campaign.id)}`); else { const period = campaign.month ?? campaign.dueDate.slice(0, 7); setSelectedYear(Number(period.slice(0, 4))); setSelectedMonth(period.slice(5, 7)); setHidePaidCampaigns(false); setEditingCampaign(campaign.id); } }} /></CollapsibleSection>}
      {!isContent && <CollapsibleSection title="Gastos extras">
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Gastos extras</h2><p className="text-sm text-slate-500">Gastos adicionales de {monthName}</p></div><span className="font-semibold">{currency.format(expenseTotal)}</span></div>
      <button type="button" className="button-secondary mt-4" onClick={() => setShowPaidExpenses(!showPaidExpenses)}>{showPaidExpenses ? "Ocultar pagados" : "Mostrar pagados"}</button>
      <div className="mt-5 space-y-3">{expenses.filter((expense) => showPaidExpenses || expense.status !== "Comprado").map((expense) => <article key={expense.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><div><h3 className="font-semibold">{expense.concept}</h3><p className="mt-1 text-xs text-slate-500">{expense.category}</p><span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${expense.status === "Comprado" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{expense.status}</span></div><p className="font-semibold">{currency.format(expense.amount)}</p></div><div className="mt-3 flex flex-wrap gap-2"><button className="button-secondary" onClick={() => updateExpense(expense.id, { status: expense.status === "Comprado" ? "Pendiente" : "Comprado" })}>{expense.status === "Comprado" ? "Marcar pendiente" : "Marcar comprado"}</button><button className="button-danger" onClick={() => deleteExpense(expense.id)}>Eliminar</button></div></article>)}</div>
      {expenses.length === 0 && <p className="mt-5 text-sm text-slate-500">No hay gastos extras en este mes.</p>}
    </section>
      </CollapsibleSection>}
    </div>
  </div>;
}

function MonthlyTotal({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return <div className="min-w-0 rounded-xl border border-white/80 bg-white/80 px-2.5 py-2 sm:p-4"><p className="text-[9px] font-semibold uppercase leading-snug tracking-wide text-slate-500 sm:text-xs">{label}</p><p className={`mt-1 break-words text-sm font-bold tabular-nums min-[375px]:text-base sm:text-xl ${warning && value > 0 ? "text-slate-700" : "text-slate-800"}`}>{currency.format(value)}</p></div>;
}

type MoneyStatusItem = {
  label: string;
  value: number;
  tone: "neutral" | "positive" | "warning";
};

const moneyStatusTone = {
  neutral: "border-slate-200 bg-slate-50 text-slate-950",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

function MoneyStatusSummary({ items }: { items: MoneyStatusItem[] }) {
  return <dl className="@container mt-3 grid grid-cols-3 gap-1.5 sm:mt-4 sm:gap-3" aria-label="Resumen de dinero">{items.map((item) => <div key={item.label} className={`min-w-0 rounded-xl border px-2 py-2 sm:px-3 sm:py-3 ${moneyStatusTone[item.tone]}`}><dt className="min-h-6 text-[9px] font-semibold leading-tight min-[375px]:text-[10px] sm:text-xs">{item.label}</dt><dd className="mt-0.5 whitespace-nowrap text-[clamp(0.625rem,3.4cqi,1.125rem)] font-bold leading-tight tracking-tight tabular-nums">{currency.format(item.value)}</dd></div>)}</dl>;
}

function PendingReceivables({ items, onDateChange, onPay }: {
  items: ReturnType<typeof previousPendingCampaigns>;
  onDateChange: (id: string, date: string) => void;
  onPay: (id: string, amount: number) => void;
}) {
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const total = items.reduce((sum, item) => sum + item.pending, 0);
  const periods = [...new Set(items.map((item) => item.period))].sort();
  return <aside className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-3 sm:p-4" aria-label="Cobros pendientes de meses anteriores">
    <header className="flex items-start justify-between gap-3 border-b border-amber-200/70 pb-3">
      <div className="min-w-0"><h3 className="text-sm font-bold leading-snug text-amber-950">Cobros de meses anteriores</h3><p className="mt-1 text-[11px] text-amber-800">{items.length} {items.length === 1 ? "campaña pendiente" : "campañas pendientes"}</p></div>
      <div className="shrink-0 text-right"><p className="text-[10px] font-medium text-amber-800">Total pendiente</p><p className="mt-1 text-sm font-bold tracking-tight text-amber-950 sm:text-base">{currency.format(total)}</p></div>
    </header>
    <p className="mt-2 text-[10px] leading-snug text-amber-800">Este saldo es adicional al mes seleccionado.</p>
    <div className="mt-3 space-y-4">{periods.map((period) => <section key={period} aria-label={`Cobros de ${formatCampaignPeriod(period)}`}>
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-900">{formatCampaignPeriod(period)}</h4>
      <div className="grid gap-2 lg:grid-cols-2">{items.filter((item) => item.period === period).map(({ campaign, pending }) => <article key={campaign.id} className="min-w-0 rounded-xl border border-amber-100 bg-white p-2.5 sm:p-4">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h5 className="break-words text-sm font-semibold leading-snug text-slate-900">{campaign.name}</h5><p className="mt-0.5 break-words text-[11px] text-slate-500">{campaign.brand}</p></div><p className="shrink-0 text-sm font-bold tracking-tight text-amber-900">{currency.format(pending)}</p></div>
        <CampaignUsdDetails campaign={campaign} /><p className="mt-2 text-[11px] text-slate-500">Pago esperado: {formatContentDate(campaign.dueDate)}</p>
        <div className="mt-2"><PaymentDueReminder dueDate={campaign.dueDate} compact /></div>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
          <button type="button" className="py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800" aria-expanded={editingDate === campaign.id} aria-controls={`payment-date-${campaign.id}`} onClick={() => setEditingDate(editingDate === campaign.id ? null : campaign.id)}>{editingDate === campaign.id ? "Listo" : "Cambiar fecha"}</button>
          <button type="button" className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-700" onClick={() => onPay(campaign.id, pending)}>Registrar pago</button>
        </div>
        {editingDate === campaign.id && <label id={`payment-date-${campaign.id}`} className="mt-2 block min-w-0 overflow-hidden"><span className="mb-1 block text-[11px] font-medium text-slate-600">Fecha esperada de pago de {campaign.name}</span><input className="field" type="date" value={campaign.dueDate} onChange={(event) => { if (event.target.value) onDateChange(campaign.id, event.target.value); }} /></label>}
      </article>)}</div>
    </section>)}</div>
  </aside>;
}

function formatContentDate(date: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function formatCampaignPeriod(period: string) {
  const [year, month] = period.split("-");
  const label = months.find(([value]) => value === month)?.[1] ?? month;
  return `${label} ${year}`;
}

function daysUntilPayment(dueDate: string) {
  const [dueYear, dueMonth, dueDay] = dueDate.split("-").map(Number);
  const todayParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const todayPart = (type: "year" | "month" | "day") => Number(todayParts.find((part) => part.type === type)?.value);
  const today = Date.UTC(todayPart("year"), todayPart("month") - 1, todayPart("day"));
  const due = Date.UTC(dueYear, dueMonth - 1, dueDay);
  return Math.round((due - today) / 86_400_000);
}

function PaymentDueReminder({ dueDate, compact = false }: { dueDate: string; compact?: boolean }) {
  const days = daysUntilPayment(dueDate);
  const label = days < -1
    ? `Vencido hace ${Math.abs(days)} días`
    : days === -1
      ? "Vencido desde ayer"
      : days === 0
        ? "Pago esperado hoy"
        : days === 1
          ? "Falta 1 día para cobrar"
          : `Faltan ${days} días para cobrar`;
  const tone = days < 0
    ? "border-red-200 bg-red-50 text-red-800"
    : days <= 3
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-sky-200 bg-sky-50 text-sky-800";

  if (compact) return <span className={`inline-block max-w-full rounded-md border px-2 py-1 text-[10px] font-semibold leading-tight ${tone}`}>{label}</span>;

  return <div className={`w-full min-w-0 max-w-full self-end overflow-hidden rounded-xl border px-3 py-2 text-xs font-semibold ${tone}`}><p className="break-words">{label}</p><p className="mt-0.5 break-words font-normal opacity-80">Fecha: {formatContentDate(dueDate)}</p></div>;
}
