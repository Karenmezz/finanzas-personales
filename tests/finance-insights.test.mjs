import test from 'node:test';
import assert from 'node:assert/strict';
import { brandRanking, withMonthlyDefaults, previousPendingCampaigns, selectFinanceArea, campaignsByBrand, dashboardSummary } from '../src/lib/finance-insights.ts';

const campaign = (overrides = {}) => ({ id: 'campaign', name: 'Video', brand: 'Marca', network: 'Instagram', value: 100, month: '2026-11', dueDate: '2026-11-30', status: 'Realizado', payments: [], ...overrides });
const empty = () => ({ campaigns: [], bills: [], expenses: [], monthColors: {} });

test('adds transport to every month and is idempotent', () => {
  const data = withMonthlyDefaults(empty(), [2026, 2027]);
  assert.equal(data.bills.length, 24);
  assert.ok(data.bills.every((bill) => bill.amount === 420000 && !bill.paid));
  assert.deepEqual(withMonthlyDefaults(data, [2026, 2027]), data);
  assert.equal(data.campaigns.length, 15);
  assert.ok(data.campaigns.every((item) => item.value === 3100000));
});

test('keeps saved transport values and paid state, including existing expenses', () => {
  const data = empty();
  data.bills.push({ id: 'old', name: ' Transporte ', category: 'Otro', amount: 300000, paid: true, dueDate: '2026-01-05' });
  data.expenses.push({ id: 'expense', concept: 'transporte', category: 'Otro', amount: 420000, status: 'Comprado', date: '2026-02-02' });
  const result = withMonthlyDefaults(data, [2026]);
  assert.deepEqual(result.bills[0], data.bills[0]);
  assert.equal(result.bills.length, 11);
  assert.equal(result.bills.filter((bill) => bill.dueDate.startsWith('2026-02')).length, 0);
});

test('copies latest saved salary without carrying over payments or content dates', () => {
  const data = empty();
  data.campaigns = [campaign({ id: 'older', brand: 'Fundacion de la Mujer', value: 2000000, month: '2026-01' }), campaign({ id: 'salary', name: 'Salario', brand: 'Fundación de la Mujer', value: 2500000, month: '2026-11', payments: [{ id: 'paid', amount: 2500000, date: '2026-11-30' }], contentDueDate: '2026-11-20' })];
  const result = withMonthlyDefaults(data, [2026, 2027]);
  assert.equal(result.campaigns.length, 15);
  assert.deepEqual(result.campaigns.find((item) => item.id === "salary"), data.campaigns[1]);
  const february = result.campaigns.find((item) => item.month === '2027-02');
  assert.equal(february.value, 3100000);
  assert.equal(february.dueDate, '2027-02-28');
  assert.equal(february.contentDueDate, undefined);
  assert.deepEqual(february.payments, []);
  assert.deepEqual(withMonthlyDefaults(result, [2026, 2027]), result);
  assert.equal(data.campaigns.length, 2, 'does not mutate source records');
});

test('groups brand variants, ranks received payments, and excludes salary and barter', () => {
  const rows = brandRanking([
    campaign({ brand: ' Marca ', value: 100, payments: [{ amount: 50 }] }),
    campaign({ brand: 'marca', value: 200, payments: [{ amount: 100 }] }),
    campaign({ brand: 'Otra', value: 1000, payments: [{ amount: 10 }] }),
    campaign({ brand: 'Fundación de la Mujer', value: 999999, payments: [{ amount: 999999 }] }),
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

test('fixed salary corrects unpaid records and preserves full and partial payment history', () => {
  const data = empty();
  data.campaigns = [
    campaign({ id: 'unpaid', brand: 'Fundación de la Mujer', value: 2000000 }),
    campaign({ id: 'partial', brand: 'Fundación de la Mujer', month: '2026-10', value: 2000000, payments: [{ id: 'p', amount: 1000000, date: '2026-10-01' }] }),
    campaign({ id: 'paid', brand: 'Fundación de la Mujer', month: '2026-09', value: 2000000, payments: [{ id: 'p2', amount: 2000000, date: '2026-09-01' }] }),
  ];
  const result = withMonthlyDefaults(data, [2026]);
  assert.equal(result.campaigns.find((item) => item.id === 'unpaid').value, 3100000);
  for (const id of ['partial', 'paid']) assert.deepEqual(result.campaigns.find((item) => item.id === id), data.campaigns.find((item) => item.id === id));
});

test('keeps all extra expenses in finances and separates salary from content without changing data', () => {
  const data = empty();
  data.campaigns = [campaign({ id: 'salary', brand: 'Fundación de la Mujer', value: 3100000 }), campaign({ id: 'work' })];
  data.bills = [{ id: 'rent', name: 'Arriendo', category: 'Vivienda', amount: 887000, dueDate: '2026-11-10', paid: false }];
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
    campaign({ id: 'salary', brand: 'Fundación de la Mujer' }),
    campaign({ id: 'no-brand', brand: '  ' }),
  ];
  const brands = campaignsByBrand(records);
  assert.equal(brands.length, 3);
  assert.deepEqual(brands.find((brand) => brand.id === 'brand:acme').campaigns.map((item) => item.id), ['a', 'b']);
  assert.equal(brands.find((brand) => brand.name === 'Canje').campaigns[0].value, 0);
  assert.equal(brands.find((brand) => brand.id === 'brand:').name, 'Sin marca');
  assert.ok(brands.every((brand) => !brand.campaigns.some((item) => item.id === 'salary')));
});

test('salary starts in October 2026 and removes earlier unpaid defaults while preserving payments', () => {
  const data = empty();
  data.campaigns = [campaign({ id: 'recurring-salary-2026-09', brand: 'Fundación de la Mujer', month: '2026-09', value: 3100000 }), campaign({ id: 'recorded-payment', brand: 'Fundación de la Mujer', month: '2026-08', payments: [{ id: 'p', amount: 100, date: '2026-08-01' }] })];
  const result = withMonthlyDefaults(data, [2025, 2026, 2027]);
  assert.equal(result.campaigns.some((item) => item.id === 'recurring-salary-2026-09'), false);
  assert.deepEqual(result.campaigns.find((item) => item.id === 'recorded-payment'), data.campaigns[1]);
  assert.equal(result.campaigns.filter((item) => item.id.startsWith('recurring-salary-2026-')).length, 3);
  assert.equal(result.campaigns.some((item) => item.id.startsWith('recurring-salary-2025-')), false);
  assert.equal(result.campaigns.filter((item) => item.month.startsWith('2027-')).length, 12);
  assert.deepEqual(withMonthlyDefaults(result, [2025, 2026, 2027]), result);
  assert.equal(data.campaigns.length, 2);
});

test('dashboard combines salary, brand income, bills and extra expenses for the selected year', () => {
  const data = empty();
  data.campaigns = [campaign({ id: 'salary', brand: 'Fundación de la Mujer', value: 3100000, payments: [{ amount: 3100000 }] }), campaign({ id: 'brand', value: 1000000, payments: [{ amount: 400000 }] }), campaign({ id: 'other-year', month: '2025-11', value: 999999 })];
  data.bills = [{ id: 'paid', dueDate: '2026-11-01', amount: 500000, paid: true }, { id: 'unpaid', dueDate: '2026-11-01', amount: 200000, paid: false }];
  data.expenses = [{ date: '2026-11-01', amount: 100000, status: 'Comprado' }, { date: '2026-11-01', amount: 50000, status: 'Pendiente' }];
  const summary = dashboardSummary(data, 2026);
  assert.equal(summary.generated, 4100000);
  assert.equal(summary.received, 3500000);
  assert.equal(summary.pending, 600000);
  assert.equal(summary.expenses, 600000);
  assert.equal(summary.pendingExpenses, 250000);
  assert.equal(summary.balance, 2900000);
  assert.equal(summary.salaries.length, 1);
  assert.equal(summary.brandCampaigns.length, 1);
});
