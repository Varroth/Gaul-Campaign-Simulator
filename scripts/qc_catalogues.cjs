/* Execute actual catalogue imports, equipment branches, saves and battles.
   This is software QA, not a claim of complete tabletop rules equivalence. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
global.DOMParser=require('@xmldom/xmldom').DOMParser;
const C=require('../catalogue');
const E=require('../engine');
const source=process.argv[2]||'upstream',out=process.argv[3]||'verification-artifacts';
fs.mkdirSync(out,{recursive:true});
const report={scope:'Import, configuration, save and battle execution; not full tabletop verification',catalogues:{},units:[],failures:[],cacheBytes:0};
const cache={v:C.CACHE_VERSION,cachedAt:Date.now(),catalogues:{}};
const check=(label,fn)=>{try{return fn();}catch(e){report.failures.push({label,error:e.message});return null;}};
const supported=[];
for(const [f,file] of Object.entries(C.FILES)){
 const xml=fs.readFileSync(path.join(source,file),'utf8');
 const sha=crypto.createHash('sha1').update('blob '+Buffer.byteLength(xml)+'\0').update(xml).digest('hex');
 const parsed=check(file,()=>C.parseCatalogue(xml,f,sha));if(!parsed)continue;
 const {units,revision}=parsed;
 assert.equal(new Set(units.map(u=>u.id)).size,units.length,'Duplicate import IDs');
 const registered=E.registerLinked(f,units);
 check(f+' registration',()=>assert.equal(registered,units.length));
 report.catalogues[f]={file,sha,revision,imported:units.length,registered};
 cache.catalogues[f]={version:sha,revision,units};supported.push(...units);
 fs.writeFileSync(path.join(out,f.toLowerCase()+'-parsed.json'),JSON.stringify(units));
}
const active=(t,side)=>({uid:side[0]+'0',template:t.id,side,x:side==='player'?2:5,y:0,deployment:'field',models:t.models,injury:0,leaderAlive:!!t.leader,leaderInjury:0,control:'controlled',moved:false,shot:false,charged:false,fought:false,battleshocked:false});
for(const unit of supported){
 const row={id:unit.sourceId,name:unit.name,faction:unit.faction,models:unit.models,points:unit.points,estimated:unit.estimated,formations:0,equipmentChoices:0,quotaRejections:0,combatChecks:0,remainingRules:unit.auditBlockers||[]};
 report.units.push(row);
 check(unit.name+' characteristics',()=>{
  for(const key of ['points','models','wp','t','save','move','oc'])assert.ok(Number.isFinite(unit[key]),key+' not finite');
  assert.ok(unit.loadout.every(w=>Number.isInteger(w.count)&&w.count>0),'Invalid weapon count');
 });
 for(const form of unit.formationConfigs||[]){
  const v=check(unit.name+' / '+form.label,()=>C.configureUnit(unit,{formationId:form.id}));if(!v)continue;
  row.formations++;E.registerConfiguration(v);
  check(unit.name+' formation points',()=>assert.ok(v.points>0&&Number.isInteger(v.points)));
  // Traverse every reachable equipment branch independently, preserving
  // ancestor choices. Invalid quota combinations must be rejected explicitly.
  function visit(node,picks){
   for(const fixed of node.fixed||[])visit(fixed,picks);
   for(const group of node.groups||[]){
    for(const choice of group.choices){
     const gear={...picks,[group.id]:choice.id};row.equipmentChoices++;
     try{const chosen=C.configureUnit(unit,{formationId:form.id,gear});assert.ok(chosen.points>0);assert.ok(chosen.loadout.every(w=>w.count>0));}
     catch(e){if(/maximum .*selected/.test(e.message))row.quotaRejections++;else report.failures.push({label:unit.name+' / '+group.name+' / '+choice.label,error:e.message});}
     visit(choice,gear);
    }
   }
  }
  if(form.equipmentTree)visit(form.equipmentTree,{});
 }
 // Fixed combat state isolates each actual imported profile, including allies
 // whose full army would need additional units to satisfy their points cap.
 for(const mode of ['ranged','melee'])check(unit.name+' '+mode+' execution',()=>{
  const opponent=E.BY_ID['ad-armor'];const a=active(unit,'player'),b=active(opponent,'enemy');
  if(mode==='melee')b.x=3;
  const g={version:2,units:[a,b],settings:{player:[unit.id],enemy:[opponent.id]},seed:100,seedState:100,round:2,active:'player',phase:mode==='ranged'?'shooting':'fight',finished:false,score:{player:0,enemy:0},objectives:E.OBJECTIVES,log:[]};
  const legal=E.canAttack(g,a.uid,b.uid,mode),result=E.attack(g,a.uid,b.uid,mode);
  assert.equal(result.ok,legal,'UI/engine attack legality diverged');
  if(result.ok)for(const key of ['attacks','hits','wounds','damage','casualties'])assert.ok(Number.isFinite(result[key])&&result[key]>=0,key);
  for(const u of g.units){const s=E.status(u);assert.ok(s.hp>=0&&s.hp<=s.maxHp,'Wound accounting');}
  row.combatChecks++;
 });
}
// Source assertions are intentionally concrete, separate from execution smoke tests.
const iw=cache.catalogues.IW.units,byName=n=>iw.find(u=>u.name===n);
check('source optional Rhino pintle stays unequipped',()=>assert.equal(byName('Rhino Carrier').loadout.filter(w=>w.mode==='ranged').reduce((n,w)=>n+w.count,0),1));
check('source Land Raider carries two twin lascannons',()=>assert.equal(byName('Land Raider').loadout.find(w=>w.name==='Twin lascannons').count,2));
check('Pexi mortals receive no Infernal Serum',()=>{for(const u of iw.filter(u=>u.name.startsWith('Pexi 270th')))assert.equal(u.special.fnp,undefined);});
check('uninducted Tenth Company Scouts receive no Infernal Serum',()=>{for(const u of iw.filter(u=>u.name.startsWith('Tenth Company Scouts')))assert.equal(u.special.fnp,undefined);});
check('Mastodon retains all thirty published wounds',()=>assert.equal(byName('Mastodon Heavy Transport').wp,30));
check('Fellblade retains all twenty-six published wounds',()=>assert.equal(byName('Fellblade Super-heavy').wp,26));
check('source Deathstorm cannot move after landing',()=>assert.equal(byName('Deathstorm Drop Pod').special.immobile,true));
check('source all twelve transport capacities',()=>assert.equal(iw.filter(u=>E.transportSpec(u)).length,12));
const memory=new Map();
check('offline cache within standard browser quota',()=>{
 const storage={setItem:(k,v)=>{report.cacheBytes=v.length*2;assert.ok(report.cacheBytes<5*1024*1024,'Cache exceeds 5 MiB');memory.set(k,v);},getItem:k=>memory.get(k)};
 assert.equal(C.writeCache(cache,storage),true);const restored=C.readCache(storage);assert.ok(restored,'Cache read failed');
 for(const f of Object.keys(cache.catalogues))assert.equal(JSON.stringify(restored.catalogues[f].units),JSON.stringify(cache.catalogues[f].units),'Cache changed profile data for '+f);
});
check('paid reserve transport manifest survives save and complete battle',()=>{
 const carrier=byName('Dreadclaw Drop Pod'),squad=byName('Despoiler Cadre');
 const g=E.createGame({player:[carrier.id,squad.id,squad.id],enemy:['ad-breach','ad-shadow'],deployment:{player:['deepstrike','embark:0','embark:0'],enemy:['field','reserve']},seed:511});
 E.validateLoadedState(structuredClone(g));E.finishByAuto(g);assert.equal(g.finished,true);E.validateLoadedState(structuredClone(g));
});
report.summary={units:report.units.length,formations:report.units.reduce((n,u)=>n+u.formations,0),equipmentChoices:report.units.reduce((n,u)=>n+u.equipmentChoices,0),combatChecks:report.units.reduce((n,u)=>n+u.combatChecks,0),failures:report.failures.length};
fs.writeFileSync(path.join(out,'catalogue-qc.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({summary:report.summary,catalogues:report.catalogues,cacheBytes:report.cacheBytes,failures:report.failures.slice(0,20)},null,2));
if(report.failures.length)process.exitCode=1;
