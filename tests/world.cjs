const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const parts = JSON.parse(fs.readFileSync(path.join(root, 'world.manifest.json'), 'utf8')).generator;
// Deliberately no DOM/window: this is the same environment as chunk workers.
const GEN = vm.runInNewContext(parts.map(p => fs.readFileSync(path.join(root, 'src', p), 'utf8')).join('\n') + '\nGEN;', { Math });
let checkedSteps = 0, checkedTriangles = 0, checkedSeams = 0;
function meshFacts(chunk) {
  const { pos, nor, idx } = chunk.terrain, cs = GEN.LODS[chunk.lod].cs;
  const tops = new Map(), walls = [new Map(), new Map()];
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const u = [0, 1, 2].map(k => pos[b + k] - pos[a + k]);
    const v = [0, 1, 2].map(k => pos[c + k] - pos[a + k]);
    const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    assert(cross.every(Number.isFinite), 'Non-finite terrain triangle');
    assert(cross.reduce((s, n, k) => s + n * nor[a + k], 0) > 0, 'Degenerate or inward-facing terrain triangle');
    checkedTriangles++;
  }
  for (let i = 0; i < pos.length; i += 12) {
    const xs = [0, 3, 6, 9].map(k => pos[i + k]), ys = [1, 4, 7, 10].map(k => pos[i + k]), zs = [2, 5, 8, 11].map(k => pos[i + k]);
    if (nor[i + 1] === 1) {
      const x = Math.min(...xs), z = Math.min(...zs);
      assert.equal(Math.max(...xs) - x, cs); assert.equal(Math.max(...zs) - z, cs);
      tops.set(`${x}:${z}`, ys[0]);
    } else if (nor[i + 1] === 0) {
      const axis = nor[i] ? 0 : 1, plane = axis ? zs[0] : xs[0], along = axis ? xs : zs;
      const face = { lo: Math.min(...along), hi: Math.max(...along), bottom: Math.min(...ys), top: Math.max(...ys), normal: axis ? nor[i + 2] : nor[i] };
      if (!walls[axis].has(plane)) walls[axis].set(plane, []);
      walls[axis].get(plane).push(face);
    }
  }
  assert.equal(tops.size, (chunk.size / cs) ** 2, 'Missing terrain top');
  return { chunk, cs, tops, walls };
}
function covered(facts, axis, plane, along, low, high, normal) {
  return (facts.walls[axis].get(plane) || []).some(w => w.lo <= along && w.hi >= along && w.bottom <= low + 1e-5 && w.top >= high - 1e-5 && w.normal === normal);
}
function checkSteps(f) {
  const { chunk: c, cs, tops } = f;
  for (const [key, h] of tops) {
    const [x, z] = key.split(':').map(Number);
    for (const axis of [0, 1]) {
      const nx = x + (axis === 0 ? cs : 0), nz = z + (axis === 1 ? cs : 0), nh = tops.get(`${nx}:${nz}`);
      if (nh === undefined || h === nh) continue;
      assert(covered(f, axis, axis ? nz : nx, (axis ? x : z) + cs / 2, Math.min(h, nh), Math.max(h, nh), h > nh ? 1 : -1), `Open step at ${key}, LOD ${c.lod}`);
      checkedSteps++;
    }
  }
}
function checkSeam(a, b) {
  const edge = a.chunk.x0 + a.chunk.size;
  assert.equal(edge, b.chunk.x0);
  const start = Math.max(a.chunk.z0, b.chunk.z0), end = Math.min(a.chunk.z0 + a.chunk.size, b.chunk.z0 + b.chunk.size);
  for (let z = start + 0.25; z < end; z += 0.5) {
    const za = Math.floor((z - a.chunk.z0) / a.cs) * a.cs + a.chunk.z0, zb = Math.floor((z - b.chunk.z0) / b.cs) * b.cs + b.chunk.z0;
    const ah = a.tops.get(`${edge - a.cs}:${za}`), bh = b.tops.get(`${edge}:${zb}`);
    if (ah !== bh) {
      const high = ah > bh ? a : b;
      assert(covered(high, 0, edge, z, Math.min(ah, bh), Math.max(ah, bh), ah > bh ? 1 : -1), 'Open chunk/LOD seam');
    }
    checkedSeams++;
  }
}
let townChecks = 0, waterChecks = 0, validChecks = 0, crossingChecks = 0, stableAssets = 0, chineseChecks = 0;
for (const theme of ['sakura', 'shanshui']) {
  GEN.setTheme(theme);
for (const seed of ['sakura', 'yuki', 'kawa']) {
  GEN.setSeed(seed);
  for (let lod = 0; lod < GEN.LODS.length; lod++) {
    const a = meshFacts(GEN.genChunk(0, 0, lod)), b = meshFacts(GEN.genChunk(1, 0, lod));
    checkSteps(a); checkSteps(b); checkSeam(a, b);
    if (lod > 0) checkSeam(meshFacts(GEN.genChunk(1, 0, lod - 1)), b);
  }
  for (let z = -600; z <= 600; z += 24) for (let x = -600; x <= 600; x += 24) {
    const s = GEN.sample(x, z, {});
    if (s.biome === GEN.B.TOWN || s.street || s.town > 0.45) {
      for (const kind of ['fox', 'deer', 'fish', 'sparrow', 'butterfly', 'hawk', 'crane', 'buffalo']) assert.equal(GEN.habitatAt(kind, x, z), null, 'Animal spawned in town');
      townChecks++;
    }
    for (const kind of ['fox', 'deer']) {
      if (s.h < 0.25 || s.paddy) { assert.equal(GEN.habitatAt(kind, x, z), null, 'Land animal accepted water'); waterChecks++; }
      const valid = GEN.habitatAt(kind, x, z);
      if (valid) { assert(valid.h >= 0.45 && !valid.paddy && valid.biome !== GEN.B.TOWN); validChecks++; }
      // Two dry endpoints must not authorize a path through a river in between.
      const bx = x + 36;
      if (valid && GEN.habitatAt(kind, bx, z) && GEN.sample(x + 18, z, {}).h < 0) {
        assert.equal(GEN.habitatPath(kind, x, z, bx, z), false, 'Animal path crossed water'); crossingChecks++;
      }
    }
  }
}
  for (let gz = -20; gz <= 20; gz++) for (let gx = -20; gx <= 20; gx++) {
    for (let lod = 1; lod < GEN.LODS.length; lod++) {
      const far = GEN.assetCandidate(gx, gz, lod);
      if (!far) continue;
      const near = GEN.assetCandidate(gx, gz, 0);
      assert(near, 'Distant asset disappeared on approach');
      for (const key of ['x', 'z', 'kind', 'variant', 'seed', 'scale']) assert.equal(far[key], near[key], 'LOD asset site/species changed');
      stableAssets++;
    }
  }
  if (theme === 'shanshui') {
    for (let z = -600; z <= 600; z += 24) for (let x = -600; x <= 600; x += 24) {
      for (const kind of ['crane', 'buffalo']) {
        const h = GEN.habitatAt(kind, x, z);
        if (h) { assert(h.town <= 0.45 && !h.street && h.pad <= 0.2); chineseChecks++; }
      }
    }
  }
}
assert(stableAssets > 0 && chineseChecks > 0, 'Theme/LOD fixtures must exercise real assets and fauna');
assert(checkedSteps > 1000 && townChecks > 0 && waterChecks > 0 && validChecks > 0 && crossingChecks > 0, 'Regression fixtures must exercise the requested conditions');
console.info(JSON.stringify({ checkedTriangles, checkedSteps, checkedSeams, townChecks, waterChecks, validChecks, crossingChecks, stableAssets, chineseChecks }));
