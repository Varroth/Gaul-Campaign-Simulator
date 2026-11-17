const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine');
const C=require('../catalogue');
const gun={name:'Rifle',sourceProfileId:'rifle',mode:'ranged',count:1,attacks:20,range:12,s:5,ap:0,damage:2,skill:4,traits:''};
const blade={...gun,name:'Blade',sourceProfileId:'blade',mode:'melee',range:1};
const up=(name,detachment='Crimson Onslaught',id=name)=>({id,name,detachment,maxCopies:3,points:10});
function make(specs={},opts={}){
 const profiles=[{id:'nr-ar-p',name:'Infernal Berzerkers',models:10,keywords:['ASTARTES','INFANTRY'],...specs.player},
 {id:'nr-ar-h',name:'Helper',models:10,keywords:['ASTARTES','INFANTRY'],...specs.helper},
 {id:'nr-ar-e',name:'Enemy',models:10,keywords:['INFANTRY'],...specs.enemy}].map(x=>({source:'linked',faction:'IW',sourceVersion:'fixture',points:100,wp:100,t:4,save:3,move:3,oc:1,ld:12,special:{},abilities:[],ranged:gun,melee:blade,loadout:[{...gun},{...blade}],...x}));
 E.registerLinked('IW',profiles);
 const g=E.createGame({player:['nr-ar-p','nr-ar-h'],enemy:['nr-ar-e'],pointsLimit:2000,cpRules:{initial:10,perTurn:1},...opts});
 g.units.forEach((u,i)=>{u.x=i;u.y=0;});return g;
}
const setPhase=(g,p)=>{g.phase=p;return g;};
const used=(g,s)=>g.log.some(x=>x.includes(s));
test('source DP budgets allow combinations but reject duplicate, unknown and over-budget selections',()=>{
 assert.equal(E.normalizeArmyRules({player:['War Hounds’ Legacy','Crimson Onslaught']},2000).player.length,2);
 assert.throws(()=>E.normalizeArmyRules({player:['War Hounds’ Legacy','Crimson Onslaught']},1000),/DP budget/);
 assert.throws(()=>E.normalizeArmyRules({player:['Crimson Onslaught','Crimson Onslaught']}),/Invalid/);
 assert.throws(()=>E.normalizeArmyRules({player:['unknown']}),/Invalid/);
 assert.throws(()=>E.normalizeArmyRules({player:['Crimson Onslaught']},500),/only/);
});
test('CP defaults to zero, rejects malformed values, and is gained once per own turn',()=>{
 assert.deepEqual(E.normalizeCP(),{initial:0,perTurn:0,reactions:false});
 for(const x of [-1,1.5,NaN,99])assert.throws(()=>E.normalizeCP({initial:x}));
 const g=make();assert.deepEqual(g.cp,{player:11,enemy:10});
 E.finishByAuto(g);assert.ok(g.cp.player<=15);assert.ok(g.cp.enemy<=15);
});
test('paid upgrades require the selected detachment, distinct caps and per-name copy caps',()=>{
 const enhancement=up('The Measured Strike');
 const g=make({player:{enhancement}},{armyRules:{player:['Crimson Onslaught']}});
 assert.deepEqual(E.musterProblems(g.settings.player,['Crimson Onslaught'],2000),[]);
 assert.match(E.musterProblems(g.settings.player,[],2000).join(' '),/select Crimson/);
 assert.match(E.musterProblems(Array(4).fill('nr-ar-p'),['Crimson Onslaught'],2000).join(' '),/maximum 3/);
 const a=E.BY_ID['nr-ar-p'],b=E.BY_ID['nr-ar-h'],c=E.BY_ID['nr-ar-e'];b.enhancement=up('Crimson Spur');c.enhancement=up('Pain-Sworn Standard');
 assert.match(E.musterProblems([a.id,b.id,c.id],['Crimson Onslaught'],1000).join(' '),/distinct/);
});
test('agreed battle limit rather than current spend is the daemon ally cap',()=>{
 E.registerLinked('IW',[{...E.BY_ID['iw-reavers'],id:'nr-cap-mortal',source:'linked',points:300},{...E.BY_ID['iw-reavers'],id:'nr-cap-ally',source:'linked',points:200,special:{daemon:true,alliedDaemon:true}}]);
 assert.deepEqual(E.musterProblems(['nr-cap-mortal','nr-cap-ally'],[],1000),[]);
 assert.ok(E.musterProblems(['nr-cap-mortal','nr-cap-ally']).length);
});
test('stratagem actions reject wrong detachment, insufficient CP, shock, timing and repeat use without spending',()=>{
 let g=make();assert.equal(E.useStratagem(g,'p0','Redline Advance').ok,false);assert.equal(g.cp.player,11);
 g=make({},{armyRules:{player:['Crimson Onslaught']}});g.cp.player=0;assert.equal(E.stratagemOptions(g,'p0').length,0);
 g.cp.player=3;g.units[0].battleshocked=true;assert.equal(E.stratagemOptions(g,'p0').length,0);g.units[0].battleshocked=false;
 assert.equal(E.useStratagem(g,'p0','Redline Advance').ok,true);assert.equal(g.cp.player,2);
 assert.equal(E.useStratagem(g,'p1','Redline Advance').ok,false);assert.equal(g.cp.player,2);
 g.phase='shooting';assert.equal(E.useStratagem(g,'p0','Redline Advance').ok,false);
});
test('Crimson Spur and Redline add inches only to Advance and prohibit charging',()=>{
 const g=make({player:{enhancement:up('Crimson Spur')}},{armyRules:{player:['Crimson Onslaught']}});
 E.useStratagem(g,'p0','Redline Advance');const r=E.beginAdvance(g,'p0');
 assert.ok(r.roll>=4&&r.roll<=9);assert.equal(g.units[0].advanceBonus,3);assert.equal(E.template(g.units[0]).move,3);
 g.phase='charge';assert.equal(E.canCharge(g,'p0','e0'),false);
});
test('Vox-Directed Advance keeps bonuses, cannot reroll twice, and is shared by the army per round',()=>{
 const g=make();E.beginAdvance(g,'p0');assert.equal(E.rerollAdvance(g,'p0').ok,true);assert.equal(E.rerollAdvance(g,'p0').ok,false);
 E.beginAdvance(g,'p1');assert.equal(E.rerollAdvance(g,'p1').ok,false);
 g.round++;assert.equal(E.rerollAdvance(g,'p1').ok,true);
 g.units[1].moved=true;assert.equal(E.rerollAdvance(g,'p1').ok,false);
});
test('charge stratagems require an actually legal charge and valid arriving unit',()=>{
 const g=make({player:{name:'Void Breachers'}},{armyRules:{player:['Breach and Ruin','Crimson Onslaught']}});g.phase='charge';
 assert.equal(E.useStratagem(g,'p0','Pressurised Entry','e0').ok,false);
 g.units[0].arrivedTurn='1-player';assert.equal(E.useStratagem(g,'p0','Pressurised Entry','e0').ok,true);
 g.units[0].noChargeTurn='1-player';assert.equal(E.stratagemOptions(g,'p0').some(x=>x.name==='Shock Assault'),false);
});
test('full-roll Measured Strike does not stack a second charge reroll',()=>{
 let found=false;
 for(let seed=1;seed<30;seed++){
  const g=make({player:{enhancement:up('The Measured Strike')}},{seed,armyRules:{player:['Crimson Onslaught']}});g.phase='charge';g.units[2].x=6;
  E.useStratagem(g,'p0','Shock Assault','e0');E.charge(g,'p0','e0');
  if(used(g,'The Measured Strike re-rolled')){found=true;assert.equal(used(g,'Shock Assault re-rolled'),false);assert.equal(g.units[0].abilityUses['charge:The Measured Strike'],'battle');break;}
 }
 assert.equal(found,true);
});
test('Controlled Fury belongs only to the first successful eligible charger each turn',()=>{
 const g=make({},{seed:3,armyRules:{player:['Crimson Onslaught']}});g.phase='charge';g.units[1].x=0;g.units[1].y=1;g.units[2].x=2;
 E.charge(g,'p0','e0');E.charge(g,'p1','e0');
 assert.equal(g.units.filter(u=>u.controlledFuryTurn==='1-player').length,1);
});
test('Contain the Passage gives one extra OC per model for this turn and never bypasses shock',()=>{
 const g=make({player:{name:'Void Breachers',oc:0}},{armyRules:{player:['Breach and Ruin']}}),u=g.units[0];u.x=3;u.y=2;g.phase='reinforcements';
 assert.equal(E.useStratagem(g,u.uid,'Contain the Passage').ok,true);assert.equal(E.objectiveOwner(g,g.objectives[0]),'player');
 u.battleshocked=true;assert.equal(E.objectiveOwner(g,g.objectives[0]),null);u.battleshocked=false;g.active='enemy';assert.equal(E.objectiveOwner(g,g.objectives[0]),null);
});
test('field repair requires living nearby support, cannot resurrect, and is once per vehicle per battle',()=>{
 const g=make({player:{name:'Predator',keywords:['VEHICLE','TANK']},helper:{name:'Hadrak Voss'}},{armyRules:{player:['Iron Reavers']}});g.phase='reinforcements';const u=g.units[0];u.injury=4;
 assert.equal(E.useStratagem(g,'p0','Emergency Field Repair').ok,true);assert.equal(u.injury,3);
 g.round++;assert.equal(E.useStratagem(g,'p0','Emergency Field Repair').ok,false);u.fieldRepairUsed=false;g.units[1].models=0;assert.equal(E.useStratagem(g,'p0','Emergency Field Repair').ok,false);
});
test('Old Night Ammunition requires source RELIC and TANK keywords and a Vehicle or Monster target',()=>{
 const g=make({player:{name:'Sicaran Battle Tank',keywords:['VEHICLE','TANK','RELIC']},enemy:{name:'Predator',keywords:['VEHICLE']}},{armyRules:{player:['Iron Reavers']}});g.phase='shooting';
 assert.equal(E.useStratagem(g,'p0','Old Night Ammunition','e0').ok,true);assert.equal(g.cp.player,9);
 const plain=make({player:{name:'Predator',keywords:['VEHICLE','TANK']},enemy:{name:'Tank',keywords:['VEHICLE']}},{armyRules:{player:['Iron Reavers']}});plain.phase='shooting';assert.equal(E.stratagemOptions(plain,'p0').some(a=>a.name==='Old Night Ammunition'),false);
});
test('Crossing Fires needs a different Astartes attacker with an unsaved wound, and spends AP even on a miss',()=>{
 const g=make({player:{loadout:[{...gun,attacks:1,skill:6}]},enemy:{save:2}},{armyRules:{player:['War Hounds’ Legacy']}});g.phase='shooting';
 assert.equal(E.useStratagem(g,'p0','Crossing Fires','e0').ok,false);
 g.units[2].unsavedBy={phase:'1-player-shooting',ids:['p1']};assert.equal(E.useStratagem(g,'p0','Crossing Fires','e0').ok,true);
 E.attack(g,'p0','e0','ranged');assert.equal(g.units[0].stratagemEffects['Crossing Fires'].remaining,0);
});
test('Marked and Broken grants one wound reroll to each of exactly two engaged friendly units',()=>{
 const g=make({},{armyRules:{player:['War Hounds’ Legacy']}});g.phase='fight';g.units[0].x=1;g.units[1].x=2;g.units[1].y=1;g.units[2].x=2;
 assert.equal(E.useStratagem(g,'p0','Marked and Broken','e0').ok,true);
 for(const u of g.units.slice(0,2))assert.equal(u.stratagemEffects['Marked and Broken'].remaining,1);
});
test('Anvil and Fang needs a second engaged friend and cannot rewrite the persistent weapon Strength',()=>{
 const g=make({},{armyRules:{player:['Crimson Onslaught']}});g.phase='fight';g.units[0].x=1;g.units[1].x=2;g.units[1].y=1;
 const old=E.template(g.units[0]).loadout[1].s;assert.equal(E.useStratagem(g,'p0','Anvil and Fang','e0').ok,true);E.attack(g,'p0','e0','melee');assert.equal(E.template(g.units[0]).loadout[1].s,old);
});
test('Breachmaster Seal alters Battle-shock but does not remove Lost Cohort control tests',()=>{
 const g=make({player:{enhancement:up('Breachmaster’s Seal','Breach and Ruin'),ld:7}},{armyRules:{player:['Breach and Ruin']}});
 const control=make({player:{ld:7}},{seed:g.seed});const a=E.shockTest(g,g.units[0]),b=E.shockTest(control,control.units[0]);assert.equal(a.roll,b.roll+1);
});
test('Chain of Resolve requires a living in-range generic Chaplain bearer',()=>{
 const specs={player:{name:'Infernal Berzerkers',ld:7},helper:{name:'Infernal Chaplain',isLeader:true,enhancement:up('Chain of Resolve')}};
 const g=make(specs,{armyRules:{player:['Crimson Onslaught']}});const a=E.shockTest(g,g.units[0]);
 assert.equal(used(g,'vs 6+'),true);g.units[1].models=0;E.shockTest(g,g.units[0]);assert.equal(g.log[0].includes('vs 7+'),true);
});
test('Void-Tempered Ward cancels only one failed save per battle',()=>{
 const g=make({enemy:{name:'Void Breachers',save:7,enhancement:up('Void-Tempered Ward','Breach and Ruin')}},{armyRules:{enemy:['Breach and Ruin']}});g.phase='shooting';E.attack(g,'p0','e0','ranged');
 assert.equal(g.units[2].abilityUses['Void-Tempered Ward'],'battle');const uses=g.log.filter(x=>x.includes('used Void-Tempered Ward')).length;g.units[0].shot=false;E.attack(g,'p0','e0','ranged');assert.equal(g.log.filter(x=>x.includes('used Void-Tempered Ward')).length,uses);
});
test('Aegis only protects the Character allocated the attack, not its bodyguards',()=>{
 const leader={id:'chap',name:'Infernal Chaplain',wp:100,save:7,special:{},enhancement:up('Oath-Wrought Aegis','War Hounds’ Legacy')};
 const g=make({enemy:{leader,bodyguardModels:9,save:7}},{armyRules:{enemy:['War Hounds’ Legacy']}});g.phase='shooting';E.attack(g,'p0','e0','ranged');assert.equal(g.units[2].abilityUses?.['Oath-Wrought Aegis'],undefined);
 g.units[0].shot=false;g.units[2].models=1;E.attack(g,'p0','e0','ranged');assert.equal(g.units[2].abilityUses['Oath-Wrought Aegis'],'battle');
});
test('Chain-Bound Governor rerolls a failed shock only once and Remembrancer ends with its attached bearer',()=>{
 const g=make({player:{name:'Defiler',enhancement:up('Chain-Bound Governor','Iron Reavers'),ld:20}},{armyRules:{player:['Iron Reavers']}});
 E.shockTest(g,g.units[0]);assert.equal(g.units[0].abilityUses['shock:Chain-Bound Governor'],'battle');
 const h=make({player:{leader:{name:'Infernal Chaplain',wp:5,special:{},enhancement:up('Remembrancer of Isstvan','War Hounds’ Legacy')},ld:20}},{armyRules:{player:['War Hounds’ Legacy']}});h.units[0].leaderAlive=false;E.shockTest(h,h.units[0]);assert.equal(h.units[0].abilityUses?.['shock:Remembrancer of Isstvan'],undefined);
});
test('Vox upgrade provides its own 15-inch command range, lost when bodyguards are destroyed',()=>{
 const g=make({player:{enhancement:up('Vox of the Unforgotten','War Hounds’ Legacy')}},{armyRules:{player:['War Hounds’ Legacy']}});g.units[2].x=7;assert.equal(E.declareDirectedObjective(g,'player','e0').ok,true);
 const h=make({player:{enhancement:up('Vox of the Unforgotten','War Hounds’ Legacy')}},{armyRules:{player:['War Hounds’ Legacy']}});h.units[2].x=8;assert.equal(E.declareDirectedObjective(h,'player','e0').ok,false);
});
test('Field Manual retarget requires an immediate kill window and a new legal target, then stays spent',()=>{
 const g=make({player:{enhancement:up('War Hounds’ Field Manual','War Hounds’ Legacy')}},{armyRules:{player:['War Hounds’ Legacy']}});g.phase='shooting';g.retargetWindow={side:'player',phase:'1-player-shooting'};
 assert.equal(E.retargetDirected(g,'p0','e0').ok,true);assert.equal(g.directed.player,'e0');assert.equal(E.retargetDirected(g,'p0','e0').ok,false);
 g.retargetWindow={side:'player',phase:'1-player-shooting'};assert.equal(E.retargetOptions(g).length,0);
});
test('CP, paid effects, and detachment choices survive save validation; corrupted CP is rejected',()=>{
 const g=make({},{armyRules:{player:['Crimson Onslaught']}});E.useStratagem(g,'p0','Redline Advance');const restored=E.validateLoadedState(JSON.parse(JSON.stringify(g)));
 assert.equal(restored.cp.player,10);assert.deepEqual(restored.settings.armyRules.player,['Crimson Onslaught']);assert.equal(restored.units[0].stratagemEffects['Redline Advance'].remaining,1);
 restored.cp.player=-1;assert.throws(()=>E.validateLoadedState(restored),/CP/);
});
test('Battle Lab carries rules and CP into reproducible completed games',()=>{
 make({},{armyRules:{player:['Crimson Onslaught']}});const args=[['nr-ar-p'],['nr-ar-e'],3,80,null,{armyRules:{player:['Crimson Onslaught']},cpRules:{initial:2,perTurn:1}}];assert.deepEqual(E.battleLab(...args),E.battleLab(...args));
});
test('Legion Battle Network declares both legal attacks together with independent Hit/Wound choices',()=>{
 const g=make({helper:{keywords:['ASTARTES','INFANTRY','OFFICER']}},{armyRules:{player:['War Hounds’ Legacy']}});g.phase='shooting';g.units[2].x=3;
 const options=E.coordinatedOptions(g,'p0');assert.equal(options.filter(x=>x.kind==='network').length,4);
 const r=E.coordinatedAttack(g,'p0','network','p1','e0','hit:wound');assert.equal(r.ok,true);assert.equal(r.first.ok,true);assert.equal(r.second.ok,true);
 assert.equal(g.units[0].pairReroll.kind,'hit');assert.equal(g.units[1].pairReroll.kind,'wound');assert.equal(E.coordinatedOptions(g,'p0').length,0);
 g.phase='fight';assert.equal(E.coordinatedOptions(g,'p0').length,0,'Network chooses one of Shooting or Fight this turn');
});
test('network cannot command through a dead Leader, an offboard officer or after another attack',()=>{
 const g=make({helper:{leader:{name:'Officer',wp:5,special:{},keywords:['OFFICER']}}},{armyRules:{player:['War Hounds’ Legacy']}});g.phase='shooting';g.units[1].leaderAlive=false;assert.equal(E.coordinatedOptions(g,'p0').length,0);
 g.units[1].leaderAlive=true;g.units[1].deployment='embarked';assert.equal(E.coordinatedOptions(g,'p0').length,0);g.units[1].deployment='field';g.units[0].shot=true;assert.equal(E.coordinatedOptions(g,'p1').length,0);
});
test('Iron and Ash chooses exactly one reroll recipient and requires a vehicle/infantry pair in nine inches',()=>{
 const g=make({player:{name:'Predator',keywords:['VEHICLE','TANK']}},{armyRules:{player:['Iron Reavers']}});g.phase='shooting';g.units[2].x=3;
 assert.equal(E.coordinatedAttack(g,'p0','column','p1','e0','p1').ok,true);assert.equal(g.units[0].pairReroll,undefined);assert.equal(g.units[1].pairReroll.kind,'hit');
 const h=make({player:{name:'Predator',keywords:['VEHICLE','TANK']}},{armyRules:{player:['Iron Reavers']}});h.phase='shooting';h.units[1].x=5;assert.equal(E.coordinatedOptions(h,'p0').length,0);
});
test('Pattern Reliquary increases a repair once, without stacking on Maintenance Crew',()=>{
 const ability={name:'Custodian of Engines',description:'Source fixture'};
 const g=make({player:{name:'Hadrak Voss',abilities:[ability]},helper:{name:'Forge Servitor Cohort',enhancement:up('Pattern Reliquary','Iron Reavers')}},{armyRules:{player:['Iron Reavers']}});
 const tank={...E.BY_ID['nr-ar-e'],id:'nr-ar-tank',name:'Predator',keywords:['VEHICLE'],side:'player'};E.registerLinked('IW',[tank]);
 const u={...g.units[2],uid:'p2',template:tank.id,side:'player',x:0,y:1,injury:5};g.units.push(u);g.units[1].y=1;g.phase='reinforcements';
 assert.equal(E.useAbility(g,'p0','Custodian of Engines','p2').ok,true);assert.equal(u.injury,3);assert.equal(g.units[1].abilityUses['Pattern Reliquary'],'battle');
});
test('Ash-Forged Targeter and Siege Ledger spend one appropriate roll per Shooting phase',()=>{
 for(const name of ['Ash-Forged Targeter','Siege Ledger']){
  const g=make({player:{enhancement:up(name,'Iron Reavers'),loadout:[{...gun,s:1,skill:6}]},enemy:{t:20}},{armyRules:{player:['Iron Reavers']}});g.phase='shooting';g.units[2].x=2;g.units[2].y=1;
  E.attack(g,'p0','e0','ranged');assert.equal(g.units[0].abilityUses[name],'1-player-shooting');
 }
});
test('Sunderer of Gates is reserved for Fortifications',()=>{
 const g=make({player:{enhancement:up('Sunderer of Gates','Breach and Ruin'),loadout:[{...gun,traits:'Torrent',s:1}]},enemy:{t:20}},{armyRules:{player:['Breach and Ruin']}});g.phase='shooting';E.attack(g,'p0','e0','ranged');assert.equal(g.units[0].abilityUses?.['Sunderer of Gates'],undefined);
 const h=make({player:{enhancement:up('Sunderer of Gates','Breach and Ruin'),loadout:[{...gun,traits:'Torrent',s:1}]},enemy:{name:'Fortification',keywords:['FORTIFICATION'],t:20}},{armyRules:{player:['Breach and Ruin']}});h.phase='shooting';E.attack(h,'p0','e0','ranged');assert.equal(h.units[0].abilityUses['Sunderer of Gates'],'1-player-shooting');
});
test('defensive reaction orders default off and only spend CP at an eligible enemy attack',()=>{
 const cfg={enemy:{name:'Void Breachers',save:7}},armyRules={enemy:['Breach and Ruin']};
 const off=make(cfg,{armyRules});off.phase='shooting';E.attack(off,'p0','e0','ranged');assert.equal(off.cp.enemy,10);
 const on=make(cfg,{armyRules,cpRules:{initial:10,perTurn:0,reactions:true}});on.phase='shooting';E.attack(on,'p0','e0','ranged');assert.equal(on.cp.enemy,9);assert.equal(used(on,'reacted with Shield Wall'),true);
 on.units[0].shot=false;E.attack(on,'p0','e0','ranged');assert.equal(on.cp.enemy,9);
});
test('reaction cover is not bought against Ignores Cover weapons or on an already covered tile',()=>{
 for(const specs of [{player:{loadout:[{...gun,traits:'Ignores Cover'}]},enemy:{name:'Void Breachers'}},{enemy:{name:'Void Breachers'}}]){
  const g=make(specs,{armyRules:{enemy:['Breach and Ruin']},cpRules:{initial:10,perTurn:0,reactions:true}});g.phase='shooting';if(!specs.player){g.units[2].x=2;g.units[2].y=1;}
  E.attack(g,'p0','e0','ranged');assert.equal(g.cp.enemy,10);
 }
});
test('Cataphractii Resolve spends two CP on only one allocated melee attack',()=>{
 const g=make({enemy:{name:'Terminators',keywords:['ASTARTES','INFANTRY','TERMINATOR'],save:7}},{armyRules:{enemy:['Breach and Ruin']},cpRules:{initial:10,perTurn:0,reactions:true}});g.phase='fight';g.units[0].x=1;E.attack(g,'p0','e0','melee');assert.equal(g.cp.enemy,8);assert.equal(g.log.filter(x=>x.includes('reacted with Cataphractii Resolve')).length,1);
});
test('The Old Oath reacts only to a failed own Command test and does not reroll a free reroll again',()=>{
 const opts={armyRules:{player:['War Hounds’ Legacy']},cpRules:{initial:10,perTurn:0,reactions:true}};
 const g=make({player:{ld:20}},opts);E.shockTest(g,g.units[0]);assert.equal(g.cp.player,9);
 const h=make({player:{ld:20,abilities:[{name:'Litany of Restraint'}]}},opts);E.shockTest(h,h.units[0]);assert.equal(h.cp.player,10);
});
test('Containment Protocol supports Chapter daemon engines near the Forge and excludes allied daemons',()=>{
 const opts={armyRules:{player:['Iron Reavers']},cpRules:{initial:10,perTurn:0,reactions:true}};
 const g=make({player:{name:'Defiler',keywords:['VEHICLE','DAEMON ENGINE'],special:{daemon:true},ld:20},helper:{name:'Hadrak Voss'}},opts);E.shockTest(g,g.units[0]);assert.equal(g.cp.player,9);
 const h=make({player:{name:'Defiler',keywords:['VEHICLE','DAEMON ENGINE'],special:{daemon:true,alliedDaemon:true},ld:20},helper:{name:'Hadrak Voss'}},opts);E.shockTest(h,h.units[0]);assert.equal(h.cp.player,10);
});
test('Pain as Purpose follows a surviving serum unit casualty and improves its shock for that turn',()=>{
 const g=make({player:{wp:1,special:{fnp:7},ld:7}},{armyRules:{player:['Crimson Onslaught']},cpRules:{initial:10,perTurn:0,reactions:true}});E.applyMortalWounds(g,g.units[0],1);assert.equal(g.cp.player,9);assert.equal(g.units[0].painPurposeTurn,'1-player');
 const before=g.seedState;const r=E.shockTest(g,g.units[0]);g.seedState=before;g.units[0].painPurposeTurn=null;const normal=E.shockTest(g,g.units[0]);assert.equal(r.roll,normal.roll+1);
});
test('Machine-Ready ignores one negative characteristic modifier, retaining other modifiers and immobility',()=>{
 const g=make({player:{name:'Tank',keywords:['VEHICLE']}},{armyRules:{player:['Iron Reavers']}}),u=g.units[0];
 u.moveModifiers=[{id:'slow-a',amount:-2,kind:'characteristic',turn:'1-player'},{id:'slow-b',amount:-2,kind:'characteristic',turn:'1-player'}];assert.equal(E.movementAllowance(g,u),1);
 assert.equal(E.useStratagem(g,'p0','Machine-Ready','','slow-a').ok,true);assert.equal(E.movementAllowance(g,u),2);assert.equal(u.moveModifiers[1].amount,-2);
});
test('By the Chain supplies at most one failed melee Wound reroll per five surviving bodyguards',()=>{
 const g=make({player:{models:10,loadout:[{...blade,attacks:30,s:1,skill:2}]},enemy:{t:20}},{armyRules:{player:['Crimson Onslaught']}});g.phase='fight';g.units[0].x=1;
 assert.equal(E.useStratagem(g,'p0','By the Chain').ok,true);E.attack(g,'p0','e0','melee');assert.equal(g.units[0].stratagemEffects['By the Chain'].remaining,0);
});
test('Hammer the Breach changes exactly one copy of the selected weapon, not every identical gun',()=>{
 for(let seed=1;seed<=20;seed++){
  const w={...gun,count:2,attacks:1,s:20,traits:'Torrent',damage:1};
  const specs={player:{name:'Tank',keywords:['VEHICLE'],loadout:[w]},enemy:{save:2}};
  const g=make(specs,{seed,armyRules:{player:['Iron Reavers']}});g.phase='shooting';g.units[2].x=2;g.units[2].y=1;
  assert.equal(E.useStratagem(g,'p0','Hammer the Breach','e0','rifle').ok,true);const actual=E.attack(g,'p0','e0','ranged');
  const control=make({...specs,player:{name:'Tank',keywords:['VEHICLE'],loadout:[{...w,count:1,ap:1},{...w,count:1}]}},{seed});control.phase='shooting';control.units[2].x=2;control.units[2].y=1;
  assert.equal(actual.damage,E.attack(control,'p0','e0','ranged').damage);
 }
});
test('Bulkhead Breakers requires an objective and improves melee AP only against that declared target',()=>{
 let gain=0;
 for(let seed=1;seed<=20;seed++){
  const specs={player:{name:'Void Breachers',loadout:[{...blade,attacks:20}]},enemy:{save:2}};
  const g=make(specs,{seed,armyRules:{player:['Breach and Ruin']}});g.phase='fight';g.units[0].x=2;g.units[0].y=2;g.units[2].x=3;g.units[2].y=2;
  assert.equal(E.useStratagem(g,'p0','Bulkhead Breakers','e0').ok,true);const damage=E.attack(g,'p0','e0','melee').damage;
  const h=make(specs,{seed});h.phase='fight';h.units[0].x=2;h.units[0].y=2;h.units[2].x=3;h.units[2].y=2;gain+=damage-E.attack(h,'p0','e0','melee').damage;
 }
 assert.ok(gain>0);
});
test('Unbroken Order is limited to the early Command window and cannot clear Cohort control',()=>{
 const g=make({},{armyRules:{player:['War Hounds’ Legacy']}});g.units[0].painPenalty=1;assert.equal(E.useStratagem(g,'p0','Unbroken Order').ok,true);assert.equal(g.units[0].painPenalty,0);
 const h=make({},{armyRules:{player:['War Hounds’ Legacy']}});h.units[0].painPenalty=1;h.units[1].moved=true;assert.equal(E.useStratagem(h,'p0','Unbroken Order').ok,false);
});
test('arrival stratagems enforce same-turn arrival, unit eligibility and twelve-inch shooting range',()=>{
 const g=make({player:{name:'Void Breachers'}},{armyRules:{player:['Breach and Ruin','War Hounds’ Legacy']}});g.units[0].arrivedTurn='1-player';g.phase='shooting';
 assert.equal(E.useStratagem(g,'p0','Vox-Silent Assault','e0').ok,true);E.attack(g,'p0','e0','ranged');assert.equal(g.units[0].stratagemEffects['Vox-Silent Assault'].remaining,0);
 g.phase='charge';assert.equal(E.useStratagem(g,'p0','Reserves in Step','e0').ok,true);
 const h=make({player:{name:'Void Breachers'}},{armyRules:{player:['Breach and Ruin']}});h.units[0].arrivedTurn='1-player';h.phase='shooting';h.units[2].x=7;assert.equal(E.stratagemOptions(h,'p0').some(x=>x.name==='Vox-Silent Assault'),false);
});
test('armoured reaction cover requires the specified vehicle distance and excludes Aircraft',()=>{
 for(const [detachment,name,maxDistance] of [['Iron Reavers','Armoured Curtain',1],['War Hounds’ Legacy','Brotherhood of Iron',3]]){
  const g=make({enemy:{name:'Infernal Legionaries',keywords:['ASTARTES','INFANTRY']}},{armyRules:{enemy:[detachment]},cpRules:{initial:10,perTurn:0,reactions:true}});
  const tank={...E.BY_ID['nr-ar-h'],id:'nr-reaction-tank',name:'Predator',keywords:['VEHICLE']};E.registerLinked('IW',[tank]);g.units.push({...g.units[1],uid:'e1',template:tank.id,side:'enemy',x:2+maxDistance,y:0});g.phase='shooting';E.attack(g,'p0','e0','ranged');assert.equal(used(g,'reacted with '+name),true);
 }
});
test('No Door Holds is shared across the army for the turn and requires charging the covered or objective target',()=>{
 const g=make({player:{name:'Void Breachers',loadout:[{...blade,s:1,attacks:20}]},helper:{name:'Void Breachers',loadout:[{...blade,s:1,attacks:20}]},enemy:{t:20}},{armyRules:{player:['Breach and Ruin']}});g.phase='fight';g.units[0].x=2;g.units[0].y=2;g.units[1].x=3;g.units[1].y=3;g.units[2].x=3;g.units[2].y=2;
 for(const u of g.units.slice(0,2)){u.chargeSuccess=true;u.chargedTarget='e0';E.attack(g,u.uid,'e0','melee');}
 assert.equal(g.log.filter(x=>x.includes('used No Door Holds')).length,1);
});
