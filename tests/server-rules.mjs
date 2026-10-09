// Trusted synthetic rule fixtures, strictly in the LOCAL development database.
// They are not official analyses and must never be installed in production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
const base='http://localhost:8787',id='78316064000193-1-000033/2026',path='/opportunities/'+encodeURIComponent(id),dir=new URL('../tr-assistant/',import.meta.url),file='/tmp/licitacoes-local-rule-qa.sql';let cookie='';
async function api(route,method='GET',body){const response=await fetch(base+'/api'+route,{method,headers:{origin:base,cookie,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(route==='/login')cookie=response.headers.get('set-cookie')?.split(';')[0]||'';return {status:response.status,body:await response.json()};}
function sql(statement){fs.writeFileSync(file,statement,{mode:0o600});return JSON.parse(execFileSync('./node_modules/.bin/wrangler',['d1','execute','licitacoes-team','--local','--file',file,'--json'],{cwd:dir,encoding:'utf8'}));}
const quoted=value=>"'"+String(value).replaceAll("'","''")+"'";
const login=await api('/login','POST',{email:'qa.alice@licitacoes.test',password:'Local-QA-9Oct!2026'});assert.equal(login.status,200);const initial=(await api(path+'/detail')).body,previous=sql('SELECT value FROM settings WHERE key='+quoted('review:'+id)+';')[0].results[0]?.value,member=login.body.member;
assert.ok(!initial.work.updated_by||initial.work.updated_by===member.id,'Never overwrite real team work');
const fingerprint=createHash('sha256').update(JSON.stringify({obj:initial.opportunity.obj,it:initial.opportunity.it,docs:initial.opportunity.docs})).digest('hex');
function fixture(mode){sql('INSERT INTO settings(key,value) VALUES('+quoted('review:'+id)+','+quoted(JSON.stringify({status:'ready',fingerprint,at:new Date().toISOString(),bidRule:{mode,quote:'SYNTHETIC LOCAL TEST ONLY',source:'LOCAL TEST'},documents:[]}))+') ON CONFLICT(key) DO UPDATE SET value=excluded.value;');}
async function change(quote){const work=(await api(path+'/detail')).body.work;return api(path,'PATCH',{stage:'nova',ownerId:initial.work.owner_id,version:work.version,notes:initial.work.notes,goal:initial.work.goal,declineReason:'',quote});}
async function bid(basis,index=0,amount=150){return api(path+'/bids','POST',{id:randomUUID(),basis,itemIndex:index,amount,version:(await api(path+'/detail')).body.work.version,acknowledgeUnknownCost:true});}
try{
  fixture('package');assert.equal((await bid('unit')).status,400);assert.equal((await change({...JSON.parse(initial.work.quote),selectedItems:{1:false}})).status,400);
  fixture('item');const q={...JSON.parse(initial.work.quote),selectedItems:{1:false},unitFloors:{2:150}};assert.equal((await change(q)).status,200,'A confirmed item rule permits a partial selection');assert.equal((await bid('unit',0)).status,400,'Excluded item cannot be bid');assert.equal((await bid('unit',1,149)).status,400,'Unit floor enforced server-side');assert.equal((await bid('unit',1,150)).status,201,'Selected product can have its own internally prepared bid');assert.equal((await bid('total')).status,400,'Item judgment cannot be replaced by a contract-wide bid');const all=Object.fromEntries(initial.opportunity.it.map(item=>[item.n,false]));assert.equal((await change({...q,selectedItems:all})).status,400,'Cannot accept zero products');
  fixture('lot');assert.equal((await bid('unit')).status,400);assert.equal((await bid('total')).status,400,'Unknown lot composition does not invent a global contract bid');
  console.log(JSON.stringify({result:'PASS',environment:'local only',checks:['package blocks separate product','package blocks exclusions','item permits partial selection','excluded item blocks bid','floor enforced for unit bid','selected product prepares its own bid','item blocks unsupported global bid','zero products rejected','lot requires composition']}));
}finally{sql(previous?'UPDATE settings SET value='+quoted(previous)+' WHERE key='+quoted('review:'+id)+';':'DELETE FROM settings WHERE key='+quoted('review:'+id)+';');assert.equal((await change(JSON.parse(initial.work.quote))).status,200);}
