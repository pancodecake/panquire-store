if (!customElements.get('pq-purchase-panel')) {
  customElements.define('pq-purchase-panel', class extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      this.animations = new Map();
      this.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
      const options = { signal: this.controller.signal };
      this.addEventListener('click', event => {
        const summary = event.target.closest('summary');
        if (!summary || !this.contains(summary)) return;
        const details = summary.parentElement;
        if (!(details instanceof HTMLDetailsElement)) return;
        const previous = this.animations.get(details);
        if (!event.detail || this.reduceMotion.matches) {
          if (previous) this.finish(details, previous);
          return;
        }
        event.preventDefault();
        const opening = !(previous?.opening ?? details.open);
        const start = details.getBoundingClientRect().height;
        previous?.animation.cancel();
        details.open = true;
        details.dataset.purchaseExpanded = String(opening);
        const styles = getComputedStyle(details);
        const border = parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
        const end = (opening ? details.scrollHeight : summary.getBoundingClientRect().height) + border;
        details.style.overflow = 'hidden';
        const animation = details.animate([{ height: `${start}px` }, { height: `${end}px` }], {
          duration: parseFloat(getComputedStyle(this).getPropertyValue('--pq-motion-base')) || 200,
          easing: getComputedStyle(this).getPropertyValue('--pq-ease-out').trim() || 'cubic-bezier(0.23, 1, 0.32, 1)',
          fill: 'both',
        });
        const state = { animation, opening };
        this.animations.set(details, state);
        animation.onfinish = () => this.finish(details, state);
      }, options);
      this.reduceMotion.addEventListener('change', () => {
        for (const [details, state] of this.animations) this.finish(details, state);
      }, options);
    }
    finish(details, state) {
      if (this.animations.get(details) !== state) return;
      details.open = state.opening;
      state.animation.cancel();
      details.style.removeProperty('overflow');
      delete details.dataset.purchaseExpanded;
      this.animations.delete(details);
    }
    disconnectedCallback() {
      this.controller?.abort();
      for (const [details, state] of this.animations ?? []) this.finish(details, state);
    }
  });
}
