"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["Finanzas", "/"],
  ["Movimientos", "/movimientos"],
  ["Dashboard general", "/dashboard"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-white text-slate-800 md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-slate-200 bg-white p-5 text-slate-800 md:min-h-screen md:border-b-0 md:border-r">
        <Link href="/" className="text-lg font-bold text-slate-950">Panel financiero</Link>
        <nav className="mt-5 grid grid-cols-3 gap-2 pb-1 md:flex md:flex-col" aria-label="Navegación principal">
          {links.map(([label, href]) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`rounded-xl px-2 py-2 text-center text-xs transition sm:px-3 sm:text-sm md:text-left ${active ? "bg-slate-100 font-bold text-slate-950 shadow-sm" : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 p-5 sm:p-8">{children}</main>
    </div>
  );
}
