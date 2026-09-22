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
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const running = new WeakMap();
    let active = 0;
    let query = '';
    let timer;
    if (!panels.length) return;
    const resetQuestionMotion = item => {
      running.get(item)?.cancel();
      running.delete(item);
      item.getAnimations().forEach(animation => animation.cancel());
      item.querySelectorAll('[data-pq-answer],[data-pq-policy-flare]').forEach(element => element.getAnimations().forEach(animation => animation.cancel()));
      item.style.removeProperty('height');
      item.style.removeProperty('overflow');
      delete item.dataset.pqState;
    };
    const animateQuestion = (item, shouldOpen, flare = false) => {
      const summary = item.querySelector('summary');
      const answer = item.querySelector('[data-pq-answer]');
      const colorFlare = item.querySelector('[data-pq-policy-flare]');
      const startHeight = item.getBoundingClientRect().height;
      resetQuestionMotion(item);
      if (reducedMotion.matches || document.documentElement.classList.contains('shopify-design-mode')) {
        item.open = shouldOpen;
        return;
      }
      if (shouldOpen) item.open = true;
      item.dataset.pqState = shouldOpen ? 'opening' : 'closing';
      const endHeight = shouldOpen ? item.scrollHeight : summary.getBoundingClientRect().height;
      item.style.height = `${startHeight}px`;
      item.style.overflow = 'clip';
      const animation = item.animate(
        [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
        { duration: 260, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'both' }
      );
      running.set(item, animation);
      if (answer) {
        answer.animate(
          shouldOpen
            ? [{ opacity: 0, filter: 'blur(3px)', transform: 'translateY(-6px)' }, { opacity: 1, filter: 'blur(0)', transform: 'translateY(0)' }]
            : [{ opacity: 1, filter: 'blur(0)', transform: 'translateY(0)' }, { opacity: 0, filter: 'blur(2px)', transform: 'translateY(-4px)' }],
          { duration: shouldOpen ? 220 : 140, delay: shouldOpen ? 45 : 0, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'both' }
        );
      }
      if (shouldOpen && flare && colorFlare) {
        colorFlare.animate(
          [
            { opacity: 0, transform: 'translateX(-45%)' },
            { opacity: .92, transform: 'translateX(-8%)', offset: .34 },
            { opacity: 0, transform: 'translateX(38%)' }
          ],
          { duration: 680, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
        );
      }
      animation.onfinish = () => {
        if (running.get(item) !== animation) return;
        if (!shouldOpen) item.open = false;
        running.delete(item);
        item.style.removeProperty('height');
        item.style.removeProperty('overflow');
        delete item.dataset.pqState;
      };
    };
    questions.forEach(items => items.forEach(item => {
      const summary = item.querySelector('summary');
      listen(summary, 'click', event => {
        event.preventDefault();
        const shouldOpen = !(item.open && item.dataset.pqState !== 'closing');
        if (shouldOpen) items.forEach(other => {
          if (other !== item && other.open && other.dataset.pqState !== 'closing') animateQuestion(other, false);
        });
        animateQuestion(item, shouldOpen, shouldOpen);
      });
    }));
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
          resetQuestionMotion(item);
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
      if (item) animateQuestion(item, true, true);
    });
    root.querySelector('[data-pq-terms-tools]').hidden = false;
    filter(); fromHash();
    cleanups.set(root, () => { controller.abort(); clearTimeout(timer); questions.flat().forEach(resetQuestionMotion); });
  };

  const setupStory = root => {
    if (cleanups.has(root)) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const backgrounds = [...root.querySelectorAll('[data-pq-parallax]')];
    const accordions = [...root.querySelectorAll('[data-pq-about-accordion]')];
    const controller = new AbortController();
    const { signal } = controller;
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
    accordions.forEach(accordion => accordion.addEventListener('toggle', () => {
      if (!accordion.open) return;
      accordions.forEach(other => { if (other !== accordion) other.open = false; });
      schedule();
    }, { signal }));
    root.addEventListener('shopify:block:select', event => {
      const accordion = event.target.closest('[data-pq-about-accordion]');
      if (!accordion) return;
      accordion.open = true;
      accordion.scrollIntoView({ block: 'center', behavior: preference.matches ? 'auto' : 'smooth' });
    }, { signal });
    configure();
    cleanups.set(root, () => { clear(); controller.abort(); preference.removeEventListener('change', configure); });
  };
  const initialize = (scope = document) => {
    scope.querySelectorAll('[data-pq-terms]').forEach(setupTerms);
    scope.querySelectorAll('[data-pq-story]').forEach(setupStory);
  };
  initialize();
  document.addEventListener('shopify:section:load', event => initialize(event.target));
  document.addEventListener('shopify:section:unload', event => event.target.querySelectorAll('[data-pq-terms],[data-pq-story]').forEach(root => { cleanups.get(root)?.(); cleanups.delete(root); }));
})();
