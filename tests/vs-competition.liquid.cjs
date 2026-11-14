const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Liquid } = require(process.env.LIQUIDJS_MODULE || 'liquidjs');
const current = require('./fixtures/comparison-products-2026-10.json');
const original = require('./fixtures/comparison-shopify.json');
const root = join(__dirname, '..');
const engine = new Liquid();
engine.registerFilter('json', value => JSON.stringify(value === undefined ? null : value));
engine.registerFilter('image_url', value => value.src);
const source = readFileSync(join(root, 'snippets/comparison-record.liquid'), 'utf8').replace(/{% doc %}[\s\S]*?{% enddoc %}/g, '');
const template = JSON.parse(readFileSync(join(root, 'templates/page.compare.json'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''));

async function renderProduct(index) {
  const product = current[index];
  const metafields = {};
  for (const field of product.metafields) (metafields[field.namespace] ||= {})[field.key] = { value: field.value };
  const competitors = template.sections.main.settings[`t0${index + 1}_competitors`];
  return JSON.parse(await engine.parseAndRender(source, {
    kind: 'product', record: { ...product, title: product.name, url: `/products/${product.handle}`, metafields },
    competitors, cart: { currency: { iso_code: 'USD' } }
  }));
}

module.exports = { renderProduct };
if (require.main === module) (async () => {
  for (let index = 0; index < current.length; index++) {
    const record = await renderProduct(index);
    assert.deepEqual(record.competitorHandles, original.products[index].competitorHandles);
    assert.match(record.specificationRows, /Performance\|Peak motor power\|/);
    assert.match(record.specificationAdditions, /Charging 0–100%/);
    assert.equal(record.sourceUrl, `/products/${record.handle}`);
    assert.equal(record.fields.peak_motor_power, null);
  }
  console.log('PASS: current product metafields and ordered theme lists serialize through the actual Liquid adapter.');
})().catch(error => { console.error(error); process.exitCode = 1; });
