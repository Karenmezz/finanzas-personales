import test from 'node:test';
import assert from 'node:assert/strict';
import { brandRanking, previousPendingCampaigns, selectFinanceArea, campaignsByBrand, dashboardSummary } from '../src/lib/finance-insights.ts';

const campaign = (overrides = {}) => ({ id: 'campaign', name: 'Video', brand: 'Marca', network: 'Instagram', value: 100, month: '2026-11', dueDate: '2026-11-30', status: 'Realizado', payments: [], ...overrides });
const empty = () => ({ campaigns: [], bills: [], expenses: [], monthColors: {} });

test('groups brand variants, ranks received payments, and excludes salary and barter', () => {
  const rows = brandRanking([
    campaign({ brand: ' Marca ', value: 100, payments: [{ amount: 50 }] }),
    campaign({ brand: 'marca', value: 200, payments: [{ amount: 100 }] }),
    campaign({ brand: 'Otra', value: 1000, payments: [{ amount: 10 }] }),
    campaign({ incomeType: 'personal', brand: 'Empresa de ejemplo', value: 999999, payments: [{ amount: 999999 }] }),
    campaign({ brand: 'Canje', value: 0 }),
  ]);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { brand: 'Marca', count: 2, agreed: 300, received: 150 });
  assert.equal(rows[1].brand, 'Otra');
});

test('pending carryover includes only older months, including previous years', () => {
  const records = [
    campaign({ id: 'previous-year', month: '2025-12' }),
    campaign({ id: 'previous-month', month: '2026-10' }),
    campaign({ id: 'selected', month: '2026-11' }),
    campaign({ id: 'future', month: '2026-12' }),
    campaign({ id: 'paid', month: '2026-09', payments: [{ amount: 100 }] }),
    campaign({ id: 'legacy', month: undefined, dueDate: '2026-01-05' }),
  ];
  assert.deepEqual(previousPendingCampaigns(records, '2026-11').map((item) => item.campaign.id).sort(), ['legacy', 'previous-month', 'previous-year']);
  assert.deepEqual(previousPendingCampaigns(records, '2026-01').map((item) => item.campaign.id), ['previous-year']);
});

test('keeps all extra expenses in finances and separates salary from content without changing data', () => {
  const data = empty();
  data.campaigns = [campaign({ id: 'salary', incomeType: 'personal', brand: 'Empresa de ejemplo', value: 3000000 }), campaign({ id: 'work' })];
  data.bills = [{ id: 'rent', name: 'Arriendo', category: 'Vivienda', amount: 800000, dueDate: '2026-11-10', paid: false }];
  data.expenses = [
    { id: 'food', concept: 'Mercado', category: 'Hogar', amount: 100, date: '2026-11-01', status: 'Pendiente' },
    { id: 'production', concept: 'Grabación', category: ' Producción ', amount: 200, date: '2026-11-01', status: 'Comprado' },
    { id: 'work-expense', concept: 'Edición', category: 'Trabajo', amount: 300, date: '2026-11-01', status: 'Pendiente' },
  ];
  const original = structuredClone(data);
  const home = selectFinanceArea(data, 'finances');
  const content = selectFinanceArea(data, 'content');
  assert.deepEqual(home.campaigns.map((item) => item.id), ['salary']);
  assert.deepEqual(content.campaigns.map((item) => item.id), ['work']);
  assert.equal(home.bills.length, 1);
  assert.equal(content.bills.length, 0);
  assert.deepEqual(home.expenses.map((item) => item.id), ['food', 'production', 'work-expense']);
  assert.deepEqual(content.expenses, []);
  assert.deepEqual(data, original);
  assert.equal(home.expenses.length + content.expenses.length, data.expenses.length);
});

test('brand selector groups name variants across months, includes barter, and excludes salary', () => {
  const records = [
    campaign({ id: 'a', brand: 'Ácme', month: '2026-01' }),
    campaign({ id: 'b', brand: ' acme ', month: '2026-11' }),
    campaign({ id: 'c', brand: 'Canje', value: 0 }),
    campaign({ id: 'salary', incomeType: 'personal', brand: 'Empresa de ejemplo' }),
    campaign({ id: 'no-brand', brand: '  ' }),
  ];
  const brands = campaignsByBrand(records);
  assert.equal(brands.length, 3);
  assert.deepEqual(brands.find((brand) => brand.id === 'brand:acme').campaigns.map((item) => item.id), ['a', 'b']);
  assert.equal(brands.find((brand) => brand.name === 'Canje').campaigns[0].value, 0);
  assert.equal(brands.find((brand) => brand.id === 'brand:').name, 'Sin marca');
  assert.ok(brands.every((brand) => !brand.campaigns.some((item) => item.id === 'salary')));
});

test('dashboard combines salary, brand income, bills and extra expenses for the selected year', () => {
  const data = empty();
  data.campaigns = [campaign({ id: 'salary', incomeType: 'personal', brand: 'Empresa de ejemplo', value: 3000000, payments: [{ amount: 3000000 }] }), campaign({ id: 'brand', value: 1000000, payments: [{ amount: 400000 }] }), campaign({ id: 'other-year', month: '2025-11', value: 999999 })];
  data.bills = [{ id: 'paid', dueDate: '2026-11-01', amount: 500000, paid: true }, { id: 'unpaid', dueDate: '2026-11-01', amount: 200000, paid: false }];
  data.expenses = [{ date: '2026-11-01', amount: 100000, status: 'Comprado' }, { date: '2026-11-01', amount: 50000, status: 'Pendiente' }];
  const summary = dashboardSummary(data, 2026);
  assert.equal(summary.generated, 4000000);
  assert.equal(summary.received, 3400000);
  assert.equal(summary.pending, 600000);
  assert.equal(summary.expenses, 600000);
  assert.equal(summary.pendingExpenses, 250000);
  assert.equal(summary.balance, 2800000);
  assert.equal(summary.salaries.length, 1);
  assert.equal(summary.brandCampaigns.length, 1);
});
