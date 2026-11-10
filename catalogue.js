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
const CACHE_KEY='gaul-campaign-catalogue-cache-v5';
const CACHE_VERSION=5;
const RAW=`https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}/`;
const TREE=`https://api.github.com/repos/${REPOSITORY}/git/trees/${BRANCH}`;
const MANIFEST=RAW+'catalogue-manifest.json';
const MAX_CACHE_AGE=45*24*3600*1000;
const MAX_TEMPLATES=600;
// A VERIFIED badge is only issued for an explicitly reviewed, revision-pinned combat
// mapping. No imported unit is automatically considered verified. Entries are added
// to this ledger only after full profile, loadout, rule, composition and engine tests.
// The initial ledger is intentionally empty; see docs/VERIFICATION_POLICY.md.
const RULESET_VERSION='alpha-0.6';
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
 return {attacks:bounded(attacks,1,10,2),range:mode==='melee'?1:bounded(dist/2,1,12,5),
  s:bounded(strength,2,22,4),ap:bounded(Math.abs(ap),0,5,0),damage:bounded(damage,1,9,1),skill:bounded(skill,2,6,3)};
}
function pointsFrom(element){
 const costs=path(element,'costs','cost').filter(c=>/^(pts|points)$/i.test(value(c,'name')));
 return costs.length?int(value(costs[0],'value')):NaN;
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
function sourceWeapons(doc,unit,form,profileIndex,selections={}){
 const profiles=profileIndex||new Map(descendants(doc.documentElement,'profile').filter(p=>value(p,'id')&&value(p,'typeName')==='Weapon').map(p=>[value(p,'id'),p]));
 const weapons=[],slots=[],maxDepth=45;
 function directWeapons(current,count){
  const result=[];
  for(const link of path(current,'infoLinks','infoLink')){
   if(value(link,'type')!=='profile')continue;
   const profile=profiles.get(value(link,'targetId'));
   if(!profile)continue;
   const mode=/melee|close combat/i.test(field(profile,'Range'))?'melee':'ranged';
   const data=parseWeapon(profile,mode);
   if(data)result.push({...data,mode,name:value(profile,'name'),count,traits:field(profile,'Traits'),sourceProfileId:value(profile,'id'),attackValue:field(profile,'A'),damageValue:field(profile,'D')});
  }
  return result;
 }
 function walk(current,multiplier,depth){
  if(depth>maxDepth)return;
  const label=value(current,'name');
  const countMatch=label.match(/^(\d{1,2})\s+(?:(?:regular|standard|remaining)\s+)?(?:[A-Za-z][^—:]*?)(?:\s+[—:]|\s*—)/);
  const plainSquadWeapon=label.match(/^(\d{1,2})\s+(?:Hellblades|Hellfangs|Crude blades|Chainaxes)$/i);
  const count=countMatch&&countMatch[1]&&/regular|standard|thrall|reaver|warrior|marine|troop|servitor|scout/i.test(label)?Math.min(20,Number(countMatch[1])):plainSquadWeapon?Math.min(20,Number(plainSquadWeapon[1])):1;
  const copies=multiplier*count;
  weapons.push(...directWeapons(current,copies));
  for(const group of path(current,'selectionEntryGroups','selectionEntryGroup')){
   const options=path(group,'selectionEntries','selectionEntry').filter(e=>value(e,'hidden')!=='true');
   if(!options.length)continue;
   const selected=options.find(e=>value(e,'id')===value(group,'defaultSelectionEntryId'))||options[0];
   const candidates=options.map(e=>({id:value(e,'id'),label:value(e,'name'),points:pointsFrom(e),
    weapons:directWeapons(e,copies),nested:path(e,'selectionEntryGroups','selectionEntryGroup').length>0}));
   // Only flat, fully resolved equipment alternatives are editable. Nested menus,
   // enhancements and deployment choices require dedicated rule implementations.
   const isWargear=options.length>1 && options.length<=45 && candidates.every(o=>o.weapons.length>0&&!o.nested)
      && /champion|warrior|weapons?|wargear|specialist|reaver|troop|marine|scout|servitor|gunner|turret|pistol|melee/i.test(value(group,'name'));
   if(isWargear && slots.length<40){
    slots.push({id:value(group,'id'),name:value(group,'name'),selectedId:value(selected,'id'),
       choices:candidates.map(({id,label,points,weapons})=>({id,label,points:Number.isFinite(points)?points:0,weapons}))});
   }
   const chosen=options.find(e=>value(e,'id')===selections[value(group,'id')])||selected;
   walk(chosen,copies,depth+1);
  }
 }
 walk(form?.selected?.element||unit,1,0);
 const merged=new Map();
 for(const w of weapons){const key=w.mode+'|'+w.sourceProfileId;const prior=merged.get(key);if(prior)prior.count+=w.count;else merged.set(key,{...w});}
 return {weapons:[...merged.values()].slice(0,80),slots};
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
 const wp=bounded(int(field(p,'W')),1,24,vehicle?10:2);
 const oc=bounded(int(field(p,'OC')),0,10,vehicle?3:2);
 return {move,t,save,wp,oc};
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
  const key=(w.isLeader?'leader|':'')+w.mode+'|'+(w.sourceProfileId||w.name);
  const prev=map.get(key);if(prev)prev.count+=w.count;else map.set(key,{...w});
 }
 return [...map.values()].filter(w=>w.count>0).slice(0,80);
}
// Configures a linked unit from source-encoded legal formations and FLAT weapon menus.
// Other New Recruit selection graphs are not silently guessed or treated as verified.
function configureUnit(base,config={},leaders=[]){
 if(!base||base.source!=='linked'||base.faction!=='IW'||!Array.isArray(base.formationConfigs)||!base.formationConfigs.length||base.isLeader)throw Error('This datasheet does not support formation editing yet.');
 const form=base.formationConfigs.find(f=>f.id===(config.formationId||base.defaultFormationId));
 if(!form)throw Error('Requested formation is not present in the current New Recruit catalogue.');
 if(!Number.isInteger(form.models)||form.models<1||form.models>20)throw Error('Invalid squad size.');
 const picks={},weapons=form.loadout.map(w=>({...w}));
 let extra=0;
 for(const slot of form.slots){
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
 const leader=config.leaderId?leaders.find(u=>u.id===config.leaderId):null;
 if(config.leaderId&&!isValidLeaderFor(base,leader))throw Error('This Leader is not eligible for the selected bodyguard.');
 if(leader)weapons.push(...(leader.loadout||[]).map(w=>({...w,count:Math.min(1,w.count),isLeader:true})));
 const sortedGear=Object.fromEntries(Object.entries(picks).sort((a,b)=>a[0].localeCompare(b[0])));
 const key=JSON.stringify([base.id,base.sourceVersion,form.id,sortedGear,leader?.id||'']);
 const variant={...base,id:'cfg-'+base.id.slice(3)+'-'+hash(key),baseId:base.id,
  selectedFormation:form.id,selectedGear:sortedGear,leaderId:leader?.id||null,
  formationLabel:form.label,bodyguardModels:form.models,models:form.models+(leader?1:0),
  points:Math.max(1,Math.round((base.rootPoints||0)+(Number.isFinite(form.points)?form.points:base.points)+extra+(leader?.points||0))),
  loadout:mergeWeapons(weapons),leader:leader?{id:leader.id,name:leader.name,wp:leader.wp,t:leader.t,save:leader.save,oc:leader.oc,points:leader.points,special:leader.special}:null,
  special:{...base.special},verification:'synced',visible:false,
  description:base.description+' · customized formation'+(leader?' with '+leader.name:'')};
 // Alternative formations may encode parent costs only: preserve published starting points.
 if(!Number.isFinite(form.points)||form.points<=0)variant.points=Math.max(1,base.points+extra+(leader?.points||0));
 const ranged=variant.loadout.find(w=>w.mode==='ranged'&&!w.isLeader)||variant.loadout.find(w=>w.mode==='ranged');
 const melee=variant.loadout.find(w=>w.mode==='melee'&&!w.isLeader)||variant.loadout.find(w=>w.mode==='melee');
 if(ranged)variant.ranged={...ranged};if(melee)variant.melee={...melee};
 return variant;
}
// Hashing is used to spot drift in reviewed mappings. Git's full blob SHA,
// not this lightweight fingerprint, is the authoritative source revision pin.
function fingerprint(unit){
 const snapshot={id:unit.id,sourceId:unit.sourceId,faction:unit.faction,name:unit.name,points:unit.points,
  estimated:unit.estimated,models:unit.models,wp:unit.wp,t:unit.t,save:unit.save,move:unit.move,oc:unit.oc,
  ranged:unit.ranged,melee:unit.melee,loadout:unit.loadout,sizeOptions:unit.sizeOptions,equipmentMenus:unit.equipmentMenus,formationConfigs:unit.formationConfigs,leaderTargets:unit.leaderTargets,special:unit.special,category:unit.category,audit:unit.audit};
 return hash(JSON.stringify(snapshot));
}
function statusFor(unit,sourceVersion=unit?.sourceVersion||'',ledger=VERIFIED_LEDGER){
 if(!unit||unit.source!=='linked')return 'sim-estimate';
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
  unit.special?.mandatoryChaplain?'Lost Cohort default cost includes its mandatory attached Chaplain; attachment and control tests remain unmodeled.':null,
  statusFor(unit)==='verified'?'Full combat mapping reviewed and pinned to this catalogue revision.':'Wargear alternatives, restrictions and special rules have NOT been fully verified for the combat engine.'
 ].filter(Boolean);
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
  const configs=faction==='IW'&&!isLeader&&form?.choices.length?form.choices.map(c=>{
    const one=sourceWeapons(doc,node,{selected:c},profileIndex);
    return {id:c.id,label:c.label,models:c.models,points:c.points,loadout:one.weapons,
       slots:one.slots.filter(slot=>!!slot.id)};
   }).filter(c=>Number.isInteger(c.models)&&c.models>=1&&c.models<=20).slice(0,22):[];
  const cat=categoryFor(node),stats=getStats(node,name,cat),models=isLeader?1:countFor(node,name,cat),p=getPoints(node,models,stats),weapons=getWeapons(node,stats);
  const id='nr-'+faction.toLowerCase()+'-'+slug(value(node,'id')||name)+'-'+hash(value(node,'id')||name).slice(0,4);
  const vehicle=isArmouredVehicle(name,cat),daemon=/Khorne Allies|\bDAEMON\b/i.test(cat)||/^(Bloodletters|Bloodthirster|Flesh Hounds|Herald of Khorne)$/i.test(name),mortal=/thrall|reaver|cultist|militia|mortal|directorate|servitor|civilian|operative cell/i.test(name+' '+cat);
  const special=faction==='IW'&&!vehicle&&!mortal&&!daemon?{fnp:5,regen:1,...(/Lost Cohort/i.test(name)?{lost:true,mandatoryChaplain:true}:{})}:faction==='AD'?{shroud:!vehicle,nullifier:/nullifier/i.test(name)}:faction==='ST'?{psychic:!vehicle}:{};
  const profile=rootProfile(node);
  const fieldCoverage=['M','T','Sv','W','OC'].every(key=>!!field(profile,key));
  const sourceComposition=!!form?.selected?.models||!![...descendants(node,'description'),...descendants(node,'characteristic').filter(x=>value(x,'name')==='Description')].find(x=>/\bExactly\s+(ONE|TWO|THREE|FOUR|FIVE|\d+)\s+attack bikes\b|\b10\s+Daemons\s+with\b/i.test(x.textContent||''));
  const declaredModels=sourceComposition||descendants(node,'selectionEntry').filter(e=>value(e,'type')==='model').some(e=>minModels(e)>0)||minModels(node)>1;
  const unit={id,sourceId:value(node,'id'),sourceVersion,faction,name,points:p.points,models,wp:stats.wp,t:stats.t,save:stats.save,move:stats.move,oc:stats.oc,
   isLeader,leaderTargets:isLeader?leaderTargets(node):[],rootPoints:Number.isFinite(pointsFrom(node))?pointsFrom(node):0,
   defaultFormationId:form?.selected?.id||null,formationConfigs:configs,
   ranged:(()=>{const found=linked.weapons.filter(w=>w.mode==='ranged');return found.length?{...found[0],range:Math.max(...found.map(w=>w.range))}:weapons.ranged;})(),
   melee:(()=>{const found=linked.weapons.filter(w=>w.mode==='melee');return found.length?{...found[0],range:Math.max(...found.map(w=>w.range))}:weapons.melee;})(),
   loadout:linked.weapons,sizeOptions:form?.choices.map(({id,label,models,points})=>({id,label,models,points}))||[],
   equipmentMenus:linked.slots,special,source:'linked',revision,estimated:p.estimated,category:cat,
   audit:{points:p.basis,unitStats:fieldCoverage?'source':'fallback',modelCount:declaredModels?'declared':'inferred',ranged:linked.weapons.some(w=>w.mode==='ranged')?'source':weapons.rangedFromSource?'source':'fallback',melee:linked.weapons.some(w=>w.mode==='melee')?'source':weapons.meleeFromSource?'source':'fallback'},
   description:`New Recruit ${cat||'datasheet'} · default squad size and wargear (playtest combat)${p.estimated?' · simulator point estimate':''}.`};
  unit.verification=statusFor(unit,sourceVersion);
  result.push(unit);
 }
 if(result.length>MAX_TEMPLATES)throw Error('Catalogue contains unexpectedly many units.');
 return {faction,revision,units:result};
}
function readCache(storage){
 try{
  const data=JSON.parse((storage||localStorage).getItem(CACHE_KEY)||'null');
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
function writeCache(data,storage){try{(storage||localStorage).setItem(CACHE_KEY,JSON.stringify(data));return true;}catch(e){return false;}}
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
   const parsed=parseCatalogue(xml,f,versions[f]);
   if(!parsed.units.length&&f!=='ST')throw Error('No playable root units were found.');
   data.catalogues[f]={version:versions[f],revision:parsed.revision,units:parsed.units};
   data.cachedAt=Date.now();writeCache(data,storage);
   changed++;onUpdate(f,parsed.units);onStatus({type:'loaded',faction:f,count:parsed.units.length,revision:parsed.revision});
  }catch(error){failed++;onStatus({type:'error',faction:f,message:`${f}: ${error.message}`,cached:!!data.catalogues[f]});}
 }
 if(changed===0&&failed===0){data.cachedAt=Date.now();writeCache(data,storage);}
 const counts=Object.fromEntries(Object.entries(data.catalogues).map(([f,x])=>[f,x.units.length]));
 return {ok:failed===0,changed,failed,counts,versionSource,cached:!!cached};
}
return {REPOSITORY,FILES,CACHE_KEY,RULESET_VERSION,VERIFIED_LEDGER,formation,sourceWeapons,configureUnit,isValidLeaderFor,fingerprint,statusFor,reviewNotes,parseCatalogue,collectUnitRoots,readCache,writeCache,sync,readVersions};
});
