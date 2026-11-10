const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const weapon=(name,mode,count,attacks,traits='')=>({name,sourceProfileId:name,mode,count,attacks,range:mode==='melee'?1:12,s:mode==='melee'?7:20,ap:5,damage:mode==='melee'?2:12,skill:2,traits});
const axe=weapon('Chainaxe','melee',5,4),gun=weapon('Bolt pistol','ranged',5,1);
const chap={id:'nr-iw-test-chap',name:'Infernal Chaplain',source:'linked',faction:'IW',isLeader:true,points:75,models:1,wp:6,ld:6,t:5,save:3,oc:1,move:3,rosterMax:6,special:{fnp:5,regen:1},ranged:gun,melee:axe,loadout:[{...gun,count:1},{...axe,count:1}]};
const cohort={id:'nr-iw-test-cohort',name:'Lost Cohort — Power Armour',source:'linked',sourceId:'cohort',faction:'IW',models:6,bodyguardModels:5,points:225,wp:3,ld:6,t:4,save:3,oc:2,move:3,special:{lost:true,mandatoryChaplain:true,bundledChaplain:true,regen:1,fnp:5},rosterMax:2,
 leader:{id:chap.id,name:chap.name,wp:chap.wp,ld:6,t:chap.t,save:chap.save,oc:chap.oc,points:0,bundled:true,special:chap.special},
 ranged:gun,melee:axe,loadout:[{...gun,count:5},{...axe,count:5},{...gun,count:1,isLeader:true},{...axe,count:1,isLeader:true}]};
const precise={id:'nr-iw-test-precision',name:'Sniper test',source:'linked',faction:'IW',models:1,points:100,wp:3,t:4,save:3,oc:1,move:3,special:{},ranged:weapon('Precision rail','ranged',1,1,'Precision'),melee:axe,
 loadout:[{...weapon('Precision rail','ranged',1,1,'Precision')},{...axe,count:1}]};
const plain={id:'nr-iw-test-target',name:'Target squad',source:'linked',faction:'IW',models:5,points:100,wp:3,ld:8,t:4,save:3,oc:1,move:3,special:{},ranged:gun,melee:axe};
const bannon={...plain,id:'nr-iw-test-bannon',name:'Balan Bannon',models:1,isLeader:true,wp:8,rosterMax:1,points:150};
const krail={...plain,id:'nr-iw-test-krail',name:'Orvath Krail',models:1,isLeader:true,points:100};
const vLeader={...chap,id:'nr-iw-test-varroth',name:'Varroth',points:155};
const vGroup={...plain,id:'nr-iw-test-vgroup',name:'Ashen Chain Terminators',models:6,bodyguardModels:5,points:360,leader:{id:vLeader.id,name:'Varroth',wp:8,ld:6,t:5,save:2,oc:2,special:{fnp:5,regen:1}},loadout:[{...axe,count:5},{...gun,count:5},{...axe,count:1,isLeader:true}]};
const daemon={...plain,id:'nr-iw-test-daemon',name:'Bloodletters',special:{daemon:true},points:125};
E.registerLinked('IW',[cohort,chap,precise,plain,bannon,krail,vLeader,vGroup,daemon]);
const game=(player=[cohort.id],enemy=[plain.id],seed=3)=>E.createGame({player,enemy,seed});

test('bundled Chaplain is a separate model and is not charged twice',()=>{
 const g=game(),u=g.units[0],t=E.template(u);
 assert.equal(t.bodyguardModels,5);assert.equal(t.models,6);assert.equal(t.points,225);
 assert.equal(t.leader.points,0);assert.equal(u.leaderAlive,true);assert.equal(E.status(u).maxHp,21);
});
test('Afflicted Ferocity adds one attack to one bodyguard melee weapon, not Chaplain',()=>{
 const t=E.BY_ID[cohort.id],list=E.attackProfiles(t,'melee',6,true),leader=list.find(x=>x.isLeader),body=list.find(x=>!x.isLeader);
 assert.equal(body.attacks,5);assert.equal(body.activeCount,5);assert.equal(leader.attacks,4);assert.equal(leader.activeCount,1);
 assert.equal(E.attackProfiles(t,'melee',5,false).find(x=>x.isLeader).activeCount,0);
});
test('the original Chaplain keeps the Cohort controlled',()=>{const g=game();E.startTurn(g,'player');assert.equal(g.units[0].control,'controlled');});
test('the Cohort tests 4+ and pursues closest foe after its starting Chaplain is lost',()=>{
 let failed=null,passed=null;
 for(let seed=1;seed<=90;seed++){
  const g=game([cohort.id],[plain.id],seed),u=g.units[0];u.leaderAlive=false;u.models=5;
  E.startTurn(g,'player');if(u.control==='pursuit'&&!failed)failed=g;
  if(u.control==='controlled'&&!passed)passed=g;
 }
 assert.ok(failed);assert.ok(passed);
 const u=failed.units[0];assert.equal(u.moved,true);
 assert.equal(E.canMove(failed,u.uid,u.x+1,u.y),false);
 assert.equal(E.objectiveOwner(failed,{x:u.x,y:u.y}),'player');
});
test('a nearby qualifying Chaplain can supervise a Cohort whose original Chaplain died',()=>{
 const g=game([cohort.id,chap.id],[plain.id]);const u=g.units[0];u.models=5;u.leaderAlive=false;
 E.startTurn(g,'player');assert.equal(u.control,'supervised');assert.ok(g.log.some(x=>x.includes('supervised')));
});
test('Orvath Krail supervises Lost Cohort within 12 inches',()=>{
 const g=game([cohort.id,krail.id],[plain.id]);const u=g.units[0];u.models=5;u.leaderAlive=false;
 E.startTurn(g,'player');assert.equal(u.control,'supervised');
});
test('a Chaplain outside 12 inches does not suppress Control Tests',()=>{
 const g=game([cohort.id,chap.id],[plain.id]);const [u,other]=g.units;u.leaderAlive=false;u.models=5;other.x=8;other.y=7;
 E.startTurn(g,'player');assert.ok(['controlled','pursuit'].includes(u.control));assert.ok(g.log.some(x=>x.includes('Control Test')));
});
test('Precision can remove a Chaplain before all afflicted bodyguards are lost',()=>{
 let success=false;
 for(let seed=1;seed<120;seed++){
  const g=game([precise.id],[cohort.id],seed);g.phase='shooting';g.units[0].x=2;g.units[0].y=2;g.units[1].x=4;g.units[1].y=2;
  const result=E.attack(g,g.units[0].uid,g.units[1].uid,'ranged');
  if(result.ok&&g.units[1].leaderAlive===false){assert.equal(g.units[1].models,5);success=true;break;}
 }
 assert.equal(success,true);
});
test('Precision does not force an early leader casualty without the Precision trait',()=>{
 const g=game([precise.id],[cohort.id],1);g.phase='shooting';g.units[0].x=2;g.units[0].y=2;g.units[1].x=4;g.units[1].y=2;
 E.BY_ID[precise.id].loadout[0].traits='';const r=E.attack(g,g.units[0].uid,g.units[1].uid,'ranged');
 assert.equal(r.ok,true);assert.equal(g.units[1].leaderAlive,true);
 E.BY_ID[precise.id].loadout[0].traits='Precision';
});
test('Bannon triggers Judgment of Fire only once after a successful charge',()=>{
 const g=game([bannon.id],[plain.id]);g.phase='charge';g.units[0].x=1;g.units[0].y=3;g.units[1].x=3;g.units[1].y=3;
 const r=E.charge(g,g.units[0].uid,g.units[1].uid);assert.equal(r.ok,true);assert.equal(r.success,true);
 assert.equal(g.units[0].judgmentUsed,true);assert.ok(g.log.some(x=>x.includes('Judgment of Fire')));
});
test('once-per-battle Battle-shock re-roll is expended by an attached Chaplain',()=>{
 const configured={...plain,id:'cfg-iw-shock-led',baseId:plain.id,models:6,bodyguardModels:5,points:175,ld:13,leader:{...chap}};
 E.registerConfiguration(configured);const g=game([configured.id],[plain.id],1),u=g.units[0];
 const result=E.shockTest(g,u);assert.equal(result.passed,false);assert.equal(u.shockRerollUsed,true);
 E.shockTest(g,u);assert.ok(g.log.filter(x=>x.includes('re-roll')).length===1);
});
test('Khorne daemon ally allotment is at most one-quarter of army points',()=>{
 assert.ok(E.musterProblems([daemon.id,plain.id]).some(x=>x.includes('25%')));
 assert.deepEqual(E.musterProblems([daemon.id,plain.id,plain.id,plain.id,plain.id]),[]);
});
test('directed objective requires an Infernal officer in the friendly force',()=>{
 const no=game([plain.id],[plain.id]);assert.equal(E.declareDirectedObjective(no,'player',no.units[1].uid).ok,false);
 const yes=game([bannon.id,plain.id],[plain.id]);assert.equal(E.declareDirectedObjective(yes,'player',yes.units[2].uid).ok,true);
 assert.equal(yes.directed.player,yes.units[2].uid);
});
test('saved Leader injury, control and Battle-shock states validate strictly',()=>{
 const g=game();g.units[0].leaderInjury=2;g.units[0].control='supervised';assert.strictEqual(E.validateLoadedState(g),g);
 assert.throws(()=>E.validateLoadedState({...g,units:[{...g.units[0],leaderInjury:999},g.units[1]]}),/Leader wounds/);
 assert.throws(()=>E.validateLoadedState({...g,units:[{...g.units[0],control:'evil'},g.units[1]]}),/Lost Cohort state/);
});
