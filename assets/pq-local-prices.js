import { currencyForCountry } from './pq-country-currencies.js';

const target = '[data-pq-usd-cents]';
const maximumRateAge = 7 * 86400000;
const locale = document.documentElement.lang || 'en';
const originals = new WeakMap();
const estimates = new Map();
const usd = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' });
let snapshot;
let activeCurrency;
let estimate;

try {
  snapshot = JSON.parse(document.getElementById('PanquireExchangeRates')?.textContent || 'null');
} catch {
  snapshot = null;
}

function estimateFor(country) {
  const currency = currencyForCountry(country);
  if (currency === 'USD' || snapshot?.base !== 'USD' || document.body.dataset.pqCartCurrency !== 'USD') return null;
  const rate = snapshot.rates?.[currency];
  const age = Date.now() - Date.parse(snapshot.rateDates?.[currency] ?? snapshot.sourceDate);
  if (!Number.isFinite(rate) || rate <= 0 || !(age >= 0 && age < maximumRateAge)) return null;
  if (!estimates.has(currency)) {
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code' });
    estimates.set(currency, { rate, formatter, amounts: new Map() });
  }
  return estimates.get(currency);
}

function updatePrice(element) {
  const cents = element.dataset.pqUsdCents;
  if (!cents || !Number.isSafeInteger(Number(cents))) return;

  const previous = originals.get(element);
  const text = element.textContent;
  // A Shopify section or variant update can replace either the original markup or its amount.
  const hasEstimate = previous?.rendered != null && text === previous.rendered;
  const original = hasEstimate && previous.cents !== cents
    ? usd.format(Number(cents) / 100)
    : hasEstimate ? previous.original : element.innerHTML;

  if (!estimate) {
    if (hasEstimate) element.innerHTML = original;
    originals.delete(element);
    return;
  }

  const { rate, formatter, amounts } = estimate;
  if (!amounts.has(cents)) amounts.set(cents, `≈ ${formatter.format(Number(cents) * rate / 100)}`);
  const rendered = amounts.get(cents);
  if (hasEstimate && previous.cents === cents && text === rendered) return;
  originals.set(element, { cents, original, rendered });
  if (text !== rendered) element.textContent = rendered;
}

function selectCountry(country) {
  const currency = currencyForCountry(country);
  if (currency !== activeCurrency) {
    activeCurrency = currency;
    estimate = estimateFor(country);
    document.documentElement.toggleAttribute('data-pq-estimated-prices', Boolean(estimate));
    if (estimate || estimates.size) document.querySelectorAll(target).forEach(updatePrice);
  }
  document.documentElement.removeAttribute('data-pq-rates-pending');
}

selectCountry(document.body.dataset.pqCountry);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) selectCountry(document.body.dataset.pqCountry);
});

document.addEventListener('submit', (event) => {
  if (event.defaultPrevented || !event.target.matches('.pq-header-location__panel') ||
    event.submitter?.name !== 'country_code') return;
  // Paint the selected currency immediately. Shopify still owns country, language, and shipping context.
  selectCountry(event.submitter.value);
});

new MutationObserver((records) => {
  if (!estimate) return;
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
  changed.forEach(updatePrice);
}).observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['data-pq-usd-cents'],
});

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
