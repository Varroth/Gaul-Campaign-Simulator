const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const daemon={id:'nr-iw-paid-bloodletters-test',source:'linked',sourceId:'bltest',
 faction:'IW',name:'Bloodletters',points:125,models:10,wp:1,t:4,save:4,move:3,oc:1,
 ranged:{attacks:0,range:1,s:4,ap:0,damage:1,skill:3},
 melee:{attacks:3,range:1,s:5,ap:1,damage:1,skill:3},special:{daemon:true}};
E.registerLinked('IW',[daemon]);
const roster=['iw-thralls',daemon.id,'iw-ashen'];
const plan={player:['field','reserve','field'],enemy:['field']};
const make=()=>E.createGame({player:roster,enemy:['ad-breach'],deployment:plan,seed:47});
test('paid Bloodletters in Reserves count for army points but cannot begin on field',()=>{
 const g=make();
 assert.equal(g.units[1].deployment,'reserve');assert.equal(g.units[1].x,-1);
 assert.equal(E.living(g,'player').length,2);
 assert.equal(E.reserveUnits(g,'player').length,1);
 assert.equal(E.total(roster),65+125+390);
});
test('round-one reserve entry is rejected and offboard units cannot attack',()=>{
 const g=make(),blood=g.units[1],enemy=g.units[3];
 assert.equal(E.deployReserve(g,blood.uid,0,0).ok,false);
 g.phase='shooting';
 assert.equal(E.attack(g,blood.uid,enemy.uid,'ranged').ok,false);
});
test('from round two ordinary reserves arrive at friendly edge, not mid-board',()=>{
 const g=make(),blood=g.units[1];g.round=2;g.phase='reinforcements';
 assert.equal(E.canDeployReserve(g,blood,5,3),false);
 assert.equal(E.canDeployReserve(g,blood,0,0),true);
 assert.equal(E.deployReserve(g,blood.uid,0,0).ok,true);
 assert.equal(E.reserveUnits(g,'player').length,0);
 assert.equal(blood.x,0);
});
test('Invocation places purchased Bloodletters without adding a free unit',()=>{
 const g=make(),[thralls,blood]=g.units;g.round=2;g.phase='reinforcements';thralls.x=3;thralls.y=3;
 const before=g.units.length;
 const res=E.invokeBloodletters(g,thralls.uid,blood.uid,6,3);
 assert.equal(res.ok,true);assert.equal(g.units.length,before);
 assert.equal(g.invocationUsed.player,true);
 assert.equal(blood.deployment,'field');assert.equal(blood.x,6);
});
test('Invocation never consumes its use on illegal placement',()=>{
 const g=make(),[thralls,blood]=g.units;g.round=2;g.phase='reinforcements';thralls.x=8;thralls.y=3;
 assert.equal(E.invokeBloodletters(g,thralls.uid,blood.uid,9,3).ok,false);
 assert.equal(g.invocationUsed.player,false);
});
test('Invocation requires unshocked Thralls and Bloodletters actually in Reserves',()=>{
 const g=make(),[thralls,blood]=g.units;g.round=2;g.phase='reinforcements';thralls.x=3;thralls.y=3;
 thralls.battleshocked=true;
 assert.equal(E.invokeBloodletters(g,thralls.uid,blood.uid,6,3).ok,false);
 thralls.battleshocked=false;blood.deployment='field';
 assert.equal(E.invokeBloodletters(g,thralls.uid,blood.uid,6,3).ok,false);
});
test('one Invocation per army even with two purchased Bloodletters',()=>{
 const group=['iw-thralls',daemon.id,daemon.id,'iw-ashen','iw-ashen'];
 const g=E.createGame({player:group,enemy:['ad-breach'],
 deployment:{player:['field','reserve','reserve','field','field'],enemy:['field']}});
 g.round=2;g.phase='reinforcements';g.units[0].x=3;g.units[0].y=3;
 assert.equal(E.invokeBloodletters(g,'p0','p1',6,3).ok,true);
 assert.equal(E.invokeBloodletters(g,'p0','p2',5,4).ok,false);
 assert.equal(E.reserveUnits(g,'player').length,1);
});
test('old saves with no reserve data remain valid',()=>{
 const g=E.createGame({player:['iw-ashen'],enemy:['ad-breach']});
 assert.equal(E.living(g).length,2);
 assert.equal(E.validateLoadedState(g),g);
});
test('invalid save cannot place offboard reserves onto the map secretly',()=>{
 const g=make();assert.equal(E.validateLoadedState(structuredClone(g)).units[1].deployment,'reserve');
 const bad=structuredClone(g);bad.units[1].x=1;
 assert.throws(()=>E.validateLoadedState(bad),/invalid unit data/);
});
test('autoplay returns paid reserves to battlefield after round one',()=>{
 const g=make();g.round=2;g.phase='reinforcements';g.active='player';g.phase='reinforcements';
 E.autoDeployReserves(g,'player');
 assert.equal(E.reserveUnits(g,'player').length,0);
});
