"use client";
import Image from "next/image";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useProfile } from "@/components/profile-provider";
import { validProfile, type UserProfile } from "@/lib/profile";

async function preparePhoto(file: File): Promise<string> {
  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("Selecciona una foto JPG, PNG o WebP.");
  if (file.size > 10 * 1024 * 1024) throw new Error("La foto debe pesar menos de 10 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height) throw new Error("No fue posible leer la foto.");
    const canvas = document.createElement("canvas"); canvas.width=256; canvas.height=256;
    const context = canvas.getContext("2d"); if (!context) throw new Error("No fue posible preparar la foto.");
    context.fillStyle="white"; context.fillRect(0,0,256,256);
    const size = Math.min(bitmap.width,bitmap.height);
    context.drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,256,256);
    return canvas.toDataURL("image/jpeg",0.85);
  } finally { bitmap.close(); }
}
export function ProfileSettings() {
  const { profile,loading,error } = useProfile();
  if (loading) return <p role="status" className="card text-sm text-slate-500">Cargando tu perfil…</p>;
  if (error) return <p role="alert" className="card text-sm text-rose-700">{error}</p>;
  return <ProfileForm initial={profile} />;
}
function ProfileForm({ initial }: { initial: UserProfile }) {
  const { saveProfile } = useProfile();
  const [photo,setPhoto] = useState(initial.photo);
  const [busy,setBusy] = useState(false);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState<string | null>(null);
  const [message,setMessage] = useState<string | null>(null);
  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value="";
    if (!file) return;
    setBusy(true); setError(null); setMessage(null);
    try { setPhoto(await preparePhoto(file)); } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible abrir la foto."); } finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || saving) return;
    const next = { displayName:String(new FormData(event.currentTarget).get("displayName") ?? "").trim(), photo };
    if (!validProfile(next)) { setError("Escribe tu nombre y revisa la foto seleccionada."); return; }
    setSaving(true); setError(null); setMessage(null);
    try { await saveProfile(next); setMessage("Perfil guardado"); } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible guardar el perfil."); } finally { setSaving(false); }
  }
  return <form onSubmit={submit} aria-label="Mi perfil" className="card max-w-2xl space-y-5">
    <div><h2 className="text-lg font-bold">Mi perfil</h2><p className="mt-1 text-sm text-slate-500">Tu nombre y foto aparecerán en el saludo de todas las secciones.</p></div>
    <div className="flex flex-wrap items-center gap-4"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-3xl font-bold text-violet-700">{photo ? <Image src={photo} alt="Vista previa de tu foto de perfil" width={96} height={96} unoptimized className="h-full w-full object-cover" /> : initial.displayName.charAt(0).toUpperCase() || <span className="text-sm font-medium">Sin foto</span>}</div><div className="min-w-0 flex-1"><label className="block"><span className="label">Subir o cambiar foto</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} disabled={busy || saving} className="block w-full max-w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:font-semibold file:text-violet-800" /></label><p className="mt-2 text-[11px] text-slate-500">JPG, PNG o WebP, hasta 10 MB. Se ajusta al centro y se reduce automáticamente.</p>{photo && <button type="button" className="mt-2 text-xs font-semibold text-rose-700" onClick={() => { setPhoto(null); setMessage(null); }} disabled={busy || saving}>Quitar foto</button>}</div></div>
    <label className="block"><span className="label">Nombre para el saludo</span><input name="displayName" autoComplete="given-name" className="field" defaultValue={initial.displayName} maxLength={60} placeholder="Escribe tu nombre" required onChange={() => setMessage(null)} /></label>
    <p className="text-xs text-slate-500">Se guarda en tu cuenta. La foto no se agrega al código del proyecto.</p>
    {busy && <p role="status" className="text-sm text-slate-500">Preparando foto…</p>}{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    <button type="submit" className="button disabled:opacity-50" disabled={busy || saving}>{saving ? "Guardando…" : "Guardar perfil"}</button>
  </form>;
}
