const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const patterns={item:/menor preco (?:por|de cada) item|adjudicacao por item|julgamento[^.!?]{0,80}por item/,lot:/menor preco (?:global )?por (?:lote|grupo)|adjudicacao por (?:lote|grupo)|julgamento[^.!?]{0,80}por (?:lote|grupo)/,package:/menor preco global(?! por (?:lote|grupo))|adjudicacao global|julgamento[^.!?]{0,80}(?:pacote completo|valor global)/};
export function verifyBidRule(proposed,documents=[]){
  const quote=String(proposed?.quote||'').trim(),source=Number(proposed?.documentIndex),mode=proposed?.mode;
  if(!Object.hasOwn(patterns,mode)||quote.length<12||quote.length>700||!Number.isInteger(source)||!documents[source])return {mode:'unknown',quote:'',source:''};
  const clause=norm(quote),text=norm(documents[source].text),match=patterns[mode].exec(clause);
  if(!text.includes(clause)||!match||/\b(?:nao|vedad[oa]|proibid[oa])\b/.test(clause.slice(Math.max(0,match.index-35),match.index))||Object.entries(patterns).some(([key,re])=>key!==mode&&re.test(clause)))return {mode:'unknown',quote:'',source:''};
  return {mode,quote,source:documents[source].name};
}
export const bidModeLabel=mode=>({item:'Por produto/item · permite disputa separada',lot:'Por lote/grupo · pacote completo de cada lote',package:'Pacote completo · lance global, sem itens separados',unknown:'Forma de disputa a confirmar no edital'}[mode]||'Forma de disputa a confirmar no edital');
export function bidRuleError(review,basis){const mode=review?.bidRule?.mode;return mode==='lot'?'O edital indica lotes/grupos. Confirme a composição e o valor de cada lote no portal; não trate produtos avulsos ou o contrato inteiro como um lote.':basis==='unit'&&mode!=='item'?'Lance separado exige confirmação de julgamento por item no edital. Pacote completo exige valor global.':basis==='total'&&mode==='item'?'O edital indica julgamento por item. Prepare um lance unitário para cada produto selecionado.':'';}
