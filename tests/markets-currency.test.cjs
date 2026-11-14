const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { Liquid } = require(process.env.LIQUIDJS_MODULE || '../.preview-runtime/node_modules/liquidjs');

const root = join(__dirname, '..');
const engine = new Liquid();
const translations = JSON.parse(readFileSync(join(root, 'locales/en.default.json'), 'utf8')
  .replace(/^\s*\/\*[\s\S]*?\*\//, '').replace(/^\s*\/\/.*$/gm, ''));
const readSnippet = name => readFileSync(join(root, 'snippets', name + '.liquid'), 'utf8')
  .replace(/{%-?\s*(doc|stylesheet)\s*-?%}[\s\S]*?{%-?\s*end\1\s*-?%}/g, '')
  .replace(/{% form 'localization'[^%]*%}/, '<form action="/localization">')
  .replace('{% endform %}', '</form>');

engine.registerFilter('t', (key, ...args) => {
  let text = key.split('.').reduce((value, part) => value[part], translations);
  for (const [name, value] of args) text = text.replaceAll('{{ ' + name + ' }}', value);
  return text;
});
engine.registerFilter('json', value => JSON.stringify(value ?? null));

test('renders every configured country and its effective currency', async () => {
  const source = readSnippet('pq-country-selector');
  const snapshot = process.env.PANQUIRE_MARKETS_MATRIX || join(root, 'docs', 'markets-currency-matrix.json');
  const configured = JSON.parse(readFileSync(snapshot, 'utf8'));
  assert(configured.length > 50);
  const countries = configured.map(({ code, country, currency }) => ({
    iso_code: code, name: country, currency: { iso_code: currency },
  }));
  const shop = { currency: 'USD' };
  const last = countries.at(-1);
  const html = await engine.parseAndRender(source, {
    shop, section_id: 'footer', localization: { available_countries: countries, country: last },
  });
  const rendered = [...html.matchAll(/<option value="([^"]+)" data-currency="([^"]+)"( selected)?>/g)];
  assert.deepEqual(rendered.map(([, code, currency]) => [code, currency]),
    countries.map(country => [country.iso_code, country.currency.iso_code]));
  assert.deepEqual(rendered.filter(match => match[3]).map(match => match[1]), [last.iso_code]);
  assert.match(html, /name="country_code"/);

  const fallback = { iso_code: 'ZZ', name: 'Fallback' };
  const fallbackHTML = await engine.parseAndRender(source, {
    shop, localization: { available_countries: [...countries, fallback], country: fallback },
  });
  assert.match(fallbackHTML, /value="ZZ" data-currency="USD" selected/);
});

test('passes Shopify-formatted product prices through without rescaling', async () => {
  const source = readSnippet('comparison-record');
  const cases = [
    { price: 199900, display: '$1,999.00 USD' },
    { price: 269900, display: '$2,699.00 USD' },
    { price: 29985000, display: '¥299,850 JPY' },
    { price: 4045123, display: 'BHD 404.512' },
  ];
  for (const { price, display } of cases) {
    engine.registerFilter('money_with_currency', value => {
      assert.equal(value, price);
      return display;
    });
    const result = JSON.parse(await engine.parseAndRender(source, {
      kind: 'product', record: { price },
    }));
    assert.deepEqual(result.price, { display });
  }
});

test('discloses the Oceanpayment charge currency when presentment differs', async () => {
  const source = readSnippet('pq-checkout-currency');
  const shop = { currency: 'USD' };
  for (const currency of ['JPY', 'EUR', 'BHD']) {
    const html = await engine.parseAndRender(source, { shop, cart: { currency: { iso_code: currency } } });
    assert(html.includes('shown in ' + currency));
    assert.match(html, /Oceanpayment, you’ll be charged in USD/);
  }
  for (const currency of ['USD', undefined]) {
    const html = await engine.parseAndRender(source, { shop, cart: { currency: { iso_code: currency } } });
    assert.equal(html.trim(), '');
  }
});
