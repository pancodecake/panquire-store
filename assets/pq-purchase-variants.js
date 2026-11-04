if (!customElements.get('pq-purchase-variants')) {
  customElements.define('pq-purchase-variants', class extends HTMLElement {
    connectedCallback() {
      this.onchange = () => this.querySelector('form').requestSubmit();
    }
    disconnectedCallback() {
      this.onchange = null;
    }
  });
}
