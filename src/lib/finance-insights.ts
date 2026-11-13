import type { Campaign, FinanceData } from "./finance";

export function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
}

export function isFoundationSalary(campaign: Campaign) {
  return /fundacion.*mujer/.test(normalizeName(`${campaign.brand} ${campaign.name}`));
}

export function brandRanking(campaigns: Campaign[]) {
  const brands = new Map<string, { brand: string; received: number; agreed: number; count: number }>();
  for (const campaign of campaigns) {
    if (isFoundationSalary(campaign) || campaign.value <= 0) continue;
    const key = normalizeName(campaign.brand);
    const row = brands.get(key) ?? { brand: campaign.brand.trim() || "Sin marca", received: 0, agreed: 0, count: 0 };
    row.received += campaign.payments.reduce((sum, payment) => sum + payment.amount, 0);
    row.agreed += campaign.value;
    row.count += 1;
    brands.set(key, row);
  }
  return [...brands.values()].sort((a, b) => b.received - a.received || b.agreed - a.agreed || a.brand.localeCompare(b.brand));
}

export const FOUNDATION_MONTHLY_SALARY = 3100000;
export const FOUNDATION_SALARY_START = "2026-10";

// Preserve payment history while fixing unpaid salary amounts and filling missing months.
export function withMonthlyDefaults(data: FinanceData, years: number[]): FinanceData {
  const campaigns = data.campaigns.filter((campaign) =>
    !isFoundationSalary(campaign) || (campaign.month ?? campaign.dueDate.slice(0, 7)) >= FOUNDATION_SALARY_START || campaign.payments.length > 0
  ).map((campaign) => isFoundationSalary(campaign) && campaign.payments.length === 0
    ? { ...campaign, value: FOUNDATION_MONTHLY_SALARY } : campaign);
  const bills = [...data.bills];
  const salaries = data.campaigns.filter((campaign) => isFoundationSalary(campaign) && campaign.value > 0);
  const salary = [...salaries].sort((a, b) => {
    // Prefer an actual saved entry over a previously generated default.
    const generated = Number(a.id.startsWith("recurring-salary-")) - Number(b.id.startsWith("recurring-salary-"));
    return generated || (b.month ?? b.dueDate.slice(0, 7)).localeCompare(a.month ?? a.dueDate.slice(0, 7));
  })[0];
  const salaryAmount = FOUNDATION_MONTHLY_SALARY;
  const template: Campaign = salary ?? {
    id: "salary-template", name: "Salario", brand: "Fundación de la Mujer", network: "Otra",
    value: salaryAmount ?? 0, dueDate: "2000-01-28", status: "Realizado", payments: [],
  };
  for (const year of new Set(years)) {
    for (let month = 1; month <= 12; month++) {
      const period = `${year}-${String(month).padStart(2, "0")}`;
      const hasTransport = bills.some((bill) => normalizeName(bill.name) === "transporte" && bill.dueDate.startsWith(period)) ||
        data.expenses.some((expense) => normalizeName(expense.concept) === "transporte" && expense.date.startsWith(period));
      if (!hasTransport) bills.push({ id: `recurring-transport-${period}`, name: "Transporte", category: "Transporte", amount: 420000, dueDate: `${period}-28`, paid: false });
      if (period >= FOUNDATION_SALARY_START && !salaries.some((item) => (item.month ?? item.dueDate.slice(0, 7)) === period)) {
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const day = Math.min(Number(template.dueDate.slice(8, 10)) || 28, lastDay);
        campaigns.push({ ...template, value: salaryAmount, id: `recurring-salary-${period}`, month: period, dueDate: `${period}-${String(day).padStart(2, "0")}`, contentDueDate: undefined, status: "Pendiente", payments: [] });
      }
    }
  }
  return { ...data, campaigns, bills };
}

export function previousPendingCampaigns(campaigns: Campaign[], selectedPeriod: string) {
  return campaigns.map((campaign) => ({
    campaign,
    pending: Math.max(campaign.value - campaign.payments.reduce((sum, payment) => sum + payment.amount, 0), 0),
    period: campaign.month ?? campaign.dueDate.slice(0, 7),
  })).filter((item) => item.period < selectedPeriod && item.pending > 0)
    .sort((a, b) => a.campaign.dueDate.localeCompare(b.campaign.dueDate));
}

export type FinanceArea = "finances" | "content";

export function selectFinanceArea(data: FinanceData, area: FinanceArea): FinanceData {
  const content = area === "content";
  return {
    ...data,
    campaigns: data.campaigns.filter((campaign) => isFoundationSalary(campaign) !== content),
    bills: content ? [] : data.bills,
    expenses: content ? [] : data.expenses,
  };
}

export function campaignsByBrand(campaigns: Campaign[]) {
  const brands = new Map<string, { id: string; name: string; campaigns: Campaign[] }>();
  for (const campaign of campaigns) {
    if (isFoundationSalary(campaign)) continue;
    const id = `brand:${normalizeName(campaign.brand)}`;
    const brand = brands.get(id) ?? { id, name: campaign.brand.trim() || "Sin marca", campaigns: [] };
    brand.campaigns.push(campaign);
    brands.set(id, brand);
  }
  return [...brands.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function dashboardSummary(data: FinanceData, year: number) {
  const campaigns = data.campaigns.filter((campaign) => (campaign.month ?? campaign.dueDate.slice(0, 7)).startsWith(`${year}-`));
  const salaries = campaigns.filter(isFoundationSalary);
  const brandCampaigns = campaigns.filter((campaign) => !isFoundationSalary(campaign));
  const generated = campaigns.reduce((sum, campaign) => sum + campaign.value, 0);
  const received = campaigns.reduce((sum, campaign) => sum + campaign.payments.reduce((total, payment) => total + payment.amount, 0), 0);
  const pending = campaigns.reduce((sum, campaign) => sum + Math.max(campaign.value - campaign.payments.reduce((total, payment) => total + payment.amount, 0), 0), 0);
  const bills = data.bills.filter((bill) => bill.dueDate.startsWith(`${year}-`));
  const extras = data.expenses.filter((expense) => expense.date.startsWith(`${year}-`));
  const expenses = bills.filter((bill) => bill.paid).reduce((sum, bill) => sum + bill.amount, 0) + extras.filter((expense) => expense.status === "Comprado").reduce((sum, expense) => sum + expense.amount, 0);
  const pendingExpenses = bills.filter((bill) => !bill.paid).reduce((sum, bill) => sum + bill.amount, 0) + extras.filter((expense) => expense.status === "Pendiente").reduce((sum, expense) => sum + expense.amount, 0);
  return { generated, received, pending, expenses, pendingExpenses, balance: received - expenses, salaries, brandCampaigns };
}
