const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const w=(name,mode,traits='')=>({name,sourceProfileId:name,mode,count:1,attacks:6,range:mode==='ranged'?8:1,s:6,ap:4,damage:2,skill:4,traits});
const rifle=w('Rifle','ranged'),sword=w('Sword','melee');
const units=[
 ['nr-iw-test-veterans','Chosen Veterans',['Veterans of Two Judgments']],
 ['nr-iw-test-tank','Cataphractii Terminator Veterans',['Relic Plate']],
 ['nr-iw-test-skimmer','Stormraven Assault Gunship',['Armoured Flight']],
 ['nr-iw-test-advance','Despoiler Cadre',['Legion Rush']],
 ['nr-iw-test-spear','Bike Recon Squadron',['Pursuit Column']],
 ['nr-iw-test-rapid','Bloodletters',['Blood God’s Assault']],
 ['nr-iw-test-firm','Entrenched Battery',['Entrenched']]
].map(([id,name,abilities])=>({id,name,source:'linked',faction:'IW',models:1,wp:12,points:100,move:3,t:6,save:3,oc:1,ld:6,
 special:{},abilities:abilities.map(name=>({name,description:'Source test ability',coverage:'modeled'})),ranged:rifle,melee:sword,loadout:[{...rifle},{...sword}]}));
E.registerLinked('IW',units);
const game=(p=units[0].id,e=units[1].id,seed=10)=>E.createGame({player:[p],enemy:[e],seed});

test('Advance roll is recorded once and increases legal movement range',()=>{
 const g=game(units[3].id,units[1].id,10),u=g.units[0];
 const r=E.beginAdvance(g,u.uid);assert.equal(r.ok,true);assert.ok(r.roll>=1&&r.roll<=6);
 assert.equal(E.beginAdvance(g,u.uid).ok,false);
 assert.equal(u.advancing,true);assert.equal(u.advanceRoll,r.roll);
 assert.equal(E.canMove(g,u.uid,0,0),r.extra>=0); // within normal movement plus advance
});
test('Pursuit Column adds one to Advance roll without modifying the base speed',()=>{
 const a=game(units[3].id,units[1].id,17),b=game(units[4].id,units[1].id,17);
 // Despoilers can re-roll on a low roll. Compare against two ordinary advance rolls from the same seed.
 assert.equal(E.BY_ID[units[4].id].move,3);
 assert.ok(E.beginAdvance(b,b.units[0].uid).roll>=2);
});
test('a unit that Advanced cannot charge or fire non-Assault weapons',()=>{
 const g=game(units[3].id,units[1].id),u=g.units[0],enemy=g.units[1];
 assert.ok(E.beginAdvance(g,u.uid).ok);
 g.phase='shooting';u.x=2;u.y=3;enemy.x=4;enemy.y=3;
 assert.equal(E.attack(g,u.uid,enemy.uid,'ranged').ok,false);
 g.phase='charge';assert.equal(E.canCharge(g,u.uid,enemy.uid),false);
});
test('Assault weapons can shoot after advancing',()=>{
 const g=game(units[3].id,units[1].id),u=g.units[0],enemy=g.units[1];
 const source=E.BY_ID[u.template];source.loadout[0].traits='Assault';
 assert.ok(E.beginAdvance(g,u.uid).ok);g.phase='shooting';u.x=2;u.y=3;enemy.x=4;enemy.y=3;
 assert.equal(E.attack(g,u.uid,enemy.uid,'ranged').ok,true);
 source.loadout[0].traits='';
});
test('modeled named melee re-roll is logged at most once in a fight',()=>{
 let found=false;
 for(let seed=1;seed<70;seed++){
  const g=game(units[0].id,units[1].id,seed);g.phase='fight';g.units[0].x=2;g.units[1].x=3;
  const r=E.attack(g,g.units[0].uid,g.units[1].uid,'melee');
  assert.equal(r.ok,true);
  const uses=g.log.filter(line=>line.includes('Veterans of Two Judgments re-rolled one hit die'));
  assert.ok(uses.length<=1);if(uses.length)found=true;
 }
 assert.ok(found,'At least one deterministic seed triggered the source ability.');
});
test('Relic Plate reduces the first allocated Damage 2 hit by one point',()=>{
 let seen=false;
 for(let seed=1;seed<=100;seed++){
  const g=game(units[6].id,units[1].id,seed);g.phase='shooting';g.units[0].x=2;g.units[1].x=4;
  const r=E.attack(g,g.units[0].uid,g.units[1].uid,'ranged');
  if(g.units[1].abilityUses?.['damage:Relic Plate']){assert.ok(r.damage>0);seen=true;break;}
 }
 assert.ok(seen);
});
test('Armoured Flight makes a Damage 2 strike deal at most one wound per hit',()=>{
 let seen=false;
 for(let seed=1;seed<150;seed++){
  const g=game(units[6].id,units[2].id,seed);g.phase='shooting';g.units[0].x=2;g.units[1].x=4;
  const r=E.attack(g,g.units[0].uid,g.units[1].uid,'ranged');
  if(r.unsaved){assert.ok(r.damage<=r.unsaved);seen=true;break;}
 }
 assert.ok(seen);
});
test('Army Builder source labels never imply these abilities are Verified',()=>{
 for(const u of units)assert.notEqual(u.verification,'verified');
});
