import test from 'node:test';
import assert from 'node:assert/strict';
import {isLive,eligibleForBoard,minimumBid,calculateQuote,dateTime} from '../app/core.js';
test('deadline is interpreted in Brasília regardless of browser timezone',()=>{
  assert.equal(dateTime('2026-10-09T09:00:00').toISOString(),'2026-10-09T12:00:00.000Z');
  assert.equal(isLive({fim:'2026-10-09T09:00:00'},Date.parse('2026-10-09T12:01:00Z')),false);
});
test('expired new records are excluded, while tracked negotiations remain in their stage',()=>{
  const now=Date.parse('2026-10-09T15:00:00Z'),r={fim:'2026-10-08T23:59:00',stage:'nova'};
  assert.equal(eligibleForBoard(r,now),false);assert.equal(eligibleForBoard({...r,stage:'disputada'},now),true);
  assert.equal(isLive({fim:'2026-10-12T10:00:00',st:'Suspensa'},now),false);
});
test('minimum bid rounds up cents and rejects tax plus margin of 100%',()=>{
  assert.equal(minimumBid(79),100);assert.equal(minimumBid(100),126.59);assert.equal(minimumBid(100,50,50),null);
});
test('costs include labor, support and contingency; item-based cost replaces licenses',()=>{
  const q=calculateQuote({licenses:1000,hours:10,hourly:100,support:200,contingency:10,tax:6,margin:15});
  assert.equal(q.cost,2420);assert.equal(q.bid,3063.3);
  assert.equal(calculateQuote({licenses:1000,useItems:true,itemCosts:[{cost:200,quantity:2}]}).cost,400);
});
