const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const context = { module: { exports: {} }, window: { location: { origin: 'https://panquire.com' } }, URL, Intl };
runInNewContext(readFileSync(join(__dirname, '../assets/vs-competition.js'), 'utf8'), context);
const { specs, radarMetrics, normalize, difference, score, number, winner, sharedSpecs, showdownSpecs, applyProfile } = context.module.exports;

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
  assert.equal(score({ key: 'maximum_climbing_ability', min: 0, max: 50 }, left), 60);
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
test('unsafe source URLs are rejected', () => {
  assert.equal(normalize({ fields: {}, sourceUrl: 'javascript:alert(1)' }).sourceUrl, null);
  assert.equal(normalize({ fields: {}, sourceUrl: 'https://panquire.com' }).sourceUrl, 'https://panquire.com/');
});
test('winner rules leave ties, unknown rules and incompatible units neutral', () => {
  assert.equal(winner(specs.find(s => s.key === 'peak_motor_power'), left, right), 'panquire');
  assert.equal(winner(specs.find(s => s.key === 'battery_energy'), left, right), 'competitor');
  assert.equal(winner(specs.find(s => s.key === 'ready_to_ride_weight'), left, right), 'panquire');
  assert.equal(winner(specs[1], left, left), null);
  assert.equal(winner({ key: 'peak_motor_power' }, left, right), null);
  assert.equal(winner(specs.find(s => s.key === 'maximum_climbing_ability'), left, right), null);
});
test('intersection excludes absent, TBD and unaligned weight measurements', () => {
  const a = normalize({ fields: {}, details: { specs: { rearShock: { display: 'Hydraulic' }, bikeWeight: { display: '55 kg' } } } });
  const b = normalize({ fields: {}, details: { specs: { rearShock: { display: 'TBD' }, bikeWeight: { display: '63 kg' } } } });
  assert.equal(sharedSpecs([{ key: 'rearShock' }, { key: 'missing' }, { key: 'bikeWeight' }], a, b).length, 0);
});
test('MD memberships preserve order and Mantis source profiles remain distinct', () => {
  const fixture = require('./fixtures/comparison-shopify.json');
  assert.deepEqual(fixture.products[0].competitorHandles, ['pro-s-17', 'mantis-x', 'falcon-lite', 'x1-spark-l', 'light-bee-x']);
  assert.deepEqual(fixture.products[1].competitorHandles, ['ultra-bee', 'x7-spark', 'pro-ss-2-0', 'nova-5-pro', 'mantis-x', 'falcon-pro']);
  const mantis = normalize(fixture.competitors.find(c => c.handle === 'mantis-x'));
  assert.equal(applyProfile(mantis, 't-01').specs.suspension.display, '210 mm front / 70 mm rear');
  const t02Mantis = applyProfile(mantis, 't-02');
  assert.equal(t02Mantis.specs.suspension.display, '200 mm front / 70 mm rear');
  assert.equal(t02Mantis.specs.wheels.display, '—');
  assert.equal(t02Mantis.specs.battery_capacity.display, '—');
  assert.equal(t02Mantis.specs.chargingTime, undefined);
  for (const raw of fixture.products) {
    const product = normalize(raw);
    for (const handle of raw.competitorHandles) {
      const competitor = applyProfile(normalize(fixture.competitors.find(c => c.handle === handle)), raw.handle);
      const shared = sharedSpecs(specs, product, competitor);
      const showdown = showdownSpecs(shared);
      assert.ok(showdown.length >= 2);
      assert.ok(!showdown.some(s => ['claimed_range', 'maximum_load', 'battery_voltage'].includes(s.key)));
      for (const spec of shared) assert.ok(product.specs[spec.key] && competitor.specs[spec.key]);
    }
  }
  const t02 = normalize(fixture.products[1]);
  assert.equal(t02.specs.battery_energy.value, null);
  assert.equal(t02.specs.ready_to_ride_weight.value, null);
  assert.equal(t02.specs.continuous_motor_power.value, 6000);
  assert.equal(t02.specs.peak_motor_power.value, 11000);
});
test('acceleration with different measurement bases has no margin or winner', () => {
  const a = normalize({ details: { specs: { acceleration: { value: 2.3, unit: 's', display: '0–50 km/h: 2.3 s', basis: '0-50-kmh' } } } });
  const b = normalize({ details: { specs: { acceleration: { value: 2.36, unit: 's', display: '0–30 mph: 2.36 s', basis: '0-30-mph' } } } });
  const spec = { key: 'acceleration', comparisonMode: 'lower' };
  assert.equal(winner(spec, a, b), null);
  assert.equal(difference(spec, a, b), null);
});
