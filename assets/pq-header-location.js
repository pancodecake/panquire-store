import { currencyForCountry } from './pq-country-currencies.js';

const normalize = (value) => value.normalize('NFD').replace(/\p{Mark}/gu, '').toLowerCase();
const featuredCountries = [
  'NL', 'US', 'DE', 'BR', 'CA', 'GB', 'MX', 'PL', 'ZA', 'IN', 'AU', 'IT', 'AE', 'ES',
  'FR', 'ID', 'IE', 'JP', 'KR', 'NZ', 'PK', 'VN', 'RO', 'SH', 'SE', 'TR', 'RU', 'CN',
];

function setupLocation(details) {
  if (details.hasAttribute('data-location-ready')) return;
  details.setAttribute('data-location-ready', '');

  const trigger = details.querySelector('summary');
  const list = details.querySelector('ul');
  const search = details.querySelector('[data-location-search]');
  const input = search.querySelector('input');
  const empty = details.querySelector('[data-location-empty]');
  const full = details.querySelector('[data-location-full]');
  let showAll = false;
  const currencyNames = typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames([document.documentElement.lang || 'en'], { type: 'currency' })
    : null;
  const currencySymbols = new Map();
  const options = [...list.querySelectorAll('button')].map((button) => {
    const currency = currencyForCountry(button.value, button.dataset.currency);
    if (!currencySymbols.has(currency)) {
      const symbol = new Intl.NumberFormat(document.documentElement.lang || 'en', {
        style: 'currency', currency, currencyDisplay: 'narrowSymbol',
      }).formatToParts(0).find((part) => part.type === 'currency')?.value;
      currencySymbols.set(currency, symbol || currency);
    }
    button.dataset.currency = currency;
    button.querySelector('.pq-header-location__currency').textContent = `${currency} / ${currencySymbols.get(currency)}`;
    return {
      button,
      row: button.closest('li'),
      terms: normalize([
        button.textContent, button.value, currencyNames?.of(currency),
        button.value === 'GB' ? 'UK' : '',
      ].join(' ')),
    };
  });
  const byCountry = new Map(options.map((option) => [option.button.value, option]));
  const featured = featuredCountries.map((code) => byCountry.get(code)).filter(Boolean);
  const featuredRows = new Set(featured.map(({ row }) => row));
  let wasFeaturedView = false;
  search.hidden = false;

  function filterOptions() {
    const query = normalize(input.value.trim());
    const words = query.split(/\s+/);
    const isFeaturedView = !query && !showAll && featured.length > 0;
    let visible = 0;
    for (const { row, terms } of options) {
      row.hidden = isFeaturedView ? !featuredRows.has(row) : !words.every((word) => terms.includes(word));
      if (!row.hidden) visible++;
    }
    if (isFeaturedView !== wasFeaturedView) {
      list.append(...(isFeaturedView ? featured : options).map(({ row }) => row));
      wasFeaturedView = isFeaturedView;
    }
    full.hidden = !isFeaturedView || featured.length === options.length;
    list.scrollTop = 0;
    empty.hidden = visible > 0;
  }

  filterOptions();
  input.addEventListener('input', filterOptions);
  full.addEventListener('click', () => {
    showAll = true;
    full.setAttribute('aria-expanded', 'true');
    filterOptions();
    list.querySelector('button')?.focus({ preventScroll: true });
  });
  input.addEventListener('keydown', (event) => {
    if (event.isComposing) return;
    if (event.key === 'Enter' || event.key === 'ArrowDown') {
      event.preventDefault();
      list.querySelector('li:not([hidden]) button')?.focus();
    }
  });

  details.addEventListener('toggle', () => {
    if (details.open) {
      if (matchMedia('(pointer: fine)').matches) input.focus({ preventScroll: true });
    } else if (input.value || showAll) {
      input.value = '';
      showAll = false;
      full.setAttribute('aria-expanded', 'false');
      filterOptions();
    }
  });

  details.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !details.open) return;
    event.preventDefault();
    details.open = false;
    trigger.focus();
  });

  details.addEventListener('focusout', (event) => {
    if (event.relatedTarget && !details.contains(event.relatedTarget)) details.open = false;
  });
}

function setupLocations(root = document) {
  root.querySelectorAll('[data-header-location]').forEach(setupLocation);
}

setupLocations();
document.addEventListener('shopify:section:load', (event) => setupLocations(event.target));
document.addEventListener('pointerdown', (event) => {
  for (const details of document.querySelectorAll('[data-header-location][open]')) {
    if (!details.contains(event.target)) details.open = false;
  }
});
