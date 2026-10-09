import {chromium} from '../tr-assistant/node_modules/playwright/index.mjs';
import AxeBuilder from '../tr-assistant/node_modules/@axe-core/playwright/dist/index.mjs';
import assert from 'node:assert/strict';
const base=process.env.TEST_BASE||'http://localhost:8787',browser=await chromium.launch({channel:'chromium',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
async function audit(view){const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();results.push({view,violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.length,examples:v.nodes.slice(0,2).map(n=>n.html)}))});console.log(JSON.stringify(results.at(-1)));}
try{
  await page.goto(base);await page.locator('[data-swipe-card]').waitFor();await page.getByText('Entrar na equipe',{exact:true}).click();await page.locator('#auth-form').waitFor();await audit('login');await page.locator('[name=email]').fill('qa.alice@licitacoes.test');await page.locator('[name=password]').fill('Local-QA-9Oct!2026');await page.locator('#auth-form button').first().click();await page.locator('.account').waitFor();
  for(const view of ['team','tasks','bids','portals','declined','radar','archive','atas']){await page.locator('nav [data-view='+view+']').click();await page.waitForFunction(view=>document.querySelector('nav [data-view="'+view+'"]').classList.contains('active'),view);if(['radar','archive','atas'].includes(view))await page.locator('#search').fill(view==='archive'?'00509018000113-1-002239/2026':view==='atas'?'Microsoft':'Londrina');await audit(view);await page.locator('#search').fill('');}
  await page.locator('nav [data-view=triage]').click();for(const width of [320,390,768,1600]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page-level overflow at '+width);}
  assert.deepEqual(errors,[]);assert.ok(results.every(r=>!r.violations.length),'Automated accessibility checks must pass');console.log(JSON.stringify({result:'PASS',base,views:results.length,widths:[320,390,768,1600]}));
}finally{await browser.close();}
