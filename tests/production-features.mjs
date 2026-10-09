import assert from 'node:assert/strict';
const base=process.env.TEST_BASE||'https://licitacoes-tr-assistant.lucasjesusnobrega.workers.dev';
let cookie='';
async function request(path,method='GET',body){
  const response=await fetch(base+'/api'+path,{method,headers:{origin:base,...(cookie?{cookie}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(180000)});
  if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
  return {status:response.status,body:await response.json()};
}
assert.equal((await request('/login','POST',{email:'qa.alice@licitacoes.test',password:'Local-QA-9Oct!2026'})).status,200);
assert.equal((await request('/sync','POST',{})).status,202);
const id='78316064000193-1-000033/2026',path='/opportunities/'+encodeURIComponent(id);
const refreshed=await request(path+'/refresh','POST',{});assert.equal(refreshed.status,200,JSON.stringify(refreshed.body));
const docs=refreshed.body.opportunity.docs||[],index=docs.findIndex(d=>/edital|termo de refer/i.test((d.n||'')+' '+(d.t||'')));
assert.ok(docs.length>0,'PNCP refresh must retrieve actual attachments');
const selected=Math.max(index,0),download=await fetch(base+'/api'+path+'/download?index='+selected,{headers:{cookie},signal:AbortSignal.timeout(60000)});
assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/attachment/);
const content=new Uint8Array(await download.arrayBuffer());assert.equal(new TextDecoder().decode(content.slice(0,4)),'%PDF');
console.log(JSON.stringify({check:'official document refresh and PDF download',result:'PASS',bytes:content.length,document:docs[selected].n}));
const study=await request(path+'/study','POST',{mode:'estimate',documentIndex:selected,assumptions:'Premissas para simulação: equipe técnica R$ 120 por hora; implantação 80 a 160 horas; suporte 12 meses a R$ 800 por mês; contingência 10%. Valores hipotéticos, não cotação.'});
assert.equal(study.status,200,JSON.stringify(study.body));assert.ok(study.body.answer.length>200);assert.ok(study.body.documentName);
assert.ok((await request(path+'/detail')).body.studies.some(s=>s.id===study.body.id),'AI study must persist for the team');
console.log(JSON.stringify({check:'real PDF extraction and AI cost estimation',result:'PASS',document:study.body.documentName,characters:study.body.answer.length,excerpt:study.body.answer.slice(0,180)}));
const snapshot=(await request('/workspace')).body;assert.ok(snapshot.catalog.length>0);assert.ok(snapshot.sync?.lastSuccess,'PNCP crawl must make progress');
console.log(JSON.stringify({check:'automatic PNCP checkpoint',result:'PASS',sync:snapshot.sync}));
