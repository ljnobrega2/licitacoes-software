import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyBidRule,bidRuleError} from '../app/tender-rules.js';
test('Only literal official clauses establish item, package or lot bidding',()=>{
  for(const [mode,quote]of [['item','O critério de julgamento será menor preço por item.'],['lot','O julgamento será menor preço global por grupo.'],['package','O critério será menor preço global.']])assert.equal(verifyBidRule({mode,quote,documentIndex:0},[{name:'Edital.pdf',text:quote}]).mode,mode);
  assert.equal(verifyBidRule({mode:'package',quote:'O critério será menor preço global.',documentIndex:0},[{name:'TR',text:'Não existe este trecho.'}]).mode,'unknown');
  assert.equal(verifyBidRule({mode:'item',quote:'Não será aceito julgamento por item.',documentIndex:0},[{name:'TR',text:'Não será aceito julgamento por item.'}]).mode,'unknown');
  assert.equal(verifyBidRule({mode:'package',quote:'O julgamento é menor preço global por lote.',documentIndex:0},[{name:'TR',text:'O julgamento é menor preço global por lote.'}]).mode,'unknown');
});
test('Package and lot rules do not allow unsupported single-product bids',()=>{
  assert.match(bidRuleError({bidRule:{mode:'package'}},'unit'),/global/);assert.equal(bidRuleError({bidRule:{mode:'package'}},'total'),'');assert.match(bidRuleError({bidRule:{mode:'lot'}},'unit'),/lotes/);assert.match(bidRuleError(null,'unit'),/confirmação/);
});
