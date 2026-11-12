const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const basic={source:'linked',faction:'IW',models:1,points:85,wp:5,t:8,save:3,move:4,oc:2,
 ranged:{attacks:2,range:5,s:5,ap:0,damage:1,skill:3},
 melee:{attacks:2,range:1,s:4,ap:0,damage:1,skill:3},special:{}};
const rhino={...basic,id:'nr-iw-trans-rhino',name:'Rhino Carrier',category:'Dedicated Transport',
 abilities:[{name:'Wargear / legal alternatives',description:'Capacity 10 ordinary power-armoured infantry spaces; no Terminators, jump packs, bikes, daemons or Dreadnoughts.'}]};
const raider={...basic,id:'nr-iw-trans-raider',name:'Land Raider',category:'Transport',points:260,
 abilities:[{name:'Assault Ramp',description:'Capacity: 12 spaces, with Terminators using two each.'}]};
const mastodon={...basic,id:'nr-iw-trans-mastodon',name:'Mastodon Heavy Transport',category:'Transport',points:550,
 abilities:[{name:'Mobile Bastion',description:'Capacity 30 Infantry spaces; Terminators use two spaces each.'}]};
const squad={...basic,id:'nr-iw-trans-squad',name:'Despoiler Cadre',category:'Infantry',models:5,points:100,wp:3,t:4,special:{fnp:5,regen:1}};
const terminators={...squad,id:'nr-iw-trans-term',name:'Ashen Chain Terminators',models:5,points:390};
const jumper={...squad,id:'nr-iw-trans-jumper',name:'Assault Jump Cadre',models:5,points:155};
const daemon={...squad,id:'nr-iw-trans-daemon',name:'Bloodletters',special:{daemon:true}};
E.registerLinked('IW',[rhino,raider,mastodon,squad,terminators,jumper,daemon]);
test('carrier capacities only recognized when backed by source ability wording',()=>{
 assert.equal(E.transportSpec(rhino).capacity,10);
 assert.equal(E.transportSpec(raider).capacity,12);
 assert.equal(E.transportSpec(mastodon).capacity,30);
 assert.equal(E.transportSpec({...rhino,abilities:[]}),null);
});
test('ground transport refuses Terminators, Jump Packs, daemons and vehicles in Rhino',()=>{
 assert.equal(E.passengerSpaces(squad,rhino),5);
 assert.equal(E.passengerSpaces(terminators,rhino),null);
 assert.equal(E.passengerSpaces(jumper,rhino),null);
 assert.equal(E.passengerSpaces(daemon,rhino),null);
 assert.equal(E.passengerSpaces(raider,rhino),null);
});
test('Land Raider and Mastodon count Terminators as two spaces each',()=>{
 assert.equal(E.passengerSpaces(terminators,raider),10);
 assert.equal(E.passengerSpaces(terminators,mastodon),10);
});
test('capacity checks are shared across all squads assigned to one vehicle',()=>{
 const valid={player:['field','embark:0','embark:0'],enemy:['field']};
 const m={player:[rhino.id,squad.id,squad.id],enemy:['ad-breach']};
 assert.deepEqual(E.normalizeDeployment(valid,m),valid);
 assert.throws(()=>E.normalizeDeployment({player:['field','embark:0','embark:0','embark:0'],enemy:['field']},{player:[rhino.id,squad.id,squad.id,squad.id],enemy:['ad-breach']}),/overloaded/);
});
test('cannot embark without separately paid carrier or into carrier in Reserves',()=>{
 assert.throws(()=>E.normalizeDeployment({player:['field','embark:0'],enemy:['field']},{player:[squad.id,squad.id],enemy:['ad-breach']}),/ineligible/);
 assert.throws(()=>E.normalizeDeployment({player:['reserve','embark:0'],enemy:['field']},{player:[rhino.id,squad.id],enemy:['ad-breach']}),/on the battlefield/);
});
test('passengers are off-board and cannot independently attack until they disembark',()=>{
 const g=E.createGame({player:[rhino.id,squad.id],enemy:['ad-breach'],
  deployment:{player:['field','embark:0'],enemy:['field']}});
 assert.equal(E.embarkedUnits(g,'player').length,1);
 const passenger=g.units[1],enemy=g.units[2];
 assert.equal(passenger.x,-1);
 g.phase='shooting';assert.equal(E.attack(g,passenger.uid,enemy.uid,'ranged').ok,false);
});
test('disembark must be adjacent to a stationary carrier during movement',()=>{
 const g=E.createGame({player:[rhino.id,squad.id],enemy:['ad-breach'],
  deployment:{player:['field','embark:0'],enemy:['field']}});
 const carrier=g.units[0],passenger=g.units[1];
 assert.equal(E.disembark(g,passenger.uid,5,3).ok,false);
 carrier.moved=true;assert.equal(E.disembark(g,passenger.uid,1,3).ok,false);
 carrier.moved=false;assert.equal(E.disembark(g,passenger.uid,1,3).ok,true);
 assert.equal(passenger.deployment,'field');assert.equal(passenger.transportUid,null);
 assert.equal(E.embarkedUnits(g,'player').length,0);
});
test('destroyed carriers produce an abstract emergency disembarkation',()=>{
 const g=E.createGame({player:[rhino.id,squad.id],enemy:['ad-breach'],
  deployment:{player:['field','embark:0'],enemy:['field']}});
 const carrier=g.units[0],passenger=g.units[1];
 carrier.models=0;E.emergencyDisembark(g,carrier);
 assert.equal(passenger.deployment,'field');
 assert.equal(passenger.battleshocked,true);
});
test('save validation preserves properly linked offboard passengers',()=>{
 const g=E.createGame({player:[rhino.id,squad.id],enemy:['ad-breach'],
  deployment:{player:['field','embark:0'],enemy:['field']}});
 assert.equal(E.validateLoadedState(structuredClone(g)).units[1].deployment,'embarked');
 const bad=structuredClone(g);bad.units[1].transportUid='nonsense';
 assert.throws(()=>E.validateLoadedState(bad),/invalid embarked passenger/);
});
