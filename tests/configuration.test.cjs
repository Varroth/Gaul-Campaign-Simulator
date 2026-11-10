const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../catalogue.js');
const E=require('../engine.js');
const gun=(name,id,mode,count,attacks=2)=>({name,sourceProfileId:id,mode,count,attacks,range:mode==='melee'?1:6,s:4,ap:0,damage:1,skill:3});
const bolt=gun('Bolt pistol','bolt','ranged',5),axe=gun('Chainaxe','axe','melee',5,4);
const leader={id:'nr-iw-leader-test',name:'Infernal Chaplain',source:'linked',sourceId:'chaplain-id',sourceVersion:'v1',faction:'IW',isLeader:true,
 leaderTargets:['Infernal Berzerkers'],models:1,points:75,wp:5,t:4,save:3,oc:1,move:3,special:{fnp:5,regen:1},
 ranged:bolt,melee:axe,loadout:[{...bolt,count:1},{...axe,count:1}]};
const sizes=[5,10].map(n=>({id:`f${n}`,label:`${n} models`,models:n,points:n===5?115:220,
 loadout:[{...bolt,count:n},{...axe,count:n}],slots:[{id:'champ',name:'Champion 1 — choose exact wargear',selectedId:'bolt',choices:[
 {id:'bolt',label:'bolt pistol',points:0,weapons:[{...bolt,count:1}]},
 {id:'plasma',label:'plasma pistol',points:5,weapons:[gun('Plasma pistol','plasma','ranged',1,1)]}]}]}));
const source={id:'nr-iw-berzerker-test',sourceId:'berzerker-id',sourceVersion:'v1',faction:'IW',name:'Infernal Berzerkers',
 source:'linked',models:5,wp:3,t:4,save:3,move:3,oc:2,points:115,rootPoints:0,
 formationConfigs:sizes,defaultFormationId:'f5',special:{fnp:5,regen:1},ranged:bolt,melee:axe,loadout:[bolt,axe]};
const leaders=[leader];
E.registerLinked('IW',[source,leader]);
test('source-linked 5 and 10 model formations have distinct published points',()=>{
 const five=C.configureUnit(source,{formationId:'f5'},leaders);
 const ten=C.configureUnit(source,{formationId:'f10'},leaders);
 assert.equal(five.models,5);assert.equal(five.points,115);
 assert.equal(ten.models,10);assert.equal(ten.points,220);
});
test('individual plasma-pistol substitution replaces a bolter and adds option cost',()=>{
 const t=C.configureUnit(source,{formationId:'f10',gear:{champ:'plasma'}},leaders);
 assert.equal(t.points,225);
 assert.deepEqual(t.loadout.filter(w=>w.mode==='ranged').map(w=>[w.name,w.count]),[['Bolt pistol',9],['Plasma pistol',1]]);
 assert.equal(E.registerConfiguration(t),t.id);
 assert.equal(E.total([t.id]),225);
});
test('applying the same loadout twice generates the same deterministic template',()=>{
 const a=C.configureUnit(source,{formationId:'f5',gear:{champ:'plasma'}},leaders);
 const b=C.configureUnit(source,{formationId:'f5',gear:{champ:'plasma'}},leaders);
 assert.equal(a.id,b.id);E.registerConfiguration(a);E.registerConfiguration(b);
});
test('leader is a single paid attached model, not five duplicate attacks',()=>{
 const t=C.configureUnit(source,{formationId:'f5',leaderId:leader.id},leaders);
 assert.equal(t.points,190);assert.equal(t.models,6);assert.equal(t.bodyguardModels,5);assert.equal(t.leader.name,leader.name);
 assert.deepEqual(E.attackProfiles(t,'ranged',6).map(w=>w.activeCount),[5,1]);
 assert.deepEqual(E.attackProfiles(t,'ranged',1).map(w=>w.activeCount),[0,1]);
 E.registerConfiguration(t);const game=E.createGame({player:[t.id],enemy:['ad-armor']});
 assert.equal(E.status(game.units[0]).maxHp,20);
 game.units[0].models=1;assert.equal(E.status(game.units[0]).hp,5);
});
test('bodyguards plus leader control objectives by their separate OC values',()=>{
 const t=C.configureUnit(source,{formationId:'f5',leaderId:leader.id},leaders);
 E.registerConfiguration(t);const g=E.createGame({player:[t.id],enemy:['ad-armor']});
 g.units[0].x=3;g.units[0].y=2;g.units[1].x=11;g.units[1].y=7;
 assert.equal(E.objectiveOwner(g,g.objectives[0]),'player');
});
test('invalid or ineligible leaders cannot attach',()=>{
 assert.throws(()=>C.configureUnit(source,{leaderId:'bad'},leaders),/not eligible/);
 assert.equal(C.isValidLeaderFor({...source,name:'Void Breachers'},leader),false);
 assert.throws(()=>C.configureUnit({...source,special:{mandatoryChaplain:true}},{leaderId:leader.id},leaders),/not eligible/);
});
test('missing formation IDs and invalid gear options are refused',()=>{
 assert.throws(()=>C.configureUnit(source,{formationId:'stale'},leaders),/not present/);
 assert.throws(()=>C.configureUnit(source,{gear:{champ:'not-present'}},leaders),/no longer legal/);
});
test('configured units stay unverified until full combat review',()=>{
 const t=C.configureUnit(source,{formationId:'f5',leaderId:leader.id},leaders);
 assert.equal(C.statusFor(t),'synced');assert.equal(t.verification,'synced');
});
test('old-style plain string musters continue working after registering configurations',()=>{
 assert.equal(E.total(['iw-varroth','iw-ashen']),525);
 const g=E.createGame({player:['iw-varroth'],enemy:['ad-armor']});
 assert.equal(g.units[0].models,1);
});
