// Only a one-hour QA invitation. Never reimport the catalog or replace user access.
import fs from 'node:fs';
import crypto from 'node:crypto';
const access=JSON.parse(fs.readFileSync(new URL('../dados/workspace-access.json',import.meta.url),'utf8'));
const hashed=crypto.createHash('sha256').update(access.testInvite).digest('hex'),output='/tmp/licitacoes-qa-invitation.sql';
fs.writeFileSync(output,`INSERT INTO invitations(token_hash,role,expires_at) VALUES('${hashed}','admin','${new Date(Date.now()+3600000).toISOString()}') ON CONFLICT(token_hash) DO UPDATE SET consumed_at=NULL,expires_at=excluded.expires_at;\n`,{mode:0o600});
console.log(output);
