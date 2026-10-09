import test from 'node:test';
import assert from 'node:assert/strict';
import {participationMaximum,floorLimitError,bidLimitError,aboveLimit} from '../app/bid-limits.js';
const r={val:300,it:[{n:2,q:2,vu:100,vt:200},{n:5,q:2,vu:50,vt:100}]};
test('unit and total limits are distinct, equality allowed and four decimals enforced',()=>{
  assert.equal(participationMaximum(r,'unit',0),100);assert.equal(participationMaximum(r),300);
  assert.equal(floorLimitError(r,{unitFloors:{2:100,5:50},minimumTotal:300}), '');
  assert.match(floorLimitError(r,{unitFloors:{2:100.0001}}),/Item 2/);
  assert.match(floorLimitError(r,{minimumTotal:300.0001}),/global/);
  assert.equal(aboveLimit(.3,.1+.2),false);
});
test('item totals constrain units and product sum cannot exceed published contract value',()=>{
  assert.equal(participationMaximum({it:[{q:3,vt:10}]},'unit',0),3.3333);
  assert.equal(participationMaximum({it:[{q:3,vu:4,vt:10}]},'unit',0),3.3333);
  assert.match(floorLimitError({...r,val:250},{unitFloors:{2:100,5:50}}),/soma/);
  assert.match(floorLimitError(r,{unitFloors:{99:1}}),/produto existente/);
});
test('only verified item participation removes excluded products from pricing',()=>{
  const q={selectedItems:{2:false},unitFloors:{2:500,5:50}};
  assert.match(floorLimitError(r,q),/Item 2/);
  const itemRule={...r,review:{bidRule:{mode:'item'}}};assert.equal(floorLimitError(itemRule,q),'');
  assert.equal(participationMaximum(itemRule,'total',-1,q),100);
  assert.match(floorLimitError(itemRule,{...q,minimumTotal:101}),/global/);
});
test('unknown/secret/zero prices are not invented caps and cost floors are never clamped',()=>{
  assert.equal(participationMaximum({val:0,it:[{q:3,vu:0}]},'unit',0),null);
  assert.equal(participationMaximum({val:0,it:[{q:3,vu:0}]}),null);
  assert.equal(floorLimitError({it:[{n:1,q:3}]},{unitFloors:{1:999}}),'');
  assert.match(floorLimitError(r,{licenses:790},true),/calculado pelos custos/);
  assert.equal(floorLimitError(r,{licenses:790}), '','Costs can be recorded even when not competitive');
  assert.match(floorLimitError(r,{itemCosts:[{cost:79.01,quantity:2}]},true),/piso calculado/);
  assert.equal(bidLimitError(r,{unitFloors:{2:90}},'unit',0,100),'');
  assert.match(bidLimitError(r,{unitFloors:{2:90}},'unit',0,100.0001),/lance/);
});
