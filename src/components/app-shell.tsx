"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "@/components/logout-button";

const links = [
  ["Finanzas", "/"],
  ["Movimientos", "/movimientos"],
  ["Dashboard general", "/dashboard"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    closeButtonRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  if (pathname === "/login") return children;

  return (
    <div className="min-h-screen bg-white text-slate-800 md:grid md:h-screen md:grid-cols-[240px_1fr] md:overflow-hidden">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" className="font-bold text-slate-950">
          Panel financiero
        </Link>
        <button
          ref={menuButtonRef}
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          aria-controls="mobile-navigation"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(true)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          Menú
        </button>
      </header>

      <button
        type="button"
        aria-label="Cerrar menú"
        className={`fixed inset-0 z-40 bg-slate-950/40 transition-opacity duration-200 md:hidden ${mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={closeMobileMenu}
      />

      <aside
        id="mobile-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(85vw,20rem)] flex-col border-r border-slate-200 bg-white p-5 text-slate-800 shadow-2xl transition duration-200 ease-out md:static md:h-screen md:w-auto md:translate-x-0 md:shadow-none ${mobileMenuOpen ? "visible translate-x-0" : "invisible -translate-x-full md:visible"}`}
      >
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold text-slate-950" onClick={closeMobileMenu}>
            Panel financiero
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 md:hidden"
            aria-label="Cerrar menú"
            onClick={closeMobileMenu}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <nav className="mt-6 flex flex-col gap-2 pb-1" aria-label="Navegación principal">
          {links.map(([label, href]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={closeMobileMenu}
                className={`rounded-xl px-3 py-2 text-sm transition ${active ? "bg-slate-100 font-bold text-slate-950 shadow-sm" : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <LogoutButton />
      </aside>
      <main className="min-w-0 p-5 sm:p-8 md:h-screen md:overflow-y-auto">{children}</main>
    </div>
  );
}
