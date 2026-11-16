import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateRates } from '../scripts/refresh-exchange-rates.mjs';

const now = new Date('2026-11-16T10:00:00Z');
const quote = (code, rate = 2, date = '2026-11-16') => ({ base: 'USD', quote: code, rate, date });
const rows = ['EUR', 'GBP', 'JPY', 'CAD'].map((code) => quote(code));
for (let index = 0; index < 150; index++) {
  rows.push(quote('Q' + String.fromCharCode(65 + Math.floor(index / 26), 65 + index % 26)));
}

test('validates the complete response and records per-currency source dates', () => {
  const snapshot = validateRates([...rows, quote('USD', 1), quote('USDC')], now);
  assert.equal(snapshot.rates.USD, 1);
  assert.equal(snapshot.rates.EUR, 2);
  assert.equal(snapshot.rateDates.EUR, '2026-11-16');
  assert.equal(snapshot.rates.USDC, undefined);
  assert.equal(snapshot.refreshedAt, now.toISOString());
});

test('rejects missing, malformed, duplicated and stale data before a write', () => {
  assert.throws(() => validateRates(rows.slice(0, 4), now), /incomplete/);
  assert.throws(() => validateRates([...rows, quote('EUR')], now), /invalid/);
  assert.throws(() => validateRates([...rows, quote('ZZZ', 0)], now), /invalid/);
  assert.throws(() => validateRates([...rows, quote('ZZZ', 1, '2026-11-31')], now), /invalid/);
  assert.throws(() => validateRates([quote('EUR', 2, '2026-11-01'), ...rows.slice(1)], now), /stale/);
});

test('preserves the newer individual quote during a successful refresh', () => {
  const previous = validateRates(rows, now);
  const snapshot = validateRates([quote('EUR', 1, '2026-11-15'), ...rows.slice(1)], now, previous);
  assert.equal(snapshot.rates.EUR, 2);
  assert.equal(snapshot.rateDates.EUR, '2026-11-16');
});
