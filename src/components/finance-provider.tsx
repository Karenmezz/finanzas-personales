"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
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

function saveData(nextData: FinanceData) {
  currentData = nextData;
  window.localStorage.setItem(storageKey, JSON.stringify(nextData));
  listeners.forEach((listener) => listener());
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const data = useSyncExternalStore(subscribe, getSnapshot, () => initialData);

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
