// Chinese landscape rules: the same continuous fields drive terrain, ecology
// and distant landmarks. No coordinates are reserved for scripted scenery.
const SHANSHUI_BIOME_NAMES = [
  ['东海', 'Eastern coast'], ['松湾', 'Pine bays'], ['江南', 'Jiangnan hills'], ['桃源', 'Peach groves'], ['梯田', 'Cloud terraces'],
  ['长安', 'Chang’an wards'], ['黄山', 'Granite peak forest'], ['竹海', 'Bamboo sea'], ['雪岭', 'Snow ridges'], ['彩湖', 'Jiuzhai lakes'], ['溪谷', 'River valleys'],
  ['花甸', 'Wildflower meadow'], ['荷泽', 'Lotus wetlands'], ['云松', 'Cloud pines'],
];
const SHANSHUI_FIELDS = {};
function shanshuiFields(x, z, o = SHANSHUI_FIELDS) {
  const wx = x + fbm(x * 0.0007, z * 0.0007, 3, 1) * 260;
  const wz = z + fbm(x * 0.0007 + 7.3, z * 0.0007 - 3.1, 3, 2) * 260;
  o.C = fbm(wx * 0.0005, wz * 0.0005, 4, 3) + 0.42;
  o.E = fbm(wx * 0.00082, wz * 0.00082, 4, 4) + 0.08;
  o.Hu = fbm(x * 0.0012, z * 0.0012, 3, 5);
  o.V = fbm(x * 0.001, z * 0.001, 3, 6);
  o.L = fbm(wx * 0.0024, wz * 0.0024, 3, 7);
  o.R = fbm(wx * 0.00125, wz * 0.00125, 4, 8);
  o.land = smoothstep(-0.08, 0.08, o.C);
  o.mt = smoothstep(0.04, 0.44, o.E) * smoothstep(0.04, 0.24, o.C);
  o.hills = fbm(x * 0.004, z * 0.004, 3, 9);
  o.detail = fbm(x * 0.028, z * 0.028, 2, 10);
  o.rid = ridged(wx * 0.0028, wz * 0.0028, 4, 11);
  o.spire = ridged(wx * 0.009, wz * 0.009, 3, 19);
  o.sak = fbm(x * 0.005, z * 0.005, 3, 12);
  o.bam = fbm(x * 0.0038, z * 0.0038, 3, 13);
  return o;
}
function shanshuiBase(f) {
  const mt = smoothstep(0, 1, f.mt), low = 3.8 + (f.hills + 0.55) * 8.4 + f.detail * 0.65;
  const granite = 36 + Math.pow(f.rid, 3) * 180 + Math.pow(f.spire, 7) * 118 + f.hills * 15;
  let h = lerp(-11 + f.hills * 4, lerp(low, granite, Math.pow(mt, 1.3)), f.land);
  const town = smoothstep(0.12, 0.34, f.V) * f.land * (1 - smoothstep(0.04, 0.22, mt));
  h = lerp(h, 3.3 + f.hills * 0.85 + f.detail * 0.16, town * 0.98);
  return { h, mt, town };
}
const LAKE_SP = 512, lakeClusters = new Map();
let lakeClusterSeed = null;
const LAKE_TINTS = [0x58b7ae, 0x3fa8bb, 0x559dac, 0x6dbaa0, 0x4795af, 0x7db6a0].map(hex => { const c = C(hex); return [c.r, c.g, c.b]; });
function lakeCluster(rx, rz) {
  if (lakeClusterSeed !== SEED) { lakeClusters.clear(); lakeClusterSeed = SEED; }
  const key = rx + ':' + rz;
  if (lakeClusters.has(key)) return lakeClusters.get(key);
  const rng = mulberry32((h2(rx, rz, SALT[82]) * 4294967296) | 0);
  const x = (rx + 0.5) * LAKE_SP + (rng() - 0.5) * 88, z = (rz + 0.5) * LAKE_SP + (rng() - 0.5) * 88;
  const f = shanshuiFields(x, z, {}), base = shanshuiBase(f);
  let ponds = null;
  if (f.land > 0.9 && base.town < 0.3 && base.mt > 0.08 && base.mt < 0.65 && base.h > 12 && base.h < 100 && f.L < 0.2) {
    const height = (px, pz) => shanshuiBase(shanshuiFields(px, pz, {})).h;
    const dx = height(x + 60, z) - height(x - 60, z), dz = height(x, z + 60) - height(x, z - 60);
    const angle = Math.hypot(dx, dz) > 0.2 ? Math.atan2(-dz, -dx) : rng() * Math.PI * 2;
    const ux = Math.cos(angle), uz = Math.sin(angle), phase = rng() * Math.PI * 2;
    const count = clamp(Math.floor(base.h / 4), 3, 6), fall = clamp(base.h / (count * 2.5), 2.5, 6);
    let previous = Infinity;
    ponds = [];
    for (let i = 0; i < count; i++) {
      const along = (i - (count - 1) / 2) * 62, across = Math.sin(phase + i * 0.85) * 17;
      const px = x + ux * along - uz * across, pz = z + uz * along + ux * across;
      const level = Math.max(1.5, Math.min(previous - fall, Math.floor(height(px, pz) / 1.5) * 1.5 - 0.35));
      if (level >= previous - 0.2) break;
      previous = level;
      ponds.push({ x: px, z: pz, ux, uz, along: 25 + rng() * 8, across: 15 + rng() * 11,
        level, depth: 2.2 + rng() * 3.2, id: key + ':' + i, group: key, tint: LAKE_TINTS[(i + Math.floor(rng() * 6)) % 6], clarity: 0.9 });
    }
  }
  lakeClusters.set(key, ponds);
  if (lakeClusters.size > 4096) lakeClusters.clear();
  return ponds;
}
function lakeBasinAt(x, z) {
  const rx = Math.floor(x / LAKE_SP), rz = Math.floor(z / LAKE_SP);
  let best = null;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const ponds = lakeCluster(rx + i, rz + j); if (!ponds) continue;
    for (const pond of ponds) {
      const dx = x - pond.x, dz = z - pond.z;
      if (Math.abs(dx) > 60 || Math.abs(dz) > 60) continue;
      const along = dx * pond.ux + dz * pond.uz, across = -dx * pond.uz + dz * pond.ux;
      let radius = Math.hypot(along / pond.along, across / pond.across);
      if (radius > 1.6) continue;
      radius *= 1 + fbm(x * 0.038, z * 0.038, 2, 39) * 0.12;
      if (!best || radius < best.radius) best = { pond, radius };
    }
  }
  return best;
}
function findShanshuiLake(x0, z0, maxR) {
  const rx0 = Math.floor(x0 / LAKE_SP), rz0 = Math.floor(z0 / LAKE_SP);
  const rings = Math.ceil(maxR / LAKE_SP) + 1;
  let best = null;
  for (let r = 0; r <= rings; r++) {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      if (r && Math.abs(i) !== r && Math.abs(j) !== r) continue;
      const ponds = lakeCluster(rx0 + i, rz0 + j); if (!ponds) continue;
      // The middle pool frames the connected valley, rather than a shore pixel.
      const order = [...ponds].sort((a, b) => Math.abs(ponds.indexOf(a) - (ponds.length - 1) / 2) - Math.abs(ponds.indexOf(b) - (ponds.length - 1) / 2));
      for (const p of order) {
        const d = Math.hypot(p.x - x0, p.z - z0), w = waterAt(p.x, p.z);
        if (d > maxR || !w || w.kind !== 'lake' || w.depth < 0.7) continue;
        if (!best || d < best.distance) best = { x: p.x, z: p.z, h: w.level, waterLevel: w.level, waterId: w.id, lakeGroup: p.group, r: 110, distance: d };
        break;
      }
    }
    if (best && best.distance < (r - 0.6) * LAKE_SP) break;
  }
  return best;
}
function shanshuiNatural(x, z, o = {}) {
  const f = shanshuiFields(x, z), base = shanshuiBase(f);
  let h = base.h;
  o.mt = base.mt; o.land = f.land; o.town = base.town;
  const rv = Math.abs(f.R), rw = 0.024;
  o.valley = (1 - smoothstep(rw, rw * 5.5, rv)) * f.land * (1 - smoothstep(55, 105, h));
  o.river = (1 - smoothstep(rw * 0.4, rw * 1.1, rv)) * f.land * (1 - smoothstep(55, 105, h));
  h = lerp(h, Math.min(h, 1.7 + Math.max(0, h - 1.7) * 0.34), o.valley * 0.8);
  h = lerp(h, -2.2 + f.detail * 0.25, o.river);
  o.lake = 0; o.lakeLevel = null; o.waterLevel = h < 0 ? 0 : null;
  o.waterKind = h < 0 ? f.land < 0.6 ? 'ocean' : 'river' : null;
  o.waterTint = null; o.waterId = o.waterKind; o.waterClarity = 0.5;
  const basin = lakeBasinAt(x, z);
  if (basin) {
    const p = basin.pond, r = basin.radius;
    o.lakeLevel = p.level; o.lake = 1 - smoothstep(0.75, 1.4, r);
    const bowl = p.level + 0.45 - p.depth * Math.pow(Math.max(0, 1 - r * r), 0.72);
    const shoulder = Math.max(h, p.level + 0.55);
    const target = r < 1 ? bowl : shoulder;
    h = lerp(h, target, 1 - smoothstep(1.08, 1.55, r));
    if (h < p.level && r < 1.08) {
      o.waterLevel = p.level; o.waterKind = 'lake'; o.waterId = p.id; o.waterTint = p.tint; o.waterClarity = p.clarity; o.river = 0;
    } else { o.waterLevel = null; o.waterKind = null; o.waterId = null; }
  }
  // Quantise the actual dry hillside after valley and lake carving. Each broad
  // contour band follows the slope; fields no longer restore pre-valley heights.
  const farm = smoothstep(0.02, 0.27, f.Hu) * f.land * (1 - o.town) * (1 - smoothstep(0.28, 0.65, base.mt));
  o.paddy = 0; o.plate = 0; o.prePaddy = h;
  if (farm + f.detail * 0.08 > 0.5 && h > 2.2 && h < 62 && o.waterLevel === null && o.lake < 0.05 && o.river < 0.08) {
    const step = h < 14 ? 1 : 1.5, contour = h - f.detail * 0.45;
    o.paddy = 1; o.plate = Math.floor(contour / step) * step + step * 0.5; h = o.plate;
    o.waterLevel = h + 0.16; o.waterKind = 'paddy'; o.waterId = 'paddy:' + o.plate; o.waterClarity = 0;
  }
  const trail = Math.abs(fbm(x * 0.0038, z * 0.0038, 3, 14));
  o.path = (1 - smoothstep(0.007, 0.016, trail)) * (1 - o.town) * f.land * (h > 0.6 ? 1 : 0) * (1 - smoothstep(0.5, 0.85, base.mt));
  if (o.path > 0.25 && o.paddy) { o.paddy = 0; o.waterLevel = null; o.waterKind = null; o.waterId = null; h = o.prePaddy; }
  o.beach = (1 - smoothstep(0.03, 0.2, f.C)) * (h > -0.4 && h < 2.5 ? 1 : 0);
  o.snowLine = 155 + f.detail * 10 + fbm(x * 0.006, z * 0.006, 2, 15) * 13;
  o.h = h; o.f = f;
  return o;
}
function shanshuiClassify(o, h, n, x, z) {
  if (o.waterLevel !== null && !o.paddy) {
    if (o.waterKind === 'lake') return B.LAKE;
    if (o.river > 0.35) return B.RIVER;
    return n.land < 0.6 ? B.OCEAN : (o.lake > o.river ? B.LAKE : B.RIVER);
  }
  if (o.town > 0.5) return B.TOWN;
  if (o.paddy) return B.PADDY;
  if (h > n.snowLine - 9 + bnoise(x, z, 10)) return B.SNOW;
  if (o.beach > 0.25 - bnoise(x, z, 0.08)) return B.BEACH;
  if (h < (o.lakeLevel === null ? 3.5 : o.lakeLevel + 1.4) + bnoise(x, z, 0.6) && o.lake + o.valley > 0.045) return B.MARSH;
  if (n.mt > 0.56 + bnoise(x, z, 0.05) && h > 38) return B.CEDAR;
  if (h > 28 + bnoise(x, z, 8) && n.mt > 0.25) return B.PINE;
  if (o.bam > 0.16 + bnoise(x, z, 0.06) && o.Hu > -0.15) return B.BAMBOO;
  if (o.sak > 0.22 + bnoise(x, z, 0.05)) return B.SAKURA;
  if (o.Hu > 0.12 + bnoise(x, z, 0.06) && n.mt < 0.18 && h < 22) return B.MEADOW;
  return B.SATO;
}
function shanshuiAnchor(a, n, r, roll, rd) {
  if (rd < 34 || n.river > 0.3 || n.h > n.snowLine + 15) return;
  if (n.waterLevel !== null && !n.paddy) {
    if (n.waterKind === 'lake' && n.waterLevel - n.h < 3.4) { a.type = 'waterPavilion'; a.r = 0; a.h = n.waterLevel + 0.9; }
    return;
  }
  if (n.h < 0.8 || n.lake > 0.2) return;
  if (n.town > 0.6) { a.type = roll < 0.18 ? 'palace' : 'changan'; a.r = a.type === 'palace' ? 60 : 36; }
  else if (n.mt > 0.5 && n.h > 40) { a.type = roll < 0.64 ? 'mountainPavilion' : 'monastery'; a.r = a.type === 'monastery' ? 20 : 7; }
  else if (n.paddy || n.f.Hu > 0.14 && n.h < 40) { a.type = 'terraceFarm'; a.r = 13; }
  else if (n.mt > 0.22 && roll < 0.55) { a.type = 'monastery'; a.r = 20; }
  else if (roll < 0.3) { a.type = 'paifang'; a.r = 9; }
  else if (roll < 0.7) { a.type = 'terraceFarm'; a.r = 13; }
  else { a.type = roll > 0.82 ? 'chineseTeahouse' : 'waterPavilion'; a.r = a.type === 'chineseTeahouse' ? 13 : 8; }
  // Wards and courtyard axes face cardinal directions; hill pavilions follow slopes.
  if (a.type === 'changan' || a.type === 'palace' || a.type === 'monastery' || a.type === 'paifang') a.yaw = Math.round(a.yaw / (Math.PI / 2)) * (Math.PI / 2);
}

// Terrain materials belong to the world rules, alongside their ecology.
const SHANSHUI_TERRAIN = {
  grass: C(0x81936a), grassDark: C(0x5c7555), granite: C(0xb3b2a5), graniteDark: C(0x818a85), moss: C(0x65745a),
  pine: C(0x5b715c), bamboo: C(0x728564), earth: C(0x6c604d), mud: C(0x585345), stone: C(0xaaa99e),
  paleSand: C(0xb8c4ab), lakeBed: C(0x56796f), deepBed: C(0x294c4a), snow: C(0xe8ecea),
};
function shanshuiCellColor(x, z, s, slope, lod, out) {
  const p = SHANSHUI_TERRAIN, r = h2(Math.floor(x * 2), Math.floor(z * 2), 77);
  const n = fbm(x * 0.035, z * 0.035, 2, 16);
  if (s.waterLevel !== null && !s.paddy) return out.copy(p.paleSand).lerp(p.deepBed, smoothstep(0.1, 5.0, s.waterLevel - s.h)).multiplyScalar(0.94 + n * 0.06);
  if (s.rail > 0.3 && !s.tunnel) return out.copy(p.graniteDark).multiplyScalar(0.8 + r * 0.12);
  if (s.street) return out.copy(p.stone).multiplyScalar(0.9 + r * 0.1);
  if (s.snow) return out.copy(p.snow).lerp(p.graniteDark, clamp((slope - 2.5) * 0.15, 0, 0.35));
  if (s.biome === B.CEDAR || slope > 1.5) return out.copy(p.granite).lerp(p.graniteDark, clamp(0.35 + n * 0.5, 0, 1)).lerp(p.moss, slope < 2.3 ? 0.16 : 0);
  if (s.path > 0.35) return out.copy(p.stone).lerp(p.earth, 0.35 + n * 0.1);
  switch (s.biome) {
    case B.PADDY: return out.copy(p.mud).multiplyScalar(0.92 + r * 0.12);
    case B.TOWN: return out.copy(p.earth).lerp(p.stone, 0.3).multiplyScalar(0.92 + r * 0.12);
    case B.BAMBOO: return out.copy(p.bamboo).lerp(p.earth, 0.16).multiplyScalar(0.95 + n * 0.08);
    case B.PINE: return out.copy(p.pine).lerp(p.granite, clamp(n + 0.2, 0, 0.35));
    case B.BEACH: return out.copy(p.paleSand).lerp(p.grass, smoothstep(1.5, 2.8, s.h));
    case B.MARSH: return out.copy(p.grassDark).lerp(p.mud, s.h < 0.7 ? 0.35 : 0.12);
  }
  return out.copy(p.grass).lerp(p.grassDark, clamp(0.4 + n * 0.65, 0, 1)).multiplyScalar(0.94 + r * 0.08);
}
