"use client";

import { useState, type FormEvent } from "react";
import { ProfileSettings } from "@/components/profile-settings";
import { useFinance } from "@/components/finance-provider";
import { createId, currency, type RecurringRule } from "@/lib/finance";
import { recurringVersion, todayInColombia, validateRecurringSettings, withRecurringStart } from "@/lib/recurring";

export function SettingsWorkspace({ initialIncome = false, initialProfile = false }: { initialIncome?: boolean; initialProfile?: boolean }) {
  const { data, saveRecurringRule } = useFinance();
  const [tab, setTab] = useState<"expense" | "income" | "profile">(initialProfile ? "profile" : initialIncome ? "income" : "expense");
  const [editing, setEditing] = useState<RecurringRule | "new" | null>(initialIncome ? "new" : null);
  const rules = data.recurring?.rules.filter((rule) => rule.kind === tab) ?? [];
  const today = todayInColombia();
  return <div className="mx-auto max-w-5xl">
    <header className="mb-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mis finanzas</p><h1 className="mt-2 text-3xl font-bold">Configuración</h1><p className="mt-2 text-sm text-slate-500">Personaliza tu perfil y organiza tus gastos e ingresos mensuales.</p></header>
    <div role="tablist" aria-label="Secciones de Configuración" className="mb-4 flex rounded-xl border border-slate-200 bg-slate-50 p-1">{([['profile','Perfil'],['expense','Gastos fijos'],['income','Ingresos fijos']] as const).map(([id,label]) => <button key={id} role="tab" aria-selected={tab === id} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${tab === id ? "bg-white shadow-sm" : "text-slate-500"}`} onClick={() => { setTab(id); setEditing(null); }}>{label}</button>)}</div>
    {tab === "profile" ? <ProfileSettings /> : <>
    <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{tab === "expense" ? "Gastos fijos mensuales" : "Ingresos fijos mensuales"}</h2><p className="mt-1 text-xs text-slate-500">{tab === "expense" ? "Fijo significa mensual; el valor puede cambiar." : "Configura aquí tu salario u otros ingresos recurrentes."}</p></div><button className="button shrink-0" onClick={() => setEditing(editing === "new" ? null : "new")}>+ Agregar</button></div>
    {editing && <RuleForm key={editing === "new" ? `new-${tab}` : editing.id} rule={editing === "new" ? undefined : editing} kind={tab} onSave={(rule) => { saveRecurringRule(rule); setEditing(null); }} onCancel={() => setEditing(null)} />}
    <div className="grid gap-3 lg:grid-cols-2">{rules.map((rule) => { const current = recurringVersion(rule, today.slice(0,7)) ?? [...rule.versions].sort((a,b) => a.from.localeCompare(b.from))[0]; const ended = rule.endOn && rule.endOn < today; return <article key={rule.id} className="card min-w-0" aria-label={`Configuración de ${rule.name}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-bold">{rule.name}</h3><p className="mt-1 text-xs text-slate-500">{rule.category}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${ended || !rule.enabled ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>{ended ? "Finalizado" : rule.enabled ? "Activo" : "Pausado"}</span></div><p className="mt-3 text-xl font-bold">{currency.format(current.amount)}<span className="ml-1 text-xs font-normal text-slate-500">/ mes</span></p><p className="mt-2 text-xs text-slate-500">Día {current.day} · Desde {rule.startOn}</p><p className="mt-1 text-xs text-slate-500">{rule.endOn ? `Hasta ${rule.endOn}` : "Sin fecha final"}</p>{rule.versions.filter((version) => version.from > today.slice(0,7)).map((version) => <p key={version.from} className="mt-1 text-xs text-indigo-700">Desde {version.from}: {currency.format(version.amount)} · día {version.day}</p>)}<div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3"><button className="button-secondary" onClick={() => setEditing(rule)}>Editar configuración</button>{!ended && <button className="button-secondary" onClick={() => saveRecurringRule({ ...rule, enabled: !rule.enabled })}>{rule.enabled ? "Pausar" : "Reactivar"}</button>}</div></article>; })}</div>
    {rules.length === 0 && <p className="card text-sm text-slate-500">Todavía no tienes {tab === "expense" ? "gastos" : "ingresos"} fijos. Los ingresos cuentan desde su fecha de inicio. Los gastos nuevos empiezan desde hoy o una fecha posterior.</p>}
    <p className="mt-4 text-xs leading-relaxed text-slate-500">Los ingresos cuentan desde la fecha de inicio configurada, incluyendo meses anteriores que falten. Los cambios de valor afectan registros pendientes del mes actual y siguientes. Los meses anteriores y los registros con pagos conservan sus valores. Desde Finanzas puedes ajustar un importe solo ese mes o también los siguientes. Los días 29, 30 y 31 se ajustan al último día en meses más cortos.</p></>}
  </div>;
}

function RuleForm({ rule, kind, onSave, onCancel }: { rule?: RecurringRule; kind: RecurringRule["kind"]; onSave: (rule: RecurringRule) => void; onCancel: () => void }) {
  const today = todayInColombia();
  const currentPeriod = today.slice(0,7);
  const initial = rule ? recurringVersion(rule, currentPeriod) ?? rule.versions[0] : undefined;
  const [error, setError] = useState<string | null>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const startOn = String(form.get("startOn"));
    const from = rule ? String(form.get("applyFrom")) : startOn.slice(0,7);
    const amount = Number(form.get("amount")), day = Number(form.get("day"));
    const previous = rule ? recurringVersion(rule, from) : undefined;
    const versions = rule && previous?.amount === amount && previous.day === day ? rule.versions : [...(rule?.versions.filter((version) => version.from < from) ?? []), { from, amount, day }];
    let next: RecurringRule;
    try { next = withRecurringStart({ ...rule, id: rule?.id ?? createId(), kind, name: String(form.get("name")).trim(), category: String(form.get("category")).trim(), startOn, endOn: String(form.get("endOn") || "") || undefined, enabled: form.get("enabled") === "on", versions },startOn); }
    catch { setError("Selecciona una fecha de inicio válida."); return; }
    if ((!rule && kind === "expense" && startOn < today) || (rule && from < currentPeriod) || !validateRecurringSettings({ version:1, rules:[next] })) { setError("Revisa valor, fechas y día. El inicio debe cubrirse con una versión y los cambios se aplican desde este mes o uno posterior."); return; }
    onSave(next);
  }
  return <form id={rule ? undefined : "nuevo-registro"} onSubmit={submit} aria-label={rule ? "Editar recurrencia" : "Nueva recurrencia"} className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <label><span className="label">Nombre</span><input name="name" className="field" defaultValue={rule?.name} required /></label>
    <label><span className="label">{kind === "income" ? "Origen del ingreso" : "Categoría"}</span><input name="category" className="field" defaultValue={rule?.category} required /></label>
    <label><span className="label">Valor mensual (COP)</span><input name="amount" className="field" type="number" min="1" step="1" defaultValue={initial?.amount} required /></label>
    <label><span className="label">Día de {kind === "income" ? "recepción" : "vencimiento"}</span><input name="day" className="field" type="number" min="1" max="31" step="1" defaultValue={initial?.day ?? Number(today.slice(8,10))} required /></label>
    <label><span className="label">Fecha de inicio</span><input name="startOn" className="field" type="date" min={kind === "income" ? "1900-01-01" : rule ? undefined : today} defaultValue={rule?.startOn ?? today} readOnly={Boolean(rule) && kind === "expense"} required /></label>
    <label><span className="label">Fecha final (opcional)</span><input name="endOn" className="field" type="date" min={rule?.startOn ?? today} defaultValue={rule?.endOn ?? ""} /><span className="mt-1 block text-[10px] text-slate-500">Vacío: se repite sin fecha final.</span></label>
    {rule && <label><span className="label">Aplicar valor y día desde</span><input name="applyFrom" className="field" type="month" min={currentPeriod} defaultValue={currentPeriod} required /><span className="mt-1 block text-[10px] text-slate-500">Ese mes y los siguientes. Conserva ajustes individuales.</span></label>}
    <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked={rule?.enabled ?? true} />Recurrencia activa</label>
    {error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2 lg:col-span-3">{error}</p>}
    <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button className="button">Guardar configuración</button><button type="button" className="button-secondary" onClick={onCancel}>Cancelar</button></div>
  </form>;
}
