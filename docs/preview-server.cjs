// Local visual preview only. Renders the real Liquid sections against sample data.
// Shopify remains responsible for products, checkout, accounts and form submission.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Liquid } = require('../.preview-runtime/node_modules/liquidjs');
const root = path.resolve(__dirname, '..');
const liveClients = new Set();
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const json = p => JSON.parse(read(p).replace(/^\s*\/\*[\s\S]*?\*\//,'').replace(/^\s*\/\/.*$/gm,''));
function prepare(s) {
  return s.replace(/{%-?\s*(schema|doc)\s*-?%}[\s\S]*?{%-?\s*end\1\s*-?%}/g,'')
    .replace(/{%-?\s*(stylesheet|style)\s*-?%}/g,'<style>').replace(/{%-?\s*end(stylesheet|style)\s*-?%}/g,'</style>')
    .replace(/{%-?\s*javascript\s*-?%}[\s\S]*?{%-?\s*endjavascript\s*-?%}/g,'')
    .replace(/{%-?\s*form\s+([^%]+)-?%}/g,(_,a)=>`<form class="${a.includes("'customer'")?'pq-newsletter-form':''}" data-local-form>`)
    .replace(/{%-?\s*endform\s*-?%}/g,'</form>');
}
function defaults(file) {
  const m = read(file).match(/{% schema %}([\s\S]*?){% endschema %}/);
  if(!m) return {};
  return Object.fromEntries((JSON.parse(m[1]).settings||[]).filter(s=>s.default!==undefined).map(s=>[s.id,s.default]));
}
const pageTemplates = {'/':'templates/index.json','/products/preview':'templates/product.json','/pages/about':'templates/page.about.json','/pages/partners':'templates/page.partners.json','/pages/terms':'templates/page.terms.json','/pages/contact':'templates/page.contact.json'};
async function page(pathname) {
  const productPage = pathname === '/products/preview';
  const pageHandle = pathname.startsWith('/pages/') ? pathname.split('/').pop() : '';
  const engine = new Liquid({root:[path.join(root,'snippets')],extname:'.liquid',relativeReference:false,strictFilters:false,fs:{
    resolve:(dir,f,ext)=>path.resolve(dir,f.endsWith(ext)?f:f+ext),
    exists:async p=>fs.existsSync(p),existsSync:p=>fs.existsSync(p),
    readFile:async p=>prepare(fs.readFileSync(p,'utf8')),readFileSync:p=>prepare(fs.readFileSync(p,'utf8'))
  }});
  const locales = json('locales/en.default.json');
  engine.registerFilter('t',(key,...args)=>{let s=String(key).split('.').reduce((o,k)=>o?.[k],locales); if(typeof s!=='string') s=key;for(const a of args){if(Array.isArray(a))s=s.replaceAll(`{{ ${a[0]} }}`,a[1]);}return s;});
  engine.registerFilter('asset_url',s=>'/assets/'+s);
  engine.registerFilter('stylesheet_tag',s=>`<link rel="stylesheet" href="${s}">`);
  engine.registerFilter('inline_asset_content',s=>fs.existsSync(path.join(root,'assets',s))?read('assets/'+s):'');
  engine.registerFilter('money',()=> 'Price pending');
  engine.registerFilter('money_with_currency',()=> 'Price pending');
  engine.registerFilter('structured_data',()=> '{}');
  engine.registerFilter('standard_event_data',()=> '{}');
  engine.registerFilter('color_brightness',()=> 10);
  engine.registerFilter('color_to_rgb',s=>s);
  engine.registerFilter('font_face',()=> '');
  engine.registerFilter('payment_button',()=> '<button type="button" class="button-secondary" disabled>Checkout available on Shopify</button>');
  const config = json('config/settings_schema.json');
  const settings = Object.assign({},...config.map(g=>Object.fromEntries((g.settings||[]).filter(s=>s.default!==undefined).map(s=>[s.id,s.default]))),json('config/settings_data.json').current);
  const variant={id:1,title:'Carbon',available:true,price:0,inventory_quantity:10,inventory_policy:'deny',inventory_management:'shopify',quantity_rule:{min:1,increment:1},quantity_price_breaks:[],options:['Carbon'],url:'/products/preview'};
  const product={id:1,title:'Panquire electric mini bike',handle:'preview',url:'/products/preview',available:true,price:0,price_min:0,price_max:0,description:'<p>Preview product. Add your product description, pricing, and specifications in Shopify.</p>',has_only_default_variant:true,options:[],options_with_values:[],variants:[variant],selected_or_first_available_variant:variant,media:[],images:[],metafields:{}};
  const env={settings,shop:{name:'Panquire',policies:[],currency:'USD'},routes:{root_url:'/',search_url:'/search',cart_url:'/cart',account_url:'/account',all_products_collection_url:'/collections/all'},request:{page_type:productPage?'product':'index',locale:{iso_code:'en'},design_mode:false},template:{name:productPage?'product':'index'},cart:{item_count:0},product,closest:{product},form:{},localization:{country:{iso_code:'US',currency:{iso_code:'USD'}}}};
  if (pageHandle) { env.page = {handle:pageHandle}; env.request.page_type = 'page'; env.template.name = 'page'; }
  for(const k of Object.keys(settings)) if(typeof settings[k]==='string'&&settings[k].includes('{{')) settings[k]=await engine.parseAndRender(settings[k],env);
  async function hydrateBlock(id,b) {
    const out={...b,id,shopify_attributes:'',settings:{...defaults('blocks/'+b.type+'.liquid'),...b.settings}};
    for(const k of Object.keys(out.settings)) if(typeof out.settings[k]==='string'&&out.settings[k].includes('{{')) out.settings[k]=await engine.parseAndRender(out.settings[k],env);
    return out;
  }
  engine.registerTag('content_for',{
    parse(token){this.args=token.args;},
    async render(ctx){
      const parent=ctx.getSync(['block'])||ctx.getSync(['section']);
      let list=[];
      if(/^'blocks'/.test(this.args)) list=(parent.block_order||[]).map(id=>[id,parent.blocks[id]]);
      else {const id=this.args.match(/id:\s*'([^']+)'/)?.[1];const type=this.args.match(/type:\s*'([^']+)'/)?.[1];if(id)list=[[id,parent.blocks?.[id]||{type,settings:{}}]];}
      let out='';
      for(const [id,b] of list){if(!b||b.disabled)continue;const block=await hydrateBlock(id,b);out+=await engine.parseAndRender(prepare(read('blocks/'+block.type+'.liquid')),{...ctx.getAll(),block},{globals:{...env,section:ctx.getSync(['section']),block}});}
      return out;
    }
  });
  async function section(id,s) {
    const file='sections/'+s.type+'.liquid';
    const sec={...s,id,settings:{...defaults(file),...s.settings}};
    if(s.type.startsWith('pq-')) {
      const schema=JSON.parse(read(file).match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
      if (!schema.blocks?.some(b => b.settings === undefined)) sec.blocks=(s.block_order||[]).map(id=>{const b=s.blocks[id];const d=Object.fromEntries((schema.blocks?.find(x=>x.type===b.type)?.settings||[]).filter(x=>x.default!==undefined).map(x=>[x.id,x.default]));return {...b,id,settings:{...d,...b.settings},shopify_attributes:''};});
    }
    return `<div id="shopify-section-${id}">`+await engine.parseAndRender(prepare(read(file)),{...env,section:sec},{globals:{...env,section:sec}})+'</div>';
  }
  let content='';
  const template=json(pageTemplates[pathname]);
  for(const id of template.order){const s=template.sections[id];if(!s.disabled)content+=await section(id,s);}
  const header=json('sections/header-group.json');const footer=json('sections/footer-group.json');
  let top='',bottom='';for(const id of header.order)top+=await section(id,header.sections[id]);for(const id of footer.order)bottom+=await section(id,footer.sections[id]);
  const tokens=await engine.parseAndRender(prepare(read('snippets/pq-color-tokens.liquid')),env);
  const nativeTokens=await engine.parseAndRender(prepare(read('snippets/theme-styles-variables.liquid')),env,{globals:env});
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Panquire — local theme preview</title><link rel="stylesheet" href="/assets/base.css">${nativeTokens}${tokens}<link rel="stylesheet" href="/assets/panquire.css"><link rel="stylesheet" href="/assets/panquire-product.css"><link rel="stylesheet" href="/assets/panquire-pages.css"><style>body{margin:0;font-family:Arial,sans-serif}.preview-bar{padding:10px 16px;background:#151619;color:#F3F3F1;text-align:center;font:13px/1.5 Arial}.preview-bar a{color:inherit;margin:0 12px;text-decoration:underline}.product-information{--page-width:1050px;--page-margin:24px;--page-width-margin:48px;--normal-page-width:1050px}.product-information__grid{column-gap:0}.product-details{min-width:0}.view-product-title{display:none}.pq-storefront .button{padding:14px 24px;min-height:44px;border:0;border-radius:2px}.pq-storefront input{color:var(--text);background:var(--surface)}.group-block{min-width:0}</style></head><body class="pq-storefront page-width-narrow"><div class="preview-bar">Local Liquid preview · sample product · Shopify checkout unavailable <a href="/">Homepage</a><a href="/products/preview">Product page</a><a href="/pages/about">About</a><a href="/pages/partners">Partners</a><a href="/pages/terms">Terms</a></div><div id="header-group">${top}</div><main id="MainContent">${content}</main>${bottom}<script src="/assets/panquire.js" defer></script><script src="/assets/panquire-pages.js" defer></script><script>document.addEventListener('submit',e=>{e.preventDefault();if(e.target.matches('.pq-policy-search'))return;alert('This is a local visual preview. Forms and checkout work on Shopify.');});new EventSource('/__live').onmessage=e=>{if(e.data==='reload')location.reload();};</script></body></html>`;
}
const server = http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/__live') {
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','Access-Control-Allow-Origin':'*'});
      res.write(': connected\n\n');
      liveClients.add(res);
      req.on('close',()=>liveClients.delete(res));
      return;
    }
    if(url.pathname.startsWith('/assets/')) {
      const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
      if(!file.startsWith(path.join(root,'assets')+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
      const ext=path.extname(file);res.setHeader('Content-Type',({'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[ext]||'application/octet-stream');return res.end(fs.readFileSync(file));
    }
    if(!pageTemplates[url.pathname]) {res.writeHead(200,{'Content-Type':'text/html'});return res.end('<p>This route requires Shopify. <a href="/">Homepage</a> · <a href="/products/preview">Product preview</a></p>');}
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await page(url.pathname));
  }catch(e){console.error(e.stack);res.writeHead(500,{'Content-Type':'text/plain'});res.end(e.stack);}
});
server.listen(9393,'127.0.0.1',()=>console.log('Local Liquid preview: http://127.0.0.1:9393'));

let reloadTimer;
fs.watch(root,{recursive:true},(_,filename)=>{
  const changed = String(filename || '').replaceAll('\\','/');
  if (!changed || changed.startsWith('.git/') || changed.startsWith('.preview-runtime/') || changed.startsWith('docs/')) return;
  clearTimeout(reloadTimer);
  reloadTimer=setTimeout(()=>{
    for(const client of liveClients) client.write('data: reload\n\n');
  },150);
});
