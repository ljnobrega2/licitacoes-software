import test from 'node:test';import assert from 'node:assert/strict';
import {parseAmount,decimalAmount,portalLink,bidMinimum} from '../app/bid-math.js';
test('Brazilian money, explicit decimals and API numbers preserve the same value',()=>{
  assert.equal(parseAmount('1.250,90'),1250.9);assert.equal(parseAmount('0,9032'),.9032);assert.equal(parseAmount(.9032),.9032);assert.equal(parseAmount(1.234),1.234);assert.equal(parseAmount('1.234'),1234);
  for(const invalid of ['0','-10','NaN','Infinity','12,12345','1.2,34','1,2,3','1e3'])assert.equal(parseAmount(invalid),null,invalid);
  assert.equal(decimalAmount(100.1234),'100.1234');
});
test('publication site is not a bid portal, and unsafe URLs are rejected',()=>{
  assert.equal(portalLink('https://pncp.gov.br/app/editais/1'),'');assert.equal(portalLink('javascript:alert(1)'),'');assert.equal(portalLink('https://user:password@example.com'),'');assert.ok(portalLink('https://www.comprasnet.gov.br/seguro/loginPortal.asp'));
});
test('floor is unknown without costs, valid with costs and allocates total overhead by item',()=>{
  assert.equal(bidMinimum({},{}).minimum,null);assert.equal(bidMinimum({},{licenses:790}).minimum,1000);
  const q={useItems:true,itemCosts:[{cost:79,quantity:2},{cost:79,quantity:2}],hours:10,hourly:10,tax:6,margin:15};
  assert.equal(bidMinimum({it:[{n:1,q:2},{n:2,q:2}]},q,'unit',0).minimum,131.65);
  assert.ok(bidMinimum({}, {licenses:1,tax:100},'total').error);assert.ok(bidMinimum({it:[]},q,'unit',0).error);
});
test('manual product floors are shared, cannot lower a cost-derived floor and only sum when complete',()=>{const r={it:[{n:2,q:2},{n:5,q:3}]};assert.equal(bidMinimum(r,{unitFloors:{2:120}},'unit',0).minimum,120);assert.equal(bidMinimum(r,{unitFloors:{2:120}}).minimum,null);assert.equal(bidMinimum(r,{unitFloors:{2:120,5:100}}).minimum,540);assert.equal(bidMinimum(r,{minimumTotal:600,unitFloors:{2:120,5:100}}).minimum,600);assert.equal(bidMinimum(r,{licenses:790,unitFloors:{2:120,5:100}}).minimum,1000);assert.equal(bidMinimum(r,{itemCosts:[{cost:79,quantity:2}],unitFloors:{2:90}},'unit',0).minimum,100);});
