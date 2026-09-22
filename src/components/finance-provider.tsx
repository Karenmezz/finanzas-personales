"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import type { Bill, Campaign, Expense, FinanceData } from "@/lib/finance";
import { initialData } from "@/lib/finance";

type FinanceContextValue = {
  data: FinanceData;
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, changes: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  addPayment: (campaignId: string, amount: number) => void;
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

function getSnapshot() {
  if (!hydrated && typeof window !== "undefined") {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved) as FinanceData;
      currentData = {
        ...parsed,
        campaigns: parsed.campaigns.map((campaign) => ({
          ...campaign,
          contentDueDate:
            campaign.contentDueDate ??
            initialData.campaigns.find((seed) => seed.id === campaign.id)
              ?.contentDueDate,
        })),
        bills: [
          ...parsed.bills,
          ...initialData.bills.filter(
            (seed) =>
              !parsed.bills.some(
                (bill) =>
                  bill.name.trim() === seed.name.trim() &&
                  bill.dueDate.slice(0, 7) === seed.dueDate.slice(0, 7),
              ),
          ),
        ],
        monthColors: { ...initialData.monthColors, ...parsed.monthColors },
      };
    }
    hydrated = true;
  }
  return currentData;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function hasFinancialRecords(data: FinanceData) {
  return data.campaigns.length > 0 || data.bills.length > 0 || data.expenses.length > 0;
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

function saveData(nextData: FinanceData, syncRemote = true) {
  currentData = nextData;
  window.localStorage.setItem(storageKey, JSON.stringify(nextData));
  listeners.forEach((listener) => listener());
  if (syncRemote) queueRemoteSave(nextData);
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const data = useSyncExternalStore(subscribe, getSnapshot, () => initialData);

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
        const localData = getSnapshot();
        if (!hasFinancialRecords(remoteData) && hasFinancialRecords(localData)) {
          console.warn("Se conservó el respaldo local porque la base remota llegó vacía");
          return;
        }
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
    addPayment: (campaignId, amount) =>
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
                    date: new Date().toISOString().slice(0, 10),
                  },
                ],
              }
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
