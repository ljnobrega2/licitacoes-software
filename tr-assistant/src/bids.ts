import {HttpError,now,text,type Body,type Member} from './common';
import {getCatalog} from './sync';
import {getReview} from './review';
import {bidRuleError} from '../../app/tender-rules.js';
import {bidMinimum,parseAmount,decimalAmount,portalLink} from '../../app/bid-math.js';
type Bid={id:string;opportunity_id:string;member_id:string;basis:string;item_label:string;amount:string;minimum:string|null;quantity:number;portal_url:string;status:string};
export async function prepareBid(env:Env,member:Member,id:string,body:Body){
  const key=text(body.id,80),amount=parseAmount(body.amount),basis=body.basis==='unit'?'unit':'total',index=Number(body.itemIndex),version=Number(body.version);
  if(!/^[0-9a-f-]{36}$/i.test(key)||!Number.isInteger(version)||amount===null)throw new HttpError(400,'Informe um valor positivo com até quatro casas decimais.');
  const existing=await env.DB.prepare('SELECT * FROM bids WHERE id=?').bind(key).first<Bid>();
  if(existing){if(existing.opportunity_id!==id||existing.member_id!==member.id||Number(existing.amount)!==amount||existing.basis!==basis||basis==='unit'&&Number((existing as Bid & {item_index:number}).item_index)!==index)throw new HttpError(409,'Identificador já utilizado.');return {bid:existing,idempotent:true};}
  const r=await getCatalog(env,id),review=await getReview(env,id),ruleError=bidRuleError(review,basis);if(ruleError)throw new HttpError(400,ruleError);const work=await env.DB.prepare('SELECT quote FROM opportunities WHERE opportunity_id=?').bind(id).first<{quote:string}>(),floor=bidMinimum(r,JSON.parse(work?.quote||'{}'),basis,index);
  if(basis==='unit'&&JSON.parse(work?.quote||'{}').selectedItems?.[String(r.it?.[index]?.n??index+1)]===false)throw new HttpError(400,'Produto excluído da participação pela equipe.');
  if(floor.error)throw new HttpError(400,floor.error);
  if(floor.minimum!==null&&Math.round(amount*10000)<Math.round(floor.minimum*10000))throw new HttpError(400,'Valor abaixo do piso calculado. Revise custos, tributos ou margem antes de preparar.');
  if(floor.minimum===null&&body.acknowledgeUnknownCost!==true)throw new HttpError(400,'Sem custo informado: preencha o preço ou confirme que ainda não há piso validado.');
  const rawPortal=text(body.portalUrl,2000)||r.orig||'',portal=portalLink(rawPortal);if(text(body.portalUrl,2000)&&!portal)throw new HttpError(400,'Informe o portal de disputa, não o PNCP.');
  const mutation=crypto.randomUUID(),at=now();
  const result=await env.DB.batch<Record<string,unknown>>([
    env.DB.prepare("UPDATE opportunities SET stage=CASE WHEN stage IN ('nova','documentacao','compativel') THEN 'cotacao' ELSE stage END,version=version+1,updated_by=?,updated_at=?,last_mutation=? WHERE opportunity_id=? AND version=? RETURNING version").bind(member.id,at,mutation,id,version),
    env.DB.prepare("INSERT INTO bids(id,opportunity_id,member_id,basis,item_index,item_label,amount,minimum,quantity,portal_url,created_at) SELECT ?,opportunity_id,?,?,?,?,?,?,?,?,? FROM opportunities WHERE opportunity_id=? AND last_mutation=?").bind(key,member.id,basis,basis==='unit'?index:null,floor.label,decimalAmount(amount),floor.minimum===null?null:decimalAmount(floor.minimum),floor.quantity,portal,at,id,mutation),
    env.DB.prepare("INSERT INTO activity(id,opportunity_id,member_id,action,detail) SELECT ?,opportunity_id,?,'Lance preparado',? FROM opportunities WHERE opportunity_id=? AND last_mutation=?").bind(crypto.randomUUID(),member.id,floor.label+' · R$ '+decimalAmount(amount)+' · Não enviado ao portal',id,mutation)
  ]);
  if(!result[0].results.length)throw new HttpError(409,'A ficha mudou. Recarregue e confira o piso antes de preparar.');
  return {bid:await env.DB.prepare('SELECT * FROM bids WHERE id=?').bind(key).first<Bid>(),version:result[0].results[0].version,message:'Lance preparado na equipe. Envie no portal oficial.'};
}
export async function reportBid(env:Env,member:Member,key:string,body:Body){
  const bid=await env.DB.prepare('SELECT * FROM bids WHERE id=?').bind(key).first<Bid>();if(!bid)throw new HttpError(404,'Lance não encontrado.');
  if(body.confirmSent!==true)throw new HttpError(400,'Confirme somente depois de enviar no portal oficial.');
  if(bid.status==='reported')return {ok:true,idempotent:true};
  const portal=portalLink(text(body.portalUrl,2000)||bid.portal_url);if(!portal)throw new HttpError(400,'Informe o portal em que você enviou o lance.');
  const version=Number(body.version);if(!Number.isInteger(version))throw new HttpError(400,'Recarregue a ficha.');
  const mutation=crypto.randomUUID(),at=now(),receipt=text(body.receipt,500);
  const result=await env.DB.batch<Record<string,unknown>>([
    env.DB.prepare("UPDATE opportunities SET stage='disputada',version=version+1,updated_by=?,updated_at=?,last_mutation=? WHERE opportunity_id=? AND version=? RETURNING version").bind(member.id,at,mutation,bid.opportunity_id,version),
    env.DB.prepare("UPDATE bids SET status='reported',portal_url=?,reported_by=?,reported_at=?,receipt=? WHERE id=? AND EXISTS(SELECT 1 FROM opportunities WHERE opportunity_id=? AND last_mutation=?)").bind(portal,member.id,at,receipt,key,bid.opportunity_id,mutation),
    env.DB.prepare("INSERT INTO activity(id,opportunity_id,member_id,action,detail) SELECT ?,opportunity_id,?,'Envio informado manualmente',? FROM opportunities WHERE opportunity_id=? AND last_mutation=?").bind(crypto.randomUUID(),member.id,bid.item_label+' · R$ '+bid.amount+' · Informação do usuário, sem confirmação automática do portal',bid.opportunity_id,mutation)
  ]);
  if(!result[0].results.length)throw new HttpError(409,'Outra pessoa alterou a ficha. Recarregue antes de registrar seu envio.');
  return {ok:true,version:result[0].results[0].version,message:'Envio informado por você. Não é confirmação automática do portal.'};
}
