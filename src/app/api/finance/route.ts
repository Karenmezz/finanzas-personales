import { getFinanceData, replaceFinanceData } from "@/data/finance-data";
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
  return Boolean(Array.isArray(candidate.campaigns) && Array.isArray(candidate.bills) && Array.isArray(candidate.expenses) && candidate.monthColors && typeof candidate.monthColors === "object");
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
    await replaceFinanceData(data);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("No fue posible guardar las finanzas", error);
    return Response.json({ error: "No fue posible guardar los datos" }, { status: 500 });
  }
}
