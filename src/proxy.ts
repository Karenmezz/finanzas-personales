import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sessionCookieName, verifySessionToken } from "@/auth/session";

export async function proxy(request: NextRequest) {
  const authenticated = await verifySessionToken(request.cookies.get(sessionCookieName)?.value);
  const isLogin = request.nextUrl.pathname === "/login";

  if (isLogin && authenticated) return NextResponse.redirect(new URL("/", request.url));
  if (!isLogin && !authenticated) {
    if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
