import {chromium} from '../tr-assistant/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.TEST_BASE||'http://localhost:8787';
const access=JSON.parse(fs.readFileSync(new URL('../dados/workspace-access.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true,channel:'chromium'});
const aliceContext=await browser.newContext({viewport:{width:1600,height:1000}}),bobContext=await browser.newContext({viewport:{width:1600,height:1000}});
const alice=await aliceContext.newPage(),bob=await bobContext.newPage(),errors=[];
alice.on('pageerror',err=>errors.push(err.message));bob.on('pageerror',err=>errors.push(err.message));
async function until(page,condition){await page.waitForFunction(condition,{},{timeout:20000});}
const password='Local-QA-9Oct!2026';
async function registerOrLogin(page,email,name,invite){
  await page.goto(base+'/#invite='+invite);await page.locator('#auth-form').waitFor();
  await page.locator('[name=name]').fill(name);await page.locator('[name=email]').fill(email);await page.locator('[name=password]').fill(password);await page.locator('#auth-form button').click();
  await page.waitForFunction(()=>!document.querySelector('#auth').open||document.querySelector('#auth-error').textContent,{},{timeout:20000});
  if(await page.locator('#auth').evaluate(d=>d.open)){
    await page.goto(base+'/');await page.getByText('Entrar na equipe',{exact:true}).click();await page.locator('[name=email]').fill(email);await page.locator('[name=password]').fill(password);await page.locator('#auth-form button').click();
  }
  await until(page,()=>!document.querySelector('#auth').open&&document.querySelector('.account'));
}
async function request(page,path,method='GET',body){return page.evaluate(async({path,method,body})=>{const response=await fetch('/api'+path,{method,headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});return {status:response.status,body:await response.json()};},{path,method,body});}
try{
  await alice.goto(base+'/');await alice.locator('.card').first().waitFor();
  assert.equal(await alice.locator('.column').count(),8,'Kanban must be the initial screen');
  assert.equal(await alice.locator('.column[data-drop-stage=nova] .due.urgent').filter({hasText:'encerrado'}).count(),0,'Expired deadlines must not appear under Novas');
  assert.equal((await request(alice,'/workspace')).status,401,'Anonymous cannot read team data');
  await registerOrLogin(alice,'qa.alice@licitacoes.test','QA Alice',access.testInvite);
  const invitation=await request(alice,'/invites','POST',{});assert.equal(invitation.status,200);
  await registerOrLogin(bob,'qa.bob@licitacoes.test','QA Bob',new URL(invitation.body.url).hash.slice(8));
  const workspace=(await request(alice,'/workspace')).body,r=workspace.catalog.find(r=>r.docs?.length&&r.it?.length&&!r.dup)||workspace.catalog[0],bobMember=workspace.members.find(m=>m.email==='qa.bob@licitacoes.test');
  await alice.locator('#search').fill(r.id);await alice.locator('[data-open]').first().click();
  await Promise.all([alice.waitForResponse(res=>res.request().method()==='PATCH'&&res.url().includes('/opportunities/')),alice.locator('#work-owner').selectOption(bobMember.id)]);
  await Promise.all([alice.waitForResponse(res=>res.request().method()==='PATCH'&&res.url().includes('/opportunities/')),alice.locator('#work-stage').selectOption('compativel')]);
  await alice.locator('[data-detail-tab=tasks]').click();await alice.locator('#task-form [name=title]').fill('QA: conferir TR e documentação');await alice.locator('#task-form [name=assigneeId]').selectOption(bobMember.id);await alice.locator('#task-form [name=dueAt]').fill('2026-10-12');await alice.locator('#task-form [name=kind]').selectOption('document');await alice.locator('#task-form button').click();
  await alice.locator('.task-title').filter({hasText:'QA: conferir TR e documentação'}).first().waitFor();
  await alice.locator('[data-detail-tab=overview]').click();await alice.locator('#comment-form [name=body]').fill('QA: escopo revisado pela primeira pessoa');await alice.locator('#comment-form button').click();await alice.getByText('QA: escopo revisado pela primeira pessoa',{exact:true}).waitFor();
  await alice.locator('[data-detail-tab=quote]').click();await alice.locator('[data-quote=licenses]').fill('790');await alice.locator('[data-quote=hours]').fill('10');await alice.locator('[data-quote=hourly]').fill('100');await Promise.all([alice.waitForResponse(res=>res.request().method()==='PATCH'&&res.url().includes('/opportunities/')),alice.locator('[data-action=save-quote]').click()]);
  const detail=(await request(bob,'/opportunities/'+encodeURIComponent(r.id)+'/detail')).body;
  assert.equal(detail.work.stage,'compativel');assert.equal(detail.work.owner_id,bobMember.id);assert.equal(JSON.parse(detail.work.quote).licenses,790);assert.ok(detail.tasks.some(t=>t.title==='QA: conferir TR e documentação'));assert.ok(detail.comments.some(c=>c.body==='QA: escopo revisado pela primeira pessoa'));
  const stale=await request(bob,'/opportunities/'+encodeURIComponent(r.id),'PATCH',{stage:'perdida',ownerId:null,version:0});assert.equal(stale.status,409,'Stale editing must not overwrite team work');
  await bob.locator('#refresh-workspace').click();await bob.locator('#search').fill(r.id);await bob.locator('[data-open]').first().click();await bob.locator('[data-detail-tab=tasks]').click();await Promise.all([bob.waitForResponse(res=>res.url().includes('/api/tasks/')&&res.request().method()==='PATCH'),bob.locator('[data-task-toggle]').first().check()]);
  assert.ok((await request(alice,'/opportunities/'+encodeURIComponent(r.id)+'/detail')).body.tasks.some(t=>t.done));
  await alice.locator('[data-close=detail]').click();await alice.locator('#clear-filters').click();await alice.screenshot({path:'/tmp/licitacoes-kanban-desktop.png',fullPage:true});
  const mobile=await browser.newPage({viewport:{width:390,height:844}});await mobile.goto(base+'/');await mobile.locator('.column').first().waitFor();await mobile.screenshot({path:'/tmp/licitacoes-kanban-mobile.png',fullPage:true});await mobile.close();
  assert.deepEqual(errors,[],'No frontend exceptions');
  console.log(JSON.stringify({result:'PASS',base,opportunity:r.id,checks:['initial Kanban','no expired new records','private team data','two individual accounts','shared owner and stage','shared tasks and checklist','shared comments','shared budget','stale-write conflict','cross-account task completion','desktop/mobile rendering'],screenshots:['/tmp/licitacoes-kanban-desktop.png','/tmp/licitacoes-kanban-mobile.png']}));
}finally{await browser.close();}
