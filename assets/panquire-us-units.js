(() => {
  const number = '[+−-]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
  const separator = /(?<=\d)\s*(×|[xX]|–|—|-|to)\s*/i;
  const metric = new RegExp(
    `(?<![\\p{L}\\d.,])(${number}(?:\\s*(?:×|x|–|—|-|to)\\s*${number})*)\\s*(km\\s*\\/\\s*h|kmh|kph|km|kg|mm|cm|met(?:ers?|res?)|N\\s*[·⋅.-]?\\s*m|°\\s*C|kPa|bar|mL|lit(?:ers?|res?))(?![\\p{L}\\d/])`,
    'giu'
  );
  const usUnit = '(?:mph|mi(?:les?)?|lbs?\\.?|pounds?|in(?:ches?)?|ft|feet|°\\s*F|lb[·⋅ -]ft|ft[·⋅ -]lb|psi|fl\\.?\\s*oz|gal(?:lons?)?|[″”])';
  const equivalentAfter = new RegExp(`^\\s*(?:\\([^)]{0,90}\\d[^)]{0,30}\\s*${usUnit}(?![a-z])|[/=]\\s*${number}\\s*${usUnit}(?![a-z]))`, 'i');
  const equivalentBefore = new RegExp(`\\d[^()]{0,24}\\s*${usUnit}\\s*\\(\\s*(?:(?:about|approx\\.)\\s+)?$`, 'i');
  const conversions = {
    'km/h': [0.621371192, 'mph', 0],
    kmh: [0.621371192, 'mph', 0],
    kph: [0.621371192, 'mph', 0],
    km: [0.621371192, 'mi', 0],
    kg: [2.204622622, 'lb', 0],
    mm: [1 / 25.4, 'in', 1],
    cm: [1 / 2.54, 'in', 1],
    nm: [0.737562149, 'lb-ft', 0],
    '°c': [1.8, '°F', 0, 32],
    kpa: [0.145037738, 'psi', 1],
    bar: [14.5037738, 'psi', 1],
    ml: [0.033814023, 'fl oz', 1],
    meters: [3.280839895, 'ft', 1],
    liters: [0.264172052, 'gal', 2],
  };

  function addEquivalents(text) {
    return text.replace(metric, (match, values, metricUnit, offset) => {
      if (equivalentAfter.test(text.slice(offset + match.length)) ||
          equivalentBefore.test(text.slice(Math.max(0, offset - 80), offset))) return match;

      const unit = metricUnit.toLowerCase().replace(/[\s·⋅.-]/g, '')
        .replace(/^met(?:ers?|res?)$/, 'meters').replace(/^lit(?:ers?|res?)$/, 'liters');
      const [factor, label, precision, adjustment = 0] = conversions[unit];
      const parts = values.split(separator);
      const riderHeight = unit === 'cm' &&
        (/(?:rider|body) height/i.test(text) || (parts.length === 3 && !/[×x]/i.test(parts[1]) && Number(parts[0]) >= 100));
      const converted = parts.map((part, index) => {
        if (index % 2) return /[×x]/i.test(part) ? ' × ' : '–';
        const value = Number(part.replaceAll(',', '').replace('−', '-')) * factor + adjustment;
        if (riderHeight) {
          const inches = Math.round(value);
          return `${Math.floor(inches / 12)} ft ${inches % 12} in`;
        }
        const digits = unit === 'mm' && Math.abs(value) < 1 ? 2 : precision;
        const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
        return part.startsWith('+') && value >= 0 ? `+${formatted}` : formatted;
      }).join('');
      return `${match} (${converted}${riderHeight ? '' : ` ${label}`})`;
    });
  }

  const excluded = 'script, style, template, noscript, textarea, select, svg, math, code, pre, [contenteditable]:not([contenteditable="false"])';
  function updateText(node) {
    if (!node.parentElement || node.parentElement.closest(excluded)) return;
    const updated = addEquivalents(node.data);
    if (updated !== node.data) node.data = updated;
  }

  function update(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      updateText(root);
    } else if (root.nodeType === Node.ELEMENT_NODE && !root.closest(excluded)) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) updateText(walker.currentNode);
    }
  }

  update(document.body);
  new MutationObserver((changes) => {
    for (const change of changes) {
      if (change.type === 'characterData') updateText(change.target);
      else change.addedNodes.forEach(update);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true });
})();
