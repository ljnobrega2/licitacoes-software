export type Member = { id:string; name:string; email:string; role:string };
export type Body = Record<string, unknown>;
export class HttpError extends Error { constructor(public status:number, message:string) {super(message);} }
export const now = () => new Date().toISOString();
const hex = (bytes:ArrayBuffer) => Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
export const hash = async (value:string) => hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
export const token = () => crypto.randomUUID()+crypto.randomUUID();
export const text = (value:unknown, max=2000) => typeof value==='string' ? value.trim().slice(0,max) : '';
export const cookie = (value:string, age=1209600) => `licit_session=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${age}`;
export const delay = (ms:number) => new Promise(resolve=>setTimeout(resolve,ms));
export function json(value:unknown,status=200,headers:Record<string,string>={}) {return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});}
export async function passwordHash(password:string,salt:string) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256));
}
export async function session(request:Request,env:Env):Promise<Member|null> {
  const raw=/\blicit_session=([^;]+)/.exec(request.headers.get('cookie')||'')?.[1];
  if(!raw)return null;
  return env.DB.prepare('SELECT m.id,m.name,m.email,m.role FROM sessions s JOIN members m ON m.id=s.member_id WHERE s.token_hash=? AND s.expires_at>? AND m.active=1').bind(await hash(raw),now()).first<Member>();
}
export async function limit(env:Env,bucket:string,count:number,seconds:number) {
  const epoch=Math.floor(Date.now()/1000),key=bucket+':'+Math.floor(epoch/seconds);
  const row=await env.DB.prepare('INSERT INTO request_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(key,epoch+seconds).first<{count:number}>();
  if((row?.count||0)>count)throw new HttpError(429,'Limite de solicitações atingido. Aguarde alguns minutos.');
}
export async function readBody(request:Request):Promise<Body> {
  if(Number(request.headers.get('content-length'))>30000)throw new HttpError(413,'Conteúdo muito grande.');
  const raw=await request.text();if(raw.length>30000)throw new HttpError(413,'Conteúdo muito grande.');
  try {const body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=='object')throw new Error();return body;} catch{throw new HttpError(400,'Dados inválidos.');}
}
export async function createSession(env:Env,member:Member) {
  const raw=token();await env.DB.prepare('INSERT INTO sessions(token_hash,member_id,expires_at) VALUES(?,?,?)').bind(await hash(raw),member.id,new Date(Date.now()+14*86400000).toISOString()).run();
  return json({member:{id:member.id,name:member.name,email:member.email,role:member.role}},200,{'set-cookie':cookie(raw)});
}
export async function ensureOpportunity(env:Env,id:string) {
  const row=await env.DB.prepare('SELECT id FROM catalog WHERE id=?').bind(id).first();
  if(!row)throw new HttpError(404,'Oportunidade não encontrada.');
  await env.DB.prepare('INSERT OR IGNORE INTO opportunities(opportunity_id) VALUES(?)').bind(id).run();
}
export function activity(env:Env,id:string,member:Member,action:string,detail='') {return env.DB.prepare('INSERT INTO activity(id,opportunity_id,member_id,action,detail) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,member.id,action,detail);}
export async function getSetting(env:Env,key:string) {return env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(key).first<string>('value');}
export async function setSetting(env:Env,key:string,value:unknown) {await env.DB.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(value)).run();}
