const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine');
const C=require('../catalogue');
const base={source:'linked',faction:'IW',points:100,models:1,wp:100,t:4,save:3,move:3,oc:1,ld:12,special:{},abilities:[]};
const gun={name:'Test rifle',mode:'ranged',count:1,attacks:20,range:12,s:5,ap:0,damage:1,skill:4,traits:''};
const blade={...gun,name:'Test blade',mode:'melee',range:1};
const ab=name=>({name,description:'Source-rule regression fixture'});
function make(specs,seed=10){
 const units=specs.map((s,i)=>({...base,id:'nr-named-'+i,name:'Fixture '+i,loadout:[{...gun},{...blade}],ranged:{...gun},melee:{...blade},...s}));
 E.registerLinked('IW',units);
 const g=E.createGame({player:units.slice(0,-1).map(u=>u.id),enemy:[units.at(-1).id],seed});
 g.units.forEach((u,i)=>{u.x=i;u.y=0;});return g;
}
const uses=(g,word)=>g.log.filter(x=>x.includes(word));

test('coverage audit reads the app manifest, including later partial handlers',()=>{
 for(const name of ['Custodian of Engines','Long March Doctrine','Independent Forge','Forward Observer','The Last Sentence'])assert.equal(C.ABILITY_COVERAGE[name],'partial');
 assert.equal(C.ABILITY_COVERAGE['Denied Silence'],undefined,'Undefined nearby range must stay reference only');
 assert.deepEqual(C.VERIFIED_LEDGER,{});
});
test('Independent Forge supports one in-range daemon engine per turn, not other vehicles',()=>{
 const g=make([{name:'Hadrak Voss',abilities:[ab('Independent Forge')]},{name:'Defiler',category:'Daemon Engine',special:{daemon:true,alliedDaemon:false}},{name:'Predator',category:'Vehicle'},{}]);
 const [v,engine,tank]=g.units;E.shockTest(g,tank);assert.equal(v.abilityUses,undefined);
 engine.x=4;E.shockTest(g,engine);assert.equal(v.abilityUses,undefined);
 engine.x=2;E.shockTest(g,engine);assert.equal(uses(g,'used Independent Forge').length,1);
 E.shockTest(g,engine);assert.equal(uses(g,'used Independent Forge').length,1);
 g.active='enemy';E.shockTest(g,engine);assert.equal(uses(g,'used Independent Forge').length,2);
});
test('a dead attached support Leader cannot grant Independent Forge',()=>{
 const g=make([{models:2,bodyguardModels:1,leader:{name:'Hadrak Voss',wp:5,special:{},abilities:[ab('Independent Forge')]}},{name:'Defiler',category:'Daemon Engine',special:{daemon:true,alliedDaemon:false}},{}]);
 g.units[0].leaderAlive=false;g.units[0].models=1;E.shockTest(g,g.units[1]);assert.equal(uses(g,'Independent Forge').length,0);
});
test('Boarding Priority is shared across transports and spent only on a failed in-range test',()=>{
 const g=make([{name:'Mordren Vhal',abilities:[ab('Boarding Priority')]},{name:'Rhino Carrier',abilities:[{name:'Manifest',description:'Capacity 10'}]},{name:'Land Raider',abilities:[{name:'Manifest',description:'Capacity 12'}]},{}]);
 const [v,r,l]=g.units;r.x=5;E.shockTest(g,r);assert.equal(v.abilityUses,undefined);
 r.x=1;E.shockTest(g,r);assert.equal(uses(g,'used Boarding Priority').length,1);
 E.shockTest(g,l);assert.equal(uses(g,'used Boarding Priority').length,1);
 g.round++;E.shockTest(g,r);assert.equal(uses(g,'used Boarding Priority').length,1);
});
test('Forward Observer measures from observer to visible target and shares one use per round',()=>{
 const g=make([{name:'Observer',abilities:[ab('Forward Observer')]},{},{},{}]);
 const [observer,a,b,target]=g.units;observer.x=0;a.x=7;b.x=8;target.x=9;g.phase='shooting';
 E.attack(g,a.uid,target.uid,'ranged');assert.equal(uses(g,'used Forward Observer').length,1);
 E.attack(g,b.uid,target.uid,'ranged');assert.equal(uses(g,'used Forward Observer').length,1);
 g.round++;a.shot=false;target.x=10;E.attack(g,a.uid,target.uid,'ranged');assert.equal(uses(g,'used Forward Observer').length,1);
});
test('an observer behind a wall cannot support a shooter with a separate clear firing lane',()=>{
 const g=make([{name:'Observer',abilities:[ab('Forward Observer')]},{},{}]);
 const [observer,a,b]=g.units;observer.x=3;observer.y=1;a.x=5;a.y=3;b.x=5;b.y=1;g.phase='shooting';
 assert.equal(E.hasLineOfSight(observer,b),false);assert.equal(E.attack(g,a.uid,b.uid,'ranged').ok,true);
 assert.equal(uses(g,'Forward Observer').length,0);
});
test('Reactor Hunter requires a neutron hit on a vehicle, is once per battle and penalizes one roll',()=>{
 const g=make([{name:'Cerberus Tank Destroyer',abilities:[ab('Reactor Hunter')],loadout:[{...gun,name:'Neutron battery',traits:'Torrent'}]}, {name:'Predator',category:'Vehicle'}]);
 g.phase='shooting';g.units[1].x=3;E.attack(g,'p0','e0','ranged');assert.equal(g.units[1].nextHitPenalty,1);
 g.units[0].shot=false;g.units[1].nextHitPenalty=0;E.attack(g,'p0','e0','ranged');assert.equal(g.units[1].nextHitPenalty,0);
 // A single one-roll modifier must not penalize the rest of a volley.
 let differing=0;
 for(let seed=1;seed<=40;seed++){
  const ordinary=make([{},{}],seed),penalized=make([{},{}],seed);
  for(const battle of [ordinary,penalized]){battle.phase='shooting';battle.units[1].x=3;}
  penalized.units[0].nextHitPenalty=1;
  const x=E.attack(ordinary,'p0','e0','ranged'),y=E.attack(penalized,'p0','e0','ranged');
  assert.equal(penalized.units[0].nextHitPenalty,0);if(x.hits!==y.hits)differing++;
 }
 assert.ok(differing>0);
 const wrong=make([{abilities:[ab('Reactor Hunter')],loadout:[{...gun,traits:'Torrent'}]},{name:'Predator',category:'Vehicle'}]);
 wrong.phase='shooting';wrong.units[1].x=3;E.attack(wrong,'p0','e0','ranged');assert.equal(wrong.units[1].nextHitPenalty,undefined);
});
test('Torrent does not consume a penalty to the next Hit roll',()=>{
 const g=make([{loadout:[{...gun,traits:'Torrent'}]},{}]);g.units[0].nextHitPenalty=1;g.phase='shooting';g.units[1].x=3;
 E.attack(g,'p0','e0','ranged');assert.equal(g.units[0].nextHitPenalty,1);
});
test('Seal the Breach applies to one sequence on an objective and ends with its Leader',()=>{
 const g=make([{loadout:[{...gun,traits:'Torrent'}]},{loadout:[{...gun,traits:'Torrent'}]},
  {name:'Void Breachers',models:2,bodyguardModels:1,leader:{name:'Kordas Vrenn',wp:5,save:3,special:{},abilities:[ab('Seal the Breach')]}}]);
 g.phase='shooting';g.units[2].x=3;g.units[2].y=2;g.units[0].x=0;g.units[0].y=2;
 E.attack(g,'p0','e0','ranged');assert.equal(g.units[2].abilityUses['cover:Seal the Breach'],'1-player-shooting');
 const firstUse=structuredClone(g.units[2].abilityUses);E.attack(g,'p1','e0','ranged');assert.deepEqual(g.units[2].abilityUses,firstUse);
 g.round++;g.units[0].shot=false;g.units[2].leaderAlive=false;g.units[2].models=1;
 E.attack(g,'p0','e0','ranged');assert.equal(g.units[2].abilityUses['cover:Seal the Breach'],'1-player-shooting');
});
test('Thermic Line is reserved for a covered target and affects only one hit per battle',()=>{
 const g=make([{abilities:[ab('Thermic Line')],loadout:[{...gun,traits:'Torrent'}]},{}]);g.phase='shooting';g.units[1].x=3;
 E.attack(g,'p0','e0','ranged');assert.equal(g.units[0].abilityUses?.['Thermic Line'],undefined);
 g.units[0].shot=false;g.units[1].x=2;g.units[1].y=1;E.attack(g,'p0','e0','ranged');assert.equal(g.units[0].abilityUses['Thermic Line'],'battle');
});
test('Siege Charge improves results against Fortifications without changing other targets',()=>{
 let gained=0;
 for(let seed=1;seed<=30;seed++){
  const plain=make([{}, {name:'Fortification',category:'Fortification'}],seed);
  const siege=make([{abilities:[ab('Siege Charge')]},{name:'Fortification',category:'Fortification'}],seed);
  for(const g of [plain,siege]){g.phase='shooting';g.units[1].x=3;}
  const a=E.attack(plain,'p0','e0','ranged'),b=E.attack(siege,'p0','e0','ranged');if(b.damage>a.damage)gained++;
 }
 assert.ok(gained>0);
});
test('The Last Sentence requires Krell himself to kill the Character and grants one automatic pass',()=>{
 const killing={...blade,attacks:80,s:20,ap:5,damage:9,skill:2,traits:'Precision'};
 for(const leaderWeapon of [false,true]){
  const g=make([{models:2,bodyguardModels:1,leader:{name:'Rhazdan Krell',wp:6,special:{},abilities:[ab('The Last Sentence')]},loadout:[{...killing,isLeader:leaderWeapon}]},{isLeader:true,wp:1,save:6}],12);
  g.phase='fight';E.attack(g,'p0','e0','melee');assert.equal(g.units[1].models,0);
  assert.equal(!!g.units[0].nextShockPass,leaderWeapon);
  if(leaderWeapon){const before=g.seedState;assert.equal(E.shockTest(g,g.units[0]).passed,true);assert.equal(g.seedState,before);assert.equal(g.units[0].nextShockPass,false);}
 }
});
test('Dread Hunter affects only a Psyker and only its next Battle-shock test',()=>{
 const g=make([{abilities:[ab('Dread Hunter')]},{special:{psychic:true}}]);g.phase='shooting';g.units[1].x=3;
 E.attack(g,'p0','e0','ranged');assert.equal(g.units[1].nextShockPenalty,1);E.shockTest(g,g.units[1]);assert.equal(g.units[1].nextShockPenalty,0);
 g.round++;g.units[0].shot=false;E.attack(g,'p0','e0','ranged');assert.equal(g.units[1].nextShockPenalty,0);
});
test('Void Deployment shares its one use between an Aircraft hit and a reserve charge',()=>{
 const g=make([{abilities:[ab('Void Deployment')]},{name:'Aircraft',special:{aircraft:true}},{},{}]);g.phase='shooting';g.units[1].deployment='field';g.units[1].x=1;g.units[3].x=4;
 E.attack(g,'p1','e0','ranged');assert.equal(g.units[0].abilityUses['Void Deployment'],'battle');
 g.phase='charge';g.units[2].x=0;g.units[2].arrivedTurn='1-player';g.units[3].x=6;E.charge(g,'p2','e0');
 assert.equal(uses(g,'Void Deployment').length,1);
 let used=false;
 for(let seed=1;seed<40;seed++){
  const arrival=make([{abilities:[ab('Void Deployment')]},{},{}],seed);arrival.phase='charge';arrival.units[1].arrivedTurn='1-player';arrival.units[1].x=0;arrival.units[1].y=2;arrival.units[2].x=6;arrival.units[2].y=2;
  E.charge(arrival,'p1','e0');if(arrival.units[0].abilityUses?.['Void Deployment']){used=true;break;}
 }
 assert.equal(used,true);
});
test('Directed Objective recognizes named and attached officers and checks visibility',()=>{
 const g=make([{name:'Rhazek Thorne',keywords:['ASTARTES','OFFICER']},{}]);
 g.units[0].x=3;g.units[0].y=1;g.units[1].x=5;g.units[1].y=1;
 assert.equal(E.declareDirectedObjective(g,'player','e0').ok,false);
 g.units[0].y=0;g.units[1].y=0;
 assert.equal(E.declareDirectedObjective(g,'player','e0').ok,true);
 assert.equal(E.declareDirectedObjective(g,'player','e0').ok,false,'No repeated declaration in the same turn');
 const attached=make([{models:2,bodyguardModels:1,leader:{name:'Rhazek Thorne',wp:5,special:{},keywords:['OFFICER']}},{}]);
 assert.equal(E.declareDirectedObjective(attached,'player','e0').ok,true);
 const dead=make([{models:2,bodyguardModels:1,leader:{name:'Rhazek Thorne',wp:5,special:{},keywords:['OFFICER']}},{}]);
 dead.units[0].leaderAlive=false;dead.units[0].models=1;assert.equal(E.declareDirectedObjective(dead,'player','e0').ok,false);
});
test('Voxmaster command crosses an obstruction only inside its source range',()=>{
 for(const extended of [false,true]){
  const g=make([{name:'Kessel Rane',keywords:['VOXMASTER'],abilities:extended?[ab('Signal Grid')]:[]},{}]);
  g.units[0].x=3;g.units[0].y=1;g.units[1].x=10;g.units[1].y=1;
  assert.equal(E.hasLineOfSight(g.units[0],g.units[1]),false);
  assert.equal(E.declareDirectedObjective(g,'player','e0').ok,extended);
 }
 const g=make([{keywords:['VOXMASTER'],abilities:[ab('Signal Grid')]},{}]);g.units[1].x=10;
 assert.equal(E.declareDirectedObjective(g,'player','e0').ok,false);
});
test('Siegebreaker modifies at most one melee wound against a covered target each phase',()=>{
 let triggered=false;
 for(let seed=1;seed<=30;seed++){
  const g=make([{abilities:[ab('Siegebreaker')]},{}],seed);g.phase='fight';g.units[0].x=1;g.units[0].y=1;g.units[1].x=2;g.units[1].y=1;
  assert.equal(E.attack(g,'p0','e0','melee').ok,true);
  const count=uses(g,'used Siegebreaker').length;assert.ok(count<=1);if(count)triggered=true;
 }
 assert.equal(triggered,true);
 const g=make([{abilities:[ab('Siegebreaker')]},{}]);g.phase='fight';E.attack(g,'p0','e0','melee');assert.equal(uses(g,'used Siegebreaker').length,0);
});
