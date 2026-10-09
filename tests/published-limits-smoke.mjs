// Read-only public release check: anonymous drafts only, no team mutations.
import {chromium} from '../tr-assistant/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const base=process.env.TEST_BASE||'https://licitacoes-tr-assistant.lucasjesusnobrega.workers.dev/';
const health=await (await fetch(new URL('/api/health',base))).json();assert.equal(health.version,'2026.10.09-team-6');
const browser=await chromium.launch({channel:'chromium',headless:true}),context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage(),errors=[],writes=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',request=>{if(!['GET','HEAD'].includes(request.method()))writes.push(request.url());});
try{
  await page.goto(base);await page.locator('[data-swipe-card]').waitFor();
  const catalog=await page.evaluate(async()=> (await (await fetch('/api/catalog')).json()).catalog),r=catalog.find(r=>r.id==='78316064000193-1-000033/2026');assert.ok(r);
  await page.locator('#search').fill(r.id);await page.locator('[data-swipe-card="'+r.id+'"]').waitFor();
  const cap=Math.min(r.it[0].vu,Math.floor(r.it[0].vt/r.it[0].q*10000+1e-7)/10000),key=r.it[0].n,field=page.locator('[data-inline-floor="'+key+'"]'),high=(cap+.0001).toFixed(4).replace('.',',');
  await field.fill(high);assert.equal(await field.getAttribute('aria-invalid'),'true');assert.equal(await field.inputValue(),high);assert.ok(await page.locator('[data-inline-save-floors]').isDisabled());assert.ok(await page.locator('[data-triage-accept]').isDisabled());assert.match(await page.locator('[data-line-feedback="'+key+'"]').textContent(),/Máximo/);
  await field.fill(cap.toFixed(4).replace('.',','));assert.equal(await field.getAttribute('aria-invalid'),'false');assert.ok(await page.locator('[data-triage-accept]').isEnabled());
  const global=page.locator('[data-inline-floor="total"]');await global.fill((r.val+.0001).toFixed(4).replace('.',','));assert.ok(await page.locator('[data-triage-accept]').isDisabled());assert.equal(await global.getAttribute('aria-invalid'),'true');
  for(const width of [320,390,768,1600]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.screenshot({path:'/tmp/licitacoes-public-price-limits.png',fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  console.log(JSON.stringify({result:'PASS',base,version:health.version,checks:['published unit reference is visible','excess of 0.0001 blocks save and accept','exact published reference accepted','global excess blocked','draft value is not clamped','four widths without overflow','no JavaScript errors','no external writes or team changes']}));
}finally{await browser.close();}
