import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'painel/dados.js'),'utf8'),context);
const data=context.window.DADOS,sql=[],quote=s=>"'"+String(s??'').replaceAll("'","''")+"'";
const fallback=new Date(data.varredura.em).toISOString();
const toISO=value=>{if(!value)return null;const d=new Date(/Z$|[+-]\d\d:\d\d$/.test(value)?value:value+'-03:00');return Number.isNaN(d.getTime())?null:d.toISOString();};
let count=0;
for(const [key,kind] of [['abertas','opportunity'],['vencidas','opportunity'],['atas','ata']])for(const record of data[key]||[]){
  let checked=fallback;
  const match=/^(\d{14})-1-(\d+)\/(\d{4})$/.exec(record.id);
  if(match){const file=path.join(root,'dados/detalhes',`${match[1]}_${match[3]}_${Number(match[2])}.json`);if(fs.existsSync(file))checked=toISO(JSON.parse(fs.readFileSync(file,'utf8')).consultadoEm)||fallback;}
  const r={...record,kind},deadline=toISO(r.fim);
  sql.push(`INSERT INTO catalog(id,kind,payload,deadline,checked_at,source) VALUES(${quote(r.id)},${quote(kind)},${quote(JSON.stringify(r))},${deadline?quote(deadline):'NULL'},${quote(checked)},'PNCP') ON CONFLICT(id) DO NOTHING;`);count++;
}
const accessFile=path.join(root,'dados/workspace-access.json');
let access=fs.existsSync(accessFile)?JSON.parse(fs.readFileSync(accessFile,'utf8')):{adminInvite:crypto.randomBytes(32).toString('hex')};
access.testInvite ||= crypto.randomBytes(32).toString('hex');
fs.writeFileSync(accessFile,JSON.stringify(access),{mode:0o600});
const hashed=crypto.createHash('sha256').update(access.adminInvite).digest('hex');
sql.push(`INSERT OR IGNORE INTO invitations(token_hash,role,expires_at) VALUES('${hashed}','admin','${new Date(Date.now()+30*86400000).toISOString()}');`);
sql.push(`INSERT OR IGNORE INTO invitations(token_hash,role,expires_at) VALUES('${crypto.createHash('sha256').update(access.testInvite).digest('hex')}','admin','${new Date(Date.now()+2*86400000).toISOString()}');`);
sql.push(`INSERT OR IGNORE INTO settings(key,value) VALUES('seed',${quote(JSON.stringify({exportedAt:data.geradoEm,sourceConsultedAt:fallback,importedAt:new Date().toISOString(),count}))});`);
const output=process.argv[2]||path.join(root,'dados/workspace-import.sql');
fs.writeFileSync(output,sql.join('\n'));
console.log(JSON.stringify({count,output,privateAccessFile:accessFile}));
