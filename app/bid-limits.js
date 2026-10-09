import {bidMinimum,parseAmount} from './bid-math.js';

const positive=value=>typeof value==='number'&&Number.isFinite(value)&&value>0?value:null;
const money=value=>Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:4});
export const aboveLimit=(value,maximum)=>value!==null&&maximum!==null&&Math.round(value*10000)>Math.round(maximum*10000);
const down=value=>Math.floor(value*10000+1e-7)/10000;

// Operational cap requested by the team. PNCP estimates are not claimed to be
// legally verified edital ceilings; absent/secret prices remain unknown.
export function participationMaximum(r,basis='total',index=-1,quote={}){
  if(basis==='unit'){
    const item=r.it?.[index],quantity=positive(item?.q),unit=positive(item?.vu),total=positive(item?.vt);
    const values=[unit,total!==null&&quantity!==null?down(total/quantity):null].filter(v=>v!==null);
    return values.length?Math.min(...values):null;
  }
  const items=(r.it||[]).filter((item,i)=>r.review?.bidRule?.mode!=='item'||quote.selectedItems?.[String(item.n??i+1)]!==false);
  const totals=items.map(item=>positive(item.vt)??(positive(item.vu)!==null&&positive(item.q)!==null?item.vu*item.q:null));
  const published=positive(r.val),sum=totals.length&&totals.every(v=>v!==null)?down(totals.reduce((a,b)=>a+b,0)):null;
  const values=[published,sum].filter(v=>v!==null);return values.length?Math.min(...values):null;
}

export function floorLimitError(r,quote={},includeCosts=false){
  const items=r.it||[],keys=new Set(items.map((item,i)=>String(item.n??i+1)));
  if(Object.keys(quote.unitFloors||{}).some(key=>!keys.has(key)))return 'O mínimo deve estar associado a um produto existente no cadastro.';
  let subtotal=0;
  for(const [index,item] of items.entries()){
    const key=String(item.n??index+1);if(r.review?.bidRule?.mode==='item'&&quote.selectedItems?.[key]===false)continue;
    const manual=parseAmount(quote.unitFloors?.[key]),minimum=includeCosts?bidMinimum(r,quote,'unit',index).minimum:manual,maximum=participationMaximum(r,'unit',index);
    if(aboveLimit(minimum,maximum))return 'Item '+key+': '+(manual!==null&&aboveLimit(manual,maximum)?'o mínimo informado':'o piso calculado pelos custos')+' não pode superar '+money(maximum)+' por unidade (referência PNCP). Ajuste o preço/custos ou recuse o item quando permitido pelo edital.';
    if(minimum!==null&&positive(item.q)!==null)subtotal+=minimum*item.q;
  }
  const maximum=participationMaximum(r,'total',-1,quote),manual=parseAmount(quote.minimumTotal);
  if(aboveLimit(manual,maximum))return 'O mínimo global não pode superar '+money(maximum)+' (referência PNCP para a participação).';
  if(aboveLimit(subtotal,maximum))return 'A soma dos mínimos dos produtos não pode superar '+money(maximum)+' (referência PNCP para a participação).';
  if(includeCosts&&r.review?.bidRule?.mode!=='item'&&aboveLimit(bidMinimum(r,quote).minimum,maximum))return 'O piso calculado pelos custos supera '+money(maximum)+' (referência PNCP). Ajuste os custos ou recuse a oportunidade; o piso não será reduzido automaticamente.';
  return '';
}

export function bidLimitError(r,quote,basis,index,amount){
  const invalid=floorLimitError(r,quote,true);if(invalid)return invalid;
  const maximum=participationMaximum(r,basis,index,quote);
  return aboveLimit(amount,maximum)?'O lance não pode superar '+money(maximum)+(basis==='unit'?' por unidade':' no total')+' (referência PNCP).':'';
}
