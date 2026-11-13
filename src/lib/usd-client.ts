import type { ExchangeRate } from "./finance";
import { bogotaDate, isDateOnly } from "./usd";

export async function fetchExchangeRate(date = bogotaDate(), signal?: AbortSignal): Promise<ExchangeRate> {
  const response = await fetch(`/api/exchange-rate?date=${encodeURIComponent(date)}`, { cache: "no-store", signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "No fue posible consultar la TRM");
  if (result.date !== date || !Number.isFinite(result.value) || result.value <= 0 || !isDateOnly(result.validFrom) || !isDateOnly(result.validTo) || date < result.validFrom || date > result.validTo) throw new Error("La TRM recibida no corresponde a la fecha solicitada");
  return result;
}
