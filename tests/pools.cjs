const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
class Attribute { constructor(array,itemSize) { this.array=array; this.itemSize=itemSize; } setUsage() {} addUpdateRange() {} }
class Mesh { constructor(g,m,n) { this.instanceMatrix=new Attribute(new Float32Array(n*16),16); } dispose(){} }
const source=fs.readFileSync('src/20_pools.js','utf8').split('const POOLS =')[0];
const scene={add(){},remove(){}};
const Pool=vm.runInNewContext(source+'\nPool;', {THREE:{InstancedMesh:Mesh,InstancedBufferAttribute:Attribute,DynamicDrawUsage:1},scene,HIDE_IN_MIRROR:new Set()});
const pool=new Pool({}, {}, 2), blocks=[], expected=new Map();
let state=17;
function random(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;}
function data(id,n){return {m:Float32Array.from({length:n*16},(_,i)=>id*1000+i),c:Float32Array.from({length:n*3},(_,i)=>id*10+i)};}
function validate(){
  assert.equal(pool.mesh.count, expected.size);
  const seen=new Set();
  for(let i=0;i<pool.visibleCount;i++) {
    const logical=pool.logical[i],want=expected.get(logical); assert(want,'Unexpected visible slot');
    assert.equal(pool.locations[logical],i);assert(!seen.has(logical));seen.add(logical);
    assert.deepEqual(Array.from(pool.mesh.instanceMatrix.array.slice(i*16,i*16+16)),want.m);
    assert.deepEqual(Array.from(pool.mesh.instanceColor.array.slice(i*3,i*3+3)),want.c);
  }
}
for(let turn=0;turn<800;turn++) {
  const op=random();
  if(!blocks.length||op<.35) {const n=1+Math.floor(random()*19),s=pool.alloc(n); blocks.push({s,n,id:turn+1,visible:false});}
  else {const j=Math.floor(random()*blocks.length),b=blocks[j];
    if(op<.68){const d=data(++b.id,b.n);pool.rewrite(b.s,b.n,d.m,d.c);b.visible=true;for(let i=0;i<b.n;i++)expected.set(b.s+i,{m:Array.from(d.m.slice(i*16,i*16+16)),c:Array.from(d.c.slice(i*3,i*3+3))});}
    else {pool.clear(b.s,b.n);b.visible=false;for(let i=0;i<b.n;i++)expected.delete(b.s+i);if(op>.88){pool.release(b.s,b.n);blocks.splice(j,1);}}
  }
  validate();
}
for(const b of blocks)pool.release(b.s,b.n);
assert.equal(pool.mesh.count,0);assert.equal(pool.live,0);assert.equal(pool.top,0);
console.info(JSON.stringify({randomOperations:800,stableSlots:true,noHiddenGPUInstances:true}));
