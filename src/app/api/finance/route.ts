import { applyFinanceOperation, getFinanceData, OperationError } from "@/data/finance-data";
import { isFinanceOperation } from "@/lib/finance-operations";
import { cookies } from "next/headers";
import { sessionCookieName, verifySessionToken } from "@/auth/session";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

async function isAdmin() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(sessionCookieName)?.value);
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "No autorizado" }, { status: 401, headers });
  try {
    return Response.json(await getFinanceData(), { headers });
  } catch (error) {
    console.error("No fue posible leer las finanzas", error);
    return Response.json({ error: "No fue posible leer los datos" }, { status: 500, headers });
  }
}

// Receives one operation (not the whole data set) and returns the updated data.
export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "No autorizado" }, { status: 401, headers });
  let op: unknown;
  try { op = await request.json(); } catch { return Response.json({ error: "Datos inválidos" }, { status: 400, headers }); }
  if (!isFinanceOperation(op)) return Response.json({ error: "Operación desconocida" }, { status: 400, headers });
  try {
    await applyFinanceOperation(op);
    return Response.json(await getFinanceData(), { headers });
  } catch (error) {
    if (error instanceof OperationError) return Response.json({ error: error.message }, { status: 400, headers });
    console.error("No fue posible guardar las finanzas", error);
    return Response.json({ error: "No fue posible guardar el cambio" }, { status: 500, headers });
  }
}
