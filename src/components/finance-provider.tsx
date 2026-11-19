"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import type { Bill, Campaign, ExchangeRate, Expense, FinanceData, RecurringRule } from "@/lib/finance";
import { usePathname } from "next/navigation";
import { bogotaDate, isDailyTrmRefreshDue, nextTrmRefreshAt, revalueFinanceData } from "@/lib/usd";
import { fetchExchangeRate } from "@/lib/usd-client";
import { materializeRecurring } from "@/lib/recurring";
import { availableYears, initialData } from "@/lib/finance";
import { applyOperation, type FinanceOperation } from "@/lib/finance-operations";

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
let pending = 0; // Operations sent and not answered yet.
let queue = Promise.resolve();

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

async function loadRemote({ keepStatus = false } = {}) {
  let response: Response | undefined;
  try { response = await fetch("/api/finance", { cache: "no-store" }); } catch { /* Handled below. */ }
  if (!response?.ok) {
    setStatus({ kind: "error", message: response?.status === 401 ? "Tu sesión venció. Vuelve a iniciar sesión." : "No se pudieron cargar los datos del servidor." });
    return;
  }
  const remote = (await response.json()) as FinanceData;
  if (pending > 0) return; // An operation's answer will bring fresher data.
  currentData = prepare(remote);
  if (keepStatus) notify(); else setStatus({ kind: "ok" });
}

// Shows the change right away, sends only the operation, then shows what the server actually stored.
// Validation errors throw synchronously, as before, so forms can display them.
function send(op: FinanceOperation) {
  currentData = prepare(applyOperation(currentData, op));
  notify();
  pending += 1;
  queue = queue.then(async () => {
    let response: Response | undefined;
    try { response = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(op) }); } catch { /* Handled below. */ }
    pending -= 1;
    if (!response?.ok) {
      const reason = response?.status === 401 ? "Tu sesión venció" : ((await response?.json().catch(() => null)) as { error?: string } | null)?.error ?? "No se pudo conectar con el servidor";
      setStatus({ kind: "error", message: `${reason}. El cambio no se guardó.` });
      if (pending === 0) await loadRemote({ keepStatus: true });
      return;
    }
    const remote = (await response.json()) as FinanceData;
    if (pending === 0) { currentData = prepare(remote); notify(); }
  });
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const data = useSyncExternalStore(subscribe, getSnapshot, () => initialData);
  const syncStatus = useSyncExternalStore(subscribe, getStatus, getStatus);
  const [exchangeRateError, setExchangeRateError] = useState<string | null>(null);
  const refreshExchangeRate = useCallback(async (date = bogotaDate()) => {
    try {
      const quote = await fetchExchangeRate(date);
      currentData = prepare(revalueFinanceData(currentData, quote), quote);
      notify();
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

  const value: FinanceContextValue = {
    data,
    exchangeRateError,
    refreshExchangeRate,
    saveRecurringRule: (rule) => send({ type: "saveRecurringRule", rule }),
    changeMonthlyAmount: (kind, id, amount, scope) => send({ type: "changeMonthlyAmount", kind, id, amount, scope }),
    addCampaign: (campaign) => send({ type: "addCampaign", campaign }),
    updateCampaign: (id, changes) => send({ type: "updateCampaign", id, changes }),
    deleteCampaign: (id) => send({ type: "deleteCampaign", id }),
    addPayment: (campaignId, amount) => send({ type: "addPayment", campaignId, amount, paymentId: crypto.randomUUID() }),
    addUsdPayment: (campaignId, cents, date, quote) => send({ type: "addUsdPayment", campaignId, cents, date, quote, paymentId: crypto.randomUUID() }),
    removeLastPayment: (campaignId) => send({ type: "removeLastPayment", campaignId }),
    addExpense: (expense) => send({ type: "addExpense", expense }),
    updateExpense: (id, changes) => send({ type: "updateExpense", id, changes }),
    deleteExpense: (id) => send({ type: "deleteExpense", id }),
    addBill: (bill) => send({ type: "addBill", bill }),
    updateBill: (id, changes) => send({ type: "updateBill", id, changes }),
    toggleBill: (id) => {
      const bill = currentData.bills.find((item) => item.id === id);
      if (bill) send({ type: "setBillPaid", id, paid: !bill.paid });
    },
    deleteBill: (id) => send({ type: "deleteBill", id }),
    updateMonthColor: (month, color) => send({ type: "updateMonthColor", month, color }),
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
