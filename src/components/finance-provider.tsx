"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import type { Bill, Campaign, ExchangeRate, Expense, FinanceData, RecurringRule } from "@/lib/finance";
import { usePathname } from "next/navigation";
import { bogotaDate, isDailyTrmRefreshDue, nextTrmRefreshAt, makeUsdPayment, revalueFinanceData } from "@/lib/usd";
import { fetchExchangeRate } from "@/lib/usd-client";
import { isBarterCampaign } from "@/lib/finance-insights";
import { adoptExistingRecurring, changeRecurringAmount, materializeRecurring } from "@/lib/recurring";
import { availableYears, initialData } from "@/lib/finance";

type FinanceContextValue = {
  data: FinanceData;
  saveRecurringRule: (rule: RecurringRule) => void;
  changeMonthlyAmount: (kind: "expense" | "income", id: string, amount: number, scope: "month" | "future") => void;
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, changes: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  addPayment: (campaignId: string, amount: number) => void;
  addUsdPayment: (campaignId: string, cents: number, date: string, quote: ExchangeRate) => void;
  refreshExchangeRate: (date?: string) => Promise<void>;
  exchangeRateError: string | null;
  removeLastPayment: (campaignId: string) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, changes: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addBill: (bill: Bill) => void;
  updateBill: (id: string, changes: Partial<Bill>) => void;
  toggleBill: (id: string) => void;
  deleteBill: (id: string) => void;
  updateMonthColor: (month: string, color: string) => void;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);
// Finance data lives only on the server; this key is kept just to clear copies left by older versions.
const storageKey = "creator-finance-data-excel-v6";
const autoTrmAttemptKey = `${storageKey}-trm-auto-day`;
let lastAutoTrmAttempt: string | undefined;
const listeners = new Set<() => void>();

let currentData = initialData;
// Last data the server confirmed. A failed save reverts to it, so the screen never shows unsaved changes.
let confirmed = initialData;
let loaded = false; // Edits are blocked until this session has the server's data.
let saving: Promise<void> | null = null;
let saveRequested = false;

type SyncStatus = { kind: "loading" | "ok" | "error"; message?: string };
let status: SyncStatus = { kind: "loading" };

function notify() { listeners.forEach((listener) => listener()); }
function setStatus(next: SyncStatus) { status = next; notify(); }
function getStatus() { return status; }
function getSnapshot() { return currentData; }

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function prepare(nextData: FinanceData, freshQuote?: ExchangeRate) {
  nextData = { ...nextData, monthColors: { ...initialData.monthColors, ...nextData.monthColors } };
  const previousRate = currentData.exchangeRate;
  const nextRate = nextData.exchangeRate;
  const quote = freshQuote ?? (previousRate && (!nextRate || previousRate.date >= nextRate.date) ? previousRate : nextRate);
  return revalueFinanceData(materializeRecurring(nextData, availableYears(nextData)), quote);
}

function rejectChanges(message: string) {
  currentData = confirmed;
  saveRequested = false;
  setStatus({ kind: "error", message });
}

function save() {
  saveRequested = true;
  if (saving) return;
  saving = (async () => {
    while (saveRequested) {
      saveRequested = false;
      const sent = currentData;
      let response: Response | undefined;
      try {
        response = await fetch("/api/finance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sent) });
      } catch { /* Network failure: handled below. */ }
      if (response?.status === 409) {
        rejectChanges("Otro dispositivo guardó cambios antes, así que tu último cambio no se guardó. Ya se cargaron los datos más recientes; repítelo.");
        await loadRemote({ force: true, keepStatus: true });
        return;
      }
      if (!response?.ok) {
        rejectChanges(response?.status === 401
          ? "Tu sesión venció y el último cambio no se guardó. Vuelve a iniciar sesión."
          : "No se pudo conectar con el servidor y el último cambio no se guardó. Inténtalo de nuevo.");
        return;
      }
      const { revision } = (await response.json()) as { revision: number };
      confirmed = { ...sent, revision };
      currentData = currentData === sent ? confirmed : { ...currentData, revision };
      if (status.kind === "error") setStatus({ kind: "ok" }); else notify();
    }
  })().finally(() => { saving = null; });
}

async function loadRemote({ force = false, keepStatus = false } = {}) {
  if (saving && !force) return;
  let response: Response | undefined;
  try { response = await fetch("/api/finance", { cache: "no-store" }); } catch { /* Handled below. */ }
  if (!response?.ok) {
    setStatus({ kind: "error", message: loaded
      ? "No se pudo conectar con el servidor; puede que no estés viendo los datos más recientes."
      : "No se pudieron cargar los datos del servidor. Por seguridad no se puede editar hasta que carguen." });
    return;
  }
  const remote = (await response.json()) as FinanceData;
  // Skip if a save started meanwhile or this answer is older than what a save already confirmed.
  if ((saving && !force) || (remote.revision ?? 0) < (confirmed.revision ?? 0)) return;
  currentData = confirmed = prepare(remote);
  loaded = true;
  if (keepStatus) notify(); else setStatus({ kind: "ok" });
}

function saveData(nextData: FinanceData, syncRemote = true, freshQuote?: ExchangeRate) {
  if (syncRemote && !loaded) {
    setStatus({ kind: "error", message: "Aún no se cargan los datos del servidor, así que este cambio no se guardó. Espera a que carguen e inténtalo de nuevo." });
    return;
  }
  currentData = prepare(nextData, freshQuote);
  notify();
  if (syncRemote) save();
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const data = useSyncExternalStore(subscribe, getSnapshot, () => initialData);
  const syncStatus = useSyncExternalStore(subscribe, getStatus, getStatus);
  const [exchangeRateError, setExchangeRateError] = useState<string | null>(null);
  const refreshExchangeRate = useCallback(async (date = bogotaDate()) => {
    try {
      const quote = await fetchExchangeRate(date);
      saveData(revalueFinanceData(getSnapshot(), quote), false, quote);
      setExchangeRateError(null);
    } catch (error) {
      setExchangeRateError(error instanceof Error ? error.message : "No fue posible actualizar la TRM");
    }
  }, []);

  useEffect(() => {
    if (pathname === "/login") return;
    let timer: number;
    const runScheduled = () => {
      const now = new Date();
      let attempted = lastAutoTrmAttempt;
      try { attempted = window.localStorage.getItem(autoTrmAttemptKey) ?? attempted; } catch { /* Keep the in-memory attempt if storage is unavailable. */ }
      if (document.visibilityState === "visible" && isDailyTrmRefreshDue(now, getSnapshot().exchangeRate?.date, attempted)) {
        lastAutoTrmAttempt = bogotaDate(now);
        try { window.localStorage.setItem(autoTrmAttemptKey, lastAutoTrmAttempt); } catch { /* The in-memory guard still avoids duplicate attempts. */ }
        void refreshExchangeRate();
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(runScheduled, Math.max(1000, nextTrmRefreshAt().getTime() - Date.now()));
    };
    timer = window.setTimeout(runScheduled, 0);
    const onVisible = () => { if (document.visibilityState === "visible") runScheduled(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [refreshExchangeRate, pathname]);

  useEffect(() => {
    if (pathname === "/login") return;
    try { window.localStorage.removeItem(storageKey); } catch { /* Nothing to clean up. */ }
    void loadRemote();
    const refresh = () => { if (document.visibilityState === "visible") void loadRemote(); };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [pathname]);

  function update(updater: (current: FinanceData) => FinanceData) {
    saveData(updater(getSnapshot()));
  }

  const value: FinanceContextValue = {
    data,
    saveRecurringRule: (rule) => update((current) => {
      const adopted = adoptExistingRecurring(current);
      return { ...adopted, recurring: { version: 1, rules: [...adopted.recurring!.rules.filter((item) => item.id !== rule.id), rule] } };
    }),
    changeMonthlyAmount: (kind, id, amount, scope) => update((current) => changeRecurringAmount(current, kind, id, amount, scope)),
    exchangeRateError,
    refreshExchangeRate,
    addUsdPayment: (campaignId, cents, date, quote) => update((current) => ({
      ...current,
      campaigns: current.campaigns.map((campaign) => campaign.id === campaignId
        ? { ...campaign, payments: [...campaign.payments, makeUsdPayment(campaign, cents, date, quote, crypto.randomUUID())] } : campaign),
    })),
    addCampaign: (campaign) =>
      update((current) => ({
        ...current,
        campaigns: [campaign, ...current.campaigns],
      })),
    updateCampaign: (id, changes) =>
      update((current) => ({
        ...current,
        campaigns: current.campaigns.map((item) =>
          item.id === id ? { ...item, ...changes } : item,
        ),
      })),
    deleteCampaign: (id) =>
      update((current) => ({
        ...current,
        campaigns: current.campaigns.filter((item) => item.id !== id),
      })),
    addPayment: (campaignId, amount) => {
      const campaign = getSnapshot().campaigns.find((item) => item.id === campaignId);
      if (!campaign || isBarterCampaign(campaign) || campaign.currency === "USD") throw new Error("Registra el pago en dólares con su fecha y TRM");
      const pending = campaign.value - campaign.payments.reduce((sum, payment) => sum + payment.amount, 0);
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > pending) throw new Error("El pago no puede superar el saldo pendiente");
      update((current) => ({
        ...current,
        campaigns: current.campaigns.map((campaign) =>
          campaign.id === campaignId
            ? {
                ...campaign,
                payments: [
                  ...campaign.payments,
                  {
                    id: crypto.randomUUID(),
                    amount,
                    date: bogotaDate(),
                  },
                ],
              }
            : campaign,
        ),
      }));
    },
    removeLastPayment: (campaignId) =>
      update((current) => ({
        ...current,
        campaigns: current.campaigns.map((campaign) =>
          campaign.id === campaignId && campaign.payments.length > 0
            ? { ...campaign, payments: campaign.payments.slice(0, -1) }
            : campaign,
        ),
      })),
    addExpense: (expense) =>
      update((current) => ({
        ...current,
        expenses: [expense, ...current.expenses],
      })),
    updateExpense: (id, changes) =>
      update((current) => ({
        ...current,
        expenses: current.expenses.map((item) =>
          item.id === id ? { ...item, ...changes } : item,
        ),
      })),
    deleteExpense: (id) =>
      update((current) => ({
        ...current,
        expenses: current.expenses.filter((item) => item.id !== id),
      })),
    addBill: (bill) =>
      update((current) => ({ ...current, bills: [bill, ...current.bills] })),
    updateBill: (id, changes) =>
      update((current) => ({
        ...current,
        bills: current.bills.map((item) =>
          item.id === id ? { ...item, ...changes } : item,
        ),
      })),
    toggleBill: (id) =>
      update((current) => ({
        ...current,
        bills: current.bills.map((bill) =>
          bill.id === id ? { ...bill, paid: !bill.paid } : bill,
        ),
      })),
    deleteBill: (id) =>
      update((current) => ({
        ...current,
        bills: current.bills.filter((item) => item.id !== id),
        recurring: current.recurring ? { ...current.recurring, rules: current.recurring.rules.map((rule) => {
          const bill = current.bills.find((item) => item.id === id && item.recurringId === rule.id);
          return bill ? { ...rule, skippedPeriods: [...new Set([...(rule.skippedPeriods ?? []), bill.dueDate.slice(0, 7)])] } : rule;
        }) } : current.recurring,
      })),
    updateMonthColor: (month, color) =>
      update((current) => ({
        ...current,
        monthColors: { ...current.monthColors, [month]: color },
      })),
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
      {pathname !== "/login" && syncStatus.kind === "loading" && (
        <div role="status" className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[100] mx-auto max-w-xs rounded-2xl bg-slate-900 px-4 py-2 text-center text-sm text-white shadow-xl">Cargando datos…</div>
      )}
      {syncStatus.kind === "error" && (
        <div role="alert" className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[100] mx-auto flex max-w-xl items-start gap-3 rounded-2xl bg-red-600 p-4 text-sm text-white shadow-xl">
          <p className="flex-1">{syncStatus.message}</p>
          <button type="button" onClick={() => void loadRemote()} className="shrink-0 rounded-lg bg-white/20 px-3 py-1.5 font-semibold">Recargar</button>
        </div>
      )}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance requiere FinanceProvider");
  return context;
}
