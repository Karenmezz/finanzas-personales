"use client";
import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useProfile } from "@/components/profile-provider";
import { greetingDate, nextColombiaMidnight } from "@/lib/profile";
function subscribeClock(update: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  function schedule() { timer = setTimeout(() => { update(); schedule(); }, Math.max(100, nextColombiaMidnight().getTime() - Date.now() + 50)); }
  function visible() { if (document.visibilityState === "visible") update(); }
  schedule(); window.addEventListener("focus",update); document.addEventListener("visibilitychange",visible);
  return () => { clearTimeout(timer); window.removeEventListener("focus",update); document.removeEventListener("visibilitychange",visible); };
}
const readDate = () => greetingDate();
export function ProfileGreeting() {
  const { profile } = useProfile();
  const date = useSyncExternalStore(subscribeClock,readDate,() => "");
  return <header className="mx-auto mb-6 flex w-full max-w-7xl items-center gap-3 sm:mb-7 sm:gap-4" aria-label="Saludo personal">
    <Link href="/configuracion?section=profile" aria-label="Editar mi perfil y foto" className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-100 to-violet-200 text-xl font-bold text-violet-900 ring-2 ring-white outline-offset-4 sm:h-16 sm:w-16">
      {profile.photo ? <Image src={profile.photo} alt="" width={64} height={64} unoptimized className="h-full w-full object-cover" /> : profile.displayName ? profile.displayName.charAt(0).toUpperCase() : <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>}
    </Link>
    <div className="min-w-0"><p className="break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Hola{profile.displayName ? `, ${profile.displayName}` : ""}</p><p className="mt-0.5 text-sm text-slate-500 sm:text-base">{date || " "}</p></div>
  </header>;
}
