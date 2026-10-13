const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
class Vector { set(...args) { this.values = args; return this; } }
let calls = 0;
const GEN = { seed: 3, theme: 'sakura', profile: {}, B: { OCEAN: 0, MARSH: 12, SAKURA: 3, BAMBOO: 7, CEDAR: 6, PINE: 13 },
  sample(x, z) { calls++; return { h: 1 + Math.abs(x * 0.009 + z * 0.001), biome: 3, town: 0, pad: 0, street: 0, snow: 0 }; }, fbm(x) { return Math.sin(x); } };
const camera = { position: { x: 0, y: 10, z: 0 } }, volPass = { mat: { uniforms: { uTime: {}, uMaxDist: {} } } };
const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const api = vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/22_mist.js'), 'utf8') + '\n({ MIST, updateMist });', {
  Math, GEN, camera, volPass, smoothstep, ATM: { sunDir: { y: 0.14 }, rain: 0 }, LOG: { debug() {} },
  THREE: { Vector2: Vector, Vector4: Vector, DataTexture: class {} },
});
api.updateMist(1, 0); assert.equal(calls, 1024);
const first = api.MIST.data.slice();
camera.position.x = 12; calls = 0; api.updateMist(1, 1); assert.equal(calls, 32, 'One-cell movement must sample only the new column');
for (let j = 0; j < 32; j++) for (let i = 0; i < 31; i++) {
  assert.deepEqual(Array.from(api.MIST.data.subarray((j * 32 + i) * 4, (j * 32 + i + 1) * 4)), Array.from(first.subarray((j * 32 + i + 1) * 4, (j * 32 + i + 2) * 4)), 'Fog moved in world space');
}
calls = 0; api.updateMist(1, 2); assert.equal(calls, 0, 'Stationary camera re-sampled habitat');
GEN.seed = 4; calls = 0; api.updateMist(1, 3); assert.equal(calls, 1024, 'Seed change retained old fog');
GEN.theme = 'shanshui'; GEN.profile = { mist: { cloudSea: true, base: 44 } }; calls = 0; api.updateMist(1, 4); assert.equal(calls, 1024, 'Theme change retained old fog');
camera.position.x += 12; camera.position.z += 12; calls = 0; api.updateMist(1, 5); assert.equal(calls, 63, 'Diagonal movement must sample only new atlas borders');
camera.position.x += 1000; calls = 0; api.updateMist(1, 6); assert.equal(calls, 1024, 'Teleport did not rebuild fog');
console.info(JSON.stringify({ initialSamples: 1024, oneCellSamples: 32, diagonalSamples: 63, stableWorldSpace: true, seedThemeInvalidation: true }));
