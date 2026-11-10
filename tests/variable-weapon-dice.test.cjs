const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const fresh=()=>E.createGame({seed:2323,player:['iw-berserkers'],enemy:['ad-breach']});
test('D3, D6, 2D6 and D6+N are bounded',()=>{
 for(const [expr,min,max] of [['D3',1,3],['D6',1,6],['2D6',2,12],['D6+1',2,7],['D6+2',3,8],['D6+3',4,9],['D6+6',7,12]]){
  const g=fresh();
  for(let i=0;i<80;i++){const n=E.rollProfileValue(g,expr,2);assert.ok(n>=min&&n<=max,expr+': '+n);}
 }
});
test('variable rolls are reproducible for the same battle seed',()=>{
 const sample=()=>{const g=fresh();return Array.from({length:20},()=>E.rollProfileValue(g,'2D6',2));};
 assert.deepEqual(sample(),sample());
});
test('unrecognized expressions retain explicit fallback, and all counts are capped',()=>{
 assert.equal(E.rollProfileValue(fresh(),'???',3),3);
 assert.equal(E.rollProfileValue(fresh(),'999',3),80);
 assert.equal(E.rollProfileValue(fresh(),'0',3),0);
});
