(function(){
'use strict';
const E=window.GaulEngine;
if(!E){document.body.textContent='Simulator engine failed to load.';return;}
const LIVE=window.GaulCatalogue||null;
const cachedCatalogues=LIVE?.readCache?.()||null;
if(cachedCatalogues)for(const [f,item] of Object.entries(cachedCatalogues.catalogues||{}))E.registerLinked(f,item.units);
const cachedCounts=Object.fromEntries(Object.entries(cachedCatalogues?.catalogues||{}).map(([f,x])=>[f,x.units.length]));
const $=id=>document.getElementById(id);
const html=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy=a=>[...a];
const initialPlayer=copy(E.DEFAULT_PLAYER),initialEnemy=copy(E.DEFAULT_ENEMY);
const state={game:E.createGame(),musters:{player:initialPlayer,enemy:initialEnemy},deployment:{player:initialPlayer.map(()=>'field'),enemy:initialEnemy.map(()=>'field')},placement:null,configEditor:null,selected:null,editor:'player',filter:'ALL',tierFilter:'ALL',search:'',linkedCounts:cachedCounts,syncRunning:false,lastSyncCheck:0,pointsLimit:1000,feedback:'Select a friendly unit. Click an empty tile to move.',feedbackError:false,lab:null};
const factionName=t=>E.FACTIONS[t.faction]?.name||'Unknown';
const tier=t=>LIVE?.statusFor(t)||'sim-estimate';
const tierLabel=t=>({'verified':'VERIFIED','synced':'SYNCED','sim-estimate':'SIM ESTIMATE'})[tier(t)];
function tierTag(t){return `<span class="live-source-tag ${tier(t)}" title="${html(tier(t)==='verified'?'Fully reviewed against the pinned source revision':tier(t)==='synced'?'New Recruit entry; full combat rules not yet verified':'Simulator-only playtest profile')}">${tierLabel(t)}</span>${t.source==='linked'&&t.estimated?'<span class="points-estimate" title="Source points could not be resolved; value is a simulator estimate">EST. POINTS</span>':t.source==='linked'&&t.audit?.points==='per-model'?'<span class="points-estimate" title="Points extrapolated from model costs; roster modifiers may change the total">CALC. POINTS</span>':''}`;}
function profileNotes(t){return LIVE?.reviewNotes(t)||['Built-in simulator-only playtest profile.'];}
const isPlayer=u=>u&&u.side==='player';
const tFor=u=>E.template(u);
function tab(name){
 document.querySelectorAll('.tab').forEach(btn=>{const active=btn.dataset.tab===name;btn.classList.toggle('active',active);btn.setAttribute('aria-current',active?'page':'false');});
 document.querySelectorAll('.view').forEach(view=>{const active=view.id==='view-'+name;view.classList.toggle('active',active);view.hidden=!active;});
 if(name==='builder')renderBuilder();if(name==='lab')renderLab();if(name==='battle')renderBattle();
}
function message(text,isError=false){state.feedback=text;state.feedbackError=isError;const box=$('battle-feedback');box.textContent=text;box.classList.toggle('error',isError);}
function phaseLabel(phase){return ({movement:'Movement',shooting:'Shooting',charge:'Charge',fight:'Fight',finished:'Concluded'})[phase]||phase;}
function renderScore(){
 const g=state.game,player=E.living(g,'player'),enemy=E.living(g,'enemy'),playerReserves=E.reserveUnits(g,'player'),enemyReserves=E.reserveUnits(g,'enemy');
 const pTotal=E.total(state.musters.player),eTotal=E.total(state.musters.enemy);
 $('scoreboard').innerHTML=`<div class="score team-player"><div><div class="score-title">Friendly · Commander</div><div class="score-sub">${player.length} field / ${playerReserves.length} reserve · ${pTotal} pts</div></div><div><div class="metric">${g.score.player}<small style="font-size:11px;font-weight:650"> VP</small></div></div></div>
 <div class="score center"><div class="score-title">BATTLE ROUND ${Math.min(g.round,E.MAX_ROUNDS)} / ${E.MAX_ROUNDS}</div><div class="metric">${phaseLabel(g.phase)}</div><div class="score-sub">${g.finished?(g.winner==='draw'?'DRAW':(g.winner==='player'?'FRIENDLY':'OPPOSING')+' VICTORY'):'Your turn'}</div></div>
 <div class="score team-enemy"><div><div class="score-title">Opposing · AI</div><div class="score-sub">${enemy.length} field / ${enemyReserves.length} reserve · ${eTotal} pts</div></div><div class="metric">${g.score.enemy}<small style="font-size:11px;font-weight:650"> VP</small></div></div>`;
}
function isTargetable(attacker,target){
 const g=state.game;
 if(g.finished||!attacker||!target||attacker.models===0||attacker.side!=='player'||target.side!=='enemy'||target.models===0)return false;
 const dist=E.distance(attacker,target),t=tFor(attacker);
 if(g.phase==='shooting')return !attacker.shot&&dist>1&&dist<=t.ranged.range&&E.hasLineOfSight(attacker,target);
 if(g.phase==='charge')return E.canCharge(g,attacker.uid,target.uid);
 if(g.phase==='fight')return !attacker.fought&&dist<=t.melee.range;
 return false;
}
function shortName(t){return (t.name.split(/\s+/).filter(w=>!/^(the|of|and)$/i.test(w)).map(w=>w[0]).slice(0,2).join('')||t.name.slice(0,2)).toUpperCase();}
function renderBoard(){
 const g=state.game,selected=g.units.find(u=>u.uid===state.selected && u.models>0);
 const occupantMap=new Map(E.living(g).map(u=>[`${u.x},${u.y}`,u]));
 const objMap=new Map(g.objectives.map(o=>[`${o.x},${o.y}`,o]));
 const cells=[];
 for(let y=0;y<E.HEIGHT;y++)for(let x=0;x<E.WIDTH;x++){
   const key=`${x},${y}`,u=occupantMap.get(key),o=objMap.get(key),isWall=E.WALLS.has(key),isCover=E.COVER.has(key);
   const move=state.placement?E.canDeployReserve(g,g.units.find(q=>q.uid===state.placement.unitUid),x,y,{invoker:state.placement.kind==='invocation'?g.units.find(q=>q.uid===state.placement.thrallsUid):null}):selected&&selected.side==='player'&&g.phase==='movement'&&!u&&E.canMove(g,selected.uid,x,y);
   const attack=selected&&u&&isTargetable(selected,u);
   const cls=['cell',isWall?'blocked':'',isCover?'cover':'',move?'reachable':'',attack?'attackable':'',selected&&u?.uid===selected.uid?'selected':''].filter(Boolean).join(' ');
   let unitMarkup='';
   if(u){const t=tFor(u),s=E.status(u),percent=100*s.hp/s.maxHp;
     unitMarkup=`<span class="miniature ${u.side==='enemy'?'enemy':''}" aria-hidden="true"><b>${shortName(t)}</b><small>${u.models}×</small><span class="hp-mini"><span style="width:${Math.max(0,percent)}%"></span></span></span>`;}
   const label=u?`${u.side==='player'?'Friendly':'Opposing'} ${tFor(u).name}, ${u.models} models remaining`:`Column ${x+1}, row ${y+1}${isWall?', impassable':isCover?', cover':''}`;
   cells.push(`<button type="button" class="${cls}" data-x="${x}" data-y="${y}" ${isWall?'disabled':''} aria-label="${html(label)}" title="${html(label)}">${o?`<span class="objective-badge" title="Objective ${o.id}">${o.id}</span>`:''}${unitMarkup}</button>`);
 }
 $('battle-grid').innerHTML=cells.join('');
}
function renderInspector(){
 const u=state.game.units.find(u=>u.uid===state.selected&&u.models>0);
 if(!u){$('selected-unit').innerHTML='<p class="muted">Select any unit on the map to view its status and attacks.</p>';return;}
 const t=tFor(u),s=E.status(u),p=Math.round(s.hp/s.maxHp*100);
 $('selected-unit').innerHTML=`<div class="unit-name">${html(t.name)}</div><span class="faction-pill">${html(factionName(t))} · ${u.side==='player'?'Friendly':'Opposing'}</span><div class="health-track"><span style="width:${p}%"></span></div><div class="muted">${s.hp} / ${s.maxHp} wounds · ${u.models} / ${t.models} models</div>
 <div class="stat-row"><div class="stat"><b>${t.t}</b><small>T</small></div><div class="stat"><b>${t.save}+</b><small>Sv</small></div><div class="stat"><b>${t.move}</b><small>Move</small></div><div class="stat"><b>${t.oc}</b><small>OC/model</small></div></div>
 <div class="attack-line"><strong>Ranged</strong> · ${t.ranged.attacks}A × model · R${t.ranged.range} · S${t.ranged.s} · AP−${t.ranged.ap} · D${t.ranged.damage} · ${t.ranged.skill}+</div>
 <div class="attack-line"><strong>Melee</strong> · ${t.melee.attacks}A × model · S${t.melee.s} · AP−${t.melee.ap} · D${t.melee.damage} · ${t.melee.skill}+</div>
 ${t.loadout?.length?`<details class="unit-audit"><summary>New Recruit default weapons (${t.loadout.length} types)</summary><ul>${t.loadout.slice(0,30).map(w=>`<li>${w.count}× ${html(w.name)} · ${html(w.mode)} · A${w.attacks} / S${w.s} / AP−${w.ap} / D${w.damage}${w.traits?` · ${html(w.traits)}`:''}</li>`).join('')}</ul></details>`:''}
 ${t.leader?`<p class="muted">Attached ${html(t.leader.name)}: ${u.leaderAlive!==false?`${Math.max(0,t.leader.wp-(u.leaderInjury||0))} / ${t.leader.wp} W remaining`:'destroyed'}${t.leader.bundled?' · points already included in formation':''}</p>`:''}
 ${t.special?.lost&&t.special?.mandatoryChaplain?`<p class="muster-rule-warning">Lost Cohort control: ${html(u.control||'controlled')}${u.leaderAlive===false?' · original Chaplain lost':''}. Objective Control retained unless Battle-shocked.</p>`:''}
 ${u.battleshocked?'<p class="muster-rule-warning">Battle-shocked: 0 Objective Control until next Command phase.</p>':''}
 ${u.side==='player'&&state.game.phase==='movement'&&!u.moved&&!u.advancing?`<button type="button" class="tiny-button" data-advance-unit="${html(u.uid)}">Advance (roll D6, restrict shooting/charge)</button>`:''}
 ${u.advancing?`<p class="muted">Advanced +${u.advanceRoll} inches this turn: only Assault weapons may shoot; cannot charge.</p>`:''}
 ${t.abilities?.length?`<details class="unit-audit"><summary>Source abilities &amp; combat coverage</summary><ul>${t.abilities.filter(a=>!/^ROSTER CARD/.test(a.name)).slice(0,30).map(a=>`<li><strong>${a.coverage==='modeled'?'Modeled':a.coverage==='partial'?'Partial':'Reference only'}</strong> — ${html(a.name)}: ${html(a.description.slice(0,360))}</li>`).join('')}</ul></details>`:''}
 ${u.side==='enemy'&&state.game.active==='player'&&state.game.phase==='movement'&&state.game.directed?.player!==u.uid?`<button type="button" class="tiny-button" data-direct-target="${html(u.uid)}">Mark as Directed Objective</button>`:''}
 ${state.game.directed?.player===u.uid?'<p class="muted">★ Directed Objective designated for friendly Infernal Warriors.</p>':''}
 <p class="profile-note">${tierTag(t)} ${html(t.description)}</p>${u.painPenalty?'<p class="muster-rule-warning">Warp-Aggravated Pain: −1 ranged Hit until your next Command phase.</p>':''}<p class="muted">${u.moved?'✓ Moved':'• Not moved'} · ${u.shot?'✓ Fired':'• Ready to fire'} · ${u.charged?'✓ Charge tried':'• Charge available'} · ${u.fought?'✓ Fought':'• Fight available'}</p>`;
}
function renderReserves(){
 const el=$('reserves-panel');if(!el)return;
 const g=state.game,waiting=E.reserveUnits(g,'player');
 const canAct=!g.finished&&g.phase==='movement'&&g.active==='player'&&g.round>=2;
 const invokers=E.living(g,'player').filter(u=>E.template(u).name==='Bloodmarked Thralls'&&!u.battleshocked);
 el.innerHTML=waiting.length?waiting.map(u=>{
  const name=html(E.template(u).name),canInvoke=canAct&&name==='Bloodletters'&&invokers.length&&!g.invocationUsed?.player;
  return `<div class="reserve-unit"><strong>${name}</strong><div class="reserve-unit-buttons"><button type="button" class="tiny-button" data-deploy-reserve="${html(u.uid)}" ${!canAct?'disabled':''}>Deploy from edge</button>${canInvoke?invokers.map(t=>`<button type="button" class="tiny-button" data-invoke-reserve="${html(u.uid)}" data-invoker="${html(t.uid)}">Invoke via Thralls ${html(t.uid)}</button>`).join(''):''}</div></div>`;
 }).join(''):'<p class="muted">No friendly units are in Reserves.</p>';
 el.innerHTML+=(g.invocationUsed?.player?'<p class="muted">Bloodletter Invocation used this battle.</p>':'')+(state.placement?'<button type="button" class="tiny-button" id="cancel-placement">Cancel placement</button>':'');
}
function renderObjectives(){
 const g=state.game;
 $('objectives').innerHTML=g.objectives.map(o=>{const who=E.objectiveOwner(g,o),className=who||'neutral',label=who==='player'?'Friendly control':who==='enemy'?'Opposing control':'Contested / neutral';
 return `<div class="obj-line"><span class="obj-id">${o.id}</span><span>Objective ${o.id} <span class="muted">(${o.x+1}, ${o.y+1})</span></span><span class="owner ${className}">${label}</span></div>`;}).join('');
}
function renderFeed(){
 const g=state.game;
 $('combat-feed').innerHTML=(g.finished?`<div class="end-banner">${g.winner==='draw'?'The battle ends in a draw.':(g.winner==='player'?'Friendly force wins.':'Opposing force wins.')} Final score ${g.score.player}–${g.score.enemy} VP.</div>`:'')+g.log.slice(0,22).map(x=>`<p>${html(x)}</p>`).join('');
}
function renderBattle(){
 const g=state.game;
 if(state.selected&&!E.living(g).some(u=>u.uid===state.selected))state.selected=null;
 renderScore();renderBoard();renderInspector();renderReserves();renderObjectives();renderFeed();
 const instructions={movement:'Move each selected friendly unit once. Green tiles are reachable.',shooting:'Select a friendly shooter, then click an enemy in range. Orange tiles are legal targets.',charge:'Select a friendly unit, then click an enemy to attempt a 2D6 charge.',fight:'Select a friendly unit and click an adjacent enemy to strike.',finished:'Battle complete. Restart, edit your armies, or export the report.'};
 $('phase-hint').textContent=state.placement?'Choose a highlighted square for '+(state.placement.kind==='invocation'?'Bloodletter Invocation.':'Reserve arrival.')+' Select Cancel to exit.':instructions[g.phase];
 $('next-phase').disabled=g.finished;$('next-phase').textContent=g.phase==='fight'?'End turn →':'Next phase →';
 $('auto-finish').disabled=g.finished;
 message(state.feedback,state.feedbackError);
}
function clickedCell(x,y){
 const g=state.game,u=E.living(g).find(u=>u.x===x&&u.y===y),selected=E.living(g).find(u=>u.uid===state.selected);
 if(g.finished){message('Battle has ended. Restart to play again.',true);return;}
 if(state.placement){
  const plan=state.placement;
  const unit=g.units.find(q=>q.uid===plan.unitUid);
  const invoker=plan.kind==='invocation'?g.units.find(q=>q.uid===plan.thrallsUid):null;
  if(!E.canDeployReserve(g,unit,x,y,{invoker})){
   message('Illegal position. Select a highlighted, unoccupied square.',true);renderBattle();return;
  }
  const res=plan.kind==='invocation'?E.invokeBloodletters(g,plan.thrallsUid,plan.unitUid,x,y):E.deployReserve(g,plan.unitUid,x,y);
  message(res.ok?(plan.kind==='invocation'?'Paid Bloodletters invoked from Reserves.':'Reserve unit arrived.'):res.message,!res.ok);
  if(res.ok)state.placement=null;renderBattle();return;
 }
 if(u?.side==='player'){state.selected=u.uid;message(`Selected ${tFor(u).name}.`);renderBattle();return;}
 if(u&&selected&&u.side==='enemy'){
   if(g.phase==='shooting'||g.phase==='fight'){
     const mode=g.phase==='shooting'?'ranged':'melee',res=E.attack(g,selected.uid,u.uid,mode);
     message(res.ok?`${tFor(selected).name}: ${res.hits} hits, ${res.damage} damage, ${res.casualties} casualties.`:res.message,!res.ok);
   }else if(g.phase==='charge'){
     const res=E.charge(g,selected.uid,u.uid);message(res.ok?(res.success?`Charge succeeds on ${res.roll}.`:`Charge failed (rolled ${res.roll}).`):res.message,!res.ok);
   }else message('Advance to shooting, charge or fight phase to attack.',true);
   renderBattle();return;
 }
 if(!u&&selected&&g.phase==='movement'){
   const res=E.move(g,selected.uid,x,y);message(res.ok?`${tFor(selected).name} repositioned.`:res.message,!res.ok);renderBattle();return;
 }
 if(u?.side==='enemy'){state.selected=u.uid;message(`Inspecting opposing unit: ${tFor(u).name}.`);renderBattle();return;}
 message('Select a friendly unit, then a valid tile or enemy target.',true);
}
function resetBattle(){
 try{state.game=E.createGame({player:state.musters.player,enemy:state.musters.enemy,deployment:state.deployment,seed:Date.now()>>>0});state.selected=null;state.placement=null;message('New battle deployed. Select a friendly unit.');renderBattle();tab('battle');}
 catch(err){message(err.message,true);tab('battle');}
}
function configurable(t){const base=E.BY_ID[t?.baseId]||t;return !!(LIVE&&base?.faction==='IW'&&!base.isLeader&&base.source==='linked'&&base.formationConfigs?.length);}
function showConfig(side,index){
 const t=E.BY_ID[state.musters[side]?.[index]];
 if(!configurable(t))return '';
 const base=E.BY_ID[t.baseId]||t;
 const form=base.formationConfigs.find(f=>f.id===(t.selectedFormation||base.defaultFormationId))||base.formationConfigs[0];
 const gear=t.selectedGear||{},leaderOptions=E.TEMPLATES.filter(x=>x.source==='linked'&&x.visible!==false&&LIVE.isValidLeaderFor(base,x));
 const opts=(arr,chosen)=>arr.map(x=>`<option value="${html(x.id)}" ${x.id===chosen?'selected':''}>${html(x.label||x.name)}${Number.isFinite(x.points)?` · ${x.points} pts`:''}</option>`).join('');
 const select=(label,kind,slotId,choices,selected)=>`<label>${html(label)}<select data-config-kind="${kind}" data-config-side="${side}" data-config-index="${index}" ${slotId?`data-config-slot="${html(slotId)}"`:''}>${opts(choices,selected)}</select></label>`;
 return `<div class="muster-editor" role="group" aria-label="Configure ${html(base.name)}">
 <p class="muted">Selections follow the published squad-size options and flat weapon menus. Unimplemented restrictions or abilities still require New Recruit validation.</p>
 ${base.wargearLimits?.length?`<p class="muted">Source-enforced wargear quotas: ${base.wargearLimits.map(x=>html(x.description)).join(" · ")}</p>`:""}
 ${select('Squad size','formation',null,base.formationConfigs.map(f=>({...f,label:`${f.label}`})),form.id)}
 <div class="gear-editor">${form.slots.map(slot=>select(slot.name,'gear',slot.id,slot.choices,gear[slot.id]||slot.selectedId)).join('')}</div>
 ${!base.special?.mandatoryChaplain&&leaderOptions.length?select('Attached Leader (paid once)','leader',null,[{id:'',label:'None',points:0},...leaderOptions.map(x=>({...x,label:x.name}))],t.leaderId||''):''}
 ${base.special?.mandatoryChaplain?'<p class="muted">This Lost Cohort formation already includes its mandatory Chaplain cost; its Chaplain has independent wounds and can be targeted by Precision weapons. No duplicate Leader is added.</p>':''}
 <p class="muted">The attached Leader acts within this squad on the battlefield (simplified last-survivor and wounds rules).</p></div>`;
}
function updateConfiguration(side,index,kind,selected,slotId){
 const current=E.BY_ID[state.musters[side]?.[index]],base=E.BY_ID[current?.baseId]||current;
 if(!configurable(current))return;
 const opts={formationId:current.selectedFormation||base.defaultFormationId,gear:{...(current.selectedGear||{})},leaderId:current.leaderId||null};
 if(kind==='formation'){opts.formationId=selected;opts.gear={};}
 else if(kind==='gear'){opts.gear[slotId]=selected;}
 else if(kind==='leader'){opts.leaderId=selected||null;}
 else return;
 try{
  const allLeaders=E.TEMPLATES.filter(x=>x.source==='linked'&&x.visible!==false&&x.isLeader);
  const variant=LIVE.configureUnit(base,opts,allLeaders);
  // A named Hero may not be attached to two different units in one army.
  if(variant.leaderId&&variant.leader?.name!=='Infernal Chaplain'&&state.musters[side].some((id,i)=>i!==index&&E.BY_ID[id]?.leaderId===variant.leaderId))throw Error('This named Leader is already attached to another squad.');
  E.registerConfiguration(variant);
  const updated=[...state.musters[side]];updated[index]=variant.id;
  const errors=E.musterProblems(updated);if(errors.length)throw Error(errors[0]);
  state.musters[side]=updated;renderBuilder();
 }catch(error){showSyncStatus('Configuration rejected',error.message);renderBuilder();}
}
function configuredSpecs(){
 const ids=new Set([...state.musters.player,...state.musters.enemy,...state.game.units.map(u=>u.template)]);
 return [...ids].map(id=>E.BY_ID[id]).filter(t=>t?.baseId).map(t=>({baseId:t.baseId,sourceVersion:t.sourceVersion,formationId:t.selectedFormation,gear:t.selectedGear||{},leaderId:t.leaderId||null}));
}
function restoreConfigurations(obj){
 for(const spec of obj.configurations||[]){
  if(!spec||typeof spec.baseId!=='string'||!spec.baseId.startsWith('nr-')||typeof spec.sourceVersion!=='string')throw Error('Invalid saved unit configuration.');
  const base=E.BY_ID[spec.baseId];
  if(!base||base.sourceVersion!==spec.sourceVersion)throw Error('Saved roster uses an older New Recruit revision. Sync the catalogue, then rebuild that formation.');
  const v=LIVE.configureUnit(base,{formationId:spec.formationId,gear:spec.gear,leaderId:spec.leaderId},E.TEMPLATES.filter(t=>t.isLeader&&t.visible!==false&&t.source==='linked'));
  E.registerConfiguration(v);
 }
}
function renderBuilder(){
 const side=state.editor,points=E.total(state.musters[side]),linkedFactions=new Set(Object.entries(state.linkedCounts).filter(([,n])=>n>0).map(([f])=>f));
 const needle=state.search.toLowerCase().trim();
 const available=E.TEMPLATES.filter(t=>{
  if(t.source==='linked'&&t.visible===false)return false;
  if(t.source!=='linked'&&linkedFactions.has(t.faction))return false;
  return state.filter==='ALL'||t.faction===state.filter;
 });
 const counts={'verified':0,'synced':0,'sim-estimate':0};
 for(const t of available)counts[tier(t)]++;
 const list=available.filter(t=>(state.tierFilter==='ALL'||tier(t)===state.tierFilter)&&
  (!needle||(`${t.name} ${t.category||''} ${factionName(t)}`).toLowerCase().includes(needle)))
  .sort((a,b)=>a.faction.localeCompare(b.faction)||a.name.localeCompare(b.name));
 $('builder-side').value=side;$('faction-filter').value=state.filter;$('status-filter').value=state.tierFilter;$('points-limit').value=String(state.pointsLimit);
 if($('unit-search').value!==state.search)$('unit-search').value=state.search;
 $('verification-counts').textContent=`${counts.verified} Verified · ${counts.synced} Synced · ${counts['sim-estimate']} Sim Estimate`;
 $('catalogue-count').textContent=`(${list.length} available${needle||state.tierFilter!=='ALL'?' · filtered':''})`;
 $('unit-catalogue').innerHTML=list.length?list.map(t=>`<article class="unit-card"><span class="faction-stripe" style="background:${E.FACTIONS[t.faction].color}"></span><div><h4>${html(t.name)} <span class="point-small">· ${t.points} pts</span> ${tierTag(t)}</h4><p>${html(factionName(t))} · ${t.models} models · ${html(t.description)}</p><details class="unit-audit"><summary>Verification details</summary><ul>${profileNotes(t).map(note=>`<li>${html(note)}</li>`).join('')}</ul></details></div><button type="button" data-add="${html(t.id)}" ${state.musters[side].length>=14||points+t.points>state.pointsLimit||E.musterProblems([...state.musters[side],t.id]).length?'disabled':''} aria-label="Add ${html(t.name)} to ${side} force">+</button></article>`).join(''):
 state.tierFilter==='verified'?'<p class="muted">No units are fully Verified yet. Use Synced to play with imported profiles while we audit their weapons, points, abilities and restrictions.</p>':'<p class="muted">No matching units. Change the faction, verification filter or search terms.</p>';
 $('muster-list').innerHTML=['player','enemy'].map(s=>{
  const total=E.total(state.musters[s]),warning=total>state.pointsLimit?'overlimit':'';
  return `<div class="muster-group"><div class="muster-heading">${s==='player'?'Friendly force':'Opposing force'} <span class="muster-points ${warning}">${total} / ${state.pointsLimit} pts</span></div>
 ${state.musters[s].length?state.musters[s].map((id,i)=>{const t=E.BY_ID[id],base=E.BY_ID[t?.baseId]||t,stale=!!(t?.baseId&&t.sourceVersion!==base?.sourceVersion);
  return `<div class="muster-config-wrap"><div class="muster-row"><span>${html(t?.name||'Unavailable datasheet')} <span class="point-small">${t?.points??'?'}${t?.estimated?'*':''} pts</span> ${t?tierTag(t):''}${t?.leader?' · with '+html(t.leader.name):''}${t?.formationLabel?' · '+html(t.formationLabel):''}${stale?' <strong class="overlimit">STALE SOURCE</strong>':''}</span><span class="muster-actions">${configurable(t)?`<button class="edit-unit-btn" data-edit-side="${s}" data-edit-index="${i}" aria-label="Configure ${html(t.name)}">${state.configEditor===s+':'+i?'Close':'Configure'}</button>`:''}<button data-remove-side="${s}" data-remove-index="${i}" aria-label="Remove ${html(t?.name||'unit')}">×</button></span></div>${state.configEditor===s+':'+i?showConfig(s,i):''}</div>`;
 }).join(''):'<p class="muted">No units selected.</p>'}</div>`;
 }).join('') + ['player','enemy'].flatMap(s=>E.musterProblems(state.musters[s]).map(err=>`<p class="muster-rule-warning" role="alert">${s==='player'?'Friendly':'Opposing'}: ${html(err)}</p>`)).join('');
 $('apply-musters').disabled=!state.musters.player.length||!state.musters.enemy.length||['player','enemy'].some(s=>E.total(state.musters[s])>state.pointsLimit||state.musters[s].some(id=>{const t=E.BY_ID[id];return t?.baseId&&t.sourceVersion!==E.BY_ID[t.baseId]?.sourceVersion;})||E.musterProblems(state.musters[s]).length>0);
}
function showSyncStatus(status,detail){
 const el=$('catalogue-sync-status'),desc=$('catalogue-sync-detail');
 if(!el||!desc)return;
 el.textContent=status;
 desc.textContent=detail;
}
async function syncCatalogues(force=false){
 if(!LIVE||state.syncRunning)return;
 state.syncRunning=true;
 $('refresh-catalogues').disabled=true;
 showSyncStatus('Checking New Recruit catalogues…','Changes in the source repository are detected when the simulator opens or when you select Sync latest units.');
 const failures=[];
 try{
  const result=await LIVE.sync({force,
   onUpdate(f,units){E.registerLinked(f,units);state.linkedCounts[f]=units.length;renderBuilder();},
   onStatus(info){
    if(info.type==='loading')showSyncStatus(info.message,'Downloading and reading the latest published New Recruit datasheet entries.');
    if(info.type==='error')failures.push(info.message);
    if(info.type==='loaded')showSyncStatus(`Loaded ${E.FACTIONS[info.faction].name}: ${info.count} units`,`New Recruit catalogue revision ${info.revision||'unknown'} · translated to simplified simulator battle profiles.`);
   }
  });
  const summary=Object.entries(state.linkedCounts).map(([f,n])=>`${E.FACTIONS[f].short} ${n}`).join(' · ');
  if(result.ok){showSyncStatus(`New Recruit connection current · ${summary||'No units published'}`,
   result.changed?`Updated ${result.changed} faction catalogue(s) from ${result.versionSource}. Reloading the website later automatically checks for new units.`:'No changes since the last check. Your local catalogue cache is current.');}
  else showSyncStatus(`Using ${summary?'cached and playtest':'playtest'} units · source check incomplete`,failures.join(' | ')||result.error||'GitHub source unavailable; previous units remain available.');
 }catch(error){showSyncStatus('Catalogue synchronization unavailable',`${error.message}. Existing units remain selectable.`);}
 finally{state.lastSyncCheck=Date.now();state.syncRunning=false;$('refresh-catalogues').disabled=false;renderBuilder();}
}
function addUnit(id){
 const arr=state.musters[state.editor],t=E.BY_ID[id];
 if(!t||arr.length>=14||E.total(arr)+t.points>state.pointsLimit)return;
 const errors=E.musterProblems([...arr,id]);
 if(errors.length){showSyncStatus('Roster limit reached',errors[0]);return;}
 arr.push(id);renderBuilder();
}
function removeUnit(side,i){if(!['player','enemy'].includes(side)||!Number.isInteger(i)||i<0||i>=state.musters[side].length)return;state.musters[side].splice(i,1);state.configEditor=null;renderBuilder();}
function renderLab(){
 $('lab-muster-label').textContent=`Friendly ${E.total(state.musters.player)} pts / ${state.musters.player.length} units · Opposing ${E.total(state.musters.enemy)} pts / ${state.musters.enemy.length} units`;
 const r=state.lab;if(!r)return;
 const p=r.filter(x=>x.winner==='player').length,enemy=r.filter(x=>x.winner==='enemy').length,draw=r.length-p-enemy;
 const avg=(key)=>Math.round(r.reduce((n,v)=>n+v[key],0)/r.length*10)/10;
 $('lab-results').innerHTML=`<div class="lab-metrics"><div class="lab-metric player"><b>${p} / ${r.length}</b><small>Friendly victories</small></div><div class="lab-metric enemy"><b>${enemy} / ${r.length}</b><small>Opposing victories</small></div><div class="lab-metric"><b>${draw} / ${r.length}</b><small>Draws</small></div></div>
 <section class="panel"><h3>Win distribution</h3><div class="chart-track" role="img" aria-label="${p} friendly wins, ${enemy} opposing wins, ${draw} draws"><span class="chart-player" style="width:${100*p/r.length}%"></span><span class="chart-enemy" style="width:${100*enemy/r.length}%"></span><span class="chart-draw" style="width:${100*draw/r.length}%"></span></div><p class="muted">Average VP · Friendly ${avg('playerVP')} / Opposing ${avg('enemyVP')}. Outcomes are from an abstract simulation, not tournament or tabletop performance data.</p><div class="panel-title-line"><h3>Simulation results</h3><button class="tiny-button" id="export-lab" type="button">Export JSON ↓</button></div><div class="table-wrap"><table class="results-table"><thead><tr><th>Game</th><th>Seed</th><th>Winner</th><th>Friendly VP</th><th>Opposing VP</th><th>Survivors F/O</th></tr></thead><tbody>${r.map(x=>`<tr><td>${x.game}</td><td>${x.seed}</td><td>${x.winner==='player'?'Friendly':x.winner==='enemy'?'Opposing':'Draw'}</td><td>${x.playerVP}</td><td>${x.enemyVP}</td><td>${x.playerSurvivors} / ${x.enemySurvivors}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function save(){
 try{localStorage.setItem('gaul-campaign-sim-v2',JSON.stringify({game:state.game,musters:state.musters,pointsLimit:state.pointsLimit,configurations:configuredSpecs()}));message('Battle saved on this device.');}
 catch(e){message('Unable to use browser storage. Export JSON instead.',true);}renderBattle();
}
function importData(obj){
 if(LIVE)restoreConfigurations(obj);
 const game=E.validateLoadedState(obj.game||obj);
 const settings=game.settings;
 if(!['player','enemy'].every(s=>Array.isArray(settings[s])&&settings[s].length>=1&&settings[s].length<=14&&settings[s].every(id=>!!E.BY_ID[id])))throw Error('This save references unsupported units.');
 state.game=game;state.musters={player:copy(settings.player),enemy:copy(settings.enemy)};state.pointsLimit=[500,1000,2000,3000].includes(obj.pointsLimit)?obj.pointsLimit:Math.max(1000,Math.ceil(Math.max(E.total(state.musters.player),E.total(state.musters.enemy))/1000)*1000);
 if(![500,1000,2000,3000].includes(state.pointsLimit))state.pointsLimit=3000;
 state.selected=null;state.lab=null;message('Battle restored.');renderBattle();tab('battle');
}
function load(){try{const raw=localStorage.getItem('gaul-campaign-sim-v2');if(!raw)throw Error('No saved battle found in this browser.');importData(JSON.parse(raw));}catch(e){message(e.message,true);renderBattle();}}
function download(filename,contents,type){const blob=new Blob([contents],{type});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function exportJson(){download('gaul-campaign-battle.json',JSON.stringify({game:state.game,pointsLimit:state.pointsLimit,configurations:configuredSpecs()},null,2),'application/json');}
function exportLog(){download('gaul-campaign-battle-report.txt',`Gaul Campaign: Renegades\nBattle seed: ${state.game.seed}\nScore: ${state.game.score.player}-${state.game.score.enemy}\n\n${[...state.game.log].reverse().join('\n')}\n`,'text/plain');}
function bind(){
 document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
 $('battle-grid').addEventListener('click',ev=>{const b=ev.target.closest('.cell');if(b&&!b.disabled)clickedCell(Number(b.dataset.x),Number(b.dataset.y));});
 $('next-phase').addEventListener('click',()=>{state.placement=null;E.advance(state.game);state.selected=null;message(state.game.finished?'Battle complete.':state.game.phase==='movement'?`Battle round ${state.game.round} begins.`:`Entered ${phaseLabel(state.game.phase).toLowerCase()} phase.`);renderBattle();});
 $('auto-finish').addEventListener('click',()=>{E.finishByAuto(state.game);state.selected=null;message('Automated simulation completed.');renderBattle();});
 $('new-battle').addEventListener('click',resetBattle);
 $('reserves-panel').addEventListener('click',ev=>{
  if(ev.target.closest('#cancel-placement')){state.placement=null;renderBattle();return;}
  const inv=ev.target.closest('[data-invoke-reserve]'),reg=ev.target.closest('[data-deploy-reserve]');
  if(inv||reg){state.placement={kind:inv?'invocation':'reserve',unitUid:inv?.dataset.invokeReserve||reg?.dataset.deployReserve,thrallsUid:inv?.dataset.invoker||null};state.selected=null;message('Choose a highlighted empty square.');renderBattle();}
 });
 $('save-game').addEventListener('click',save);$('load-game').addEventListener('click',load);$('export-game').addEventListener('click',exportJson);$('download-log').addEventListener('click',exportLog);
 $('import-game').addEventListener('click',()=>$('import-file').click());
 $('import-file').addEventListener('change',async ev=>{const file=ev.target.files?.[0];if(!file)return;try{if(file.size>500000)throw Error('Save file is unexpectedly large.');importData(JSON.parse(await file.text()));}catch(e){message(e.message,true);renderBattle();}ev.target.value='';});
 $('builder-side').addEventListener('change',ev=>{state.editor=ev.target.value;renderBuilder();});
 $('faction-filter').addEventListener('change',ev=>{state.filter=ev.target.value;renderBuilder();});
 $('status-filter').addEventListener('change',ev=>{state.tierFilter=ev.target.value;renderBuilder();});
 $('points-limit').addEventListener('change',ev=>{state.pointsLimit=Number(ev.target.value);renderBuilder();});
 $('unit-search').addEventListener('input',ev=>{state.search=ev.target.value;renderBuilder();});
 $('refresh-catalogues').addEventListener('click',()=>syncCatalogues(true));
 $('unit-catalogue').addEventListener('click',ev=>{const b=ev.target.closest('[data-add]');if(b)addUnit(b.dataset.add);});
 $('selected-unit').addEventListener('click',ev=>{
  const advancing=ev.target.closest('[data-advance-unit]');if(advancing){
   const result=E.beginAdvance(state.game,advancing.dataset.advanceUnit);
   message(result.ok?`Advance roll: ${result.roll}. Select a destination square.`:result.message,!result.ok);
   renderBattle();return;
  }
  const btn=ev.target.closest('[data-direct-target]');if(!btn)return;
  const result=E.declareDirectedObjective(state.game,'player',btn.dataset.directTarget);
  message(result.ok?'Directed Objective designated.':result.message,!result.ok);renderBattle();
 });
 $('muster-list').addEventListener('click',ev=>{
  const remove=ev.target.closest('[data-remove-side]');if(remove){removeUnit(remove.dataset.removeSide,Number(remove.dataset.removeIndex));return;}
  const edit=ev.target.closest('[data-edit-side]');if(edit){const key=edit.dataset.editSide+':'+edit.dataset.editIndex;state.configEditor=state.configEditor===key?null:key;renderBuilder();}
 });
 $('muster-list').addEventListener('change',ev=>{const sel=ev.target.closest('[data-config-kind]');if(sel)updateConfiguration(sel.dataset.configSide,Number(sel.dataset.configIndex),sel.dataset.configKind,sel.value,sel.dataset.configSlot);});
 $('restore-musters').addEventListener('click',()=>{state.musters={player:copy(initialPlayer),enemy:copy(initialEnemy)};state.pointsLimit=1000;state.configEditor=null;renderBuilder();});
 $('apply-musters').addEventListener('click',resetBattle);
 $('run-lab').addEventListener('click',()=>{
  if(!state.musters.player.length||!state.musters.enemy.length){$('lab-results').textContent='Build both armies first.';return;}
  const seed=Number($('lab-seed').value)||20261110;
  state.lab=E.battleLab(state.musters.player,state.musters.enemy,10,seed);renderLab();
 });
 $('lab-results').addEventListener('click',ev=>{if(ev.target.closest('#export-lab')&&state.lab)download('gaul-campaign-battle-lab.json',JSON.stringify({musters:state.musters,configurations:configuredSpecs(),results:state.lab},null,2),'application/json');});
}
window.addEventListener('error',ev=>{if($('battle-feedback'))message(`Simulator error: ${ev.message}`,true);});
bind();renderBattle();renderBuilder();
if(LIVE){syncCatalogues();
 // Check again when a long-idle tab is revisited; limit anonymous GitHub API requests.
 window.addEventListener('focus',()=>{if(Date.now()-state.lastSyncCheck>15*60*1000)syncCatalogues();});
 window.setInterval?.(()=>{if(Date.now()-state.lastSyncCheck>30*60*1000)syncCatalogues();},15*60*1000);
}else showSyncStatus('Live catalogues unavailable','The original local playtest units are available. Reload with catalogue.js to enable syncing.');
})();
