"use client";
import { useState, type FormEvent } from "react";
import { useFinance } from "@/components/finance-provider";
import { todayInColombia } from "@/lib/recurring";

export function MonthlyAmountForm({ kind, id, amount, period, recurring, onClose }: { kind: "income" | "expense"; id: string; amount: number; period: string; recurring: boolean; onClose: () => void }) {
  const { changeMonthlyAmount } = useFinance();
  const [error, setError] = useState<string | null>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try { changeMonthlyAmount(kind,id,Number(form.get("amount")),form.get("scope") === "future" ? "future" : "month"); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible ajustar el valor"); }
  }
  return <form onSubmit={submit} aria-label="Ajustar importe mensual" className="mt-3 grid gap-3 sm:grid-cols-2"><label><span className="label">Valor de {period} (COP)</span><input className="field" name="amount" type="number" min="1" step="1" defaultValue={amount} required /></label><label><span className="label">Aplicar cambio</span><select className="field" name="scope"><option value="month">Solo este mes</option>{recurring && period >= todayInColombia().slice(0,7) && <option value="future">Este mes y los siguientes</option>}</select></label>{error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2">{error}</p>}<div className="flex gap-2 sm:col-span-2"><button className="button" type="submit">Guardar valor</button><button className="button-secondary" type="button" onClick={onClose}>Cancelar</button></div></form>;
}
