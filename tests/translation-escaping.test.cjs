const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Liquid } = require(process.env.LIQUIDJS_MODULE || '../.preview-runtime/node_modules/liquidjs');
const root = path.resolve(__dirname, '..');
const engine = new Liquid();
const escape = value => engine.parseAndRenderSync('{{ value | escape }}', { value });
let text;
// Shopify escapes ordinary translation keys before subsequent Liquid filters run.
engine.registerFilter('t', () => escape(text));
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? files(file) : file.endsWith('.liquid') ? [file] : [];
  });
}
(async () => {
  let checked = 0;
  for (const dir of ['blocks', 'sections', 'snippets', 'layout']) {
    for (const file of files(path.join(root, dir))) {
      const source = fs.readFileSync(file, 'utf8');
      for (const [expression] of source.matchAll(/{{-?[^{}]*\|\s*t(?:\s*|:[^|{}]*)\|\s*escape(?:_once)?\b[^{}]*}}/g)) {
        for (text of ["customer's bank", 'Returns & Refunds', 'L\'autonomie', 'Say "hello" <script>alert(1)</script>']) {
          const result = await engine.parseAndRender(expression, {});
          assert.equal(result, escape(text), `${path.relative(root, file)}: ${expression}`);
        }
        checked++;
      }
    }
  }
  assert(checked > 100, 'Must exercise translation outputs across the theme');
  console.log(`Verified ${checked} translated outputs: apostrophes, ampersands, quotes and HTML stay escaped once.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
