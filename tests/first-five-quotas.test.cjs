const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../catalogue.js');
const rules=[
 {name:'Bloodmarked Thralls',kind:'thrallSpecial',per:10,weapon:'Flamer',second:'Heavy stubber',safe:'Autopistol'},
 {name:'Chainbound Reavers',kind:'handflamer',per:5,weapon:'Hand flamer',second:'Hand flamer',safe:'Autopistol'},
 {name:'Infernal Berzerkers',kind:'plasmaPistol',per:5,weapon:'Plasma pistol',second:'Plasma pistol',safe:'Bolt pistol'},
 {name:'Despoiler Cadre',kind:'power',per:5,weapon:'Power sword / axe',second:'Power sword / axe',safe:'Chainsword'},
 {name:'Void Breachers',kind:'breacherSpecial',per:5,weapon:'Flamer',second:'Meltagun',safe:'Breacher gun'}
];
const base=r=>({faction:'IW',name:r.name,wargearLimits:[{kind:r.kind,per:r.per,maximum:1,description:r.name+' specialist quota'}]});
const items=(...names)=>names.map(name=>({name,count:1}));
for(const r of rules){
 test(r.name+': first specialist legal at a full squad-size block',()=>assert.equal(C.enforceWargearLimits(base(r),r.per,items(r.weapon)),undefined));
 test(r.name+': second specialist rejected in a single block',()=>assert.throws(()=>C.enforceWargearLimits(base(r),r.per,items(r.weapon,r.second)),/maximum 1/));
 test(r.name+': incomplete squad-size block has no specialist quota',()=>assert.throws(()=>C.enforceWargearLimits(base(r),r.per-1,items(r.weapon)),/maximum 0/));
 test(r.name+': two specialists legal across two full blocks',()=>assert.equal(C.enforceWargearLimits(base(r),r.per*2,items(r.weapon,r.second)),undefined));
 test(r.name+': basic weapon does not consume a specialist quota',()=>assert.equal(C.enforceWargearLimits(base(r),r.per,items(r.safe)),undefined));
}
test('attached leader weapons do not count as bodyguard specialists',()=>assert.equal(C.enforceWargearLimits(base(rules[2]),5,[{name:'Plasma pistol',count:1},{name:'Plasma pistol',count:1,isLeader:true}]),undefined));
