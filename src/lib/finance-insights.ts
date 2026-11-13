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

// Add only missing months, keeping existing amounts, dates and payment states.
export function withMonthlyDefaults(data: FinanceData, years: number[]): FinanceData {
  const campaigns = [...data.campaigns];
  const bills = [...data.bills];
  const salaries = data.campaigns.filter((campaign) => isFoundationSalary(campaign) && campaign.value > 0);
  const salary = [...salaries].sort((a, b) => {
    // Prefer an actual saved entry over a previously generated default.
    const generated = Number(a.id.startsWith("recurring-salary-")) - Number(b.id.startsWith("recurring-salary-"));
    return generated || (b.month ?? b.dueDate.slice(0, 7)).localeCompare(a.month ?? a.dueDate.slice(0, 7));
  })[0];
  for (const year of new Set(years)) {
    for (let month = 1; month <= 12; month++) {
      const period = `${year}-${String(month).padStart(2, "0")}`;
      const hasTransport = bills.some((bill) => normalizeName(bill.name) === "transporte" && bill.dueDate.startsWith(period)) ||
        data.expenses.some((expense) => normalizeName(expense.concept) === "transporte" && expense.date.startsWith(period));
      if (!hasTransport) bills.push({ id: `recurring-transport-${period}`, name: "Transporte", category: "Transporte", amount: 420000, dueDate: `${period}-28`, paid: false });
      if (salary && !salaries.some((item) => (item.month ?? item.dueDate.slice(0, 7)) === period)) {
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const day = Math.min(Number(salary.dueDate.slice(8, 10)) || 28, lastDay);
        campaigns.push({ ...salary, id: `recurring-salary-${period}`, month: period, dueDate: `${period}-${String(day).padStart(2, "0")}`, contentDueDate: undefined, status: "Pendiente", payments: [] });
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
