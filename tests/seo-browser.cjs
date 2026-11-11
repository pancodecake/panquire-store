const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {fixture,render,root}=require('./seo-render.cjs');
const out=process.env.SEO_REVIEW_DIR || path.join(root,'.seo-preview');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const summary={live:[],previews:[]};
 try {
  const page=await browser.newPage();
  for(const route of ['/','/collections/electric-dirt-bikes','/products/t-02','/pages/compare']) {
   await page.goto('https://panquire.com'+route,{waitUntil:'domcontentloaded'});
   const data=await page.evaluate(()=>({title:document.title,h1:[...document.querySelectorAll('h1')].map(x=>x.textContent.trim()),canonical:document.querySelector('link[rel=canonical]')?.href,robots:document.querySelector('meta[name=robots]')?.content,structuredData:[...document.querySelectorAll('script[type="application/ld+json"]')].map(x=>{try{return JSON.parse(x.textContent)}catch{return {parseError:true}}})}));
   summary.live.push({route,...data});
  }
  const css=fs.readFileSync(path.join(root,'assets/panquire.css'),'utf8')+fs.readFileSync(path.join(root,'assets/pq-buying-guide.css'),'utf8');
  const font=(file)=>fs.readFileSync(path.join(root,'assets',file)).toString('base64');
  const fonts=`@font-face{font-family:Montserrat;src:url(data:font/woff2;base64,${font('montserrat-variable.woff2')})}@font-face{font-family:WorkSans;src:url(data:font/woff2;base64,${font('work-sans-variable.woff2')})}`;
  const base=`:root{--pq-heading-font:Montserrat,sans-serif;--pq-body-font:WorkSans,sans-serif;--pq-bg:#08090b;--pq-text:#f3f3f1;--pq-muted:#b8b9bd;--pq-line:#34363b;--color-bg-page:#08090b;--color-text-primary:#f3f3f1;--color-focus-ring:#d5d6d8;--color-accent-solid:#a97832}body{margin:0;background:#08090b;color:#f3f3f1}main>h1{font:700 36px Montserrat,sans-serif;padding:24px;margin:0} .pq-product-wrap{width:min(1050px,calc(100% - 48px));margin:auto}a:focus-visible,summary:focus-visible{outline:2px solid #d5d6d8;outline-offset:4px}`;
  for(const kind of ['collection','product','compare']) {
   const ctx=fixture();ctx.request.page_type=kind==='compare'?'page':kind;
   const file=kind==='collection'?'sections/pq-collection-guide.liquid':kind==='product'?'snippets/pq-product-selection.liquid':'snippets/pq-comparison-guide.liquid';
   const body=await render(file,ctx);
   const html=`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${fonts}${css}${base}</style></head><body><main class="pq"><h1>${kind==='collection'?'Electric Dirt Bikes':kind==='product'?'Panquire T-02':'Electric dirt bike comparisons'}</h1><div class="${kind==='product'?'pq-product-wrap':kind==='compare'?'pq-container':''}">${body}</div></main></body></html>`;
   for(const width of [390,768,1440]) {
    await page.setViewportSize({width,height:1000});await page.setContent(html);await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('h1').count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,kind+' overflow at '+width);
    const empty=await page.locator('a').evaluateAll(a=>a.filter(x=>!x.getAttribute('href')).length);assert.equal(empty,0);
    const details=page.locator('details');if(await details.count()){await details.first().locator('summary').click();assert.equal(await details.first().getAttribute('open'),'');}
    const shot=path.join(out,kind+'-'+width+'.png');await page.screenshot({path:shot,fullPage:true});
    summary.previews.push({kind,width,noHorizontalOverflow:true,emptyLinks:empty,screenshot:shot});
   }
  }
  fs.writeFileSync(path.join(out,'browser-review.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify({livePages:summary.live.map(x=>({route:x.route,h1:x.h1,canonical:x.canonical,schemaTypes:x.structuredData.map(s=>s['@type']||s['@graph']?.map(g=>g['@type']))})),responsivePreviews:summary.previews.length,output:out},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
