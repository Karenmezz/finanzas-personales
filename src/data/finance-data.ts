import "server-only";
import { getExchangeRate } from "@/lib/trm";
import { pendingUsdCents, revalueFinanceData, scheduledTrmDate } from "@/lib/usd";
import { applyIncomeStartAdjustment } from "@/db/income-start-adjustment";
import { db } from "@/db";
import { bills, campaigns, expenses, monthColors, payments, financeSettings } from "@/db/schema";
import { availableYears } from "@/lib/finance";
import { adoptExistingRecurring, materializeRecurring } from "@/lib/recurring";
import { eq } from "drizzle-orm";
import type { FinanceData } from "@/lib/finance";

export async function getFinanceData(): Promise<FinanceData> {
  const [campaignRows, paymentRows, billRows, expenseRows, colorRows, settingRows] = await Promise.all([
    db.select().from(campaigns),
    db.select().from(payments),
    db.select().from(bills),
    db.select().from(expenses),
    db.select().from(monthColors),
    db.select().from(financeSettings),
  ]);

  const data: FinanceData = {
    recurring: settingRows.find((setting) => setting.id === "recurring")?.value,
    campaigns: campaignRows.map((campaign) => ({
      ...campaign,
      incomeType: campaign.incomeType ?? undefined,
      recurringId: campaign.recurringId ?? undefined,
      benefit: campaign.benefit ?? undefined,
      usdValueCents: campaign.usdValueCents ?? undefined,
      exchangeRate: campaign.exchangeRate ?? undefined,
      exchangeRateDate: campaign.exchangeRateDate ?? undefined,
      collaborationType: campaign.collaborationType ?? undefined,
      contentDueDate: campaign.contentDueDate ?? undefined,
      payments: paymentRows.filter((payment) => payment.campaignId === campaign.id).map(({ id, amount, date, usdAmountCents, exchangeRate, exchangeRateDate }) => ({ id, amount, date, usdAmountCents: usdAmountCents ?? undefined, exchangeRate: exchangeRate ?? undefined, exchangeRateDate: exchangeRateDate ?? undefined })),
    })),
    bills: billRows.map((bill) => ({ ...bill, recurringId: bill.recurringId ?? undefined, note: bill.note ?? undefined })),
    expenses: expenseRows,
    monthColors: Object.fromEntries(colorRows.map(({ month, color }) => [month, color])),
  };
  const adopted = adoptExistingRecurring(data);
  if (!data.recurring) await db.transaction(async (tx) => {
    await tx.insert(financeSettings).values({ id: "recurring", value: adopted.recurring! }).onConflictDoNothing();
    for (const bill of adopted.bills) if (bill.recurringId) await tx.update(bills).set({ recurringId: bill.recurringId, manualOverride: bill.manualOverride }).where(eq(bills.id, bill.id));
    for (const campaign of adopted.campaigns) if (campaign.recurringId) await tx.update(campaigns).set({ recurringId: campaign.recurringId, manualOverride: campaign.manualOverride }).where(eq(campaigns.id, campaign.id));
  });
  const correctedSettings = await applyIncomeStartAdjustment();
  const corrected = { ...adopted, recurring: correctedSettings ?? adopted.recurring };
  const result = materializeRecurring(corrected, availableYears(corrected));
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
    if (data.recurring) await tx.insert(financeSettings).values({ id: "recurring", value: data.recurring }).onConflictDoUpdate({ target: financeSettings.id, set: { value: data.recurring } });

    if (data.campaigns.length) {
      await tx.insert(campaigns).values(data.campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        brand: campaign.brand,
        network: campaign.network,
        incomeType: campaign.incomeType ?? null,
        recurringId: campaign.recurringId ?? null,
        manualOverride: campaign.manualOverride ?? false,
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
