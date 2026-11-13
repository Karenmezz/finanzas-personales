"use client";
import { useFinance } from "@/components/finance-provider";
import { trmCurrency, scheduledTrmDate } from "@/lib/usd";

export function ExchangeRateNotice() {
  const { data, exchangeRateError, refreshExchangeRate } = useFinance();
  if (!data.campaigns.some((campaign) => campaign.currency === "USD")) return null;
  const quote = data.exchangeRate;
  return <aside className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-950" aria-label="Tasa de cambio USD a COP">
    <div><p className="font-semibold">{quote ? `TRM del ${quote.date}: ${trmCurrency.format(quote.value)} COP por USD` : "Consultando TRM oficial USD/COP"}</p><p className="mt-1">Actualización diaria a las 4:00 a. m. de Colombia. Los pagos registrados conservan su tasa.</p>{(exchangeRateError || (!quote || quote.date < scheduledTrmDate())) && <p className="mt-1 text-amber-800">{exchangeRateError ?? "La tasa no está actualizada; se conserva la última valoración."}</p>}</div>
    <button className="rounded-lg border border-indigo-200 px-2 py-1 font-medium" type="button" onClick={() => { void refreshExchangeRate(); }}>Actualizar TRM</button>
  </aside>;
}
