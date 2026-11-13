import { cookies } from "next/headers";
import { sessionCookieName, verifySessionToken } from "@/auth/session";
import { getExchangeRate } from "@/lib/trm";
import { bogotaDate, isDateOnly } from "@/lib/usd";

export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!(await verifySessionToken((await cookies()).get(sessionCookieName)?.value))) return Response.json({ error: "No autorizado" }, { status: 401 });
  const date = new URL(request.url).searchParams.get("date") ?? bogotaDate();
  if (!isDateOnly(date) || date > bogotaDate()) return Response.json({ error: "Selecciona una fecha válida que no sea futura" }, { status: 400 });
  try {
    return Response.json(await getExchangeRate(date));
  } catch (error) {
    console.error("No fue posible consultar la TRM", error);
    return Response.json({ error: "La TRM oficial no está disponible por ahora; no se registró ningún pago." }, { status: 503 });
  }
}
