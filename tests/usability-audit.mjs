import {chromium} from '../tr-assistant/node_modules/playwright/index.mjs';
import AxeBuilder from '../tr-assistant/node_modules/@axe-core/playwright/dist/index.mjs';
import {stubAutomaticReview} from './helpers.mjs';
import fs from 'node:fs';
const base=process.env.TEST_BASE||'http://localhost:8787',browser=await chromium.launch({headless:true,channel:'chromium'}),report={base,at:new Date().toISOString(),checks:[],accessibility:[]};
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
function check(name,pass,detail=''){report.checks.push({name,pass,detail});}
async function axe(name){const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({view:name,violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.length,examples:v.nodes.slice(0,3).map(n=>n.html)}))});}
try{
  await stubAutomaticReview(page,base);
  await page.goto(base+'/');await page.locator('[data-swipe-card]').waitFor();await axe('anonymous quick triage');check('one opportunity at a time',await page.locator('[data-swipe-card]').count()===1);check('category without objective form',await page.locator('[data-goal-choice]').count()===0&&await page.locator('.onepage-category').isVisible());await page.screenshot({path:'/tmp/licitacoes-triagem-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});const actionBox=await page.locator('.swipe-actions').boundingBox();check('accept/decline visible without scrolling on mobile',actionBox.y>=0&&actionBox.y+actionBox.height<=844);await page.screenshot({path:'/tmp/licitacoes-triagem-mobile.png',fullPage:true});check('triage fits mobile width',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.setViewportSize({width:1440,height:1000});await page.locator('nav [data-view=board]').click();await page.locator('.card').first().waitFor();await axe('anonymous Kanban');
  check('explicit read-only mode',await page.getByText(/modo consulta|somente leitura/i).count()>0);
  check('bid action on cards',await page.locator('[data-quick-bid]').count()>0);
  await page.getByText('Entrar na equipe',{exact:true}).click();await page.locator('[name=email]').fill('qa.alice@licitacoes.test');await page.locator('[name=password]').fill('Local-QA-9Oct!2026');await page.locator('#auth-form button[type=submit],#auth-form button:not([type])').first().click();await page.locator('.account').waitFor();
  await page.locator('#search').fill('78316064000193-1-000033/2026');await page.locator('[data-open]').first().click();await page.locator('#work-owner').waitFor();await axe('opportunity summary');
  check('long text is optional and collapsed',!await page.locator('#work-notes').isVisible());await page.locator('#work-extra summary').click();await page.locator('#work-notes').fill('Rascunho da auditoria: não descartar');await page.locator('.tabs [data-detail-tab=docs]').click();await page.locator('.tabs [data-detail-tab=overview]').click();
  check('notes survive tab switch',await page.locator('#work-notes').inputValue()==='Rascunho da auditoria: não descartar');
  check('visible bid tab',await page.locator('.tabs [data-detail-tab=bids]').count()>0);
  await page.locator('.tabs [data-detail-tab=docs]').click();await axe('documents and AI');await page.locator('.tabs [data-detail-tab=tasks]').click();await axe('tasks');await page.locator('.tabs [data-detail-tab=bids]').click();await axe('bid preparation');await page.locator('.tabs [data-detail-tab=quote]').click();check('simple price has only one initial numeric field',await page.locator('[data-quote]:visible').count()===1);await axe('price calculation');
  await page.setViewportSize({width:390,height:844});
  check('portal action visible on mobile',await page.locator('.portal-fact').isVisible());
  check('no mobile horizontal page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.screenshot({path:'/tmp/licitacoes-audit-mobile.png',fullPage:true});
  await page.locator('[data-close=detail]').click();await page.setViewportSize({width:1440,height:1000});await page.locator('#clear-filters').click();await page.screenshot({path:'/tmp/licitacoes-audit-desktop.png',fullPage:true});
  fs.writeFileSync('/tmp/licitacoes-usability-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.checks.some(c=>!c.pass)||report.accessibility.some(a=>a.violations.length))process.exitCode=1;
}finally{await browser.close();}
