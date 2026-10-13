// =====================================================================
//  Streaming: worker pool + quadtree-consistent LOD rings
// =====================================================================
const WORKER_SRC = GEN_SRC + `
self.onmessage = function (e) {
  var d = e.data;
  try {
    if (d.type === 'seed') { GEN.setSeed(d.seed); return; }
    if (d.type === 'chunk') {
      var c = GEN.genChunk(d.cx, d.cz, d.lod), tr = [c.terrain.pos.buffer, c.terrain.nor.buffer, c.terrain.col.buffer, c.terrain.idx.buffer, c.tuft.m.buffer, c.tuft.c.buffer, c.lights.buffer, c.spots.petal.buffer, c.spots.smoke.buffer, c.spots.fly.buffer];
      if (c.water) tr.push(c.water.pos.buffer, c.water.depth.buffer, c.water.idx.buffer);
      if (c.paddy) tr.push(c.paddy.pos.buffer, c.paddy.depth.buffer, c.paddy.idx.buffer);
      for (var k in c.inst) tr.push(c.inst[k].m.buffer, c.inst[k].c.buffer);
      self.postMessage({ type: 'chunk', key: d.key, gen: d.gen, c: c }, tr);
    }
  } catch (err) { self.postMessage({ type: 'error', key: d.key, gen: d.gen, msg: String(err && err.stack || err) }); }
};`;
const workerURL = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
const NW = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
const workers = [];
let genTag = 1;
const ST = { chunks: new Map(), queue: [], inflight: 0, ready: [], errors: 0, frame: 0, need: new Set() };
for (let i = 0; i < NW; i++) {
  const w = new Worker(workerURL);
  w.busy = 0;
  w.onmessage = (e) => {
    const d = e.data;
    w.busy--; ST.inflight--;
    if (d.type === 'error') { ST.errors++; console.error('chunk worker:', d.msg); const ch = ST.chunks.get(d.key); if (ch && d.gen === genTag) ch.state = 'failed'; return; }
    if (d.gen !== genTag) return;
    ST.ready.push(d);
  };
  w.onerror = (e) => { console.error('worker error', e.message); };
  w.postMessage({ type: 'seed', seed: SEED });
  workers.push(w);
}
const KEY = (L, cx, cz) => L + ':' + cx + ':' + cz;
const RING = QUALITY === 'high' ? 5 : 4; // half-width of every LOD ring, in chunks of that LOD
const camRef = new THREE.Vector3();

function desired(cam) {
  const out = [];
  for (let L = 0; L < NL; L++) {
    const S = GEN.LODS[L].size;
    const ix0 = Math.floor(cam.x / S) - RING + (L > 0 ? 1 : 0), iz0 = Math.floor(cam.z / S) - RING + (L > 0 ? 1 : 0);
    const extra = L === 0 ? 1 : (L >= NL - 2 ? 2 : (L === NL - 3 ? 1 : 0));
    const half = RING + extra;
    out.push({ L, ix0, iz0, ix1: ix0 + half * 2 - (L > 0 ? 1 : 0), iz1: iz0 + half * 2 - (L > 0 ? 1 : 0), half });
  }
  return out;
}
function regionHas(R, cx, cz) { return cx >= R.ix0 && cx < R.ix1 && cz >= R.iz0 && cz < R.iz1; }

function requestChunk(L, cx, cz, prio) {
  const key = KEY(L, cx, cz);
  let ch = ST.chunks.get(key);
  if (!ch) { ch = { key, L, cx, cz, state: 'queued', shown: false, blocks: [], meshes: [], prio }; ST.chunks.set(key, ch); ST.queue.push(ch); }
  ch.prio = prio; ch.wanted = ST.frame;
  if (ch.state === 'failed' && Math.random() < 0.01) { ch.state = 'queued'; ST.queue.push(ch); }
  return ch;
}
function pump() {
  if (!ST.queue.length) return;
  ST.queue = ST.queue.filter((c) => c.state === 'queued' && c.wanted === ST.frame);
  ST.queue.sort((a, b) => a.prio - b.prio);
  while (ST.queue.length && ST.inflight < NW * 2) {
    const ch = ST.queue.shift();
    let w = workers[0];
    for (const x of workers) if (x.busy < w.busy) w = x;
    w.busy++; ST.inflight++;
    ch.state = 'gen';
    w.postMessage({ type: 'chunk', key: ch.key, gen: genTag, cx: ch.cx, cz: ch.cz, lod: ch.L });
  }
}
const _bs = new THREE.Sphere(), _bb = new THREE.Box3();
function integrate(d) {
  const ch = ST.chunks.get(d.key);
  if (!ch || ch.state !== 'gen') return;
  const c = d.c, L = c.lod;
  ch.data = c;
  // terrain
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(c.terrain.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(c.terrain.nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(c.terrain.col, 3));
  g.setIndex(new THREE.BufferAttribute(c.terrain.idx, 1));
  _bb.min.set(c.x0, c.terrain.minY, c.z0); _bb.max.set(c.x0 + c.size, c.terrain.maxY + 2, c.z0 + c.size);
  g.boundingBox = _bb.clone(); g.boundingSphere = _bb.getBoundingSphere(new THREE.Sphere());
  const tm = new THREE.Mesh(g, terrainMats[L]);
  tm.castShadow = L <= 1; tm.receiveShadow = L <= 2; tm.visible = false; tm.matrixAutoUpdate = false;
  scene.add(tm); ch.meshes.push(tm); ch.terrain = tm;
  for (const [wd, mat] of [[c.water, waterMat], [c.paddy, paddyMat]]) {
    if (!wd) continue;
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.BufferAttribute(wd.pos, 3));
    wg.setAttribute('depth', new THREE.BufferAttribute(wd.depth, 1));
    wg.setIndex(new THREE.BufferAttribute(wd.idx, 1));
    wg.boundingBox = _bb.clone(); wg.boundingSphere = g.boundingSphere.clone();
    const wm = new THREE.Mesh(wg, mat);
    wm.renderOrder = 2; wm.visible = false; wm.matrixAutoUpdate = false;
    if (mat === waterMat) { wm.userData.water = true; ch.hasWater = true; }
    scene.add(wm); ch.meshes.push(wm);
  }
  // instances: upload ONCE here; show/hide only toggles visibility or zeroes slots
  const P = POOLS[L];
  for (const [name, b] of Object.entries(c.inst)) {
    const n = b.c.length / 3;
    if (!n || !P[name]) continue;
    const slot = P[name].alloc(n);
    P[name].write(slot, b.m, b.c);
    ch.blocks.push({ pool: P[name], s: slot, n, m: b.m, c: b.c });
  }
  if (L === 0 && c.tuft.c.length && !window.__noTuft) {
    const n = c.tuft.c.length / 3;
    const frac = QUALITY === 'high' ? 1 : 0.4;
    const nn = Math.max(1, Math.floor(n * frac));
    const tm = c.tuft.m.subarray(0, nn * 16), tc = c.tuft.c.subarray(0, nn * 3);
    const slot = P.tuft.alloc(nn);
    P.tuft.write(slot, tm, tc);
    ch.blocks.push({ pool: P.tuft, s: slot, n: nn, m: tm, c: tc });
  }
  ch.state = 'ready';
  ch.cx0 = c.x0 + c.size / 2; ch.cz0 = c.z0 + c.size / 2;
}
const ZERO16 = new Float32Array(16 * 4096);
function setShown(ch, v) {
  if (ch.shown === v) return;
  ch.shown = v;
  for (const m of ch.meshes) m.visible = v;
  if (!v) { for (const b of ch.blocks) { b.pool.clear(b.s, b.n); b.dirty = true; } }
  else for (const b of ch.blocks) if (b.dirty) { b.pool.rewrite(b.s, b.n, b.m, b.c); b.dirty = false; }
  STREAM.dirtyShadow = true;
}
function disposeChunk(ch) {
  setShown(ch, false);
  for (const m of ch.meshes) { scene.remove(m); m.geometry.dispose(); }
  for (const b of ch.blocks) b.pool.release(b.s, b.n);
  ch.meshes = []; ch.blocks = []; ch.data = null;
  ST.chunks.delete(ch.key);
}
const STREAM = { regions: [], dirtyShadow: true, lastCam: new THREE.Vector3(1e9, 0, 0), readyFrac: 0, visibleWater: false };
function streamUpdate(cam, force) {
  ST.frame++;
  const R = desired(cam);
  STREAM.regions = R;
  // request everything in the rings
  let total = 0, ready = 0;
  for (const r of R) {
    const S = GEN.LODS[r.L].size;
    for (let cz = r.iz0; cz < r.iz1; cz++) for (let cx = r.ix0; cx < r.ix1; cx++) {
      const d = Math.hypot((cx + 0.5) * S - cam.x, (cz + 0.5) * S - cam.z);
      const inner = r.L > 0 && regionHas(R[r.L - 1], cx * 2, cz * 2);
      const ch = requestChunk(r.L, cx, cz, d / S + (inner ? 0.5 : 0) - (r.L === NL - 1 ? 2 : 0));
      if (!inner || r.L === 0) { total++; if (ch.state === 'ready') ready++; }
    }
  }
  STREAM.readyFrac = total ? ready / total : 1;
  // visibility: walk from the coarsest ring down
  const show = new Set();
  const visit = (L, cx, cz) => {
    const ch = ST.chunks.get(KEY(L, cx, cz));
    if (L > 0 && regionHas(R[L - 1], cx * 2, cz * 2)) {
      let ok = true;
      for (let j = 0; j < 2 && ok; j++) for (let i = 0; i < 2 && ok; i++) { const k = ST.chunks.get(KEY(L - 1, cx * 2 + i, cz * 2 + j)); if (!k || k.state !== 'ready') ok = false; }
      if (ok && (window.__noLOD1 ? false : true)) { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) visit(L - 1, cx * 2 + i, cz * 2 + j); return; }
    }
    if (ch && ch.state === 'ready') show.add(ch);
  };
  const top = R[NL - 1];
  for (let cz = top.iz0; cz < top.iz1; cz++) for (let cx = top.ix0; cx < top.ix1; cx++) visit(NL - 1, cx, cz);
  let water = false;
  for (const ch of ST.chunks.values()) {
    const v = show.has(ch);
    setShown(ch, v);
    if (v && ch.hasWater && ch.L <= 3) water = true;
    if (!v) {
      // dispose only when well outside its ring: no visible pop at the boundary
      const S = GEN.LODS[ch.L].size;
      const cc = { x: (ch.cx + 0.5) * S, z: (ch.cz + 0.5) * S };
      const dC = Math.hypot(cc.x - cam.x, cc.z - cam.z) / S;
      const lodExtra = ch.L >= NL - 2 ? 2 : (ch.L === NL - 3 ? 1 : 0);
      const keep = ch.state === 'ready' && dC < RING + lodExtra + 1.5;
      if (!keep && ch.wanted !== ST.frame) disposeChunk(ch);
      else if (ch.state === 'queued' && ch.wanted !== ST.frame) ST.chunks.delete(ch.key);
    }
  }
  STREAM.visibleWater = water;
  pump();
}
function integrateSome(budgetMs) {
  const t0 = performance.now();
  let n = 0;
  while (ST.ready.length && (performance.now() - t0 < budgetMs || n === 0)) { integrate(ST.ready.shift()); n++; }
  return n;
}
function resetWorld(seed) {
  SEED = String(seed);
  genTag++;
  GEN.setSeed(SEED);
  for (const w of workers) w.postMessage({ type: 'seed', seed: SEED });
  for (const ch of [...ST.chunks.values()]) { if (ch.state === 'ready') disposeChunk(ch); }
  ST.chunks.clear(); ST.queue = []; ST.ready = [];
  STREAM.dirtyShadow = true;
}

// ---------------------------------------------------------------------
//  Warm lantern lights: nearest few become real point lights
// ---------------------------------------------------------------------
const LAMPS = [];
const NLAMP = QUALITY === 'high' ? 8 : 4;
for (let i = 0; i < 8; i++) {
  const l = new THREE.PointLight(0xffa860, 0, 16, 2);
  l.visible = i < NLAMP; scene.add(l); LAMPS.push(l);
}
let lampTimer = 0;
function updateLamps(dt, level) {
  lampTimer -= dt;
  if (lampTimer > 0) return;
  lampTimer = 0.4;
  const cands = [];
  const cx = camera.position.x, cz = camera.position.z;
  for (const ch of ST.chunks.values()) {
    if (!ch.shown || ch.L > 1 || !ch.data) continue;
    const a = ch.data.lights;
    for (let i = 0; i < a.length; i += 6) {
      const d = Math.hypot(a[i] - cx, a[i + 2] - cz);
      if (d < 90) cands.push([d / (a[i + 3] + 0.2), a[i], a[i + 1], a[i + 2], a[i + 3]]);
    }
  }
  cands.sort((p, q) => p[0] - q[0]);
  for (let i = 0; i < NLAMP; i++) {
    const L = LAMPS[i], c = cands[i];
    if (c) { L.position.set(c[1], c[2], c[3]); L.userData.base = c[4]; } else L.userData.base = 0;
    L.intensity = (L.userData.base || 0) * 16 * level;
  }
}
