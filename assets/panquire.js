(() => {
  const revealCleanups = new WeakMap();

  const setupReveals = (root) => {
    if (revealCleanups.has(root)) return;
    const elements = [...root.querySelectorAll('[data-pq-reveal]')];
    if (!elements.length) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let observer;

    const clear = () => {
      observer?.disconnect();
      observer = undefined;
      elements.forEach((element) => element.classList.remove('pq-reveal-pending', 'pq-reveal-active'));
    };

    const configure = () => {
      clear();
      if (preference.matches || !('IntersectionObserver' in window) || document.documentElement.classList.contains('shopify-design-mode')) return;
      observer = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          target.classList.remove('pq-reveal-pending');
          observer.unobserve(target);
        });
      }, { rootMargin: '0px 0px -24px 0px', threshold: 0 });
      elements.forEach((element) => {
        if (element.getBoundingClientRect().top < innerHeight) return;
        element.classList.add('pq-reveal-active', 'pq-reveal-pending');
        observer.observe(element);
      });
    };

    const revealFocusedContent = (event) => event.target.closest('[data-pq-reveal]')?.classList.remove('pq-reveal-pending');
    root.addEventListener('focusin', revealFocusedContent);
    preference.addEventListener('change', configure);
    configure();
    revealCleanups.set(root, () => {
      clear();
      root.removeEventListener('focusin', revealFocusedContent);
      preference.removeEventListener('change', configure);
    });
  };

  const initialize = (scope = document) => {
    if (scope === document) {
      document.querySelectorAll('.shopify-section').forEach(setupReveals);
    } else {
      setupReveals(scope);
    }
    scope.querySelectorAll('[data-pq-carousel]').forEach((root) => {
      if (root.dataset.pqReady) return;
      const track = root.querySelector('[data-pq-track]');
      const items = [...track.querySelectorAll('[data-pq-item]')];
      if (!items.length) return;
      root.dataset.pqReady = 'true';
      const controls = root.querySelector('[data-pq-controls]');
      if (controls) controls.hidden = items.length < 2;
      const previous = root.querySelector('[data-pq-prev]');
      const next = root.querySelector('[data-pq-next]');
      const dots = [...root.querySelectorAll('[data-pq-go]')];
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const nearestIndex = () => {
        const left = track.getBoundingClientRect().left;
        return items.reduce((best, item, index) => Math.abs(item.getBoundingClientRect().left - left) < Math.abs(items[best].getBoundingClientRect().left - left) ? index : best, 0);
      };
      const move = (index) => {
        const target = items[Math.max(0, Math.min(items.length - 1, index))];
        track.scrollBy({ left: target.getBoundingClientRect().left - track.getBoundingClientRect().left, behavior: reduced.matches ? 'instant' : 'smooth' });
      };
      const sync = () => {
        const index = nearestIndex();
        if (previous) previous.disabled = track.scrollLeft <= 2;
        if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
        dots.forEach((dot, n) => n === index ? dot.setAttribute('aria-current', 'true') : dot.removeAttribute('aria-current'));
      };
      previous?.addEventListener('click', () => move(nearestIndex() - 1));
      next?.addEventListener('click', () => move(nearestIndex() + 1));
      dots.forEach((dot) => dot.addEventListener('click', () => move(Number(dot.dataset.pqGo))));
      track.addEventListener('scroll', sync, { passive: true });
      const observer = new ResizeObserver(sync);
      observer.observe(track);
      root.addEventListener('pq:dispose', () => observer.disconnect(), { once: true });
      root.addEventListener('shopify:block:select', (event) => {
        const index = items.findIndex((item) => item === event.target || item.contains(event.target));
        if (index >= 0) move(index);
      });
      sync();
    });
    scope.querySelectorAll('[data-pq-reviews]').forEach((root) => {
      if (root.dataset.reviewReady) return;
      const cards = [...root.querySelectorAll('[data-review-card]')];
      if (!cards.length) return;
      const stage = root.querySelector('.pq-review-stage');
      const status = root.querySelector('[data-review-status]');
      let current = 0;
      let pointer;
      let dragged = false;
      const select = (index, announce = true) => {
        current = (index + cards.length) % cards.length;
        cards.forEach((card, n) => {
          let offset = (n - current + cards.length) % cards.length;
          if (offset > cards.length / 2) offset -= cards.length;
          const distance = Math.abs(offset);
          card.style.setProperty('--offset', offset);
          card.style.setProperty('--scale', distance === 0 ? 1 : distance === 1 ? .86 : .74);
          card.style.setProperty('--opacity', distance > 1 ? 0 : 1);
          card.style.setProperty('--layer', cards.length - distance);
          card.toggleAttribute('data-active', distance === 0);
          card.setAttribute('aria-hidden', String(distance !== 0));
          card.style.pointerEvents = distance > 1 ? 'none' : '';
        });
        if (announce) status.textContent = `${current + 1} / ${cards.length}: ${cards[current].getAttribute('aria-label')}`;
      };
      const measure = () => {
        const height = Math.max(...cards.map(card => [...card.children].reduce((sum, child) => sum + child.offsetHeight, 0)));
        stage.style.setProperty('--post-height', `${Math.ceil(height) + 2}px`);
      };
      select(0, false);
      root.dataset.reviewReady = 'true';
      root.querySelector('.pq-review-nav').hidden = cards.length < 2;
      root.querySelector('[data-review-prev]').addEventListener('click', () => select(current - 1));
      root.querySelector('[data-review-next]').addEventListener('click', () => select(current + 1));
      stage.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        select(event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1));
      });
      cards.forEach((card, index) => card.addEventListener('click', () => { if (!dragged && index !== current) select(index); }));
      stage.addEventListener('pointerdown', event => {
        if (event.button !== 0 || event.target.closest('button')) return;
        pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
        dragged = false;
      });
      stage.addEventListener('pointermove', event => {
        if (!pointer) return;
        if (Math.abs(event.clientX - pointer.x) > 10) { dragged = true; stage.setPointerCapture(event.pointerId); }
      });
      stage.addEventListener('pointerup', event => {
        if (!pointer) return;
        const dx = event.clientX - pointer.x;
        const dy = event.clientY - pointer.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) select(current + (dx < 0 ? 1 : -1));
        pointer = null;
      });
      stage.addEventListener('pointercancel', () => { pointer = null; });
      stage.addEventListener('dragstart', event => event.preventDefault());
      root.addEventListener('shopify:block:select', event => {
        const index = cards.findIndex(card => card === event.target || card.contains(event.target));
        if (index >= 0) select(index);
      });
      const observer = new ResizeObserver(measure);
      cards.forEach(card => [...card.children].forEach(child => observer.observe(child)));
      root.addEventListener('pq:dispose', () => observer.disconnect(), { once: true });
      measure();
    });
    scope.querySelectorAll('[data-pq-feature]').forEach((root) => {
      if (root.dataset.pqReady) return;
      root.dataset.pqReady = 'true';
      const panels = [...root.querySelectorAll('[data-pq-panel]')];
      const buttons = [...root.querySelectorAll('[data-pq-select]')];
      const selectors = root.querySelector('[data-pq-selectors]');
      if (selectors) selectors.hidden = buttons.length < 2;
      const select = (index) => {
        panels.forEach((panel, n) => panel.hidden = n !== index);
        buttons.forEach((button, n) => button.setAttribute('aria-pressed', String(n === index)));
      };
      buttons.forEach((button, index) => button.addEventListener('click', () => select(index)));
      root.addEventListener('shopify:block:select', (event) => {
        const index = panels.findIndex((panel) => panel === event.target || panel.contains(event.target));
        if (index >= 0) select(index);
      });
      select(0);
    });
    scope.querySelectorAll('.pq-mobile-menu').forEach((menu) => {
      if (menu.dataset.pqReady) return;
      menu.dataset.pqReady = 'true';
      menu.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') { menu.open = false; menu.querySelector('summary').focus(); }
      });
    });
  };
  initialize();
  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
  document.addEventListener('shopify:section:unload', (event) => {
    event.target.querySelectorAll('[data-pq-carousel], [data-pq-reviews]').forEach((root) => root.dispatchEvent(new Event('pq:dispose')));
    revealCleanups.get(event.target)?.();
    revealCleanups.delete(event.target);
  });
})();
