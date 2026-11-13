const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine');
const basic={source:'linked',faction:'IW',models:1,points:100,wp:10,t:5,save:3,move:3,oc:1,special:{},ranged:{attacks:1,range:12,s:4,ap:0,damage:1,skill:3},melee:{attacks:1,range:1,s:4,ap:0,damage:1,skill:3}};
const ability=name=>({name,description:'Fixture for targeted source ability'});
const units=[
 {...basic,id:'nr-support-voss',name:'Hadrak Voss',abilities:[ability('Custodian of Engines')]},
 {...basic,id:'nr-support-crew',name:'Forge Servitor Cohort',abilities:[ability('Maintenance Crew')]},
 {...basic,id:'nr-support-tank',name:'Predator Annihilator',category:'Vehicle',abilities:[]},
 {...basic,id:'nr-support-serum',name:'Istran Valcor',abilities:[ability('Serum Custodian')],special:{fnp:5}},
 {...basic,id:'nr-support-khol',name:'Tervan Khol',abilities:[ability('Neurological Stabilizers')]},
 {...basic,id:'nr-support-ghor',name:'Malthor Ghor',abilities:[ability('Battlefield Dislocation')]},
 {...basic,id:'nr-support-marine',name:'Infernal Legionaries',abilities:[],special:{fnp:5,painSensitive:true}}
];
E.registerLinked('IW',units);
function make(ids){return E.createGame({player:ids,enemy:['ad-breach'],seed:52});}
test('Hadrak repairs only one adjacent living vehicle at end of Movement',()=>{
 const g=make(['nr-support-voss','nr-support-tank']);g.units[0].x=0;g.units[0].y=3;g.units[1].x=1;g.units[1].y=3;g.units[1].injury=3;
 assert.equal(E.useAbility(g,'p0','Custodian of Engines','p1').ok,false);
 g.phase='reinforcements';assert.equal(E.useAbility(g,'p0','Custodian of Engines','p1').ok,true);assert.equal(g.units[1].injury,2);
 assert.equal(E.useAbility(g,'p0','Custodian of Engines','p1').ok,false);
});
test('Maintenance Crew boosts one eligible repair once per battle',()=>{
 const g=make(['nr-support-voss','nr-support-tank','nr-support-crew']);
 g.units[0].x=1;g.units[0].y=3;g.units[1].x=2;g.units[1].y=3;g.units[2].x=1;g.units[2].y=2;g.units[1].injury=4;g.phase='reinforcements';
 E.useAbility(g,'p0','Custodian of Engines','p1');assert.equal(g.units[1].injury,2);assert.equal(g.units[2].maintenanceUsed,true);
 g.round++;E.useAbility(g,'p0','Custodian of Engines','p1');assert.equal(g.units[1].injury,1);
});
test('repair rejects out-of-range and destroyed targets without spending the ability',()=>{
 const g=make(['nr-support-voss','nr-support-tank']);g.units[1].injury=4;g.units[1].x=5;g.units[1].y=5;g.phase='reinforcements';
 assert.equal(E.useAbility(g,'p0','Custodian of Engines','p1').ok,false);
 g.units[1].models=0;g.units[1].x=1;g.units[1].y=3;
 assert.equal(E.useAbility(g,'p0','Custodian of Engines','p1').ok,false);assert.equal(g.units[0].abilityUses,undefined);
});
test('Serum Custodian heals an eligible living Astartes without exceeding maximum',()=>{
 const g=make(['nr-support-serum','nr-support-marine']);g.units[1].x=1;g.units[1].y=3;g.units[1].injury=1;
 assert.equal(E.useAbility(g,'p0','Serum Custodian','p1').ok,true);assert.equal(g.units[1].injury,0);
 assert.equal(E.useAbility(g,'p0','Serum Custodian','p1').ok,false);
});
test('Neurological Stabilizers are phase-limited and exclude the Lost Cohort',()=>{
 const g=make(['nr-support-khol','nr-support-marine']);g.units[1].x=1;g.units[1].y=3;g.units[1].painPenalty=1;g.phase='shooting';
 assert.equal(E.useAbility(g,'p0','Neurological Stabilizers','p1').ok,true);
 assert.equal(g.units[1].painSuppressedPhase,'1-player-shooting');
 assert.equal(g.units[1].painPenalty,1);
});
test('Battlefield Dislocation applies one penalty to the next test, once per battle',()=>{
 const g=make(['nr-support-ghor']);g.units[1].x=3;g.units[1].y=3;
 assert.equal(E.useAbility(g,'p0','Battlefield Dislocation','e0').ok,true);
 assert.equal(g.units[1].nextShockPenalty,1);E.shockTest(g,g.units[1]);assert.equal(g.units[1].nextShockPenalty,0);
 g.round++;assert.equal(E.useAbility(g,'p0','Battlefield Dislocation','e0').ok,false);
});
