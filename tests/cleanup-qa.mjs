// Generates a narrowly scoped cleanup for the two accounts owned by these tests.
// Review before applying; never substitute real team accounts here.
import fs from 'node:fs';
import crypto from 'node:crypto';
const access=JSON.parse(fs.readFileSync(new URL('../dados/workspace-access.json',import.meta.url),'utf8'));
const inviteHash=crypto.createHash('sha256').update(access.testInvite).digest('hex');
const members="SELECT id FROM members WHERE email IN ('qa.alice@licitacoes.test','qa.bob@licitacoes.test')";
const statements=[
  `DELETE FROM bids WHERE member_id IN (${members})`,
  `UPDATE bids SET reported_by=NULL WHERE reported_by IN (${members})`,
  `DELETE FROM tasks WHERE opportunity_id=\'78316064000193-1-000033/2026\' AND (title LIKE \'QA UX:%\' OR title=\'QA: conferir TR e documentação\')`,
  "DELETE FROM tasks WHERE opportunity_id='00509018000113-1-002239/2026' AND title='QA: conferir TR e documentação'",
  `DELETE FROM comments WHERE member_id IN (${members}) AND body LIKE 'QA:%'`,
  `DELETE FROM activity WHERE member_id IN (${members})`,
  `DELETE FROM ai_studies WHERE member_id IN (${members})`,
  `UPDATE opportunities SET stage='nova',owner_id=NULL,notes='',quote='{}',goal='',decline_reason='',version=version+1,updated_by=NULL WHERE opportunity_id='00509018000113-1-002239/2026' AND updated_by IN (${members})`,
  `UPDATE opportunities SET stage='nova',owner_id=NULL,notes='',quote='{}',goal='',decline_reason='',version=version+1,updated_by=NULL WHERE opportunity_id='78316064000193-1-000033/2026' AND updated_by IN (${members})`,
  `UPDATE opportunities SET owner_id=NULL WHERE owner_id IN (${members})`,
  `UPDATE opportunities SET updated_by=NULL WHERE updated_by IN (${members})`,
  `UPDATE tasks SET assignee_id=NULL WHERE assignee_id IN (${members})`,
  `DELETE FROM sessions WHERE member_id IN (${members})`,
  `DELETE FROM request_limits WHERE bucket IN (SELECT 'ai:'||id FROM members WHERE id IN (${members})) OR bucket IN (SELECT 'refresh:'||id FROM members WHERE id IN (${members}))`,
  `DELETE FROM invitations WHERE created_by IN (${members}) OR token_hash='${inviteHash}'`,
  `DELETE FROM invite_claims WHERE member_id IN (${members})`,
  "DELETE FROM members WHERE email IN ('qa.alice@licitacoes.test','qa.bob@licitacoes.test')"
];
const output='/tmp/licitacoes-qa-cleanup.sql';fs.writeFileSync(output,statements.join(';\n')+';\n');console.log(output);
