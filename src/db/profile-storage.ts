import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

let initialization: Promise<unknown> | undefined;
// This additive bootstrap supports deployments where the profile migration is still pending.
// IF NOT EXISTS keeps existing profile data intact and also permits the normal migration later.
export function ensureProfileStorage() {
  if (!initialization) {
    initialization = Promise.resolve(db.run(sql`CREATE TABLE IF NOT EXISTS user_profile (
      id text PRIMARY KEY NOT NULL,
      value text NOT NULL
    )`)).catch((error) => { initialization = undefined; throw error; });
  }
  return initialization;
}
