import "./envConfig";
import { defineConfig } from "drizzle-kit";

// On Vercel a missing URL must fail loudly instead of falling back to a throwaway local file.
if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) throw new Error("Falta TURSO_DATABASE_URL en las variables de entorno de Vercel");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  strict: true,
  verbose: true,
});
