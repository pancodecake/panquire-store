const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('homepage hero has a configured Shopify video and renders it inline', () => {
  const read = (path) => fs.readFileSync(new URL(path, `file:///${__dirname.replaceAll('\\', '/')}/`), 'utf8');
  const template = JSON.parse(read('../templates/index.json').replace(/^\s*\/\*[\s\S]*?\*\//, ''));
  const hero = template.sections.hero;
  assert.ok(template.order.includes('hero') && !hero.disabled);
  assert.equal(hero.type, 'pq-hero');
  assert.match(hero.blocks[hero.block_order[0]].settings.video, /^shopify:\/\/files\/videos\/.+\.mp4$/i);

  const section = read('../sections/pq-hero.liquid');
  const schema = JSON.parse(section.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
  assert.ok(schema.blocks.find((block) => block.type === 'slide').settings
    .some((setting) => setting.id === 'video' && setting.type === 'video'));
  const video = section.match(/{{\s*hero\.settings\.video\s*\|\s*video_tag:([^}]+)}}/);
  assert.ok(video, 'The hero must render the configured video');
  for (const attribute of ['autoplay', 'muted', 'playsinline', 'loop']) {
    assert.match(video[1], new RegExp(`\\b${attribute}: true\\b`));
  }
});
