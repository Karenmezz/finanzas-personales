import "server-only";
import { getExchangeRate } from "@/lib/trm";
import { pendingUsdCents, revalueFinanceData, scheduledTrmDate } from "@/lib/usd";
import { db } from "@/db";
import { bills, campaigns, expenses, monthColors, payments } from "@/db/schema";
import { availableYears } from "@/lib/finance";
import { withMonthlyDefaults } from "@/lib/finance-insights";
import type { FinanceData } from "@/lib/finance";

const recurringServices = [
  { name: "Arriendo", amount: 887000 },
  { name: "Luz", amount: 36623 },
  { name: "Gas", amount: 5400 },
  { name: "Agua", amount: 69610 },
  { name: "Wifi", amount: 69328 },
  { name: "Datos", amount: 43250 },
] as const;

async function ensureRecurringServices() {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];
  const existingBills = await db.select({ name: bills.name, dueDate: bills.dueDate }).from(bills);
  const existingPeriods = new Set(existingBills.map((bill) => `${bill.name.trim().toLocaleLowerCase("es")}:${bill.dueDate.slice(0, 7)}`));
  const missingBills = years.flatMap((year) =>
    Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).flatMap((month) => {
      const period = `${year}-${month}`;
      return recurringServices
        .filter((service) => !existingPeriods.has(`${service.name.toLocaleLowerCase("es")}:${period}`))
        .map((service) => ({
          id: `recurring-${period}-${service.name.toLocaleLowerCase("es")}`,
          name: service.name,
          category: "Servicios",
          amount: service.amount,
          dueDate: `${period}-10`,
          paid: false,
        }));
    }),
  );

  if (missingBills.length > 0) {
    await db.insert(bills).values(missingBills).onConflictDoNothing();
  }
}

export async function getFinanceData(): Promise<FinanceData> {
  await ensureRecurringServices();
  const [campaignRows, paymentRows, billRows, expenseRows, colorRows] = await Promise.all([
    db.select().from(campaigns),
    db.select().from(payments),
    db.select().from(bills),
    db.select().from(expenses),
    db.select().from(monthColors),
  ]);

  const data: FinanceData = {
    campaigns: campaignRows.map((campaign) => ({
      ...campaign,
      benefit: campaign.benefit ?? undefined,
      usdValueCents: campaign.usdValueCents ?? undefined,
      exchangeRate: campaign.exchangeRate ?? undefined,
      exchangeRateDate: campaign.exchangeRateDate ?? undefined,
      collaborationType: campaign.collaborationType ?? undefined,
      contentDueDate: campaign.contentDueDate ?? undefined,
      payments: paymentRows.filter((payment) => payment.campaignId === campaign.id).map(({ id, amount, date, usdAmountCents, exchangeRate, exchangeRateDate }) => ({ id, amount, date, usdAmountCents: usdAmountCents ?? undefined, exchangeRate: exchangeRate ?? undefined, exchangeRateDate: exchangeRateDate ?? undefined })),
    })),
    bills: billRows.map((bill) => ({ ...bill, note: bill.note ?? undefined })),
    expenses: expenseRows,
    monthColors: Object.fromEntries(colorRows.map(({ month, color }) => [month, color])),
  };
  const result = withMonthlyDefaults(data, availableYears(data));
  const existingCampaigns = new Set(data.campaigns.map((item) => item.id));
  const existingBills = new Set(data.bills.map((item) => item.id));
  const missingCampaigns = result.campaigns.filter((item) => !existingCampaigns.has(item.id) || data.campaigns.find((saved) => saved.id === item.id)?.value !== item.value);
  const missingBills = result.bills.filter((item) => !existingBills.has(item.id));
  if (missingCampaigns.length) {
    await db.insert(campaigns).values(missingCampaigns.map((campaign) => ({ id: campaign.id, name: campaign.name, brand: campaign.brand, network: campaign.network, collaborationType: campaign.collaborationType, month: campaign.month ?? campaign.dueDate.slice(0, 7), value: campaign.value, dueDate: campaign.dueDate, status: campaign.status }))).onConflictDoUpdate({ target: campaigns.id, set: { value: 3100000 } });
  }
  if (missingBills.length) await db.insert(bills).values(missingBills).onConflictDoNothing();
  if (result.campaigns.some((campaign) => campaign.currency === "USD" && pendingUsdCents(campaign) > 0)) {
    try { return revalueFinanceData(result, await getExchangeRate(scheduledTrmDate())); }
    catch (error) { console.error("Se conservó la última valoración de las campañas en USD", error); }
  }
  return revalueFinanceData(result);
}

export async function replaceFinanceData(data: FinanceData) {
  await db.transaction(async (tx) => {
    await tx.delete(payments);
    await tx.delete(campaigns);
    await tx.delete(bills);
    await tx.delete(expenses);
    await tx.delete(monthColors);

    if (data.campaigns.length) {
      await tx.insert(campaigns).values(data.campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        brand: campaign.brand,
        network: campaign.network,
        collaborationType: campaign.collaborationType,
        benefit: campaign.benefit ?? null,
        month: campaign.month ?? campaign.dueDate.slice(0, 7),
        value: campaign.value,
        currency: campaign.currency ?? "COP",
        usdValueCents: campaign.usdValueCents ?? null,
        exchangeRate: campaign.exchangeRate ?? null,
        exchangeRateDate: campaign.exchangeRateDate ?? null,
        dueDate: campaign.dueDate,
        contentDueDate: campaign.contentDueDate || null,
        status: campaign.status,
      })));
      const paymentValues = data.campaigns.flatMap((campaign) => campaign.payments.map((payment) => ({ ...payment, campaignId: campaign.id })));
      if (paymentValues.length) await tx.insert(payments).values(paymentValues);
    }
    if (data.bills.length) await tx.insert(bills).values(data.bills);
    if (data.expenses.length) await tx.insert(expenses).values(data.expenses);
    const colors = Object.entries(data.monthColors).map(([month, color]) => ({ month, color }));
    if (colors.length) await tx.insert(monthColors).values(colors);
  });
}
