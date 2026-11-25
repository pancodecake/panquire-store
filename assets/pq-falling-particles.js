// Motion tuning. Speeds are CSS pixels per second and angles are in degrees.
const motion = {
  minimumGutter: 60,
  edge: 8,
  size: [88, 176],
  speed: [32, 61],
  spinTime: [11, 23],
  swayTime: [8, 16],
  drift: 16,
  opacity: [0.28, 0.64],
  pixelsPerParticle: 54
};

const root = document.getElementById('PanquireParticles');
if (root) {
  const start = () => {
    if (window.requestIdleCallback) window.requestIdleCallback(initialize);
    else window.setTimeout(initialize, 0);
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}

function randomBetween(min, max) {
  return min + (max - min) * Math.random();
}

function initialize() {
  const main = document.getElementById('MainContent');
  const containers = [...main.querySelectorAll('.pq-container, .product-information__grid, .section--page-width > :not(.section-background)')];
  if (!containers.length) return;

  const rails = [...root.querySelectorAll('.pq-particle-rail')];
  const assets = JSON.parse(root.querySelector('[data-particle-assets]').textContent);
  const preference = window.matchMedia('(min-width: 990px) and (prefers-reduced-motion: no-preference)');
  const maxCount = Number(root.dataset.count);
  let frame = 0;
  let lastGeometry = '';
  root.style.setProperty('--pq-particle-edge', motion.edge + 'px');

  function sizeRails() {
    frame = 0;
    if (!preference.matches) {
      root.hidden = true;
      return;
    }

    const viewport = document.documentElement.clientWidth;
    let contentLeft = viewport;
    let contentRight = 0;
    for (const container of containers) {
      const bounds = container.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0 || bounds.right <= 0 || bounds.left >= viewport) continue;
      contentLeft = Math.min(contentLeft, bounds.left);
      contentRight = Math.max(contentRight, bounds.right);
    }

    const widths = [
      Math.floor(contentLeft - motion.edge * 2),
      Math.floor(viewport - contentRight - motion.edge * 2)
    ];
    root.hidden = contentLeft >= contentRight || Math.min(...widths) < motion.minimumGutter;
    if (root.hidden) return;

    root.style.setProperty('--pq-particle-left', widths[0] + 'px');
    root.style.setProperty('--pq-particle-right', widths[1] + 'px');

    const geometry = [...widths, window.innerHeight].join(':');
    if (geometry === lastGeometry) return;
    lastGeometry = geometry;

    rails.forEach((rail, side) => {
      const width = widths[side];
      const count = Math.min(maxCount, Math.max(2, Math.round(width / motion.pixelsPerParticle)));
      for (let index = 0; index < count; index++) {
        const assetIndex = (index + side * 2) % assets.length;
        const particle = rail.children[index] ?? createParticle(assets[assetIndex], rail);
        configureParticle(particle, width, (index + side * 0.5) / count);
        particle.hidden = false;
      }
      for (let index = count; index < rail.children.length; index++) {
        rail.children[index].hidden = true;
      }
    });
  }

  function scheduleMeasure() {
    if (!frame) frame = window.requestAnimationFrame(sizeRails);
  }

  function syncVisibility() {
    root.toggleAttribute('data-tab-hidden', document.hidden);
  }

  syncVisibility();
  document.addEventListener('visibilitychange', syncVisibility);
  preference.addEventListener('change', scheduleMeasure);
  const resize = new ResizeObserver(scheduleMeasure);
  resize.observe(document.documentElement);
  resize.observe(main);
  containers.forEach((container) => resize.observe(container));
  scheduleMeasure();
}

function createParticle(src, rail) {
  const particle = document.createElement('div');
  particle.className = 'pq-particle';

  const image = document.createElement('img');
  image.src = src;
  image.alt = '';
  image.decoding = 'async';
  particle.appendChild(image);

  const direction = Math.random() < 0.5 ? -1 : 1;
  const spinTime = randomBetween(...motion.spinTime);
  particle.style.setProperty('--particle-opacity', randomBetween(...motion.opacity));
  particle.style.setProperty('--particle-turn', 360 * direction + 'deg');
  particle.style.setProperty('--particle-sway-time', randomBetween(...motion.swayTime) + 's');
  particle.style.setProperty('--particle-flip-x', randomBetween(0, 62) * direction + 'deg');
  particle.style.setProperty('--particle-flip-y', randomBetween(18, 73) * direction + 'deg');
  particle.style.setProperty('--particle-spin-time', spinTime + 's');
  particle.style.setProperty('--particle-spin-delay', -randomBetween(0, spinTime) + 's');

  // Store the random values so resizing doesn't reroll the particles.
  particle.fall = {
    size: Math.random(),
    position: Math.random(),
    speed: randomBetween(...motion.speed),
    phaseOffset: randomBetween(0.02, 0.14),
    drift: randomBetween(motion.drift / 3, motion.drift)
  };
  rail.appendChild(particle);
  return particle;
}

function configureParticle(particle, width, phase) {
  const fall = particle.fall;
  const [minSize, maxSize] = motion.size;
  const scale = Math.min(1, width * 0.70 / maxSize);
  const size = (minSize + (maxSize - minSize) * fall.size) * scale;
  const rotatedSize = size * Math.SQRT2;
  const drift = Math.min(fall.drift, (width - rotatedSize) / 3);
  const clearance = drift + (rotatedSize - size) / 2;
  const position = clearance + (width - size - clearance * 2) * fall.position;
  const duration = (window.innerHeight + 3 * size) / fall.speed;
  particle.style.setProperty('--particle-size', size + 'px');
  particle.style.setProperty('--particle-x', position + 'px');
  particle.style.setProperty('--particle-time', duration + 's');
  particle.style.setProperty('--particle-delay', -duration * ((phase + fall.phaseOffset) % 1) + 's');
  particle.style.setProperty('--particle-drift-start', -drift + 'px');
  particle.style.setProperty('--particle-drift-end', drift + 'px');
}
