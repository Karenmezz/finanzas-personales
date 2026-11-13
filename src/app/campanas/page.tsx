"use client";

import { CampaignCurrencyFields, campaignMoneyFromForm } from "@/components/campaign-currency-fields";
import { UsdPaymentDialog } from "@/components/usd-payment-dialog";
import { CampaignUsdDetails } from "@/components/campaign-usd-details";
import { FormEvent, useState } from "react";
import { isBarterCampaign, isPersonalIncome } from "@/lib/finance-insights";
import { useFinance } from "@/components/finance-provider";
import { createId, currency } from "@/lib/finance";

export default function CampaignsPage() {
  const { data, addCampaign, addPayment, deleteCampaign } = useFinance();
  const [showPaid, setShowPaid] = useState(false);
  const visibleCampaigns = data.campaigns.filter((campaign) => !isPersonalIncome(campaign) && !isBarterCampaign(campaign) && (showPaid || campaign.payments.reduce((sum, payment) => sum + payment.amount, 0) < campaign.value));
  const [usdPaymentId, setUsdPaymentId] = useState<string | null>(null);
  const usdPaymentCampaign = data.campaigns.find((campaign) => campaign.id === usdPaymentId);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let money;
    try { money = campaignMoneyFromForm(form, data.exchangeRate); setError(null); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Revisa el importe"); return; }
    addCampaign({
      id: createId(), name: String(form.get("name")), brand: String(form.get("brand")),
      network: String(form.get("network")), ...money,
      month: String(form.get("dueDate")).slice(0, 7), dueDate: String(form.get("dueDate")), status: "Pendiente", payments: [],
    });
    event.currentTarget.reset(); setOpen(false);
  }

  function registerPayment(id: string, pending: number) {
    if (data.campaigns.find((campaign) => campaign.id === id)?.currency === "USD") { setUsdPaymentId(id); return; }
    addPayment(id, pending);
  }

  return (
    <div className="mx-auto max-w-6xl">
      {usdPaymentCampaign && <UsdPaymentDialog key={usdPaymentCampaign.id} campaign={usdPaymentCampaign} onClose={() => setUsdPaymentId(null)} />}
      {error && <p role="alert" className="mb-4 text-sm text-rose-700">{error}</p>}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Campañas</h1><p className="mt-2 text-slate-600">Controla colaboraciones y pagos parciales.</p></div>
        <button className="button" onClick={() => setOpen(!open)}>+ Nueva campaña</button>
      </header>
      <button className="button-secondary mb-4" onClick={() => setShowPaid(!showPaid)}>{showPaid ? "Ocultar pagados" : "Mostrar pagados"}</button>
      {open && (
        <form onSubmit={submit} className="card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label><span className="label">Campaña</span><input className="field" name="name" required /></label>
          <label><span className="label">Marca</span><input className="field" name="brand" required /></label>
          <label><span className="label">Red social</span><select className="field" name="network"><option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Otra</option></select></label>
          <CampaignCurrencyFields />
          <label><span className="label">Fecha esperada de pago</span><input className="field" name="dueDate" type="date" required /></label>
          <div className="flex items-end gap-2"><button className="button" type="submit">Guardar</button><button className="button-secondary" type="button" onClick={() => setOpen(false)}>Cancelar</button></div>
        </form>
      )}
      <div className="space-y-4">
        {visibleCampaigns.map((campaign) => {
          const received = campaign.payments.reduce((sum, payment) => sum + payment.amount, 0);
          const pending = campaign.value - received;
          return (
            <article className="card" key={campaign.id}>
              <div className="flex flex-wrap justify-between gap-4">
                <div><h2 className="font-semibold">{campaign.name}</h2><p className="mt-1 text-sm text-slate-500">{campaign.brand} · {campaign.network} · {campaign.collaborationType ?? "Paga"} · {campaign.status}</p></div>
                <div className="text-right"><p className="font-bold">{currency.format(campaign.value)}</p><p className="text-sm text-amber-700">Pendiente: {currency.format(pending)}</p></div>
              </div>
              <CampaignUsdDetails campaign={campaign} />
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button className="button-secondary" disabled={pending === 0} onClick={() => registerPayment(campaign.id, pending)}>Registrar pago</button>
                <button className="button-danger" onClick={() => deleteCampaign(campaign.id)}>Eliminar</button>
                <span className="ml-auto text-sm text-slate-500">Pago esperado: {campaign.dueDate}</span>
              </div>
            </article>
          );
        })}
        {data.campaigns.length === 0 && <p className="card text-slate-500">No hay campañas registradas.</p>}
      </div>
    </div>
  );
}
