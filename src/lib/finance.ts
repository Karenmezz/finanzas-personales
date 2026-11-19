
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
  incomeType?: "personal";
  recurringId?: string;
  manualOverride?: boolean;
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

export type RecurringRule = {
  id: string;
  kind: "expense" | "income";
  name: string;
  category: string;
  startOn: string;
  endOn?: string;
  enabled: boolean;
  skippedPeriods?: string[];
  monthlyAmounts?: Record<string, number>;
  versions: { from: string; amount: number; day: number }[];
};
export type RecurringSettings = { version: 1; rules: RecurringRule[] };

export type Bill = {
  recurringId?: string;
  manualOverride?: boolean;
  id: string;
  name: string;
  category: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  note?: string;
};

export type FinanceData = {
  recurring?: RecurringSettings;
  exchangeRate?: ExchangeRate;
  campaigns: Campaign[];
  expenses: Expense[];
  bills: Bill[];
  monthColors: Record<string, string>;
};

export const initialData: FinanceData = {
  campaigns: [], bills: [], expenses: [], recurring: { version: 1, rules: [] },
  monthColors: Object.fromEntries(Array.from({ length: 12 }, (_, index) => [String(index + 1).padStart(2, "0"), "#ddd6fe"])),
};

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
  data.recurring?.rules.forEach((rule) => { years.add(Number(rule.startOn.slice(0, 4))); if (rule.endOn) years.add(Number(rule.endOn.slice(0, 4))); rule.versions.forEach((version) => years.add(Number(version.from.slice(0, 4)))); });
  return [...years].filter(Number.isFinite).sort((a, b) => b - a);
}
