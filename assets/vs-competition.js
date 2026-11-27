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
    { area: 'power', label: 'POWER', key: 'peak_motor_power', min: 4000, max: 21000, rangeUnit: 'kW', rangeDivisor: 1000 },
    { area: 'rated-power', label: 'RATED POWER', key: 'continuous_motor_power', min: 1500, max: 13000, rangeUnit: 'kW', rangeDivisor: 1000 },
    { area: 'speed', label: 'SPEED', key: 'maximum_speed', min: 55, max: 120, rangeUnit: 'km/h' },
    { area: 'battery', label: 'BATTERY', key: 'battery_energy', min: 0.8, max: 6.2, rangeUnit: 'kWh' },
    { area: 'weight', label: 'WEIGHT', key: 'ready_to_ride_weight', min: 38, max: 200, rangeUnit: 'kg', lowerIsBetter: true },
    { area: 'charging', label: 'CHARGING', key: 'chargingTime', min: 0, max: 12, lowerIsBetter: true, needsBasis: true },
    { area: 'acceleration', label: 'ACCELERATION', key: 'acceleration', min: 0, max: 15, lowerIsBetter: true, needsBasis: true }
  ];
  // Fixed bands reflect comparable compact off-road, full-size off-road, and road-focused e-motos.
  // Every matchup for the same Panquire model keeps the same scale.
  const radarBenchmarks = {
    't-01': { power: [4000, 13000], 'rated-power': [1500, 7000], speed: [55, 105], battery: [0.8, 3.2], weight: [38, 75] },
    't-02': { power: [5000, 21000], 'rated-power': [2500, 11000], speed: [70, 115], battery: [2, 6.2], weight: [40, 125] },
    't-03': { power: [4000, 19000], 'rated-power': [3000, 13000], speed: [70, 120], battery: [1.4, 6], weight: [45, 200] }
  };

  const showdownKeys = ['ready_to_ride_weight', 'netBikeWeight', 'curbWeight', 'bikeWeight', 'unitWeight', 'battery_energy', 'peak_motor_power', 'continuous_motor_power', 'maximum_speed', 'chargingTime', 'acceleration', 'suspension', 'brakes', 'seatHeight', 'wheels'];
  const available = (entry) => !!entry && typeof entry.display === 'string' && !/^(?:\s*|—|TBD|N\/A|Not specified)$/i.test(entry.display.trim());
  const matchingBasis = (a, b) => !!a?.basis && a.basis === b?.basis;
  const sharedSpecs = (configs, left, right) => configs.filter((spec) => available(left.specs[spec.key]) && available(right.specs[spec.key]) && (!['bikeWeight', 'unitWeight'].includes(spec.key) || matchingBasis(left.specs[spec.key], right.specs[spec.key])));
  const showdownSpecs = (configs) => showdownKeys.flatMap((key) => configs.filter((spec) => spec.key === key));
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
  const imageSizes = '(max-width: 700px) calc(100vw - 40px), (max-width: 1500px) 44vw, 640px';

  const imageBounds = new Map();

  function visibleImageBounds(image) {
    const source = image.currentSrc || image.src;
    if (imageBounds.has(source)) return imageBounds.get(source);

    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 160 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    let bounds = { width: 1, height: 1, centerX: 0.5, centerY: 0.5 };

    try {
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (context) {
        context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;
        let left = width, right = -1, top = height, bottom = -1;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (pixels[(y * width + x) * 4 + 3] < 80) continue;
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
        if (right >= left && bottom >= top) {
          bounds = {
            width: (right - left + 1) / width,
            height: (bottom - top + 1) / height,
            centerX: (left + right + 1) / (2 * width),
            centerY: (top + bottom + 1) / (2 * height)
          };
        }
      }
    } catch {
      // Images that prevent pixel access still fit inside the same frame.
    }
    imageBounds.set(source, bounds);
    return bounds;
  }

  function balanceImage(image) {
    if (image.hidden || !image.complete || !image.naturalWidth) return;
    const frameWidth = image.clientWidth;
    const frameHeight = image.clientHeight;
    if (!frameWidth || !frameHeight) return;

    const bounds = visibleImageBounds(image);
    const contain = Math.min(frameWidth / image.naturalWidth, frameHeight / image.naturalHeight);
    const width = image.naturalWidth * contain;
    const height = image.naturalHeight * contain;
    const bikeWidth = bounds.width * width;
    const bikeHeight = bounds.height * height;
    // Match visible area while keeping wide and tall silhouettes within the card.
    const scale = Math.min(
      frameWidth * 0.94 / bikeWidth,
      frameHeight * 0.88 / bikeHeight,
      Math.sqrt(frameWidth * frameHeight * 0.64 / (bikeWidth * bikeHeight))
    );
    const shiftX = (0.5 - bounds.centerX) * width * scale;
    const shiftY = (0.5 - bounds.centerY) * height * scale;
    image.style.transform = 'translate(' + shiftX + 'px, ' + shiftY + 'px) scale(' + scale + ')';
  }

  function setComparisonImage(image, source) {
    const url = safeUrl(source?.src);
    const srcset = url && source.small && source.medium
      ? [`${safeUrl(source.small)} 400w`, `${safeUrl(source.medium)} 700w`, `${url} 1000w`].join(', ')
      : '';
    if (srcset) {
      image.sizes = imageSizes;
      if (image.srcset !== srcset) image.srcset = srcset;
    } else {
      image.removeAttribute('srcset');
    }
    if (url && image.src !== url) image.src = url;
    if (!url) image.removeAttribute('src');
    return !!url;
  }

  const parseDetails = (value) => {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return {}; }
  };

  const regionalShowdown = [
    ['price', 'Price', 'lower'], ['weight', 'Weight', 'lower'], ['peakPower', 'Peak Power', 'higher'],
    ['topSpeed', 'Top Speed', 'higher'], ['battery', 'Battery', 'higher'], ['maxLoad', 'Max Load', 'higher']
  ];
  const regionalDetails = [
    ['ratedPower', 'Continuous / Rated Motor Power', 'Performance'],
    ['voltage', 'Battery Voltage', 'Battery & range'],
    ['capacity', 'Battery Capacity', 'Battery & range'],
    ['removable', 'Removable Battery', 'Battery & range'],
    ['range', 'Published Range', 'Battery & range'],
    ['wheels', 'Wheel Size', 'Chassis'],
    ['brakes', 'Brakes', 'Chassis'],
    ['seatHeight', 'Seat Height', 'Chassis'],
    ['groundClearance', 'Ground Clearance', 'Chassis'],
    ['warranty', 'Warranty', 'Additional details'],
    ['market', 'Market', 'Additional details']
  ];
  const regionalRadarFields = {
    peak_motor_power: 'peakPower',
    continuous_motor_power: 'ratedPower',
    maximum_speed: 'topSpeed',
    battery_energy: 'battery',
    ready_to_ride_weight: 'weight'
  };

  function radarMeasurement(display, units) {
    const measurement = display?.trim().match(/^([\d,]+(?:\.\d+)?)\s*(\S+)$/);
    const factor = measurement && units[measurement[2]];
    return typeof factor === 'number' ? Number(measurement[1].replaceAll(',', '')) * factor : null;
  }

  function regionalRadarSpecs(bike) {
    const voltage = radarMeasurement(bike.voltage, { V: 1 });
    const capacity = radarMeasurement(bike.capacity, { Ah: 1 });
    const batteryEnergy = radarMeasurement(bike.battery, { Wh: 0.001, kWh: 1 })
      ?? (voltage !== null && capacity !== null ? voltage * capacity / 1000 : null);
    const values = {
      peak_motor_power: radarMeasurement(bike.peakPower, { W: 1, kW: 1000 }),
      continuous_motor_power: radarMeasurement(bike.ratedPower, { W: 1, kW: 1000 }),
      maximum_speed: radarMeasurement(bike.topSpeed, { 'km/h': 1, mph: 1.609344 }),
      battery_energy: batteryEnergy,
      ready_to_ride_weight: radarMeasurement(bike.weight, { kg: 1, lb: 0.45359237, lbs: 0.45359237 })
    };
    return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, {
      value, plotValue: value, display: bike[regionalRadarFields[key]]
    }]));
  }

  function regularPrice(bike, currency, competitor) {
    const listing = bike.prices[currency] ?? (currency === 'EUR' && competitor ? bike.prices.USD : null);
    if (!Number.isFinite(listing?.amount) || listing.amount <= 0) return '';
    const price = new Intl.NumberFormat('en-US', {
      style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2
    }).format(listing.amount);
    const display = listing.from ? 'From ' + price : price;
    return listing.note ? display + ' (' + listing.note + ')' : display;
  }

  function regionalColumns(columns, bikes) {
    return columns.filter(([key]) => bikes.every((bike) => {
      const value = bike[key];
      return typeof value === 'string' && !/^(?:|[-–—]|TBD|N\/A|Not specified)$/i.test(value.trim());
    }));
  }

  function regionalTableRecord(record, currency) {
    const displayed = record.regionalSpecs;
    const plotted = record.specs;
    const price = displayed.price.match(/^[$€]([\d,]+(?:\.\d+)?)$/);
    const measurements = {
      price: [price ? Number(price[1].replaceAll(',', '')) : null, currency],
      weight: [plotted.ready_to_ride_weight.value, 'kg'],
      peakPower: [plotted.peak_motor_power.value === null ? null : plotted.peak_motor_power.value / 1000, 'kW'],
      topSpeed: [plotted.maximum_speed.value, 'km/h'],
      battery: [plotted.battery_energy.value, 'kWh'],
      maxLoad: [radarMeasurement(displayed.maxLoad, { kg: 1, lb: 0.45359237, lbs: 0.45359237 }), 'kg']
    };
    const specs = Object.fromEntries(Object.entries(displayed).map(([key, display]) => {
      const [value, unit] = measurements[key] || [null, null];
      return [key, { value, unit, display }];
    }));
    return { name: record.name, specs };
  }

  function productSpecifications(record) {
    const rows = new Map();
    for (const line of `${record.specificationRows}\n${record.specificationAdditions || ''}`.split(/\r?\n/)) {
      const [group, label, ...parts] = line.split('|');
      if (group?.trim() && label?.trim() && parts.length) rows.set(label.trim().toLowerCase(), parts.join('|').trim());
    }
    const fields = {}, details = { specs: {}, coreMeta: {} };
    const read = (label) => rows.get(label) || '';
    const numeric = (display, unit) => {
      const match = display.match(new RegExp(`^(?:(?:Less than|Up to|Approx\\.)\\s*|[<>≤≥~≈]\\s*)?([\\d,]+(?:\\.\\d+)?)\\s*${unit}(?:\\s*\\([^)]*\\))?$`, 'i'));
      return match ? number(match[1].replaceAll(',', '')) : null;
    };
    const coreFields = [
      ['peak motor power', 'peak_motor_power', 'W'], ['maximum speed', 'maximum_speed', 'km/h'],
      ['battery voltage', 'battery_voltage', 'V'], ['battery capacity', 'battery_capacity', 'Ah'],
      ['nominal battery energy', 'battery_energy', 'kWh'], ['max load', 'maximum_load', 'kg'],
      ['climbing ability', 'maximum_climbing_ability', '°'], ['range — eco mode', 'claimed_range', 'km'],
      ['net weight', 'net_weight', 'kg'], ['bike weight', 'bike_weight', 'kg']
    ];
    for (const [label, key, unit] of coreFields) {
      const display = read(label);
      if (!display) continue;
      fields[key] = numeric(display, unit);
      fields[`${key}_display`] = key === 'claimed_range' ? `${display} (Eco mode)` : display;
    }
    const motor = read('motor').match(/^([\d.]+)\s*V\s+([\d,]+(?:\.\d+)?)\s*W\s+(.+)$/i);
    if (motor) {
      fields.continuous_motor_power = number(motor[2].replaceAll(',', ''));
      fields.continuous_motor_power_display = `${motor[2]} W`;
      fields.motor_type = motor[3];
    }
    for (const [label, key] of [
      ['drivetrain', 'drivetrain'], ['battery', 'battery_type'], ['front/rear suspension', 'suspension'],
      ['rear shock', 'rear_shock'], ['brakes', 'brakes'], ['vehicle dimensions', 'vehicle_dimensions'],
      ['frame material', 'frame_material'], ['color', 'color']
    ]) fields[key] = read(label);
    fields.charger_display = read('charger');
    fields.charger_amperage = numeric(fields.charger_display, 'A');
    fields.front_wheel_size = numeric(read('front tire'), 'inches');
    fields.rear_wheel_size = numeric(read('rear tire'), 'inches');
    if (read('front tire') || read('rear tire')) fields.wheel_size_display = `${read('front tire') || '—'} front / ${read('rear tire') || '—'} rear`;
    if (read('charging 0–100%')) details.specs.chargingTime = {
      label: 'Charging Time', group: 'Battery & range', display: `${read('charging 0–100%')} (0–100%)`,
      comparisonMode: 'none', comparable: false, basis: '0–100%'
    };
    if (read('nominal battery energy')) details.coreMeta.batteryEnergy = {
      derived: /voltage\s*×\s*capacity/i.test(read('nominal battery energy')),
      qualifier: 'Nominal energy; voltage × capacity, not measured usable energy'
    };
    if (read('range — eco mode')) details.coreMeta.claimedRange = { comparable: false, qualifier: 'Eco mode; test conditions unspecified' };
    return { fields, details, name: read('model') || record.name };
  }

  function normalize(record) {
    if (typeof record.specificationRows === 'string') {
      const fallback = productSpecifications(record);
      const typedFields = Object.fromEntries(Object.entries(record.fields || {}).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== ''));
      const displayPairs = {
        continuous_motor_power: 'continuous_motor_power_display',
        peak_motor_power: 'peak_motor_power_display',
        maximum_speed: 'maximum_speed_display',
        battery_voltage: 'battery_voltage_display',
        battery_energy: 'battery_energy_display',
        battery_capacity: 'battery_capacity_display',
        claimed_range: 'claimed_range_display',
        maximum_load: 'maximum_load_display',
        ready_to_ride_weight: 'ready_to_ride_weight_display',
        net_weight: 'net_weight_display',
        bike_weight: 'bike_weight_display',
        curb_weight: 'curb_weight_display',
        unit_weight: 'unit_weight_display',
        charger_amperage: 'charger_display'
      };
      for (const [numericKey, displayKey] of Object.entries(displayPairs)) {
        if (typedFields[numericKey] !== undefined && typedFields[displayKey] === undefined) delete fallback.fields[displayKey];
      }
      if ((typedFields.front_wheel_size !== undefined || typedFields.rear_wheel_size !== undefined) && typedFields.wheel_size_display === undefined) delete fallback.fields.wheel_size_display;
      const typedDetails = parseDetails(record.details);
      record = {
        ...record,
        name: record.name || fallback.name,
        fields: { ...fallback.fields, ...typedFields },
        details: {
          ...fallback.details,
          ...typedDetails,
          specs: { ...fallback.details.specs, ...typedDetails.specs },
          coreMeta: { ...fallback.details.coreMeta, ...typedDetails.coreMeta }
        }
      };
    }
    const fields = record.fields || {};
    const storedDetails = parseDetails(record.details);
    const details = { ...storedDetails, specs: { ...storedDetails.specs } };
    const fieldAliases = { motor_type: ['motorType', 'Motor Type', 'Performance'], drivetrain: ['drivetrain', 'Drivetrain', 'Performance'], gears: ['gears', 'Gears', 'Performance'], battery_type: ['batteryType', 'Battery Type', 'Battery & range'], suspension: ['suspension', 'Suspension', 'Chassis'], rear_shock: ['rearShock', 'Rear Shock', 'Chassis'], brakes: ['brakes', 'Brakes', 'Chassis'], brake_pads: ['brakePads', 'Brake Pads', 'Chassis'], vehicle_dimensions: ['dimensions', 'Vehicle Dimensions', 'Chassis'], frame_material: ['frame', 'Frame', 'Chassis'], color: ['color', 'Color', 'Chassis'], charging_time: ['chargingTime', 'Charging Time', 'Battery & range'], acceleration: ['acceleration', 'Acceleration', 'Performance'], seat_height: ['seatHeight', 'Seat Height', 'Chassis'] };
    for (const [field, [key, label, group]] of Object.entries(fieldAliases)) {
      if (fields[field]) details.specs[key] = { ...details.specs[key], label, group, display: String(fields[field]), comparisonMode: 'none' };
    }
    for (const [field, key, label] of [['net_weight', 'netBikeWeight', 'Net Weight'], ['bike_weight', 'bikeWeight', 'Bike Weight'], ['curb_weight', 'curbWeight', 'Curb Weight'], ['unit_weight', 'unitWeight', 'Unit Weight']]) {
      const value = number(fields[field]);
      if (value !== null) details.specs[key] = { label, group: 'Chassis', value, unit: 'kg', display: fields[`${field}_display`] || withUnit(value, 'kg'), comparisonMode: 'none', basis: field };
    }
    const normalized = {};
    for (const spec of specs) {
      const meta = details.coreMeta?.[spec.metaKey] || {};
      if (spec.parts) {
        const values = spec.parts.map((key) => number(fields[key]));
        const availableParts = values.map((value, index) => value === null ? null : withUnit(value, spec.units[index])).filter(Boolean);
        const fallback = availableParts.length ? availableParts.join(' / ') : '—';
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
        value: source.comparable === false ? null : numeric,
        plotValue: numeric,
        unit: source.unit || null,
        display: source.display || (numeric === null ? '—' : withUnit(numeric, source.unit || '')),
        comparable: numeric !== null && source.comparable !== false,
        extended: true,
        basis: source.basis || null
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
    if (!a || !b || spec.parts || spec.difference === false || a.value === null || b.value === null || a.unit !== b.unit || (['chargingTime', 'acceleration'].includes(spec.key) && !matchingBasis(a, b))) return null;
    const delta = Math.round((a.value - b.value) * 100) / 100;
    return `${delta > 0 ? '+' : ''}${withUnit(delta, a.unit || '', spec.digits)}`.trim();
  }
  function applyProfile(record, productHandle) {
    const profile = record.details?.comparisonProfiles?.[productHandle];
    return profile ? normalize({ ...record, ...profile, fields: { ...record.fields, ...profile.fields }, details: profile.details || record.details }) : record;
  }
  function winner(spec, left, right) {
    if (!spec || !['higher', 'lower'].includes(spec.comparisonMode)) return null;
    const a = left.specs[spec.key], b = right.specs[spec.key];
    if (!a || !b || a.value === null || b.value === null || a.value === b.value || a.unit !== b.unit || (['chargingTime', 'acceleration'].includes(spec.key) && !matchingBasis(a, b))) return null;
    if (spec.comparisonMode === 'lower') return a.value < b.value ? 'panquire' : 'competitor';
    return a.value > b.value ? 'panquire' : 'competitor';
  }
  function score(metric, record) {
    const value = record.specs[metric.key]?.plotValue;
    if (!Number.isFinite(value)) return null;
    const result = Math.max(0, Math.min(100, (value - metric.min) / (metric.max - metric.min) * 100));
    return metric.lowerIsBetter ? 100 - result : result;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { specs, radarMetrics, number, normalize, difference, winner, score, sharedSpecs, showdownSpecs, applyProfile };
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
  const point = (index, percent, count, radius = 141) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
    return [220 + Math.cos(angle) * radius * percent / 100, 195 + Math.sin(angle) * radius * percent / 100];
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
      for (const type of ['pointerover', 'focusin']) {
        this.list.addEventListener(type, (event) => {
          const option = event.target.closest('[role="option"]');
          if (option) this.owner.warmImage(this.root.dataset.selector, option.dataset.value);
        }, { signal });
      }
      this.list.addEventListener('click', (event) => {
        const option = event.target.closest('[role="option"]');
        if (option) this.choose(option.dataset.value);
      }, { signal });
      this.root.addEventListener('pointerenter', () => this.cancelClose(), { signal });
      this.root.addEventListener('pointerleave', (event) => {
        if (event.pointerType !== 'mouse' || event.relatedTarget && this.root.contains(event.relatedTarget)) return;
        this.scheduleClose();
      }, { signal });
      this.root.addEventListener('focusout', (event) => { if (!this.root.contains(event.relatedTarget)) this.close(); }, { signal });
    }

    cancelClose() {
      if (!this.closeTimer) return;
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }

    scheduleClose() {
      this.cancelClose();
      this.closeTimer = setTimeout(() => {
        this.closeTimer = null;
        if (!this.root.matches(':hover')) this.close(this.root.contains(document.activeElement));
      }, 140);
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
      this.cancelClose();
      this.owner.closeSelects(this);
      this.isOpen = true;
      this.root.dataset.open = 'true';
      this.root.classList.add('open');
      this.list.style.maxHeight = `${Math.min(420, Math.max(100, window.innerHeight - this.trigger.getBoundingClientRect().bottom - 24))}px`;
      this.trigger.setAttribute('aria-expanded', 'true');
      for (const record of this.records.filter((item) => item.handle !== this.value).slice(0, 2)) {
        this.owner.warmImage(this.root.dataset.selector, record.handle);
      }
      if (fromKeyboard) (this.list.querySelector('[aria-selected="true"]') || this.list.firstElementChild)?.focus();
    }

    close(restoreFocus = false) {
      this.cancelClose();
      if (!this.isOpen) return;
      this.isOpen = false;
      delete this.root.dataset.open;
      this.root.classList.remove('open');
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
      if (event.key === 'Tab') { this.close(true); return; }
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
      this.regionalModels = this.config.regionalTables?.models;
      if (this.regionalModels) {
        this.records.panquire = Object.entries(this.regionalModels).map(([handle, pairs]) => ({
          ...this.records.panquire.find((record) => record.handle === handle),
          handle,
          name: pairs[0].bikes[0].name
        }));
      }
      this.warmedImages = new Set();
      this.imageObserver = typeof ResizeObserver === 'function'
        ? new ResizeObserver((entries) => entries.forEach(({ target }) => balanceImage(target)))
        : null;
      this.selects = {};
      for (const side of ['panquire', 'competitor']) {
        const root = this.querySelector(`[data-selector="${side}"]`);
        this.selects[side] = new ComparisonSelect(root, this, () => this.handleSelection(side), signal);
        const image = this.querySelector(`[data-product="${side}"] [data-image]`);
        image.addEventListener('load', () => balanceImage(image), { signal });
        this.imageObserver?.observe(image);
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
        this.querySelector('[data-status]').textContent = this.area ? `${this.area} specifications highlighted.` : 'Highlight cleared.';
      }, { signal });
      this.querySelector('details').addEventListener('toggle', () => {
        if (this.querySelector('details').open) this.animateChange(this.querySelector('[data-full-specs]'));
      }, { signal });
      window.addEventListener('popstate', () => this.readUrl(), { signal });
      this.readUrl();
    }

    disconnectedCallback() {
      this.abort?.abort();
      this.imageObserver?.disconnect();
      cancelAnimationFrame(this.radarFrame);
    }

    closeSelects(except) {
      Object.values(this.selects).forEach((select) => { if (select !== except) select.close(); });
    }

    allowedCompetitors(product) {
      if (this.regionalModels) {
        return (this.regionalModels[product?.handle] || []).map(({ handle, bikes }) => ({ handle, name: bikes[1].name }));
      }
      return (product?.competitorHandles || []).map((handle) => this.records.competitor.find((record) => record.handle === handle)).filter(Boolean);
    }

    readUrl() {
      const params = new URLSearchParams(window.location.search);
      const preferred = (records, candidates) => candidates.find(handle => records.some(record => record.handle === handle));
      this.selects.panquire.setOptions(this.records.panquire, preferred(this.records.panquire, [params.get('panquire'), this.config.defaults.panquire, 't-01']));
      const product = this.records.panquire.find((record) => record.handle === this.selects.panquire.value);
      const allowed = this.allowedCompetitors(product);
      this.selects.competitor.setOptions(allowed, preferred(allowed, [params.get('competitor'), this.config.defaults.competitor]));
      this.area = null;
      this.render(false);
      this.writeUrl();
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

    comparisonImage(side, handle, record) {
      const asset = side === 'panquire' ? this.config.productImages?.[handle] : this.config.regionalImages?.[handle];
      return asset ? { src: asset } : record?.image;
    }

    warmImage(side, handle) {
      if (this.selects[side].value === handle || navigator.connection?.saveData) return;
      const source = this.comparisonImage(side, handle, this.records[side].find((record) => record.handle === handle));
      const url = safeUrl(source?.src);
      if (!url || this.warmedImages.has(url)) return;
      this.warmedImages.add(url);
      const image = new Image();
      image.fetchPriority = 'low';
      image.addEventListener('error', () => this.warmedImages.delete(url), { once: true });
      setComparisonImage(image, source);
    }

    render(animate) {
      this.selected = {};
      const pair = this.regionalModels?.[this.selects.panquire.value]?.find(({ handle }) => handle === this.selects.competitor.value);
      const currency = this.config.regionalCurrency;
      for (const side of ['panquire', 'competitor']) {
        let record = this.records[side].find((item) => item.handle === this.selects[side].value) || normalize({ name: 'No comparison available', fields: {} });
        if (side === 'competitor') record = applyProfile(record, this.selects.panquire.value);
        if (pair) {
          const competitor = side === 'competitor';
          const bike = pair.bikes[Number(competitor)];
          record = {
            ...record,
            name: bike.name,
            sourceUrl: safeUrl(bike.links[currency]),
            specs: regionalRadarSpecs(bike.specs),
            regionalSpecs: { ...bike.specs, name: bike.name, price: regularPrice(bike, currency, competitor) }
          };
        }
        this.selected[side] = record;
        const product = this.querySelector(`[data-product="${side}"]`);
        const image = product.querySelector('[data-image]');
        const sourceImage = this.comparisonImage(side, this.selects[side].value, record);
        const hasImage = setComparisonImage(image, sourceImage);
        image.alt = hasImage ? sourceImage.alt || record.name : '';
        image.hidden = !hasImage;
        product.querySelector('[data-placeholder]').hidden = hasImage;
        if (hasImage) balanceImage(image);
        const price = product.querySelector('[data-price]');
        if (price && pair) {
          price.textContent = record.regionalSpecs.price;
          price.hidden = !price.textContent;
        } else if (price) {
          price.replaceChildren();
          if (record.price.amount === null || record.price.amount <= 0 || !record.price.currency) price.textContent = '—';
          else {
            let formatted;
            try { formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: record.price.currency, maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(record.price.amount); }
            catch { formatted = `${format(record.price.amount)} ${record.price.currency}`; }
            const amount = element('span', formatted);
            if (side === 'panquire' && record.price.currency === 'USD') {
              amount.dataset.pqUsdCents = String(Math.round(record.price.amount * 100));
              amount.dataset.pqProductHandle = record.handle;
            }
            price.append(element('small', 'from'), amount);
          }
        }
        const source = product.querySelector('[data-source]');
        if (source) {
          source.hidden = !record.sourceUrl;
          if (record.sourceUrl) source.href = record.sourceUrl;
          else source.removeAttribute('href');
          source.querySelector('[data-source-tooltip]').textContent = record.sourceUrl || '';
        }
        const legend = this.querySelector(`[data-legend="${side}"]`);
        if (legend) legend.textContent = record.name;
        product.querySelector('[data-availability]').textContent = pair || this.hasSpecifications(record) ? '' : 'Specifications coming soon';
        if (pair) product.querySelector('.pq-compare__pill').hidden = (!price || price.hidden) && (!source || source.hidden);
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
      return sharedSpecs(this.specificationConfigs(), left, right);
    }

    renderTables() {
      const left = this.selected.panquire, right = this.selected.competitor;
      const metric = radarMetrics.find((item) => item.area === this.area);
      this.querySelector('[data-table-title]').textContent = 'SPEC SHOWDOWN';
      this.querySelector('[data-reset]').hidden = !metric;
      if (left.regionalSpecs && right.regionalSpecs) {
        const bikes = [left.regionalSpecs, right.regionalSpecs];
        const activeSpec = regionalRadarFields[metric?.key];
        const records = [left, right].map((bike) => regionalTableRecord(bike, this.config.regionalCurrency));
        const showdown = regionalColumns(regionalShowdown, bikes).map(([key, label, comparisonMode]) => ({ key, label, comparisonMode }));
        const details = regionalColumns(regionalDetails, bikes).map(([key, label, group]) => ({ key, label, group }));
        const fullTable = this.querySelector('[data-full-specs]');
        const disclosure = fullTable.closest('details');
        this.fillTable(this.querySelector('[data-differences]'), showdown, true, records, activeSpec);
        this.fillTable(fullTable, details, false, records, activeSpec);
        disclosure.hidden = !details.length;
        if (details.some((spec) => spec.key === activeSpec)) disclosure.open = true;
        return;
      }
      const present = this.sharedSpecifications();
      const rows = showdownSpecs(present);
      this.fillTable(this.querySelector('[data-differences]'), rows, true);
      this.fillTable(this.querySelector('[data-full-specs]'), present, false);
    }

    fillTable(table, rows, margins, records = [this.selected.panquire, this.selected.competitor], activeSpec) {
      const [left, right] = records;
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
        row.dataset.spec = spec.key;
        const activeMetric = radarMetrics.find((metric) => metric.area === this.area);
        if (activeSpec === spec.key || (activeMetric && (activeMetric.key === spec.key || (this.area === 'power' && spec.area === 'power')))) row.classList.add('is-focused');
        heading.scope = 'row';
        const winningSide = winner(spec, left, right);
        const display = (entry) => margins && spec.unit === 'W' && entry.value !== null ? `${withUnit(entry.value / 1000, 'kW')} (${entry.display})` : entry.display;
        const leftCell = element('td', display(left.specs[spec.key]), `pq-compare__value pq-compare__value--panquire${winningSide === 'panquire' ? ' is-winner' : ''}`);
        const rightCell = element('td', display(right.specs[spec.key]), `pq-compare__value pq-compare__value--competitor${winningSide === 'competitor' ? ' is-winner' : ''}`);
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
      const visibleKeys = this.regionalModels
        ? Object.keys(regionalRadarFields)
        : showdownSpecs(this.sharedSpecifications()).map((spec) => spec.key);
      const benchmarks = radarBenchmarks[this.selects.panquire.value];
      const metrics = radarMetrics
        .filter((metric) => visibleKeys.includes(metric.key) && score(metric, this.selected.panquire) !== null && score(metric, this.selected.competitor) !== null && (!metric.needsBasis || matchingBasis(this.selected.panquire.specs[metric.key], this.selected.competitor.specs[metric.key])))
        .map((metric) => {
          const range = benchmarks?.[metric.area];
          return range ? { ...metric, min: range[0], max: range[1] } : metric;
        });
      this.renderMetricButtons(metrics);
      const target = Object.fromEntries(['panquire', 'competitor'].map((side) => [side, Object.fromEntries(metrics.map((metric) => [metric.area, score(metric, this.selected[side])]))]));
      const tooltips = Object.fromEntries(metrics.map((metric) => {
        const divisor = metric.rangeDivisor || 1;
        const unit = metric.rangeUnit || this.selected.panquire.specs[metric.key].unit;
        const lines = [
          metric.label,
          ...['panquire', 'competitor'].map((side) => {
            const record = this.selected[side];
            return record.name + ': ' + record.specs[metric.key].display + ' (' + Math.round(target[side][metric.area]) + '/100)';
          }),
          'Benchmark: ' + format(metric.min / divisor) + '–' + format(metric.max / divisor) + (unit ? ' ' + unit : '')
        ];
        return [metric.area, lines.join('\n')];
      }));
      const previous = this.radarScores || target;
      this.radarScores = target;
      svg.replaceChildren(svgElement('title', {}, `${this.selected.panquire.name} vs ${this.selected.competitor.name}`));
      svg.setAttribute('viewBox', metrics.length < 3 ? '0 0 440 230' : '0 0 440 400');
      if (metrics.length < 3) {
        if (!metrics.length) svg.append(svgElement('text', { x: 220, y: 115, 'text-anchor': 'middle', class: 'pq-compare__chart-empty' }, 'No shared numeric showdown data'));
        metrics.forEach((metric, index) => {
          const y = 42 + index * 104;
          svg.append(svgElement('text', { x: 50, y, class: 'pq-compare__chart-label', 'data-metric': metric.area, cursor: 'pointer' }, metric.label));
          ['panquire', 'competitor'].forEach((side, sideIndex) => {
            const barY = y + 18 + sideIndex * 22;
            svg.append(svgElement('line', { x1: 50, y1: barY, x2: 390, y2: barY, class: 'pq-compare__radar-grid' }));
            const bar = svgElement('rect', { x: 50, y: barY - 4, width: target[side][metric.area] * 3.4, height: 8, rx: 4, class: `pq-compare__radar-point--${side}` });
            bar.append(svgElement('title', {}, tooltips[metric.area]));
            svg.append(bar);
          });
        });
      } else {
        for (const level of [20, 40, 60, 80, 100]) svg.append(svgElement('polygon', { points: metrics.map((_, index) => point(index, level, metrics.length).join(',')).join(' '), class: 'pq-compare__radar-grid' }));
        metrics.forEach((metric, index) => {
          const [x, y] = point(index, 100, metrics.length), [tx, ty] = point(index, 100, metrics.length, 164);
          svg.append(svgElement('line', { x1: 220, y1: 195, x2: x, y2: y, class: 'pq-compare__radar-grid' }));
          const label = svgElement('text', { x: tx, y: ty + 4, 'text-anchor': 'middle', class: 'pq-compare__chart-label', 'data-metric': metric.area, cursor: 'pointer' }, metric.label);
          label.append(svgElement('title', {}, tooltips[metric.area]));
          svg.append(label);
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
              const corner = svgElement('rect', {
                x: position[0] - 6, y: position[1] - 6, width: 12, height: 12,
                fill: 'transparent', 'pointer-events': 'all', 'data-radar-vertex': side
              });
              corner.append(svgElement('title', {}, tooltips[metrics[index].area]));
              nodes.push(corner);
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
      const notes = ['Normalized performance scores (0–100). Both bikes use the same fixed benchmark for each metric.'];
      if (metrics.some((metric) => metric.area === 'weight')) notes.push('Lighter bikes score higher on weight.');
      notes.push('Tooltips show the original specs and scale limits.');
      if (metrics.length > 0 && metrics.length < 3) notes.push('Shared metrics appear as bars when fewer than three can be plotted.');
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
