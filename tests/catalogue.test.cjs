const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../catalogue.js');
const E=require('../engine.js');
function store(initial){const entries=new Map(Object.entries(initial||{}));return {getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};}
const template=(name,id)=>({id:id||'nr-iw-smoke-a1',faction:'IW',name,points:110,models:5,wp:2,t:5,save:3,move:3,oc:2,source:'linked',ranged:{attacks:1,range:5,s:4,ap:0,damage:1,skill:3},melee:{attacks:2,range:1,s:5,ap:1,damage:1,skill:3},special:{}});
test('linked catalogues reference the separate repository only',()=>assert.equal(C.REPOSITORY,'Varroth/Gaul-Campaign-Renegades'));
test('all four source filenames are mapped',()=>assert.deepEqual(Object.keys(C.FILES),['IW','FC','AD','ST']));
test('cache is initially absent',()=>assert.equal(C.readCache(store()),null));
test('cache rejects incompatible versions',()=>assert.equal(C.readCache(store({[C.CACHE_KEY]:JSON.stringify({v:99,cachedAt:Date.now(),catalogues:{}})})),null));
test('cache persists safely without storing source XML',()=>{
 const storage=store(),data={v:4,cachedAt:Date.now(),catalogues:{IW:{version:'a1',revision:'9',units:[template('Unit A')]}}};
 assert.equal(C.writeCache(data,storage),true);
 const parsed=C.readCache(storage);assert.equal(parsed.catalogues.IW.units[0].name,'Unit A');assert.equal(parsed.catalogues.IW.version,'a1');
});
test('cache refuses malformed linked profiles',()=>{
 const data={v:4,cachedAt:Date.now(),catalogues:{IW:{units:[{id:'not-from-new-recruit',faction:'IW',points:30,name:'X'}]}}};
 assert.equal(C.readCache(store({[C.CACHE_KEY]:JSON.stringify(data)})),null);
});
test('engine adds a linked unit and keeps original playtest profiles',()=>{
 const before=E.BY_ID['iw-bannon'];
 assert.equal(E.registerLinked('IW',[template('First live marine')]),1);
 assert.equal(E.BY_ID['nr-iw-smoke-a1'].name,'First live marine');
 assert.strictEqual(E.BY_ID['iw-bannon'],before);
});
test('linked units can be used in battles',()=>{
 const g=E.createGame({player:['nr-iw-smoke-a1'],enemy:['ad-unmarked']});
 assert.equal(E.template(g.units[0]).name,'First live marine');
});
test('linked unit updates replace the old profile without duplicating its id',()=>{
 const count=E.TEMPLATES.length;
 E.registerLinked('IW',[template('Updated marine')]);
 assert.equal(E.TEMPLATES.length,count);
 assert.equal(E.BY_ID['nr-iw-smoke-a1'].name,'Updated marine');
});
test('removed linked units are hidden but kept for in-progress battles',()=>{
 E.registerLinked('IW',[]);
 assert.equal(E.BY_ID['nr-iw-smoke-a1'].visible,false);
 assert.equal(E.template({template:'nr-iw-smoke-a1'}).name,'Updated marine');
});
test('readVersions detects changed Git blob SHA without relying on catalogue revision',async()=>{
 const request=async url=>({ok:true,json:async()=>({tree:[{path:'Infernal_Warriors.cat',type:'blob',sha:'fresh-sha'},{path:'Silver_Tempest.cat',type:'blob',sha:'empty-but-valid'}]})});
 const result=await C.readVersions(request);
 assert.equal(result.versions.IW,'fresh-sha');assert.equal(result.versions.ST,'empty-but-valid');
});
test('readVersions falls back to the public manifest if GitHub API is unavailable',async()=>{
 const request=async url=>url.includes('/git/trees/')?{ok:false,status:403}:{ok:true,json:async()=>({files:[{file:'Frozen_Cogs.cat',sha256:'manifest-hash'}]})};
 const result=await C.readVersions(request);
 assert.equal(result.source,'catalogue manifest');assert.equal(result.versions.FC,'manifest-hash');
});
test('offline sync preserves the last cached linked catalogue',async()=>{
 const storage=store();
 C.writeCache({v:4,cachedAt:Date.now(),catalogues:{IW:{version:'known',revision:'2',units:[template('Safe unit')]}}},storage);
 const request=async()=>{throw Error('Offline');};
 const statuses=[];const result=await C.sync({request,storage,onStatus:x=>statuses.push(x)});
 assert.equal(result.ok,false);assert.equal(result.cached,true);assert.equal(result.counts.IW,1);
 assert.equal(statuses.at(-1).type,'offline');
});
