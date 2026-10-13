// Shanshui assets and ecosystem selection share the same candidate seed at
// every distance. LOD changes detail inside an asset, never its species.
function pickShanshuiPlant(s, r, r2, nearWater) {
  if (s.waterLevel != null) return null;
  if (s.paddy || s.snow) return s.snow && r < 0.16 ? 'rock' : null;
  switch (s.biome) {
    case B.SAKURA: return r < 0.46 ? 'peach' : r < 0.57 ? 'broadleaf' : null;
    case B.CEDAR: return r < 0.28 ? 'huangshanPine' : r < 0.37 ? 'rock' : null;
    case B.PINE: return r < 0.36 ? 'huangshanPine' : r < 0.44 ? 'rock' : null;
    case B.BAMBOO: return r < 0.66 ? 'bamboo' : r < 0.73 ? 'cypress' : null;
    case B.SATO:
      if (nearWater && r < 0.14) return 'willow';
      return r < 0.06 ? 'peach' : r < 0.19 ? 'broadleaf' : r < 0.24 ? 'cypress' : null;
    case B.MARSH: return shoreHeight(s) < 0.8 && r < 0.17 ? 'lotus' : r < 0.38 ? 'reed' : r < 0.44 ? 'willow' : null;
    case B.MEADOW: return r < 0.03 ? 'peach' : r < 0.09 ? 'wildflowers' : null;
    case B.BEACH: return s.h > 1 && r < 0.18 ? 'huangshanPine' : r < 0.28 ? 'rock' : null;
    case B.TOWN: return nearWater && r < 0.12 ? 'willow' : null;
    default: return null;
  }
}
function chinesePineLocal(s, seed, lod) {
  const r = mulberry32(seed), yaw = r() * Math.PI * 2, lean = 0.8 + r() * 0.7;
  const dx = Math.cos(yaw), dz = Math.sin(yaw), H = 5.6 * s;
  kit.beam('solid', 0, -0.15, 0, dx * lean * s, H * 0.62, dz * lean * s, 0.38 * s, 0.32 * s, C(0x544f43));
  kit.beam('solid', dx * lean * s, H * 0.62, dz * lean * s, dx * lean * 1.4 * s, H, dz * lean * 1.4 * s, 0.25 * s, 0.21 * s, C(0x655b48));
  for (let i = 0; i < 4; i++) {
    const a = yaw + i * 2.399, L = (1.6 + r() * 0.6) * s;
    const rootX = dx * lean * s * (0.55 + i * 0.15), rootZ = dz * lean * s * (0.55 + i * 0.15);
    const by = H * (0.48 + i * 0.16), bx = rootX + Math.cos(a) * L, bz = rootZ + Math.sin(a) * L;
    if (lod < 2) kit.beam('solid', rootX, by - s * 0.25, rootZ, bx, by, bz, 0.13 * s, 0.12 * s, C(0x655b48));
    kit.box('needle', bx, by + 0.2 * s, bz, 2.35 * s, 0.5 * s, 1.65 * s, C(i % 2 ? 0x466651 : 0x354f41), 0, a, 0);
    if (lod === 0) kit.box('needle', bx - Math.cos(a) * 0.55 * s, by + 0.55 * s, bz - Math.sin(a) * 0.55 * s, 1.75 * s, 0.32 * s, 1.4 * s, C(0x536e51), 0, a + 0.4, 0);
  }
  kit.box('needle', dx * lean * 1.4 * s, H + 0.2 * s, dz * lean * 1.4 * s, 2.8 * s, 0.55 * s, 2.3 * s, C(0x45624c), 0, yaw, 0);
}
function chinesePeachLocal(s, seed, lod) {
  const rng = mulberry32(seed), yaw = rng() * Math.PI * 2;
  kit.beam('solid', 0, -0.1, 0, Math.cos(yaw) * 0.4 * s, 2.7 * s, Math.sin(yaw) * 0.4 * s, 0.32 * s, 0.28 * s, C(0x5b483d));
  for (let i = 0; i < 5; i++) {
    const a = yaw + i * 2.399, L = (i === 4 ? 0.5 : 1.5 + rng() * 0.4) * s;
    const x = Math.cos(a) * L, z = Math.sin(a) * L, y = (3.0 + rng() * 0.8) * s;
    if (lod < 2) kit.beam('solid', 0, 1.7 * s, 0, x, y, z, 0.14 * s, 0.12 * s, C(0x645041));
    kit.box('blossom', x, y + 0.35 * s, z, 1.8 * s, 1.15 * s, 1.6 * s, C(i % 2 ? 0xe4b2ae : 0xeabfb4), 0, a, 0);
    if (lod === 0) kit.box('blossom', x + Math.cos(a) * 0.45 * s, y + 0.9 * s, z + Math.sin(a) * 0.45 * s, 1.2 * s, 0.65 * s, 1.15 * s, C(0xf2d3c5), 0, a + 0.5, 0);
  }
}
function chineseBambooLocal(s, seed, lod) {
  const rng = mulberry32(seed);
  for (let j = 0; j < (lod > 1 ? 2 : 3); j++) {
    const px = (rng() - 0.5) * 0.7 * s, pz = (rng() - 0.5) * 0.7 * s, H = (8.5 + rng() * 4.5) * s;
    const dx = (rng() - 0.5) * 0.8 * s, dz = (rng() - 0.5) * 0.8 * s;
    kit.beam('solid', px, -0.05, pz, px + dx, H, pz + dz, 0.12 * s, 0.12 * s, C(0x6e8753));
    if (lod === 0) for (let i = 1; i < 7; i++) kit.box('solid', px + dx * i / 7, H * i / 7, pz + dz * i / 7, 0.16 * s, 0.045 * s, 0.16 * s, C(0x536b47));
    for (let k = 0; k < 3; k++) {
      const a = rng() * Math.PI * 2, yy = H - (0.6 + k * 0.9) * s;
      kit.box('leaf', px + dx + Math.cos(a) * 0.5 * s, yy, pz + dz + Math.sin(a) * 0.5 * s, 1.8 * s, 0.16 * s, 0.8 * s, C(k % 2 ? 0x6a8854 : 0x58744a), 0, a, 0.18);
    }
  }
}
function emitShanshuiPlant(c, lod) {
  const s = 0.85 + (c.r2 === undefined ? 0.5 : c.r2) * 0.4, x = c.x, z = c.z, y = c.y;
  const previous = kit.detail; kit.detail = lod === 0 ? 1 : lod === 1 ? 0.45 : 0.25;
  switch (c.kind) {
    case 'huangshanPine': kit.push(x, y, z); chinesePineLocal(s, c.seed, lod); kit.pop(); break;
    case 'peach':
      kit.push(x, y, z); chinesePeachLocal(s, c.seed, lod); kit.pop();
      if (lod === 0) kit.spot('petal', x, y + 3.5 * s, z);
      break;
    case 'bamboo': kit.push(x, y, z); chineseBambooLocal(s, c.seed, lod); kit.pop(); break;
    case 'willow':
      if (lod === 0) willow(x, z, c.seed, y);
      else {
        kit.box('solid', x, y + 1.8 * s, z, 0.34, 3.6 * s, 0.3, C(0x514738));
        for (let i = 0; i < 4; i++) {
          const a = i * 2.399 + c.seed * 0.01, px = x + Math.cos(a) * 1.5 * s, pz = z + Math.sin(a) * 1.5 * s;
          kit.box('foliage', px, y + 4.2 * s, pz, 2.1 * s, 0.65 * s, 1.8 * s, C(0x748b57), 0, a, 0);
          kit.box('willow', px, y + 4.0 * s, pz, 1.2 * s, 2.5 * s, 1.2 * s, C(0x829b64), 0, a, 0);
        }
      }
      break;
    case 'cypress': conifer(x, z, s * 1.05, c.seed, false, y); break;
    case 'broadleaf': broadleaf(x, z, s, c.seed, C(0x658652)); break;
    case 'rock': rock(x, z, s * 1.2, c.seed, { y, snow: c.sample && c.sample.snow }); break;
    case 'lotus': lotus(x, z, c.seed, y, lod); break;
    case 'reed': reedPlant(x, z, y, 1.8 + s * 0.5, c.seed); break;
    case 'wildflowers': if (lod < 2) wildflowers(x, z, c.seed); break;
  }
  kit.detail = previous;
}
function buildShanshuiStructure(a, lod) {
  if (!['changan', 'palace', 'chineseTeahouse', 'monastery', 'paifang', 'waterPavilion', 'terraceFarm', 'mountainPavilion'].includes(a.type)) return false;
  const previous = kit.detail; kit.detail = lod === 0 ? 1 : lod === 1 ? 0.45 : 0.25;
  kit.push(a.x, a.h, a.z, a.yaw);
  switch (a.type) {
    case 'palace': chinesePalaceLocal(a.seed); break;
    case 'chineseTeahouse': chineseTeahouseLocal(a.seed); break;
    case 'changan': {
      chineseWallLocal(62, 54, 4.2);
      // Open stone gateway supports a red-pillared watch hall.
      for (const sx of [-1, 1]) kit.box('solid', sx * 6.4, 2.4, 27, 8.2, 4.8, 5.4, CN.stoneDark);
      kit.box('solid', 0, 5.0, 27, 21, 1.0, 5.4, CN.stone);
      kit.push(0, 5.5, 27); chineseHallLocal(18.5, 6.5, 4, true); kit.pop();
      kit.push(0, 0, -10); chineseHallLocal(23, 12, 5.2, true); kit.pop();
      for (const sx of [-1, 1]) {
        kit.push(sx * 21, 0, -5, Math.PI / 2); chineseHallLocal(15, 6.2, 3.3, true); kit.pop();
        kit.push(sx * 25, 4.3, 25); chinesePavilionLocal(0.8); kit.pop();
      }
      kit.box('solid', 0, 0.1, 8, 8, 0.2, 35, CN.stone);
      if (lod < 3) for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) chineseLantern(sx * 5.8, 2.3, -5 + i * 6, 1.0, i === 2 ? 1.3 : 0);
      break;
    }
    case 'monastery':
      chineseWallLocal(32, 32, 2.2);
      kit.push(0, 0, -7); chineseHallLocal(17, 9, 4.2, true); kit.pop();
      kit.push(0, 0, 16); chinesePaifangLocal(0.8); kit.pop();
      for (const sx of [-1, 1]) { kit.push(sx * 12, 0, 2, Math.PI / 2); chineseHallLocal(12, 4.6, 2.8, false, true); kit.pop(); }
      kit.box('solid', 0, 0.04, 4, 3.8, 0.15, 17, CN.stone);
      if (lod < 2) { kit.push(-9, 0, 9); chinesePineLocal(0.8, a.seed, lod); kit.pop(); }
      break;
    case 'paifang':
      chinesePaifangLocal(1.0);
      kit.box('solid', 0, 0.06, 0, 3.5, 0.14, 16, CN.stone);
      break;
    case 'mountainPavilion':
      chinesePavilionLocal(1.0);
      if (lod < 3) { kit.push(-6, 0, -2); chinesePineLocal(0.9, a.seed, lod); kit.pop(); }
      break;
    case 'waterPavilion': {
      const water = a.r === 0;
      chinesePavilionLocal(1.0, water);
      // A small pier uses the same footprint at every viewing distance.
      if (water) {
        kit.box('solid', 0, 0.4, 6.4, 2.1, 0.22, 7.5, CN.wood);
        if (lod < 2) for (const sx of [-1, 1]) kit.box('solid', sx * 0.95, 1.0, 6.4, 0.09, 0.1, 7.5, CN.redDark);
      }
      break;
    }
    case 'terraceFarm':
      kit.push(-3.5, 0, -2.2); chineseHallLocal(9.5, 6.8, 2.6, false); kit.pop();
      kit.push(7, 0, -3.5, Math.PI / 2); chineseHallLocal(6.8, 4.6, 2.5, false); kit.pop();
      // Courtyard boundary and an old well distinguish hamlets from town shops.
      kit.box('solid', 0, 0.75, 7.5, 16, 1.5, 0.22, CN.wall);
      kit.box('solid', 4, 0.6, 3, 1.4, 1.2, 1.4, CN.stoneDark);
      kit.box('solid', 4, 1.15, 3, 1.0, 0.18, 1.0, C(0x3b4743));
      if (lod < 2) { kit.push(-9, 0, 4); chinesePeachLocal(0.75, a.seed, lod); kit.pop(); chineseLantern(-1, 2.2, 1.7, 0.7, 0.8); }
      break;
  }
  kit.pop(); kit.detail = previous;
  return true;
}
