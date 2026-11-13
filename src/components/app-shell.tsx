"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ProfileGreeting } from "@/components/profile-greeting";
import { LogoutButton } from "@/components/logout-button";
import { NavigationIcon, type NavigationIconName } from "@/components/navigation-icon";

const links: { label: string; href: string; icon: NavigationIconName }[] = [
  { label: "Finanzas", href: "/", icon: "wallet" },
  { label: "Contenidos", href: "/contenidos", icon: "calendar" },
  { label: "Movimientos", href: "/movimientos", icon: "movements" },
  { label: "Dashboard general", href: "/dashboard", icon: "dashboard" },
  { label: "Configuración", href: "/configuracion", icon: "settings" },
];
const mobileLinks = [links[3], links[0], links[1]];
const quickActions: { label: string; detail: string; href: string; icon: NavigationIconName }[] = [
  { label: "Registrar gasto", detail: "Un gasto personal o de la casa", href: "/?new=expense", icon: "wallet" },
  { label: "Nueva campaña", detail: "Una colaboración paga o mixta", href: "/contenidos?new=campaign", icon: "calendar" },
  { label: "Nuevo canje", detail: "Productos, bono o saldo", href: "/contenidos/canjes?new=barter", icon: "gift" },
  { label: "Agregar ingreso", detail: "Configurar un ingreso mensual", href: "/configuracion?new=income", icon: "income" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [panel, setPanel] = useState<"create" | "more" | null>(null);
  const [requestId, setRequestId] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const createRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const active = (href: string) => pathname === href || (href === "/contenidos" && pathname.startsWith("/contenidos/"));
  const moreActive = ["/movimientos", "/configuracion", "/cuentas", "/gastos", "/campanas", "/cobrar"].includes(pathname);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!panel || !dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) dialog.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [panel]);

  function openPanel(next: "create" | "more") {
    setRequestId(crypto.randomUUID());
    setPanel(next);
  }
  function closePanel() { dialogRef.current?.close(); }
  function panelClosed() {
    const trigger = panel === "create" ? createRef.current : moreRef.current;
    setPanel(null);
    if (window.matchMedia("(max-width: 767px)").matches) trigger?.focus();
  }
  if (pathname === "/login") return children;

  return <div className="min-h-screen bg-white text-slate-800 md:grid md:h-screen md:grid-cols-[240px_1fr] md:overflow-hidden">
    <aside className="hidden flex-col border-r border-slate-200 bg-white p-5 md:flex md:h-screen" aria-label="Menú de escritorio">
      <Link href="/" className="text-lg font-bold text-slate-950">Mis finanzas</Link>
      <nav className="mt-6 flex flex-col gap-2 pb-1" aria-label="Navegación principal">{links.map(({label,href,icon}) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${active(href) ? "bg-slate-100 font-bold text-slate-950 shadow-sm" : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}><NavigationIcon name={icon} className="h-5 w-5 shrink-0" />{label}</Link>)}</nav>
      <LogoutButton />
    </aside>
    <main className="app-main min-w-0 p-5 sm:p-8 md:h-screen md:overflow-y-auto"><ProfileGreeting />{children}</main>
    <nav className="mobile-bottom-nav md:hidden" aria-label="Navegación móvil">
      {mobileLinks.slice(0,2).map(({label,href,icon}) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={`mobile-nav-item ${active(href) ? "mobile-nav-active" : ""}`}><NavigationIcon name={icon} className="h-[22px] w-[22px]" /><span>{href === "/dashboard" ? "Dashboard" : label}</span></Link>)}
      <button ref={createRef} type="button" className="mobile-nav-item mobile-create" aria-label="Agregar registro" aria-haspopup="dialog" aria-expanded={panel === "create"} aria-controls="mobile-actions" onClick={() => openPanel("create")}><span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-200 to-violet-300 text-violet-950 shadow-sm"><NavigationIcon name="plus" className="h-7 w-7" /></span><span>Agregar</span></button>
      {mobileLinks.slice(2).map(({label,href,icon}) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={`mobile-nav-item ${active(href) ? "mobile-nav-active" : ""}`}><NavigationIcon name={icon} className="h-[22px] w-[22px]" /><span>{label}</span></Link>)}
      <button ref={moreRef} type="button" aria-current={moreActive ? "page" : undefined} aria-label="Más opciones" aria-haspopup="dialog" aria-expanded={panel === "more"} aria-controls="mobile-actions" className={`mobile-nav-item ${moreActive ? "mobile-nav-active" : ""}`} onClick={() => openPanel("more")}><NavigationIcon name="more" className="h-[22px] w-[22px]" /><span>Más</span></button>
    </nav>
    <dialog ref={dialogRef} id="mobile-actions" className="mobile-action-sheet" aria-labelledby="mobile-actions-title" onClose={panelClosed} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientY < rect.top || event.clientY > rect.bottom || event.clientX < rect.left || event.clientX > rect.right) closePanel(); } }}>
      <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-slate-200" aria-hidden="true" />
      <div className="mb-3 flex items-center justify-between gap-3"><div><h2 id="mobile-actions-title" className="text-lg font-bold">{panel === "create" ? "¿Qué quieres agregar?" : "Más opciones"}</h2><p className="mt-1 text-xs text-slate-500">{panel === "create" ? "Elige qué vas a registrar" : "Tu historial y configuración"}</p></div><button type="button" aria-label="Cerrar opciones" onClick={closePanel} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"><NavigationIcon name="close" className="h-5 w-5" /></button></div>
      <div className="space-y-1">{panel === "create" ? quickActions.map(({label,detail,href,icon}) => <Link key={href} href={`${href}&request=${requestId}#nuevo-registro`} onClick={closePanel} className="flex min-h-16 items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><NavigationIcon name={icon} className="h-5 w-5" /></span><span><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-xs text-slate-500">{detail}</span></span><span aria-hidden="true" className="ml-auto text-slate-400">›</span></Link>) : links.filter(({href}) => href === "/movimientos" || href === "/configuracion").map(({label,href,icon}) => <Link key={href} href={href} onClick={closePanel} aria-current={active(href) ? "page" : undefined} className={`flex min-h-14 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active(href) ? "bg-violet-50 text-violet-900" : "hover:bg-slate-50"}`}><NavigationIcon name={icon} className="h-5 w-5" />{label}</Link>)}</div>
      {panel === "more" && <LogoutButton onLogout={closePanel} />}
    </dialog>
  </div>;
}
