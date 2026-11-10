const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');

test('wall blocks a horizontal firing corridor',()=>{
 assert.equal(E.hasLineOfSight({x:2,y:1},{x:6,y:1}),false);
 assert.equal(E.hasLineOfSight({x:1,y:1},{x:3,y:1}),true);
});
test('wall blocks vertical and corner-grazing shots',()=>{
 assert.equal(E.hasLineOfSight({x:4,y:0},{x:4,y:2}),false);
 assert.equal(E.hasLineOfSight({x:3,y:0},{x:5,y:2}),false);
});
test('ranged attack blocked by wall does not consume shooting action',()=>{
 const g=E.createGame({player:['iw-berserkers'],enemy:['ad-breach'],seed:400});
 const [a,b]=g.units;
 a.x=2;a.y=1;b.x=6;b.y=1;
 g.phase='shooting';
 const r=E.attack(g,a.uid,b.uid,'ranged');
 assert.equal(r.ok,false);
 assert.match(r.message,/line of sight/);
 assert.equal(a.shot,false);
});
test('open firing lane remains valid',()=>{
 const g=E.createGame({player:['iw-berserkers'],enemy:['ad-breach'],seed:400});
 const [a,b]=g.units;
 a.x=2;a.y=0;b.x=5;b.y=0;g.phase='shooting';
 const r=E.attack(g,a.uid,b.uid,'ranged');
 assert.equal(r.ok,true);
 assert.equal(a.shot,true);
});
