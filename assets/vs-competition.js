(() => {
  'use strict';

  // One canonical specification map for both server-side data sources.
  const specs = [
    { key: 'continuous_motor_power', label: 'Continuous / Rated Motor Power', unit: 'W', group: 'Performance', area: 'power' },
    { key: 'peak_motor_power', label: 'Peak Motor Power', unit: 'W', group: 'Performance', area: 'power', priority: 1 },
    { key: 'maximum_speed', label: 'Maximum Speed', unit: 'km/h', group: 'Performance', area: 'speed', priority: 2 },
    { key: 'maximum_climbing_ability', label: 'Maximum Climbing Ability', unit: '°', group: 'Performance', area: 'climbing', displayKey: 'maximum_climbing_ability_display' },
    { key: 'battery_voltage', label: 'Battery Voltage', unit: 'V', group: 'Battery & range', area: 'battery' },
    { key: 'battery_energy', label: 'Battery Energy', unit: 'kWh', group: 'Battery & range', area: 'battery', digits: 2, priority: 3 },
    { key: 'battery_capacity', label: 'Battery Capacity', unit: 'Ah', group: 'Battery & range', area: 'battery', priority: 4 },
    { key: 'claimed_range', label: 'Claimed Eco / Range', unit: 'km', group: 'Battery & range', area: 'range', displayKey: 'claimed_range_display', difference: false },
    { key: 'charger', label: 'Charger', group: 'Battery & range', area: 'battery', parts: ['charger_voltage', 'charger_amperage'], units: ['V', 'A'] },
    { key: 'maximum_load', label: 'Maximum Load', unit: 'kg', group: 'Chassis', area: 'load', priority: 5 },
    { key: 'ready_to_ride_weight', label: 'Ready-to-Ride Weight', unit: 'kg', group: 'Chassis', area: 'load', priority: 6 },
    { key: 'wheels', label: 'Wheel Size (front / rear)', group: 'Chassis', area: 'chassis', parts: ['front_wheel_size', 'rear_wheel_size'], units: ['"', '"'] }
  ];
  // Fixed visualization ranges, never specifications or pair-relative scales.
  const radarMetrics = [
    { area: 'power', label: 'POWER', key: 'peak_motor_power', min: 0, max: 15000 },
    { area: 'speed', label: 'SPEED', key: 'maximum_speed', min: 0, max: 120 },
    { area: 'range', label: 'RANGE', key: 'claimed_range', min: 0, max: 150 },
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

  function normalize(record) {
    const fields = record.fields || {};
    const normalized = {};
    for (const spec of specs) {
      if (spec.parts) {
        const values = spec.parts.map((key) => number(fields[key]));
        normalized[spec.key] = { value: null, plotValue: null, unit: null, display: values.every((v) => v === null) ? '—' : values.map((v, i) => withUnit(v, spec.units[i])).join(' / ') };
        continue;
      }
      const numeric = number(fields[spec.key]);
      const display = spec.displayKey && fields[spec.displayKey] ? String(fields[spec.displayKey]) : withUnit(numeric, spec.unit, spec.digits);
      const bounded = /^[<>≤≥~≈]/.test(display.trim());
      normalized[spec.key] = { value: bounded ? null : numeric, plotValue: numeric, unit: spec.unit, display, bounded };
    }
    return { ...record, sourceUrl: safeUrl(record.sourceUrl), specs: normalized, price: { amount: number(record.price?.amount), currency: record.price?.currency || null } };
  }

  function difference(spec, left, right) {
    const a = left.specs[spec.key], b = right.specs[spec.key];
    if (spec.parts || spec.difference === false || a.value === null || b.value === null || a.unit !== b.unit) return null;
    const delta = Math.round((a.value - b.value) * 100) / 100;
    return `${delta > 0 ? '+' : ''}${withUnit(delta, a.unit, spec.digits)}`;
  }
  function score(metric, record) {
    const value = record.specs[metric.key].plotValue;
    return value === null ? null : Math.max(0, Math.min(100, (value - metric.min) / (metric.max - metric.min) * 100));
  }

  // Export only in Node for focused data-integrity regression tests.
  if (typeof module !== 'undefined' && module.exports) module.exports = { specs, radarMetrics, number, normalize, difference, score };
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
  const point = (i, percent) => {
    const angle = -Math.PI / 2 + i * Math.PI / 3;
    return [220 + Math.cos(angle) * 130 * percent / 100, 195 + Math.sin(angle) * 130 * percent / 100];
  };

  class Comparison extends HTMLElement {
    connectedCallback() {
      this.abort?.abort();
      this.abort = new AbortController();
      const { signal } = this.abort;
      try { this.config = JSON.parse(this.querySelector('[data-comparison-data]').textContent); }
      catch { this.querySelector('[data-status]').textContent = 'Comparison data is unavailable. Please try again later.'; return; }
      this.records = { panquire: this.config.products.map(normalize), competitor: this.config.competitors.map(normalize) };
      this.selectors = Object.fromEntries(['panquire', 'competitor'].map((side) => [side, this.querySelector(`[data-selector="${side}"]`)]));
      for (const side of ['panquire', 'competitor']) {
        this.selectors[side].replaceChildren(...this.records[side].map((record) => {
          const option = element('option', record.name + (record.ready === false ? ' — coming soon' : ''));
          option.value = record.handle;
          option.disabled = record.ready === false;
          return option;
        }));
        this.selectors[side].addEventListener('change', () => { this.render(true); this.writeUrl(); }, { signal });
        this.querySelector(`[data-product="${side}"] [data-image]`).addEventListener('error', () => {
          this.querySelector(`[data-product="${side}"] [data-image]`).hidden = true;
          this.querySelector(`[data-product="${side}"] [data-placeholder]`).hidden = false;
        }, { signal });
      }
      const controls = this.querySelector('[data-metrics]');
      if (controls) {
        controls.replaceChildren(...radarMetrics.map((metric) => {
          const button = element('button', metric.label);
          button.type = 'button';
          button.dataset.metric = metric.area;
          button.setAttribute('aria-pressed', 'false');
          return button;
        }));
      }
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

    readUrl() {
      const params = new URLSearchParams(window.location.search);
      for (const side of ['panquire', 'competitor']) {
        const available = this.records[side].filter((r) => r.ready !== false);
        const choices = [params.get(side), this.config.defaults[side], side === 'panquire' ? 't-01' : 'light-bee-x'];
        const chosen = choices.map((handle) => available.find((r) => r.handle === handle)).find(Boolean) || available[0];
        this.selectors[side].value = chosen?.handle || '';
      }
      this.render(false);
    }

    writeUrl() {
      const url = new URL(window.location.href);
      for (const side of ['panquire', 'competitor']) url.searchParams.set(side, this.selectors[side].value);
      window.history.replaceState(window.history.state, '', url);
    }

    animateChange(node) {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && node.animate) node.animate([{ opacity: .5 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    }

    render(animate) {
      this.selected = {};
      for (const side of ['panquire', 'competitor']) {
        const record = this.records[side].find((r) => r.handle === this.selectors[side].value) || normalize({ name: 'No comparison available', fields: {} });
        this.selected[side] = record;
        const product = this.querySelector(`[data-product="${side}"]`);
        const img = product.querySelector('[data-image]');
        const imageUrl = safeUrl(record.image?.src);
        img.hidden = !imageUrl;
        product.querySelector('[data-placeholder]').hidden = !!imageUrl;
        if (imageUrl) {
          img.alt = record.image.alt || record.name;
          img.srcset = [record.image.small && `${safeUrl(record.image.small)} 400w`, record.image.medium && `${safeUrl(record.image.medium)} 700w`, `${imageUrl} 1000w`].filter(Boolean).join(', ');
          img.src = imageUrl;
        } else { img.removeAttribute('src'); img.removeAttribute('srcset'); }
        const price = product.querySelector('[data-price]');
        if (price) {
          price.replaceChildren();
          if (record.price.amount === null || !record.price.currency) price.textContent = '—';
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
        const hasSpecs = Object.values(record.specs).some((spec) => spec.display !== '—');
        product.querySelector('[data-availability]').textContent = hasSpecs ? '' : 'Specifications coming soon';
      }
      this.renderTables();
      this.renderRadar(animate);
      this.updateMetricButtons();
      this.querySelector('[data-status]').textContent = `${this.selected.panquire.name} compared with ${this.selected.competitor.name}. Specifications updated.`;
      if (animate) this.animateChange(this.querySelector('[data-differences]'));
    }

    renderTables() {
      const left = this.selected.panquire, right = this.selected.competitor;
      const present = specs.filter((spec) => left.specs[spec.key].display !== '—' || right.specs[spec.key].display !== '—');
      const prioritized = [...present].sort((a, b) => (a.priority || 99) - (b.priority || 99));
      const differences = prioritized.filter((spec) => {
        const a = left.specs[spec.key].value, b = right.specs[spec.key].value;
        return difference(spec, left, right) !== null && a !== b;
      });
      const rows = this.area ? present.filter((spec) => spec.area === this.area) : (differences.length ? differences : prioritized).slice(0, this.config.count || 6);
      const metric = radarMetrics.find((m) => m.area === this.area);
      this.querySelector('[data-table-title]').textContent = metric ? `${metric.label} SPECIFICATIONS` : 'BIGGEST DIFFERENCES';
      this.querySelector('[data-reset]').hidden = !this.area;
      this.fillTable(this.querySelector('[data-differences]'), rows, true);
      this.fillTable(this.querySelector('[data-full-specs]'), present, false);
    }

    fillTable(table, rows, margins) {
      const left = this.selected.panquire, right = this.selected.competitor;
      const caption = element('caption', `${left.name} vs ${right.name}: ${margins ? 'selected specifications' : 'all specifications'}`, 'visually-hidden');
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
        row.append(heading, element('td', left.specs[spec.key].display), element('td', right.specs[spec.key].display));
        if (margins) {
          const td = element('td'), delta = difference(spec, left, right);
          if (delta !== null) td.append(element('span', delta, 'pq-compare__delta')); else td.textContent = '—';
          row.append(td);
        }
        body.append(row);
      }
      if (!rows.length) { const row = element('tr'), td = element('td', 'Specifications for this area are not available yet.'); td.colSpan = margins ? 4 : 3; row.append(td); body.append(row); }
      table.replaceChildren(caption, head, body);
    }

    updateMetricButtons() {
      this.querySelectorAll('button[data-metric]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.metric === this.area)));
    }

    renderRadar(animate) {
      const svg = this.querySelector('[data-radar]');
      if (!svg) return;
      cancelAnimationFrame(this.radarFrame);
      const target = ['panquire', 'competitor'].map((side) => radarMetrics.map((metric) => score(metric, this.selected[side])));
      const previous = this.radarValues || target;
      this.radarValues = target;
      svg.replaceChildren(svgElement('title', {}, `${this.selected.panquire.name} vs ${this.selected.competitor.name}`));
      for (const level of [20, 40, 60, 80, 100]) svg.append(svgElement('polygon', { points: radarMetrics.map((_, i) => point(i, level).join(',')).join(' '), class: 'pq-compare__radar-grid' }));
      radarMetrics.forEach((metric, i) => {
        const [x, y] = point(i, 100), [tx, ty] = point(i, 128);
        svg.append(svgElement('line', { x1: 220, y1: 195, x2: x, y2: y, class: 'pq-compare__radar-grid' }));
        const label = svgElement('text', { x: tx, y: ty + 4, 'text-anchor': 'middle', class: 'pq-compare__chart-label', 'data-metric': metric.area, cursor: 'pointer' }, metric.label);
        svg.append(label);
      });
      const layers = ['panquire', 'competitor'].map(() => { const layer = svgElement('g'); svg.append(layer); return layer; });
      const draw = (progress) => {
        target.forEach((values, side) => {
          const name = side ? 'competitor' : 'panquire';
          const positions = values.map((value, i) => value === null ? null : point(i, previous[side][i] === null ? value : previous[side][i] + (value - previous[side][i]) * progress));
          const nodes = [];
          if (positions.every(Boolean)) nodes.push(svgElement('polygon', { points: positions.map((p) => p.join(',')).join(' '), class: `pq-compare__radar-area pq-compare__radar-area--${name}` }));
          else positions.forEach((p, i) => { const next = positions[(i + 1) % positions.length]; if (p && next) nodes.push(svgElement('line', { x1: p[0], y1: p[1], x2: next[0], y2: next[1], class: `pq-compare__radar-area pq-compare__radar-area--${name}` })); });
          positions.forEach((p, i) => {
            if (!p) return;
            const dot = svgElement('circle', { cx: p[0], cy: p[1], r: 3, class: `pq-compare__radar-point--${name}` });
            dot.append(svgElement('title', {}, `${this.selected[name].name}: ${this.selected[name].specs[radarMetrics[i].key].display}`)); nodes.push(dot);
          });
          layers[side].replaceChildren(...nodes);
        });
      };
      if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const start = performance.now();
        const tick = (now) => { const p = Math.min(1, (now - start) / 220); draw(1 - (1 - p) ** 3); if (p < 1) this.radarFrame = requestAnimationFrame(tick); };
        this.radarFrame = requestAnimationFrame(tick);
      } else draw(1);
      const notes = ['Fixed scales. Tap a category to explore the source specifications.'];
      for (const side of ['panquire', 'competitor']) {
        const record = this.selected[side];
        const bounded = radarMetrics.filter((m) => record.specs[m.key].bounded);
        bounded.forEach((m) => notes.push(`${record.name}: ${record.specs[m.key].display} uses ${record.specs[m.key].plotValue}° as a visualization bound, not an exact claim.`));
      }
      if (target.some((values) => values.some((value) => value === null))) notes.push('Missing values are not plotted.');
      this.querySelector('[data-chart-note]').textContent = notes.join(' ');
    }
  }
  customElements.define('pq-comparison', Comparison);
})();
