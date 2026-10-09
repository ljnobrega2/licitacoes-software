import {calculateQuote,minimumBid} from './core.js';
export function parseAmount(input){
  if(typeof input==='number')return Number.isFinite(input)&&input>0&&input<=100000000000&&Math.abs(input*10000-Math.round(input*10000))<0.01?input:null;
  let value=String(input??'').trim().replace(/^R\$\s*/,'');
  if(value.includes(',')){if(!/^(?:\d+|[1-9]\d{0,2}(?:\.\d{3})+),\d{1,4}$/.test(value))return null;value=value.replaceAll('.','').replace(',','.');}
  else if(/^[1-9]\d{0,2}(?:\.\d{3})+$/.test(value))value=value.replaceAll('.','');
  if(!/^\d+(?:\.\d{1,4})?$/.test(value))return null;
  const amount=Number(value);return amount>0&&amount<=100000000000?amount:null;
}
export function decimalAmount(amount){return Number(amount).toFixed(4).replace(/0+$/,'').replace(/\.$/,'');}
export function portalLink(raw){try{const url=new URL(raw);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||/(^|\.)pncp\.gov\.br$/i.test(url.hostname))return '';return url.href;}catch{return '';}}
/** @param {{it?:Array<{n?:number,q?:number,d?:string}>}} opportunity */
export function bidMinimum(opportunity,quote,basis='total',itemIndex=-1){
  const calculation=calculateQuote(quote),tax=Number(quote.tax??6),margin=Number(quote.margin??15);
  if(!Number.isFinite(tax)||!Number.isFinite(margin)||!Number.isFinite(calculation.cost)||minimumBid(1,tax,margin)===null)return {minimum:null,quantity:1,error:'Custos e percentuais devem ser válidos; imposto e margem precisam somar menos de 100%.',label:'Total',allocation:''};
  if(basis==='unit'){
    const item=opportunity.it?.[itemIndex],quantity=Number(item?.q),unitCost=Number(quote.itemCosts?.[itemIndex]?.cost)||0;
    if(!item||!(quantity>0))return {minimum:null,quantity:1,error:'Selecione um item com quantidade válida.',label:'Item',allocation:''};
    const itemSum=(quote.itemCosts||[]).reduce((sum,row)=>sum+(Number(row.cost)||0)*(Number(row.quantity)||0),0);
    const allocated=quote.useItems&&itemSum>0?unitCost*calculation.cost/itemSum:unitCost*(1+(Number(quote.contingency)||0)/100);
    const computed=allocated>0?minimumBid(allocated,tax,margin):null,manual=parseAmount(quote.unitFloors?.[String(item.n??itemIndex+1)]),minimum=computed===null?manual:manual===null?computed:Math.max(computed,manual);
    return {minimum,quantity,error:'',label:'Item '+(item.n??itemIndex+1)+' · valor unitário',allocation:manual!==null?'Piso efetivo: o maior entre o piso informado para este produto e o calculado pelos custos.':quote.useItems?'Custos totais distribuídos proporcionalmente ao custo dos itens.':'Piso pelo custo unitário. Inclua todos os custos nele ou ative a soma dos itens no preço.'};
  }
  const rows=opportunity.it||[],floors=rows.map((item,index)=>({price:parseAmount(quote.unitFloors?.[String(item.n??index+1)]),quantity:Number(item.q)})),complete=floors.length>0&&floors.every(row=>row.price!==null&&row.quantity>0),itemsFloor=complete?Math.ceil(floors.reduce((sum,row)=>sum+row.price*row.quantity,0)*10000-1e-7)/10000:null,manual=parseAmount(quote.minimumTotal),computed=calculation.cost>0?calculation.bid:null,known=[computed,manual,itemsFloor].filter(value=>value!==null);
  return {minimum:known.length?Math.max(...known):null,quantity:1,error:'',label:'Valor total do contrato',allocation:manual!==null||complete?'Piso efetivo: o maior entre orçamento, piso total informado e soma dos pisos de todos os produtos.':'Piso calculado pelo orçamento total salvo. Pisos parciais de produtos não validam o contrato inteiro.'};
}
