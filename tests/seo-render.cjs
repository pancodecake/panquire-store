/* Render new Liquid with explicit storefront fixtures; no Shopify writes. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { Liquid } = require(process.env.LIQUIDJS_MODULE || 'liquidjs');
const root = path.resolve(__dirname, '..');
const clean = s => s.replace(/{%[\s-]*doc[\s\S]*?{%[\s-]*enddoc[\s-]*%}/g, '').replace(/{%[\s-]*schema[\s\S]*?{%[\s-]*endschema[\s-]*%}/g, '');
const read = p => clean(fs.readFileSync(path.join(root, p), 'utf8'));
function fixture() {
  const products = {};
  for (const [handle, price, voltage, ah, power, range, charger] of [['t-01',199900,60,31.2,9500,80,6], ['t-02',269900,72,41,13000,90,18], ['t-03',199900,60,31.2,9500,80,18]]) {
    const rows = [['Battery voltage',voltage+'V'],['Battery capacity',ah+'Ah'],['Nominal battery energy',(voltage*ah/1000)+' kWh'],['Peak motor power',power.toLocaleString('en-US')+'W'],['Range — Eco mode',range+' km'],['Charger',charger+'A']].map(([k,v])=>'Battery & charging|'+k+'|'+v).join('\n');
    products[handle] = { handle, title:'Panquire '+handle.toUpperCase()+' Electric Dirt Bike',url:'/products/'+handle,price,metafields:{custom:{panquire_specifications:{value:rows}},panquire:{}} };
  }
  return { all_products:products, product:products['t-02'], cart:{currency:{iso_code:'USD'}}, section:{id:'seo-guide'}, collection:{handle:'electric-dirt-bikes',title:'Electric Dirt Bikes',url:'/collections/electric-dirt-bikes'}, collections:{'electric-dirt-bikes':{url:'/collections/electric-dirt-bikes'}}, pages:{compare:{url:'/pages/compare'},contact:{url:'/pages/contact'},tos:{url:'/pages/tos'}}, page:{handle:''}, request:{page_type:'collection',origin:'https://panquire.com',locale:{iso_code:'en'}},canonical_url:'https://panquire.com/collections/electric-dirt-bikes',routes:{root_url:'/'},settings:{pq_store_name:'Panquire'},page_title:'Electric Dirt Bikes',current_page:1 };
}
async function render(file, ctx=fixture()) {
  const engine = new Liquid({root:path.join(root,'snippets'),extname:'.liquid',globals:ctx});
  engine.registerFilter('t', x=>x);
  engine.registerFilter('json', x=>JSON.stringify(x ?? null));
  engine.registerFilter('asset_url', x=>'/assets/'+x);
  engine.registerFilter('stylesheet_tag', x=>'<link rel="stylesheet" href="'+x+'">');
  engine.registerFilter('money_with_currency', x=>'$'+(x/100).toLocaleString('en-US',{minimumFractionDigits:2})+' USD');
  engine.registerFilter('newline_to_br', x=>String(x).replace(/\n/g,'<br />\n'));
  engine.options.fs = { ...engine.options.fs, readFile: async p=>clean(await fs.promises.readFile(p,'utf8')), readFileSync: p=>clean(fs.readFileSync(p,'utf8')) };
  return engine.parseAndRender(read(file),ctx);
}
async function verify() {
  let ctx = fixture();
  const links = await render('sections/pq-product-destinations.liquid', ctx);
  for (const handle of ['t-01','t-02','t-03']) assert.match(links, new RegExp('/products/' + handle));
  assert.doesNotMatch(links, /\/collections\//);
  const navigation = await render('snippets/pq-navigation.liquid', ctx);
  assert.match(navigation, /Electric Dirt Bikes[\s\S]*?\/products\/t-01[\s\S]*?\/products\/t-02[\s\S]*?Electric Motorcycles[\s\S]*?\/products\/t-03/);
  assert.doesNotMatch(navigation, /E-motos|\/collections\//);
  assert.match(navigation, /<strong>T-01<\/strong>\s*<span class="pq-model-menu-price">\$1,999\.00 USD/);
  assert.match(navigation, /<strong>T-02<\/strong>\s*<span class="pq-model-menu-price">\$2,699\.00 USD/);
  ctx.request.page_type='product';ctx.canonical_url='https://panquire.com/products/t-02';
  const crumbs=await render('snippets/pq-seo-breadcrumbs.liquid',ctx);const schema=JSON.parse(crumbs.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);assert.equal(schema.itemListElement.length,2);assert.equal(schema.itemListElement[1].item,ctx.canonical_url);
  ctx.product.title='Bike </script><script>bad()</script>';const escaped=await render('snippets/pq-seo-breadcrumbs.liquid',ctx);assert.equal((escaped.match(/<script/g)||[]).length,1);JSON.parse(escaped.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
  ctx=fixture();const org=JSON.parse((await render('snippets/pq-organization.liquid',ctx)).match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);assert.equal(org['@type'],'Organization');assert.equal(org.url,'https://panquire.com');
  const meta=await render('snippets/meta-tags.liquid',ctx);assert.match(meta,/<meta name="robots" content="noindex, follow">/);assert.match(meta,/<meta\s+name="description"/);assert.match(meta,/rel="canonical"/);
  ctx.request.locale.iso_code='fr';ctx.page_title='Motos de loisir';ctx.page_description='Description localisee';const localMeta=await render('snippets/meta-tags.liquid',ctx);assert.match(localMeta,/Motos de loisir/);assert.doesNotMatch(localMeta,/Electric Dirt Bikes for Adults/);ctx.request.locale.iso_code='en';
  ctx.request.page_type='product';ctx.product=ctx.all_products['t-01'];assert.match(await render('snippets/meta-tags.liquid',ctx),/60V Electric Dirt Bike/);assert.match(await render('snippets/pq-product-selection.liquid',ctx),/A 60V electric dirt bike/);
  ctx.product.selected_or_first_available_variant = { price: 199900, available: true, compare_at_price: 219900 };
  assert.match(await render('snippets/pq-product-selection.liquid',ctx), /under US\$2,000/);
  assert.match(await render('snippets/pq-product-selection.liquid',ctx), /Save \$200\.00 USD/);
  ctx.product.selected_or_first_available_variant = { price: 200000, available: true };
  assert.doesNotMatch(await render('snippets/pq-product-selection.liquid',ctx), /under US\$|Was <s>/);
  ctx.product.selected_or_first_available_variant.price = 199900;
  ctx.cart.currency.iso_code = 'EUR';
  assert.doesNotMatch(await render('snippets/pq-product-selection.liquid',ctx), /under US\$/);
  ctx.product=ctx.all_products['t-02'];assert.match(await render('snippets/meta-tags.liquid',ctx),/72V Electric Dirt Bike/);
  const price=await render('snippets/pq-model-comparison-static-cell.liquid',{...ctx,key:'price'});assert.match(price,/1,999/);assert.doesNotMatch(price,/1,699/);
  const selection=await render('snippets/pq-comparison-guide.liquid',fixture());assert.match(selection,/Sur-Ron alternative/);assert.match(selection,/2\.952 kWh/);
  console.log('SEO Liquid render checks passed: live-price changes, price ceilings, currency, page scoping, missing products, metadata, links, breadcrumbs and JSON-LD escaping.');
}
module.exports={fixture,render,root};
if(require.main===module)verify().catch(e=>{console.error(e);process.exitCode=1});
