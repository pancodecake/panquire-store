import { pathToFileURL } from 'node:url';

const shopOrigin = 'https://byt11k-dx.myshopify.com';
const apiVersion = '2026-10';
const rateEndpoint = 'https://api.frankfurter.dev/v2/rates?base=usd';
const day = 86400000;

export function validateRates(rows, now = new Date(), previous = null) {
  if (!Array.isArray(rows)) throw new Error('Frankfurter did not return a rates array.');
  const rates = { USD: 1 };
  const rateDates = {};
  let sourceDate = '';
  for (const { base, quote, rate, date } of rows) {
    if (base === 'USD' && quote === 'USD' && rate === 1) continue;
    if (typeof quote === 'string' && /^[A-Z]{4,}$/.test(quote)) continue;
    const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(date) : NaN;
    if (base !== 'USD' || !/^[A-Z]{3}$/.test(quote) || quote === 'USD' ||
      !Number.isFinite(rate) || rate <= 0 || !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 10) !== date || timestamp > now.getTime() ||
      Object.hasOwn(rates, quote)) {
      throw new Error('Frankfurter returned an invalid USD quote.');
    }
    rates[quote] = rate;
    rateDates[quote] = date;
    if (date > sourceDate) sourceDate = date;
  }
  if (rows.length < 150 || ['CAD', 'EUR', 'GBP', 'JPY'].some((code) => {
    const age = now.getTime() - Date.parse(rateDates[code]);
    return !Number.isFinite(age) || age >= 7 * day;
  })) throw new Error('Frankfurter returned incomplete or stale rates.');
  if (previous?.base === 'USD') {
    if (previous.sourceDate > sourceDate) throw new Error('Frankfurter snapshot predates Shopify’s saved rates.');
    for (const [code, date] of Object.entries(previous.rateDates ?? {})) {
      const age = now.getTime() - Date.parse(date);
      const oldRate = previous.rates?.[code];
      if (code !== 'USD' && /^[A-Z]{3}$/.test(code) && age >= 0 && age < 7 * day &&
        Number.isFinite(oldRate) && oldRate > 0 && date > (rateDates[code] ?? '')) {
        rates[code] = oldRate;
        rateDates[code] = date;
      }
    }
  }
  return { base: 'USD', source: 'Frankfurter', sourceDate, refreshedAt: now.toISOString(), rates, rateDates };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`${new URL(url).hostname} returned HTTP ${response.status}.`);
  return response.json();
}

async function refresh() {
  const { SHOPIFY_FX_CLIENT_ID, SHOPIFY_FX_CLIENT_SECRET } = process.env;
  if (!SHOPIFY_FX_CLIENT_ID || !SHOPIFY_FX_CLIENT_SECRET) {
    throw new Error('Set SHOPIFY_FX_CLIENT_ID and SHOPIFY_FX_CLIENT_SECRET in the scheduler’s secret store.');
  }
  const [rows, token] = await Promise.all([
    requestJson(rateEndpoint),
    requestJson(`${shopOrigin}/admin/oauth/access_token`, {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SHOPIFY_FX_CLIENT_ID,
        client_secret: SHOPIFY_FX_CLIENT_SECRET,
      }),
    }),
  ]);
  if (!token.access_token) throw new Error('Shopify did not issue an Admin API token.');

  async function graphql(query, variables) {
    const response = await requestJson(`${shopOrigin}/admin/api/${apiVersion}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token.access_token },
      body: JSON.stringify({ query, variables }),
    });
    if (response.errors?.length || !response.data) throw new Error('Shopify rejected the Admin GraphQL request. Check app access.');
    return response.data;
  }

  const { shop } = await graphql(`query ExchangeRateOwner {
    shop {
      id
      currencyCode
      metafield(namespace: "panquire", key: "exchange_rates") { type compareDigest jsonValue }
    }
  }`);
  if (shop.currencyCode !== 'USD' || (shop.metafield && shop.metafield.type !== 'json')) {
    throw new Error('Shopify shop currency or exchange-rate metafield type is incompatible.');
  }
  const snapshot = validateRates(rows, new Date(), shop.metafield?.jsonValue);
  const result = await graphql(`mutation SaveExchangeRates($values: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $values) {
      metafields { updatedAt }
      userErrors { code field }
    }
  }`, { values: [{
    namespace: 'panquire', key: 'exchange_rates', type: 'json', ownerId: shop.id,
    compareDigest: shop.metafield?.compareDigest ?? null, value: JSON.stringify(snapshot),
  }] });
  if (!result.metafieldsSet.metafields?.length || result.metafieldsSet.userErrors.length) {
    throw new Error(`No exchange rates saved. Shopify codes: ${result.metafieldsSet.userErrors.map((error) => error.code).join(', ')}.`);
  }
  console.log(`Saved ${Object.keys(snapshot.rates).length} USD rates. Latest source date: ${snapshot.sourceDate}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  refresh().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
