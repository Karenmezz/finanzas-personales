import { cookies } from "next/headers";
import { db } from "@/db";
import { userProfile } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sessionCookieName, verifySessionToken } from "@/auth/session";
import { emptyProfile, validProfile } from "@/lib/profile";
export const runtime = "nodejs";
const headers = { "Cache-Control":"private, no-store" };
async function authorized() { return verifySessionToken((await cookies()).get(sessionCookieName)?.value); }
export async function GET() {
  if (!await authorized()) return Response.json({ error:"No autorizado" },{ status:401,headers });
  try { const [row] = await db.select().from(userProfile).where(eq(userProfile.id,"admin")); return Response.json(row?.value ?? emptyProfile,{ headers }); }
  catch { return Response.json({ error:"No fue posible leer el perfil" },{ status:500,headers }); }
}
export async function PUT(request: Request) {
  if (!await authorized()) return Response.json({ error:"No autorizado" },{ status:401,headers });
  const text = await request.text();
  if (text.length > 190000) return Response.json({ error:"La foto es demasiado grande" },{ status:413,headers });
  let value: unknown; try { value=JSON.parse(text); } catch { return Response.json({ error:"Datos inválidos" },{ status:400,headers }); }
  if (!validProfile(value)) return Response.json({ error:"Revisa el nombre y la foto" },{ status:400,headers });
  const profile = { displayName:value.displayName.trim(), photo:value.photo };
  try { await db.insert(userProfile).values({ id:"admin",value:profile }).onConflictDoUpdate({ target:userProfile.id,set:{value:profile} }); return Response.json(profile,{headers}); }
  catch { return Response.json({error:"No fue posible guardar el perfil"},{status:500,headers}); }
}
