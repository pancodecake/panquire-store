const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Liquid } = require('../.preview-runtime/node_modules/liquidjs');
const root = path.resolve(__dirname, '..');
const clean = text => text.replace(/{% doc %}[\s\S]*?{% enddoc %}/g, '');
const engine = new Liquid({root:path.join(root,'snippets'),extname:'.liquid'});
const source = clean(fs.readFileSync(path.join(root,'snippets/pq-model-data.liquid'),'utf8'));
(async () => {
  for (const [model, speed, power, battery, weight] of [['t-01','80 km/h','8000W','31.2Ah','55 kg'],['t-02','100 km/h','11,000W','41Ah','']]) {
    for (const [field,value] of [['Maximum speed',speed],['Peak motor power',power],['Battery capacity',battery],['Net weight',weight]]) {
      assert.equal((await engine.parseAndRender(source,{model,field})).trim(),value);
    }
    const rows=(await engine.parseAndRender(source,{model,field:'rows'})).trim().split('\n').map(row=>row.split('|'));
    assert.equal(rows.length,32);
    const expected=require('./product-listings.cjs').models.find(item=>item.handle===model).rows;
    assert.deepEqual(rows,expected);
    const fromAdmin = await engine.parseAndRender(source,{model,field:'Warranty',all_products:{[model]:{metafields:{custom:{panquire_specifications:{value:'Overview|Warranty|Admin value'}}}}}});
    assert.equal(fromAdmin.trim(),'Admin value');
    assert(rows.every(row=>row.length===3 && row.every(Boolean)));
    assert.equal(new Set(rows.map(row=>row[1])).size,rows.length);
    const image=(await engine.parseAndRender(source,{model,field:'image'})).trim();
    assert(fs.existsSync(path.join(root,'assets',image)));
  }
  assert.equal((await engine.parseAndRender(source,{model:'unknown',field:'rows'})).trim(),'');
  const template=JSON.parse(fs.readFileSync(path.join(root,'templates/product.panquire.json'),'utf8'));
  assert.equal(template.sections.main.type,'product-information');
  assert.equal(template.sections.main.blocks['media-gallery'].settings.pq_placeholder,false);
  assert.deepEqual(template.sections.model_story.block_order,['t01','t02']);
  assert(!fs.existsSync(path.join(root,'templates/page.products.json')));
  console.log('Model data, image assets, shared native product template and removed listing: passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
