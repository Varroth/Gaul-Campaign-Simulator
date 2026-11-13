const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const home=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(home,'index.html'),'utf8');
function fakePage(){
 const elems={};const handlers={};
 for(const [,id] of source.matchAll(/\bid="([^"]+)"/g))elems[id]={id,innerHTML:'',textContent:'',disabled:false,hidden:false,value:'',classList:{toggle(){}},setAttribute(){},addEventListener(name,fn){handlers[id+':'+name]=fn},click(){handlers[id+':click']?.()},dataset:{}};
 const tabs=['battle','builder','lab','guide'].map(name=>({dataset:{tab:name},classList:{toggle(){}},setAttribute(){},addEventListener(name,fn){handlers['tab-'+this.dataset.tab+':'+name]=fn}}));
 const views=['battle','builder','lab','guide'].map(name=>({id:'view-'+name,classList:{toggle(){}},setAttribute(){},hidden:false}));
 const doc={body:{textContent:'',appendChild(){}},getElementById:id=>elems[id],querySelectorAll:q=>q==='.tab'?tabs:q==='.view'?views:[],createElement:()=>({click(){},remove(){}})};
 global.window=global;global.document=doc;global.localStorage={getItem:()=>null,setItem:()=>{}};global.addEventListener=()=>{};
 delete require.cache[require.resolve('../app.js')];
 global.GaulEngine=require('../engine.js');require('../app.js');return {elems,handlers};
}
test('HTML contains four simulator views and all script references',()=>{for(const k of ['view-battle','view-builder','view-lab','view-guide'])assert.ok(source.includes(`id="${k}"`));for(const k of ['styles.css','engine.js','app.js'])assert.ok(source.includes(k));});
test('interface boots and renders 96 tactical cells',()=>{const {elems}=fakePage();assert.equal((elems['battle-grid'].innerHTML.match(/data-x=/g)||[]).length,96);assert.ok(elems.scoreboard.innerHTML.includes('985 pts'));assert.ok(elems.scoreboard.innerHTML.includes('980 pts'));});
test('three objectives and combat log render',()=>{const {elems}=fakePage();assert.ok(elems.objectives.innerHTML.includes('Objective C'));assert.ok(elems['combat-feed'].innerHTML.includes('Battle started'));});
test('battle can advance through phases',()=>{const {elems,handlers}=fakePage();handlers['next-phase:click']();assert.equal(elems.scoreboard.innerHTML.includes('Reinforcements'),true);handlers['next-phase:click']();assert.equal(elems.scoreboard.innerHTML.includes('Shooting'),true);handlers['next-phase:click']();assert.equal(elems.scoreboard.innerHTML.includes('Charge'),true);});
test('army catalogue renders all factions',()=>{const {elems,handlers}=fakePage();handlers['tab-builder:click']();assert.ok(elems['unit-catalogue'].innerHTML.includes('Balan Bannon'));assert.ok(elems['unit-catalogue'].innerHTML.includes('High Stormseer'));});
test('battle lab generates ten results and chart',()=>{const {elems,handlers}=fakePage();handlers['tab-lab:click']();handlers['run-lab:click']();assert.ok(elems['lab-results'].innerHTML.includes('Win distribution'));assert.equal((elems['lab-results'].innerHTML.match(/<tr>/g)||[]).length,11);});

test('builder shows all three profile confidence labels and a status filter',()=>{
 const {elems,handlers}=fakePage();
 handlers['tab-builder:click']();
 assert.ok(elems['unit-catalogue'].innerHTML.includes('SIM ESTIMATE'));
 assert.match(elems['verification-counts'].textContent,/0 Verified · 0 Synced/);
 handlers['status-filter:change']({target:{value:'verified'}});
 assert.match(elems['unit-catalogue'].innerHTML,/No units are fully Verified yet/);
});
