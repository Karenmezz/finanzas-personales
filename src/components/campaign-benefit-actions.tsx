"use client";

import { useState, type FormEvent } from "react";
import type { Campaign } from "@/lib/finance";
import { applyVoucherUsage } from "@/lib/finance-insights";
import { useFinance } from "@/components/finance-provider";

export function CampaignBenefitActions({ campaign }: { campaign: Campaign }) {
  const { updateCampaign } = useFinance();
  const [error, setError] = useState<string | null>(null);
  const benefit = campaign.benefit;
  if (!benefit) return null;
  function recordUse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      updateCampaign(campaign.id, { benefit: applyVoucherUsage(campaign, Number(new FormData(event.currentTarget).get("usedAmount"))) });
      setError(null);
      event.currentTarget.reset();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Revisa el uso del bono"); }
  }
  return <div className="mt-3">
    {(benefit.kind !== "voucher" || benefit.usedAmount === 0) && <button type="button" className="button-secondary" onClick={() => updateCampaign(campaign.id, { benefit: { ...benefit, received: !benefit.received } })}>{benefit.received ? "Marcar por recibir" : "Marcar recibido"}</button>}
    {benefit.kind === "voucher" && benefit.received && benefit.usedAmount < benefit.amount && <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-violet-800">Registrar uso del bono</summary><form onSubmit={recordUse} className="mt-2 flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1"><span className="label">Valor utilizado (COP)</span><input className="field" name="usedAmount" type="number" min="1" step="1" max={benefit.amount - benefit.usedAmount} required /></label><button className="button" type="submit">Guardar uso</button></form>{error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}</details>}
  </div>;
}
