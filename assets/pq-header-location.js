import { currencyForCountry, isEuCountry } from '@theme/pq-country-currencies';
import { languageForCountry } from './pq-country-languages.js';

const normalize = (value) => value.normalize('NFD').replace(/\p{Mark}/gu, '').toLowerCase();
const languagePreferenceKey = 'panquire-language-preference';
let languagePreference = '';
try { languagePreference = localStorage.getItem(languagePreferenceKey) || ''; } catch { /* Storage is optional. */ }
const featuredCountries = [
  'NL', 'US', 'DE', 'BR', 'CA', 'GB', 'MX', 'PL', 'ZA', 'IN', 'AU', 'IT', 'AE', 'ES',
  'FR', 'ID', 'IE', 'JP', 'KR', 'NZ', 'PK', 'VN', 'RO', 'SH', 'SE', 'TR', 'RU', 'CN',
];

function setupLocation(details) {
  if (details.hasAttribute('data-location-ready')) return;
  details.setAttribute('data-location-ready', '');

  const trigger = details.querySelector('summary');
  const form = details.querySelector('form');
  const languageInput = form.elements.namedItem('language_code');
  const countryInput = form.querySelector('[data-location-manual-country]');
  const languagePicker = form.querySelector('[data-location-language]');
  const published = new Set(languageInput.dataset.publishedLanguages.toLowerCase().split(','));
  const confirmed = form.querySelector('[aria-current="true"]');
  if (languagePicker && confirmed) {
    languagePicker.closest('label').hidden = false;
    languagePicker.addEventListener('change', () => {
      if (details.hasAttribute('data-location-pending')) return;
      const language = languagePicker.value;
      if (!published.has(language.toLowerCase())) return;
      languagePreference = language;
      try { localStorage.setItem(languagePreferenceKey, language); } catch { /* Storage is optional. */ }
      if (language.toLowerCase() === document.documentElement.lang.toLowerCase()) return;
      languageInput.disabled = false;
      languageInput.value = language;
      countryInput.disabled = false;
      details.setAttribute('data-location-pending', '');
      trigger.setAttribute('aria-busy', 'true');
      form.requestSubmit();
    });
  }
  form.addEventListener('submit', (event) => {
    const selected = event.submitter;
    if (event.defaultPrevented || selected?.name !== 'country_code') return;

    const available = selected.dataset.languages.split(',').filter((code) => published.has(code.toLowerCase()));
    const language = languageForCountry(selected.value, available, languagePreference);
    const changesLanguage = language && language.toLowerCase() !== document.documentElement.lang.toLowerCase();
    if (details.hasAttribute('data-location-pending') || (selected === confirmed && !changesLanguage)) {
      event.preventDefault();
    } else {
      languageInput.disabled = !language;
      languageInput.value = language;
      countryInput.disabled = true;
      details.setAttribute('data-location-pending', '');
      trigger.setAttribute('aria-busy', 'true');
      updateTrigger(details, selected);
    }
    details.open = false;
    trigger.focus({ preventScroll: true });
  });

  function prepareOnOpen() {
    if (!details.open) return;
    details.removeEventListener('toggle', prepareOnOpen);
    prepareLocation(details, trigger);
  }
  details.addEventListener('toggle', prepareOnOpen);
  prepareOnOpen();
}

function updateTrigger(details, option) {
  const { firstElementChild: optionFlag } = option;
  const name = details.querySelector('[data-location-name]');
  const flag = details.querySelector('.pq-header-location__selected img');
  name.textContent = optionFlag.nextElementSibling.textContent;
  flag.removeAttribute('srcset');
  flag.src = optionFlag.currentSrc || optionFlag.src;
}

function prepareLocation(details, trigger) {
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
    const currency = isEuCountry(button.value) ? 'EUR' : currencyForCountry(button.value, button.dataset.currency);
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

  function focusSearch() {
    if (matchMedia('(pointer: fine)').matches) input.focus({ preventScroll: true });
  }

  filterOptions();
  focusSearch();
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
      focusSearch();
    } else if (!details.hasAttribute('data-location-pending') && (input.value || showAll)) {
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
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  for (const details of document.querySelectorAll('[data-header-location][data-location-pending]')) {
    details.removeAttribute('data-location-pending');
    details.querySelector('summary').removeAttribute('aria-busy');
    const confirmed = details.querySelector('[aria-current="true"]');
    if (confirmed) updateTrigger(details, confirmed);
    const form = details.querySelector('form');
    form.querySelector('[data-location-manual-country]').disabled = true;
    const languagePicker = form.querySelector('[data-location-language]');
    if (languagePicker) languagePicker.value = document.documentElement.lang;
  }
});
document.addEventListener('pointerdown', (event) => {
  for (const details of document.querySelectorAll('[data-header-location][open]')) {
    if (!details.contains(event.target)) details.open = false;
  }
});
