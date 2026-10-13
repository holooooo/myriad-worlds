const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'world.manifest.json')));
const source = manifest.generator.map(p => fs.readFileSync(path.join(root, 'src', p), 'utf8')).join('\n');
const GEN = vm.runInNewContext(source + '\nGEN;');
const points = [[0, 0], [143, -89], [-952, 474], [3421, -520]];
const signature = () => JSON.stringify(points.map(([x, z]) => {
  const s = GEN.sample(x, z, {}); return [s.h, s.biome, s.town, s.lake, s.paddy];
}));
GEN.setSeed('sakura');
const sakura = signature();
GEN.setTheme('shanshui');
assert.notEqual(signature(), sakura, 'Theme did not change natural generation');
GEN.setTheme('sakura');
assert.equal(signature(), sakura, 'Theme switch changed the original seeded world');
assert.throws(() => GEN.setTheme('missing'), /Unknown world theme/);
assert.equal(GEN.theme, 'sakura', 'Rejected theme must not mutate active world');
let landmarks = 0, instances = 0, palettes = 0;
GEN.setTheme('shanshui');
for (const target of GEN.profile.spawnOrder.concat('paifang', 'palace', 'chineseTeahouse')) {
  const a = GEN.findBiome(target, 0, 0, 7000);
  assert(a, 'Missing Chinese landmark: ' + target);
  landmarks++;
  for (let lod = 0; lod < GEN.LODS.length; lod++) {
    const size = GEN.LODS[lod].size;
    const chunk = GEN.genChunk(Math.floor(a.x / size), Math.floor(a.z / size), lod);
    assert(Object.keys(chunk.inst).length > 0, 'Landmark has no static assets at LOD ' + lod);
    for (const [kind, bucket] of Object.entries(chunk.inst)) {
      assert.equal(bucket.m.length % 16, 0);
      assert.equal(bucket.c.length, bucket.m.length / 16 * 3);
      assert(bucket.m.every(Number.isFinite) && bucket.c.every(Number.isFinite), 'Invalid ' + kind + ' instances');
      for (let i = 0; i < bucket.m.length; i += 16) {
        const m = bucket.m.subarray(i, i + 16);
        const det = m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9]) + m[8] * (m[1] * m[6] - m[2] * m[5]);
        assert(det > 0, 'Degenerate or reflected ' + kind + ' instance');
        instances++;
      }
    }
    for (const c of chunk.terrain.col) { assert(Number.isFinite(c) && c >= 0, 'Invalid landscape colour'); palettes++; }
  }
}
const species = new Set(Object.values(GEN.profile.fauna).flat());
assert(species.has('crane') && species.has('buffalo'));
assert(!GEN.profile.fauna[GEN.B.TOWN], 'Wildlife allowed in Chinese wards');
assert(GEN.profile.mist.cloudSea, 'Chinese mountain profile lacks cloud sea');
console.info(JSON.stringify({ landmarks, instances, palettes, seededThemeRestored: true }));
