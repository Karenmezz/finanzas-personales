"use client";

import { useState, type FormEvent } from "react";
import { useFinance } from "@/components/finance-provider";
import { CampaignCurrencyFields, campaignMoneyFromForm, prepareCampaignMoney } from "@/components/campaign-currency-fields";
import type { Campaign, CampaignBenefit } from "@/lib/finance";
import { createId } from "@/lib/finance";
import { collaborationKind, validateCampaignBenefit } from "@/lib/finance-insights";
import { isDateOnly } from "@/lib/usd";

export function CollaborationForm({ campaign, period, defaultType = "Paga", embedded = false, onSaved, onCancel }: {
  campaign?: Campaign;
  period: string;
  defaultType?: string;
  embedded?: boolean;
  onSaved: (campaign: Campaign) => void;
  onCancel: () => void;
}) {
  const { data, addCampaign, updateCampaign } = useFinance();
  const initialType = campaign ? collaborationKind(campaign) : collaborationKind({ collaborationType: defaultType });
  const [kind, setKind] = useState(initialType);
  const [benefitKind, setBenefitKind] = useState<"products" | "voucher">(campaign?.benefit?.kind ?? "products");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const originalBenefit = campaign?.benefit;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const month = String(form.get("month"));
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Selecciona un mes válido");
      if (kind === "barter" && campaign?.payments.length) throw new Error("Esta campaña ya tiene pagos. Elige Mixta para conservarlos.");
      const money: ReturnType<typeof campaignMoneyFromForm> & { payments?: Campaign["payments"] } = kind === "barter"
        ? { value: 0, currency: "COP" as const, usdValueCents: undefined, exchangeRate: undefined, exchangeRateDate: undefined }
        : campaign ? await prepareCampaignMoney(form, data.exchangeRate, campaign) : campaignMoneyFromForm(form, data.exchangeRate);
      if (kind !== "barter" && money.value <= 0) throw new Error("El pago acordado debe ser mayor que cero");
      let benefit: CampaignBenefit | undefined;
      if (kind !== "paid") {
        const description = String(form.get("benefitDescription")).trim();
        const received = form.get("benefitReceived") === "on";
        benefit = benefitKind === "products"
          ? { kind: "products", description, quantity: Number(form.get("productQuantity")), received }
          : { kind: "voucher", description, amount: Number(form.get("voucherAmount")), usedAmount: Number(form.get("voucherUsed") ?? 0), expiresOn: String(form.get("voucherExpiry") || "") || undefined, received };
      }
      const contentDueDate = String(form.get("contentDueDate") || "");
      if (contentDueDate && !isDateOnly(contentDueDate)) throw new Error("Revisa la fecha de entrega del contenido");
      const saved: Campaign = {
        ...campaign,
        id: campaign?.id ?? createId(), name: String(form.get("name")).trim(), brand: String(form.get("brand")).trim(), network: String(form.get("network")),
        collaborationType: kind === "paid" ? "Paga" : kind === "barter" ? "Canje" : "Paga y canje",
        ...money, month, benefit,
        // Canjes use the month anchor for compatibility; it is never shown as a payment deadline.
        dueDate: kind === "barter" ? campaign?.dueDate ?? `${month}-01` : String(form.get("dueDate")),
        contentDueDate: contentDueDate || undefined,
        status: String(form.get("status")) as Campaign["status"],
        payments: money.payments ?? campaign?.payments ?? [],
      };
      if (!saved.name || !saved.brand || (kind !== "barter" && !isDateOnly(saved.dueDate))) throw new Error("Completa campaña, marca y fecha de pago");
      if (!validateCampaignBenefit(saved)) throw new Error("Revisa los datos del beneficio: cantidad, valor del bono, saldo usado y recepción");
      if (campaign) updateCampaign(saved.id, saved); else addCampaign(saved);
      onSaved(saved);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No fue posible guardar la campaña");
    } finally { setSaving(false); }
  }

  return <form id={campaign ? undefined : "nuevo-registro"} onSubmit={submit} className={`${embedded ? "mb-3" : "card mb-5"} grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3`} aria-label={campaign ? "Editar colaboración" : "Nueva colaboración"}>
    <label><span className="label">Campaña</span><input className="field" name="name" defaultValue={campaign?.name} required /></label>
    <label><span className="label">Marca</span><input className="field" name="brand" defaultValue={campaign?.brand} required /></label>
    <label><span className="label">Tipo de colaboración</span><select className="field" name="collaborationType" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="paid">Paga</option><option value="barter" disabled={Boolean(campaign?.payments.length)}>Canje</option><option value="mixed">Mixta: pago y canje</option></select></label>
    <label><span className="label">Red social</span><select className="field" name="network" defaultValue={campaign?.network ?? "TikTok"}>{[...new Set(["TikTok", "Instagram", "TikTok y Instagram", "YouTube", "Uso de la marca", "Otra", ...(campaign?.network ? [campaign.network] : [])])].map((network) => <option key={network}>{network}</option>)}</select></label>
    <label><span className="label">Mes de la campaña</span><input className="field" name="month" type="month" defaultValue={campaign?.month ?? period} required /></label>
    <label><span className="label">Estado del contenido</span><select className="field" name="status" defaultValue={campaign?.status ?? "Pendiente"}><option value="Pendiente">Pendiente</option><option value="En producción">En producción</option><option value="Realizado">Publicado</option></select></label>
    <label><span className="label">Fecha de entrega del contenido (opcional)</span><input className="field" name="contentDueDate" type="date" defaultValue={campaign?.contentDueDate ?? ""} /><span className="mt-1 block text-[10px] text-slate-500">Puedes dejarla vacía y agregarla después.</span></label>
    {kind !== "barter" && <><CampaignCurrencyFields key={campaign?.id ?? "new-money"} campaign={campaign} /><label><span className="label">Fecha esperada de pago</span><input className="field" name="dueDate" type="date" defaultValue={campaign?.dueDate ?? `${period}-28`} required /></label></>}
    {kind !== "paid" && <fieldset className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-3 sm:col-span-2 lg:col-span-3">
      <legend className="px-1 text-sm font-semibold text-violet-950">{kind === "mixed" ? "Beneficio adicional al pago" : "Qué recibes por el canje"}</legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label><span className="label">Tipo de canje</span><select className="field" name="benefitKind" value={benefitKind} onChange={(event) => setBenefitKind(event.target.value as typeof benefitKind)}><option value="products">Productos</option><option value="voucher">Bono o saldo</option></select></label>
        <label className="sm:col-span-2"><span className="label">{benefitKind === "products" ? "Qué productos te entregan" : "Para qué sirve el bono"}</span><input className="field" name="benefitDescription" defaultValue={originalBenefit?.description} placeholder={benefitKind === "products" ? "Kit de maquillaje" : "Mercado en Rappi"} required /></label>
        {benefitKind === "products" ? <label><span className="label">Cantidad de productos</span><input className="field" name="productQuantity" type="number" min="1" step="1" defaultValue={originalBenefit?.kind === "products" ? originalBenefit.quantity : 1} required /></label> : <>
          <label><span className="label">Valor del bono (COP)</span><input className="field" name="voucherAmount" type="number" min="1" step="1" defaultValue={originalBenefit?.kind === "voucher" ? originalBenefit.amount : undefined} required /></label>
          <label><span className="label">Ya utilizado (COP)</span><input className="field" name="voucherUsed" type="number" min="0" step="1" defaultValue={originalBenefit?.kind === "voucher" ? originalBenefit.usedAmount : 0} required /></label>
          <label><span className="label">Vencimiento del bono (opcional)</span><input className="field" name="voucherExpiry" type="date" defaultValue={originalBenefit?.kind === "voucher" ? originalBenefit.expiresOn : ""} /></label>
        </>}
        <label className="flex items-center gap-2 self-end py-2 text-sm"><input name="benefitReceived" type="checkbox" defaultChecked={originalBenefit?.received ?? false} />Ya recibí este beneficio</label>
      </div>
      <p className="text-[11px] text-violet-800">{benefitKind === "products" ? "Los productos se registran por descripción y cantidad, sin precio ni valor monetario." : "El bono se controla por su saldo; no se suma al efectivo ni a las cuentas por cobrar."}</p>
    </fieldset>}
    {error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2 lg:col-span-3">{error}</p>}
    <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3"><button className="button disabled:opacity-50" type="submit" disabled={saving}>{saving ? "Guardando…" : campaign ? "Guardar cambios" : "Guardar colaboración"}</button><button type="button" className="button-secondary" onClick={onCancel} disabled={saving}>Cancelar</button></div>
  </form>;
}
