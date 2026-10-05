import "server-only";
import { db } from "@/db";
import { bills, campaigns, expenses, monthColors, payments } from "@/db/schema";
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

  return {
    campaigns: campaignRows.map((campaign) => ({
      ...campaign,
      collaborationType: campaign.collaborationType ?? undefined,
      contentDueDate: campaign.contentDueDate ?? undefined,
      payments: paymentRows.filter((payment) => payment.campaignId === campaign.id).map(({ id, amount, date }) => ({ id, amount, date })),
    })),
    bills: billRows.map((bill) => ({ ...bill, note: bill.note ?? undefined })),
    expenses: expenseRows,
    monthColors: Object.fromEntries(colorRows.map(({ month, color }) => [month, color])),
  };
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
        month: campaign.month ?? campaign.dueDate.slice(0, 7),
        value: campaign.value,
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
