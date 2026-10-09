export const stages=[['nova','Novas','#91a2b5'],['documentacao','Aguardando documentação','#c8a14e'],['compativel','Compatíveis','#58a58c'],['cotacao','Em cotação','#5988bf'],['disputada','Disputadas','#917bc2'],['declinada','Declinadas','#9b9b9b'],['perdida','Perdidas','#c17b80'],['ganha','Ganhas','#298c71']];
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function dateTime(s){if(!s)return null;const d=new Date(/Z$|[+-]\d\d:\d\d$/.test(s)?s:s.length===10?s+'T12:00:00-03:00':s.replace(' ','T')+'-03:00');return Number.isNaN(d.getTime())?null:d;}
export function isLive(r,now=Date.now()){const end=dateTime(r.fim);return (!end||end.getTime()>now)&&!(/suspens|cancelad|revogad|anulad/i.test(r.st||''));}
export function eligibleForBoard(r,now=Date.now()){return isLive(r,now)||(r.stage&&r.stage!=='nova');}
export function minimumBid(cost,tax=6,margin=15){const denominator=1-(Number(tax)+Number(margin))/100;if(!Number.isFinite(Number(cost))||cost<0||tax<0||margin<0||denominator<=0)return null;return Math.ceil(Number(cost)/denominator*100-1e-8)/100;}
export function calculateQuote(q={}){
  const value=key=>Math.max(0,Number(q[key])||0);
  const licenses=q.useItems?(q.itemCosts||[]).reduce((sum,i)=>sum+(Math.max(0,Number(i.cost)||0)*Math.max(0,Number(i.quantity)||0)),0):value('licenses');
  const base=licenses+value('hours')*value('hourly')+value('infra')+value('support')+value('other');
  const cost=base*(1+value('contingency')/100);
  return {base,cost,bid:minimumBid(cost,q.tax??6,q.margin??15)};
}
