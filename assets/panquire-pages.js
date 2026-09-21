(() => {
  const cleanups = new WeakMap();
  const highlight = (element, term) => {
    element.querySelectorAll('mark[data-pq-match]').forEach(mark => mark.replaceWith(document.createTextNode(mark.textContent)));
    element.normalize();
    if (!term) return;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const original = node.nodeValue;
      const text = original.toLocaleLowerCase();
      if (!text.includes(term)) return;
      const fragment = document.createDocumentFragment();
      let start = 0;
      let index;
      while ((index = text.indexOf(term, start)) !== -1) {
        fragment.append(document.createTextNode(original.slice(start, index)));
        const mark = document.createElement('mark');
        mark.dataset.pqMatch = '';
        mark.textContent = original.slice(index, index + term.length);
        fragment.append(mark);
        start = index + term.length;
      }
      fragment.append(document.createTextNode(original.slice(start)));
      node.replaceWith(fragment);
    });
  };

  const setupTerms = root => {
    if (cleanups.has(root)) return;
    const controller = new AbortController();
    const listen = (el, type, fn) => el.addEventListener(type, fn, { signal: controller.signal });
    const panels = [...root.querySelectorAll('[data-pq-policy-panel]')];
    const input = root.querySelector('[data-pq-policy-search]');
    const tabs = root.querySelector('[data-pq-policy-tabs]');
    const status = root.querySelector('[data-pq-policy-status]');
    const empty = root.querySelector('[data-pq-policy-empty]');
    const questions = panels.map(panel => [...panel.querySelectorAll('[data-pq-policy-question]')]);
    const searchable = new Map(questions.flat().map(q => [q, q.textContent.toLocaleLowerCase()]));
    const initialOpen = new Map(questions.flat().map(q => [q, q.open]));
    let active = 0;
    let query = '';
    let timer;
    if (!panels.length) return;
    const buttons = panels.map((panel, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = `PolicyTab-${root.closest('[id]').id}-${i}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      panel.tabIndex = 0;
      button.textContent = panel.dataset.title;
      tabs.append(button);
      listen(button, 'click', () => select(i, true));
      listen(button, 'keydown', event => {
        let next = i;
        const rtl = getComputedStyle(tabs).direction === 'rtl';
        if (event.key === 'ArrowRight') next = (i + (rtl ? -1 : 1) + panels.length) % panels.length;
        else if (event.key === 'ArrowLeft') next = (i + (rtl ? 1 : -1) + panels.length) % panels.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = panels.length - 1;
        else return;
        event.preventDefault();
        select(next, true);
        buttons[next].focus();
      });
      return button;
    });
    function select(index, updateHash = false) {
      active = index;
      panels.forEach((panel, i) => {
        panel.hidden = i !== active;
        buttons[i].setAttribute('aria-selected', String(i === active));
        buttons[i].tabIndex = i === active ? 0 : -1;
      });
      const total = questions.flat().filter(q => !q.hidden).length;
      const count = questions[active].filter(q => !q.hidden).length;
      status.textContent = `${total} ${root.dataset.resultLabel}. ${count} ${root.dataset.topicLabel}.` + (query ? ` ${root.dataset.searchingLabel}` : '');
      empty.hidden = count > 0;
      if (updateHash) history.replaceState(null, '', `#${panels[active].id}`);
    }
    function filter() {
      query = input.value.trim().toLocaleLowerCase();
      questions.forEach((items, i) => {
        let matches = 0;
        items.forEach(item => {
          const match = !query || searchable.get(item).includes(query);
          item.hidden = !match;
          item.open = query ? match : initialOpen.get(item);
          highlight(item.querySelector('[data-pq-question-text]'), query && match ? query : '');
          highlight(item.querySelector('[data-pq-answer]'), query && match ? query : '');
          if (match) matches++;
        });
        buttons[i].textContent = `${panels[i].dataset.title}${query ? ` (${matches})` : ''}`;
      });
      if (questions[active].every(q => q.hidden)) {
        const first = questions.findIndex(items => items.some(q => !q.hidden));
        if (first >= 0) active = first;
      }
      select(active);
    }
    const reset = () => { clearTimeout(timer); input.value = ''; filter(); input.focus(); };
    listen(input, 'input', () => { clearTimeout(timer); timer = setTimeout(filter, 100); });
    listen(input, 'keydown', event => { if (event.key === 'Escape') { event.preventDefault(); reset(); } });
    listen(root.querySelector('form'), 'submit', event => { event.preventDefault(); clearTimeout(timer); filter(); });
    listen(root.querySelector('[data-pq-policy-clear]'), 'click', reset);
    const fromHash = () => {
      const index = panels.findIndex(panel => `#${panel.id}` === location.hash);
      if (index >= 0) {
        select(index);
        panels[index].scrollIntoView({ block: 'start', behavior: 'auto' });
      }
    };
    listen(window, 'hashchange', fromHash);
    listen(root, 'shopify:block:select', event => {
      const index = panels.findIndex(panel => panel === event.target || panel.contains(event.target));
      if (index < 0) return;
      input.value = ''; filter(); select(index);
      const item = event.target.closest('[data-pq-policy-question]');
      if (item) item.open = true;
    });
    root.querySelector('[data-pq-terms-tools]').hidden = false;
    filter(); fromHash();
    cleanups.set(root, () => { controller.abort(); clearTimeout(timer); });
  };

  const setupStory = root => {
    if (cleanups.has(root)) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const backgrounds = [...root.querySelectorAll('[data-pq-parallax]')];
    const visibleBackgrounds = new Set();
    let frame = 0;
    let backgroundObserver;
    const clear = () => {
      backgroundObserver?.disconnect();
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame); frame = 0; visibleBackgrounds.clear();
      backgrounds.forEach(el => el.style.removeProperty('--pq-parallax'));
    };
    const move = () => {
      frame = 0;
      visibleBackgrounds.forEach(el => {
        const rect = el.parentElement.getBoundingClientRect();
        const offset = Math.max(-24,Math.min(24,(innerHeight / 2 - rect.top - rect.height / 2) * .045));
        el.style.setProperty('--pq-parallax', `${offset.toFixed(1)}px`);
      });
    };
    function schedule() { if (!frame) frame = requestAnimationFrame(move); }
    const configure = () => {
      clear();
      if (preference.matches || !('IntersectionObserver' in window) || document.documentElement.classList.contains('shopify-design-mode')) return;
      backgroundObserver = new IntersectionObserver(entries => {
        entries.forEach(({target,isIntersecting}) => isIntersecting ? visibleBackgrounds.add(target) : visibleBackgrounds.delete(target)); schedule();
      });
      backgrounds.forEach(el => backgroundObserver.observe(el));
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
    };
    preference.addEventListener('change', configure);
    configure();
    cleanups.set(root, () => { clear(); preference.removeEventListener('change', configure); });
  };
  const initialize = (scope = document) => {
    scope.querySelectorAll('[data-pq-terms]').forEach(setupTerms);
    scope.querySelectorAll('[data-pq-story]').forEach(setupStory);
  };
  initialize();
  document.addEventListener('shopify:section:load', event => initialize(event.target));
  document.addEventListener('shopify:section:unload', event => event.target.querySelectorAll('[data-pq-terms],[data-pq-story]').forEach(root => { cleanups.get(root)?.(); cleanups.delete(root); }));
})();
