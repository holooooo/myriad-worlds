const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const parts = JSON.parse(fs.readFileSync(path.join(root, 'world.manifest.json'), 'utf8')).generator;
const G = vm.runInNewContext(parts.map(p => fs.readFileSync(path.join(root, 'src', p), 'utf8')).join('\n') + '\nGEN;', { Math });
const stats = { lakeGroups: 0, ponds: 0, waterQuads: 0, railCuts: 0, railSamples: 0, terraceBands: 0 };
for (const seed of ['sakura', 'yuki', 'kawa']) {
  G.setTheme('shanshui'); G.setSeed(seed);
  const lake = G.findBiome(G.B.LAKE, 0, 0, 9000);
  assert.ok(lake && lake.waterLevel > 0, 'The lake finder must locate a raised valley lake');
  const ponds = new Map();
  for (let z = lake.z - 230; z <= lake.z + 230; z += 4) for (let x = lake.x - 230; x <= lake.x + 230; x += 4) {
    const s = G.sample(x, z, {}), w = G.waterAt(x, z);
    assert.equal(w === null, s.waterLevel === null, 'Water queries and terrain must share wet/dry state');
    if (!w) continue;
    assert.ok(w.depth > 0 && w.tint.every(Number.isFinite));
    assert.equal(w.level, s.waterLevel); assert.equal(w.kind, s.waterKind); assert.equal(w.id, s.waterId);
    if (w.kind !== 'lake' || w.id.split(':').slice(0, 2).join(':') !== lake.lakeGroup) continue;
    assert.equal(G.habitatAt('fox', x, z), null, 'Foxes may not walk on raised lakes');
    assert.equal(G.habitatAt('deer', x, z), null, 'Deer may not walk on raised lakes');
    if (w.depth > 1 && (!ponds.has(w.id) || w.depth > ponds.get(w.id).depth)) ponds.set(w.id, { ...w, x, z });
  }
  assert.ok(ponds.size >= 3, 'A Jiuzhai valley contains multiple separate pools');
  const ordered = [...ponds].sort((a, b) => Number(a[0].split(':').at(-1)) - Number(b[0].split(':').at(-1)));
  assert.ok(new Set(ordered.map(([, p]) => p.tint.join(','))).size >= 2, 'Pools have distinct mineral tones');
  for (let i = 1; i < ordered.length; i++) {
    const a = ordered[i - 1][1], b = ordered[i][1];
    assert.ok(a.level > b.level, 'Water surfaces descend along the valley');
    assert.equal(G.habitatPath('fish', a.x, a.z, b.x, b.z), false, 'Fish cannot cross a dry dam or a different pool');
  }
  stats.lakeGroups++; stats.ponds += ponds.size;
  const point = ordered[Math.floor(ordered.length / 2)][1];
  for (let L = 0; L < G.LODS.length; L++) {
    const size = G.LODS[L].size, cs = G.LODS[L].cs;
    const c = G.genChunk(Math.floor(point.x / size), Math.floor(point.z / size), L);
    assert.ok(c.water, 'Raised lake must survive every distance tier');
    const w = c.water;
    assert.equal(w.tint.length, w.pos.length); assert.equal(w.clarity.length, w.depth.length);
    for (let i = 0; i < w.pos.length; i += 12) {
      const x = w.pos[i] + cs / 2, z = w.pos[i + 2] + cs / 2, expected = G.waterAt(x, z);
      assert.ok(expected && expected.kind !== 'paddy');
      for (let v = 0; v < 4; v++) {
        assert.ok(Math.abs(w.pos[i + v * 3 + 1] - expected.level) < 1e-4, 'Geometry must use the physical lake elevation');
        assert.ok(Number.isFinite(w.depth[i / 3 + v]));
        for (let k = 0; k < 3; k++) assert.ok(Math.abs(w.tint[i + v * 3 + k] - expected.tint[k]) < 1e-5);
      }
      stats.waterQuads++;
    }
  }
  const bands = new Set();
  for (let z = -1200; z <= 1200; z += 24) for (let x = -1200; x <= 1200; x += 24) {
    const s = G.sample(x, z, {});
    if (!s.paddy) continue;
    bands.add(s.plate);
    assert.equal(s.h, s.plate); assert.equal(s.waterLevel, s.plate + 0.16);
  }
  assert.ok(bands.size >= 3, 'Terraces follow multiple elevation contours'); stats.terraceBands += bands.size;
  let cut = null;
  for (const line of [-1, 0, 1]) for (let x = -3600; x <= 3600; x += 24) {
    const z = G.railZ(line, x), rh = G.railH(line, x), s = G.sample(x, z, {}), n = G.natural(x, z, {});
    assert.ok(s.h < rh - 0.4, 'A route must physically cut high terrain below the rail bed');
    assert.equal(s.tunnel, 0, 'A tunnel flag cannot stand in for physical clearance');
    if (s.waterLevel !== null && !s.paddy) assert.ok(rh >= s.waterLevel + 2.19, 'Bridges must clear raised water');
    if (n.h > rh + 11) { cut = { x, z, rh }; stats.railCuts++; }
    stats.railSamples++;
  }
  assert.ok(cut, 'Fixture must exercise a substantial hill cutting');
  for (let L = 0; L < G.LODS.length; L++) {
    const size = G.LODS[L].size, cs = G.LODS[L].cs, c = G.genChunk(Math.floor(cut.x / size), Math.floor(cut.z / size), L);
    let surface = null;
    for (let i = 0; i < c.terrain.pos.length; i += 12) {
      const p = c.terrain.pos;
      if (c.terrain.nor[i + 1] !== 1) continue;
      if (cut.x >= p[i] && cut.x < p[i] + cs && cut.z >= p[i + 2] && cut.z < p[i + 2] + cs) { surface = p[i + 1]; break; }
    }
    assert.ok(surface !== null && surface < cut.rh - 0.2, 'Coarse averaging must not refill the cutting');
  }
}
console.info('Hydrology checks passed: descending mineral lake chains, real water elevations, dry dams, fauna constraints, contour terraces and physical railway clearance.');
console.info(JSON.stringify(stats));
