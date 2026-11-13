import test from 'node:test';
import assert from 'node:assert/strict';
import { bogotaDate, isDailyTrmRefreshDue, nextTrmRefreshAt, scheduledTrmDate, isDateOnly, makeUsdPayment, pendingUsdCents, revalueCampaign, revalueFinanceData, usdCentsToCop, usdToCents, validateCampaignMoney } from '../src/lib/usd.ts';

const quote = (value = 4000, date = '2026-11-01') => ({ value, date, validFrom: date, validTo: date, source: 'Superintendencia Financiera de Colombia' });
const campaign = (changes = {}) => ({ id: 'usd-campaign', name: 'Video', brand: 'Marca', network: 'Instagram', month: '2026-11', dueDate: '2026-11-30', status: 'Realizado', currency: 'USD', usdValueCents: 50000, value: 2000000, exchangeRate: 4000, exchangeRateDate: '2026-11-01', payments: [], ...changes });

test('USD input uses exact cents, accepts Colombian decimals and rejects extra precision', () => {
  assert.equal(usdToCents('100.35'), 10035);
  assert.equal(usdToCents('100,35'), 10035);
  assert.equal(usdToCents('0.01'), 1);
  assert.equal(usdToCents('500'), 50000);
  for (const invalid of ['-1', '1.001', '1e5', 'NaN', 'Infinity', '', '1,000.00']) assert.throws(() => usdToCents(invalid));
  assert.equal(usdCentsToCop(10035, 3301.91), 331347);
  assert.throws(() => usdCentsToCop(100, 0));
  assert.throws(() => usdCentsToCop(Number.MAX_SAFE_INTEGER, 10000));
});

test('dates use Bogota time and reject nonexistent dates', () => {
  assert.equal(bogotaDate(new Date('2026-11-14T03:00:00Z')), '2026-11-13');
  assert.equal(isDateOnly('2026-02-30'), false);
  assert.equal(isDateOnly('2028-02-29'), true);
});

test('unpaid dollars follow the current quote, including a falling rate', () => {
  assert.equal(revalueCampaign(campaign(), quote(4200)).value, 2100000);
  assert.equal(revalueCampaign(campaign(), quote(3300)).value, 1650000);
  assert.equal(revalueCampaign(campaign(), quote(4200)).exchangeRateDate, '2026-11-01');
});

test('partial payments freeze their historical COP amount while remaining USD changes', () => {
  const original = campaign();
  const payment = makeUsdPayment(original, 10000, '2026-10-15', quote(3900, '2026-10-15'), 'p1');
  const partial = { ...original, payments: [payment] };
  const updated = revalueCampaign(partial, quote(4200));
  assert.equal(payment.amount, 390000);
  assert.equal(pendingUsdCents(updated), 40000);
  assert.equal(updated.value, 2070000);
  const later = revalueCampaign(updated, quote(4500, '2026-11-02'));
  assert.equal(later.value, 2190000);
  assert.deepEqual(later.payments, [payment]);
  assert.equal(later.payments[0].exchangeRate, 3900);
  assert.equal(original.payments.length, 0);
});

test('fully paid USD campaigns never change with new rates or no available quote', () => {
  const original = campaign();
  const payment = makeUsdPayment(original, 50000, '2026-10-15', quote(3900, '2026-10-15'), 'p1');
  const paid = { ...original, payments: [payment] };
  for (const rate of [quote(3000), quote(5000), undefined]) {
    const result = revalueCampaign(paid, rate);
    assert.equal(result.value, 1950000);
    assert.equal(pendingUsdCents(result), 0);
    assert.deepEqual(result.payments, [payment]);
  }
});

test('multiple partial payments and undo/duplicate keep dollar balances correct', () => {
  const first = makeUsdPayment(campaign(), 10000, '2026-10-15', quote(3900, '2026-10-15'), 'p1');
  const partial = campaign({ payments: [first] });
  const second = makeUsdPayment(partial, 20000, '2026-10-20', quote(4100, '2026-10-20'), 'p2');
  const result = revalueCampaign({ ...partial, payments: [first, second] }, quote(4500));
  assert.equal(result.value, 2110000);
  assert.equal(pendingUsdCents(result), 20000);
  assert.equal(revalueCampaign({ ...result, payments: [first] }, quote(4500)).value, 2190000);
  assert.equal(revalueCampaign({ ...result, id: 'duplicate', payments: [] }, quote(4500)).value, 2250000);
});

test('without a fresh quote, the last rate/date stay visible instead of inventing a rate', () => {
  const stored = campaign({ exchangeRate: 3300, exchangeRateDate: '2026-10-31', value: 1650000 });
  const result = revalueCampaign(stored);
  assert.equal(result.value, 1650000);
  assert.equal(result.exchangeRateDate, '2026-10-31');
});

test('COP campaigns and recorded COP payments are not converted or reinterpreted', () => {
  const cop = { id: 'cop', name: 'COP', value: 1000000, payments: [{ id: 'old', amount: 500000, date: '2026-10-01' }] };
  const result = revalueFinanceData({ campaigns: [cop, campaign()], bills: [], expenses: [], monthColors: {} }, quote(4500));
  assert.strictEqual(result.campaigns[0], cop);
  assert.equal(result.campaigns[1].value, 2250000);
  assert.equal(validateCampaignMoney(cop), true);
});

test('payment date must have a matching historical rate; weekend validity spans are accepted', () => {
  const saturday = { ...quote(3900, '2026-10-31'), validFrom: '2026-10-31', validTo: '2026-11-02' };
  assert.equal(makeUsdPayment(campaign(), 10000, '2026-10-31', saturday, 'p').amount, 390000);
  assert.throws(() => makeUsdPayment(campaign(), 10000, '2026-10-30', saturday, 'p'));
  assert.throws(() => makeUsdPayment(campaign(), 10000, '2026-10-31', { ...saturday, validTo: '2026-10-30' }, 'p'));
  const future = bogotaDate(new Date(Date.now() + 2 * 86400000));
  assert.throws(() => makeUsdPayment(campaign(), 10000, future, quote(4000, future), 'p'));
});

test('invalid or overpaid dollar records cannot be saved', () => {
  assert.equal(validateCampaignMoney(campaign()), true);
  assert.equal(validateCampaignMoney(campaign({ usdValueCents: undefined })), false);
  assert.equal(validateCampaignMoney(campaign({ payments: [null] })), false);
  assert.equal(validateCampaignMoney(campaign({ currency: 'EUR' })), false);
  assert.throws(() => makeUsdPayment(campaign(), 50001, '2026-10-01', quote(4000, '2026-10-01'), 'p'));
  assert.throws(() => makeUsdPayment(campaign(), 0, '2026-10-01', quote(4000, '2026-10-01'), 'p'));
  const payment = makeUsdPayment(campaign(), 10000, '2026-10-01', quote(3900, '2026-10-01'), 'p');
  assert.equal(validateCampaignMoney(campaign({ payments: [payment] })), true);
  assert.equal(validateCampaignMoney(campaign({ payments: [{ ...payment, amount: 400000 }] })), false);
  assert.equal(validateCampaignMoney(campaign({ usdValueCents: 9999, payments: [payment] })), false);
  assert.equal(validateCampaignMoney(campaign({ currency: 'COP', payments: [payment] })), false);
});

test('automatic TRM waits until 4 am Colombia and schedules that exact cutoff', () => {
  const before = new Date('2026-11-13T08:59:59Z');
  assert.equal(scheduledTrmDate(before), '2026-11-12');
  assert.equal(nextTrmRefreshAt(before).toISOString(), '2026-11-13T09:00:00.000Z');
  assert.equal(isDailyTrmRefreshDue(before), false);
  const atFour = new Date('2026-11-13T09:00:00Z');
  assert.equal(scheduledTrmDate(atFour), '2026-11-13');
  assert.equal(isDailyTrmRefreshDue(atFour, '2026-11-12'), true);
  assert.equal(nextTrmRefreshAt(atFour).toISOString(), '2026-11-14T09:00:00.000Z');
});

test('same-day quote or attempt prevents repeated automatic requests on reopening', () => {
  const afternoon = new Date('2026-11-13T20:00:00Z');
  assert.equal(isDailyTrmRefreshDue(afternoon, '2026-11-13'), false);
  assert.equal(isDailyTrmRefreshDue(afternoon, '2026-11-12', '2026-11-13'), false);
  assert.equal(isDailyTrmRefreshDue(afternoon, undefined, '2026-11-13'), false);
});

test('a missed 4 am refresh is due on the next open after the cutoff', () => {
  const morning = new Date('2026-11-14T13:30:00Z');
  assert.equal(isDailyTrmRefreshDue(morning, '2026-11-13', '2026-11-13'), true);
  assert.equal(nextTrmRefreshAt(morning).toISOString(), '2026-11-15T09:00:00.000Z');
});

test('daily scheduling respects Colombia at midnight, year changes and leap days', () => {
  assert.equal(scheduledTrmDate(new Date('2027-01-01T07:00:00Z')), '2026-12-31');
  assert.equal(nextTrmRefreshAt(new Date('2027-01-01T07:00:00Z')).toISOString(), '2027-01-01T09:00:00.000Z');
  assert.equal(scheduledTrmDate(new Date('2028-03-01T08:00:00Z')), '2028-02-29');
  assert.equal(scheduledTrmDate(new Date('2026-11-14T04:59:59Z')), '2026-11-13');
});

test('an automatic scheduled quote never rolls back a newer manually obtained quote', () => {
  const stored = campaign({ exchangeRate: 4500, exchangeRateDate: '2026-11-13', value: 2250000 });
  const result = revalueCampaign(stored, quote(4000, '2026-11-12'));
  assert.equal(result.value, 2250000);
  assert.equal(result.exchangeRateDate, '2026-11-13');
});
