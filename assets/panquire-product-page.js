// Native theme gallery, variants and cart remain their own source of truth.
if (!customElements.get('pq-product-tabs')) {
  customElements.define('pq-product-tabs', class extends HTMLElement {
    connectedCallback() {
      this.controller?.abort();
      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.tabs = [...this.querySelectorAll('[role="tab"]')];
      this.panels = [...this.querySelectorAll('[role="tabpanel"]')];
      this.addEventListener('click', event => {
        const index = this.tabs.indexOf(event.target.closest('[role="tab"]'));
        if (index >= 0) this.select(index);
      }, options);
      this.addEventListener('keydown', event => {
        const index = this.tabs.indexOf(event.target);
        if (index < 0) return;
        const target = {ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: this.tabs.length - 1}[event.key];
        if (target === undefined) return;
        event.preventDefault();
        this.select((target + this.tabs.length) % this.tabs.length, true);
      }, options);
    }
    disconnectedCallback() { this.controller?.abort(); }
    select(index, focus = false) {
      this.tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        this.panels[i].hidden = i !== index;
      });
      if (focus) this.tabs[index].focus({ preventScroll: true });
      this.tabs[index].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
  });
}
