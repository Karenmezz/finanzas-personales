"use client";

import { FormEvent } from "react";
import { useFinance } from "@/components/finance-provider";
import { createId, currency } from "@/lib/finance";

export default function BillsPage() {
  const { data, addBill, toggleBill, deleteBill } = useFinance();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    addBill({ id: createId(), name: String(form.get("name")), category: String(form.get("category")), amount: Number(form.get("amount")), dueDate: String(form.get("dueDate")), paid: false });
    event.currentTarget.reset();
  }
  return <div className="mx-auto max-w-6xl"><header className="mb-6"><h1 className="text-3xl font-bold">Cuentas por pagar</h1><p className="mt-2 text-slate-600">Organiza obligaciones y conserva su estado.</p></header>
    <form onSubmit={submit} className="card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <label><span className="label">Obligación</span><input className="field" name="name" required /></label>
      <label><span className="label">Categoría</span><input className="field" name="category" required /></label>
      <label><span className="label">Valor</span><input className="field" name="amount" type="number" min="1" required /></label>
      <label><span className="label">Vencimiento</span><input className="field" name="dueDate" type="date" required /></label>
      <button className="button self-end" type="submit">Agregar cuenta</button>
    </form>
    <div className="grid gap-4 md:grid-cols-2">{data.bills.map((bill) => <article className="card" key={bill.id}><div className="flex justify-between gap-4"><div><h2 className="font-semibold">{bill.name}</h2><p className="mt-1 text-sm text-slate-500">{bill.category} · vence {bill.dueDate}</p>{bill.note && <p className="mt-2 text-xs text-amber-700">{bill.note}</p>}</div><p className="font-bold">{bill.amount > 0 ? currency.format(bill.amount) : "Sin valor"}</p></div><div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4"><button className={bill.paid ? "button-secondary" : "button"} onClick={() => toggleBill(bill.id)}>{bill.paid ? "Marcar pendiente" : "Marcar pagada"}</button><span className={`text-sm font-semibold ${bill.paid ? "text-emerald-700" : "text-amber-700"}`}>{bill.paid ? "Pagada" : "Pendiente"}</span><button className="button-danger ml-auto" onClick={() => deleteBill(bill.id)}>🗑️ Eliminar</button></div></article>)}</div>
  </div>;
}
