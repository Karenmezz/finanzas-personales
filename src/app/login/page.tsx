import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5"><section className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Acceso privado</p><h1 className="mt-3 text-2xl font-bold text-slate-950">Panel financiero</h1><p className="mt-3 text-sm leading-6 text-slate-600">Ingresa con tu cuenta de administración global.</p><LoginForm /></section></main>;
}
