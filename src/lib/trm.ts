import "server-only";
import type { ExchangeRate } from "./finance";
import { bogotaDate, isDateOnly } from "./usd";

export async function getExchangeRate(date = bogotaDate()): Promise<ExchangeRate> {
  if (!isDateOnly(date) || date > bogotaDate()) throw new Error("Selecciona una fecha válida que no sea futura");
  const timestamp = `${date}T00:00:00`;
  const url = new URL("https://www.datos.gov.co/resource/32sa-8pi3.json");
  url.searchParams.set("$where", `vigenciadesde <= '${timestamp}' AND vigenciahasta >= '${timestamp}'`);
  url.searchParams.set("$order", "vigenciadesde DESC");
  url.searchParams.set("$limit", "1");
  const response = await fetch(url, { next: { revalidate: date === bogotaDate() ? 900 : 86400 }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("No fue posible consultar la TRM oficial");
  const rows: { valor?: string; unidad?: string; vigenciadesde?: string; vigenciahasta?: string }[] = await response.json();
  const row = rows[0];
  const value = Number(row?.valor);
  const validFrom = row?.vigenciadesde?.slice(0, 10) ?? "";
  const validTo = row?.vigenciahasta?.slice(0, 10) ?? "";
  if (!Number.isFinite(value) || value <= 0 || row?.unidad !== "COP" || !isDateOnly(validFrom) || !isDateOnly(validTo) || date < validFrom || date > validTo) throw new Error("No hay una TRM oficial disponible para esa fecha");
  return { date, value, validFrom, validTo, source: "Superintendencia Financiera de Colombia" };
}
