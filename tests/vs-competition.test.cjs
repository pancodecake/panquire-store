const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const context = { module: { exports: {} }, window: { location: { origin: 'https://panquire.com' } }, URL, Intl };
runInNewContext(readFileSync(join(__dirname, '../assets/vs-competition.js'), 'utf8'), context);
const { specs, radarMetrics, normalize, difference, winner, score, number } = context.module.exports;

// Source-of-truth fixtures, never shipped to the storefront.
const left = normalize({ name: 'T-01', price: { amount: 2000, currency: 'USD' }, fields: {
  peak_motor_power: 8000, maximum_speed: 80, battery_energy: 1.87, battery_capacity: 31.2,
  maximum_load: 150, ready_to_ride_weight: 55, maximum_climbing_ability: 30,
  maximum_climbing_ability_display: '<30°', claimed_range: 80, claimed_range_display: '80 km'
} });
const right = normalize({ name: 'Light Bee X', fields: {
  peak_motor_power: 6000, maximum_speed: 75, battery_energy: 2.40, battery_capacity: 40,
  maximum_load: 100, ready_to_ride_weight: 56, maximum_climbing_ability: 45,
  claimed_range: 75, claimed_range_display: 'Up to 75 km @ 40 km/h'
} });

test('all six supplied numerical differences are exact', () => {
  const expected = { peak_motor_power: '+2,000 W', maximum_speed: '+5 km/h', battery_energy: '-0.53 kWh', battery_capacity: '-8.8 Ah', maximum_load: '+50 kg', ready_to_ride_weight: '-1 kg' };
  for (const [key, value] of Object.entries(expected)) assert.equal(difference(specs.find((s) => s.key === key), left, right), value);
});
test('source claims remain separate from radar scores', () => {
  assert.equal(left.specs.maximum_climbing_ability.display, '<30°');
  assert.equal(left.specs.maximum_climbing_ability.value, null);
  assert.equal(left.specs.maximum_climbing_ability.plotValue, 30);
  assert.equal(score(radarMetrics.find((m) => m.area === 'climbing'), left), 60);
  assert.equal(difference(specs.find((s) => s.area === 'climbing'), left, right), null);
  assert.equal(right.specs.claimed_range.display, 'Up to 75 km @ 40 km/h');
  assert.equal(difference(specs.find((s) => s.key === 'claimed_range'), left, right), null);
  assert.equal(right.specs.battery_energy.display, '2.40 kWh');
});
test('absent, blank, invalid and zero values are distinguished', () => {
  for (const value of [null, undefined, '', ' ', 'NaN', Infinity, false]) assert.equal(number(value), null);
  assert.equal(number(0), 0);
  const empty = normalize({ fields: {}, price: {} });
  assert.equal(empty.price.amount, null);
  for (const s of Object.values(empty.specs)) assert.equal(s.display, '—');
  for (const m of radarMetrics) assert.equal(score(m, empty), null);
});
test('fixed radar bounds clamp values without mutating source data', () => {
  const record = normalize({ fields: { peak_motor_power: 20000 } });
  assert.equal(score(radarMetrics[0], record), 100);
  assert.equal(record.specs.peak_motor_power.value, 20000);
  assert.equal(record.specs.peak_motor_power.display, '20,000 W');
});
test('compound fields preserve units and have no arbitrary numerical margin', () => {
  const record = normalize({ fields: { front_wheel_size: 19, rear_wheel_size: 17, charger_voltage: 60, charger_amperage: 6 } });
  assert.equal(record.specs.wheels.display, '19" / 17"');
  assert.equal(record.specs.charger.display, '60 V / 6 A');
  assert.equal(difference(specs.find((s) => s.key === 'wheels'), record, record), null);
});
test('winner rules distinguish higher, lower, neutral and qualified claims', () => {
  assert.equal(winner(specs.find((s) => s.key === 'peak_motor_power'), left, right), 'panquire');
  assert.equal(winner(specs.find((s) => s.key === 'ready_to_ride_weight'), left, right), 'panquire');
  assert.equal(winner(specs.find((s) => s.key === 'battery_voltage'), left, right), null);
  assert.equal(winner(specs.find((s) => s.key === 'maximum_climbing_ability'), left, right), null);
});
test('extended data remains normalized without replacing source display text', () => {
  const record = normalize({ fields: {}, details: { specs: { motorType: { label: 'Motor Type', group: 'Performance', display: 'PMSM', comparisonMode: 'none' } } } });
  assert.equal(record.specs.motorType.display, 'PMSM');
  assert.equal(record.specs.motorType.value, null);
});
test('unsafe source URLs are rejected', () => {
  assert.equal(normalize({ fields: {}, sourceUrl: 'javascript:alert(1)' }).sourceUrl, null);
  assert.equal(normalize({ fields: {}, sourceUrl: 'https://panquire.com' }).sourceUrl, 'https://panquire.com/');
});
