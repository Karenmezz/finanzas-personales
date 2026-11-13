import importedData from "./default-data.json";

export type Campaign = {
  id: string;
  name: string;
  brand: string;
  network: string;
  collaborationType?: string;
  month?: string;
  value: number;
  dueDate: string;
  contentDueDate?: string;
  status: "Pendiente" | "En producción" | "Realizado";
  payments: { id: string; amount: number; date: string }[];
};

export type Expense = {
  id: string;
  concept: string;
  category: string;
  amount: number;
  date: string;
  status: "Pendiente" | "Comprado";
};

export type Bill = {
  id: string;
  name: string;
  category: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  note?: string;
};

export type FinanceData = {
  campaigns: Campaign[];
  expenses: Expense[];
  bills: Bill[];
  monthColors: Record<string, string>;
};

export const initialData = importedData as FinanceData;

export const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function createId() {
  return crypto.randomUUID();
}

export function availableYears(data: FinanceData) {
  const currentYear = new Date().getFullYear();
  const years = new Set<number>([currentYear, currentYear + 1]);
  data.campaigns.forEach((item) => years.add(Number((item.month ?? item.dueDate).slice(0, 4))));
  data.expenses.forEach((item) => years.add(Number(item.date.slice(0, 4))));
  data.bills.forEach((item) => years.add(Number(item.dueDate.slice(0, 4))));
  return [...years].filter(Number.isFinite).sort((a, b) => b - a);
}
