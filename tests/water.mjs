import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
// Use an existing Three.js ESM bundle; this test does not install dependencies.
// Example: node tests/water.mjs /path/to/three.module.mjs
if (!process.argv[2]) {
  console.error('Usage: node tests/water.mjs /path/to/three.module.mjs');
  process.exit(1);
}
const THREE = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, 1.5, 0.4, 7000);
camera.position.set(4, 6, 12); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
const originalTarget = { name: 'composer-target' }, logs = [];
let target = originalTarget, drawSize = [1600, 1000], failure = false, passes = 0, api;
const renderer = {
  xr: { enabled: true }, shadowMap: { autoUpdate: true, needsUpdate: true },
  getDrawingBufferSize(v) { return v.set(...drawSize); },
  getRenderTarget() { return target; }, setRenderTarget(t) { target = t; }, clear() {},
  render(s, c) {
    passes++;
    assert.ok(target?.isWebGLRenderTarget, 'reflection must draw into a real target');
    assert.notEqual(target, originalTarget);
    assert.ok(c.projectionMatrix.elements.every(Number.isFinite), 'clip plane must remain finite');
    assert.equal(renderer.xr.enabled, false);
    assert.equal(renderer.shadowMap.autoUpdate, false);
    for (const o of s.children) if (o.material === api.waterMat || o.material === api.paddyMat || excluded.has(o)) assert.equal(o.visible, false, 'water/exclusions must not feed back');
    if (failure) throw new Error('simulated GPU failure');
  },
};
const excluded = new Set(), GEN = { theme: 'sakura' };
const LOG = Object.fromEntries(['info', 'debug', 'error'].map(level => [level, (...args) => logs.push({ level, args })]));
const source = fs.readFileSync(path.join(root, 'src/20_water.js'), 'utf8');
api = new Function('THREE', 'C', 'TIME_U', 'scene', 'camera', 'renderer', 'HIDE_IN_MIRROR', 'GEN', 'LOG',
  "let QUALITY = 'high';\n" + source + '\nreturn { MIRROR,WATER_U,waterMat,paddyMat,renderMirror,setWaterTheme,setQuality(q) { QUALITY=q;setWaterQuality(q); } };')(
    THREE, hex => new THREE.Color(hex), { value: 1 }, scene, camera, renderer, excluded, GEN, LOG);
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), api.waterMat), new THREE.Mesh(new THREE.PlaneGeometry(), api.paddyMat));
const hidden = new THREE.Mesh(); hidden.visible = false; scene.add(hidden);
const grass = new THREE.Mesh(); scene.add(grass); excluded.add(grass);
assert.notEqual(api.waterMat.uniforms.uShallow, api.paddyMat.uniforms.uShallow);
assert.notEqual(api.waterMat.uniforms.uDeep, api.paddyMat.uniforms.uDeep);
const paddyColor = api.paddyMat.uniforms.uShallow.value.getHex();
api.WATER_U.uShallow.value.setHex(0xff0000);
assert.equal(api.paddyMat.uniforms.uShallow.value.getHex(), paddyColor, 'mood changes may not mutate terrace colour');
api.renderMirror();
assert.equal(api.MIRROR.rt.width, 800); assert.equal(api.MIRROR.rt.height, 500); assert.equal(api.MIRROR.rt.samples, 2);
const allocations = { high: [api.MIRROR.rt.width, api.MIRROR.rt.height, api.MIRROR.rt.samples] };
assert.equal(api.WATER_U.tMirror.value, api.MIRROR.rt.texture); assert.equal(api.MIRROR.active, true);
assert.equal(api.WATER_U.uMirrorOn.value, 1); assert.equal(target, originalTarget);
assert.equal(renderer.xr.enabled, true); assert.equal(renderer.shadowMap.needsUpdate, true);
assert.equal(hidden.visible, false); assert.equal(grass.visible, true);
assert.ok(scene.children.filter(o => o.material === api.waterMat || o.material === api.paddyMat).every(o => o.visible));
GEN.theme = 'shanshui'; api.setQuality('lite'); api.renderMirror();
assert.equal(api.MIRROR.theme, 'shanshui'); assert.equal(api.MIRROR.rt.samples, 0); assert.equal(api.MIRROR.rt.width, 528); assert.equal(api.WATER_U.uDetail.value, 0);
assert.equal(api.MIRROR.rt.height, 330);
allocations.lite = [api.MIRROR.rt.width, api.MIRROR.rt.height, api.MIRROR.rt.samples];
drawSize = [10000, 5000]; api.setQuality('high'); api.renderMirror();
assert.equal(api.MIRROR.rt.width, 1536); assert.equal(api.MIRROR.rt.height, 768);
assert.equal(api.MIRROR.rt.samples, 2);
allocations.boundedHigh = [api.MIRROR.rt.width, api.MIRROR.rt.height, api.MIRROR.rt.samples];
camera.position.y = -1; const before = passes; api.renderMirror();
assert.equal(passes, before); assert.equal(api.MIRROR.active, false); assert.equal(api.WATER_U.uMirrorOn.value, 0);
camera.position.y = 6; camera.updateMatrixWorld(); failure = true; api.renderMirror();
assert.equal(api.MIRROR.failed, true); assert.equal(api.WATER_U.uMirrorOn.value, 0); assert.equal(target, originalTarget);
assert.equal(renderer.xr.enabled, true); assert.equal(renderer.shadowMap.autoUpdate, true); assert.equal(grass.visible, true); assert.equal(hidden.visible, false);
assert.equal(logs.filter(l => l.level === 'error').length, 1);
api.renderMirror(); assert.equal(logs.filter(l => l.level === 'error').length, 1, 'a persistent reflection failure must not flood logs');
console.info('Water checks passed: actual reflection target, isolated paddy colours, quality/resizing, bounded allocation, underwater fallback, feedback exclusions and failure cleanup.');
console.info(JSON.stringify({ threeRevision: THREE.REVISION, reflectionTargets: allocations }));
