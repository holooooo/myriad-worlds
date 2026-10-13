const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const parts = JSON.parse(fs.readFileSync(path.join(root, 'world.manifest.json'))).generator;
const source = parts.map(p => fs.readFileSync(path.join(root, 'src', p), 'utf8')).join('\n')
  .replace('LODS, ASSET_LOD, assetCandidate,', 'shoreHeight, assetSite, pickShanshuiPlant, SALT, LODS, ASSET_LOD, assetCandidate,');
const G = vm.runInNewContext(source + '\nGEN;', { Math });
const stats = { raisedWetSites: 0, raisedBanks: 0, bankPlants: 0, stablePlants: 0 };
G.setTheme('shanshui');
for (const seed of ['sakura', 'yuki', 'kawa']) {
  G.setSeed(seed);
  const lake = G.findBiome(G.B.LAKE, 0, 0, 9000);
  assert(lake && lake.waterLevel > 0);
  for (let gz = Math.floor((lake.z - 230) / 6); gz <= Math.ceil((lake.z + 230) / 6); gz++) {
    for (let gx = Math.floor((lake.x - 230) / 6); gx <= Math.ceil((lake.x + 230) / 6); gx++) {
      const x = gx * 6 + G.h2(gx, gz, G.SALT[42]) * 6, z = gz * 6 + G.h2(gx, gz, G.SALT[43]) * 6;
      const s = G.sample(x, z, {});
      if (s.waterLevel != null && s.waterKind === 'lake' && s.h > 0.35) {
        assert.equal(G.assetSite(x, z), null, 'Raised lake floors cannot host terrestrial assets');
        for (let lod = 0; lod < G.LODS.length; lod++) assert.equal(G.assetCandidate(gx, gz, lod), null);
        stats.raisedWetSites++;
      }
      if (s.waterLevel == null && s.lakeLevel > 0 && s.h > 2.6 && G.shoreHeight(s) > 0.35 && G.shoreHeight(s) < 2.6) {
        stats.raisedBanks++;
        const near = G.assetCandidate(gx, gz, 0);
        if (near && ['willow', 'reed', 'lotus'].includes(near.kind)) stats.bankPlants++;
      }
      for (let lod = 1; lod < G.LODS.length; lod++) {
        const far = G.assetCandidate(gx, gz, lod);
        if (!far) continue;
        const near = G.assetCandidate(gx, gz, 0);
        assert(near);
        for (const key of ['x', 'y', 'z', 'kind', 'seed']) assert.equal(far[key], near[key], 'Shore ecology changed with distance');
        stats.stablePlants++;
      }
    }
  }
}
assert(stats.raisedWetSites > 100 && stats.raisedBanks > 50 && stats.bankPlants > 0 && stats.stablePlants > 100);
// Species selection must depend on height above the water, including elevated wetlands.
const bank = { h: 48.6, lakeLevel: 48, waterLevel: null, biome: G.B.MARSH, paddy: 0, snow: 0 };
assert.equal(G.pickShanshuiPlant(bank, 0.1, 0.5, true), 'lotus');
assert.equal(G.pickShanshuiPlant({ ...bank, waterLevel: 49 }, 0.1, 0.5, true), null);
assert.equal(G.pickShanshuiPlant({ ...bank, h: 49.1 }, 0.1, 0.5, true), 'reed');
console.info(JSON.stringify(stats));
