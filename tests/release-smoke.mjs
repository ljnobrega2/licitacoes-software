import {chromium} from '../tr-assistant/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='https://licitacoes-tr-assistant.lucasjesusnobrega.workers.dev',access=JSON.parse(fs.readFileSync(new URL('../dados/workspace-access.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true,channel:'chromium'});
try {
  const page=await browser.newPage({viewport:{width:1600,height:1000}});await page.goto(base+'/');await page.locator('.card').first().waitFor();
  assert.equal(await page.locator('.column').count(),8);
  const downloadPromise=page.waitForEvent('download');await page.locator('#export-snapshot').click();const download=await downloadPromise;
  const file=await download.path(),snapshot=JSON.parse(fs.readFileSync(file,'utf8'));assert.ok(snapshot.exportedAt);assert.ok(snapshot.catalog.length>0);assert.equal(snapshot.scope,'acervo público');assert.equal(snapshot.members,undefined);
  await page.screenshot({path:'/tmp/licitacoes-release-desktop.png',fullPage:true});
  await page.goto(base+'/#invite='+access.adminInvite);await page.locator('#auth-form [name=name]').waitFor();assert.ok(await page.getByText('Criar conta e abrir quadro',{exact:true}).isVisible());
  console.log(JSON.stringify({result:'PASS',checks:['eight Kanban stages','snapshot download','public export without team data','administrator invitation onboarding'],catalog:snapshot.catalog.length}));
} finally {await browser.close();}
