/* Live, read-only New Recruit catalogue bridge. No keys or external libraries.
   Reads only public files from Varroth/Gaul-Campaign-Renegades. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object' && module.exports)module.exports=api;
 if(root)root.GaulCatalogue=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const REPOSITORY='Varroth/Gaul-Campaign-Renegades';
const BRANCH='main';
const FILES={IW:'Infernal_Warriors.cat',FC:'Frozen_Cogs.cat',AD:'Abandoned_Dead.cat',ST:'Silver_Tempest.cat'};
const CACHE_KEY='gaul-campaign-catalogue-cache-v11';
const CACHE_VERSION=11;
const RAW=`https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}/`;
const TREE=`https://api.github.com/repos/${REPOSITORY}/git/trees/${BRANCH}`;
const MANIFEST=RAW+'catalogue-manifest.json';
const MAX_CACHE_AGE=45*24*3600*1000;
const MAX_TEMPLATES=600;
// A VERIFIED badge is only issued for an explicitly reviewed, revision-pinned combat
// mapping. No imported unit is automatically considered verified. Entries are added
// to this ledger only after full profile, loadout, rule, composition and engine tests.
// The initial ledger is intentionally empty; see docs/VERIFICATION_POLICY.md.
const RULESET_VERSION='alpha-0.10';
const VERIFIED_LEDGER=Object.freeze({});
const REVIEW_CHECKS=['stats','points','weapons','abilities','composition','engine'];
const value=(el,attr)=>el?.getAttribute?.(attr)||'';
const childElements=(el)=>Array.from(el?.childNodes||[]).filter(n=>n.nodeType===1);
const children=(el,name)=>childElements(el).filter(n=>n.localName===name);
const path=(el,...names)=>names.reduce((nodes,name)=>nodes.flatMap(node=>children(node,name)),[el]);
const descendants=(el,name)=>Array.from(el?.getElementsByTagNameNS?.('*',name)||[]);
const bounded=(n,min,max,fallback)=>Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
const int=(v)=>{const m=String(v||'').match(/^-?\d+(?:\.\d+)?/);return m?Number(m[0]):NaN;};
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,55);
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function field(profile,key){
 const item=descendants(profile,'characteristic').find(c=>value(c,'name').toLowerCase()===key.toLowerCase());
 return item?.textContent?.trim()||'';
}
function parseWeapon(profile,mode){
 if(!profile)return null;
 const range=field(profile,'Range');
 if(mode==='melee'? !/melee|close combat/i.test(range) : /melee|close combat/i.test(range))return null;
 const attacks=int(field(profile,'A'));
 const skill=int(field(profile,'BS/WS'));
 const strength=int(field(profile,'S'));
 const ap=int(field(profile,'AP'));
 const damage=int(field(profile,'D'));
 const dist=int(range);
 return {attacks:bounded(attacks,1,100,2),range:mode==='melee'?1:bounded(dist/2,1,12,5),
  s:bounded(strength,2,22,4),ap:bounded(Math.abs(ap),0,5,0),damage:bounded(damage,1,9,1),skill:bounded(skill,2,6,3)};
}
function pointsFrom(element){
 const costs=path(element,'costs','cost').filter(c=>/^(pts|points)$/i.test(value(c,'name')));
 return costs.length?int(value(costs[0],'value')):NaN;
}
function rosterMaximum(unit){
 const limits=path(unit,'constraints','constraint').filter(c=>value(c,'type')==='max' && value(c,'field')==='selections' && value(c,'scope')==='roster').map(c=>int(value(c,'value'))).filter(n=>Number.isInteger(n)&&n>0);
 return limits.length?Math.min(...limits):null;
}
// Only enforce quota expressions that correspond unambiguously to a weapon
// family and a count. More complex source modifiers remain New Recruit-only.
function wargearLimits(unit){
 const p=descendants(unit,'profile').filter(x=>/^(?:Wargear \/ legal alternatives|Unit composition \/ selectable wargear)$/i.test(value(x,'name')));
 const txt=p.map(x=>field(x,'Description')).join(' ');const out=[];
 if(/one model per (?:full )?5 may (?:take|replace[^.]*with) (?:a )?power weapon/i.test(txt))
  out.push({kind:'power',per:5,maximum:1,description:'One power weapon per five models'});
 if(/for every full five models,? one Reaver may replace autopistol with a hand flamer/i.test(txt))
  out.push({kind:'handflamer',per:5,maximum:1,description:'One hand flamer per five models'});
 if(/one plasma pistol per 5 models/i.test(txt))
  out.push({kind:'plasmaPistol',per:5,maximum:1,description:'One plasma pistol per five models'});
 if(/one in five may exchange breacher gun for flamer or meltagun/i.test(txt))
  out.push({kind:'breacherSpecial',per:5,maximum:1,description:'One flamer or meltagun per five Void Breachers'});
 if(/for every full 10 models,? one model\b[^.]*\bflamer or heavy stubber/i.test(txt))
  out.push({kind:'thrallSpecial',per:10,maximum:1,description:'One flamer or heavy stubber per ten Bloodmarked Thralls'});
 return out;
}
function enforceWargearLimits(base,modelCount,loadout){
 for(const limit of base.wargearLimits||[]){
  const limitCount=Math.floor(modelCount/limit.per)*limit.maximum;
  const used=loadout.filter(w=>!w.isLeader&&(
   limit.kind==='power'?/\bpower (?:sword|axe|fist|maul|blade|weapon)\b/i.test(w.name):
   limit.kind==='handflamer'?/hand flamer/i.test(w.name):
   limit.kind==='plasmaPistol'?/plasma pistol/i.test(w.name):
   limit.kind==='breacherSpecial'?/\b(?:flamer|meltagun)\b/i.test(w.name):
   limit.kind==='thrallSpecial'?/\b(?:flamer|heavy stubber)\b/i.test(w.name):false
  )).reduce((total,w)=>total+w.count,0);
  if(used>limitCount)throw Error(limit.description+' (maximum '+limitCount+' for this formation; selected '+used+').');
 }
}
function minModels(el){
 const c=path(el,'constraints','constraint').find(x=>value(x,'type')==='min'&&value(x,'field')==='selections');
 const n=c?int(value(c,'value')):NaN;
 return Number.isFinite(n)?Math.max(0,n):0;
}
// New Recruit encodes squad sizes as mutually exclusive *upgrade* entries under
// "Required unit size and formation", not as type=model entries. The default
// branch determines both its minimum models and its mandatory starting points.
function formation(unit){
 const group=path(unit,'selectionEntryGroups','selectionEntryGroup').find(g=>/required unit size and formation/i.test(value(g,'name')));
 if(!group)return null;
 const entries=path(group,'selectionEntries','selectionEntry').filter(e=>value(e,'hidden')!=='true');
 if(!entries.length)return null;
 const choices=entries.map(e=>{
  const label=value(e,'name'); const m=label.match(/(?:^|\b)(\d{1,2})\s+(?:models?|afflicted)\b/i);
  return {id:value(e,'id'),label,models:m?Number(m[1]):null,points:pointsFrom(e),element:e};
 });
 const selected=choices.find(e=>e.id===value(group,'defaultSelectionEntryId'))||choices[0];
 return {group,choices,selected};
}
// Compile the selected formation into a serializable choice tree. Optional groups
// stay empty unless selected; nested menus are resolved only in the active branch.
function resolveEquipment(tree,selections={}){
 const weapons=[],slots=[],picks={};let points=0;
 function walk(node){
  points+=node.points||0;
  weapons.push(...(node.weapons||[]).map(w=>({...w})));
  for(const fixed of node.fixed||[])walk(fixed);
  for(const group of node.groups||[]){
   const requested=selections[group.id];
   const id=requested===undefined?group.selectedId:requested;
   const selected=group.choices.find(c=>c.id===id);
   if(!selected)throw Error('Invalid equipment choice in '+group.name+'.');
   picks[group.id]=id;
   if(group.choices.length>1)slots.push({...group,selectedId:id});
   walk(selected);
  }
 }
 walk(tree);
 return {weapons:mergeWeapons(weapons),slots,picks,points};
}
function sourceWeapons(doc,unit,form,profileIndex,selections={}){
 const profiles=profileIndex||new Map(descendants(doc.documentElement,'profile').filter(p=>value(p,'id')&&value(p,'typeName')==='Weapon').map(p=>[value(p,'id'),p]));
 const omitted=[];
 function directWeapons(current,count){
  const linked=path(current,'infoLinks','infoLink').filter(l=>value(l,'type')==='profile').map(l=>profiles.get(value(l,'targetId'))).filter(Boolean);
  const inline=path(current,'profiles','profile').filter(p=>value(p,'typeName')==='Weapon');
  const all=[...linked,...inline],label=value(current,'name');
  const branches=new Map();
  for(const p of all){const n=value(p,'name');const base=n.split(/\s[—–]\s/)[0];branches.set(base,(branches.get(base)||0)+1);}
  return all.map((profile,i)=>{
   const name=value(profile,'name'),mode=/melee|close combat/i.test(field(profile,'Range'))?'melee':'ranged';
   const data=parseWeapon(profile,mode);if(!data)return null;
   const base=name.split(/\s[—–]\s/)[0];
   // Explicit weapon multiplicities in fixed vehicle packages are independent
   // of the vehicle's model count (two lascannons on one Land Raider).
   const leading=label.match(/^(\d+)\s/);
   const weaponCopies=count===1&&leading&&i===0&&!/models?|afflicted|regular|thralls?|reavers?|warriors?|marines?|crew|team/i.test(label)?Number(leading[1]):1;
   return {...data,mode,name,count:count*weaponCopies,traits:field(profile,'Traits'),sourceProfileId:value(profile,'id'),
    ...(branches.get(base)>1?{alternativeGroup:value(current,'id')+'|'+base}:{}),
    attackValue:field(profile,'A'),damageValue:field(profile,'D')};
  }).filter(Boolean);
 }
 const hasWeapons=n=>[n,...descendants(n,'selectionEntry')].some(e=>path(e,'infoLinks','infoLink').some(l=>profiles.has(value(l,'targetId')))||path(e,'profiles','profile').some(p=>value(p,'typeName')==='Weapon'));
 function build(current,multiplier,depth=0){
  if(depth>45)throw Error('Equipment nesting exceeds the supported limit.');
  const label=value(current,'name');
  const troopCount=label.match(/^(\d{1,2})\s+(?:(?:regular|standard|remaining)\s+)?(?:Thralls?|Reavers?|Warriors?|Marines?|troops?|servitors?|scouts?)\b/i);
  const squadCount=label.match(/^(\d{1,2})\s+(?:Hellblades|Hellfangs|Crude blades|Chainaxes)$/i);
  const copies=multiplier*Number(troopCount?.[1]||squadCount?.[1]||1);
  const node={id:value(current,'id'),label,points:Number.isFinite(pointsFrom(current))?pointsFrom(current):0,weapons:directWeapons(current,copies),groups:[],fixed:[]};
  for(const entry of path(current,'selectionEntries','selectionEntry'))if(minModels(entry)>0&&value(entry,'hidden')!=='true')node.fixed.push(build(entry,copies*minModels(entry),depth+1));
  for(const group of path(current,'selectionEntryGroups','selectionEntryGroup')){
   const name=value(group,'name');
   if(/required unit size and formation/i.test(name)){
    if(form?.selected?.element)node.fixed.push(build(form.selected.element,copies,depth+1));
    continue;
   }
   if(/enhancement|deployment|passenger|leader|requisition|vanguard|insertion|invoker|externally secured/i.test(name))continue;
   const options=path(group,'selectionEntries','selectionEntry').filter(e=>value(e,'hidden')!=='true');
   if(!options.length||(!hasWeapons(group)&&!/flight configuration/i.test(name)))continue;
   const max=path(group,'constraints','constraint').find(c=>value(c,'type')==='max'&&value(c,'field')==='selections');
   if(max&&int(value(max,'value'))>1){omitted.push(name+': multiple-selection equipment group');continue;}
   const id=value(group,'id')||'group-'+hash(name),defaultId=value(group,'defaultSelectionEntryId');
   const required=minModels(group)>0||!!defaultId;
   const choices=options.map(e=>build(e,copies,depth+1));
   if(!required)choices.unshift({id:'__none__',label:'None',points:0,weapons:[],groups:[],fixed:[]});
   node.groups.push({id,name,selectedId:choices.some(c=>c.id===defaultId)?defaultId:choices[0].id,choices});
  }
  return node;
 }
 const tree=build(unit,1);
 const resolved=resolveEquipment(tree,selections);
 return {...resolved,tree,omitted};
}
function isArmouredVehicle(name,category){return /vehicle|tank|dreadnought|daemon engine|artillery|transport|aircraft|land raider|speeder|rhino|predator|vindicat|defiler|crawler|gunship|drop pod|siege engine|automata/i.test(name+' '+category);}
function collectUnitRoots(doc){
 const root=doc.documentElement,found=[],seen=new Set();
 const refs=new Map(descendants(root,'selectionEntry').filter(e=>value(e,'id')).map(e=>[value(e,'id'),e]));
 const add=(item)=>{if(!item)return;const id=value(item,'id')||value(item,'name');
  const type=value(item,'type'),isLeader=type==='model'&&descendants(item,'profile').some(p=>/Leader eligibility \/ attachments/i.test(value(p,'name')));
  if((type!=='unit'&&!isLeader)||!id||seen.has(id)||value(item,'hidden')==='true')return;
  seen.add(id);found.push(item);
 };
 const walkGroup=(group)=>{for(const e of children(group,'selectionEntries').flatMap(c=>children(c,'selectionEntry')))add(e);
  for(const link of children(group,'entryLinks').flatMap(c=>children(c,'entryLink')))add(refs.get(value(link,'targetId')));
  for(const sub of children(group,'selectionEntryGroups').flatMap(c=>children(c,'selectionEntryGroup')))walkGroup(sub);
 };
 for(const e of path(root,'selectionEntries','selectionEntry'))add(e);
 for(const link of path(root,'entryLinks','entryLink'))add(refs.get(value(link,'targetId')));
 for(const g of path(root,'selectionEntryGroups','selectionEntryGroup'))walkGroup(g);
 // Some New Recruit exports place their selectable root units in sharedSelectionEntries.
 if(found.length===0)for(const e of path(root,'sharedSelectionEntries','selectionEntry'))add(e);
 return found;
}
// The source descriptions are retained for an explicit coverage report. Only
// rules listed in ENGINE_ABILITY_NAMES have implemented, tested effects.
const ENGINE_ABILITY_NAMES=new Set([
 'Afflicted Ferocity','Guardian of Discipline','Keeper of Discipline',
 'Veteran of Diesor II','Judgment of Fire','Oath Without End',
 'Litany of Restraint','Warmaster of the Twice-Condemned',
 'Ashen Chain','Disciplined Line','Veterans of Two Judgments','Proven Blades',
 'Engine of Ruin','Entrenched','Mobile Fire','Mobile Spear',
 'Strafing Pass','Air-Defence Tracking','Interceptor','Patient Recon',
 'Controlled Fury','Butcher’s Precision','Demolition Arc','Armour Hunter',
 'Siege Machine','Heavy Legion Battery','Titan Breaker','Iron Predator',
 'Sustained Fire','Bound Targeter','Leviathan of Old','Breacher Shield',
 'Armoured Flight','Relic Plate','Blood-Bound Hunt','Blood God’s Assault',
 'Blood-Earned Discipline','Greater Daemon','Expeditionary Discipline',
 'Legion Rush','Relic Mobility','Pursuit Column','Fast Spearhead',
 'Bloodletter Invocation','Passenger Manifest & capacity','Mobile Bastion','Legion Carrier' 
]);
const PARTIAL_ABILITY_NAMES=new Set(['Afflicted Ferocity','Ashen Chain','Relic Plate','Legion Rush','Relic Mobility','Warmaster of the Twice-Condemned','Controlled Fury','Bloodletter Invocation','Passenger Manifest & capacity','Mobile Bastion','Legion Carrier']);
// Handlers do not establish full tabletop equivalence; these remain partial.
for(const name of ['Linked Fury','Outflank','Specialist Volley','Wrath Harness','Champion-Seeker','Linked Assault','Suppression Grid',
 'Custodian of Engines','Maintenance Crew','Serum Custodian','Neurological Stabilizers','Harbinger of Blood','Battlefield Dislocation',
 'Forge Liaison','Iron Column','The Voice Commands','Cohort Handler','Last Order','Skyborne Commander','Ashen Chain Commander',
 'Assault Jump Descent','Void-Knife Assault','Breach Veteran','Armoured Breakthrough','Falling Spear','Impact Assault','Shock Fright']){
 ENGINE_ABILITY_NAMES.add(name);PARTIAL_ABILITY_NAMES.add(name);
}
function unitAbilities(unit){
 return path(unit,'profiles','profile').filter(p=>value(p,'typeName')==='Ability').map(p=>({
  name:value(p,'name'),description:field(p,'Description').slice(0,4000),
  coverage:!ENGINE_ABILITY_NAMES.has(value(p,'name'))?'reference':PARTIAL_ABILITY_NAMES.has(value(p,'name'))?'partial':'modeled'
 })).filter(p=>p.name&&p.description).slice(0,35);
}
function rootProfile(unit){
 const profiles=descendants(unit,'profile').filter(p=>/^(Unit|Model)$/i.test(value(p,'typeName')));
 return profiles[0]||null;
}
function countFor(unit,name,cat){
 const formed=formation(unit)?.selected?.models;
 if(Number.isInteger(formed)&&formed>=1&&formed<=20)return formed;
 // Some source units do not use a Required Formation menu. Where their
 // composition text explicitly declares a quantity, respect that statement.
 const lines=[...descendants(unit,'description'),...descendants(unit,'characteristic').filter(x=>value(x,'name')==='Description')].map(x=>x.textContent||'');
 const declared=lines.find(x=>/Wargear \/ legal alternatives/i.test(x))||'';
 const exact=declared.match(/\bExactly\s+(ONE|TWO|THREE|FOUR|FIVE|\d{1,2})\s+attack bikes\b/i);
 const named={ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5};
 if(exact){const n=named[exact[1].toUpperCase()]||Number(exact[1]);if(n>0&&n<=20)return n;}
 const daemons=declared.match(/\b(\d{1,2})\s+Daemons?\s+with\b/i);
 if(daemons&&/^(Bloodletters|Flesh Hounds)$/i.test(name))return Number(daemons[1]);
 const group=path(unit,'selectionEntryGroups','selectionEntryGroup').find(g=>/^(\d{1,2})\s+(?:Bloodletters|Flesh Hounds)$/i.test(value(g,'name')));
 if(group)return Number(value(group,'name').match(/^(\d+)/)[1]);
 const troop=descendants(unit,'selectionEntry').filter(n=>value(n,'type')==='model');
 const count=troop.reduce((n,x)=>n+minModels(x),0);
 if(count>0)return Math.min(count,20);
 const own=minModels(unit);
 if(own>1)return Math.min(own,20);
 if(isArmouredVehicle(name,cat)||/character|command|captain|chaplain|lord|master|seer|hero|prince/i.test(name+' '+cat))return 1;
 return 5;
}
function getStats(unit,name,category){
 const p=rootProfile(unit);
 const vehicle=isArmouredVehicle(name,category);
 const m=field(p,'M'),move=bounded(Math.round(int(m)/2),1,8,vehicle?3:3);
 const t=bounded(int(field(p,'T')),2,16,vehicle?9:4);
 const save=bounded(int(field(p,'Sv')),2,6,vehicle?3:3);
 const wp=bounded(int(field(p,'W')),1,100,vehicle?10:2);
 const ld=bounded(int(field(p,'Ld')),2,9,7);
 const oc=bounded(int(field(p,'OC')),0,10,vehicle?3:2);
 return {move,t,save,wp,oc,ld};
}
function getPoints(unit,modelCount,stats){
 const form=formation(unit);
 const selected=form?.selected;
 if(selected&&Number.isFinite(selected.points)&&selected.points>0)return {points:bounded(Math.round(Math.max(0,pointsFrom(unit)||0)+selected.points),1,3000,120),estimated:false,basis:'formation'};
 const explicit=pointsFrom(unit);
 if(Number.isFinite(explicit)&&explicit>0)return {points:bounded(Math.round(explicit),1,3000,120),estimated:false,basis:'direct'};
 // Some catalogue entries charge by model, not at the parent unit entry.
 const model=descendants(unit,'selectionEntry').find(e=>value(e,'type')==='model'&&pointsFrom(e)>0);
 const perModel=model?pointsFrom(model):NaN;
 if(Number.isFinite(perModel)&&perModel>0)return {points:bounded(Math.round(perModel*modelCount),1,3000,120),estimated:false,basis:'per-model'};
 // This is explicitly a game-only placeholder, never presented as New Recruit points.
 return {points:bounded(Math.round(modelCount*stats.wp*(stats.t>=8?18:stats.save<=2?17:12)),25,650,120),estimated:true,basis:'estimate'};
}
function getWeapons(unit,stats){
 const profiles=descendants(unit,'profile').filter(p=>value(p,'typeName')==='Weapon');
 let ranged=null,melee=null;
 for(const profile of profiles){
  ranged ||=parseWeapon(profile,'ranged');
  melee ||=parseWeapon(profile,'melee');
  if(ranged&&melee)break;
 }
 return {ranged:ranged||{attacks:stats.t>=8?3:2,range:5,s:stats.t>=8?8:4,ap:0,damage:1,skill:3},
  melee:melee||{attacks:stats.t>=8?3:2,range:1,s:stats.t>=8?8:4,ap:0,damage:1,skill:3},
  rangedFromSource:!!ranged,meleeFromSource:!!melee};
}
function categoryFor(unit){const links=path(unit,'categoryLinks','categoryLink');return links.map(x=>value(x,'name')).filter(Boolean).slice(0,3).join(', ');}
function leaderTargets(unit){
 const ability=descendants(unit,'profile').find(p=>/Leader eligibility \/ attachments/i.test(value(p,'name')));
 if(!ability)return [];
 const statement=field(ability,'Description').split('. A standard bodyguard')[0];
 return statement.split(';').map(x=>x.replace(/\([^)]*\)/g,'').trim()).filter(x=>x.length>3&&x.length<110);
}
function isValidLeaderFor(squad,leader){
 if(!squad||!leader||!leader.isLeader||squad.faction!==leader.faction||squad.special?.mandatoryChaplain)return false;
 return Array.isArray(leader.leaderTargets)&&leader.leaderTargets.some(name=>name.toLowerCase()===squad.name.toLowerCase());
}
function mergeWeapons(weapons){
 const map=new Map();
 for(const w of weapons){if(!w||!Number.isFinite(w.count)||w.count<=0)continue;
  const key=(w.isLeader?'leader|':'')+w.mode+'|'+(w.sourceProfileId||w.name)+'|'+(w.alternativeGroup||'');
  const prev=map.get(key);if(prev)prev.count+=w.count;else map.set(key,{...w});
 }
 return [...map.values()].filter(w=>w.count>0).slice(0,80);
}
// Configures a linked unit from source formations and reachable equipment branches.
// Other New Recruit selection graphs are not silently guessed or treated as verified.
function configureUnit(base,config={},leaders=[]){
 if(!base||base.source!=='linked'||base.faction!=='IW'||!Array.isArray(base.formationConfigs)||!base.formationConfigs.length)throw Error('This datasheet does not support formation editing yet.');
 const form=base.formationConfigs.find(f=>f.id===(config.formationId||base.defaultFormationId));
 if(!form)throw Error('Requested formation is not present in the current New Recruit catalogue.');
 if(!Number.isInteger(form.models)||form.models<1||form.models>20)throw Error('Invalid squad size.');
 const resolved=form.equipmentTree?resolveEquipment(form.equipmentTree,config.gear):null;
 const picks=resolved?{...resolved.picks}:{},weapons=(resolved?resolved.weapons:form.loadout).map(w=>({...w}));
 let extra=resolved?resolved.points-(form.equipmentPoints||0):0;
 for(const slot of resolved?[]:form.slots){
  const requested=config.gear?.[slot.id];
  const selected=slot.choices.find(c=>c.id===(requested||slot.selectedId))||slot.choices[0];
  if(requested&&selected.id!==requested)throw Error('An equipment choice is no longer legal under this formation.');
  const original=slot.choices.find(c=>c.id===slot.selectedId)||slot.choices[0];
  picks[slot.id]=selected.id;
  if(selected.id!==original.id){
   for(const old of original.weapons){const target=weapons.find(w=>w.mode===old.mode&&w.sourceProfileId===old.sourceProfileId);
    if(target)target.count-=old.count;
   }
   weapons.push(...selected.weapons.map(w=>({...w})));
   extra+=(selected.points||0)-(original.points||0);
  }
 }
 enforceWargearLimits(base,form.models,weapons);
 const leader=config.leaderId?leaders.find(u=>u.id===config.leaderId):null;
 if(config.leaderId&&!isValidLeaderFor(base,leader))throw Error('This Leader is not eligible for the selected bodyguard.');
 if(leader)weapons.push(...(leader.loadout||[]).map(w=>({...w,count:Math.min(1,w.count),isLeader:true})));
 if(base.special?.mandatoryChaplain&&base.leader)weapons.push(...(base.leader.loadout||[]).map(w=>({...w,count:1,isLeader:true}))); 
 const sortedGear=Object.fromEntries(Object.entries(picks).sort((a,b)=>a[0].localeCompare(b[0])));
 const key=JSON.stringify([base.id,base.sourceVersion,form.id,sortedGear,leader?.id||'']);
 const variant={...base,equipmentSlots:resolved?.slots||form.slots,id:'cfg-'+base.id.slice(3)+'-'+hash(key),baseId:base.id,
  selectedFormation:form.id,selectedGear:sortedGear,leaderId:leader?.id||null,
  formationLabel:form.label,bodyguardModels:form.models,models:form.models+((leader||base.special?.mandatoryChaplain&&base.leader)?1:0),
  points:Math.max(1,Math.round((base.rootPoints||0)+(Number.isFinite(form.points)?form.points:base.points)+extra+(leader?.points||0))),
  loadout:mergeWeapons(weapons),leader:leader?{id:leader.id,name:leader.name,wp:leader.wp,ld:leader.ld,t:leader.t,save:leader.save,oc:leader.oc,points:leader.points,special:leader.special,abilities:leader.abilities||[]}:base.special?.mandatoryChaplain?base.leader:null,
  special:{...base.special},verification:'synced',visible:false,
  description:base.description+' · customized formation'+(leader?' with '+leader.name:'')};
 // Alternative formations may encode parent costs only: preserve published starting points.
 if(!Number.isFinite(form.points)||form.points<=0)variant.points=Math.max(1,base.points+extra+(leader?.points||0));
 if(resolved&&resolved.points>0)variant.points=Math.round(resolved.points+(leader?.points||0));
 const selectedLabels=resolved?.slots.map(s=>s.choices.find(c=>c.id===s.selectedId)?.label||'').join(' ')||'';
 if(/Low-Altitude Assault Skimmer/i.test(selectedLabels)){variant.special.aircraft=false;variant.move=7;variant.flightMode='skimmer';}
 else if(/Aircraft Interdictor/i.test(selectedLabels)){variant.special.aircraft=true;variant.flightMode='aircraft';}
 const ranged=variant.loadout.find(w=>w.mode==='ranged'&&!w.isLeader)||variant.loadout.find(w=>w.mode==='ranged');
 const melee=variant.loadout.find(w=>w.mode==='melee'&&!w.isLeader)||variant.loadout.find(w=>w.mode==='melee');
 if(ranged)variant.ranged={...ranged};if(melee)variant.melee={...melee};
 return variant;
}
// Hashing is used to spot drift in reviewed mappings. Git's full blob SHA,
// not this lightweight fingerprint, is the authoritative source revision pin.
function fingerprint(unit){
 const snapshot={id:unit.id,sourceId:unit.sourceId,faction:unit.faction,name:unit.name,points:unit.points,
  estimated:unit.estimated,models:unit.models,wp:unit.wp,ld:unit.ld,t:unit.t,save:unit.save,move:unit.move,oc:unit.oc,
  ranged:unit.ranged,melee:unit.melee,loadout:unit.loadout,sizeOptions:unit.sizeOptions,equipmentMenus:unit.equipmentMenus,formationConfigs:unit.formationConfigs,leaderTargets:unit.leaderTargets,rosterMax:unit.rosterMax,wargearLimits:unit.wargearLimits,special:unit.special,leader:unit.leader,abilities:unit.abilities,category:unit.category,audit:unit.audit,auditBlockers:unit.auditBlockers};
 return hash(JSON.stringify(snapshot));
}
function statusFor(unit,sourceVersion=unit?.sourceVersion||'',ledger=VERIFIED_LEDGER){
 if(!unit||unit.source!=='linked')return 'sim-estimate';
 // Source audit blockers and estimated points cannot be overridden by a ledger entry.
 if(unit.estimated||unit.audit?.points==='estimate'||unit.auditBlockers?.length)return 'synced';
 const approval=ledger[unit.id];
 if(!approval||!sourceVersion||approval.catalogueSha!==sourceVersion||approval.sourceId!==unit.sourceId||
    approval.rulesetVersion!==RULESET_VERSION||approval.fingerprint!==fingerprint(unit)||
    typeof approval.reviewer!=='string'||!approval.reviewer.trim()||!approval.reviewedAt||
    !REVIEW_CHECKS.every(k=>approval.checks?.[k]===true))return 'synced';
 return 'verified';
}
function reviewNotes(unit){
 if(!unit||unit.source!=='linked')return ['Built-in, simulator-only playtest profile; not imported from New Recruit.'];
 const a=unit.audit||{};
 const points=a.points==='formation'?'Starting points taken from the default required unit-size option (other sizes and extras may change the total).':a.points==='direct'?'Points read from the unit entry.':a.points==='per-model'?'Points extrapolated from a model entry; roster modifiers may change them.':'Points are a simulator estimate, not a published roster cost.';
 return [points,
  a.unitStats==='source'?'Unit characteristics read from the linked profile; movement is converted to grid squares.':'Some characteristics use simulator defaults.',
  a.modelCount==='declared'?'Starting model count read from the source formation or explicit composition.':'Starting model count is a simulator approximation.',
  a.ranged==='source'?'Ranged weapons resolved from selected default equipment; different weapons fire separately.':'Ranged attacks use a simulator fallback.',
  a.melee==='source'?'Melee weapons resolved from selected default equipment; different weapons attack separately.':'Melee attacks use a simulator fallback.',
  unit.loadout?.length?`Current default equipment: ${unit.loadout.slice(0,24).map(w=>`${w.count}× ${w.name} (${w.mode})`).join('; ')}${unit.loadout.length>24?'; additional profiles omitted':''}. Supported Infernal Warriors individual weapon choices are editable in your muster.`:'Weapon links in the default equipment could not be fully resolved.',
  unit.sizeOptions?.length?`Published size options: ${unit.sizeOptions.map(x=>`${x.label}${Number.isFinite(x.points)?' ('+x.points+' pts)':''}`).slice(0,14).join('; ')}. Eligible Infernal Warriors formations can be chosen in the muster editor.`:'No explicit size options were identified.',
  unit.special?.mandatoryChaplain?'Lost Cohort formation cost includes its mandatory starting Chaplain. Control tests, 12-inch substitute supervision, +1 afflicted melee Attack and pursuit behavior are modeled; reserves/deep strike remain provisional.':null,
  ...(unit.abilities||[]).filter(a=>!/^ROSTER CARD|^Unit rule \/|^Wargear \/|^Leader assignment/i.test(a.name)).slice(0,14).map(a=>`${a.coverage==='modeled'?'Battle effect implemented':a.coverage==='partial'?'Partially modeled':'Reference only'} — ${a.name}: ${a.description.slice(0,210)}`),
  Number.isInteger(unit.rosterMax)?`New Recruit roster limit: up to ${unit.rosterMax} copies of this datasheet per army.`:null,
  unit.wargearLimits?.length?`Audited equipment quotas: ${unit.wargearLimits.map(x=>x.description).join('; ')}.`:null,
  ...(unit.auditBlockers||[]).map(x=>'Audit blocker — '+x),
  statusFor(unit)==='verified'?'Full combat mapping reviewed and pinned to this catalogue revision.':'Wargear alternatives, restrictions and special rules have NOT been fully verified for the combat engine.'
 ].filter(Boolean);
}
// Source-derived blockers describe what still prevents a unit from being Verified.
function unitAuditBlockers(node,form,profileIndex,abilities){
 const problems=[];
 const options=descendants(node,'selectionEntryGroup').filter(g=>path(g,'selectionEntries','selectionEntry').length>1);
 const modifiers=descendants(node,'modifier').length,conditions=descendants(node,'condition').length;
 const inline=new Set(descendants(node,'profile').map(p=>value(p,'id')));
 const missing=descendants(node,'infoLink').filter(x=>value(x,'type')==='profile'&&value(x,'targetId')&&!profileIndex.has(value(x,'targetId'))&&!inline.has(value(x,'targetId'))).length;
 const pending=(abilities||[]).filter(a=>a.coverage!=='modeled'&&
  !/^(?:ROSTER CARD|Wargear \/|Unit rule \/|Unit composition \/|LEADER Assignment|Mortal war-host)/i.test(a.name));
 if(!form?.selected?.models)problems.push('Default model count needs full source verification.');
 if((form?.choices?.length||0)>1)problems.push((form.choices.length-1)+' alternative formation(s) need separate equipment and cost tests.');
 if(options.length)problems.push(options.length+' selectable equipment group(s) need complete legality checks.');
 if(modifiers||conditions)problems.push(modifiers+' modifier(s) and '+conditions+' condition(s) require exact points and availability evaluation.');
 if(missing)problems.push(missing+' weapon or ability reference(s) are not locally resolved.');
 if(pending.length)problems.push(pending.length+' reference-only or partially modeled ability descriptor(s) still need tests.');
 problems.push('Full visibility, detachment, mission and specialized movement/combat subsystems remain incomplete.');
 return problems;
}
function parseCatalogue(xml,faction,sourceVersion=''){
 if(!(faction in FILES))throw Error('Unknown catalogue faction.');
 if(typeof DOMParser==='undefined')throw Error('This browser does not support XML parsing.');
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 if(descendants(doc,'parsererror').length||doc.documentElement?.localName!=='catalogue')throw Error('New Recruit catalogue XML was invalid.');
 const nodes=collectUnitRoots(doc),revision=value(doc.documentElement,'revision');
 const profileIndex=new Map(descendants(doc.documentElement,'profile').filter(p=>value(p,'id')&&value(p,'typeName')==='Weapon').map(p=>[value(p,'id'),p]));
 const result=[];
 for(const node of nodes){
  const name=value(node,'name').trim();if(!name)continue;
  const form=formation(node);
  const linked=sourceWeapons(doc,node,form,profileIndex);
  const isLeader=value(node,'type')==='model'&&leaderTargets(node).length>0;
  const configs=faction==='IW'&&form?.choices.length?form.choices.map(c=>{
    const one=sourceWeapons(doc,node,{selected:c},profileIndex);
    return {id:c.id,label:c.label,models:c.models,points:c.points,loadout:one.weapons,
       slots:one.slots.filter(slot=>!!slot.id),equipmentTree:one.tree,equipmentPoints:one.points};
   }).filter(c=>Number.isInteger(c.models)&&c.models>=1&&c.models<=20).slice(0,22):[];
  const cat=categoryFor(node),stats=getStats(node,name,cat),models=isLeader?1:countFor(node,name,cat),p=getPoints(node,models,stats),weapons=getWeapons(node,stats);
  if(!p.estimated)p.points+=Math.max(0,linked.points-(pointsFrom(node)||0)-(form?.selected?.points||0));
  if(faction==='IW'&&!configs.length)configs.push({id:'default',label:'Published formation',models,points:p.points-(pointsFrom(node)||0),loadout:linked.weapons,slots:linked.slots,equipmentTree:linked.tree,equipmentPoints:linked.points});
  const id='nr-'+faction.toLowerCase()+'-'+slug(value(node,'id')||name)+'-'+hash(value(node,'id')||name).slice(0,4);
  const vehicle=isArmouredVehicle(name,cat),daemon=/Khorne Allies|\bDAEMON\b/i.test(cat)||/^(Bloodletters|Bloodthirster|Flesh Hounds|Herald of Khorne)$/i.test(name),mortal=/thrall|reaver|cultist|militia|mortal|directorate|servitor|civilian|operative cell|pexi 270th|tenth company scouts/i.test(name+' '+cat);
  const special=faction==='IW'&&!vehicle&&!mortal&&!daemon?{fnp:5,regen:1,painSensitive:true,...(/Lost Cohort/i.test(name)?{lost:true,mandatoryChaplain:true,painSensitive:false}:{})}:faction==='AD'?{shroud:!vehicle,nullifier:/nullifier/i.test(name)}:faction==='ST'?{psychic:!vehicle}:{};
  if(daemon)special.daemon=true;
  const profile=rootProfile(node);
  const fieldCoverage=['M','T','Sv','W','OC'].every(key=>!!field(profile,key));
  const sourceComposition=!!form?.selected?.models||!![...descendants(node,'description'),...descendants(node,'characteristic').filter(x=>value(x,'name')==='Description')].find(x=>/\bExactly\s+(ONE|TWO|THREE|FOUR|FIVE|\d+)\s+attack bikes\b|\b10\s+Daemons\s+with\b/i.test(x.textContent||''));
  const declaredModels=sourceComposition||descendants(node,'selectionEntry').filter(e=>value(e,'type')==='model').some(e=>minModels(e)>0)||minModels(node)>1;
  const unit={id,sourceId:value(node,'id'),sourceVersion,faction,name,points:p.points,models,abilities:unitAbilities(node),wp:stats.wp,ld:stats.ld,t:stats.t,save:stats.save,move:stats.move,oc:stats.oc,
   isLeader,leaderTargets:isLeader?leaderTargets(node):[],rosterMax:rosterMaximum(node),wargearLimits:faction==='IW'?wargearLimits(node):[],rootPoints:Number.isFinite(pointsFrom(node))?pointsFrom(node):0,
   defaultFormationId:form?.selected?.id||(configs.length?'default':null),formationConfigs:configs,
   ranged:(()=>{const found=linked.weapons.filter(w=>w.mode==='ranged');return found.length?{...found[0],range:Math.max(...found.map(w=>w.range))}:weapons.ranged;})(),
   melee:(()=>{const found=linked.weapons.filter(w=>w.mode==='melee');return found.length?{...found[0],range:Math.max(...found.map(w=>w.range))}:weapons.melee;})(),
   loadout:linked.weapons,sizeOptions:form?.choices.map(({id,label,models,points})=>({id,label,models,points}))||[],
   equipmentMenus:linked.slots,equipmentSlots:linked.slots,special,source:'linked',revision,estimated:p.estimated,category:cat,
   audit:{points:p.basis,unitStats:fieldCoverage?'source':'fallback',modelCount:declaredModels?'declared':'inferred',ranged:linked.weapons.some(w=>w.mode==='ranged')?'source':weapons.rangedFromSource?'source':'fallback',melee:linked.weapons.some(w=>w.mode==='melee')?'source':weapons.meleeFromSource?'source':'fallback'},
   description:`New Recruit ${cat||'datasheet'} · default squad size and wargear (playtest combat)${p.estimated?' · simulator point estimate':''}.`};
  unit.auditBlockers=[...unitAuditBlockers(node,form,profileIndex,unit.abilities),...linked.omitted];
  unit.keywords=path(node,'categoryLinks','categoryLink').map(c=>value(c,'name'));
  if(/Has Deep Strike|Deep Strike without/i.test(unit.abilities.map(a=>a.description).join(' ')))unit.special.deepStrike=true;
  if(/Terminator|Jump|Raptor|Dreadclaw|Kharybdis|Deathstorm/i.test(name))unit.special.deepStrike=true;
  if(/aircraft|gunship|interceptor|stormbird/i.test(name+' '+cat))unit.special.aircraft=true;
  if(/Deathstorm/i.test(name))unit.special.immobile=true;
  unit.verification=statusFor(unit,sourceVersion);
  result.push(unit);
 }
 // The Lost Cohort formations include one compulsory Chaplain in their points,
 // but New Recruit exposes that Chaplain as a separate character entry. Give
 // that paid model independent wounds and attacks without charging twice.
 if(faction==='IW'){
  const chaplainByName=new Map(result.filter(x=>x.isLeader).map(x=>[x.name,x]));
  for(const unit of result){
   if(!unit.special?.mandatoryChaplain)continue;
   const chaplain=chaplainByName.get(/Terminator/i.test(unit.name)?'Infernal Terminator Chaplain':'Infernal Chaplain');
   if(!chaplain)continue; // retain the source profile as Synced, not guessed.
   unit.bodyguardModels=unit.models;
   unit.models+=1;
   unit.leader={id:chaplain.id,name:chaplain.name,wp:chaplain.wp,ld:chaplain.ld,t:chaplain.t,
    save:chaplain.save,oc:chaplain.oc,points:0,special:{...chaplain.special},
    loadout:chaplain.loadout,abilities:chaplain.abilities,bundled:true};
   unit.special.bundledChaplain=true;
   unit.loadout=mergeWeapons([...unit.loadout,...(chaplain.loadout||[]).map(w=>({...w,count:1,isLeader:true}))]);
  }
 }
 if(result.length>MAX_TEMPLATES)throw Error('Catalogue contains unexpectedly many units.');
 return {faction,revision,units:result};
}
// Dictionary encoding keeps the complete choice trees within browser storage
// quotas. This is lossless and accepts only bounded, acyclic cache data.
function packCache(data){
 const strings=[],ids=new Map(),objects=[],objectIds=new Map();
 const intern=s=>{if(!ids.has(s)){ids.set(s,strings.length);strings.push(s);}return ids.get(s);};
 function encode(v){
  if(typeof v==='string')return [2,intern(v)];
  if(v&&typeof v==='object'){
   const key=JSON.stringify(v);if(objectIds.has(key))return [3,objectIds.get(key)];
   const a=Array.isArray(v)?[0,...v.map(encode)]:[1];
   if(!Array.isArray(v))for(const [k,x] of Object.entries(v))if(x!==undefined)a.push(intern(k),encode(x));
   const id=objects.length;objects.push(a);objectIds.set(key,id);return [3,id];
  }
  return v;
 }
 const payload=encode(data);return JSON.stringify({packed:2,strings,objects,payload});
}
function unpackCache(packed){
 if(![1,2].includes(packed?.packed))return packed;
 if(!Array.isArray(packed.strings)||packed.strings.length>200000||packed.strings.some(s=>typeof s!=='string'||s.length>20000))throw Error('Invalid cache dictionary.');
 let nodes=0;
 const string=i=>{if(!Number.isInteger(i)||i<0||i>=packed.strings.length)throw Error('Invalid cache reference.');return packed.strings[i];};
 function decode(v,depth=0){
  if(++nodes>3000000||depth>100)throw Error('Cache exceeds supported size.');
  if(!Array.isArray(v))return v;
  if(v[0]===3&&v.length===2){if(!Array.isArray(packed.objects)||!Number.isInteger(v[1])||v[1]<0||v[1]>=packed.objects.length)throw Error('Invalid object reference.');return decode(packed.objects[v[1]],depth+1);}
  if(v[0]===2&&v.length===2)return string(v[1]);
  if(v[0]===0)return v.slice(1).map(x=>decode(x,depth+1));
  if(v[0]===1&&v.length%2===1){const o={};for(let i=1;i<v.length;i+=2){const k=string(v[i]);if(['__proto__','constructor','prototype'].includes(k))throw Error('Invalid cache key.');o[k]=decode(v[i+1],depth+1);}return o;}
  throw Error('Invalid packed cache.');
 }
 return decode(packed.payload);
}
function readCache(storage){
 try{
  const raw=(storage||localStorage).getItem(CACHE_KEY)||'null';if(raw.length>12000000)return null;
  const data=unpackCache(JSON.parse(raw));
  if(data?.v!==CACHE_VERSION||!data.cachedAt||Date.now()-data.cachedAt>MAX_CACHE_AGE)return null;
  if(!data.catalogues||typeof data.catalogues!=='object')return null;
  for(const [f,x] of Object.entries(data.catalogues)){
   if(!(f in FILES)||!Array.isArray(x.units)||x.units.length>MAX_TEMPLATES)return null;
   for(const u of x.units){
    if(u.faction!==f||typeof u.name!=='string'||!u.id?.startsWith('nr-')||!Number.isFinite(u.points)||u.points<1)return null;
    // The local cache is untrusted and a source update may invalidate prior verification.
    // Always derive the status from the pinned review ledger, never trust a cached badge.
    u.source='linked';u.sourceVersion=x.version;u.verification=statusFor(u,x.version);
   }
  }
  return data;
 }catch(e){return null;}
}
function writeCache(data,storage){try{(storage||localStorage).setItem(CACHE_KEY,packCache(data));return true;}catch(e){return false;}}
async function fetchJson(url,request){const resp=await request(url,{cache:'no-store',credentials:'omit'});if(!resp.ok)throw Error(`GitHub returned HTTP ${resp.status}`);return resp.json();}
async function fetchText(url,request){const resp=await request(url,{cache:'no-store',credentials:'omit'});if(!resp.ok)throw Error(`Catalogue request returned HTTP ${resp.status}`);return resp.text();}
async function readVersions(request){
 try{
  const tree=await fetchJson(TREE,request);
  if(!Array.isArray(tree.tree))throw Error('No file tree returned.');
  const versions={};
  for(const [f,file] of Object.entries(FILES))versions[f]=tree.tree.find(x=>x.path===file&&x.type==='blob')?.sha||null;
  if(!Object.values(versions).some(Boolean))throw Error('Catalogue files not found in upstream repository.');
  return {versions,source:'GitHub tree'};
 }catch(error){
  // GitHub anonymous API limits can be reached; use the public manifest as a fallback.
  const manifest=await fetchJson(MANIFEST,request);
  const versions={};for(const [f,file] of Object.entries(FILES))versions[f]=manifest.files?.find(x=>x.file===file)?.sha256||null;
  if(!Object.values(versions).some(Boolean))throw Error('New Recruit manifest had no catalogue revisions.');
  return {versions,source:'catalogue manifest'};
 }
}
async function verifySourceVersion(xml,version){
 if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(version))return;
 if(!globalThis.crypto?.subtle)throw Error('A secure browser context is required to verify catalogue revisions.');
 const bytes=new TextEncoder().encode(xml);
 let input=bytes,algorithm='SHA-256';
 if(version.length===40){const header=new TextEncoder().encode('blob '+bytes.length+'\0');input=new Uint8Array(header.length+bytes.length);input.set(header);input.set(bytes,header.length);algorithm='SHA-1';}
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest(algorithm,input)),b=>b.toString(16).padStart(2,'0')).join('');
 if(digest!==version.toLowerCase())throw Error('The source changed during sync. Sync again to load a matching revision.');
}
async function sync({request=fetch,storage,force=false,onUpdate=()=>{},onStatus=()=>{}}={}){
 const cached=readCache(storage),data=cached||{v:CACHE_VERSION,cachedAt:Date.now(),catalogues:{}};
 let versions,versionSource;
 try{({versions,source:versionSource}=await readVersions(request));}
 catch(e){onStatus({type:'offline',message:`Unable to check New Recruit: ${e.message}`,cached:!!cached});return {ok:false,cached:!!cached,error:e.message,counts:Object.fromEntries(Object.entries(data.catalogues).map(([f,x])=>[f,x.units.length]))};}
 let changed=0,failed=0;
 for(const [f,file] of Object.entries(FILES)){
  if(!versions[f])continue;
  if(!force&&data.catalogues[f]?.version===versions[f]){onStatus({type:'unchanged',faction:f,count:data.catalogues[f].units.length});continue;}
  onStatus({type:'loading',faction:f,message:`Loading ${f} from New Recruit…`});
  try{
   const xml=await fetchText(RAW+file+'?v='+encodeURIComponent(versions[f]),request);
   await verifySourceVersion(xml,versions[f]);
   const parsed=parseCatalogue(xml,f,versions[f]);
   if(!parsed.units.length&&f!=='ST')throw Error('No playable root units were found.');
   data.catalogues[f]={version:versions[f],revision:parsed.revision,units:parsed.units};
   data.cachedAt=Date.now();if(!writeCache(data,storage))onStatus({type:'cache-warning',message:'Units loaded, but browser storage is full. Offline reuse is unavailable until space is freed.'});
   changed++;onUpdate(f,parsed.units);onStatus({type:'loaded',faction:f,count:parsed.units.length,revision:parsed.revision});
  }catch(error){failed++;onStatus({type:'error',faction:f,message:`${f}: ${error.message}`,cached:!!data.catalogues[f]});}
 }
 if(changed===0&&failed===0){data.cachedAt=Date.now();if(!writeCache(data,storage))onStatus({type:'cache-warning',message:'Units loaded, but browser storage is full. Offline reuse is unavailable until space is freed.'});}
 const counts=Object.fromEntries(Object.entries(data.catalogues).map(([f,x])=>[f,x.units.length]));
 return {ok:failed===0,changed,failed,counts,versionSource,cached:!!cached};
}
return {REPOSITORY,FILES,CACHE_KEY,CACHE_VERSION,RULESET_VERSION,VERIFIED_LEDGER,formation,sourceWeapons,resolveEquipment,configureUnit,isValidLeaderFor,rosterMaximum,wargearLimits,enforceWargearLimits,fingerprint,statusFor,reviewNotes,parseCatalogue,collectUnitRoots,readCache,writeCache,packCache,unpackCache,verifySourceVersion,sync,readVersions};
});
