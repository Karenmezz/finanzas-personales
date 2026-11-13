import test from 'node:test';
import assert from 'node:assert/strict';
import { brandRanking, withMonthlyDefaults, previousPendingCampaigns } from '../src/lib/finance-insights.ts';

const campaign = (overrides = {}) => ({ id: 'campaign', name: 'Video', brand: 'Marca', network: 'Instagram', value: 100, month: '2026-11', dueDate: '2026-11-30', status: 'Realizado', payments: [], ...overrides });
const empty = () => ({ campaigns: [], bills: [], expenses: [], monthColors: {} });

test('adds transport to every month and is idempotent', () => {
  const data = withMonthlyDefaults(empty(), [2026, 2027]);
  assert.equal(data.bills.length, 24);
  assert.ok(data.bills.every((bill) => bill.amount === 420000 && !bill.paid));
  assert.deepEqual(withMonthlyDefaults(data, [2026, 2027]), data);
  assert.equal(data.campaigns.length, 0, 'does not invent a salary');
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
  assert.equal(result.campaigns.length, 24);
  assert.deepEqual(result.campaigns[1], data.campaigns[1]);
  const february = result.campaigns.find((item) => item.month === '2027-02');
  assert.equal(february.value, 2500000);
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
