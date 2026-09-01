"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "No fue posible iniciar sesión");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Revisa tu conexión e inténtalo nuevamente");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="mt-8 space-y-5"><label className="block"><span className="label mb-2">Usuario</span><input className="field h-12 px-4" name="username" autoComplete="username" required /></label><label className="block"><span className="label mb-2">Contraseña</span><input className="field h-12 px-4" name="password" type="password" autoComplete="current-password" required /></label>{error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{error}</p>}<div className="pt-2"><button className="button h-12 w-full" disabled={pending} type="submit">{pending ? "Ingresando…" : "Iniciar sesión"}</button></div></form>;
}
