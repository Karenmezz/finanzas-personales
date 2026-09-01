import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import { createClient } from "@libsql/client";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error("Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en .env.local");
}

const source = JSON.parse(
  await readFile(new URL("../src/lib/imported-data.json", import.meta.url), "utf8"),
);
const client = createClient({ url, authToken });

const campaignStatements = source.campaigns.map((campaign) => ({
  sql: `INSERT INTO campaigns
    (id, name, brand, network, collaboration_type, month, value, due_date, content_due_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, brand=excluded.brand, network=excluded.network,
      collaboration_type=excluded.collaboration_type, month=excluded.month,
      value=excluded.value, due_date=excluded.due_date,
      content_due_date=excluded.content_due_date, status=excluded.status`,
  args: [
    campaign.id,
    campaign.name,
    campaign.brand,
    campaign.network,
    campaign.collaborationType ?? null,
    campaign.month ?? campaign.dueDate.slice(0, 7),
    campaign.value,
    campaign.dueDate,
    campaign.contentDueDate || null,
    campaign.status,
  ],
}));

const paymentStatements = source.campaigns.flatMap((campaign) =>
  (campaign.payments ?? []).map((payment) => ({
    sql: `INSERT INTO payments (id, campaign_id, amount, date)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        campaign_id=excluded.campaign_id, amount=excluded.amount, date=excluded.date`,
    args: [payment.id, campaign.id, payment.amount, payment.date],
  })),
);

const billStatements = source.bills.map((bill) => ({
  sql: `INSERT INTO bills (id, name, category, amount, due_date, paid, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, category=excluded.category, amount=excluded.amount,
      due_date=excluded.due_date, paid=excluded.paid, note=excluded.note`,
  args: [bill.id, bill.name, bill.category, bill.amount, bill.dueDate, bill.paid ? 1 : 0, bill.note ?? null],
}));

const expenseStatements = source.expenses.map((expense) => ({
  sql: `INSERT INTO expenses (id, concept, category, amount, date, status)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      concept=excluded.concept, category=excluded.category, amount=excluded.amount,
      date=excluded.date, status=excluded.status`,
  args: [expense.id, expense.concept, expense.category, expense.amount, expense.date, expense.status],
}));

const colorStatements = Object.entries(source.monthColors ?? {}).map(([month, color]) => ({
  sql: `INSERT INTO month_colors (month, color) VALUES (?, ?)
    ON CONFLICT(month) DO UPDATE SET color=excluded.color`,
  args: [month, color],
}));

const statements = [
  ...campaignStatements,
  ...paymentStatements,
  ...billStatements,
  ...expenseStatements,
  ...colorStatements,
];

if (statements.length > 0) await client.batch(statements, "write");

const counts = {};
for (const table of ["campaigns", "payments", "bills", "expenses", "month_colors"]) {
  const result = await client.execute(`SELECT COUNT(*) AS total FROM ${table}`);
  counts[table] = Number(result.rows[0].total);
}

console.log("Importación terminada:", counts);
client.close();
