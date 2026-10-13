const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'world.manifest.json'), 'utf8'));
const source = manifest.generator.map(p => fs.readFileSync(path.join(root, 'src', p), 'utf8')).join('\n');
const expose = s => s.replace('  setSeed, setTheme,', '  emitTownHouseLOD, setSeed, setTheme,');
const G = vm.runInNewContext(expose(source) + '\nGEN;');
// Keep the level-two house detail as a reference, while generating exactly the
// same far cell, terrain, plants, landmarks and water in both generators.
const referenceSource = source.replace('emitChineseHouseLOD(c, lod);', 'emitChineseHouseLOD(c, 2);');
assert.notEqual(referenceSource, source, 'The reference must exercise the detailed house path');
const reference = vm.runInNewContext(expose(referenceSource) + '\nGEN;');
function records(inst) {
  const result = [];
  for (const [kind, bucket] of Object.entries(inst)) {
    const m = bucket.m.out ? bucket.m.out() : bucket.m, c = bucket.c.out ? bucket.c.out() : bucket.c;
    assert(m.every(Number.isFinite) && c.every(Number.isFinite));
    assert.equal(c.length, m.length / 16 * 3);
    for (let i = 0; i < m.length / 16; i++) result.push({ kind, m: Array.from(m.subarray(i * 16, i * 16 + 16)), c: Array.from(c.subarray(i * 3, i * 3 + 3)) });
  }
  return result;
}
const signature = r => JSON.stringify(r);
function subset(actual, expected) {
  const available = new Map();
  for (const r of expected) { const key = signature(r); available.set(key, (available.get(key) || 0) + 1); }
  for (const r of actual) { const key = signature(r), n = available.get(key) || 0; assert(n > 0, 'A retained building part changed its transform or colour'); available.set(key, n - 1); }
}
function bounds(rs) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const { m } of rs) for (let axis = 0; axis < 3; axis++) {
    const half = (Math.abs(m[axis]) + Math.abs(m[axis + 4]) + Math.abs(m[axis + 8])) / 2;
    min[axis] = Math.min(min[axis], m[12 + axis] - half); max[axis] = Math.max(max[axis], m[12 + axis] + half);
  }
  return { min, max };
}
function house(c, lod) { G.kit.reset(); G.emitTownHouseLOD(c, lod); assert.equal(G.kit.stack.length, 0); return records(G.kit.b); }
function lotsIn(g, cx, cz, lod) {
  const size = g.LODS[lod].size, x0 = cx * size, z0 = cz * size, lots = [];
  for (let bz = Math.floor(z0 / 26) - 1; bz * 26 < z0 + size; bz++) for (let bx = Math.floor(x0 / 34) - 1; bx * 34 < x0 + size; bx++) {
    for (let row = 0; row < 2; row++) for (let li = 0; li < 4; li++) {
      const c = g.townCandidate(bx, bz, row, li);
      if (c && c.x >= x0 && c.x < x0 + size && c.z >= z0 && c.z < z0 + size) lots.push(c);
    }
  }
  return lots;
}
function sameArray(a, b, label) { assert.equal(a?.length, b?.length, label); if (a) for (let i = 0; i < a.length; i++) assert.equal(a[i], b[i], label); }
const report = [], kinds = new Set(), floors = new Set();let houseChecks = 0;
for (const theme of ['shanshui', 'sakura']) for (const seed of ['sakura', 'yuki', 'kawa']) {
  G.setTheme(theme); reference.setTheme(theme); G.setSeed(seed); reference.setSeed(seed);
  const town = G.findBiome(G.B.TOWN, 0, 0, 5000); assert(town, 'A generated town must exist');
  for (const lod of [3, 4]) {
    const size = G.LODS[lod].size, cx = Math.floor(town.x / size), cz = Math.floor(town.z / size);
    const lots = lotsIn(G, cx, cz, lod), oldLots = lotsIn(reference, cx, cz, lod);
    assert.equal(JSON.stringify(lots), JSON.stringify(oldLots), 'Positions, seeds, species, footprint and distribution must stay identical');
    for (const c of lots.filter(c => c.type !== 'garden').slice(0, 80)) {
      const near = house(c, theme === 'shanshui' ? 2 : 3), far = house(c, lod), a = bounds(near), b = bounds(far);
      subset(far, near); kinds.add(theme + ':' + c.type);
      assert.equal(far.length, near.length - (theme === 'shanshui' ? 4 : 0));
      assert.equal(JSON.stringify(far.filter(r => r.kind === 'glow')), JSON.stringify(near.filter(r => r.kind === 'glow')), 'All night windows and floor heights must remain unchanged');
      for (let axis = 0; axis < 3; axis++) {
        assert(Math.abs(a.min[axis] - b.min[axis]) < .08 && Math.abs(a.max[axis] - b.max[axis]) < .08, 'The roof skyline and footprint must survive the reduction');
      }
      if (theme === 'shanshui') {
        const glowCount = far.filter(r => r.kind === 'glow').length; floors.add(glowCount);
        assert.equal(far.length, glowCount === 2 ? 10 : 7, 'Far house instance budget exceeded');
        // All solid roof courses/ridges above the wall survive, including the
        // low front awning of two-storey houses. Only buried eave strips go.
        const dropped = near.filter(r => !far.some(f => signature(f) === signature(r)));
        assert.equal(dropped.filter(r => r.kind === 'lacquer').length, 2);
        assert.equal(dropped.filter(r => r.kind === 'solid').length, 2);
        for (const r of dropped.filter(r => r.kind === 'solid')) assert(Math.abs(r.m[6]) > 0 && Math.abs(r.m[9]) > 0, 'Roof courses or ridges must not be removed');
      }
      houseChecks++;
    }
    const actual = G.genChunk(cx, cz, lod), old = reference.genChunk(cx, cz, lod), actualParts = records(actual.inst), oldParts = records(old.inst);
    subset(actualParts, oldParts);
    const houses = lots.filter(c => c.type !== 'garden').length;
    assert.equal(oldParts.length - actualParts.length, theme === 'shanshui' ? houses * 4 : 0, 'Only the intended town details may change');
    for (const key of ['pos', 'nor', 'col', 'idx']) sameArray(actual.terrain[key], old.terrain[key], 'terrain ' + key);
    for (const key of ['pos', 'idx', 'depth', 'tint', 'clarity']) sameArray(actual.water?.[key], old.water?.[key], 'water ' + key);
    for (const [key, value] of Object.entries(actual.inst)) if (!['solid', 'lacquer'].includes(key)) {
      sameArray(value.m, old.inst[key]?.m, key + ' transforms'); sameArray(value.c, old.inst[key]?.c, key + ' colours');
    }
    report.push({ theme, seed, lod, cell: [cx, cz], houses, before: oldParts.length, after: actualParts.length, saved: oldParts.length - actualParts.length });
  }
}
for (const theme of ['shanshui', 'sakura']) for (const kind of ['machiya', 'shop', 'tile', 'kura']) assert(kinds.has(theme + ':' + kind), 'Fixtures must exercise the actual town types');
assert.equal(floors.size, 2, 'Fixtures must exercise seeded one- and two-storey houses');
console.info('Town LOD checks passed: unchanged sites/types, full hip roofs/ridges, storeys, awnings, glowing windows and water/terrain; only subpixel posts and buried eave strips removed.');
console.info(JSON.stringify({ houseChecks, cells: report }));
