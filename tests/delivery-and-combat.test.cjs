const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine');
const weapon={name:'Test cannon',mode:'ranged',attacks:1,attackValue:'1',range:12,s:5,ap:0,damage:1,skill:3,count:1};
const basic={source:'linked',faction:'IW',models:1,points:100,wp:24,t:8,save:3,move:4,oc:1,special:{},abilities:[],loadout:[weapon],ranged:weapon,melee:{...weapon,range:1,attacks:0}};
const units=[
 {...basic,id:'nr-qc-pod',name:'Dreadclaw Drop Pod',category:'Transport',special:{deepStrike:true},abilities:[{name:'Assault Descent',description:'Capacity 10 Infantry spaces; Terminators count as two.'}]},
 {...basic,id:'nr-qc-raider',name:'Land Raider',category:'Transport',abilities:[{name:'Assault Ramp',description:'Capacity: 12 spaces.'}]},
 {...basic,id:'nr-qc-raven',name:'Stormraven Assault Gunship',category:'Aircraft',special:{aircraft:true},abilities:[{name:'Passenger Manifest',description:'Capacity 12 spaces.'}]},
 {...basic,id:'nr-qc-infantry',name:'Despoiler Cadre',category:'Infantry',models:5,wp:3,special:{fnp:5}},
 {...basic,id:'nr-qc-deep',name:'Ashen Chain Terminators',category:'Infantry',models:5,wp:3,special:{deepStrike:true}},
 {...basic,id:'nr-qc-guns',name:'Test vehicle',category:'Vehicle',loadout:[{...weapon,count:2}]},
 {...basic,id:'nr-qc-modes',name:'Test modes',category:'Vehicle',loadout:[{...weapon,name:'Launcher — frag',alternativeGroup:'launcher'},{...weapon,name:'Launcher — krak',alternativeGroup:'launcher'}]},
 {...basic,id:'nr-qc-indirect',name:'Test artillery',category:'Vehicle',loadout:[{...weapon,traits:'Indirect Fire'}]},
 {...basic,id:'nr-qc-one',name:'Test missile vehicle',category:'Vehicle',loadout:[{...weapon,traits:'One Shot'}]},
 {...basic,id:'nr-qc-immobile',name:'Deathstorm Drop Pod',category:'Vehicle',special:{deepStrike:true,immobile:true}}
];
E.registerLinked('IW',units);
function make(player,deployment){return E.createGame({player,enemy:['ad-armor'],deployment:{player:deployment||player.map(()=>'field'),enemy:['field']},seed:17});}
test('multiple passengers stay embarked while their carrier Deep Strikes',()=>{
 const g=make(['nr-qc-pod','nr-qc-infantry','nr-qc-infantry'],['deepstrike','embark:0','embark:0']);
 assert.equal(E.validateLoadedState(structuredClone(g)).units.length,4);
 g.round=2;g.phase='reinforcements';
 assert.equal(E.deployReserve(g,'p0',4,3).ok,true);
 assert.equal(E.disembark(g,'p1',5,3).ok,true);
 assert.equal(g.units[1].moved,true);
 g.phase='charge';g.units[3].x=7;g.units[3].y=3;
 assert.equal(E.canCharge(g,'p1','e0'),false);
});
test('Deep Strike permits central cells, edge reserves do not',()=>{
 const g=make(['nr-qc-deep','nr-qc-infantry'],['deepstrike','reserve']);g.round=2;g.phase='reinforcements';
 assert.equal(E.canDeployReserve(g,g.units[0],5,3),true);
 assert.equal(E.canDeployReserve(g,g.units[1],5,3),false);
 assert.equal(E.canDeployReserve(g,g.units[0],8,3),false);
});
test('reserve placement cannot be used before ordinary Movement ends',()=>{
 const g=make(['nr-qc-deep'],['deepstrike']);g.round=2;
 assert.equal(E.deployReserve(g,'p0',4,3).ok,false);
 E.advance(g);assert.equal(g.phase,'reinforcements');assert.equal(E.deployReserve(g,'p0',4,3).ok,true);
});
test('an Assault Ramp allows charging after carrier movement',()=>{
 const g=make(['nr-qc-raider','nr-qc-infantry'],['field','embark:0']);g.units[0].moved=true;
 assert.equal(E.disembark(g,'p1',1,3).ok,true);assert.equal(g.units[1].moved,true);
 g.phase='charge';g.units[2].x=3;g.units[2].y=3;
 assert.equal(E.canCharge(g,'p1','e0'),true);
});
test('Aircraft and immobile pods must start in Reserves; landed Deathstorm cannot move',()=>{
 assert.throws(()=>make(['nr-qc-raven']),/Reserves/);
 const g=make(['nr-qc-immobile'],['deepstrike']);g.round=2;g.phase='reinforcements';E.deployReserve(g,'p0',4,3);
 E.startTurn(g,'player');assert.equal(E.canMove(g,'p0',5,3),false);assert.equal(E.beginAdvance(g,'p0').ok,false);
});
test('two guns on one vehicle produce two attacks',()=>{
 const g=make(['nr-qc-guns']);g.phase='shooting';g.units[0].x=2;g.units[0].y=0;g.units[1].x=5;g.units[1].y=0;
 assert.equal(E.attack(g,'p0','e0','ranged').attacks,2);
});
test('alternative fire profiles cannot both fire',()=>{
 const g=make(['nr-qc-modes']);g.phase='shooting';g.units[0].x=2;g.units[0].y=0;g.units[1].x=5;g.units[1].y=0;
 assert.equal(E.attack(g,'p0','e0','ranged').attacks,1);
});
test('Indirect Fire uses the same legal target check as the interface',()=>{
 const g=make(['nr-qc-indirect']);g.phase='shooting';g.units[0].x=2;g.units[0].y=1;g.units[1].x=6;g.units[1].y=1;
 assert.equal(E.hasLineOfSight(g.units[0],g.units[1]),false);
 assert.equal(E.canAttack(g,'p0','e0','ranged'),true);assert.equal(E.attack(g,'p0','e0','ranged').ok,true);
});
test('One Shot weapons remain spent across turn changes and saved games',()=>{
 const g=make(['nr-qc-one']);g.phase='shooting';g.units[0].x=2;g.units[0].y=0;g.units[1].x=5;g.units[1].y=0;
 assert.equal(E.attack(g,'p0','e0','ranged').ok,true);
 E.startTurn(g,'player');g.phase='shooting';assert.equal(E.canAttack(g,'p0','e0','ranged'),false);
 const saved=E.validateLoadedState(structuredClone(g));assert.deepEqual(saved.units[0].oneShotUsed,['Test cannon']);
});
test('ended battles reject movement, charges and attacks',()=>{
 const g=make(['nr-qc-guns']);g.finished=true;
 assert.equal(E.canMove(g,'p0',1,3),false);assert.equal(E.beginAdvance(g,'p0').ok,false);
 g.phase='shooting';assert.equal(E.attack(g,'p0','e0','ranged').ok,false);
});
