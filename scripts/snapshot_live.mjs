import fs from 'node:fs';
import path from 'node:path';
const endpoint='https://licitacoes-tr-assistant.lucasjesusnobrega.workers.dev/api/catalog';
const response=await fetch(endpoint);if(!response.ok)throw new Error('Snapshot indisponível: '+response.status);
const catalog=await response.json(),at=new Date().toISOString(),directory=path.resolve(import.meta.dirname,'..','snapshot_2026-10-09_operacional');
fs.mkdirSync(directory,{recursive:true});
fs.writeFileSync(path.join(directory,'catalogo.json'),JSON.stringify({exportedAt:at,source:endpoint,notice:'Fotografia do catálogo público; checkedAt é a consulta real por registro. Primeira nova coleta nacional ainda em andamento.',...catalog},null,2));
console.log(JSON.stringify({directory,exportedAt:at,records:catalog.catalog.length,sync:catalog.sync}));
