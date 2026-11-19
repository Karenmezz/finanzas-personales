import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// On Vercel a missing URL must fail loudly instead of falling back to a throwaway local file.
if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) throw new Error("Falta TURSO_DATABASE_URL en las variables de entorno de Vercel");

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
