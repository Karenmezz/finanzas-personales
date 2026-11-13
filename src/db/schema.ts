import type { CampaignBenefit } from "@/lib/finance";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  network: text("network").notNull(),
  collaborationType: text("collaboration_type"),
  benefit: text("benefit", { mode: "json" }).$type<CampaignBenefit>(),
  month: text("month").notNull(),
  value: integer("value").notNull(),
  currency: text("currency", { enum: ["COP", "USD"] }).notNull().default("COP"),
  usdValueCents: integer("usd_value_cents"),
  exchangeRate: real("exchange_rate"),
  exchangeRateDate: text("exchange_rate_date"),
  dueDate: text("due_date").notNull(),
  contentDueDate: text("content_due_date"),
  status: text("status", { enum: ["Pendiente", "En producción", "Realizado"] }).notNull(),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  date: text("date").notNull(),
  usdAmountCents: integer("usd_amount_cents"),
  exchangeRate: real("exchange_rate"),
  exchangeRateDate: text("exchange_rate_date"),
});

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  concept: text("concept").notNull(),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  date: text("date").notNull(),
  status: text("status", { enum: ["Pendiente", "Comprado"] }).notNull(),
});

export const bills = sqliteTable("bills", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  dueDate: text("due_date").notNull(),
  paid: integer("paid", { mode: "boolean" }).notNull().default(false),
  note: text("note"),
});

export const monthColors = sqliteTable("month_colors", {
  month: text("month").primaryKey(),
  color: text("color").notNull(),
});
