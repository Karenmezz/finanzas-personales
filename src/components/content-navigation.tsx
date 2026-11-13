"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ContentNavigation() {
  const pathname = usePathname();
  return <nav className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-1.5" aria-label="Secciones de contenidos">
    {[["/contenidos", "Campañas pagas"], ["/contenidos/canjes", "Canjes"], ["/contenidos/marcas", "Marcas"]].map(([href, label]) =>
      <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`flex-1 shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-center text-sm font-semibold ${pathname === href ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:bg-white"}`}>{label}</Link>)}
  </nav>;
}
