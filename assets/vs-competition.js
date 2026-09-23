(() => {
  'use strict';

  // One normalized specification map serves Product metafields and competitor metaobjects.
  const specs = [
    { key: 'continuous_motor_power', metaKey: 'continuousMotorPower', label: 'Continuous / Rated Motor Power', unit: 'W', group: 'Performance', area: 'power', comparisonMode: 'higher', displayKey: 'continuous_motor_power_display' },
    { key: 'peak_motor_power', metaKey: 'peakMotorPower', label: 'Peak Motor Power', unit: 'W', group: 'Performance', area: 'power', priority: 1, comparisonMode: 'higher', displayKey: 'peak_motor_power_display' },
    { key: 'maximum_speed', metaKey: 'maximumSpeed', label: 'Maximum Speed', unit: 'km/h', group: 'Performance', area: 'speed', priority: 2, comparisonMode: 'higher', displayKey: 'maximum_speed_display' },
    { key: 'maximum_climbing_ability', metaKey: 'maximumClimbingAbility', label: 'Maximum Climbing Ability', unit: '°', group: 'Performance', area: 'climbing', comparisonMode: 'higher', displayKey: 'maximum_climbing_ability_display' },
    { key: 'battery_voltage', metaKey: 'batteryVoltage', label: 'Battery Voltage', unit: 'V', group: 'Battery & range', area: 'battery', comparisonMode: 'none', difference: false, displayKey: 'battery_voltage_display' },
    { key: 'battery_energy', metaKey: 'batteryEnergy', label: 'Battery Energy', unit: 'kWh', group: 'Battery & range', area: 'battery', digits: 2, priority: 3, comparisonMode: 'higher', displayKey: 'battery_energy_display' },
    { key: 'battery_capacity', metaKey: 'batteryCapacity', label: 'Battery Capacity', unit: 'Ah', group: 'Battery & range', area: 'battery', priority: 4, comparisonMode: 'higher', displayKey: 'battery_capacity_display' },
    { key: 'claimed_range', metaKey: 'claimedRange', label: 'Claimed Eco / Range', unit: 'km', group: 'Battery & range', area: 'range', comparisonMode: 'higher', displayKey: 'claimed_range_display' },
    { key: 'charger', metaKey: 'charger', label: 'Charger', group: 'Battery & range', area: 'battery', comparisonMode: 'none', difference: false, parts: ['charger_voltage', 'charger_amperage'], units: ['V', 'A'], displayKey: 'charger_display' },
    { key: 'maximum_load', metaKey: 'maximumLoad', label: 'Maximum Load', unit: 'kg', group: 'Chassis', area: 'load', priority: 5, comparisonMode: 'higher', displayKey: 'maximum_load_display' },
    { key: 'ready_to_ride_weight', metaKey: 'readyWeight', label: 'Ready-to-Ride Weight', unit: 'kg', group: 'Chassis', area: 'load', priority: 6, comparisonMode: 'lower', displayKey: 'ready_to_ride_weight_display' },
    { key: 'wheels', metaKey: 'wheelSize', label: 'Wheel Size (front / rear)', group: 'Chassis', area: 'chassis', comparisonMode: 'none', difference: false, parts: ['front_wheel_size', 'rear_wheel_size'], units: ['"', '"'], displayKey: 'wheel_size_display' }
  ];
  // Fixed visualization ranges keep comparisons stable when a model changes.
  const radarMetrics = [
    { area: 'power', label: 'POWER', key: 'peak_motor_power', min: 0, max: 15000 },
    { area: 'speed', label: 'SPEED', key: 'maximum_speed', min: 0, max: 120 },
    { area: 'range', label: 'RANGE', key: 'claimed_range', min: 0, max: 200 },
    { area: 'battery', label: 'BATTERY', key: 'battery_energy', min: 0, max: 5 },
    { area: 'load', label: 'LOAD', key: 'maximum_load', min: 0, max: 200 },
    { area: 'climbing', label: 'CLIMBING', key: 'maximum_climbing_ability', min: 0, max: 50 }
  ];
  const number = (value) => {
    if (value === null || value === undefined || typeof value === 'boolean' || String(value).trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const format = (value, digits = 0) => new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 2) }).format(value);
  const withUnit = (value, unit, digits = 0) => value === null ? '—' : `${format(value, digits)}${['°', '"'].includes(unit) ? '' : ' '}${unit}`;
  const safeUrl = (value) => {
    if (!value) return null;
    try {
      const url = new URL(value, window.location.origin);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  };
  const parseDetails = (value) => {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return {}; }
  };

  function normalize(record) {
    const fields = record.fields || {};
    const details = parseDetails(record.details);
    const normalized = {};
    for (const spec of specs) {
      const meta = details.coreMeta?.[spec.metaKey] || {};
      if (spec.parts) {
        const values = spec.parts.map((key) => number(fields[key]));
        const fallback = values.every((value) => value === null) ? '—' : values.map((value, index) => withUnit(value, spec.units[index])).join(' / ');
        normalized[spec.key] = { value: null, plotValue: null, unit: null, display: fields[spec.displayKey] || fallback, comparable: false };
        continue;
      }
      const numeric = number(fields[spec.key]);
      const display = fields[spec.displayKey] || withUnit(numeric, spec.unit, spec.digits);
      const bounded = /^[<>≤≥~≈]/.test(String(display).trim()) || /^(less|more|up to|over|under)\b/i.test(String(display).trim());
      const comparable = numeric !== null && !bounded && meta.comparable !== false;
      normalized[spec.key] = { value: comparable ? numeric : null, plotValue: numeric, unit: spec.unit, display, bounded, comparable, qualifier: meta.qualifier || null };
    }
    for (const [key, source] of Object.entries(details.specs || {})) {
      const numeric = number(source.value);
      normalized[key] = {
        value: numeric,
        plotValue: numeric,
        unit: source.unit || null,
        display: source.display || (numeric === null ? '—' : withUnit(numeric, source.unit || '')),
        comparable: numeric !== null && source.comparable !== false,
        extended: true
      };
    }
    return {
      ...record,
      details,
      sourceUrl: safeUrl(record.sourceUrl),
      specs: normalized,
      price: { amount: number(record.price?.amount), currency: record.price?.currency || null },
      competitorHandles: Array.isArray(record.competitorHandles) ? record.competitorHandles : []
    };
  }

  function difference(spec, left, right) {
    const a = left.specs[spec.key], b = right.specs[spec.key];
    if (!a || !b || spec.parts || spec.difference === false || a.value === null || b.value === null || a.unit !== b.unit) return null;
    const delta = Math.round((a.value - b.value) * 100) / 100;
    return `${delta > 0 ? '+' : ''}${withUnit(delta, a.unit || '', spec.digits)}`.trim();
  }
  function winner(spec, left, right) {
    if (!spec || spec.comparisonMode === 'none') return null;
    const a = left.specs[spec.key], b = right.specs[spec.key];
    if (!a || !b || a.value === null || b.value === null || a.value === b.value || a.unit !== b.unit) return null;
    if (spec.comparisonMode === 'lower') return a.value < b.value ? 'panquire' : 'competitor';
    return a.value > b.value ? 'panquire' : 'competitor';
  }
  function score(metric, record) {
    const value = record.specs[metric.key]?.plotValue;
    return value === null || value === undefined ? null : Math.max(0, Math.min(100, (value - metric.min) / (metric.max - metric.min) * 100));
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { specs, radarMetrics, number, normalize, difference, winner, score };
  if (typeof customElements === 'undefined' || customElements.get('pq-comparison')) return;

  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const svgElement = (tag, attrs = {}, text) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const point = (index, percent, count) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
    return [220 + Math.cos(angle) * 128 * percent / 100, 195 + Math.sin(angle) * 128 * percent / 100];
  };

  class ComparisonSelect {
    constructor(root, owner, onChange, signal) {
      this.root = root;
      this.owner = owner;
      this.onChange = onChange;
      this.trigger = root.querySelector('[data-select-trigger]');
      this.valueNode = root.querySelector('[data-select-value]');
      this.list = root.querySelector('[data-select-list]');
      this.trigger.addEventListener('click', () => this.isOpen ? this.close() : this.open(false), { signal });
      this.trigger.addEventListener('keydown', (event) => this.onTriggerKey(event), { signal });
      this.list.addEventListener('keydown', (event) => this.onListKey(event), { signal });
      this.list.addEventListener('click', (event) => {
        const option = event.target.closest('[role="option"]');
        if (option) this.choose(option.dataset.value);
      }, { signal });
      this.root.addEventListener('mouseleave', () => this.close(), { signal });
    }

    setOptions(records, preferred) {
      this.records = records;
      this.value = records.some((record) => record.handle === preferred) ? preferred : (records[0]?.handle || '');
      this.list.replaceChildren(...records.map((record, index) => {
        const option = element('button', undefined, 'pq-compare__select-option');
        option.type = 'button';
        option.id = `${this.list.id}-option-${index}`;
        option.setAttribute('role', 'option');
        option.dataset.value = record.handle;
        option.tabIndex = -1;
        option.append(element('span', record.name));
        const check = svgElement('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true' });
        check.append(svgElement('path', { d: 'm5 10 3 3 7-7' }));
        option.append(check);
        return option;
      }));
      this.sync();
      this.close();
    }

    setValue(value) {
      if (this.records?.some((record) => record.handle === value)) this.value = value;
      this.sync();
    }

    sync() {
      const selected = this.records?.find((record) => record.handle === this.value);
      this.valueNode.textContent = selected?.name || 'No models available';
      this.list.querySelectorAll('[role="option"]').forEach((option) => option.setAttribute('aria-selected', String(option.dataset.value === this.value)));
    }

    open(fromKeyboard) {
      if (!this.records?.length) return;
      this.owner.closeSelects(this);
      this.isOpen = true;
      this.root.dataset.open = 'true';
      this.trigger.setAttribute('aria-expanded', 'true');
      if (fromKeyboard) requestAnimationFrame(() => (this.list.querySelector('[aria-selected="true"]') || this.list.firstElementChild)?.focus());
    }

    close(restoreFocus = false) {
      if (!this.isOpen) return;
      this.isOpen = false;
      delete this.root.dataset.open;
      this.trigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus) this.trigger.focus();
    }

    choose(value) {
      if (!this.records?.some((record) => record.handle === value)) return;
      const changed = this.value !== value;
      this.value = value;
      this.sync();
      this.close(true);
      if (changed) this.onChange(value);
    }

    onTriggerKey(event) {
      if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      this.open(true);
    }

    onListKey(event) {
      const options = [...this.list.querySelectorAll('[role="option"]')];
      const current = options.indexOf(document.activeElement);
      if (event.key === 'Escape') { event.preventDefault(); this.close(true); return; }
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (current >= 0) this.choose(options[current].dataset.value); return; }
      let next = current;
      if (event.key === 'ArrowDown') next = Math.min(options.length - 1, current + 1);
      else if (event.key === 'ArrowUp') next = Math.max(0, current - 1);
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = options.length - 1;
      else return;
      event.preventDefault();
      options[next]?.focus();
    }
  }

  class Comparison extends HTMLElement {
    connectedCallback() {
      this.abort?.abort();
      this.abort = new AbortController();
      const { signal } = this.abort;
      try { this.config = JSON.parse(this.querySelector('[data-comparison-data]').textContent); }
      catch { this.querySelector('[data-status]').textContent = 'Comparison data is unavailable. Please try again later.'; return; }
      this.records = { panquire: this.config.products.map(normalize).filter((record) => record.ready !== false), competitor: this.config.competitors.map(normalize).filter((record) => record.ready !== false) };
      this.selects = {};
      for (const side of ['panquire', 'competitor']) {
        const root = this.querySelector(`[data-selector="${side}"]`);
        this.selects[side] = new ComparisonSelect(root, this, () => this.handleSelection(side), signal);
        const image = this.querySelector(`[data-product="${side}"] [data-image]`);
        image.addEventListener('error', () => {
          image.hidden = true;
          this.querySelector(`[data-product="${side}"] [data-placeholder]`).hidden = false;
        }, { signal });
      }
      document.addEventListener('pointerdown', (event) => {
        for (const select of Object.values(this.selects)) if (!select.root.contains(event.target)) select.close();
      }, { signal });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') Object.values(this.selects).forEach((select) => select.close(true));
      }, { signal });
      this.addEventListener('click', (event) => {
        const target = event.target.closest('[data-metric], [data-reset]');
        if (!target) return;
        this.area = target.hasAttribute('data-reset') || this.area === target.dataset.metric ? null : target.dataset.metric;
        this.renderTables();
        this.updateMetricButtons();
        this.querySelector('[data-status]').textContent = this.area ? `${this.area} specifications shown.` : 'Biggest differences shown.';
      }, { signal });
      this.querySelector('details').addEventListener('toggle', () => {
        if (this.querySelector('details').open) this.animateChange(this.querySelector('[data-full-specs]'));
      }, { signal });
      window.addEventListener('popstate', () => this.readUrl(), { signal });
      this.readUrl();
    }

    disconnectedCallback() { this.abort?.abort(); cancelAnimationFrame(this.radarFrame); }

    closeSelects(except) {
      Object.values(this.selects).forEach((select) => { if (select !== except) select.close(); });
    }

    allowedCompetitors(product) {
      return (product?.competitorHandles || []).map((handle) => this.records.competitor.find((record) => record.handle === handle)).filter(Boolean);
    }

    readUrl() {
      const params = new URLSearchParams(window.location.search);
      this.selects.panquire.setOptions(this.records.panquire, params.get('panquire') || this.config.defaults.panquire || 't-01');
      const product = this.records.panquire.find((record) => record.handle === this.selects.panquire.value);
      const allowed = this.allowedCompetitors(product);
      this.selects.competitor.setOptions(allowed, params.get('competitor') || this.config.defaults.competitor || allowed[0]?.handle);
      this.render(false);
    }

    handleSelection(side) {
      this.area = null;
      if (side === 'panquire') {
        const product = this.records.panquire.find((record) => record.handle === this.selects.panquire.value);
        const allowed = this.allowedCompetitors(product);
        this.selects.competitor.setOptions(allowed, allowed[0]?.handle);
      }
      this.render(true);
      this.writeUrl();
    }

    writeUrl() {
      const url = new URL(window.location.href);
      url.searchParams.set('panquire', this.selects.panquire.value);
      if (this.selects.competitor.value) url.searchParams.set('competitor', this.selects.competitor.value);
      else url.searchParams.delete('competitor');
      window.history.replaceState(window.history.state, '', url);
    }

    animateChange(node) {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && node.animate) node.animate([{ opacity: .45, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
    }

    render(animate) {
      this.selected = {};
      for (const side of ['panquire', 'competitor']) {
        const record = this.records[side].find((item) => item.handle === this.selects[side].value) || normalize({ name: 'No comparison available', fields: {} });
        this.selected[side] = record;
        const product = this.querySelector(`[data-product="${side}"]`);
        const image = product.querySelector('[data-image]');
        const imageUrl = safeUrl(record.image?.src);
        image.hidden = !imageUrl;
        product.querySelector('[data-placeholder]').hidden = !!imageUrl;
        if (imageUrl) {
          image.alt = record.image.alt || record.name;
          image.srcset = [record.image.small && `${safeUrl(record.image.small)} 400w`, record.image.medium && `${safeUrl(record.image.medium)} 700w`, `${imageUrl} 1000w`].filter(Boolean).join(', ');
          image.src = imageUrl;
        } else { image.removeAttribute('src'); image.removeAttribute('srcset'); }
        const price = product.querySelector('[data-price]');
        if (price) {
          price.replaceChildren();
          if (record.price.amount === null || record.price.amount <= 0 || !record.price.currency) price.textContent = '—';
          else {
            let formatted;
            try { formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: record.price.currency, maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(record.price.amount); }
            catch { formatted = `${format(record.price.amount)} ${record.price.currency}`; }
            price.append(element('small', 'from'), document.createTextNode(formatted));
          }
        }
        const source = product.querySelector('[data-source]');
        if (source) { source.hidden = !record.sourceUrl; if (record.sourceUrl) source.href = record.sourceUrl; else source.removeAttribute('href'); }
        this.querySelector(`[data-legend="${side}"]`).textContent = record.name;
        product.querySelector('[data-availability]').textContent = this.hasSpecifications(record) ? '' : 'Specifications coming soon';
      }
      this.renderTables();
      this.renderRadar(animate);
      this.querySelector('[data-status]').textContent = `${this.selected.panquire.name} compared with ${this.selected.competitor.name}. Specifications updated.`;
      if (animate) this.animateChange(this.querySelector('[data-differences]'));
    }

    hasSpecifications(record) { return Object.values(record.specs).some((entry) => entry.display !== '—'); }

    specificationConfigs() {
      const map = new Map(specs.map((spec) => [spec.key, spec]));
      for (const record of Object.values(this.selected)) {
        for (const [key, source] of Object.entries(record.details?.specs || {})) {
          if (!map.has(key)) map.set(key, { key, label: source.label || key, group: source.group || 'Additional details', area: source.area || 'details', comparisonMode: source.comparisonMode || 'none', unit: source.unit || null, digits: source.digits || 0, extended: true });
        }
      }
      return [...map.values()];
    }

    sharedSpecifications() {
      const left = this.selected.panquire, right = this.selected.competitor;
      return this.specificationConfigs().filter((spec) => left.specs[spec.key]?.display !== '—' && right.specs[spec.key]?.display !== '—');
    }

    renderTables() {
      const left = this.selected.panquire, right = this.selected.competitor;
      const present = this.sharedSpecifications();
      const prioritized = [...present].sort((a, b) => (a.priority || 99) - (b.priority || 99));
      const differences = prioritized.filter((spec) => difference(spec, left, right) !== null && left.specs[spec.key].value !== right.specs[spec.key].value);
      const rows = this.area ? present.filter((spec) => spec.area === this.area) : (differences.length ? differences : prioritized).slice(0, this.config.count || 6);
      const metric = radarMetrics.find((item) => item.area === this.area);
      this.querySelector('[data-table-title]').textContent = metric ? `${metric.label} SPECIFICATIONS` : 'BIGGEST DIFFERENCES';
      this.querySelector('[data-reset]').hidden = !this.area;
      this.fillTable(this.querySelector('[data-differences]'), rows, true);
      this.fillTable(this.querySelector('[data-full-specs]'), present, false);
    }

    fillTable(table, rows, margins) {
      const left = this.selected.panquire, right = this.selected.competitor;
      const caption = element('caption', `${left.name} vs ${right.name}: ${margins ? 'selected specifications' : 'all shared specifications'}`, 'visually-hidden');
      const head = element('thead');
      const header = element('tr');
      for (const name of ['Specification', left.name, right.name, ...(margins ? ['Difference'] : [])]) {
        const th = element('th', name); th.scope = 'col'; header.append(th);
      }
      head.append(header);
      const body = element('tbody');
      let group;
      for (const spec of rows) {
        if (!margins && group !== spec.group) {
          group = spec.group;
          const row = element('tr', undefined, 'pq-compare__group'), th = element('th', group);
          th.colSpan = 3; th.scope = 'colgroup'; row.append(th); body.append(row);
        }
        const row = element('tr'), heading = element('th', spec.label);
        heading.scope = 'row';
        const winningSide = winner(spec, left, right);
        const leftCell = element('td', left.specs[spec.key].display, `pq-compare__value pq-compare__value--panquire${winningSide === 'panquire' ? ' is-winner' : ''}`);
        const rightCell = element('td', right.specs[spec.key].display, `pq-compare__value pq-compare__value--competitor${winningSide === 'competitor' ? ' is-winner' : ''}`);
        row.append(heading, leftCell, rightCell);
        if (margins) {
          const cell = element('td'), delta = difference(spec, left, right);
          if (delta !== null) cell.append(element('span', delta, 'pq-compare__delta')); else cell.textContent = '—';
          row.append(cell);
        }
        body.append(row);
      }
      if (!rows.length) { const row = element('tr'), cell = element('td', 'No directly comparable specifications are available for this view.'); cell.colSpan = margins ? 4 : 3; row.append(cell); body.append(row); }
      table.replaceChildren(caption, head, body);
    }

    updateMetricButtons() {
      this.querySelectorAll('button[data-metric]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.metric === this.area)));
    }

    renderMetricButtons(metrics) {
      const controls = this.querySelector('[data-metrics]');
      if (!controls) return;
      controls.replaceChildren(...metrics.map((metric) => {
        const button = element('button', metric.label);
        button.type = 'button';
        button.dataset.metric = metric.area;
        button.setAttribute('aria-pressed', String(metric.area === this.area));
        return button;
      }));
    }

    renderRadar(animate) {
      const svg = this.querySelector('[data-radar]');
      if (!svg) return;
      cancelAnimationFrame(this.radarFrame);
      const metrics = radarMetrics.filter((metric) => score(metric, this.selected.panquire) !== null && score(metric, this.selected.competitor) !== null);
      this.renderMetricButtons(metrics);
      const target = Object.fromEntries(['panquire', 'competitor'].map((side) => [side, Object.fromEntries(metrics.map((metric) => [metric.area, score(metric, this.selected[side])]))]));
      const previous = this.radarScores || target;
      this.radarScores = target;
      svg.replaceChildren(svgElement('title', {}, `${this.selected.panquire.name} vs ${this.selected.competitor.name}`));
      if (metrics.length < 3) {
        svg.append(svgElement('text', { x: 220, y: 195, 'text-anchor': 'middle', class: 'pq-compare__chart-empty' }, 'Not enough shared radar data'));
      } else {
        for (const level of [20, 40, 60, 80, 100]) svg.append(svgElement('polygon', { points: metrics.map((_, index) => point(index, level, metrics.length).join(',')).join(' '), class: 'pq-compare__radar-grid' }));
        metrics.forEach((metric, index) => {
          const [x, y] = point(index, 100, metrics.length), [tx, ty] = point(index, 126, metrics.length);
          svg.append(svgElement('line', { x1: 220, y1: 195, x2: x, y2: y, class: 'pq-compare__radar-grid' }));
          svg.append(svgElement('text', { x: tx, y: ty + 4, 'text-anchor': 'middle', class: 'pq-compare__chart-label', 'data-metric': metric.area, cursor: 'pointer' }, metric.label));
        });
        const layers = Object.fromEntries(['panquire', 'competitor'].map((side) => { const layer = svgElement('g'); svg.append(layer); return [side, layer]; }));
        const draw = (progress) => {
          for (const side of ['panquire', 'competitor']) {
            const positions = metrics.map((metric, index) => {
              const value = target[side][metric.area];
              const from = previous[side]?.[metric.area] ?? value;
              return point(index, from + (value - from) * progress, metrics.length);
            });
            const nodes = [svgElement('polygon', { points: positions.map((position) => position.join(',')).join(' '), class: `pq-compare__radar-area pq-compare__radar-area--${side}` })];
            positions.forEach((position, index) => {
              const dot = svgElement('circle', { cx: position[0], cy: position[1], r: 3.5, class: `pq-compare__radar-point--${side}` });
              dot.append(svgElement('title', {}, `${this.selected[side].name}: ${this.selected[side].specs[metrics[index].key].display}`));
              nodes.push(dot);
            });
            layers[side].replaceChildren(...nodes);
          }
        };
        if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const start = performance.now();
          const tick = (now) => { const progress = Math.min(1, (now - start) / 240); draw(1 - (1 - progress) ** 3); if (progress < 1) this.radarFrame = requestAnimationFrame(tick); };
          this.radarFrame = requestAnimationFrame(tick);
        } else draw(1);
      }
      const notes = ['Fixed scales. Radar includes only metrics available for both bikes.'];
      for (const side of ['panquire', 'competitor']) {
        for (const metric of metrics) {
          const entry = this.selected[side].specs[metric.key];
          if (entry.plotValue !== null && entry.value === null && entry.qualifier) notes.push(`${this.selected[side].name}: ${entry.display} uses a separate plotting helper (${entry.qualifier}).`);
        }
      }
      this.querySelector('[data-chart-note]').textContent = notes.join(' ');
      this.updateMetricButtons();
    }
  }
  customElements.define('pq-comparison', Comparison);
})();
