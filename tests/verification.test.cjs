const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../catalogue.js');
const E=require('../engine.js');
const linked={id:'nr-iw-test-review',source:'linked',sourceId:'source-001',sourceVersion:'catalogue-blob-a1',
 faction:'IW',name:'Review test marine',points:145,models:5,wp:2,t:5,save:3,move:3,oc:2,estimated:false,category:'Battleline',
 ranged:{attacks:2,range:5,s:4,ap:0,damage:1,skill:3},melee:{attacks:2,range:1,s:5,ap:1,damage:1,skill:3},
 special:{fnp:5,regen:1},audit:{points:'direct',unitStats:'source',modelCount:'declared',ranged:'source',melee:'source'}};
const checks={stats:true,points:true,weapons:true,abilities:true,composition:true,engine:true};
const approval={sourceId:linked.sourceId,catalogueSha:linked.sourceVersion,rulesetVersion:C.RULESET_VERSION,
 fingerprint:C.fingerprint(linked),checks,reviewer:'test-only reviewer',reviewedAt:'2026-11-10'};
test('unreviewed New Recruit profiles are Synced even with direct costs',()=>assert.equal(C.statusFor(linked),'synced'));
test('built-in units are Sim Estimate',()=>assert.equal(C.statusFor(E.BY_ID['iw-varroth']),'sim-estimate'));
test('reviewed mapping requires every item in the ledger contract',()=>{
 assert.equal(C.statusFor(linked,linked.sourceVersion,{[linked.id]:approval}),'verified');
 for(const key of Object.keys(checks)){
  const partial={...approval,checks:{...checks,[key]:false}};
  assert.equal(C.statusFor(linked,linked.sourceVersion,{[linked.id]:partial}),'synced',key);
 }
});
test('changed source SHA downgrades a previously reviewed unit',()=>assert.equal(C.statusFor(linked,'catalogue-blob-new',{[linked.id]:approval}),'synced'));
test('changed simulator profile downgrades a reviewed unit',()=>assert.equal(C.statusFor({...linked,points:999},linked.sourceVersion,{[linked.id]:approval}),'synced'));
test('changed engine ruleset or missing human reviewer cannot be verified',()=>{
 assert.equal(C.statusFor(linked,linked.sourceVersion,{[linked.id]:{...approval,rulesetVersion:'old'}}),'synced');
 assert.equal(C.statusFor(linked,linked.sourceVersion,{[linked.id]:{...approval,reviewer:''}}),'synced');
});
test('source sync provenance and cost estimates are reported separately',()=>{
 assert.match(C.reviewNotes(linked).join(' '),/Points read from/);
 assert.match(C.reviewNotes({...linked,estimated:true,audit:{...linked.audit,points:'estimate'}}).join(' '),/simulator estimate/);
});
test('source version pin is mandatory for a Verified status',()=>assert.equal(C.statusFor({...linked,sourceVersion:''},'',{[linked.id]:approval}),'synced'));
test('ledger is intentionally empty until full combat rules have been reviewed',()=>assert.deepEqual(Object.keys(C.VERIFIED_LEDGER),[]));

test('cached data cannot forge Verified profile status',()=>{
 const storage={getItem:()=>JSON.stringify({v:3,cachedAt:Date.now(),catalogues:{IW:{version:'catalogue-blob-a1',units:[{...linked,verification:'verified'}]}}}),setItem:()=>{}};
 const loaded=C.readCache(storage);
 assert.equal(loaded.catalogues.IW.units[0].verification,'synced');
});
