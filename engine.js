/* Gaul Campaign: Renegades — illustrative tabletop-inspired playtest engine.
   No third-party dependencies. Safe to load from file:// or GitHub Pages. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.GaulEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const WIDTH=12, HEIGHT=8, MAX_ROUNDS=5;
const FACTIONS={
  IW:{name:'Infernal Warriors',short:'IW',color:'#c45550',description:'Aggressive Astartes; simulator models 5+ Feel No Pain and start-of-turn serum recovery.'},
  FC:{name:'Frozen Cogs',short:'FC',color:'#85c7df',description:'Disciplined siege specialists. Engine containment and full wargear are not yet modeled.'},
  AD:{name:'Abandoned Dead',short:'AD',color:'#9d8ba8',description:'Covert Astartes and Directorate formations; Ghost-Shroud is simplified.'},
  ST:{name:'Silver Tempests',short:'ST',color:'#a9c4f6',description:'Psychic raiders serving the Frozen Cogs; psychic attacks are simplified.'}
};
const TEMPLATES=[
// id, faction, name, pts, models, wounds/model, toughness, save, move, objective control, ranged [attacks,range,str,ap,dmg,skill], melee [...], notes, specials
 ['iw-bannon','IW','Balan Bannon',150,1,8,5,2,3,4,[5,5,5,1,2,2],[6,1,8,2,3,2],'Chapter Master; illustrative command profile.',{fnp:5,regen:1}],
 ['iw-varroth','IW','Varroth',135,1,7,6,2,3,3,[3,5,5,1,2,3],[7,1,9,2,3,2],'First Captain with Woe-Maker.',{fnp:5,regen:1}],
 ['iw-berserkers','IW','Infernal Berzerkers',190,10,3,5,3,3,2,[1,3,4,0,1,4],[4,1,6,1,2,3],'Full ten-model close-assault squad.',{fnp:5,regen:1}],
 ['iw-ashen','IW','Ashen Chain Terminators',390,10,4,6,2,2,2,[2,5,5,0,1,3],[3,1,8,2,2,3],'Veteran ten-model Terminator squad.',{fnp:5,regen:1}],
 ['iw-lost','IW','Lost Cohort',230,10,4,5,3,3,2,[1,3,4,0,1,4],[5,1,7,1,2,3],'Simplified; Chaplain supervision and berserk checks are not modeled.',{fnp:5,regen:1,lost:true}],
 ['iw-despoilers','IW','Despoiler Cadre',155,10,3,5,3,3,2,[2,4,4,0,1,3],[3,1,5,1,1,3],'War Hounds-style assault infantry.',{fnp:5,regen:1}],
 ['iw-void','IW','Void Breachers',170,10,3,5,3,2,2,[2,4,5,1,1,3],[3,1,5,1,1,3],'Close-range assault and ship-boarding infantry.',{fnp:5,regen:1}],
 ['iw-jump','IW','Assault Jump Cadre',165,10,3,5,3,5,2,[1,3,4,0,1,3],[4,1,5,1,2,3],'High-mobility assault marines.',{fnp:5,regen:1}],
 ['iw-reavers','IW','Chainbound Reavers',95,10,1,3,5,3,1,[2,3,3,0,1,4],[2,1,4,0,1,4],'Mortal auxiliaries; no serum benefits.',{}],
 ['iw-thralls','IW','Bloodmarked Thralls',65,10,1,3,6,3,1,[1,3,3,0,1,4],[2,1,3,0,1,4],'Sacrificial mortal infantry.',{}],
 ['fc-bheulach','FC','Warsmith Bheulach',155,1,8,6,2,2,4,[4,6,8,2,2,2],[5,1,8,2,3,2],'Warsmith and master of the Sacred Forge.',{}],
 ['fc-gudryn','FC','Gudryn',100,1,5,4,3,4,3,[4,6,5,1,2,3],[3,1,5,1,1,3],'Named aviator represented on foot for this prototype.',{}],
 ['fc-iron','FC','Ironbound Siege Squad',185,10,2,5,3,2,2,[2,7,5,1,1,3],[2,1,5,0,1,3],'Methodical infantry fire-support.',{}],
 ['fc-terminators','FC','Forgeguard Terminators',260,5,4,6,2,2,2,[3,6,5,1,1,3],[3,1,8,2,2,3],'Elite forge-trained veterans.',{}],
 ['fc-noise','FC','Acoustic Engineers',175,10,2,4,3,3,2,[3,6,5,1,1,3],[2,1,4,0,1,4],'Disciplined acoustic weapons, simplified.',{}],
 ['fc-siege','FC','Siege Breachers',185,10,2,5,3,2,2,[2,4,6,1,2,3],[2,1,5,1,1,3],'Front-line assault and demolition teams.',{}],
 ['fc-automata','FC','Masterwork Automata',205,3,5,8,3,2,3,[4,7,8,2,2,3],[4,1,8,2,2,3],'Contained mechanical battlefield assets.',{}],
 ['fc-servitors','FC','Forge Servitor Cohort',85,10,1,3,5,2,1,[2,5,4,0,1,4],[1,1,3,0,1,5],'Workshop and defensive auxiliaries.',{}],
 ['ad-vephar','AD','Vephar, Uncrowned Sovereign',150,1,7,5,2,3,4,[4,5,5,1,2,2],[6,1,8,2,2,2],'Chapter Master of the Abandoned Dead.',{shroud:true}],
 ['ad-triarch','AD','Triarch Bodyguard',190,5,3,5,3,3,2,[3,5,5,1,1,3],[3,1,7,1,2,3],'Retinue of the Triarchs.',{shroud:true}],
 ['ad-breach','AD','Blackout Breachers',180,10,2,5,3,3,2,[2,4,5,1,1,3],[3,1,5,1,1,3],'Concealed assault squads.',{shroud:true}],
 ['ad-unmarked','AD','Unmarked Scouts',105,10,2,4,4,4,2,[2,6,4,0,1,3],[2,1,4,0,1,3],'Mobile reconnaissance teams.',{shroud:true}],
 ['ad-directorate','AD','Directorate Breach Cell',95,10,1,3,5,3,2,[3,4,4,0,1,4],[2,1,3,0,1,4],'Liberation Directorate infantry.',{}],
 ['ad-shadow','AD','Shadow Operative Cell',105,5,2,4,4,4,2,[3,6,5,1,1,3],[2,1,4,0,1,3],'Stealth specialists.',{shroud:true}],
 ['ad-nullifier','AD','Nullifier',85,1,4,4,3,3,2,[3,4,4,1,1,3],[3,1,5,1,1,3],'Anti-psyker specialist; nearby psychic attacks weakened.',{nullifier:true}],
 ['ad-armor','AD','Directorate Armoured Section',200,2,7,8,3,3,3,[4,8,8,2,2,3],[2,1,6,0,1,4],'Mechanized reinforcement, abstracted to two models.',{}],
 ['st-high','ST','High Stormseer',155,1,6,4,3,3,3,[4,7,8,2,2,2],[4,1,5,1,2,3],'Senior Storm Council psychic leader.',{psychic:true}],
 ['st-stormseer','ST','Stormseer Cadre',180,3,3,4,4,3,2,[3,6,7,1,2,3],[2,1,5,1,1,3],'Graduated Psychic Mastery hierarchy.',{psychic:true}],
 ['st-reavers','ST','Storm Reavers',170,10,2,4,3,4,2,[2,5,5,1,1,3],[3,1,5,1,1,3],'Pictish raiders with training in psychic warfare.',{psychic:true}],
 ['st-vanguard','ST','Tempest Vanguard',175,10,2,4,3,5,2,[2,4,5,1,1,3],[4,1,5,1,1,3],'Swift seaborne-inspired shock infantry.',{psychic:true}],
 ['st-silverguard','ST','Silverguard Veterans',220,5,3,5,2,3,2,[3,6,5,1,1,3],[4,1,7,2,2,3],'Elite silver-armoured veterans.',{psychic:true}],
 ['st-bolt','ST','Lightning Adepts',180,5,2,4,4,3,2,[4,7,7,2,1,3],[2,1,4,0,1,4],'Battlefield lightning projection, simplified.',{psychic:true}],
 ['st-seaborn','ST','Seaborn Corsairs',125,10,2,4,4,4,2,[2,5,4,0,1,3],[3,1,4,0,1,3],'Fast-moving coastal-raider infantry.',{psychic:true}],
 ['st-seerblade','ST','Seerblade Champions',130,5,3,4,3,4,2,[2,5,6,1,1,3],[4,1,6,1,2,3],'Psychic melee specialists.',{psychic:true}]
].map(([id,faction,name,points,models,wp,t,save,move,oc,range,melee,description,special])=>({
 id,faction,name,points,models,wp,t,save,move,oc,description,special,
 ranged:{attacks:range[0],range:range[1],s:range[2],ap:range[3],damage:range[4],skill:range[5]},
 melee:{attacks:melee[0],range:melee[1],s:melee[2],ap:melee[3],damage:melee[4],skill:melee[5]}
}));
const BY_ID=Object.fromEntries(TEMPLATES.map(x=>[x.id,x]));
// Live catalogue profiles are added at runtime; original playtest units remain as save-compatible fallbacks.
function registerLinked(faction,units){
 if(!FACTIONS[faction]||!Array.isArray(units)||units.length>600)throw Error('Invalid linked catalogue data.');
 for(const t of TEMPLATES)if(t.source==='linked'&&t.faction===faction)t.visible=false;
 let count=0;
 for(const source of units){
  if(!source||source.faction!==faction||typeof source.id!=='string'||!source.id.startsWith('nr-')||typeof source.name!=='string'||!source.name.trim()||source.name.length>180)continue;
  const t={...source,visible:true};
  if(!Number.isInteger(t.points)||t.points<1||t.points>3000||!Number.isInteger(t.models)||t.models<1||t.models>20)continue;
  const existing=BY_ID[t.id];
  if(existing){Object.assign(existing,t);}
  else{TEMPLATES.push(t);BY_ID[t.id]=t;}
  count++;
 }
 return count;
}
// Roster-specific variants are registered as hidden templates. Save files refer
// to their deterministic IDs and include only selections, never arbitrary stats.
function registerConfiguration(configured){
 if(!configured||!configured.id?.startsWith('cfg-')||!configured.baseId||!BY_ID[configured.baseId]||
  configured.faction!==BY_ID[configured.baseId].faction||!Number.isInteger(configured.models)||
  configured.models<1||configured.models>21||!Number.isInteger(configured.points)||configured.points<1||configured.points>3000)
  throw Error('Invalid custom formation.');
 const old=BY_ID[configured.id];
 if(old)Object.assign(old,configured);
 else{TEMPLATES.push(configured);BY_ID[configured.id]=configured;}
 return configured.id;
}
const DEFAULT_PLAYER=['iw-varroth','iw-ashen','iw-berserkers','fc-iron','fc-servitors'];
const DEFAULT_ENEMY=['ad-vephar','ad-triarch','ad-breach','ad-shadow','st-stormseer','st-vanguard'];
const OBJECTIVES=[{x:3,y:2,id:'A'},{x:6,y:4,id:'B'},{x:8,y:5,id:'C'}];
const COVER=new Set(['2,1','2,2','3,1','4,4','5,3','6,3','7,4','8,4','9,5','9,6','10,3']);
const WALLS=new Set(['4,1','7,6']);
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
function random(game){let a=(game.seedState+=0x6D2B79F5)>>>0; a=Math.imul(a^(a>>>15),a|1);a^=a+Math.imul(a^(a>>>7),a|61);return ((a^(a>>>14))>>>0)/4294967296;}
function d6(game){return 1+Math.floor(random(game)*6);}
function d(game,n){return 1+Math.floor(random(game)*n);}
// Source A and D values may be D3, D6, 2D6 or D6+N. Roll per firing model
// and per unsaved hit; retain a fallback only for unknown source expressions.
function rollProfileValue(game,value,fallback,cap=80){
 const expr=String(value??'').replace(/\s+/g,'').toUpperCase();
 if(/^\d+$/.test(expr))return Math.min(cap,Math.max(0,Number(expr)));
 const match=expr.match(/^(\d*)D(3|6)(?:\+(\d+))?$/);
 if(!match)return Math.min(cap,Math.max(0,Number(fallback)||0));
 const dice=Math.min(20,Math.max(1,Number(match[1]||'1')));
 let total=Math.min(cap,Number(match[3]||0));
 for(let i=0;i<dice;i++)total=Math.min(cap,total+d(game,Number(match[2])));
 return total;
}

function key(x,y){return `${x},${y}`;}
function validCell(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<WIDTH&&y<HEIGHT&&!WALLS.has(key(x,y));}
function distance(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}
// Deterministic, conservative wall occlusion on the grid. Corners touching a
// wall block shots; units and cover do not yet block line of sight.
function hasLineOfSight(from,to){
 const dx=to.x-from.x,dy=to.y-from.y,nx=Math.abs(dx),ny=Math.abs(dy);
 const sx=Math.sign(dx),sy=Math.sign(dy);
 let x=from.x,y=from.y,ix=0,iy=0;
 if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(to.x)||!Number.isInteger(to.y))return false;
 while(ix<nx||iy<ny){
  const horizontal=(1+2*ix)*ny,vertical=(1+2*iy)*nx;
  if(horizontal===vertical){
   if(WALLS.has(key(x+sx,y))||WALLS.has(key(x,y+sy)))return false;
   x+=sx;y+=sy;ix++;iy++;
  }else if(horizontal<vertical){x+=sx;ix++;}
  else{y+=sy;iy++;}
  if(WALLS.has(key(x,y)))return false;
 }
 return true;
}
function total(muster){return muster.reduce((n,id)=>n+(BY_ID[id]?.points||0),0);}
// The catalogue declares per-datasheet maximums. These are army-wide even if
// the player selects different squad sizes or creates different gear variants.
// Rules not represented here (detachment costs, allied quotas, roster-wide
// enhancement conditions) must still be validated in New Recruit.
function musterProblems(ids){
 const errors=[],count=new Map(),named=new Set();let lost=0;
 if(!Array.isArray(ids)||!ids.length||ids.length>14)return ['Musters must contain 1–14 units.'];
 const armyTotal=ids.reduce((sum,id)=>sum+(BY_ID[id]?.faction==='IW'?BY_ID[id].points:0),0),daemonTotal=ids.reduce((sum,id)=>sum+(BY_ID[id]?.faction==='IW'&&BY_ID[id]?.special?.daemon?BY_ID[id].points:0),0);
 for(const id of ids){
  const t=BY_ID[id];if(!t){errors.push(`Unrecognized unit: ${id}`);continue;}
  const base=BY_ID[t.baseId]||t;
  const key=base.sourceId||base.id,used=(count.get(key)||0)+1;count.set(key,used);
  if(Number.isInteger(base.rosterMax)&&used>base.rosterMax)errors.push(`${base.name}: New Recruit allows at most ${base.rosterMax} per army.`);
  if(base.faction==='IW'&&base.special?.lost&&++lost>2)errors.push('Lost Cohort: maximum two squads combined, regardless of armour type.');
  const leaders=[];
  if(base.isLeader)leaders.push({id:base.id,name:base.name});
  if(t.leaderId&&t.leader)leaders.push({id:t.leaderId,name:t.leader.name});
  for(const leader of leaders){
   if(/^Infernal (?:Terminator )?Chaplain$/i.test(leader.name))continue;
   if(named.has(leader.id))errors.push(`${leader.name}: a named Leader cannot appear twice in one army (attached or independent).`);
   named.add(leader.id);
  }
 }
 if(daemonTotal>armyTotal*.25+1e-6)errors.push(`Khorne daemon allies exceed the 25% army points limit (${daemonTotal} / ${armyTotal} pts).`);
 return [...new Set(errors)];
}

// Deployment settings use roster indices, since squads with the same datasheet
// may be purchased separately. Missing settings preserve old battles exactly.
function normalizeDeployment(raw,musters){
 const result={player:[],enemy:[]};
 for(const side of ['player','enemy']){
  const entries=raw?.[side]||[];
  if(!Array.isArray(entries)||entries.length>musters[side].length)throw Error('Invalid reserves declaration.');
  result[side]=musters[side].map((id,i)=>{
   const mode=entries[i]||'field';
   if(mode!=='field'&&mode!=='reserve')throw Error('Unsupported deployment mode for unit '+(i+1)+'.');
   return mode;
  });
 }
 return result;
}
// Each grid cell represents approximately 2 inches. Ordinary reserves enter
// from the friendly board edge from round 2 and must be more than 9 inches
// from enemies. Individual missions may impose further restrictions.
function canDeployReserve(g,unit,x,y,{invoker=null}={}){
 if(!unit||unit.models<=0||unit.deployment!=='reserve'||unit.side!==g.active||
    g.finished||g.phase!=='movement'||g.round<2||!validCell(x,y)||
    living(g).some(u=>u.x===x&&u.y===y))return false;
 if(living(g,unit.side==='player'?'enemy':'player').some(u=>distance(u,{x,y})<=4))return false;
 if(invoker)return invoker.side===unit.side&&invoker.models>0&&invoker.deployment==='field'&&
   !invoker.battleshocked&&distance(invoker,{x,y})<=3;
 return unit.side==='player'?x<=1:x>=WIDTH-2;
}
function deployReserve(g,uid,x,y){
 const unit=reserveUnits(g,g.active).find(u=>u.uid===uid);
 if(!canDeployReserve(g,unit,x,y))return {ok:false,message:'Reserve arrivals require round 2+, the friendly board edge, over 9 inches from enemies and an unoccupied square.'};
 unit.x=x;unit.y=y;unit.deployment='field';unit.moved=true;unit.advancing=false;
 writeLog(g,template(unit).name+' arrived from purchased Reserves at '+(x+1)+','+(y+1)+'.');
 return {ok:true,uid,x,y};
}
// Source rule: once per battle PER ARMY, using an already-purchased Bloodletters
// unit in Reserves. The action does not create, duplicate or discount a unit.
function invokeBloodletters(g,thrallsUid,bloodlettersUid,x,y){
 if(g.finished||g.phase!=='movement'||g.round<2)return {ok:false,message:'Invocation needs a legal Movement phase starting in round 2.'};
 if(g.invocationUsed?.[g.active])return {ok:false,message:'This army has already performed Bloodletter Invocation.'};
 const invoker=living(g,g.active).find(u=>u.uid===thrallsUid);
 if(!invoker||template(invoker).name!=='Bloodmarked Thralls'||invoker.battleshocked)
  return {ok:false,message:'Select an unshocked Bloodmarked Thralls unit on the battlefield.'};
 const blood=reserveUnits(g,g.active).find(u=>u.uid===bloodlettersUid);
 if(!blood||template(blood).name!=='Bloodletters'||!template(blood).special?.daemon)
  return {ok:false,message:'A purchased Bloodletters unit must already be in Reserves.'};
 if(!canDeployReserve(g,blood,x,y,{invoker}))
  return {ok:false,message:'Set Bloodletters within 6 inches of Thralls, more than 9 inches from enemies and on an empty square.'};
 g.invocationUsed=g.invocationUsed||{player:false,enemy:false};
 blood.x=x;blood.y=y;blood.deployment='field';blood.moved=true;
 g.invocationUsed[g.active]=true;
 writeLog(g,'Bloodletter Invocation placed purchased Bloodletters from Reserves (once per army).');
 return {ok:true,uid:blood.uid,x,y};
}
function createGame(options={}){
 const pm=Array.isArray(options.player)?options.player:DEFAULT_PLAYER, em=Array.isArray(options.enemy)?options.enemy:DEFAULT_ENEMY;
 const invalid=[...musterProblems(pm),...musterProblems(em)];
 if(invalid.length)throw Error('Illegal muster: '+invalid[0]);
 const planned=normalizeDeployment(options.deployment,{player:pm,enemy:em});
 const seed=Number.isFinite(+options.seed)?(+options.seed>>>0):7126;
 const game={version:2,seed,seedState:seed||1,round:1,phase:'movement',active:'player',finished:false,winner:null,score:{player:0,enemy:0},units:[],log:[],objectives:OBJECTIVES.map(o=>({...o})),directed:{player:null,enemy:null},directedUsed:{player:false,enemy:false},invocationUsed:{player:false,enemy:false},settings:{player:[...pm],enemy:[...em],deployment:planned}};
 const used=new Set();
 function place(list,side){
  list.forEach((id,i)=>{
   const mode=planned[side][i];
   let pos=null;
   if(mode==='field'){
    const cols=side==='player'?[0,1,2]:[11,10,9];
    const orderedRows=[3,5,1,6,2,4,0,7];
    outer: for(const c of cols)for(const row of orderedRows){if(!used.has(key(c,row))&&validCell(c,row)){pos={x:c,y:row};break outer;}}
    if(!pos)throw Error('No deployment space remains.');
    used.add(key(pos.x,pos.y));
   }
   const t=BY_ID[id];game.units.push({uid:side[0]+i,template:id,side,
    x:pos?.x??-1,y:pos?.y??-1,deployment:mode,models:t.models,injury:0,
    leaderAlive:!!t.leader,leaderInjury:0,control:'controlled',
    battleshocked:false,moved:false,shot:false,charged:false,fought:false});
  });
 }
 place(pm,'player');place(em,'enemy');
 startTurn(game,'player');
 writeLog(game,'Battle started. '+pm.length+' friendly and '+em.length+' opposing purchased units. Seed '+seed+'.');
 return game;
}
function template(u){return BY_ID[u.template];}
function living(game,side){return game.units.filter(u=>u.models>0&&(u.deployment===undefined||u.deployment==='field')&&(!side||u.side===side));}
function activeForces(game,side){return game.units.filter(u=>u.models>0&&(!side||u.side===side));}
function reserveUnits(game,side){return game.units.filter(u=>u.models>0&&u.deployment==='reserve'&&(!side||u.side===side));}
function status(u){const t=template(u);
 const maxHp=t.leader&&t.bodyguardModels?t.bodyguardModels*t.wp+t.leader.wp:t.models*t.wp;
 const leaderUp=!!t.leader&&(u.leaderAlive!==false);
 const remainingBodyguards=u.models-(leaderUp?1:0);
 const hp=Math.max(0,remainingBodyguards*t.wp-(remainingBodyguards?u.injury:0))+(leaderUp?Math.max(0,t.leader.wp-(u.leaderInjury||0)):0);
 return {models:u.models,hp,maxHp,points:t.points};
}
function writeLog(g,text){g.log.unshift(`R${g.round} · ${text}`);if(g.log.length>250)g.log.length=250;}
function startTurn(g,side){
 g.active=side;g.phase='movement';
 g.directed=g.directed||{player:null,enemy:null};g.directed[side]=null;
 g.directedUsed=g.directedUsed||{player:false,enemy:false};g.directedUsed[side]=false;
 g.bannonUsed=g.bannonUsed||{player:{hit:false,wound:false},enemy:{hit:false,wound:false}};g.bannonUsed[side]={hit:false,wound:false};
 for(const u of living(g,side)){
  u.moved=false;u.shot=false;u.charged=false;u.chargeSuccess=false;u.fought=false;u.battleshocked=false;u.advancing=false;u.advanceRoll=0;
  // Warp-Aggravated Pain: at each Command phase ordinary IW Astartes within
  // 12 inches (six 2-inch cells) of an enemy PSYKER/DAEMON roll D6; on 1–2
  // they suffer -1 ranged Hit until their next Command phase. Lost Cohort and
  // mortal/daemon allies do not use this ordinary test.
  u.painPenalty=0;
  const t=template(u),ordinary=t.faction==='IW'&&t.special.fnp&&!t.special.lost&&t.special.painSensitive!==false;
  if(ordinary&&living(g,side==='player'?'enemy':'player').some(enemy=>{
   const x=template(enemy);return (x.special.psychic||x.special.daemon)&&distance(u,enemy)<=6;
  })&&d6(g)<=2){
   u.painPenalty=1;writeLog(g,`${t.name} failed its Warp-Aggravated Pain test: -1 ranged Hit until next Command phase.`);
  }
  if(template(u).special.regen && u.injury>0){u.injury=Math.max(0,u.injury-template(u).special.regen);}
  if(t.leader&&u.leaderAlive!==false&&t.leader.special?.regen&&u.leaderInjury>0)u.leaderInjury=Math.max(0,u.leaderInjury-t.leader.special.regen);
  lostCohortControl(g,u);
 }
}
function isChaplainAlive(u){
 const t=template(u);
 const name=t?.leader? t.leader.name: t?.name;
 return u.models>0 && (!t?.leader||u.leaderAlive!==false) &&
  /(?:Chaplain|Orvath Krail)/i.test(name||'');
}
function supervisingChaplain(g,u){
 return living(g,u.side).find(other=>other.uid!==u.uid&&isChaplainAlive(other)&&distance(other,u)<=6);
}
function nearestEnemy(g,u){
 return living(g,u.side==='player'?'enemy':'player').slice().sort((a,b)=>distance(u,a)-distance(u,b)||a.uid.localeCompare(b.uid))[0]||null;
}
// An uncontrolled Lost Cohort must seek the closest enemy rather than freely
// choosing movement/targets. Objective Control is retained.
function pursue(g,u){
 const enemy=nearestEnemy(g,u);if(!enemy)return;
 const current=distance(u,enemy),range=template(u).move;
 let best={x:u.x,y:u.y,dist:current,steps:0};
 for(let x=0;x<WIDTH;x++)for(let y=0;y<HEIGHT;y++){
  const steps=pathDistance(g,u,x,y),dist=distance({x,y},enemy);
  if(steps<=range&&(dist<best.dist||(dist===best.dist&&steps<best.steps))){best={x,y,dist,steps};}
 }
 if(best.dist<current){u.x=best.x;u.y=best.y;u.moved=true;writeLog(g,`${template(u).name} pursued nearest foe (${enemy.uid}) to ${best.x+1},${best.y+1}.`);}
}
function lostCohortControl(g,u){
 const t=template(u);if(!t.special?.lost||!t.special?.mandatoryChaplain)return;
 if(t.leader&&u.leaderAlive!==false){u.control='controlled';return;}
 const supervisor=supervisingChaplain(g,u);
 if(supervisor){u.control='supervised';writeLog(g,`${t.name} supervised by ${template(supervisor).name} within 12 inches.`);return;}
 const roll=d6(g);u.control=roll>=4?'controlled':'pursuit';
 writeLog(g,`${t.name} lost supervision: Control Test ${roll} — ${u.control==='pursuit'?'Aggressive Pursuit':'controlled'}.`);
 if(u.control==='pursuit')pursue(g,u);
}
function declareDirectedObjective(g,side,targetId){
 if(g.finished||g.phase!=='movement'||g.active!==side)return {ok:false,message:'Declare a target during your Command/Movement phase.'};
 const target=living(g,side==='player'?'enemy':'player').find(u=>u.uid===targetId);
 const controllers=living(g,side).filter(u=>template(u).faction==='IW'&&(/Balan Bannon|Varroth|Captain|Warsmith|Officer|Chaplain/i.test(template(u).name)||template(u).special?.officer));
 if(!target||!controllers.length)return {ok:false,message:'A visible target and a friendly Infernal Warriors officer are required.'};
 g.directed=g.directed||{player:null,enemy:null};g.directed[side]=target.uid;
 g.directedUsed=g.directedUsed||{player:false,enemy:false};g.directedUsed[side]=false;
 writeLog(g,`Directed Objective designated: ${template(target).name}.`);return {ok:true,targetId};
}
function isIWMarine(t){return t?.faction==='IW'&&!!t.special?.fnp&&!t.special?.daemon&&!/thrall|reaver|servitor/i.test(t.name);}
function hasAbility(t,name){return (t.abilities||[]).some(a=>a.name===name);}
function once(g,u,name,scope='turn'){
 const bag=u.abilityUses||(u.abilityUses={});
 const mark=scope==='battle'?'battle':scope==='phase'?`${g.round}-${g.active}-${g.phase}`:`${g.round}-${g.active}`;
 if(bag[name]===mark)return false;
 bag[name]=mark;return true;
}
function hasActiveLeaderAbility(u,name){
 return u.leaderAlive!==false && hasAbility(template(u).leader||{},name);
}
function isVehicle(t){return /vehicle|dreadnought|tank|transport|siege armour|artillery|daemon engine|gunship|speeder|aircraft/i.test((t.category||'')+' '+t.name);}
function isAircraft(t){return /aircraft|gunship|interceptor|stormbird|thunderhawk|stormraven/i.test((t.category||'')+' '+t.name);}
const HIT_ABILITIES=[
 ['Ashen Chain',(g,a,b,m)=>EQUAL(m,'ranged','melee')&&distance(a,b)<=4,'phase'],
 ['Disciplined Line',(g,a,b,m)=>m==='ranged'&&g.directed?.[a.side]===b.uid,'turn'],
 ['Veterans of Two Judgments',(g,a,b,m)=>m==='melee','phase'],
 ['Proven Blades',(g,a,b,m)=>m==='melee','phase'],
 ['Engine of Ruin',(g,a,b,m)=>m==='melee','phase'],
 ['Entrenched',(g,a,b,m)=>m==='ranged'&&!a.moved,'turn'],
 ['Mobile Fire',(g,a,b,m)=>m==='ranged'&&a.moved,'turn'],
 ['Mobile Spear',(g,a,b,m)=>!!a.chargeSuccess,'turn'],
 ['Strafing Pass',(g,a,b,m)=>m==='ranged'&&/infantry|scout|marine|warrior|berzerker|thrall/i.test(template(b).category||template(b).name),'turn'],
 ['Air-Defence Tracking',(g,a,b,m)=>m==='ranged'&&isAircraft(template(b)),'turn'],
 ['Interceptor',(g,a,b,m)=>m==='ranged'&&isAircraft(template(b)),'turn'],
 ['Patient Recon',(g,a,b,m)=>m==='ranged'&&/scout/i.test(template(b).name+' '+(template(b).category||'')),'turn']
];
const WOUND_ABILITIES=[
 ['Controlled Fury',(g,a,b,m)=>m==='melee'&&!!a.chargeSuccess,'phase'],
 ['Butcher’s Precision',(g,a,b,m)=>m==='melee'&&/elite|terminator|veteran|chosen/i.test(template(b).name+' '+(template(b).category||'')),'phase'],
 ['Demolition Arc',(g,a,b,m)=>m==='ranged'&&g.objectives.some(o=>distance(b,o)<=1),'turn'],
 ['Armour Hunter',(g,a,b,m)=>isVehicle(template(b)),'turn'],
 ['Siege Machine',(g,a,b,m)=>isVehicle(template(b))||/fortification/i.test(template(b).name),'turn'],
 ['Heavy Legion Battery',(g,a,b,m)=>isVehicle(template(b)),'phase'],
 ['Titan Breaker',(g,a,b,m)=>/titanic|super-heavy/i.test(template(b).category+' '+template(b).name),'turn'],
 ['Iron Predator',(g,a,b,m)=>!!a.chargeSuccess&&isVehicle(template(b)),'turn'],
 ['Sustained Fire',(g,a,b,m,w)=>m==='ranged'&&!a.moved&&/heavy|autocannon|lascannon|missile|plasma cannon/i.test(w.name),'turn'],
 ['Bound Targeter',(g,a,b,m)=>m==='ranged','battle']
];
function EQUAL(value,...allowed){return allowed.includes(value);}
function tryAbilityReroll(g,a,b,mode,weapon,kind){
 const t=template(a),candidates=kind==='hit'?HIT_ABILITIES:WOUND_ABILITIES;
 for(const [name,eligible,scope] of candidates){
  if(hasAbility(t,name)&&eligible(g,a,b,mode,weapon)&&once(g,a,`${kind}:${name}`,scope)){
   writeLog(g,`${t.name}: ${name} re-rolled one ${kind} die.`);return true;
  }
 }
 return false;
}
function trySavingReroll(g,u,weapon,mode){
 const t=template(u);
 if(hasAbility(t,'Leviathan of Old')&&once(g,u,'save:Leviathan of Old','battle'))return true;
 if(hasAbility(t,'Breacher Shield')&&mode==='ranged'&&g.objectives.some(o=>distance(u,o)<=1)&&once(g,u,'save:Breacher Shield','phase'))return true;
 return false;
}
function shockTest(g,u){
 const t=template(u),target=Number.isFinite(t.ld)?t.ld:7;
 let roll=d6(g)+d6(g);
 const leaderName=t.leader&&u.leaderAlive!==false?t.leader.name:t.name;
 if(roll<target&&((/(Infernal Chaplain|Orvath Krail)/.test(leaderName)&&!u.shockRerollUsed)||hasAbility(t,'Expeditionary Discipline')&&once(g,u,'shock:Expeditionary Discipline','battle'))){
  u.shockRerollUsed=true;writeLog(g,`${leaderName} used its once-per-battle Battle-shock re-roll.`);roll=d6(g)+d6(g);
 }
 u.battleshocked=roll<target;
 writeLog(g,`${t.name} Battle-shock ${roll} vs ${target}+ — ${u.battleshocked?'FAILED (0 OC until Command phase)':'passed'}.`);
 return {roll,passed:!u.battleshocked};
}
function bearerAlive(g,side,name){
 return living(g,side).filter(u=>template(u).name===name||template(u).leader?.name===name&&u.leaderAlive!==false);
}
function directedRerolls(g,attacker,target,mode){
 if(mode!=='melee'||g.directed?.[attacker.side]!==target.uid||g.directedUsed?.[attacker.side]||!isIWMarine(template(attacker)))return false;
 const helpers=living(g,attacker.side).filter(u=>u.uid!==attacker.uid&&isIWMarine(template(u))&&distance(u,target)<=5);
 if(!helpers.length)return false;
 g.directedUsed[attacker.side]=true;
 return true;
}
function bannonRerolls(g,attacker,target){
 if(g.directed?.[attacker.side]!==target.uid||!isIWMarine(template(attacker)))return false;
 return bearerAlive(g,attacker.side,'Balan Bannon').some(u=>distance(u,attacker)<=5);
}
function occupants(g,x,y){return living(g).find(u=>u.x===x&&u.y===y);}
function walkable(g,x,y,ignoreUid){return validCell(x,y)&&!living(g).some(u=>u.uid!==ignoreUid&&u.x===x&&u.y===y);}
function pathDistance(g,u,x,y){
 if(!validCell(x,y))return Infinity;if(u.x===x&&u.y===y)return 0;
 if(!walkable(g,x,y,u.uid))return Infinity;
 const q=[{x:u.x,y:u.y,n:0}],seen=new Set([key(u.x,u.y)]);
 for(let i=0;i<q.length;i++){
  const p=q[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=p.x+dx,ny=p.y+dy,k=key(nx,ny);
   if(seen.has(k)||!walkable(g,nx,ny,u.uid))continue;
   if(nx===x&&ny===y)return p.n+1;
   seen.add(k);q.push({x:nx,y:ny,n:p.n+1});
  }
 }
 return Infinity;
}
// Advance is an explicit action. One D6 is rolled before moving and cached,
// so selecting several destination tiles cannot fish for a better result.
function beginAdvance(g,uid){
 const u=living(g,g.active).find(x=>x.uid===uid);
 if(!u||u.moved||u.advancing||u.control==='pursuit'||g.phase!=='movement')return {ok:false,message:'Advance unavailable for that unit in this phase.'};
 const t=template(u);let roll=d6(g);
 if((hasAbility(t,'Legion Rush')||hasAbility(t,'Relic Mobility'))&&roll<=2){
  roll=d6(g);writeLog(g,`${t.name} re-rolled its Advance die.`);
 }
 if(hasAbility(t,'Pursuit Column')||hasAbility(t,'Fast Spearhead'))roll++;
 u.advancing=true;u.advanceRoll=roll;
 writeLog(g,`${t.name} Advanced: extra ${roll} inches (${Math.ceil(roll/2)} grid cells).`);
 return {ok:true,roll,extra:Math.ceil(roll/2)};
}
function canMove(g,uid,x,y){const u=living(g).find(x=>x.uid===uid);return !!u&&u.control!=='pursuit'&&u.side===g.active&&g.phase==='movement'&&!u.moved&&pathDistance(g,u,x,y)<=template(u).move+(u.advancing?Math.ceil((u.advanceRoll||0)/2):0)&&!(u.x===x&&u.y===y);}
function move(g,uid,x,y){if(!canMove(g,uid,x,y))return {ok:false,message:'Illegal move: check movement phase, range and occupied terrain.'};
 const u=g.units.find(u=>u.uid===uid);u.x=x;u.y=y;u.moved=true;writeLog(g,`${template(u).name} moved to ${x+1},${y+1}.`);return {ok:true};}
function woundTarget(s,t){if(s>=t*2)return 2;if(s>t)return 3;if(s===t)return 4;if(s*2<=t)return 6;return 5;}
function nullifierNear(g,defender){return living(g,defender.side).some(u=>template(u).special.nullifier&&distance(u,defender)<=2);}
// Implement a conservative subset of named weapon traits. [test] annotations
// in New Recruit remain playtest rules and are not a Verified combat mapping.
function weaponTraits(w){
 const raw=String(w?.traits||'').toLowerCase();
 const flag=t=>new RegExp('(?:^|[\\s,;])'+t+'(?:[\\s,;\\[]|$)','i').test(raw);
 const n=key=>Number(raw.match(new RegExp('\\b'+key+'\\s+(\\d+)','i'))?.[1]||0);
 return {torrent:flag('torrent'),pistol:flag('pistol'),heavy:flag('heavy'),twinLinked:/twin-linked/.test(raw),
  ignoresCover:/ignores cover/.test(raw),lethalHits:/lethal hits/.test(raw),
  devastatingWounds:/devastating wounds/.test(raw),precision:flag('precision'),rapidFire:n('rapid fire'),melta:n('melta'),
  sustainedHits:n('sustained hits'),blast:flag('blast')};
}
// Linked New Recruit defaults can include mixed weapons (e.g. four bolters
// and a plasma pistol). Resolve those profiles separately instead of giving
// every model the strongest representative gun. Equipment choices and special
// weapon traits are still playtest approximations until fully mapped.
function attackProfiles(t,mode,remainingModels,leaderAlive=true){
 if(t.source==='linked'&&Array.isArray(t.loadout)&&t.loadout.length){
  const found=t.loadout.filter(w=>w.mode===mode&&Number.isFinite(w.attacks)&&w.attacks>0&&w.count>0);
  return found.map((w,i)=>({...w,attacks:w.attacks+(t.special?.lost&&mode==='melee'&&!w.isLeader&&i===found.findIndex(v=>!v.isLeader)?1:0),activeCount:t.leader&&t.bodyguardModels
   ?(w.isLeader?(leaderAlive?1:0):Math.min(Math.max(0,remainingModels-(leaderAlive?1:0)),Math.max(0,Math.round(w.count*Math.max(0,remainingModels-(leaderAlive?1:0))/t.bodyguardModels))))
   :Math.min(remainingModels,Math.max(0,Math.round(w.count*remainingModels/t.models)))}));
 }
 const w=t[mode];return w?.attacks>0?[{...w,name:mode,count:t.models,activeCount:remainingModels}]:[];
}
function attack(g,attackerId,targetId,mode){
 const a=living(g).find(u=>u.uid===attackerId),b=living(g).find(u=>u.uid===targetId);
 if(!a||!b||a.side===b.side||a.side!==g.active)return {ok:false,message:'Select a living allied attacker and an enemy target.'};
 if(g.phase!==(mode==='ranged'?'shooting':'fight'))return {ok:false,message:'Wrong combat phase.'};
 if(mode==='ranged'&&a.shot||mode==='melee'&&a.fought)return {ok:false,message:'That unit has already attacked this phase.'};
  if(mode==='ranged'&&!hasLineOfSight(a,b))return {ok:false,message:'A wall blocks line of sight to that target.'};
 const at=template(a),bt=template(b),dist=distance(a,b);
 if(a.control==='pursuit'&&nearestEnemy(g,a)?.uid!==targetId)return {ok:false,message:'Aggressive Pursuit: the Lost Cohort must target its nearest enemy.'};
 const engaged=living(g,a.side==='player'?'enemy':'player').some(u=>distance(a,u)<=1);
 const weapons=attackProfiles(at,mode,a.models,a.leaderAlive!==false).filter(w=>w.range>=dist&&w.activeCount>0&&
  (!a.advancing||mode!=='ranged'||/\bassault\b/i.test(w.traits||''))&&
  (mode!=='ranged'||!engaged||(dist<=1&&weaponTraits(w).pistol)));
 if(!weapons.length)return {ok:false,message:`No equipped ${mode==='ranged'?'ranged':'melee'} weapon can attack at this range.`};
 if(mode==='ranged'&&dist<=1&&!weapons.length)return {ok:false,message:'Only Pistol weapons can fire while engaged.'};
 if(mode==='ranged')a.shot=true;else a.fought=true;
 let hits=0,wounds=0,unsaved=0,casualties=0,effective=0,attacks=0;
 g.bannonUsed=g.bannonUsed||{};g.bannonUsed[a.side]=g.bannonUsed[a.side]||{hit:false,wound:false};
 const directed=directedRerolls(g,a,b,mode),bannon=bannonRerolls(g,a,b);
 const rerolls={hit:false,wound:false};
 for(const weapon of weapons){
  const tr=weaponTraits(weapon);
  const bonus=mode==='ranged'&&dist<=weapon.range/2;
  let base=0;
  for(let m=0;m<weapon.activeCount;m++)base=Math.min(80,base+rollProfileValue(g,weapon.attackValue,weapon.attacks));
  const blast=mode==='ranged'&&tr.blast?Math.floor(b.models/5)*weapon.activeCount:0;
  const attempts=Math.min(80-attacks,base+(bonus?tr.rapidFire*weapon.activeCount:0)+blast);
  if(attempts<=0)break;attacks+=attempts;
  const hitRoll=clamp(weapon.skill+((mode==='ranged'&&bt.special.shroud&&dist>=4)?1:0)+
   ((mode==='ranged'&&at.special.psychic&&nullifierNear(g,b))?1:0)+
   (mode==='ranged'?(a.painPenalty||0):0)-
   (mode==='ranged'&&tr.heavy&&!a.moved?1:0),2,6);
  // Lethal Hits and Sustained Hits are checked on an unmodified hit roll of 6.
  // Each successful hit is then resolved against the current surviving model.
  for(let i=0;i<attempts&&b.models>0;i++){
   let roll=tr.torrent?6:d6(g);
   let hitRerolled=false;
   if(!tr.torrent&&roll<hitRoll&&(
     directed&&!rerolls.hit || bannon&&!g.bannonUsed?.[a.side]?.hit)){
    if(directed&&!rerolls.hit)rerolls.hit=true;
    else{g.bannonUsed[a.side].hit=true;}
    roll=d6(g);hitRerolled=true;
   }
   if(!hitRerolled&&!tr.torrent&&roll<hitRoll&&tryAbilityReroll(g,a,b,mode,weapon,'hit'))roll=d6(g);
   const critical=tr.torrent?false:roll===6;
   if(!tr.torrent&&roll<hitRoll)continue;
   const repeat=critical?1+tr.sustainedHits:1;
   for(let extra=0;extra<repeat&&b.models>0;extra++){
    hits++;
    const leaderUp=!!bt.leader&&b.leaderAlive!==false;
    const bodyguards=b.models-(leaderUp?1:0);
    const targetLeader=leaderUp&&(tr.precision||bodyguards===0);
    const defenderProfile=targetLeader?bt.leader:bt;
    const autoWound=critical&&extra===0&&tr.lethalHits;
    let wr=autoWound?6:d6(g);
    let woundRerolled=false;
    if(!autoWound&&wr<woundTarget(weapon.s,defenderProfile.t)&&tr.twinLinked){wr=d6(g);woundRerolled=true;}
    if(!autoWound&&!woundRerolled&&wr<woundTarget(weapon.s,defenderProfile.t)&&(
      directed&&!rerolls.wound || bannon&&!g.bannonUsed?.[a.side]?.wound)){
     if(directed&&!rerolls.wound)rerolls.wound=true;
     else{g.bannonUsed[a.side].wound=true;}
     wr=d6(g);woundRerolled=true;
    }
    if(!autoWound&&!woundRerolled&&wr<woundTarget(weapon.s,defenderProfile.t)&&tryAbilityReroll(g,a,b,mode,weapon,'wound'))wr=d6(g);
    if(!autoWound&&wr<woundTarget(weapon.s,defenderProfile.t))continue;
    wounds++;
    const bypass=tr.devastatingWounds&&!autoWound&&wr===6;
    if(!bypass){
     const coverBonus=mode==='ranged'&&!tr.ignoresCover&&COVER.has(key(b.x,b.y))?1:0;
     const save=clamp(defenderProfile.save+weapon.ap-coverBonus,2,7);
     if(save<=6){let saving=d6(g);if(saving<save&&trySavingReroll(g,b,weapon,mode))saving=d6(g);if(saving>=save)continue;}
    }
    unsaved++;
    const wp=targetLeader?bt.leader.wp:bt.wp;
    const special=targetLeader?bt.leader.special||{}:bt.special;
    // FNP is rolled for *every* point of unsaved damage, not just those
    // needed to kill the current model. Excess damage does not spill over.
    let rawDamage=rollProfileValue(g,weapon.damageValue,weapon.damage,30)+(mode==='ranged'&&bonus?tr.melta:0);
    if(hasAbility(bt,'Armoured Flight'))rawDamage=Math.max(1,rawDamage-1);
    if(rawDamage===2&&hasAbility(bt,'Relic Plate')&&once(g,b,'damage:Relic Plate','battle'))rawDamage=1;
    let damage=0;
    for(let p=0;p<rawDamage;p++)if(!(special.fnp&&d6(g)>=special.fnp))damage++;
    const prior=targetLeader?(b.leaderInjury||0):b.injury;
    const applied=Math.min(damage,wp-prior);effective+=applied;
    if(targetLeader){
     b.leaderInjury=prior+applied;
     if(b.leaderInjury>=wp){
      const veteran=bt.leader.name==='Varroth'&&!b.veteranSaveUsed;
      if(veteran){b.veteranSaveUsed=true;if(d6(g)>=5){b.leaderInjury=wp-1;writeLog(g,'Varroth survived a fatal blow (Veteran of Diesor II).');continue;}}
      b.leaderAlive=false;b.leaderInjury=0;b.models--;casualties++;
      if(bt.special?.lost)writeLog(g,`${bt.name}: original Chaplain lost; Cohort will take Control Tests.`);
     }
    }else{
     b.injury=prior+applied;
     if(b.injury>=wp){
      const veteran=bt.name==='Varroth'&&!b.veteranSaveUsed;
      if(veteran){b.veteranSaveUsed=true;if(d6(g)>=5){b.injury=wp-1;writeLog(g,'Varroth survived a fatal blow (Veteran of Diesor II).');continue;}}
      b.models--;b.injury=0;casualties++;
     }
    }
   }
  }
 }
 writeLog(g,`${at.name} ${mode==='ranged'?'fired on':'struck'} ${bt.name}: ${hits}/${attacks} hits, ${wounds} wounds, ${effective} damage, ${casualties} models removed${b.models===0?' — DESTROYED':''}.`);
 return {ok:true,attacks,hits,wounds,unsaved,damage:effective,casualties,eliminated:b.models===0};
}

function canCharge(g,aid,bid){
 const a=living(g).find(u=>u.uid===aid),b=living(g).find(u=>u.uid===bid);
 if(!a||!b||a.side!==g.active||a.side===b.side||g.phase!=='charge'||a.charged||a.advancing)return false;
 if(a.control==='pursuit'&&nearestEnemy(g,a)?.uid!==bid)return false;
 return distance(a,b)>=2 && distance(a,b)<=7;
}
function charge(g,aid,bid){
 if(!canCharge(g,aid,bid))return {ok:false,message:'Charge unavailable. Select a target 2–7 squares away.'};
 const a=g.units.find(u=>u.uid===aid),b=g.units.find(u=>u.uid===bid);a.charged=true;
 let first=d6(g),second=d6(g),roll=first+second;
 const adj=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:b.x+dx,y:b.y+dy})).filter(p=>walkable(g,p.x,p.y,a.uid)).map(p=>({...p,steps:pathDistance(g,a,p.x,p.y)})).sort((a,b)=>a.steps-b.steps);
 if(adj.length&&adj[0].steps>roll){
  const t=template(a),target=template(b);
  const chargeRule=[
   ['Blood-Bound Hunt',true],['Blood God’s Assault',true],
   ['Blood-Earned Discipline',g.objectives.some(o=>distance(b,o)<=1)],
   ['Greater Daemon',true]
  ].find(([n,eligible])=>eligible&&hasAbility(t,n));
  if(chargeRule&&once(g,a,'charge:'+chargeRule[0],chargeRule[0]==='Blood-Earned Discipline'?'turn':'battle')){
   if(chargeRule[0]==='Greater Daemon'){first=d6(g);second=d6(g);}else if(first<=second)first=d6(g);else second=d6(g);
   roll=first+second;writeLog(g,`${t.name}: ${chargeRule[0]} re-rolled ${chargeRule[0]==='Greater Daemon'?'both charge dice':'one charge die'}.`);
  }
 }
 if(!adj.length||adj[0].steps>roll){writeLog(g,`${template(a).name} failed charge against ${template(b).name} (${roll}).`);return {ok:true,success:false,roll};}
 a.x=adj[0].x;a.y=adj[0].y;a.chargeSuccess=true;writeLog(g,`${template(a).name} charged ${template(b).name} (${roll}).`);
 const t=template(a);
 if((t.name==='Balan Bannon'||t.leader?.name==='Balan Bannon'&&a.leaderAlive!==false)&&!a.judgmentUsed){
  a.judgmentUsed=true;shockTest(g,b);
  writeLog(g,'Judgment of Fire activated once this battle.');
 }
 return {ok:true,success:true,roll};
}
function objectiveOwner(g,o){
 const tally={player:0,enemy:0};
 for(const u of living(g))if(distance(u,o)<=1){const t=template(u);
  tally[u.side]+=u.battleshocked?0:t.leader?Math.max(0,u.models-(u.leaderAlive!==false?1:0))*t.oc+(u.leaderAlive!==false?t.leader.oc:0):u.models*t.oc;
 }
 if(tally.player===tally.enemy)return null;return tally.player>tally.enemy?'player':'enemy';
}
function scoreTurn(g,side){
 if(g.round<2)return;
 let awarded=0;
 for(const o of g.objectives)if(objectiveOwner(g,o)===side)awarded+=5;
 g.score[side]+=awarded;
 if(awarded)writeLog(g,`${side==='player'?'Friendly':'Opposing'} force scored ${awarded} VP from objectives.`);
}
function checkFinished(g){
 const p=activeForces(g,'player').length,e=activeForces(g,'enemy').length;
 if(!p||!e||g.round>MAX_ROUNDS){
  g.finished=true;g.phase='finished';
  if(!p&&e)g.winner='enemy';else if(!e&&p)g.winner='player';else if(g.score.player>g.score.enemy)g.winner='player';else if(g.score.enemy>g.score.player)g.winner='enemy';else g.winner='draw';
  writeLog(g,`Battle finished: ${g.winner==='draw'?'draw':g.winner+' victory'} (${g.score.player}–${g.score.enemy} VP).`);
  return true;
 }return false;
}
function aiTurn(g,side,options={}){
 if(g.finished)return;
 const resume=!!options.resume;
 const phases=['movement','shooting','charge','fight'];
 const begin=resume?phases.indexOf(g.phase):0;
 if(!resume)startTurn(g,side);
 if(begin<=0&&!g.directed?.[side]){
  const officer=living(g,side).find(u=>/Balan Bannon|Varroth|Captain|Chaplain/i.test(template(u).name)||/Balan Bannon|Varroth|Chaplain/i.test(template(u).leader?.name||''));
  if(officer){const enemies=living(g,side==='player'?'enemy':'player').sort((a,b)=>distance(officer,a)-distance(officer,b));
   if(enemies.length)declareDirectedObjective(g,side,enemies[0].uid);}
 }
 if(begin<=0){
  // Movement: seek objectives and nearby threats while respecting obstacles.
  for(const a of living(g,side)){
   if(a.moved)continue;
   if(a.control==='pursuit'){pursue(g,a);continue;}
   let best=null,bestScore=-Infinity;
   const foes=living(g,side==='player'?'enemy':'player');if(!foes.length)break;
   const old={x:a.x,y:a.y};
   for(let x=0;x<WIDTH;x++)for(let y=0;y<HEIGHT;y++){
    const steps=pathDistance(g,a,x,y);if(steps>template(a).move)continue;
    const objectiveDist=Math.min(...g.objectives.map(o=>distance({x,y},o)));
    const enemyDist=Math.min(...foes.map(o=>distance({x,y},o)));
    const score=-objectiveDist*3 -enemyDist*.55 +(steps>0?.12:0)+(COVER.has(key(x,y))?.25:0)+random(g)*.12;
    if(score>bestScore){bestScore=score;best={x,y};}
   }
   if(best&&(best.x!==old.x||best.y!==old.y)){a.x=best.x;a.y=best.y;a.moved=true;}
  }
 }
 if(begin<=1){
  g.phase='shooting';
  for(const a of [...living(g,side)]){
   if(a.shot)continue;
   const targets=living(g,side==='player'?'enemy':'player').filter(b=>(a.control!=='pursuit'||nearestEnemy(g,a)?.uid===b.uid)&&distance(a,b)<=template(a).ranged.range&&distance(a,b)>1&&hasLineOfSight(a,b)).sort((x,y)=>distance(a,x)-distance(a,y));
   if(targets.length)attack(g,a.uid,targets[0].uid,'ranged');
  }
 }
 if(begin<=2){
  g.phase='charge';
  for(const a of [...living(g,side)]){
   const targets=living(g,side==='player'?'enemy':'player').filter(b=>canCharge(g,a.uid,b.uid)).sort((x,y)=>distance(a,x)-distance(a,y));
   if(targets.length&&distance(a,targets[0])<=4)charge(g,a.uid,targets[0].uid);
  }
 }
 if(begin<=3){
  g.phase='fight';
  for(const a of [...living(g,side)]){
   if(a.fought)continue;
   const targets=living(g,side==='player'?'enemy':'player').filter(b=>(a.control!=='pursuit'||nearestEnemy(g,a)?.uid===b.uid)&&distance(a,b)<=template(a).melee.range).sort((x,y)=>status(x).hp-status(y).hp);
   if(targets.length)attack(g,a.uid,targets[0].uid,'melee');
  }
 }
 scoreTurn(g,side);checkFinished(g);
}
function advance(g){
 if(g.finished)return;
 if(g.active!=='player')return;
 const phases=['movement','shooting','charge','fight'];
 const i=phases.indexOf(g.phase);if(i<0)return;
 if(i<3){
  g.phase=phases[i+1];
  if(g.phase==='charge')for(const u of living(g,'player')){
   if(u.control==='pursuit'){const enemy=nearestEnemy(g,u);if(enemy&&canCharge(g,u.uid,enemy.uid))charge(g,u.uid,enemy.uid);}
  }
  writeLog(g,`Friendly ${g.phase} phase.`);return;
 }
 scoreTurn(g,'player');if(checkFinished(g))return;
 aiTurn(g,'enemy');if(checkFinished(g))return;
 g.round++;if(checkFinished(g))return;
 startTurn(g,'player');writeLog(g,`Battle round ${g.round} begins.`);
}
function finishByAuto(g){
 const initialRound=g.round;
 let cycles=0;
 while(!g.finished&&cycles++<MAX_ROUNDS*3){
  if(g.active==='player')aiTurn(g,'player',{resume:g.round===initialRound});if(g.finished)break;
  aiTurn(g,'enemy');if(g.finished)break;
  g.round++;if(checkFinished(g))break;startTurn(g,'player');
 }
 return g;
}
function battleLab(player,enemy,count=10,seed=1111){
 const results=[],n=clamp(Math.round(count)||10,1,100);
 for(let i=0;i<n;i++){
  const g=finishByAuto(createGame({player,enemy,seed:(seed+i*7919)>>>0}));
  results.push({game:i+1,seed:g.seed,winner:g.winner,playerVP:g.score.player,enemyVP:g.score.enemy,playerSurvivors:living(g,'player').length,enemySurvivors:living(g,'enemy').length});
 }
 return results;
}
function validateLoadedState(g){
 if(!g||g.version!==2||!Array.isArray(g.units)||g.units.length>28||!g.units.length||!g.score||!Array.isArray(g.log)||!Array.isArray(g.objectives)||g.objectives.length!==3)throw Error('Incompatible save file.');
 if(g.objectives.some(o=>!['A','B','C'].includes(o.id)||!validCell(o.x,o.y)))throw Error('Save file contains invalid objectives.');
 if(g.units.some(u=>!BY_ID[u.template]||!['player','enemy'].includes(u.side)||
  (u.deployment==='reserve'?(u.x!==-1||u.y!==-1):!validCell(u.x,u.y))||
  (u.deployment!==undefined&&!['field','reserve'].includes(u.deployment))||
  !Number.isInteger(u.models)||u.models<0||u.models>BY_ID[u.template].models||!Number.isInteger(u.injury)||u.injury<0||u.injury>=BY_ID[u.template].wp))throw Error('Save file contains invalid unit data.');
 if(g.invocationUsed!==undefined&&(!g.invocationUsed||typeof g.invocationUsed.player!=='boolean'||typeof g.invocationUsed.enemy!=='boolean'))throw Error('Save contains invalid Bloodletter Invocation state.');
 if(g.settings.deployment)normalizeDeployment(g.settings.deployment,{player:g.settings.player,enemy:g.settings.enemy});
 if(!Number.isInteger(g.round)||g.round<1||g.round>6||!Number.isInteger(g.seedState)||!['movement','shooting','charge','fight','finished'].includes(g.phase)||!['player','enemy'].includes(g.active)||!Number.isFinite(g.score.player)||!Number.isFinite(g.score.enemy))throw Error('Save file has invalid battle state.');
 if(g.units.filter(u=>u.models>0).some((u,i,arr)=>arr.slice(i+1).some(v=>v.x===u.x&&v.y===u.y)))throw Error('Multiple units occupy the same square.');
 if(!g.settings||!Array.isArray(g.settings.player)||!Array.isArray(g.settings.enemy))throw Error('Save file has invalid muster data.');
 if(musterProblems(g.settings.player).length||musterProblems(g.settings.enemy).length)throw Error('Saved muster violates current source catalogue limits.');
 if(g.units.some(u=>u.painPenalty!==undefined&&u.painPenalty!==0&&u.painPenalty!==1))throw Error('Save contains invalid Pain-Control state.');
 for(const u of g.units){
  const t=BY_ID[u.template];
  if(!t.leader)continue;
  // Version-2 saves from Alpha 0.7 had a last-survivor Leader but no
  // independent Leader wound field. Upgrade them without discarding rosters.
  if(u.leaderAlive===undefined){
   if(t.special?.bundledChaplain){u.leaderAlive=u.models>0;if(u.models>0)u.models=Math.min(t.models,u.models+1);u.leaderInjury=0;}
   else{u.leaderAlive=u.models>0;u.leaderInjury=u.models===1?u.injury:0;if(u.models===1)u.injury=0;}
  }
  if(typeof u.leaderAlive!=='boolean'||!Number.isInteger(u.leaderInjury)||u.leaderInjury<0||u.leaderInjury>=t.leader.wp)throw Error('Save contains invalid Leader wounds.');
  if(u.leaderAlive&&u.models<1)throw Error('Saved Leader is alive in a destroyed unit.');
 }
 if(g.units.some(u=>u.control!==undefined&&!['controlled','supervised','pursuit'].includes(u.control)))throw Error('Save contains invalid Lost Cohort state.');
 return g;
}
return {WIDTH,HEIGHT,MAX_ROUNDS,normalizeDeployment,reserveUnits,deployReserve,invokeBloodletters,canDeployReserve,shockTest,attackProfiles,weaponTraits,startTurn,beginAdvance,nearestEnemy,lostCohortControl,supervisingChaplain,declareDirectedObjective,musterProblems,FACTIONS,TEMPLATES,BY_ID,registerLinked,registerConfiguration,DEFAULT_PLAYER,DEFAULT_ENEMY,OBJECTIVES,COVER,WALLS,createGame,template,living,status,total,distance,hasLineOfSight,rollProfileValue,pathDistance,validCell,canMove,move,attack,canCharge,charge,objectiveOwner,advance,aiTurn,finishByAuto,battleLab,validateLoadedState};
});
