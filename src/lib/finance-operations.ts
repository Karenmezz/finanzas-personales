import type { Bill, Campaign, ExchangeRate, Expense, FinanceData, RecurringRule } from "./finance";
import { isBarterCampaign, validateCampaignBenefit } from "./finance-insights";
import { adoptExistingRecurring, changeRecurringAmount, validateRecurringSettings } from "./recurring";
import { bogotaDate, makeUsdPayment, validateCampaignMoney } from "./usd";

// A single user action. The client sends only this; the server applies it to the latest stored data,
// so two devices can never overwrite each other's changes.
export type FinanceOperation =
  | { type: "saveRecurringRule"; rule: RecurringRule }
  | { type: "changeMonthlyAmount"; kind: "expense" | "income"; id: string; amount: number; scope: "month" | "future" }
  | { type: "addCampaign"; campaign: Campaign }
  | { type: "updateCampaign"; id: string; changes: Partial<Campaign> }
  | { type: "deleteCampaign"; id: string }
  | { type: "addPayment"; campaignId: string; paymentId: string; amount: number }
  | { type: "addUsdPayment"; campaignId: string; paymentId: string; cents: number; date: string; quote: ExchangeRate }
  | { type: "removeLastPayment"; campaignId: string }
  | { type: "addExpense"; expense: Expense }
  | { type: "updateExpense"; id: string; changes: Partial<Expense> }
  | { type: "deleteExpense"; id: string }
  | { type: "addBill"; bill: Bill }
  | { type: "updateBill"; id: string; changes: Partial<Bill> }
  | { type: "setBillPaid"; id: string; paid: boolean }
  | { type: "deleteBill"; id: string }
  | { type: "updateMonthColor"; month: string; color: string };

const operationTypes = new Set<FinanceOperation["type"]>(["saveRecurringRule", "changeMonthlyAmount", "addCampaign", "updateCampaign", "deleteCampaign", "addPayment", "addUsdPayment", "removeLastPayment", "addExpense", "updateExpense", "deleteExpense", "addBill", "updateBill", "setBillPaid", "deleteBill", "updateMonthColor"]);

export function isFinanceOperation(value: unknown): value is FinanceOperation {
  return Boolean(value && typeof value === "object" && operationTypes.has((value as { type?: FinanceOperation["type"] }).type!));
}

export function isValidFinanceData(data: FinanceData) {
  return Boolean(validateRecurringSettings(data.recurring) && Array.isArray(data.campaigns) && data.campaigns.every((campaign) => validateCampaignMoney(campaign) && validateCampaignBenefit(campaign)) && Array.isArray(data.bills) && Array.isArray(data.expenses) && data.monthColors && typeof data.monthColors === "object");
}

/** Applies one operation. Throws with a user-facing message when the operation is not allowed. */
export function applyOperation(current: FinanceData, op: FinanceOperation): FinanceData {
  switch (op.type) {
    case "saveRecurringRule": {
      const adopted = adoptExistingRecurring(current);
      return { ...adopted, recurring: { version: 1, rules: [...adopted.recurring!.rules.filter((item) => item.id !== op.rule.id), op.rule] } };
    }
    case "changeMonthlyAmount":
      return changeRecurringAmount(current, op.kind, op.id, op.amount, op.scope);
    case "addCampaign":
      return { ...current, campaigns: [op.campaign, ...current.campaigns] };
    case "updateCampaign":
      return { ...current, campaigns: current.campaigns.map((item) => item.id === op.id ? { ...item, ...op.changes, id: item.id } : item) };
    case "deleteCampaign":
      return { ...current, campaigns: current.campaigns.filter((item) => item.id !== op.id) };
    case "addPayment": {
      const campaign = current.campaigns.find((item) => item.id === op.campaignId);
      if (!campaign || isBarterCampaign(campaign) || campaign.currency === "USD") throw new Error("Registra el pago en dólares con su fecha y TRM");
      const pending = campaign.value - campaign.payments.reduce((sum, payment) => sum + payment.amount, 0);
      if (!Number.isSafeInteger(op.amount) || op.amount <= 0 || op.amount > pending) throw new Error("El pago no puede superar el saldo pendiente");
      return withCampaign(current, op.campaignId, (item) => ({ ...item, payments: [...item.payments, { id: op.paymentId, amount: op.amount, date: bogotaDate() }] }));
    }
    case "addUsdPayment":
      return withCampaign(current, op.campaignId, (item) => ({ ...item, payments: [...item.payments, makeUsdPayment(item, op.cents, op.date, op.quote, op.paymentId)] }));
    case "removeLastPayment":
      return withCampaign(current, op.campaignId, (item) => ({ ...item, payments: item.payments.slice(0, -1) }));
    case "addExpense":
      return { ...current, expenses: [op.expense, ...current.expenses] };
    case "updateExpense":
      return { ...current, expenses: current.expenses.map((item) => item.id === op.id ? { ...item, ...op.changes, id: item.id } : item) };
    case "deleteExpense":
      return { ...current, expenses: current.expenses.filter((item) => item.id !== op.id) };
    case "addBill":
      return { ...current, bills: [op.bill, ...current.bills] };
    case "updateBill":
      return { ...current, bills: current.bills.map((item) => item.id === op.id ? { ...item, ...op.changes, id: item.id } : item) };
    case "setBillPaid":
      return { ...current, bills: current.bills.map((item) => item.id === op.id ? { ...item, paid: op.paid } : item) };
    case "deleteBill": {
      const bill = current.bills.find((item) => item.id === op.id);
      return {
        ...current,
        bills: current.bills.filter((item) => item.id !== op.id),
        recurring: current.recurring && bill?.recurringId ? { ...current.recurring, rules: current.recurring.rules.map((rule) => rule.id === bill.recurringId
          ? { ...rule, skippedPeriods: [...new Set([...(rule.skippedPeriods ?? []), bill.dueDate.slice(0, 7)])] } : rule) } : current.recurring,
      };
    }
    case "updateMonthColor":
      return { ...current, monthColors: { ...current.monthColors, [op.month]: op.color } };
  }
}

function withCampaign(data: FinanceData, id: string, change: (campaign: Campaign) => Campaign): FinanceData {
  return { ...data, campaigns: data.campaigns.map((campaign) => campaign.id === id ? change(campaign) : campaign) };
}
