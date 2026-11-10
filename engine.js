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
const DEFAULT_PLAYER=['iw-varroth','iw-ashen','iw-berserkers','fc-iron','fc-servitors'];
const DEFAULT_ENEMY=['ad-vephar','ad-triarch','ad-breach','ad-shadow','st-stormseer','st-vanguard'];
const OBJECTIVES=[{x:3,y:2,id:'A'},{x:6,y:4,id:'B'},{x:8,y:5,id:'C'}];
const COVER=new Set(['2,1','2,2','3,1','4,4','5,3','6,3','7,4','8,4','9,5','9,6','10,3']);
const WALLS=new Set(['4,1','7,6']);
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
function random(game){let a=(game.seedState+=0x6D2B79F5)>>>0; a=Math.imul(a^(a>>>15),a|1);a^=a+Math.imul(a^(a>>>7),a|61);return ((a^(a>>>14))>>>0)/4294967296;}
function d6(game){return 1+Math.floor(random(game)*6);}
function d(game,n){return 1+Math.floor(random(game)*n);}
function key(x,y){return `${x},${y}`;}
function validCell(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<WIDTH&&y<HEIGHT&&!WALLS.has(key(x,y));}
function distance(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}
function total(muster){return muster.reduce((n,id)=>n+(BY_ID[id]?.points||0),0);}
function createGame(options={}){
 const pm=Array.isArray(options.player)?options.player:DEFAULT_PLAYER, em=Array.isArray(options.enemy)?options.enemy:DEFAULT_ENEMY;
 if(!pm.length||!em.length||pm.length>14||em.length>14||pm.some(id=>!BY_ID[id])||em.some(id=>!BY_ID[id]))throw Error('Musters must contain 1–14 recognized units per side.');
 const seed=Number.isFinite(+options.seed)?(+options.seed>>>0):7126;
 const game={version:2,seed,seedState:seed||1,round:1,phase:'movement',active:'player',finished:false,winner:null,score:{player:0,enemy:0},units:[],log:[],objectives:OBJECTIVES.map(o=>({...o})),settings:{player:[...pm],enemy:[...em]}};
 const used=new Set();
 function place(list,side){
  list.forEach((id,i)=>{
   let pos=null;
   const cols=side==='player'?[0,1,2]:[11,10,9];
   const orderedRows=[3,5,1,6,2,4,0,7];
   outer: for(const c of cols)for(const row of orderedRows){if(!used.has(key(c,row))&&validCell(c,row)){pos={x:c,y:row};break outer;}}
   if(!pos) throw Error('No deployment space remains.');
   used.add(key(pos.x,pos.y));
   const t=BY_ID[id];game.units.push({uid:`${side[0]}${i}`,template:id,side,x:pos.x,y:pos.y,models:t.models,injury:0,moved:false,shot:false,charged:false,fought:false});
  });
 }
 place(pm,'player');place(em,'enemy');
 writeLog(game,`Battle started. ${pm.length} friendly and ${em.length} opposing units. Seed ${seed}.`);
 return game;
}
function template(u){return BY_ID[u.template];}
function living(game,side){return game.units.filter(u=>u.models>0&&(!side||u.side===side));}
function status(u){const t=template(u);return {models:u.models,hp:u.models*t.wp-u.injury,maxHp:t.models*t.wp,points:t.points};}
function writeLog(g,text){g.log.unshift(`R${g.round} · ${text}`);if(g.log.length>250)g.log.length=250;}
function startTurn(g,side){
 g.active=side;g.phase='movement';
 for(const u of living(g,side)){
  u.moved=false;u.shot=false;u.charged=false;u.fought=false;
  if(template(u).special.regen && u.injury>0){u.injury=Math.max(0,u.injury-template(u).special.regen);}
 }
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
function canMove(g,uid,x,y){const u=living(g).find(x=>x.uid===uid);return !!u&&u.side===g.active&&g.phase==='movement'&&!u.moved&&pathDistance(g,u,x,y)<=template(u).move&&!(u.x===x&&u.y===y);}
function move(g,uid,x,y){if(!canMove(g,uid,x,y))return {ok:false,message:'Illegal move: check movement phase, range and occupied terrain.'};
 const u=g.units.find(u=>u.uid===uid);u.x=x;u.y=y;u.moved=true;writeLog(g,`${template(u).name} moved to ${x+1},${y+1}.`);return {ok:true};}
function woundTarget(s,t){if(s>=t*2)return 2;if(s>t)return 3;if(s===t)return 4;if(s*2<=t)return 6;return 5;}
function nullifierNear(g,defender){return living(g,defender.side).some(u=>template(u).special.nullifier&&distance(u,defender)<=2);}
function attack(g,attackerId,targetId,mode){
 const a=living(g).find(u=>u.uid===attackerId),b=living(g).find(u=>u.uid===targetId);
 if(!a||!b||a.side===b.side||a.side!==g.active)return {ok:false,message:'Select a living allied attacker and an enemy target.'};
 if(g.phase!==(mode==='ranged'?'shooting':'fight'))return {ok:false,message:'Wrong combat phase.'};
 if(mode==='ranged'&&a.shot||mode==='melee'&&a.fought)return {ok:false,message:'That unit has already attacked this phase.'};
 const at=template(a), bt=template(b), weapon=at[mode];
 const dist=distance(a,b);
 if(dist>weapon.range)return {ok:false,message:`Target out of ${mode==='ranged'?'weapon':'melee'} range.`};
 if(mode==='ranged'&&dist<=1)return {ok:false,message:'Units in engagement range cannot shoot in this simplified ruleset.'};
 if(mode==='ranged')a.shot=true;else a.fought=true;
 const attacks=Math.min(80,a.models*weapon.attacks), hitRoll=clamp(weapon.skill+((mode==='ranged'&&bt.special.shroud&&dist>=4)?1:0)+((mode==='ranged'&&at.special.psychic&&nullifierNear(g,b))?1:0),2,6);
 let hits=0,wounds=0,unsaved=0,casualties=0,effective=0;
 for(let i=0;i<attacks&&b.models>0;i++){
  if(d6(g)<hitRoll)continue;hits++;
  if(d6(g)<woundTarget(weapon.s,bt.t))continue;wounds++;
  const coverBonus=mode==='ranged'&&COVER.has(key(b.x,b.y))?1:0;
  const save=clamp(bt.save+weapon.ap-coverBonus,2,7);
  if(save<=6 && d6(g)>=save)continue;
  unsaved++;
  // Damage does not spill across models. A FNP roll is taken per damage point.
  const remaining=bt.wp-b.injury,rawDamage=Math.min(weapon.damage,remaining);
  let damage=0;
  for(let p=0;p<rawDamage;p++)if(!(bt.special.fnp && d6(g)>=bt.special.fnp))damage++;
  b.injury+=damage;effective+=damage;
  if(b.injury>=bt.wp){b.models--;b.injury=0;casualties++;}
 }
 writeLog(g,`${at.name} ${mode==='ranged'?'fired on':'struck'} ${bt.name}: ${hits}/${attacks} hits, ${wounds} wounds, ${effective} damage, ${casualties} models removed${b.models===0?' — DESTROYED':''}.`);
 return {ok:true,attacks,hits,wounds,unsaved,damage:effective,casualties,eliminated:b.models===0};
}
function canCharge(g,aid,bid){
 const a=living(g).find(u=>u.uid===aid),b=living(g).find(u=>u.uid===bid);
 if(!a||!b||a.side!==g.active||a.side===b.side||g.phase!=='charge'||a.charged)return false;
 return distance(a,b)>=2 && distance(a,b)<=7;
}
function charge(g,aid,bid){
 if(!canCharge(g,aid,bid))return {ok:false,message:'Charge unavailable. Select a target 2–7 squares away.'};
 const a=g.units.find(u=>u.uid===aid),b=g.units.find(u=>u.uid===bid);a.charged=true;
 const roll=d6(g)+d6(g);
 const adj=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:b.x+dx,y:b.y+dy})).filter(p=>walkable(g,p.x,p.y,a.uid)).map(p=>({...p,steps:pathDistance(g,a,p.x,p.y)})).sort((a,b)=>a.steps-b.steps);
 if(!adj.length||adj[0].steps>roll){writeLog(g,`${template(a).name} failed charge against ${template(b).name} (${roll}).`);return {ok:true,success:false,roll};}
 a.x=adj[0].x;a.y=adj[0].y;writeLog(g,`${template(a).name} charged ${template(b).name} (${roll}).`);return {ok:true,success:true,roll};
}
function objectiveOwner(g,o){
 const tally={player:0,enemy:0};
 for(const u of living(g))if(distance(u,o)<=1)tally[u.side]+=u.models*template(u).oc;
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
 const p=living(g,'player').length,e=living(g,'enemy').length;
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
 if(begin<=0){
  // Movement: seek objectives and nearby threats while respecting obstacles.
  for(const a of living(g,side)){
   if(a.moved)continue;
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
   const targets=living(g,side==='player'?'enemy':'player').filter(b=>distance(a,b)<=template(a).ranged.range&&distance(a,b)>1).sort((x,y)=>distance(a,x)-distance(a,y));
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
   const targets=living(g,side==='player'?'enemy':'player').filter(b=>distance(a,b)<=template(a).melee.range).sort((x,y)=>status(x).hp-status(y).hp);
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
 if(i<3){g.phase=phases[i+1];writeLog(g,`Friendly ${g.phase} phase.`);return;}
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
 if(g.units.some(u=>!BY_ID[u.template]||!['player','enemy'].includes(u.side)||!validCell(u.x,u.y)||!Number.isInteger(u.models)||u.models<0||u.models>BY_ID[u.template].models||!Number.isInteger(u.injury)||u.injury<0||u.injury>=BY_ID[u.template].wp))throw Error('Save file contains invalid unit data.');
 if(!Number.isInteger(g.round)||g.round<1||g.round>6||!Number.isInteger(g.seedState)||!['movement','shooting','charge','fight','finished'].includes(g.phase)||!['player','enemy'].includes(g.active)||!Number.isFinite(g.score.player)||!Number.isFinite(g.score.enemy))throw Error('Save file has invalid battle state.');
 if(g.units.filter(u=>u.models>0).some((u,i,arr)=>arr.slice(i+1).some(v=>v.x===u.x&&v.y===u.y)))throw Error('Multiple units occupy the same square.');
 if(!g.settings||!Array.isArray(g.settings.player)||!Array.isArray(g.settings.enemy))throw Error('Save file has invalid muster data.');
 return g;
}
return {WIDTH,HEIGHT,MAX_ROUNDS,FACTIONS,TEMPLATES,BY_ID,registerLinked,DEFAULT_PLAYER,DEFAULT_ENEMY,OBJECTIVES,COVER,WALLS,createGame,template,living,status,total,distance,pathDistance,validCell,canMove,move,attack,canCharge,charge,objectiveOwner,advance,aiTurn,finishByAuto,battleLab,validateLoadedState};
});
