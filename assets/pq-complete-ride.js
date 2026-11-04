class PqCompleteRide extends HTMLElement {
  connectedCallback() {
    this.addEventListener('change', this.#handleChange);
    this.querySelector('[data-accessory-show-more]')?.addEventListener('click', this.#toggleRows);
    this.querySelectorAll('[data-accessory-row]').forEach((row) => this.#syncRow(row));
  }

  disconnectedCallback() {
    this.removeEventListener('change', this.#handleChange);
    this.querySelector('[data-accessory-show-more]')?.removeEventListener('click', this.#toggleRows);
    const details = this.closest('.product-details');
    if (details) delete details.dataset.accessoriesSelected;
  }

  #handleChange = (event) => {
    const row = event.target.closest('[data-accessory-row]');
    if (!row) return;
    this.#syncRow(row);
  };

  #syncRow(row) {
    const checkbox = row.querySelector('[data-accessory-toggle]');
    const variantSelect = row.querySelector('[data-accessory-variant]');
    const price = row.querySelector('[data-accessory-price]');
    const selectedOption = variantSelect?.selectedOptions?.[0];

    if (selectedOption) {
      checkbox.dataset.variantId = selectedOption.value;
      checkbox.disabled = selectedOption.disabled;
      if (selectedOption.disabled) checkbox.checked = false;
      if (price && selectedOption.dataset.price) price.textContent = selectedOption.dataset.price;
    }

    row.dataset.selected = checkbox.checked ? 'true' : 'false';
    this.#syncPurchaseActions();
  }

  #syncPurchaseActions() {
    const hasSelection = Boolean(this.querySelector('[data-accessory-toggle]:checked'));
    const details = this.closest('.product-details');
    if (details) details.dataset.accessoriesSelected = String(hasSelection);
    const note = this.querySelector('[data-accessory-cart-note]');
    if (note) note.hidden = !hasSelection;
  }

  #toggleRows = (event) => {
    const button = event.currentTarget;
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    this.querySelectorAll('[data-accessory-row][hidden]').forEach((row) => {
      row.dataset.collapsedRow = 'true';
    });
    this.querySelectorAll('[data-collapsed-row]').forEach((row) => {
      row.hidden = isExpanded;
    });
    button.setAttribute('aria-expanded', String(!isExpanded));
    button.textContent = isExpanded ? button.dataset.showMore : button.dataset.showLess;
  };
}

if (!customElements.get('pq-complete-ride')) {
  customElements.define('pq-complete-ride', PqCompleteRide);
}
