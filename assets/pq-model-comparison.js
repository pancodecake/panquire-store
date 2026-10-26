(() => {
  function winningCells(cells) {
    const ranked = cells.filter(cell => cell.mode !== 'none' && cell.number !== '' && Number.isFinite(Number(cell.number)) && !/^(?:[<>≤≥~≈]|less|more|up to|over|under|approx)/i.test(cell.text.trim()));
    if (ranked.length < 2 || ranked.some(cell => cell.mode !== ranked[0].mode)) return [];
    const values = ranked.map(cell => Number(cell.number));
    if (values.every(value => value === values[0])) return [];
    const best = ranked[0].mode === 'lower' ? Math.min(...values) : Math.max(...values);
    return ranked.filter(cell => Number(cell.number) === best);
  }
  if (typeof module !== 'undefined') module.exports = { winningCells };
  if (typeof customElements === 'undefined' || customElements.get('pq-model-comparison')) return;
  customElements.define('pq-model-comparison', class extends HTMLElement {
    connectedCallback() {
      this.querySelectorAll('tbody tr').forEach(row => {
        const cells = [...row.querySelectorAll('td')].map(element => ({ element, mode: element.dataset.mode, number: element.dataset.number, text: element.textContent }));
        for (const cell of winningCells(cells)) cell.element.classList.add('is-winner');
      });
    }
  });
})();
