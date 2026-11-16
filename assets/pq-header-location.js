const normalize = (value) => value.normalize('NFD').replace(/\p{Mark}/gu, '').toLowerCase();

function setupLocation(details) {
  if (details.hasAttribute('data-location-ready')) return;
  details.setAttribute('data-location-ready', '');

  const trigger = details.querySelector('summary');
  const list = details.querySelector('ul');
  const search = details.querySelector('[data-location-search]');
  const input = search.querySelector('input');
  const empty = details.querySelector('[data-location-empty]');
  const currencyNames = typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames([document.documentElement.lang || 'en'], { type: 'currency' })
    : null;
  const options = [...list.querySelectorAll('button')].map((button) => ({
    button,
    row: button.closest('li'),
    terms: normalize([button.textContent, button.value, currencyNames?.of(button.dataset.currency)].join(' ')),
  }));
  const active = list.querySelector('[aria-current="true"]');
  search.hidden = false;

  function filterOptions() {
    const query = normalize(input.value.trim()).split(/\s+/);
    let visible = 0;
    for (const { row, terms } of options) {
      row.hidden = !query.every((word) => terms.includes(word));
      if (!row.hidden) visible++;
    }
    list.scrollTop = 0;
    empty.hidden = visible > 0;
  }

  input.addEventListener('input', filterOptions);
  input.addEventListener('keydown', (event) => {
    if (event.isComposing) return;
    if (event.key === 'Enter' || event.key === 'ArrowDown') {
      event.preventDefault();
      options.find(({ row }) => !row.hidden)?.button.focus();
    }
  });

  details.addEventListener('toggle', () => {
    if (details.open) {
      if (matchMedia('(pointer: fine)').matches) input.focus({ preventScroll: true });
      if (active) list.scrollTop = active.offsetTop - list.offsetTop - list.clientHeight / 2 + active.offsetHeight / 2;
    } else if (input.value) {
      input.value = '';
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
