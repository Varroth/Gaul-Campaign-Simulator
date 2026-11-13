const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');

test('multiple purchased reserves round-trip through save validation',()=>{
 const g=E.createGame({player:['iw-despoilers','iw-void','iw-thralls'],enemy:['ad-breach'],
  deployment:{player:['field','reserve','reserve'],enemy:['field']}});
 assert.equal(E.validateLoadedState(structuredClone(g)).units.filter(u=>u.deployment==='reserve').length,2);
});
test('save validation rejects duplicate unit identities and unpurchased units',()=>{
 const g=E.createGame({player:['iw-despoilers','iw-thralls'],enemy:['ad-breach']});
 const duplicate=structuredClone(g);duplicate.units[1].uid='p0';
 assert.throws(()=>E.validateLoadedState(duplicate),/purchased muster/);
 const swapped=structuredClone(g);swapped.units[1].template='iw-varroth';
 assert.throws(()=>E.validateLoadedState(swapped),/purchased muster/);
 const missing=structuredClone(g);delete missing.settings;
 assert.throws(()=>E.validateLoadedState(missing),/muster data/);
});
test('offboard units do not conceal overlapping battlefield units',()=>{
 const g=E.createGame({player:['iw-despoilers','iw-thralls'],enemy:['ad-breach']});
 g.units[1].x=g.units[0].x;g.units[1].y=g.units[0].y;
 assert.throws(()=>E.validateLoadedState(g),/same square/);
});
test('background catalogue refresh cannot change an active battle profile',()=>{
 const profile={...E.BY_ID['iw-despoilers'],source:'linked',sourceVersion:'revision-one',id:'nr-iw-refresh-regression'};
 E.registerLinked('IW',[profile]);
 const g=E.createGame({player:[profile.id],enemy:['ad-breach']});
 const wounds=E.status(g.units[0]).maxHp;
 E.registerLinked('IW',[{...profile,sourceVersion:'revision-two',wp:30,points:900}]);
 assert.equal(E.template(g.units[0]).wp,profile.wp);
 assert.equal(E.status(g.units[0]).maxHp,wounds);
 assert.equal(E.BY_ID[profile.id].wp,30);
 assert.throws(()=>E.validateLoadedState(JSON.parse(JSON.stringify(g))),/older New Recruit revision/);
});
test('mortal wounds allocated to an attached hazardous Leader do not kill bodyguards',()=>{
 const profile={...E.BY_ID['iw-despoilers'],source:'linked',id:'nr-iw-hazard-regression',models:6,bodyguardModels:5,
  leader:{name:'Test Leader',wp:2,special:{}},special:{}};
 E.registerLinked('IW',[profile]);
 const g=E.createGame({player:[profile.id],enemy:['ad-breach']});
 const result=E.applyMortalWounds(g,g.units[0],3,{leaderOnly:true});
 assert.equal(result.casualties,1);assert.equal(g.units[0].leaderAlive,false);
 assert.equal(g.units[0].models,5);assert.equal(g.units[0].injury,0);
 assert.equal(g.units[0].hasSufferedDamage,true);
});
