import type { UserProfile } from "@/lib/profile";
import type { CampaignBenefit, RecurringSettings } from "@/lib/finance";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  network: text("network").notNull(),
  incomeType: text("income_type", { enum: ["personal"] }),
  recurringId: text("recurring_id"),
  manualOverride: integer("manual_override", { mode: "boolean" }).notNull().default(false),
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
  recurringId: text("recurring_id"),
  manualOverride: integer("manual_override", { mode: "boolean" }).notNull().default(false),
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

export const financeSettings = sqliteTable("finance_settings", {
  id: text("id").primaryKey(),
  value: text("value", { mode: "json" }).$type<RecurringSettings>().notNull(),
});

export const userProfile = sqliteTable("user_profile", {
  id: text("id").primaryKey(),
  value: text("value", { mode: "json" }).$type<UserProfile>().notNull(),
});

export const personalTasks = sqliteTable("personal_tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes").notNull().default(""),
  referenceUrl: text("reference_url").notNull().default(""),
  category: text("category", { enum: ["", "Redes", "Casa", "Personal", "Otro"] }).notNull().default(""),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
