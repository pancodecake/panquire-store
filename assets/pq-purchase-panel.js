if (!customElements.get('pq-purchase-panel')) {
  customElements.define('pq-purchase-panel', class extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      this.animations = new Map();
      this.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
      const options = { signal: this.controller.signal };
      let pendingAdds = 0;
      this.addEventListener('shopify:cart:lines-update', event => {
        if (event.action !== 'add') return;
        const status = this.querySelector('[data-pq-cart-pending]');
        const button = this.querySelector('.pq-purchase__add');
        if (!status || !button) return;
        pendingAdds += 1;
        status.hidden = false;
        button.setAttribute('aria-busy', 'true');
        const finish = () => {
          pendingAdds -= 1;
          if (pendingAdds > 0) return;
          status.hidden = true;
          button.removeAttribute('aria-busy');
        };
        event.promise.then(finish, finish);
      }, options);
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

if (!customElements.get('pq-stock-counter')) {
  const storageKey = 'panquire:black-friday:stock';
  const demo = {
    decrementMin: 1,
    decrementMax: 3,
    delayMin: 5000,
    delayMax: 10000,
    names: ['David M.', 'James M.', 'Oliver K.', 'Daniel R.', 'Maya L.', 'Eva T.', 'Noah S.'],
  };
  const randomInteger = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

  customElements.define('pq-stock-counter', class extends HTMLElement {
    connectedCallback() {
      if (!this.hasAttribute('data-demo-minimum')) return;
      this.minimum = Number(this.dataset.demoMinimum);
      this.number = this.querySelector('.pq-stock-counter__number');
      this.fill = this.querySelector('.pq-stock-counter__fill');
      this.notice = this.querySelector('.pq-stock-counter__notice');
      this.maximum = Number(this.dataset.demoMaximum);

      this.demoController = new AbortController();
      const options = { signal: this.demoController.signal };
      this.notice.addEventListener('animationend', () => this.clearNotice(), options);
      document.addEventListener('visibilitychange', () => {
        clearTimeout(this.timer);
        if (document.hidden) this.clearNotice();
        this.schedule();
      }, options);
      this.schedule();
    }

    schedule() {
      if (document.hidden) return;
      const now = new Date();
      this.loadStock(now);
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const delay = this.stock > this.minimum ? randomInteger(demo.delayMin, demo.delayMax) : Infinity;
      this.timer = setTimeout(() => {
        if (document.hidden) return;
        const day = this.stockDay;
        this.loadStock(new Date());
        if (this.stockDay === day && this.stock > this.minimum) this.decrement();
        this.schedule();
      }, Math.min(delay, midnight - now));
    }

    loadStock(now) {
      const day = now.toDateString();
      let saved;
      try {
        saved = JSON.parse(localStorage.getItem(storageKey));
      } catch {
        // Storage can be unavailable in restricted browsing contexts.
      }
      if (saved?.day === day && Number.isInteger(saved.initialStock) && Number.isInteger(saved.stock)
        && saved.stock >= this.minimum && saved.stock <= saved.initialStock && saved.initialStock <= this.maximum) {
        this.initialStock = saved.initialStock;
        this.stock = saved.stock;
      } else if (this.stockDay !== day) {
        this.clearNotice();
        this.initialStock = randomInteger(this.minimum, this.maximum);
        this.stock = this.initialStock;
        this.stockDay = day;
        this.saveStock();
      }
      this.stockDay = day;
      this.renderStock();
    }

    saveStock() {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          day: this.stockDay,
          initialStock: this.initialStock,
          stock: this.stock,
        }));
      } catch {
        // The counter can still run for this page visit.
      }
    }

    renderStock() {
      this.number.textContent = this.stock;
      this.fill.style.setProperty('--pq-stock-ratio', this.stock / this.initialStock);
    }

    decrement() {
      if (this.hasAttribute('data-updating')) {
        this.clearNotice();
        // Apply the cancellation before starting another notice at the five-second boundary.
        this.notice.getAnimations();
      }
      const amount = Math.min(randomInteger(demo.decrementMin, demo.decrementMax), this.stock - this.minimum);
      this.stock -= amount;
      this.saveStock();
      this.renderStock();

      // Skip the previous name without drawing again.
      const nameIndex = randomInteger(0, demo.names.length - (this.lastNameIndex == null ? 1 : 2));
      this.lastNameIndex = nameIndex >= this.lastNameIndex ? nameIndex + 1 : nameIndex;
      const bikes = amount === 1 ? 'an e-dirt bike' : `${amount} e-dirt bikes`;
      this.notice.textContent = `${demo.names[this.lastNameIndex]} just purchased ${bikes}`;
      this.setAttribute('data-updating', '');
    }

    clearNotice() {
      this.removeAttribute('data-updating');
      this.notice.textContent = '';
    }

    disconnectedCallback() {
      if (!this.demoController) return;
      clearTimeout(this.timer);
      this.demoController.abort();
      this.clearNotice();
    }
  });
}
