const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const basic={name:'Test gun',mode:'ranged',count:1,attacks:2,range:6,s:12,ap:6,damage:1,skill:3};
const melee={...basic,name:'Test blade',mode:'melee',range:1};
function fight({weapon=basic,enemy='ad-armor',dist=3,seed=71,models=1}={}){
 const player={id:'nr-iw-trait-test',source:'linked',faction:'IW',name:'Trait tester',points:110,models,wp:3,t:4,save:3,move:3,oc:2,
  ranged:weapon,melee,special:{},loadout:[{...weapon,count:models},{...melee,count:models}]};
 E.registerLinked('IW',[player]);const g=E.createGame({player:[player.id],enemy:[enemy],seed});
 const [a,b]=g.units;a.x=1;a.y=3;b.x=1+dist;b.y=3;g.phase='shooting';
 return E.attack(g,a.uid,b.uid,'ranged');
}
test('source weapon traits are parsed without claiming unsupported rules are fully verified',()=>{
 assert.deepEqual(E.weaponTraits({traits:'Torrent, Ignores Cover'}).torrent,true);
 assert.equal(E.weaponTraits({traits:'Heavy; Twin-linked; Sustained Hits 2'}).sustainedHits,2);
 assert.equal(E.weaponTraits({traits:'Rapid Fire 1; Melta 2'}).melta,2);
 assert.equal(E.weaponTraits({traits:'Pistol; Hazardous [test]'}).pistol,true);
 assert.equal(E.weaponTraits({traits:'—'}).torrent,false);
});
test('Torrent attacks auto-hit (no sixes trigger critical-hit abilities)',()=>{
 const r=fight({weapon:{...basic,traits:'Torrent',attacks:6,damage:1},seed:101});
 assert.equal(r.ok,true);assert.equal(r.hits,r.attacks);
});
test('Rapid Fire changes attack count only at half range',()=>{
 const weapon={...basic,traits:'Rapid Fire 2',attacks:2};
 assert.equal(fight({weapon,dist:3,seed:1}).attacks,4);
 assert.equal(fight({weapon,dist:5,seed:1}).attacks,2);
});
test('Pistol may shoot when engaged; non-Pistol cannot',()=>{
 assert.equal(fight({weapon:{...basic,traits:'Pistol'},dist:1}).ok,true);
 assert.equal(fight({weapon:{...basic,traits:''},dist:1}).ok,false);
});
test('Blast adds attacks per five target models',()=>{
 const weapon={...basic,traits:'Blast',attacks:1};
 const r=fight({weapon,enemy:'ad-unmarked',dist:3});
 assert.equal(r.attacks,3); // 10 models -> 1 base + 2 blast
});
test('Melta adds damage on an unsaved hit within half range',()=>{
 const weapon={...basic,traits:'Torrent; Melta 2',attacks:1,s:20};
 let short=null,long=null;
 for(let seed=1;seed<40;seed++){
  const near=fight({weapon,dist:2,seed}),far=fight({weapon,dist:5,seed});
  if(near.unsaved===1&&far.unsaved===1){short=near;long=far;break;}
 }
 assert.ok(short&&long);assert.equal(short.damage,3);assert.equal(long.damage,1);
});
test('Warp-Aggravated Pain is triggered only by nearby enemy psykers or daemons for ordinary IW',()=>{
 const g=E.createGame({player:['iw-berserkers','iw-lost','iw-reavers'],enemy:['st-high'],seed:1});
 const foe=g.units.find(u=>u.side==='enemy');foe.x=4;foe.y=2;
 for(const u of g.units.filter(x=>x.side==='player')){u.x=2;u.y=2+(['iw-lost','iw-reavers'].indexOf(u.template)+1);}
 let failures=0;
 for(let seed=1;seed<80;seed++){
  g.seedState=seed;E.startTurn(g,'player');
  failures+=g.units.find(u=>u.template==='iw-berserkers').painPenalty===1;
  assert.equal(g.units.find(u=>u.template==='iw-lost').painPenalty,0);
  assert.equal(g.units.find(u=>u.template==='iw-reavers').painPenalty,0);
 }
 assert.ok(failures>0&&failures<79);
 foe.x=11;foe.y=7;E.startTurn(g,'player');
 assert.equal(g.units.find(u=>u.template==='iw-berserkers').painPenalty,0);
});
