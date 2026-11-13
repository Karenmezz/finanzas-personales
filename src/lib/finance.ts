import importedData from "./default-data.json";

export type ExchangeRate = {
  date: string;
  value: number;
  validFrom: string;
  validTo: string;
  source: "Superintendencia Financiera de Colombia";
};

export type CampaignPayment = {
  id: string;
  amount: number;
  date: string;
  usdAmountCents?: number;
  exchangeRate?: number;
  exchangeRateDate?: string;
};

export type CampaignBenefit =
  | { kind: "products"; description: string; quantity: number; received: boolean }
  | { kind: "voucher"; description: string; amount: number; usedAmount: number; expiresOn?: string; received: boolean };

export type Campaign = {
  id: string;
  name: string;
  brand: string;
  network: string;
  collaborationType?: string;
  benefit?: CampaignBenefit;
  month?: string;
  value: number;
  currency?: "COP" | "USD";
  usdValueCents?: number;
  exchangeRate?: number;
  exchangeRateDate?: string;
  dueDate: string;
  contentDueDate?: string;
  status: "Pendiente" | "En producción" | "Realizado";
  payments: CampaignPayment[];
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
  exchangeRate?: ExchangeRate;
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
