"use client";

import { FormEvent } from "react";
import { useFinance } from "@/components/finance-provider";
import { createId, currency } from "@/lib/finance";

export default function ExpensesPage() {
  const { data, addExpense, deleteExpense } = useFinance();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    addExpense({ id: createId(), concept: String(form.get("concept")), category: String(form.get("category")), amount: Number(form.get("amount")), date: String(form.get("date")), status: "Comprado" });
    event.currentTarget.reset();
  }
  return <div className="mx-auto max-w-6xl"><header className="mb-6"><h1 className="text-3xl font-bold">Gastos</h1><p className="mt-2 text-slate-600">Registra salidas personales y profesionales.</p></header>
    <form onSubmit={submit} className="card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <label><span className="label">Concepto</span><input className="field" name="concept" required /></label>
      <label><span className="label">Categoría</span><select className="field" name="category"><option>Servicios</option><option>Vivienda</option><option>Transporte</option><option>Trabajo</option><option>Otro</option></select></label>
      <label><span className="label">Valor</span><input className="field" name="amount" type="number" min="1" required /></label>
      <label><span className="label">Fecha</span><input className="field" name="date" type="date" required /></label>
      <button className="button self-end" type="submit">Agregar gasto</button>
    </form>
    <div className="card overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="pb-3">Fecha</th><th>Concepto</th><th>Categoría</th><th className="text-right">Valor</th><th></th></tr></thead><tbody>{data.expenses.map((expense) => <tr className="border-b border-slate-100" key={expense.id}><td className="py-3">{expense.date}</td><td>{expense.concept}</td><td>{expense.category}</td><td className="text-right font-semibold">{currency.format(expense.amount)}</td><td className="text-right"><button className="button-danger" onClick={() => deleteExpense(expense.id)}>🗑️ Eliminar</button></td></tr>)}</tbody></table></div>
  </div>;
}
