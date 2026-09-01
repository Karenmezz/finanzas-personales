import { NextResponse } from "next/server";
import { verifyAdminCredentials } from "@/auth/password";
import { createSessionToken, sessionCookieName } from "@/auth/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: unknown; password?: unknown };
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!verifyAdminCredentials(username, password)) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieName, await createSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      priority: "high",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "No fue posible iniciar sesión" }, { status: 400 });
  }
}
