import type { Bill, Campaign, FinanceData, RecurringRule, RecurringSettings } from "./finance";

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
export function todayInColombia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validateRecurringSettings(value: unknown): value is RecurringSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as RecurringSettings;
  const ids = new Set<string>();
  return settings.version === 1 && Array.isArray(settings.rules) && settings.rules.every((rule) => {
    if (!rule || typeof rule.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(rule.id) || ids.has(rule.id)) return false;
    ids.add(rule.id);
    return (!rule.monthlyAmounts || (typeof rule.monthlyAmounts === "object" && !Array.isArray(rule.monthlyAmounts) && Object.entries(rule.monthlyAmounts).every(([period, amount]) => monthPattern.test(period) && Number.isSafeInteger(amount) && amount > 0))) && (!rule.skippedPeriods || (Array.isArray(rule.skippedPeriods) && rule.skippedPeriods.every((period) => typeof period === "string" && monthPattern.test(period)))) && ["expense", "income"].includes(rule.kind) && typeof rule.name === "string" && Boolean(rule.name.trim()) && typeof rule.category === "string" && Boolean(rule.category.trim()) && typeof rule.enabled === "boolean" && validDate(rule.startOn) && (!rule.endOn || (validDate(rule.endOn) && rule.endOn >= rule.startOn)) && Array.isArray(rule.versions) && rule.versions.length > 0 && rule.versions.every((version) => version && typeof version.from === "string" && monthPattern.test(version.from) && Number.isSafeInteger(version.amount) && version.amount > 0 && Number.isInteger(version.day) && version.day >= 1 && version.day <= 31) && new Set(rule.versions.map((version) => version.from)).size === rule.versions.length && rule.versions.some((version) => version.from <= rule.startOn.slice(0, 7));
  });
}
export function recurringVersion(rule: RecurringRule, period: string) {
  return [...rule.versions].filter((version) => version.from <= period).sort((a, b) => b.from.localeCompare(a.from))[0];
}
export function recurringDate(rule: RecurringRule, period: string) {
  const version = recurringVersion(rule, period);
  if (rule.skippedPeriods?.includes(period) || !rule.enabled || !version || period < rule.startOn.slice(0, 7) || (rule.endOn && period > rule.endOn.slice(0, 7))) return undefined;
  const [year, month] = period.split("-").map(Number);
  const date = `${period}-${String(Math.min(version.day, new Date(Date.UTC(year, month, 0)).getUTCDate())).padStart(2, "0")}`;
  const effectiveDate = date < rule.startOn ? rule.startOn : date;
  return rule.endOn && effectiveDate > rule.endOn ? undefined : effectiveDate;
}

// Generate only from the current month onward. Recorded past months and payments are immutable here.
export function materializeRecurring(data: FinanceData, years: number[], today = todayInColombia()): FinanceData {
  if (!data.recurring) return data;
  const periodNow = today.slice(0, 7);
  const rules = new Map(data.recurring.rules.map((rule) => [rule.id, rule]));
  const bills: Bill[] = [];
  const campaigns: Campaign[] = [];
  for (const bill of data.bills) {
    const period = bill.dueDate.slice(0, 7);
    const rule = bill.recurringId ? rules.get(bill.recurringId) : undefined;
    if (!rule || period < periodNow || bill.paid) { bills.push(bill); continue; }
    const dueDate = recurringDate(rule, period);
    if (dueDate && bill.manualOverride) bills.push(bill);
    else if (dueDate) bills.push({ ...bill, name: rule.name, category: rule.category, dueDate, amount: recurringVersion(rule, period)!.amount });
  }
  for (const campaign of data.campaigns) {
    const period = campaign.month ?? campaign.dueDate.slice(0, 7);
    const rule = campaign.recurringId ? rules.get(campaign.recurringId) : undefined;
    if (!rule || period < periodNow || campaign.payments.length) { campaigns.push(campaign); continue; }
    const dueDate = recurringDate(rule, period);
    if (dueDate && campaign.manualOverride) campaigns.push(campaign);
    else if (dueDate) campaigns.push({ ...campaign, name: rule.name, brand: rule.category, dueDate, value: recurringVersion(rule, period)!.amount });
  }
  const occupiedBills = new Set(bills.filter((bill) => bill.recurringId).map((bill) => `${bill.recurringId}:${bill.dueDate.slice(0, 7)}`));
  const occupiedIncomes = new Set(campaigns.filter((campaign) => campaign.recurringId).map((campaign) => `${campaign.recurringId}:${campaign.month ?? campaign.dueDate.slice(0, 7)}`));
  for (const rule of rules.values()) for (const year of new Set(years)) for (let month = 1; month <= 12; month++) {
    const period = `${year}-${String(month).padStart(2, "0")}`;
    if (period < periodNow) continue;
    const date = recurringDate(rule, period);
    if (!date) continue;
    const key = `${rule.id}:${period}`;
    const amount = rule.monthlyAmounts?.[period] ?? recurringVersion(rule, period)!.amount;
    const id = `fixed-${rule.id}-${period}`;
    if (rule.kind === "expense" && !occupiedBills.has(key)) { bills.push({ id, recurringId: rule.id, manualOverride: rule.monthlyAmounts?.[period] !== undefined, name: rule.name, category: rule.category, amount, dueDate: date, paid: false }); occupiedBills.add(key); }
    if (rule.kind === "income" && !occupiedIncomes.has(key)) { campaigns.push({ id, recurringId: rule.id, manualOverride: rule.monthlyAmounts?.[period] !== undefined, incomeType: "personal", name: rule.name, brand: rule.category, network: "Otra", month: period, value: amount, currency: "COP", dueDate: date, status: "Pendiente", payments: [] }); occupiedIncomes.add(key); }
  }
  return { ...data, campaigns, bills };
}

export function changeRecurringAmount(data: FinanceData, kind: "expense" | "income", id: string, amount: number, scope: "month" | "future", today = todayInColombia()): FinanceData {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("El valor debe ser un número entero mayor que cero");
  const bill = kind === "expense" ? data.bills.find((item) => item.id === id) : undefined;
  const income = kind === "income" ? data.campaigns.find((item) => item.id === id) : undefined;
  const row = bill ?? income;
  if (!row) throw new Error("No se encontró el registro");
  if (bill?.paid || income?.payments.length) throw new Error("Este registro ya tiene pagos; se conserva su valor original");
  const period = income?.month ?? row.dueDate.slice(0, 7);
  if (scope === "future" && period < today.slice(0, 7)) throw new Error("Para meses anteriores usa Solo este mes");
  let next = data;
  if (scope === "future") {
    const rule = data.recurring?.rules.find((rule) => rule.id === row.recurringId);
    if (!rule) throw new Error("Configura primero la recurrencia de este registro");
    const version = recurringVersion(rule, period)!;
    next = { ...data, recurring: { version: 1, rules: data.recurring!.rules.map((item) => item.id !== rule.id ? item : { ...item, versions: [...item.versions.filter((v) => v.from < period), { ...version, from: period, amount }] }) } };
  }
  const linkedRule = next.recurring?.rules.find((rule) => rule.id === row.recurringId);
  if (linkedRule) {
    const monthlyAmounts = { ...linkedRule.monthlyAmounts };
    if (scope === "month") monthlyAmounts[period] = amount; else delete monthlyAmounts[period];
    next = { ...next, recurring: { version: 1, rules: next.recurring!.rules.map((rule) => rule.id === linkedRule.id ? { ...rule, monthlyAmounts } : rule) } };
  }
  const manualOverride = scope === "month";
  return { ...next,
    bills: next.bills.map((item) => item.id === bill?.id ? { ...item, amount, manualOverride } : item),
    campaigns: next.campaigns.map((item) => item.id === income?.id ? { ...item, value: amount, manualOverride } : item),
  };
}

// One-time adoption: infer rules from persisted generated records, never from personal defaults.
export function adoptExistingRecurring(data: FinanceData, today = todayInColombia()): FinanceData {
  if (data.recurring) return data;
  const normalize = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const expenseNames = new Set(data.bills.filter((bill) => bill.id.startsWith("recurring-")).map((bill) => normalize(bill.name)));
  const groups = new Map<string, (Bill | Campaign)[]>();
  for (const bill of data.bills) if (expenseNames.has(normalize(bill.name))) { const key = `expense:${normalize(bill.name)}`; groups.set(key, [...(groups.get(key) ?? []), bill]); }
  for (const income of data.campaigns) if (income.incomeType === "personal") { const key = `income:${normalize(income.brand)}`; groups.set(key, [...(groups.get(key) ?? []), income]); }
  const rules: RecurringRule[] = [];
  const billIds = new Map<string, string>(); const campaignIds = new Map<string, string>();
  for (const [key, rows] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    // Favor this month's saved invoice over generated projections.
    const period = today.slice(0, 7);
    const sorted = [...rows].sort((a, b) => {
      const ap = a.dueDate.slice(0, 7), bp = b.dueDate.slice(0, 7);
      return Number(bp === period) - Number(ap === period) || Number(bp < period) - Number(ap < period) || b.dueDate.localeCompare(a.dueDate);
    });
    const source = sorted[0]; const kind = key.startsWith("expense:") ? "expense" : "income";
    const amount = "amount" in source ? source.amount : source.value;
    if (amount <= 0) continue;
    const id = `adopted-${rules.length + 1}`;
    rules.push({ id, kind, name: source.name, category: "category" in source ? source.category : source.brand, startOn: today, enabled: true, versions: [{ from: period, amount, day: Number(source.dueDate.slice(8, 10)) }] });
    for (const row of rows) (kind === "expense" ? billIds : campaignIds).set(row.id, id);
  }
  return { ...data, recurring: { version: 1, rules }, bills: data.bills.map((bill) => billIds.has(bill.id) ? { ...bill, recurringId: billIds.get(bill.id), manualOverride: bill.manualOverride || (bill.dueDate.slice(0, 7) === today.slice(0, 7) && bill.dueDate < today) } : bill), campaigns: data.campaigns.map((campaign) => campaignIds.has(campaign.id) ? { ...campaign, recurringId: campaignIds.get(campaign.id), manualOverride: campaign.manualOverride || (campaign.dueDate.slice(0, 7) === today.slice(0, 7) && campaign.dueDate < today) } : campaign) };
}
