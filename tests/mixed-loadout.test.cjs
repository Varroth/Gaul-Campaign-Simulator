const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const simulated={id:'nr-iw-mixed-loadout-test',source:'linked',faction:'IW',name:'Five-model linked test squad',points:115,models:5,wp:3,t:4,save:3,move:3,oc:2,
 ranged:{attacks:2,range:6,s:4,ap:0,damage:1,skill:3},
 melee:{attacks:4,range:1,s:5,ap:1,damage:1,skill:3},
 loadout:[{name:'Bolt pistol',mode:'ranged',count:4,attacks:2,range:6,s:4,ap:0,damage:1,skill:3},
          {name:'Plasma pistol',mode:'ranged',count:1,attacks:1,range:6,s:8,ap:2,damage:2,skill:3},
          {name:'Chainaxe',mode:'melee',count:5,attacks:4,range:1,s:5,ap:1,damage:1,skill:3}],special:{fnp:5,regen:1}};
E.registerLinked('IW',[simulated]);
test('multiple distinct default weapons retain their exact per-model quantities',()=>{
 const p=E.attackProfiles(simulated,'ranged',5);
 assert.deepEqual(p.map(w=>[w.name,w.activeCount,w.attacks]),[['Bolt pistol',4,2],['Plasma pistol',1,1]]);
});
test('mixed loadout fires eight bolter attacks plus one plasma attack, not all plasma',()=>{
 const g=E.createGame({player:[simulated.id],enemy:['ad-armor'],seed:11});
 g.phase='shooting';const [a,b]=g.units;a.x=1;a.y=2;b.x=5;b.y=2;
 const result=E.attack(g,a.uid,b.uid,'ranged');
 assert.equal(result.ok,true);assert.equal(result.attacks,9);
});
test('casualties reduce the number of attacks for mixed equipment',()=>{
 const g=E.createGame({player:[simulated.id],enemy:['ad-armor']});
 g.phase='shooting';const [a,b]=g.units;a.models=3;a.x=1;a.y=2;b.x=5;b.y=2;
 assert.equal(E.attack(g,a.uid,b.uid,'ranged').attacks,5);
});
test('source-linked melee-only unit cannot fire a made-up ranged attack',()=>{
 const only={...simulated,id:'nr-iw-melee-only-test',name:'Melee-only',loadout:simulated.loadout.filter(w=>w.mode==='melee')};
 E.registerLinked('IW',[only]);
 const g=E.createGame({player:[only.id],enemy:['ad-armor']});g.phase='shooting';
 const [a,b]=g.units;a.x=1;a.y=2;b.x=5;b.y=2;
 assert.equal(E.attack(g,a.uid,b.uid,'ranged').ok,false);
});
