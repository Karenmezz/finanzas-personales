"use client";

import { FormEvent, useState } from "react";
import { useFinance } from "@/components/finance-provider";
import { availableYears, createId, currency } from "@/lib/finance";
import { CollapsibleSection } from "@/components/collapsible-section";

const months = [
  ["01", "Enero"], ["02", "Febrero"],
  ["03", "Marzo"], ["04", "Abril"], ["05", "Mayo"], ["06", "Junio"],
  ["07", "Julio"], ["08", "Agosto"], ["09", "Septiembre"],
  ["10", "Octubre"], ["11", "Noviembre"], ["12", "Diciembre"],
];
const serviceOrder = ["Arriendo", "Luz", "Gas", "Agua", "Wifi", "Datos"];
const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export default function MonthsPage() {
  const { data, addCampaign, addExpense, addPayment, deleteBill, deleteCampaign, deleteExpense, toggleBill, updateBill, updateCampaign, updateExpense, updateMonthColor } = useFinance();
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, "0"));
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);
  const [editingBill, setEditingBill] = useState<string | null>(null);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [creatingExpense, setCreatingExpense] = useState(false);
  const [customizingColor, setCustomizingColor] = useState(false);
  const [hidePaidBills, setHidePaidBills] = useState(false);
  const monthName = months.find(([value]) => value === selectedMonth)?.[1];
  const years = availableYears(data);
  const selectedPeriod = `${selectedYear}-${selectedMonth}`;
  const campaigns = data.campaigns
    .filter((item) => item.month === selectedPeriod)
    .sort((a, b) => {
      const pendingA = a.value - a.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const pendingB = b.value - b.payments.reduce((sum, payment) => sum + payment.amount, 0);
      if ((pendingA > 0) !== (pendingB > 0)) return pendingA > 0 ? -1 : 1;
      return b.value - a.value;
    });
  const bills = data.bills
    .filter((item) => item.dueDate.startsWith(selectedPeriod))
    .sort((a, b) => serviceOrder.indexOf(a.name.trim()) - serviceOrder.indexOf(b.name.trim()));
  const expenses = data.expenses.filter((item) => item.date.startsWith(selectedPeriod));
  const generated = campaigns.reduce((sum, item) => sum + item.value, 0);
  const received = campaigns.reduce((sum, item) => sum + item.payments.reduce((total, payment) => total + payment.amount, 0), 0);
  const billTotal = bills.reduce((sum, item) => sum + item.amount, 0);
  const pendingBills = bills.filter((bill) => !bill.paid);
  const paidBillCount = bills.length - pendingBills.length;
  const visibleBills = hidePaidBills ? pendingBills : bills;
  const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const pendingExtraTotal = expenses.filter((item) => item.status === "Pendiente").reduce((sum, item) => sum + item.amount, 0);
  const calendarCampaigns = campaigns
    .filter((campaign) => campaign.contentDueDate)
    .sort((a, b) => (a.contentDueDate ?? "").localeCompare(b.contentDueDate ?? ""));
  const monthNumber = Number(selectedMonth);
  const daysInMonth = new Date(selectedYear, monthNumber, 0).getDate();
  const leadingEmptyDays = (new Date(selectedYear, monthNumber - 1, 1).getDay() + 6) % 7;
  const calendarDays = [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  function registerPayment(id: string, maximum: number) {
    addPayment(id, maximum);
  }

  function saveCampaign(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const targetMonth = String(form.get("month")).slice(-2);
    updateCampaign(id, { name: String(form.get("name")), brand: String(form.get("brand")), network: String(form.get("network")), value: Number(form.get("value")), month: `${String(form.get("moveYear"))}-${targetMonth}`, contentDueDate: String(form.get("contentDueDate") || ""), status: String(form.get("status")) as "Pendiente" | "En producción" | "Realizado" });
    setEditingCampaign(null);
  }

  function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    addCampaign({ id: createId(), name: String(form.get("name")), brand: String(form.get("brand")), network: String(form.get("network")), collaborationType: String(form.get("collaborationType")), value: Number(form.get("value")), month: selectedPeriod, dueDate: `${selectedPeriod}-28`, contentDueDate: String(form.get("contentDueDate") || ""), status: String(form.get("status")) as "Pendiente" | "En producción" | "Realizado", payments: [] });
    event.currentTarget.reset(); setCreatingCampaign(false);
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

  return <div className="mx-auto max-w-7xl">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Organización mensual</p><h1 className="mt-2 text-3xl font-bold">Finanzas</h1><p className="mt-2 text-slate-600">Elige un mes para revisar sus campañas, cuentas y gastos extras.</p></div><div className="flex items-center gap-2"><label><span className="sr-only">Año</span><select className="h-10 min-w-[148px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label><button className="button h-10 min-w-[148px]" onClick={() => setCreatingCampaign(!creatingCampaign)}>+ Nueva campaña</button></div></header>
    <div className="mb-5 sm:hidden"><label className="block w-44"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Mes</span><select id="finance-month" className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold" style={{ borderColor: data.monthColors[selectedMonth], backgroundColor: `${data.monthColors[selectedMonth]}33` }} value={selectedMonth} onChange={(event) => { setSelectedMonth(event.target.value); setCustomizingColor(false); }}>{months.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    <nav className="mb-5 hidden gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-1.5 sm:flex" aria-label="Seleccionar mes">{months.map(([value, label]) => <button key={value} onClick={() => { setSelectedMonth(value); setCustomizingColor(false); }} className="min-w-[72px] flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition" style={{ borderColor: selectedMonth === value ? data.monthColors[value] : "transparent", backgroundColor: selectedMonth === value ? `${data.monthColors[value]}55` : "transparent" }}>{label}</button>)}</nav>

    {creatingCampaign && <form onSubmit={createCampaign} className="card mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label><span className="label">Campaña</span><input className="field" name="name" required /></label><label><span className="label">Marca</span><input className="field" name="brand" required /></label><label><span className="label">Red social</span><select className="field" name="network"><option>TikTok</option><option>Instagram</option><option>TikTok y Instagram</option><option>Uso de la marca</option><option>Otra</option></select></label><label><span className="label">Tipo</span><select className="field" name="collaborationType"><option>Paga</option><option>Paga y canje</option><option>Canje</option></select></label><label><span className="label">Valor</span><input className="field" name="value" type="number" min="0" required /></label><label><span className="label">Estado del contenido</span><select className="field" name="status"><option>Pendiente</option><option>En producción</option><option>Realizado</option></select></label><label><span className="label">Límite para subir el video</span><input className="field" name="contentDueDate" type="date" /></label><div className="flex gap-2 sm:col-span-2"><button className="button" type="submit">Guardar en {monthName}</button><button className="button-secondary" type="button" onClick={() => setCreatingCampaign(false)}>Cancelar</button></div></form>}

    <CollapsibleSection title="Resumen del mes">
    <section className="mb-6 rounded-3xl border p-6" style={{ borderColor: data.monthColors[selectedMonth], backgroundColor: `${data.monthColors[selectedMonth]}33` }}><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{monthName} {selectedYear}</p><div className="flex items-center gap-2">{customizingColor && <><label htmlFor="month-color" className="sr-only">Color de {monthName}</label><input id="month-color" type="color" value={data.monthColors[selectedMonth]} onChange={(event) => updateMonthColor(selectedMonth, event.target.value)} className="h-8 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" /></>}<button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => setCustomizingColor(!customizingColor)}>{customizingColor ? "Listo" : "Personalizar"}</button></div></div><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MonthlyTotal label="Generado" value={generated} /><MonthlyTotal label="Recibido" value={received} /><MonthlyTotal label="Por cobrar" value={generated - received} warning /><MonthlyTotal label="Por pagar" value={pendingBills.reduce((sum, bill) => sum + bill.amount, 0) + pendingExtraTotal} warning /></div></section>
    </CollapsibleSection>

    <div className="grid gap-6 lg:grid-cols-2">
      <CollapsibleSection title="Dinero por cobrar">
      <section className="card min-w-0"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Dinero por cobrar</h2><p className="text-sm text-slate-500">{campaigns.length} campañas en {monthName}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{currency.format(generated - received)} pendiente</span></div><div className="mt-5 space-y-3">{campaigns.map((campaign) => { const paid = campaign.payments.reduce((sum, item) => sum + item.amount, 0); const pending = campaign.value - paid; const paymentLabel = pending === 0 ? "Pagada" : campaign.status === "Realizado" ? "Esperando pago" : "Contenido pendiente"; return <article key={campaign.id} className="rounded-2xl border border-slate-100 bg-white p-4">{editingCampaign === campaign.id ? <form onSubmit={(event) => saveCampaign(event, campaign.id)} className="grid gap-3 sm:grid-cols-2"><input className="field" name="name" defaultValue={campaign.name} aria-label="Campaña" required /><input className="field" name="brand" defaultValue={campaign.brand} aria-label="Marca" required /><input className="field" name="network" defaultValue={campaign.network} aria-label="Red social" required /><input className="field" name="value" type="number" min={paid} defaultValue={campaign.value} aria-label="Valor" required /><label><span className="label">Estado del contenido</span><select className="field" name="status" defaultValue={campaign.status}><option>Pendiente</option><option>En producción</option><option>Realizado</option></select></label><label><span className="label">Límite para subir el video</span><input className="field" name="contentDueDate" type="date" defaultValue={campaign.contentDueDate ?? ""} /></label><label><span className="label">Mover al año</span><select className="field" name="moveYear" defaultValue={Number(campaign.month?.slice(0, 4) || selectedYear)}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label><label><span className="label">Mover al mes</span><select className="field" name="month" defaultValue={campaign.month}>{months.map(([value, label]) => <option key={value} value={`${selectedYear}-${value}`}>{label}</option>)}</select></label><div className="flex items-end gap-2 sm:col-span-2"><button className="button" type="submit">Guardar</button><button className="button-secondary" type="button" onClick={() => setEditingCampaign(null)}>Cancelar</button></div></form> : <><div className="flex justify-between gap-3"><div><h3 className="font-semibold">{campaign.name}</h3><p className="mt-1 text-xs text-slate-500">{campaign.brand} · {campaign.network}</p><span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${campaign.status === "Realizado" ? "bg-green-100 text-green-800" : campaign.status === "En producción" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>Contenido: {campaign.status}</span>{campaign.contentDueDate && <p className="mt-2 text-xs font-medium text-slate-600">📅 Límite: {formatContentDate(campaign.contentDueDate)}</p>}</div><div className="text-right"><p className="font-semibold">{currency.format(campaign.value)}</p><p className={`text-xs ${pending > 0 ? "text-slate-700" : "text-slate-600"}`}>{pending > 0 ? `${currency.format(pending)} por cobrar` : "Pagada"}</p><p className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-semibold ${paymentLabel === "Pagada" ? "bg-green-100 text-green-800" : paymentLabel === "Esperando pago" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>{paymentLabel}</p></div></div><div className="mt-3 flex flex-wrap gap-2"><button className="button-secondary" onClick={() => setEditingCampaign(campaign.id)}>✏️ Editar o mover</button>{pending > 0 && <button className="button" onClick={() => registerPayment(campaign.id, pending)}>Registrar pago</button>}<button className="button-danger" onClick={() => deleteCampaign(campaign.id)}>🗑️ Eliminar</button></div></>}</article>; })}{campaigns.length === 0 && <p className="py-6 text-center text-slate-500">No hay campañas este mes.</p>}</div></section>
      </CollapsibleSection>

      <CollapsibleSection title="Dinero por pagar">
      <section className="card min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold">Dinero por pagar</h2><p className="text-sm text-slate-500">Servicios de {monthName}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            {paidBillCount > 0 && <button type="button" className="button-secondary" aria-pressed={hidePaidBills} onClick={() => setHidePaidBills(!hidePaidBills)}>{hidePaidBills ? `Mostrar pagados (${paidBillCount})` : `Ocultar pagados (${paidBillCount})`}</button>}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{currency.format(billTotal)}</span>
          </div>
        </div>
        {bills.length > 0 && pendingBills.length === 0 && <div role="status" className="mt-5 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900"><span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 font-bold text-white">✓</span><div><p className="font-bold">¡Estás al día!</p><p className="text-sm text-green-700">Pagaste todos los servicios de {monthName}.</p></div></div>}
        <div className="mt-5 space-y-3">{visibleBills.map((bill) => <article key={bill.id} className="rounded-2xl border border-slate-100 bg-white p-4">{editingBill === bill.id ? <form onSubmit={(event) => saveBill(event, bill.id)} className="grid gap-3 sm:grid-cols-2"><input className="field" name="name" defaultValue={bill.name} aria-label="Cuenta" required /><input className="field" name="category" defaultValue={bill.category} aria-label="Categoría" required /><input className="field" name="amount" type="number" min="0" defaultValue={bill.amount} aria-label="Valor" required /><div className="flex gap-2"><button className="button" type="submit">Guardar</button><button className="button-secondary" type="button" onClick={() => setEditingBill(null)}>Cancelar</button></div></form> : <><div className="flex items-center justify-between"><div><h3 className="font-semibold">{bill.name}</h3><p className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-semibold ${bill.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{bill.paid ? "Pagada" : "Pendiente"}</p></div><p className="font-semibold">{bill.amount ? currency.format(bill.amount) : "Sin valor"}</p></div><div className="mt-3 flex flex-wrap gap-2"><button className="button-secondary" onClick={() => setEditingBill(bill.id)}>✏️ Editar</button><button className={bill.paid ? "button-secondary" : "button"} onClick={() => toggleBill(bill.id)}>{bill.paid ? "Marcar pendiente" : "Marcar pagada"}</button><button className="button-danger" onClick={() => deleteBill(bill.id)}>🗑️ Eliminar</button></div></>}</article>)}</div>
      </section>
      </CollapsibleSection>
    </div>

    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <CollapsibleSection title="Calendario de contenido">
        <section className="card min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Calendario de contenido</h2><p className="text-sm text-slate-500">Fechas límite de {monthName}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{calendarCampaigns.length} con fecha</span></div>
          <div className="mt-4 overflow-x-auto pb-1"><div className="min-w-[560px] overflow-hidden rounded-xl border border-slate-200 bg-slate-200"><div className="grid grid-cols-7 gap-px">
            {weekDays.map((day) => <div key={day} className="bg-slate-50 px-1 py-1.5 text-center text-[10px] font-bold uppercase text-slate-500">{day}</div>)}
            {calendarDays.map((day, index) => { const date = day ? `${selectedYear}-${selectedMonth}-${String(day).padStart(2, "0")}` : ""; const dayCampaigns = calendarCampaigns.filter((campaign) => campaign.contentDueDate === date); return <div key={`${day ?? "empty"}-${index}`} className={`min-h-20 bg-white p-1.5 ${day ? "" : "bg-slate-50"}`}>{day && <><p className="mb-1 text-xs font-bold text-slate-700">{day}</p><div className="space-y-1">{dayCampaigns.map((campaign) => <button key={campaign.id} type="button" onClick={() => setEditingCampaign(campaign.id)} className={`block w-full truncate rounded-md px-1.5 py-1 text-left text-[9px] font-semibold leading-tight ${campaign.status === "Realizado" ? "bg-green-100 text-green-900" : campaign.status === "En producción" ? "bg-yellow-100 text-yellow-900" : "bg-red-100 text-red-900"}`} title={`${campaign.name} · ${campaign.status}`}>{campaign.name}</button>)}</div></>}</div>; })}
          </div></div></div>
          {calendarCampaigns.length === 0 && <p className="mt-3 text-sm text-slate-500">Todavía no has definido fechas límite para este mes.</p>}
        </section>
      </CollapsibleSection>
      <CollapsibleSection title="Gastos extras">
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Gastos extras</h2><p className="text-sm text-slate-500">Gastos adicionales de {monthName}</p></div><div className="flex items-center gap-3"><span className="font-semibold">{currency.format(expenseTotal)}</span><button className="button" onClick={() => setCreatingExpense(!creatingExpense)}>+ Agregar</button></div></div>
      {creatingExpense && <form onSubmit={createExpense} className="mt-5 grid gap-3"><input className="field" name="concept" placeholder="Concepto" required /><input className="field" name="category" placeholder="Categoría" required /><input className="field" name="amount" type="number" min="1" placeholder="Valor" required /><select className="field" name="status"><option>Pendiente</option><option>Comprado</option></select><div className="flex gap-2"><button className="button" type="submit">Guardar</button><button className="button-secondary" type="button" onClick={() => setCreatingExpense(false)}>Cancelar</button></div></form>}
      <div className="mt-5 space-y-3">{expenses.map((expense) => <article key={expense.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><div><h3 className="font-semibold">{expense.concept}</h3><p className="mt-1 text-xs text-slate-500">{expense.category}</p><span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${expense.status === "Comprado" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{expense.status}</span></div><p className="font-semibold">{currency.format(expense.amount)}</p></div><div className="mt-3 flex flex-wrap gap-2"><button className="button-secondary" onClick={() => updateExpense(expense.id, { status: expense.status === "Comprado" ? "Pendiente" : "Comprado" })}>{expense.status === "Comprado" ? "Marcar pendiente" : "Marcar comprado"}</button><button className="button-danger" onClick={() => deleteExpense(expense.id)}>🗑️ Eliminar</button></div></article>)}</div>
      {expenses.length === 0 && <p className="mt-5 text-sm text-slate-500">No hay gastos extras en este mes.</p>}
    </section>
      </CollapsibleSection>
    </div>
  </div>;
}

function MonthlyTotal({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return <div className="rounded-2xl border border-white/80 bg-white/80 p-4 backdrop-blur"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-xl font-bold ${warning && value > 0 ? "text-slate-700" : "text-slate-800"}`}>{currency.format(value)}</p></div>;
}

function formatContentDate(date: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
