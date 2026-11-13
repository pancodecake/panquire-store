const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Liquid } = require(process.env.LIQUIDJS_MODULE || '../.preview-runtime/node_modules/liquidjs');
const root = path.resolve(__dirname, '..');
const prepare = source => source
  .replace(/{%-?\s*doc\s*-?%}[\s\S]*?{%-?\s*enddoc\s*-?%}/g, '')
  .replace(/{%-?\s*stylesheet\s*-?%}[\s\S]*?{%-?\s*endstylesheet\s*-?%}/g, '')
  .replace(/{%-?\s*form\s+[^%]+%}/g, '<form>')
  .replace(/{%-?\s*endform\s*-?%}/g, '</form>');
const translations = JSON.parse(fs.readFileSync(path.join(root, 'locales/en.default.json'), 'utf8')
  .replace(/^\s*\/\*[\s\S]*?\*\//, '').replace(/^\s*\/\/.*$/gm, ''));
const engine = new Liquid({
  root: path.join(root, 'snippets'), extname: '.liquid', relativeReference: false,
  fs: {
    resolve: (dir, file, ext) => path.resolve(dir, file.endsWith(ext) ? file : file + ext),
    exists: async file => fs.existsSync(file), existsSync: file => fs.existsSync(file),
    readFile: async file => prepare(fs.readFileSync(file, 'utf8')),
    readFileSync: file => prepare(fs.readFileSync(file, 'utf8')),
  },
});
let missingPurchaseTranslations = false;
engine.registerFilter('t', (key, ...args) => {
  if (missingPurchaseTranslations && key.startsWith('panquire.purchase.')) return 'Translation missing: en.' + key;
  let text = key.split('.').reduce((obj, part) => obj?.[part], translations);
  assert.equal(typeof text, 'string', `Missing translation: ${key}`);
  for (const [name, value] of args) text = text.replaceAll(`{{ ${name} }}`, String(value));
  return text;
});
engine.registerFilter('asset_url', value => '/assets/' + value);
engine.registerFilter('stylesheet_tag', value => `<link rel="stylesheet" href="${value}">`);
engine.registerFilter('inline_asset_content', value => fs.readFileSync(path.join(root, 'assets', value), 'utf8'));
engine.registerFilter('money', value => '$' + (value / 100).toFixed(2));
engine.registerFilter('money_with_currency', value => '$' + (value / 100).toFixed(2) + ' USD');
engine.registerFilter('payment_button', () => '<button class="shopify-payment-button__button--unbranded">Buy now</button>');
engine.registerFilter('payment_type_svg_tag', value => `<svg aria-label="${value}"></svg>`);
const source = prepare(fs.readFileSync(path.join(root, 'snippets/pq-product-purchase.liquid'), 'utf8'));
async function render(overrides = {}, handle = 't-01', productOverrides = {}) {
  const variant = { id: 123, available: true, price: 200000, inventory_management: 'shopify', inventory_quantity: 10, inventory_policy: 'deny', quantity_rule: { min: 1, increment: 1 }, ...overrides };
  const product = { id: 1, title: handle.toUpperCase(), handle, url: '/products/' + handle, has_only_default_variant: true, selected_or_first_available_variant: variant, metafields: {}, ...productOverrides };
  return engine.parseAndRender(source, { product, section: { id: 'template-test__main' }, block: { id: 'product-details' }, form: {}, settings: {}, routes: {} });
}
(async () => {
  for (const handle of ['t-01', 't-02', 't-03']) {
    const html = await render({}, handle);
    assert.match(html, /ref="variantId"\s+value="123"/);
    assert.match(html, /In stock/);
    assert.match(html, /data-pq-cart-pending role="status" hidden>Adding/);
    assert.equal((html.match(/class="pq-purchase__accessory"/g) || []).length, 7);
    assert.equal((html.match(/class="pq-purchase__policy"/g) || []).length, 4);
    assert.match(html, /one year warranty protection/);
    // A policy may describe separately agreed preorders without declaring this stock a preorder.
    assert.doesNotMatch(html, /type="checkbox"|available for pre[- ]?order|stock is expected to reach|two-year/i);
    assert.match(html, /aria-label="american_express"/);
    assert.doesNotMatch(html, /pq-purchase__review-count/);
    assert.doesNotMatch(html, /BLACK FRIDAY|pq-purchase__campaign|<a\b[^>]*>17 reviews/i);
  }
  for (const overrides of [
    { available: false, inventory_quantity: 0 },
    { inventory_quantity: 0, inventory_policy: 'continue' },
    { inventory_quantity: -1, inventory_policy: 'continue' },
    { inventory_quantity: 1, quantity_rule: { min: 2, increment: 2 } },
  ]) {
    const html = await render(overrides);
    assert.match(html, /Unavailable/);
    assert.doesNotMatch(html, /<product-form-component|payment-button__button/);
  }
  const noDelivery = await render({ available: false });
  assert.match(noDelivery, /In stock\. Delivery is unavailable in your country/);
  assert.doesNotMatch(noDelivery, /Sold out|<product-form-component/);
  const untracked = await render({ inventory_management: null, inventory_quantity: 0 });
  assert.match(untracked, /<product-form-component/);
  const normal = await render();
  const multipleVariants = await render({}, 't-01', { has_only_default_variant: false });
  assert.doesNotMatch(multipleVariants, /pq-purchase__variants|PurchaseVariant-|<select\b/);
  assert.match(multipleVariants, /ref="variantId"\s+value="123"/);
  assert.doesNotMatch(normal, /pq-purchase__discount/);
  assert.match(normal, /max="10"/);
  const capped = await render({ inventory_policy: 'continue', inventory_quantity: 4 });
  assert.match(capped, /max="4"/);
  const quantityRule = await render({ quantity_rule: { min: 1, increment: 1, max: 2 } });
  assert.match(quantityRule, /max="2"/);
  const sale = await render({ price: 90900, compare_at_price: 129900 });
  assert.match(sale, /\$909\.00 USD/);
  assert.match(sale, /\$1299\.00 USD/);
  assert.match(sale, /30% OFF/);
  assert.doesNotMatch(sale, /BF /);
  missingPurchaseTranslations = true;
  const fallback = await render({ price: 90900, compare_at_price: 129900 }, 't-01', {
    metafields: { reviews: { rating: { value: { rating: 4.5 } }, rating_count: { value: 17 } } },
  });
  assert.match(fallback, /17 reviews/);
  assert.match(fallback, /30% OFF/);
  assert.doesNotMatch(fallback, /BLACK FRIDAY|BF /i);
  assert.match(fallback, /NFC Smart Key Fobs/);
  assert.match(fallback, /one year warranty protection/);
  assert.doesNotMatch(fallback, /translation missing|panquire\.purchase\./i);
  console.log('Purchase panel: models, real prices, seven accessories, policies, payment logos and no-preorder stock guards passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
