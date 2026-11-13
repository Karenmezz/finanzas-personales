"use client";

import { useState, type FormEvent } from "react";
import { useFinance } from "@/components/finance-provider";
import { isFoundationSalary } from "@/lib/finance-insights";

export function SalarySettings({ period }: { period: string }) {
  const { data, setMonthlySalary } = useFinance();
  const [saved, setSaved] = useState(false);
  const existing = data.campaigns.filter(isFoundationSalary).sort((a, b) =>
    (b.month ?? b.dueDate).localeCompare(a.month ?? a.dueDate))[0];
  const amount = data.monthlySalary ?? existing?.value;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(new FormData(event.currentTarget).get("salary"));
    if (!Number.isSafeInteger(value) || value <= 0) return;
    setMonthlySalary(value, period);
    setSaved(true);
  }
  return <section className="card mb-6" aria-label="Configurar salario mensual">
    <h2 className="text-lg font-bold">Salario mensual</h2>
    <p className="mt-1 text-sm text-slate-500">Fundación de la Mujer. Se aplica al mes seleccionado y los siguientes sin pagos registrados. Los meses anteriores y los que tienen pagos conservan su valor.</p>
    <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={submit}>
      <label><span className="label">Salario mensual (COP)</span><input key={amount ?? "empty"} className="field" name="salary" type="number" min="1" max={Number.MAX_SAFE_INTEGER} step="1" defaultValue={amount} onChange={() => setSaved(false)} required /></label>
      <button className="button" type="submit">Guardar salario mensual</button>
    </form>
    {saved && <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">Salario mensual actualizado.</p>}
  </section>;
}
