import "server-only";
import { eq,sql } from "drizzle-orm";
import { db } from "@/db";
import { dataAdjustments,financeSettings } from "@/db/schema";
import { backdateCurrentIncome } from "@/lib/recurring";
let ready:Promise<unknown>|undefined;
let adjustment:Promise<unknown>|undefined;
// One-time user-requested configuration correction. New rules and later edits remain configurable.
export async function applyIncomeStartAdjustment() {
  if(!ready)ready=Promise.resolve(db.run(sql`CREATE TABLE IF NOT EXISTS data_adjustments (id text PRIMARY KEY NOT NULL)`)).catch(error=>{ready=undefined;throw error;});
  await ready;
  if(!adjustment)adjustment=db.transaction(async tx=>{
    const [setting]=await tx.select().from(financeSettings).where(eq(financeSettings.id,"recurring"));
    if(!setting)return undefined;
    const id="fixed-income-start-october-2026";
    const [applied]=await tx.select().from(dataAdjustments).where(eq(dataAdjustments.id,id));
    if(applied)return setting.value;
    const adjusted=backdateCurrentIncome(setting.value,"2026-10-01","2026-11-13");
    await tx.update(financeSettings).set({value:adjusted}).where(eq(financeSettings.id,"recurring"));
    await tx.insert(dataAdjustments).values({id});
    return adjusted;
  }).catch(error=>{adjustment=undefined;throw error;});
  await adjustment;
  const [setting]=await db.select().from(financeSettings).where(eq(financeSettings.id,"recurring"));
  return setting?.value;
}
