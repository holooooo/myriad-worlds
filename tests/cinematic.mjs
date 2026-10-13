import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { Worker as ThreadWorker } from 'node:worker_threads';
import * as THREE from '../node_modules/three/build/three.module.js';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/24_cinematic.js'), 'utf8');
const factorySource = source.split('// Preview workers')[0];
const create = new Function(factorySource + '\nreturn createCinematicPlanner;')();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'world.manifest.json')));
const generatorSource = manifest.generator.map(p => fs.readFileSync(path.join(root, 'src', p), 'utf8')).join('\n');
// This is the same isolated JS execution as the production generator/worker;
// no renderer, DOM, WebGL context or seed-dependent fixtures are involved.
const GEN = new Function(generatorSource + '\nreturn GEN;')();
const buildGrass = new Function('THREE', fs.readFileSync(path.join(root, 'src/20_vegetation.js'), 'utf8').split('function patchRootWind')[0] + '\nreturn buildGrassGeometry;')(THREE);
const geometries = { solid: new THREE.BoxGeometry(), lacquer: new THREE.BoxGeometry(), metal: new THREE.BoxGeometry(), glow: new THREE.BoxGeometry(),
  leaf: new THREE.BoxGeometry(), blossom: new THREE.BoxGeometry(), foliage: new THREE.IcosahedronGeometry(0.65, 0),
  stone: new THREE.IcosahedronGeometry(0.67, 0), needle: new THREE.ConeGeometry(0.58, 1, 7, 1),
  ...Object.fromEntries(['willow', 'reed', 'straw', 'rice', 'cattail'].map(kind => [kind, buildGrass(kind)])) };
const bounds = Object.fromEntries(Object.entries(geometries).map(([kind, geo]) => { geo.computeBoundingBox(); return [kind, { min: geo.boundingBox.min.toArray(), max: geo.boundingBox.max.toArray() }]; }));
const pools = [Object.fromEntries(Object.entries(geometries).map(([kind, geo]) => [kind, { geo }]))];
const logs = [];
const logger = Object.fromEntries(['debug', 'info', 'warn', 'error'].map(level => [level, (category, event, detail) => logs.push({ level, category, event, ...detail })]));
let terrain = () => 0, water = null;
const flat = { sample: (x, z) => ({ h: terrain(x, z), waterLevel: water }), heightAt: (x, z) => terrain(x, z) };
const planner = create({ gen: flat, logger, bounds });
function box(x, y, z, sx, sy, sz, yaw = 0) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(sx, sy, sz)).toArray();
}
const chunk = (matrices, kind = 'solid') => ({ x0: -256, z0: -256, size: 512, lod: 0, inst: { [kind]: { m: new Float32Array(matrices.flat()) } } });
const feature = { x: 0, z: 0, h: 0, r: 8, type: 'test-building', yaw: 0 };
const manual = { mode: 'orbit', look: [0, 5, 0], span: 5, angle: 0, radius: 44, y: 15, sweep: 0.32, slide: 20 };

// The selected view must change because of an actual rotated near wall.
const wall = chunk([box(0, 14, 33, 18, 28, 3, Math.PI / 5)]);
const wallIndex = planner.assetIndex([wall], feature, 120);
assert.equal(planner.view(manual, planner.pose(manual, 0.5).pos, wallIndex).safe, false);
for (const mode of ['static', 'orbit', 'pan']) {
  const shot = planner.choose(feature, { mode }, [wall]); assert(shot);
  assert(planner.assess(shot, wallIndex).safe, 'A selected shot must avoid the wall throughout its motion');
}
// Both endpoints are unobstructed; a tree crown in the middle must still fail.
const crown = chunk([box(0, 15, 44, 2, 3, 2)], 'leaf');
const crownIndex = planner.assetIndex([crown], feature, 120);
assert(planner.view(manual, planner.pose(manual, 0).pos, crownIndex, false).safe);
assert(planner.view(manual, planner.pose(manual, 1).pos, crownIndex, false).safe);
assert.equal(planner.assess(manual, crownIndex).safe, false, 'Endpoint-only clearance misses a mid-path crown');
terrain = (x, z) => 35 * Math.exp(-(x * x + (z - 44) ** 2) / 4);
const empty = planner.assetIndex([], feature, 120);
assert(planner.view(manual, planner.pose(manual, 0).pos, empty, false).safe);
assert(planner.view(manual, planner.pose(manual, 1).pos, empty, false).safe);
assert.equal(planner.assess(manual, empty).safe, false, 'A narrow ridge in the orbit must be rejected');
terrain = () => 45; water = 63;
const lake = { x: 0, z: 0, h: 63, r: 110, lakeGroup: 'generated-valley' };
const lakeShot = planner.choose(lake, { mode: 'pan' }); assert(lakeShot);
for (let i = 0; i <= 40; i++) assert(planner.pose(lakeShot, i / 40).pos[1] > 63 + 3.5, 'High lakes use their physical water surface');
terrain = () => 1000; water = null;
assert.equal(planner.choose(feature, { mode: 'orbit' }), null, 'An impossible view must fail instead of placing a camera under terrain');
terrain = () => 0;
// Hanging willow geometry lives below its root; reeds extend above one unit.
// Probe actual triangles, including rotation and nonuniform scaling, rather
// than assuming all instance kinds use a centred unit cube.
for (const [kind, accept] of [['willow', y => y < -0.8], ['reed', y => y > 1.03]]) {
  const geo = geometries[kind], position = geo.attributes.position;
  const matrix = new THREE.Matrix4().compose(new THREE.Vector3(0, 10, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0.4, 0.1)), new THREE.Vector3(2, 6, 2));
  let triangle;
  for (let i = 0; i < position.count; i += 3) {
    const points = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(position, i + j));
    if (accept(points.reduce((n, p) => n + p.y, 0) / 3)) { triangle = points.map(p => p.applyMatrix4(matrix)); break; }
  }
  assert(triangle, 'Missing real probe triangle');
  const center = triangle.reduce((p, q) => p.add(q), new THREE.Vector3()).multiplyScalar(1 / 3);
  const normal = triangle[1].clone().sub(triangle[0]).cross(triangle[2].clone().sub(triangle[0])).normalize();
  const from = center.clone().addScaledVector(normal, 0.04), to = center.clone().addScaledVector(normal, -0.04);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); mesh.matrixAutoUpdate = false; mesh.matrix.copy(matrix); mesh.updateMatrixWorld(true);
  assert(new THREE.Raycaster(from, to.clone().sub(from).normalize(), 0, 0.081).intersectObject(mesh).length);
  const index = planner.assetIndex([chunk([matrix.toArray()], kind)], feature, 120);
  assert.notEqual(index.ray(from.toArray(), to.toArray()), null, 'Planner missed the actual ' + kind + ' triangle'); mesh.material.dispose();
}
const still = planner.choose(feature, { mode: 'static' });
assert.deepEqual(planner.pose(still, 0).pos, planner.pose(still, 1).pos);
const pan = planner.choose(feature, { mode: 'pan' }); assert.equal(pan.mode, 'pan');
const pos = t => new THREE.Vector3(...planner.pose(pan, t).pos);
assert(pos(0).distanceTo(pos(0.001)) < pos(0.499).distanceTo(pos(0.5)) * 0.01, 'Motion must ease into a shot');

function previewChunks(f, p, options = {}) {
  const extent = p.dimensions(f, options).extent, lod = extent > 220 ? 3 : 2, size = GEN.LODS[lod].size, chunks = [];
  for (let z = Math.floor((f.z - extent - 72) / size); z <= Math.floor((f.z + extent + 72) / size); z++)
    for (let x = Math.floor((f.x - extent - 72) / size); x <= Math.floor((f.x + extent + 72) / size); x++) {
      if (Math.hypot(Math.max(Math.abs((x + 0.5) * size - f.x) - size / 2, 0), Math.max(Math.abs((z + 0.5) * size - f.z) - size / 2, 0)) <= extent + 72)
        chunks.push(GEN.genChunk(x, z, lod));
    }
  return chunks;
}
// Independent Three.js CPU raycasts against the exact unit-box meshes verify
// the planner's matrix-based obstruction query without a WebGL renderer.
function actualMeshes(chunks) {
  const meshes = [], mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  for (const kind of Object.keys(geometries)) {
    const matrices = chunks.flatMap(c => c.inst[kind] ? [c.inst[kind].m] : []), count = matrices.reduce((n, m) => n + m.length / 16, 0);
    if (!count) continue;
    const mesh = new THREE.InstancedMesh(geometries[kind], mat, count); let offset = 0;
    for (const m of matrices) { mesh.instanceMatrix.array.set(m, offset); offset += m.length; }
    mesh.updateMatrixWorld(true); mesh.computeBoundingSphere(); meshes.push(mesh);
  }
  return { meshes, dispose() { for (const mesh of meshes) mesh.dispose(); mat.dispose(); } };
}
const report = [];
for (const [theme, seed, key, aspect] of [
  ['sakura', 'cinematic-a', 'castle', 16 / 9], ['shanshui', 'cinematic-a', 'palace', 16 / 9],
  ['shanshui', 'cinematic-b', 'chineseTeahouse', 9 / 16], ['shanshui', 'cinematic-b', GEN.B.LAKE, 9 / 16],
]) {
  GEN.setTheme(theme); GEN.setSeed(seed);
  const f = GEN.findBiome(key, 0, 0, 9000); assert(f, 'Actual landmark not found');
  const p = create({ gen: GEN, aspect: () => aspect, bounds }), chunks = previewChunks(f, p);
  const index = p.assetIndex(chunks, f, p.dimensions(f).extent), actual = actualMeshes(chunks), modes = [];
  for (const mode of ['static', 'orbit', 'pan']) {
    const shot = p.choose(f, { mode }, chunks); assert(shot, 'No actual scene view');
    const validation = p.assess(shot, index); assert(validation.safe);
    const camera = new THREE.PerspectiveCamera(p.pose(shot, 0).renderFov, aspect, 0.4, 7000);
    for (let j = 0; j <= 8; j++) {
      const pose = p.pose(shot, j / 8), origin = new THREE.Vector3(...pose.pos), look = new THREE.Vector3(...pose.look);
      assert(origin.y >= GEN.heightAt(origin.x, origin.z) + 3.5);
      camera.position.copy(origin); camera.lookAt(look); camera.updateMatrixWorld(true);
      const horizontal = new THREE.Vector3(look.z - origin.z, 0, origin.x - look.x).normalize();
      for (const side of [-1, 1]) {
        const edge = look.clone().addScaledVector(horizontal, shot.span * side).project(camera);
        assert(Math.abs(edge.x) <= 0.97 && Math.abs(edge.y) <= 0.97, 'Subject width must remain framed in landscape and portrait');
      }
      const d = origin.distanceTo(look), stop = Math.max(0.35, Math.min(0.98, 1 - shot.span / d));
      const ray = new THREE.Raycaster(origin, look.sub(origin).normalize(), 0, d * stop - 0.01);
      assert.equal(ray.intersectObjects(actual.meshes, false).length, 0, 'Actual mesh obstructs the chosen sightline');
    }
    modes.push(shot.mode);
  }
  report.push({ theme, seed, key, aspect, chunks: chunks.length, modes }); actual.dispose();
}

// When finer assets arrive, the same scene is checked again and a newly
// occupied moving path becomes a safe still shot instead of piercing a roof.
let loaded = [];
const refining = create({ gen: flat, loaded: () => loaded, logger });
const initial = await refining.plan(feature, { mode: 'orbit' }); assert(initial);
const mid = refining.pose(initial, 0.5).pos;
loaded = [chunk([box(mid[0], mid[1], mid[2], 7, 7, 7)])];
const replacement = await refining.refine(initial, 0.5); assert(replacement && replacement !== initial && replacement.mode === 'static');
assert(refining.assess(replacement, refining.assetIndex(loaded, feature, 200)).safe);
refining.cancel(); assert.equal(refining.state.phase, 'idle');
const selectedLayer = create({ gen: flat, loaded: () => [{ shown: false, data: crown }], bounds });
const selectedShot = await selectedLayer.plan(feature, { mode: 'orbit' });
assert.equal(await selectedLayer.refine(selectedShot), selectedShot, 'A covered/hidden coarse layer is not actual scene obstruction');
const unblockedFine = { x0: -32, z0: 32, size: 64, lod: 0, inst: {} };
assert.equal(planner.mergeChunks([crown], [unblockedFine])[0].inst.leaf, undefined, 'Actual fine ownership must replace the coarse crown proxy');

// Worker lifecycle failures/cancellation cannot leave a pending Promise,
// worker or object URL behind. The actual generated worker source also parses.
const blobs = new Map(), workers = [], revoked = [], timers = new Map(); let serial = 0;
class FakeBlob { constructor(parts) { this.source = parts.join(''); } }
class FakeWorker {
  constructor(url) { this.url = url; workers.push(this); new Function('self', blobs.get(url).source); }
  postMessage(data) { this.request = data; } terminate() { this.terminated = true; }
}
const previewFactory = new Function('GEN_SRC', 'URL', 'Blob', 'Worker', 'LOG', 'innerWidth', 'innerHeight', 'SEED', 'THEME', 'setTimeout', 'clearTimeout', 'POOLS',
  source.split('const CINEMATIC =')[0] + '\nreturn createCinematicPreview;')(
  generatorSource, { createObjectURL(b) { const url = 'blob:' + ++serial; blobs.set(url, b); return url; }, revokeObjectURL: url => revoked.push(url) },
  FakeBlob, FakeWorker, logger, 1920, 1080, 'arbitrary', 'shanshui', fn => { const id = ++serial; timers.set(id, fn); return id; }, id => timers.delete(id), pools);
const preview = previewFactory();
let pending = preview(feature, {}, 100), worker = workers.at(-1); preview.cancel();
assert.equal(await pending, null); assert(worker.terminated && revoked.includes(worker.url));
pending = preview(feature, {}, 100); worker = workers.at(-1); worker.onmessage({ data: { chunks: [], shot: still } });
assert.equal((await pending).shot, still); assert(worker.terminated);
pending = preview(feature, {}, 100); worker = workers.at(-1); worker.onerror({ message: 'fixture-error' });
assert.equal(await pending, null); assert(worker.terminated);
pending = preview(feature, {}, 100); worker = workers.at(-1); [...timers.values()].at(-1)();
assert.equal(await pending, null); assert(worker.terminated && timers.size === 0);
assert.equal(revoked.length, workers.length);

// Run the exact browser worker script in a real JS worker. This catches worker
// serialization errors, measures a bounded first shot/replan, and proves the
// main event loop continues while generation and scoring are in progress.
const threadWorkers = [], threadURLs = new Map(), terminations = []; let threadSerial = 0;
class WorkerBridge {
  constructor(url) {
    this.worker = new ThreadWorker('const { parentPort } = require("node:worker_threads"); const self = { postMessage: (data, transfer) => parentPort.postMessage(data, transfer) }; parentPort.on("message", data => self.onmessage({ data }));\n' + threadURLs.get(url).source, { eval: true });
    this.worker.on('message', data => this.onmessage?.({ data })); this.worker.on('error', error => this.onerror?.({ message: error.message })); threadWorkers.push(this);
  }
  postMessage(data) { this.worker.postMessage(data); }
  terminate() { this.terminated = true; terminations.push(this.worker.terminate()); }
}
const threadedPreview = new Function('GEN_SRC', 'URL', 'Blob', 'Worker', 'LOG', 'innerWidth', 'innerHeight', 'SEED', 'THEME', 'setTimeout', 'clearTimeout', 'POOLS',
  source.split('const CINEMATIC =')[0] + '\nreturn createCinematicPreview;')(
  generatorSource, { createObjectURL(b) { const url = 'thread:' + ++threadSerial; threadURLs.set(url, b); return url; }, revokeObjectURL: url => threadURLs.delete(url) },
  FakeBlob, WorkerBridge, logger, 1920, 1080, 'review-arbitrary', 'shanshui', setTimeout, clearTimeout, pools)();
GEN.setTheme('shanshui'); GEN.setSeed('review-arbitrary');
const workerFeature = GEN.findBiome('changan', 0, 0, 9000), workerPlanner = create({ gen: GEN, bounds });
let heartbeats = 0; const heartbeat = setInterval(() => heartbeats++, 10);
const began = performance.now(), workerResult = await threadedPreview(workerFeature, { mode: 'orbit' }, workerPlanner.dimensions(workerFeature).extent);
const firstShotMs = performance.now() - began;
assert(workerResult?.shot && firstShotMs < 8000, 'First worker shot exceeded its delivery budget');
assert(heartbeats > 2, 'Generation/scoring blocked the main event loop');
const workerMid = workerPlanner.pose(workerResult.shot, 0.5).pos, size = 32;
const fine = GEN.genChunk(Math.floor(workerMid[0] / size), Math.floor(workerMid[2] / size), 0);
fine.inst.solid.m = new Float32Array([...fine.inst.solid.m, ...box(...workerMid, 7, 7, 7)]);
const actualFine = { x0: fine.x0, z0: fine.z0, size: fine.size, lod: fine.lod, inst: Object.fromEntries(Object.entries(fine.inst).map(([kind, b]) => [kind, { m: b.m }])) };
const beforeRefine = performance.now(), replan = await threadedPreview.refine(workerFeature, { mode: 'orbit' }, workerResult.chunks, [actualFine], workerResult.shot);
const replanMs = performance.now() - beforeRefine; clearInterval(heartbeat);
assert(replan?.shot?.mode === 'static' && replanMs < 4000, 'Loaded replan must be delivered by a worker within budget');
await Promise.all(terminations); assert(threadWorkers.every(w => w.terminated) && threadURLs.size === 0);

// Exercise the production carousel controller with a real perspective camera.
const elements = new Map(), classes = new Set(), events = {};
const body = { classList: { toggle(c, on) { if (on) classes.add(c); else classes.delete(c); }, contains: c => classes.has(c) }, appendChild() {} };
const canvas = { addEventListener() {}, classList: { add() {}, remove() {} }, setPointerCapture() {} };
const button = { setAttribute() {}, textContent: '' }; elements.set('btnTour', button);
let heldPlan = null, pendingPlan = null, fakeMood = 'golden';
const tourPlan = create({ gen: flat }), camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.4, 7000);
const cinematic = {
  async plan(f, opts) { const s = tourPlan.choose(f, opts); if (heldPlan) return new Promise(resolve => { pendingPlan = () => resolve(s); }); return s; },
  lensFov: tourPlan.lensFov, pose: tourPlan.pose, refine: async s => s, cancel() {}, progress() {},
};
const context = { THREE, CINEMATIC: cinematic, REDUCED: true, QS: new URLSearchParams(), camera, canvas, document: { body, createElement: () => ({ style: {} }) },
  GEN: { profile: { landmarks: [{ key: 'palace' }, { key: 'changan' }] }, heightAt: () => 0,
    findBiome: key => ({ ...feature, type: key }), vantage: () => ({ pos: [0, 15, 44], target: [0, 5, 0] }) },
  THEME: 'shanshui', $: id => elements.get(id), I18N: { t: k => k }, LOG: logger, FOLLOW: { target: null },
  ST: { chunks: new Map([['ready', { state: 'ready', shown: true, L: 1, data: { x0: -1000, z0: -1000, size: 2000 } }]]) },
  innerWidth: 1920, innerHeight: 1080, nextFrame: async () => {}, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), lerp: (a, b, t) => a + (b - a) * t,
  smoothstep: (a, b, t) => { t = Math.max(0, Math.min(1, (t - a) / (b - a))); return t * t * (3 - 2 * t); },
  setTimeout: fn => { fn(); return 0; }, clearTimeout() {}, performance, window: { addEventListener: (type, fn) => { events[type] = fn; } },
  stopFollow() {}, updateFollow: () => false, lookFollow() {}, selectUnit() {}, closeMenu() {}, toastKey() {}, saveImage() {}, toggleUI() {},
  setMood(mood) { fakeMood = mood; },
};
const app = fs.readFileSync(path.join(root, 'src/24_app.js'), 'utf8');
const teleport = app.slice(app.indexOf('async function teleport('), app.indexOf('// --- ambient sound'));
const api = vm.runInNewContext(app.split('// --- UI helpers')[0] + '\n' + teleport + '\n({car,startTour,stopTour,updateCamera,teleport,camS,camG,setMood});', context);
await api.startTour({ mode: 'orbit' }); assert(api.car.on && api.car.leg === 'dwell' && classes.has('touring'));
for (const [key, mood] of [['1', 'morning'], ['5', 'rain'], ['4', 'night']]) { events.keydown({ key, target: null }); assert.equal(fakeMood, mood); api.updateCamera(0.1); await Promise.resolve(); assert(api.car.on && classes.has('touring')); }
assert.equal(fakeMood, 'night'); assert(api.camS.pos.distanceTo(api.camG.pos) < 1e-9);
events.keydown({ key: 'Escape', target: null }); assert(!api.car.on && !classes.has('touring'));
await api.startTour({ mode: 'pan' }); events.keydown({ key: 'w', target: null }); assert(!api.car.on && !classes.has('touring'));
await api.startTour(); await api.teleport('palace'); assert(!api.car.on && !classes.has('touring'));
heldPlan = true; const late = api.startTour(); await new Promise(resolve => setImmediate(resolve));
assert(pendingPlan); api.stopTour(); pendingPlan(); await late;
assert(!api.car.on && !classes.has('touring'), 'A cancelled async search must never revive the tour');
assert(logs.some(e => e.category === 'access' && e.event === 'tour-start-requested'));
for (const geo of Object.values(geometries)) geo.dispose();
console.info(JSON.stringify({ scenes: report, midpointTerrainAndCrown: true, actualMeshRaycasts: true, customPlantBounds: true, selectedLODOnly: true, portraitFraming: true,
  workerLifecycle: true, workerTiming: { firstShotMs: Math.round(firstShotMs), replanMs: Math.round(replanMs), heartbeats }, tourExitRestoresUI: true, moodDuringTour: true }));
