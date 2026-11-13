import type { Campaign, CampaignPayment, ExchangeRate, FinanceData } from "./finance";

export const trmCurrency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const usdCurrency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", currencyDisplay: "code", minimumFractionDigits: 2 });

export function bogotaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function nextTrmRefreshAt(now = new Date()) {
  const todayAtFour = new Date(`${bogotaDate(now)}T04:00:00-05:00`);
  return now.getTime() < todayAtFour.getTime() ? todayAtFour : new Date(todayAtFour.getTime() + 86400000);
}

export function scheduledTrmDate(now = new Date()) {
  const cutoff = new Date(`${bogotaDate(now)}T04:00:00-05:00`);
  return bogotaDate(now.getTime() < cutoff.getTime() ? new Date(now.getTime() - 86400000) : now);
}

export function isDailyTrmRefreshDue(now: Date, quoteDate?: string, attemptedDate?: string) {
  const today = bogotaDate(now);
  if (now.getTime() < new Date(`${today}T04:00:00-05:00`).getTime()) return false;
  return (!quoteDate || quoteDate < today) && (!attemptedDate || attemptedDate < today);
}

export function isDateOnly(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function usdToCents(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error("Ingresa dólares con máximo dos decimales");
  const [whole, decimal = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) throw new Error("El importe es demasiado grande");
  return cents;
}

export function pendingUsdCents(campaign: Campaign) {
  return Math.max((campaign.usdValueCents ?? 0) - campaign.payments.reduce((sum, payment) => sum + (payment.usdAmountCents ?? 0), 0), 0);
}

export function usdCentsToCop(cents: number, rate: number) {
  if (!Number.isSafeInteger(cents) || cents < 0 || !Number.isFinite(rate) || rate <= 0) throw new Error("Importe o TRM inválidos");
  const result = Math.round(cents * rate / 100);
  if (!Number.isSafeInteger(result)) throw new Error("La conversión supera el importe permitido");
  return result;
}

export function revalueCampaign(campaign: Campaign, quote?: ExchangeRate): Campaign {
  if (campaign.currency !== "USD") return campaign;
  const paid = campaign.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const pending = pendingUsdCents(campaign);
  if (pending === 0) return { ...campaign, value: paid };
  const applicableQuote = quote && (!campaign.exchangeRateDate || quote.date >= campaign.exchangeRateDate) ? quote : undefined;
  const rate = applicableQuote?.value ?? campaign.exchangeRate;
  if (!rate) return campaign;
  return { ...campaign, value: paid + usdCentsToCop(pending, rate), exchangeRate: rate, exchangeRateDate: applicableQuote?.date ?? campaign.exchangeRateDate };
}

export function revalueFinanceData(data: FinanceData, quote = data.exchangeRate): FinanceData {
  return { ...data, exchangeRate: quote, campaigns: data.campaigns.map((campaign) => revalueCampaign(campaign, quote)) };
}

export function makeUsdPayment(campaign: Campaign, cents: number, date: string, quote: ExchangeRate, id: string): CampaignPayment {
  if (campaign.currency !== "USD" || !Number.isSafeInteger(cents) || cents <= 0 || cents > pendingUsdCents(campaign)) throw new Error("El pago debe ser mayor que cero y no superar el saldo en dólares");
  if (!isDateOnly(date) || date > bogotaDate() || quote.date !== date || date < quote.validFrom || date > quote.validTo) throw new Error("La TRM no corresponde a la fecha del pago");
  return { id, amount: usdCentsToCop(cents, quote.value), date, usdAmountCents: cents, exchangeRate: quote.value, exchangeRateDate: date };
}

export function validateCampaignMoney(campaign: Campaign) {
  if (!campaign || !Number.isSafeInteger(campaign.value) || campaign.value < 0 || !Array.isArray(campaign.payments)) return false;
  if (campaign.currency !== undefined && campaign.currency !== "COP" && campaign.currency !== "USD") return false;
  if (!campaign.payments.every((payment) => payment && Number.isSafeInteger(payment.amount) && payment.amount > 0 && isDateOnly(payment.date))) return false;
  if (campaign.currency !== "USD") return campaign.usdValueCents == null && campaign.payments.every((payment) => payment.usdAmountCents == null);
  if (!Number.isSafeInteger(campaign.usdValueCents) || campaign.usdValueCents! < 0 || !Number.isFinite(campaign.exchangeRate) || campaign.exchangeRate! <= 0 || (!isDateOnly(campaign.exchangeRateDate ?? "") || campaign.exchangeRateDate! > bogotaDate())) return false;
  let paidCents = 0;
  for (const payment of campaign.payments) {
    if (!Number.isSafeInteger(payment.usdAmountCents) || payment.usdAmountCents! <= 0 || !Number.isFinite(payment.exchangeRate) || payment.exchangeRate! <= 0 || payment.exchangeRateDate !== payment.date) return false;
    if (payment.date > bogotaDate()) return false;
    try { if (usdCentsToCop(payment.usdAmountCents!, payment.exchangeRate!) !== payment.amount) return false; } catch { return false; }
    paidCents += payment.usdAmountCents!;
  }
  return Number.isSafeInteger(paidCents) && paidCents <= campaign.usdValueCents!;
}
