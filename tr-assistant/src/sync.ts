import { UFS, classify, deadlineISO, documents, fromPNCP, items, pncpRoot, type Opportunity } from './catalog';
import { HttpError, now, delay, getSetting, setSetting } from './common';
export type CatalogRow = { id:string; payload:string; kind:string; checked_at:string; source:string };
export function decodeCatalog(row:CatalogRow) {const record=JSON.parse(row.payload),scope=classify(String(record.obj||'')+' '+String(record.info||'')+' '+(record.it||[]).map((i:{d?:string})=>i.d||'').join(' '));return {...record,mc:scope.mc,sv:scope.sv,cl:scope.cl,scope,kind:row.kind,checkedAt:row.checked_at,source:row.source} as Opportunity;}
export async function getCatalog(env:Env,id:string) {
  const row=await env.DB.prepare('SELECT * FROM catalog WHERE id=?').bind(id).first<CatalogRow>();
  if(!row)throw new HttpError(404,'Oportunidade não encontrada.'); return decodeCatalog(row);
}
export async function saveCatalog(env:Env,r:Opportunity,checked=now()) {
  return env.DB.prepare('INSERT INTO catalog(id,kind,payload,deadline,checked_at,source) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,deadline=excluded.deadline,checked_at=excluded.checked_at').bind(r.id,r.kind||'opportunity',JSON.stringify(r),deadlineISO(r.fim),checked,r.source||'PNCP').run();
}
async function fetchJSON(url:string) {
  const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{accept:'application/json'}});
  if(!response.ok)throw new HttpError(502,`Fonte oficial indisponível (HTTP ${response.status}). Tente novamente.`);
  if(response.status===204)return [];
  return response.json();
}
export async function refreshOpportunity(env:Env,id:string) {
  const old=await getCatalog(env,id),root=pncpRoot(id);if(!root)throw new HttpError(400,'Atualização automática disponível para registros PNCP.');
  const raw=await fetchJSON(`https://pncp.gov.br/api/consulta/v1/orgaos/${root.cnpj}/compras/${root.year}/${root.seq}`) as Record<string,unknown>;
  const fresh={...old,...fromPNCP(raw)};
  await saveCatalog(env,fresh);await delay(3000);
  fresh.docs=documents(await fetchJSON(root.root+'/arquivos')); await delay(3000);
  fresh.it=items(await fetchJSON(root.root+'/itens?pagina=1&tamanhoPagina=500'));fresh.nit=fresh.it.length;fresh.det=true;
  await saveCatalog(env,fresh);return fresh;
}
// Eight rate-limited pages per minute; every page checkpoints its cursor.
export async function syncPNCP(env:Env) {
  const stamp=Date.now(),lease=await env.DB.prepare("INSERT INTO settings(key,value) VALUES('sync_lock',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(settings.value AS INTEGER)<? RETURNING value").bind(String(stamp),String(stamp-120000)).first();
  if(!lease)return;
  let cursor=JSON.parse(await getSetting(env,'sync_cursor')||'{"uf":0,"page":1,"scanned":0,"matched":0,"cycleStarted":null}') as {uf:number;page:number;scanned:number;matched:number;cycleStarted:string|null;nextCycle?:number;error?:string;lastSuccess?:string};
  try {
    if(cursor.nextCycle&&cursor.nextCycle>Date.now())return;
    if(!cursor.cycleStarted){cursor.cycleStarted=now();cursor.scanned=0;cursor.matched=0;}
    for(let step=0;step<8;step++) {
      const end=new Date(Date.now()+365*86400000).toISOString().slice(0,10).replace(/-/g,'');
      const url=`https://pncp.gov.br/api/consulta/v1/contratacoes/proposta?dataFinal=${end}&tamanhoPagina=50&uf=${UFS[cursor.uf]}&pagina=${cursor.page}`;
      const result=await fetchJSON(url) as {data?:Record<string,unknown>[];totalPaginas?:number};
      const selected=(result.data||[]).filter(r=>classify(String(r.objetoCompra||'')+' '+String(r.informacaoComplementar||'')).relevant),checked=now();
      if(selected.length)await env.DB.batch(selected.map(raw=>{const r=fromPNCP(raw);return env.DB.prepare("INSERT INTO catalog(id,kind,payload,deadline,checked_at,source) VALUES(?,'opportunity',?,?,?,'PNCP') ON CONFLICT(id) DO UPDATE SET payload=json_patch(catalog.payload,excluded.payload),deadline=excluded.deadline,checked_at=excluded.checked_at").bind(r.id,JSON.stringify(r),deadlineISO(r.fim),checked);}));
      cursor.scanned+=(result.data||[]).length;cursor.matched+=selected.length;cursor.lastSuccess=checked;delete cursor.error;
      if(cursor.page>=(result.totalPaginas||1)){cursor.uf++;cursor.page=1;}else cursor.page++;
      if(cursor.uf>=UFS.length){await setSetting(env,'last_full_sync',{at:checked,scanned:cursor.scanned,matched:cursor.matched});cursor={uf:0,page:1,scanned:0,matched:0,cycleStarted:null,nextCycle:Date.now()+6*3600000};}
      await setSetting(env,'sync_cursor',cursor);if(cursor.nextCycle)break;await delay(3000);
    }
  }catch(error){cursor.error=error instanceof Error?error.message:'Falha de consulta PNCP';await setSetting(env,'sync_cursor',cursor);console.error(JSON.stringify({event:'pncp_sync_error',message:cursor.error}));}
  finally{await env.DB.prepare("DELETE FROM settings WHERE key='sync_lock' AND value=?").bind(String(stamp)).run();}
}
