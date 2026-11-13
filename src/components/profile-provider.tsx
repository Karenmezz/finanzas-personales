"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { emptyProfile, type UserProfile } from "@/lib/profile";
const ProfileContext = createContext<{ profile: UserProfile; loading: boolean; error: string | null; retryProfile: () => void; saveProfile: (profile: UserProfile) => Promise<void> } | null>(null);
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const isLogin = usePathname() === "/login";
  const [profile,setProfile] = useState(emptyProfile);
  const [loading,setLoading] = useState(true);
  const [attempt,setAttempt] = useState(0);
  const [error,setError] = useState<string | null>(null);
  useEffect(() => {
    if (isLogin) return;
    const controller = new AbortController();
    fetch("/api/profile", { cache:"no-store", signal:controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("No fue posible cargar tu perfil. Puedes volver a intentarlo.");
      setProfile(await response.json()); setError(null); setLoading(false);
    }).catch((failure) => { if (!controller.signal.aborted) { setError(failure instanceof Error ? failure.message : "No fue posible cargar el perfil"); setLoading(false); } });
    return () => controller.abort();
  },[isLogin,attempt]);
  async function saveProfile(next: UserProfile) {
    const response = await fetch("/api/profile", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(next) });
    if (!response.ok) throw new Error("No fue posible guardar tu perfil. Tus cambios no se han guardado.");
    setProfile(await response.json()); setError(null);
  }
  function retryProfile() { setLoading(true); setError(null); setAttempt((value) => value + 1); }
  return <ProfileContext.Provider value={{ profile,loading,error,retryProfile,saveProfile }}>{children}</ProfileContext.Provider>;
}
export function useProfile() { const profile = useContext(ProfileContext); if (!profile) throw new Error("Falta ProfileProvider"); return profile; }
