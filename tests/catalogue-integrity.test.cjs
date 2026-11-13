const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const C=require('../catalogue');
test('download checksum accepts the exact Git blob bytes and rejects source drift',async()=>{
 const xml='<catalogue name="Gaul — α"/>',sha=crypto.createHash('sha1').update('blob '+Buffer.byteLength(xml)+'\0').update(xml).digest('hex');
 await C.verifySourceVersion(xml,sha);
 await assert.rejects(C.verifySourceVersion(xml+' ',sha),/source changed during sync/);
});
test('manifest SHA-256 fallback checks the same downloaded bytes',async()=>{
 const xml='<catalogue/>',sha=crypto.createHash('sha256').update(xml).digest('hex');
 await C.verifySourceVersion(xml,sha);
 await assert.rejects(C.verifySourceVersion('<catalogue revision="2"/>',sha),/source changed during sync/);
});
test('cache compression preserves repeated nested choices without shared mutations',()=>{
 const data={units:[{name:'Repeated',groups:[{choices:[{name:'A',points:5}]}]},{name:'Repeated',groups:[{choices:[{name:'A',points:5}]}]}]};
 const restored=C.unpackCache(JSON.parse(C.packCache(data)));
 assert.deepEqual(restored,data);
 restored.units[0].groups[0].choices[0].points=99;
 assert.equal(restored.units[1].groups[0].choices[0].points,5);
});
test('cache decoder rejects recursive references and prototype keys',()=>{
 assert.throws(()=>C.unpackCache({packed:2,strings:[],objects:[[3,0]],payload:[3,0]}),/supported size/);
 assert.throws(()=>C.unpackCache({packed:2,strings:['__proto__'],objects:[],payload:[1,0,5]}),/Invalid cache key/);
});
