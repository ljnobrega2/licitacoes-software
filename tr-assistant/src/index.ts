import { STAGES } from './catalog';
import { HttpError, now, hash, token, text, cookie, passwordHash, session, limit, readBody, createSession, ensureOpportunity, activity, getSetting, type Member } from './common';
import { decodeCatalog, getCatalog, refreshOpportunity, syncPNCP, type CatalogRow } from './sync';
import { boundedDocument, study } from './study';

async function api(request:Request,env:Env,ctx:ExecutionContext):Promise<Response> {
  const url=new URL(request.url),path=url.pathname,method=request.method;
  if(method!=='GET'&&request.headers.get('origin')!==url.origin)throw new HttpError(403,'Origem não autorizada.');
  if(path==='/api/health')return Response.json({ok:true,version:env.APP_VERSION,ai:true});
  if(path==='/api/catalog'&&method==='GET'){
    const rows=await env.DB.prepare("SELECT * FROM catalog WHERE kind='opportunity' AND (deadline>? OR deadline IS NULL) ORDER BY deadline LIMIT 2000").bind(now()).all<CatalogRow>();
    return Response.json({catalog:rows.results.map(decodeCatalog),sync:JSON.parse(await getSetting(env,'sync_cursor')||'null'),lastFullSync:JSON.parse(await getSetting(env,'last_full_sync')||'null')});
  }
  if(path==='/api/login'||path==='/api/register'){
    await limit(env,'login:'+(request.headers.get('cf-connecting-ip')||'local'),12,300);
    const body=await readBody(request),email=text(body.email,180).toLowerCase(),password=text(body.password,200);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<10)throw new HttpError(400,'Informe e-mail válido e senha com ao menos 10 caracteres.');
    if(path==='/api/register'){
      const name=text(body.name,80),inviteHash=await hash(text(body.invite,180));if(name.length<2)throw new HttpError(400,'Informe seu nome.');
      const invite=await env.DB.prepare('SELECT role FROM invitations WHERE token_hash=? AND consumed_at IS NULL AND expires_at>?').bind(inviteHash,now()).first<{role:string}>();
      if(!invite)throw new HttpError(403,'Convite inválido, expirado ou já utilizado.');
      const id=crypto.randomUUID(),salt=token(),derived=await passwordHash(password,salt);
      try{await env.DB.batch([env.DB.prepare('INSERT INTO invite_claims(token_hash,member_id) VALUES(?,?)').bind(inviteHash,id),env.DB.prepare('INSERT INTO members(id,name,email,password_hash,salt,role) VALUES(?,?,?,?,?,?)').bind(id,name,email,derived,salt,invite.role),env.DB.prepare('UPDATE invitations SET consumed_at=? WHERE token_hash=?').bind(now(),inviteHash)]);}catch{throw new HttpError(409,'E-mail já cadastrado ou convite já usado.');}
      return createSession(env,{id,name,email,role:invite.role});
    }
    const member=await env.DB.prepare('SELECT * FROM members WHERE email=? AND active=1').bind(email).first<Member&{salt:string;password_hash:string}>();
    const supplied=await passwordHash(password,member?.salt||'dummy-salt-for-nonexistent-user');
    if(!member||supplied!==member.password_hash)throw new HttpError(401,'E-mail ou senha incorretos.');
    return createSession(env,member);
  }
  const member=await session(request,env);if(path==='/api/me')return Response.json({member});if(!member)throw new HttpError(401,'Entre para trabalhar com a equipe.');
  if(path==='/api/logout'&&method==='POST'){const raw=/\blicit_session=([^;]+)/.exec(request.headers.get('cookie')||'')?.[1];if(raw)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(raw)).run();return Response.json({ok:true},{headers:{'set-cookie':cookie('',0)}});}
  if(path==='/api/invites'&&method==='POST'){
    if(member.role!=='admin')throw new HttpError(403,'Somente administradores podem convidar.');const raw=token();
    await env.DB.prepare("INSERT INTO invitations(token_hash,role,created_by,expires_at) VALUES(?,'member',?,?)").bind(await hash(raw),member.id,new Date(Date.now()+7*86400000).toISOString()).run();return Response.json({url:url.origin+'/#invite='+raw});
  }
  if(path==='/api/workspace'&&method==='GET'){
    const result=await env.DB.batch<Record<string,unknown>>([env.DB.prepare("SELECT c.*,o.stage,o.owner_id,o.version,o.notes,o.quote,o.updated_at FROM catalog c LEFT JOIN opportunities o ON o.opportunity_id=c.id WHERE c.kind='opportunity' AND (c.deadline>? OR c.deadline IS NULL OR o.stage<>'nova') ORDER BY c.deadline LIMIT 2500").bind(now()),env.DB.prepare('SELECT id,name,email,role FROM members WHERE active=1 ORDER BY name'),env.DB.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 3000')]);
    return Response.json({member,catalog:result[0].results.map(row=>({...decodeCatalog(row as CatalogRow),stage:row.stage||'nova',ownerId:row.owner_id,version:row.version||0,notes:row.notes||'',quote:JSON.parse(String(row.quote||'{}'))})),members:result[1].results,tasks:result[2].results,sync:JSON.parse(await getSetting(env,'sync_cursor')||'null'),lastFullSync:JSON.parse(await getSetting(env,'last_full_sync')||'null')});
  }
  if(path==='/api/archive'&&method==='GET'){
    const kind=url.searchParams.get('kind')==='ata'?'ata':'opportunity';
    const rows=kind==='ata'?await env.DB.prepare("SELECT * FROM catalog WHERE kind='ata' ORDER BY deadline LIMIT 1500").all<CatalogRow>():await env.DB.prepare("SELECT * FROM catalog WHERE kind='opportunity' AND deadline<=? ORDER BY deadline DESC LIMIT 1000").bind(now()).all<CatalogRow>();return Response.json({catalog:rows.results.map(decodeCatalog)});
  }
  if(path==='/api/sync'&&method==='POST'){if(member.role!=='admin')throw new HttpError(403,'Somente administradores podem solicitar coleta.');ctx.waitUntil(syncPNCP(env));return Response.json({ok:true,message:'Coleta retomada em segundo plano.'},{status:202});}
  const match=/^\/api\/opportunities\/([^/]+)(?:\/(detail|refresh|tasks|comments|study|download))?$/.exec(path);
  if(match){
    const id=decodeURIComponent(match[1]),action=match[2];
    if(action==='download'&&method==='GET'){
      const r=await getCatalog(env,id),index=Number(url.searchParams.get('index')),doc=r.docs?.[index];if(!doc)throw new HttpError(404,'Documento não encontrado.');
      const blob=await boundedDocument(doc.u),base=(doc.n||doc.t||'documento').replace(/[\r\n]/g,''),extension=blob.type.includes('pdf')?'.pdf':blob.type.includes('zip')?'.zip':'.bin',filename=/\.[a-z0-9]{2,5}$/i.test(base)?base:base+extension;
      return new Response(blob,{headers:{'content-type':blob.type,'content-disposition':`attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,'cache-control':'private, no-store'}});
    }
    await ensureOpportunity(env,id);
    if(action==='detail'&&method==='GET'){
      const results=await env.DB.batch([env.DB.prepare('SELECT * FROM opportunities WHERE opportunity_id=?').bind(id),env.DB.prepare('SELECT * FROM tasks WHERE opportunity_id=? ORDER BY done,created_at').bind(id),env.DB.prepare('SELECT c.*,m.name FROM comments c JOIN members m ON m.id=c.member_id WHERE opportunity_id=? ORDER BY created_at DESC LIMIT 100').bind(id),env.DB.prepare('SELECT a.*,m.name FROM activity a JOIN members m ON m.id=a.member_id WHERE opportunity_id=? ORDER BY created_at DESC LIMIT 100').bind(id),env.DB.prepare('SELECT s.*,m.name FROM ai_studies s JOIN members m ON m.id=s.member_id WHERE opportunity_id=? ORDER BY created_at DESC LIMIT 15').bind(id),env.DB.prepare('SELECT id,name,email,role FROM members WHERE active=1 ORDER BY name')]);
      return Response.json({opportunity:await getCatalog(env,id),work:results[0].results[0],tasks:results[1].results,comments:results[2].results,activity:results[3].results,studies:results[4].results,members:results[5].results});
    }
    if(!action&&method==='PATCH'){
      const body=await readBody(request),stage=text(body.stage,30),owner=text(body.ownerId,80)||null,version=Number(body.version);
      if(!STAGES.includes(stage as typeof STAGES[number])||!Number.isInteger(version))throw new HttpError(400,'Etapa ou versão inválida.');
      if(owner&&!await env.DB.prepare('SELECT id FROM members WHERE id=? AND active=1').bind(owner).first())throw new HttpError(400,'Responsável inválido.');
      const mutation=crypto.randomUUID(),notes=text(body.notes,8000),quote=JSON.stringify(body.quote||{});if(quote.length>10000)throw new HttpError(400,'Orçamento muito grande.');
      const result=await env.DB.batch<Record<string,unknown>>([env.DB.prepare('UPDATE opportunities SET stage=?,owner_id=?,notes=?,quote=?,version=version+1,updated_at=?,updated_by=?,last_mutation=? WHERE opportunity_id=? AND version=? RETURNING version').bind(stage,owner,notes,quote,now(),member.id,mutation,id,version),env.DB.prepare("INSERT INTO activity(id,opportunity_id,member_id,action,detail) SELECT ?,opportunity_id,?,'Atualização',? FROM opportunities WHERE opportunity_id=? AND last_mutation=?").bind(crypto.randomUUID(),member.id,stage,id,mutation)]);
      if(!result[0].results.length)throw new HttpError(409,'Outra pessoa atualizou esta oportunidade. Recarregue para preservar a alteração dela.');return Response.json({version:result[0].results[0].version});
    }
    if(action==='refresh'&&method==='POST'){await limit(env,'refresh:'+member.id,10,300);const fresh=await refreshOpportunity(env,id);await activity(env,id,member,'Consulta PNCP','Documentos, itens e prazos atualizados').run();return Response.json({opportunity:fresh});}
    if(action==='tasks'&&method==='POST'){
      const body=await readBody(request),title=text(body.title,240),assignee=text(body.assigneeId,80)||null,due=text(body.dueAt,40)||null;if(!title)throw new HttpError(400,'Informe a tarefa.');
      if(assignee&&!await env.DB.prepare('SELECT id FROM members WHERE id=? AND active=1').bind(assignee).first())throw new HttpError(400,'Responsável inválido.');
      if(due&&!/^\d{4}-\d\d-\d\d$/.test(due))throw new HttpError(400,'Prazo inválido.');
      const taskId=crypto.randomUUID();await env.DB.batch([env.DB.prepare('INSERT INTO tasks(id,opportunity_id,title,assignee_id,due_at,kind) VALUES(?,?,?,?,?,?)').bind(taskId,id,title,assignee,due,body.kind==='document'?'document':'task'),activity(env,id,member,'Tarefa criada',title)]);return Response.json({id:taskId},{status:201});
    }
    if(action==='comments'&&method==='POST'){const body=await readBody(request),content=text(body.body,6000);if(!content)throw new HttpError(400,'Escreva o comentário.');await env.DB.batch([env.DB.prepare('INSERT INTO comments(id,opportunity_id,member_id,body) VALUES(?,?,?,?)').bind(crypto.randomUUID(),id,member.id,content),activity(env,id,member,'Comentário',content.slice(0,100))]);return Response.json({ok:true},{status:201});}
    if(action==='study'&&method==='POST')return Response.json(await study(env,member,id,await readBody(request)));
  }
  const task=/^\/api\/tasks\/([^/]+)$/.exec(path);
  if(task&&method==='PATCH'){
    const body=await readBody(request),row=await env.DB.prepare('SELECT opportunity_id,title FROM tasks WHERE id=?').bind(task[1]).first<{opportunity_id:string;title:string}>();if(!row)throw new HttpError(404,'Tarefa não encontrada.');
    await env.DB.batch([env.DB.prepare('UPDATE tasks SET done=?,updated_at=? WHERE id=?').bind(body.done?1:0,now(),task[1]),activity(env,row.opportunity_id,member,body.done?'Tarefa concluída':'Tarefa reaberta',row.title)]);return Response.json({ok:true});
  }
  throw new HttpError(404,'Rota não encontrada.');
}
export default {
  async fetch(request,env,ctx){
    if(!new URL(request.url).pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
    let response:Response;
    try{response=await api(request,env,ctx);}catch(error){
      if(error instanceof HttpError)response=Response.json({error:error.message},{status:error.status});
      else {console.error(JSON.stringify({event:'request_error',message:error instanceof Error?error.message:'unknown'}));response=Response.json({error:'Falha no servidor. Tente novamente.'},{status:500});}
    }
    response.headers.set('cache-control','no-store');return response;
  },
  async scheduled(_event,env,ctx){ctx.waitUntil(syncPNCP(env));ctx.waitUntil(env.DB.prepare('DELETE FROM request_limits WHERE expires_at<?').bind(Math.floor(Date.now()/1000)-3600).run());}
} satisfies ExportedHandler<Env>;
