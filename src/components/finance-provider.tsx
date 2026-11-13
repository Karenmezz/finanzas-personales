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
const storageKey = "creator-finance-data-excel-v6";
let currentData = initialData;
let hydrated = false;
const listeners = new Set<() => void>();
let remoteSaveQueue = Promise.resolve();
const autoTrmAttemptKey = `${storageKey}-trm-auto-day`;
let lastAutoTrmAttempt: string | undefined;

function getSnapshot() {
  if (!hydrated && typeof window !== "undefined") {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved) as FinanceData;
      currentData = { ...parsed, monthColors: { ...initialData.monthColors, ...parsed.monthColors } };
    }
    currentData = revalueFinanceData(currentData);
    hydrated = true;
  }
  return currentData;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function queueRemoteSave(nextData: FinanceData) {
  remoteSaveQueue = remoteSaveQueue
    .catch(() => undefined)
    .then(async () => {
      const response = await fetch("/api/finance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextData),
      });
      if (!response.ok) throw new Error("No fue posible sincronizar con Turso");
    })
    .catch((error) => console.error("El cambio quedó guardado localmente", error));
}

function saveData(nextData: FinanceData, syncRemote = true, freshQuote?: ExchangeRate) {
  nextData = { ...nextData, monthColors: { ...initialData.monthColors, ...nextData.monthColors } };
  const previousRate = currentData.exchangeRate;
  const nextRate = nextData.exchangeRate;
  const quote = freshQuote ?? (previousRate && (!nextRate || previousRate.date >= nextRate.date) ? previousRate : nextRate);
  nextData = revalueFinanceData(materializeRecurring(nextData, availableYears(nextData)), quote);
  currentData = nextData;
  window.localStorage.setItem(storageKey, JSON.stringify(nextData));
  listeners.forEach((listener) => listener());
  if (syncRemote) queueRemoteSave(nextData);
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const data = useSyncExternalStore(subscribe, getSnapshot, () => initialData);
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
    const controller = new AbortController();
    async function loadRemoteData() {
      try {
        const response = await fetch("/api/finance", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const remoteData = (await response.json()) as FinanceData;
        saveData(remoteData, false);
      } catch (error) {
        if (!controller.signal.aborted) console.error("Se usará el respaldo local", error);
      }
    }
    void loadRemoteData();
    return () => controller.abort();
  }, []);

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
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance requiere FinanceProvider");
  return context;
}
