import { currencyForCountry } from './pq-country-currencies.js';

const target = '[data-pq-usd-cents]';
const cacheTime = 6 * 60 * 60 * 1000;
const maximumRateAge = 7 * 24 * 60 * 60 * 1000;
const locale = document.documentElement.lang || 'en';

function isUsableRate(record, currency) {
  const date = Date.parse(record?.date);
  const age = Date.now() - date;
  return record?.base === 'USD' && record.quote === currency &&
    Number.isFinite(record.rate) && record.rate > 0 && age >= 0 && age < maximumRateAge;
}

async function getRate(currency) {
  const key = `pq-usd-rate-v1-${currency}`;
  let cached;
  try {
    cached = JSON.parse(localStorage.getItem(key));
  } catch {
    cached = null;
  }
  if (isUsableRate(cached, currency) && Date.now() - cached.fetchedAt < cacheTime) return cached.rate;

  try {
    const response = await fetch(`https://api.frankfurter.dev/v2/rate/usd/${currency.toLowerCase()}`, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) throw new Error('Exchange rate unavailable');
    const record = await response.json();
    if (!isUsableRate(record, currency)) throw new Error('Exchange rate out of date');
    try {
      localStorage.setItem(key, JSON.stringify({ ...record, fetchedAt: Date.now() }));
    } catch {
      // The rate still works in this page when browser storage is unavailable.
    }
    return record.rate;
  } catch {
    return isUsableRate(cached, currency) ? cached.rate : null;
  }
}

async function localizePrices() {
  const { pqCountry, pqCartCurrency } = document.body.dataset;
  const currency = currencyForCountry(pqCountry);
  if (pqCartCurrency !== 'USD' || currency === 'USD') return;

  const rate = await getRate(currency);
  if (!rate) return;

  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code' });
  document.documentElement.setAttribute('data-pq-estimated-prices', '');
  const update = (element) => {
    const cents = element.dataset.pqUsdCents;
    if (!cents || !Number.isSafeInteger(Number(cents))) return;
    const display = `≈ ${formatter.format(Number(cents) * rate / 100)}`;
    if (element.textContent !== display) element.textContent = display;
  };
  document.querySelectorAll(target).forEach(update);

  new MutationObserver((records) => {
    const changed = new Set();
    for (const record of records) {
      const owner = record.target.closest(target);
      if (owner) changed.add(owner);
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(target)) changed.add(node);
        node.querySelectorAll(target).forEach((element) => changed.add(element));
      }
    }
    changed.forEach(update);
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-pq-usd-cents'],
  });
}

localizePrices();

document.addEventListener('click', (event) => {
  const info = event.target.closest('[data-pq-price-info]');
  document.querySelectorAll('[data-pq-price-info][data-open]').forEach((element) => {
    if (element !== info) element.removeAttribute('data-open');
  });
  if (info && event.target.closest('button')) {
    info.toggleAttribute('data-dismissed', !info.toggleAttribute('data-open'));
  }
});

document.addEventListener('focusin', (event) => event.target.closest('[data-pq-price-info]')?.removeAttribute('data-dismissed'));
document.addEventListener('pointerover', (event) => {
  const info = event.target.closest('[data-pq-price-info]');
  if (info && !info.contains(event.relatedTarget)) info.removeAttribute('data-dismissed');
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  document.querySelectorAll('[data-pq-price-info]:is(:hover, :focus-within, [data-open])').forEach((info) => {
    info.removeAttribute('data-open');
    info.setAttribute('data-dismissed', '');
  });
});
