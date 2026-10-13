import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'world.manifest.json'), 'utf8'));
const read = p => fs.readFileSync(path.join(root, 'src', p), 'utf8');
const actualGEN = new Function(manifest.generator.map(read).join('\n') + '\nreturn GEN;')();
const mod = (v, n) => ((v % n) + n) % n;
let padBlocked = false, railBlocked = false, surfaceFlooded = false, pillar = null, probes = 0;
function terrain(x, z) {
  probes++;
  const wet = x > 200, level = wet ? x < 300 ? 80 : 86 : surfaceFlooded ? 3.2 : null;
  return { h: wet ? level - 3 : 3, waterLevel: level, waterKind: wet ? 'lake' : level == null ? null : 'paddy', waterId: wet ? x < 300 ? 'pool-a' : 'pool-b' : null,
    paddy: !wet && surfaceFlooded, rail: railBlocked ? 1 : 0, railCut: 0, tunnel: 0, pad: padBlocked ? 1 : 0,
    street: !wet && (mod(x, 34) < 3.6 || mod(z, 26) < 3.2) ? 1 : 0, town: wet ? 0 : 1, path: 0,
    biome: wet ? actualGEN.B.LAKE : actualGEN.B.TOWN };
}
let useFixture = true;
const GEN = {
  get theme() { return actualGEN.theme; }, get profile() { return actualGEN.profile; }, get seed() { return actualGEN.seed; },
  B: actualGEN.B, h2: actualGEN.h2, LODS: actualGEN.LODS,
  railClearance(x,z) { return useFixture ? railBlocked ? -1 : Infinity : actualGEN.railClearance(x,z); },
  structureAt(x,z,padding=0) { return useFixture ? padBlocked || pillar && Math.abs(x-pillar.x)<.49+padding && Math.abs(z-pillar.z)<.49+padding ? {type:'house'} : null : actualGEN.structureAt ? actualGEN.structureAt(x,z,padding) : null; },
  sample(x, z) { return useFixture ? terrain(x, z) : actualGEN.sample(x, z, {}); },
  heightAt(x,z) { return this.sample(x,z).h; },
  waterAt(x, z) { if (!useFixture) return actualGEN.waterAt(x,z); const s = terrain(x,z); return s.waterLevel == null ? null : { level:s.waterLevel,depth:s.waterLevel-s.h,bed:s.h,id:s.waterId,kind:s.waterKind }; },
  habitatAt: actualGEN.habitatAt, habitatPath: actualGEN.habitatPath,
};
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, 1.5, .4, 7000);
const logs = [], LOG = Object.fromEntries(['info','debug','warn','error'].map(level => [level, (category,event,detail)=>logs.push({level,category,event,detail})]));
const buttons = new Map(), $ = id => { if (!buttons.has(id)) buttons.set(id,{textContent:'',addEventListener(){},setAttribute(){}});return buttons.get(id); };
const source = ['23_unit_assets.js','23_wildlife.js','23_settlement_assets.js','23_settlements.js','24_follow.js'].map(read).join('\n');
const api = new Function('THREE','GEN','scene','camera','LOG','$', `
  let QUALITY='high';const REDUCED=false,FX={birds:[]},TRAIN={cars:[]},ATM={rain:0},ST={chunks:new Map()};
  const I18N={t:key=>key,unitName:unit=>unit.kind,onChange:()=>{}};
  const boxGeo=new THREE.BoxGeometry(1,1,1),foliageGeo=new THREE.IcosahedronGeometry(.65,0);
  const C=h=>new THREE.Color(h),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const camS={pos:new THREE.Vector3(),yaw:0,pitch:0},camG={pos:new THREE.Vector3(),yaw:0,pitch:0},keys=new Set();let tour=false,introT=1,moodName='golden';
  const stopTour=()=>{},toast=()=>{},toastKey=()=>{},openMenu=()=>{},closeMenu=()=>{},canvas={getBoundingClientRect:()=>({left:0,top:0,width:1200,height:800})};
  ${source}
  return {SETTLEMENTS,FOLLOW,camS,startFollow,stopFollow,updateFollow,nearbyUnits,groundYFor,setQuality:q=>QUALITY=q};
`)(THREE,GEN,scene,camera,LOG,$);
function run(seconds, check = false) {
  for (let i=0;i<seconds*20;i++) {
    api.SETTLEMENTS.update(.05,i*.05);
    if (check) for (const u of api.SETTLEMENTS.units) if (u.active) assert.ok(api.SETTLEMENTS.validPoint(u,u.x,u.z), 'active footprint must remain on its street or water body: '+u.id);
  }
}
const evidence = [];
for (const theme of ['shanshui','sakura']) {
  actualGEN.setTheme(theme);camera.position.set(150,10,100);api.SETTLEMENTS.init();run(12,true);
  assert.equal(api.SETTLEMENTS.units.length,21);
  const active=api.SETTLEMENTS.units.filter(u=>u.active),kinds=new Set(active.map(u=>u.kind));
  for(const kind of ['farmer','merchant','official','carriage','sedan','fishingBoat','merchantBoat']) assert.ok(kinds.has(kind),'pool must produce '+theme+' '+kind);
  assert.ok(active.every(u=>u.obj===u.g&&u.eye.every(Number.isFinite)));
  for(const u of active.filter(u=>u.domain==='water')) assert.ok(Math.abs(u.y-u.water.level)<1e-9,'boats must float at their own lake level');
  const merchant=active.find(u=>u.kind==='merchant'),other=active.find(u=>u.kind==='merchant'&&u!==merchant);
  const shared = new Set();merchant.g.traverse(o=>{if(o.isMesh)shared.add(o.geometry);});
  other.g.traverse(o=>{if(o.isMesh)assert.ok(shared.has(o.geometry),'clones must share geometry');});
  padBlocked=true;assert.equal(api.SETTLEMENTS.validPoint(merchant,merchant.x,merchant.z),null);padBlocked=false;
  railBlocked=true;assert.equal(api.SETTLEMENTS.validPoint(merchant,merchant.x,merchant.z),null);railBlocked=false;
  surfaceFlooded=true;assert.equal(api.SETTLEMENTS.validPoint(merchant,merchant.x,merchant.z),null);surfaceFlooded=false;
  const boat=active.find(u=>u.kind==='merchantBoat'&&u.slot>=u.lite),testBoat={...boat,water:GEN.waterAt(250,100)};
  assert.ok(api.SETTLEMENTS.validPoint(testBoat,250,100,Math.PI/2));
  padBlocked=true;assert.equal(api.SETTLEMENTS.validPoint(testBoat,250,100,Math.PI/2),null,'vessels must avoid actual waterfront structures');padBlocked=false;
  pillar={x:250+boat.length*.22,z:100};assert.equal(api.SETTLEMENTS.validPoint(testBoat,250,100,Math.PI/2),null,'narrow pillars inside a vessel footprint must not be missed between its corners');pillar=null;
  assert.equal(api.SETTLEMENTS.canTravel(testBoat,250,100,350,100,Math.PI/2),false,'boats may not cross separate lakes/levels');
  const oldDistance=boat.distance;run(3,true);assert.ok(boat.distance>oldDistance,'boats must actually move');
  for(const kind of kinds) {
    const unit=active.find(u=>u.kind===kind);assert.equal(api.startFollow(unit),true);api.updateFollow(0);
    const eye=new THREE.Vector3(...unit.eye).applyMatrix4(unit.g.matrixWorld);
    assert.ok(eye.distanceTo(api.camS.pos)<1e-9,'camera must attach to the model eye: '+kind);assert.equal(camera.near,.08);assert.equal(unit.g.visible,false);
    api.stopFollow(false);assert.equal(camera.near,.4);assert.equal(unit.g.visible,true);
  }
  assert.equal(api.startFollow(boat),true);api.updateFollow(0);
  camera.position.set(5000,200,5000);api.setQuality('lite');api.SETTLEMENTS.update(.05,20);api.updateFollow(.05);
  assert.equal(boat.active,true,'bound vessels must survive quality/distance changes');assert.equal(boat.g.visible,false);
  api.stopFollow(false);assert.equal(camera.near,.4);assert.equal(boat.g.visible,true);
  camera.position.set(150,10,100);api.SETTLEMENTS.reset();run(5);
  assert.ok(api.SETTLEMENTS.units.filter(u=>u.active).length<=11,'lite pool must respect its lower unit budget');
  api.SETTLEMENTS.reset();assert.ok(api.SETTLEMENTS.units.every(u=>!u.active&&!u.g.visible));
  api.setQuality('high');evidence.push({theme,spawned:active.length,kinds:[...kinds]});
}
for(const [kind,offset] of [['fish',-.65],['crane',5],['sparrow',1.2],['hawk',15]]) {
  const y=api.groundYFor(kind,0,0,{h:77,waterLevel:80,paddy:0});assert.ok(Math.abs(y-(80+offset))<1e-9,'wildlife must use elevated water surfaces: '+kind);
}
assert.equal(api.startFollow({id:'bad',kind:'unknown',obj:new THREE.Group(),active:true}),false,'unsupported eyes must be rejected safely');
// Query actual waterfront footprints without turning their surrounding lakes into pads.
actualGEN.setTheme('shanshui');let pavilion=null;
for(let z=-4000;z<=4000&&!pavilion;z+=176) for(let x=-4000;x<=4000&&!pavilion;x+=176) {
  const candidate=actualGEN.findBiome('waterPavilion',x,z,0);if(candidate?.r===0)pavilion=candidate;
}
assert.ok(pavilion,'the generated world must exercise a real water pavilion');
const localPoint=(a,x,z)=>({x:a.x+Math.cos(a.yaw)*x+Math.sin(a.yaw)*z,z:a.z-Math.sin(a.yaw)*x+Math.cos(a.yaw)*z});
const pier=localPoint(pavilion,0,6.4),outsidePier=localPoint(pavilion,1.5,6.4),openWater=localPoint(pavilion,0,-8);
const before=actualGEN.sample(pavilion.x,pavilion.z,{});
assert.equal(actualGEN.structureAt(pavilion.x,pavilion.z)?.type,'waterPavilion');
assert.equal(actualGEN.structureAt(pier.x,pier.z)?.type,'waterPavilion');
assert.equal(actualGEN.structureAt(outsidePier.x,outsidePier.z),null,'only the narrow pier footprint is blocked');
assert.equal(actualGEN.structureAt(openWater.x,openWater.z,.3),null,'water beside a pavilion stays open');
assert.ok(actualGEN.waterAt(openWater.x,openWater.z),'the unblocked point must actually be in its lake');
assert.deepEqual(actualGEN.sample(pavilion.x,pavilion.z,{}),before,'structure queries must not alter terrain or water');
actualGEN.setTheme('sakura');
const torii=actualGEN.findBiome('seaTorii',0,0,4000),jpPavilion=actualGEN.findBiome('pavilion',0,0,4000);assert.ok(torii&&jpPavilion);
const post=localPoint(torii,3.6*2.1/2,0),postMargin=localPoint(torii,3.6*2.1/2+.65,0);
assert.equal(actualGEN.structureAt(post.x,post.z)?.type,'seaTorii');
assert.equal(actualGEN.structureAt(postMargin.x,postMargin.z),null);
assert.equal(actualGEN.structureAt(postMargin.x,postMargin.z,.3)?.type,'seaTorii','footprint padding must include a vessel safety margin');
assert.equal(actualGEN.structureAt(torii.x,torii.z,.3),null,'the space between torii pillars stays open');
assert.ok(actualGEN.waterAt(torii.x,torii.z));
assert.equal(actualGEN.structureAt(jpPavilion.x,jpPavilion.z)?.type,'pavilion');
// Exercise the actual world rules in addition to simple invariant fixtures.
useFixture=false;actualGEN.setTheme('shanshui');const town=actualGEN.findBiome(actualGEN.B.TOWN,0,0,4000);assert.ok(town);
camera.position.set(town.x,town.h+10,town.z);api.SETTLEMENTS.init();run(9);
const realResidents=api.SETTLEMENTS.units.filter(u=>u.active&&u.domain==='land');assert.ok(realResidents.length>=3,'the real generated city needs settlement life');
for(const u of realResidents) assert.ok(api.SETTLEMENTS.validPoint(u,u.x,u.z),'real actors must stay clear of buildings and rail');
for(const u of api.SETTLEMENTS.units) u.g.traverse(o=>{if(o.isMesh)for(const key of ['position','normal'])assert.ok(o.geometry.attributes[key].array.every(Number.isFinite),'asset geometry must be finite');});
assert.equal(logs.filter(l=>l.level==='error').length,0);
console.info('Settlement checks passed: complete shared templates, both cultures, constrained spawning/routes, elevated water IDs/levels, real movement, all follow eyes, reset and quality budgets.');
console.info(JSON.stringify({threeRevision:THREE.REVISION,fixtures:evidence,realResidents:realResidents.length,fixtureSamples:probes}));
