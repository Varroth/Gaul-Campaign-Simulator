const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const C=require('../catalogue.js');
const gun=(name,id,mode,count)=>({name,sourceProfileId:id,mode,count,attacks:1,range:mode==='melee'?1:5,s:4,ap:0,damage:1,skill:3});
const base={id:'nr-iw-roster-cap',name:'Audit squad',sourceId:'source-cap',source:'linked',sourceVersion:'rev24',faction:'IW',rosterMax:3,models:5,points:100,wp:3,t:4,save:3,move:3,oc:2,special:{fnp:5,regen:1},ranged:gun('Bolt pistol','bolt','ranged',5),melee:gun('Chainaxe','axe','melee',5)};
const cohort={...base,id:'nr-iw-roster-lost',sourceId:'lost',name:'Lost Cohort — Power Armour',special:{fnp:5,regen:1,lost:true,mandatoryChaplain:true},rosterMax:2};
const cohort2={...cohort,id:'nr-iw-roster-lost-term',sourceId:'lost-term',name:'Lost Cohort — Terminator Armour'};
const leader={...base,id:'nr-iw-roster-bannon',sourceId:'bannon',name:'Balan Bannon',models:1,points:180,isLeader:true,rosterMax:null};
const variant={...base,id:'cfg-roster1',baseId:base.id,points:110,models:10};
const attached={...base,id:'cfg-leader1',baseId:base.id,leaderId:leader.id,leader:{id:leader.id,name:leader.name,points:leader.points,wp:leader.wp,t:leader.t,save:leader.save,oc:leader.oc,special:leader.special},points:280};
E.registerLinked('IW',[base,cohort,cohort2,leader]);E.registerConfiguration(variant);E.registerConfiguration(attached);
test('root roster copy cap applies across custom loadout variants',()=>{
 assert.deepEqual(E.musterProblems([base.id,variant.id,base.id]),[]);
 assert.match(E.musterProblems([base.id,variant.id,base.id,base.id])[0],/at most 3/);
 assert.throws(()=>E.createGame({player:[base.id,variant.id,base.id,base.id],enemy:['ad-armor']}),/at most 3/);
});
test('both Lost Cohort armour types count towards a shared two-squad limit',()=>{
 assert.deepEqual(E.musterProblems([cohort.id,cohort2.id]),[]);
 assert.match(E.musterProblems([cohort.id,cohort2.id,cohort.id])[0],/maximum two squads combined/);
});
test('one unique named Leader may not be standalone and attached simultaneously',()=>{
 assert.deepEqual(E.musterProblems([attached.id]),[]);
 assert.match(E.musterProblems([attached.id,leader.id])[0],/cannot appear twice/);
 assert.match(E.musterProblems([attached.id,attached.id])[0],/cannot appear twice/);
});
test('published source quotas and per-five weapon restrictions can be enforced',()=>{
 assert.deepEqual(C.enforceWargearLimits({...base,wargearLimits:[{kind:'handflamer',per:5,maximum:1,description:'One hand flamer per five models'}]},10,[{name:'Chainbound Reavers hand flamer',count:2}]),undefined);
 assert.throws(()=>C.enforceWargearLimits({...base,wargearLimits:[{kind:'handflamer',per:5,maximum:1,description:'One hand flamer per five models'}]},5,[{name:'Hand flamer',count:2}]),/maximum 1/);
 assert.throws(()=>C.enforceWargearLimits({...base,wargearLimits:[{kind:'power',per:5,maximum:1,description:'One power weapon per five models'}]},5,[{name:'Power sword \/ axe',count:2}]),/maximum 1/);
});
test('modified squad weapon selection obeys quota instead of merely changing price',()=>{
 const link={...base,wargearLimits:[{kind:'handflamer',per:5,maximum:1,description:'One hand flamer per five models'}],rootPoints:0,formationConfigs:[{id:'5',label:'5 models',models:5,points:100,loadout:[gun('Bolt pistol','bolt','ranged',3),{...gun('Hand flamer','hf','ranged',1),count:1}],slots:[{id:'slot1',name:'Specialist 1',selectedId:'pistol',choices:[{id:'pistol',label:'Bolt pistol',points:0,weapons:[gun('Bolt pistol','bolt','ranged',1)]},{id:'flamer',label:'Hand flamer',points:0,weapons:[gun('Hand flamer','hf','ranged',1)]}]}]}],defaultFormationId:'5'};
 assert.throws(()=>C.configureUnit(link,{gear:{slot1:'flamer'}},[]),/maximum 1/);
});
