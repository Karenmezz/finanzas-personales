import { getFinanceData, replaceFinanceData } from "@/data/finance-data";
import { bogotaDate, isDateOnly, revalueFinanceData, validateCampaignMoney } from "@/lib/usd";
import type { FinanceData } from "@/lib/finance";
import { cookies } from "next/headers";
import { sessionCookieName, verifySessionToken } from "@/auth/session";

export const runtime = "nodejs";

async function isAdmin() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(sessionCookieName)?.value);
}

function isFinanceData(value: unknown): value is FinanceData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FinanceData>;
  const quote = candidate.exchangeRate;
  if (quote !== undefined && (!quote || !Number.isFinite(quote.value) || quote.value <= 0 || !isDateOnly(quote.date) || quote.date > bogotaDate() || !isDateOnly(quote.validFrom) || !isDateOnly(quote.validTo) || quote.date < quote.validFrom || quote.date > quote.validTo)) return false;
  return Boolean(Array.isArray(candidate.campaigns) && candidate.campaigns.every(validateCampaignMoney) && Array.isArray(candidate.bills) && Array.isArray(candidate.expenses) && candidate.monthColors && typeof candidate.monthColors === "object");
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "No autorizado" }, { status: 401 });
  try {
    return Response.json(await getFinanceData());
  } catch (error) {
    console.error("No fue posible leer las finanzas", error);
    return Response.json({ error: "No fue posible leer los datos" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "No autorizado" }, { status: 401 });
  try {
    const data: unknown = await request.json();
    if (!isFinanceData(data)) return Response.json({ error: "Datos inválidos" }, { status: 400 });
    await replaceFinanceData(revalueFinanceData(data));
    return Response.json({ ok: true });
  } catch (error) {
    console.error("No fue posible guardar las finanzas", error);
    return Response.json({ error: "No fue posible guardar los datos" }, { status: 500 });
  }
}
