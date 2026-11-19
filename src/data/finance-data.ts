import "server-only";
import { getExchangeRate } from "@/lib/trm";
import { pendingUsdCents, revalueFinanceData, scheduledTrmDate } from "@/lib/usd";
import { applyIncomeStartAdjustment } from "@/db/income-start-adjustment";
import { db } from "@/db";
import { bills, campaigns, expenses, monthColors, payments, financeSettings } from "@/db/schema";
import { availableYears } from "@/lib/finance";
import { adoptExistingRecurring, materializeRecurring } from "@/lib/recurring";
import { applyOperation, isValidFinanceData, type FinanceOperation } from "@/lib/finance-operations";
import { eq, inArray } from "drizzle-orm";
import type { FinanceData } from "@/lib/finance";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** An operation the user is not allowed to make; its message is safe to show. */
export class OperationError extends Error {}

export async function getFinanceData(): Promise<FinanceData> {
  return finishRead(await readStored(db));
}

async function readStored(executor: Pick<typeof db, "select">): Promise<FinanceData> {
  const [campaignRows, paymentRows, billRows, expenseRows, colorRows, settingRows] = await Promise.all([
    executor.select().from(campaigns),
    executor.select().from(payments),
    executor.select().from(bills),
    executor.select().from(expenses),
    executor.select().from(monthColors),
    executor.select().from(financeSettings),
  ]);

  return {
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
}

async function finishRead(data: FinanceData): Promise<FinanceData> {
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

/**
 * Applies one user operation to the latest stored data inside a single write transaction, then writes only
 * the rows it changed. Concurrent operations from different devices are serialized and never overwrite each other.
 */
export async function applyFinanceOperation(op: FinanceOperation) {
  await db.transaction(async (tx) => {
    const stored = await readStored(tx);
    let next: FinanceData;
    try { next = applyOperation(adoptExistingRecurring(stored), op); }
    catch (error) { throw new OperationError(error instanceof Error ? error.message : "Operación inválida"); }
    next = materializeRecurring(next, availableYears(next));
    if (!isValidFinanceData(next)) throw new OperationError("Revisa los datos ingresados");
    await writeChanges(tx, stored, next);
  });
}

function toRows(data: FinanceData) {
  return {
    campaigns: data.campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      brand: campaign.brand,
      network: campaign.network,
      incomeType: campaign.incomeType ?? null,
      recurringId: campaign.recurringId ?? null,
      manualOverride: campaign.manualOverride ?? false,
      collaborationType: campaign.collaborationType ?? null,
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
    })),
    payments: data.campaigns.flatMap((campaign) => campaign.payments.map((payment) => ({
      id: payment.id,
      campaignId: campaign.id,
      amount: payment.amount,
      date: payment.date,
      usdAmountCents: payment.usdAmountCents ?? null,
      exchangeRate: payment.exchangeRate ?? null,
      exchangeRateDate: payment.exchangeRateDate ?? null,
    }))),
    bills: data.bills.map((bill) => ({
      id: bill.id,
      name: bill.name,
      category: bill.category,
      amount: bill.amount,
      dueDate: bill.dueDate,
      paid: bill.paid,
      note: bill.note ?? null,
      recurringId: bill.recurringId ?? null,
      manualOverride: bill.manualOverride ?? false,
    })),
    expenses: data.expenses.map(({ id, concept, category, amount, date, status }) => ({ id, concept, category, amount, date, status })),
    monthColors: Object.entries(data.monthColors).map(([month, color]) => ({ id: month, month, color })),
  };
}

function diff<T extends { id: string }>(before: T[], after: T[]) {
  const old = new Map(before.map((row) => [row.id, JSON.stringify(row)]));
  const kept = new Set(after.map((row) => row.id));
  return {
    removed: before.filter((row) => !kept.has(row.id)).map((row) => row.id),
    added: after.filter((row) => !old.has(row.id)),
    changed: after.filter((row) => old.has(row.id) && old.get(row.id) !== JSON.stringify(row)),
  };
}

async function writeChanges(tx: Tx, stored: FinanceData, next: FinanceData) {
  const before = toRows(stored);
  const after = toRows(next);
  const c = diff(before.campaigns, after.campaigns);
  const p = diff(before.payments, after.payments);
  const b = diff(before.bills, after.bills);
  const e = diff(before.expenses, after.expenses);
  const m = diff(before.monthColors, after.monthColors);

  // Payments first: they reference campaigns.
  if (p.removed.length) await tx.delete(payments).where(inArray(payments.id, p.removed));
  if (c.removed.length) await tx.delete(campaigns).where(inArray(campaigns.id, c.removed));
  if (b.removed.length) await tx.delete(bills).where(inArray(bills.id, b.removed));
  if (e.removed.length) await tx.delete(expenses).where(inArray(expenses.id, e.removed));
  if (m.removed.length) await tx.delete(monthColors).where(inArray(monthColors.month, m.removed));

  if (c.added.length) await tx.insert(campaigns).values(c.added);
  for (const row of c.changed) await tx.update(campaigns).set(row).where(eq(campaigns.id, row.id));
  if (p.added.length) await tx.insert(payments).values(p.added);
  for (const row of p.changed) await tx.update(payments).set(row).where(eq(payments.id, row.id));
  if (b.added.length) await tx.insert(bills).values(b.added);
  for (const row of b.changed) await tx.update(bills).set(row).where(eq(bills.id, row.id));
  if (e.added.length) await tx.insert(expenses).values(e.added);
  for (const row of e.changed) await tx.update(expenses).set(row).where(eq(expenses.id, row.id));
  for (const { month, color } of [...m.added, ...m.changed]) {
    await tx.insert(monthColors).values({ month, color }).onConflictDoUpdate({ target: monthColors.month, set: { color } });
  }
  if (next.recurring && JSON.stringify(next.recurring) !== JSON.stringify(stored.recurring)) {
    await tx.insert(financeSettings).values({ id: "recurring", value: next.recurring }).onConflictDoUpdate({ target: financeSettings.id, set: { value: next.recurring } });
  }
}
