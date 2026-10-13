// Shared asset sites are sampled in world space, independently of chunk LOD.
// Distance changes the mesh detail and thins small plants, never the lattice,
// species, seed or building footprint of a site that remains visible.
const ASSET_LOD = [
  { treeRate: 1, bambooRate: 1, detail: 1 },
  { treeRate: 1, bambooRate: 0.5, detail: 0.45 },
  { treeRate: 1, bambooRate: 0.2, detail: 0.25 },
  { treeRate: 0.3, bambooRate: 0.06, detail: 0.16 },
  { treeRate: 0.1, bambooRate: 0.025, detail: 0.1 },
];
// Raised lakes retain their level on dry banks; shore ecology uses the same
// relative elevation as sea-level shores instead of absolute world height.
function shoreHeight(s) { return s.h - (s.lakeLevel ?? s.waterLevel ?? 0); }
function assetSite(x, z) {
  const s = sample(x, z, {});
  if (s.waterLevel != null || shoreHeight(s) <= 0.35 || s.street || s.rail >= 0.05 || s.path >= 0.2 || s.pad >= 0.15 || s.paddy || s.tunnel) return null;
  const slope = Math.max(
    Math.abs(s.h - sample(x - 1, z, {}).h), Math.abs(s.h - sample(x + 1, z, {}).h),
    Math.abs(s.h - sample(x, z - 1, {}).h), Math.abs(s.h - sample(x, z + 1, {}).h),
  );
  return slope < 1.5 ? s : null;
}
function assetCandidate(gx, gz, lod = 0) {
  const r = h2(gx, gz, SALT[40]), r2 = h2(gx, gz, SALT[41]);
  const rank = h2(gx, gz, SALT[29]);
  // Old, large trees are landmarks and survive every distance tier.
  if (rank >= ASSET_LOD[lod].treeRate && r2 >= 0.05) return null;
  const x = gx * 6 + h2(gx, gz, SALT[42]) * 6, z = gz * 6 + h2(gx, gz, SALT[43]) * 6;
  const s = assetSite(x, z);
  if (!s) return null;
  const nearWater = shoreHeight(s) < 2.6 && (s.lake > 0.08 || s.valley > 0.3 || s.river > 0.05);
  const c = { x, z, y: kit.G(x, z), seed: (h2(gx, gz, SALT[44]) * 1e9) | 0, r, r2, sample: s, scale: 1, kind: null };
  if (WORLD_PROFILE.id === 'shanshui') {
    c.kind = pickShanshuiPlant(s, r, r2, nearWater);
    return c.kind ? c : null;
  }
  switch (s.biome) {
    case B.SAKURA:
      if (r < 0.5) { c.kind = 'cherry'; c.variant = r2 < 0.05 ? 'ancient' : r2 < 0.55 ? 'pale' : 'yama'; c.scale = 0.8 + r2 * 0.35; }
      else if (r < 0.62) { c.kind = 'bush'; c.scale = 0.7 + r2 * 0.6; c.bloom = 0.3; }
      break;
    case B.SATO:
      if (nearWater && r < 0.08) c.kind = 'willow';
      else if (nearWater && r < 0.2) { c.kind = 'cherry'; c.variant = r2 < 0.4 ? 'shidare' : 'yama'; c.scale = 0.85; }
      else if (r < 0.09) { c.kind = 'cherry'; c.variant = r2 < 0.5 ? 'yama' : 'pale'; c.scale = 0.8 + r2 * 0.3; }
      else if (r < 0.2) { c.kind = 'broadleaf'; c.scale = 0.8 + r2 * 0.6; }
      else if (r < 0.23) c.kind = 'persimmon';
      else if (r < 0.28) { c.kind = 'conifer'; c.scale = 0.9 + r2 * 0.6; }
      else if (r < 0.34) { c.kind = 'bush'; c.scale = 0.6 + r2 * 0.6; c.bloom = r2 > 0.6 ? 0.4 : 0; }
      break;
    case B.CEDAR:
      if (r < 0.78) { c.kind = 'conifer'; c.scale = 1.1 + r2 * 0.9; }
      else if (r < 0.83) { c.kind = 'cherry'; c.variant = 'yama'; c.scale = 0.8; }
      else if (r < 0.9) { c.kind = 'rock'; c.scale = 0.6 + r2 * 1.2; }
      break;
    case B.BAMBOO:
      if (r < 0.12) { c.kind = 'conifer'; c.scale = 1 + r2 * 0.6; }
      break;
    case B.SNOW:
      if (s.h < s.snowLine + 22 && r < 0.3) { c.kind = 'conifer'; c.scale = 0.9 + r2 * 0.7; c.snow = true; }
      else if (r < 0.42) { c.kind = 'rock'; c.scale = 0.8 + r2 * 1.6; c.snow = s.snow; }
      break;
    case B.MEADOW:
      if (r < 0.012) { c.kind = 'cherry'; c.variant = r2 < 0.5 ? 'yama' : 'pale'; c.scale = 0.85; }
      else if (r < 0.03) { c.kind = 'bush'; c.scale = 0.7 + r2 * 0.6; c.bloom = 0.5; }
      else if (r < 0.045) c.kind = 'wildflowers';
      else if (r < 0.14) c.kind = 'straw';
      break;
    case B.MARSH:
      if (shoreHeight(s) < 0.6 && r < 0.16) c.kind = 'lotus';
      else if (r < 0.3) c.kind = 'cattail';
      else if (r < 0.34 && shoreHeight(s) > 0.5) c.kind = 'willow';
      else if (r < 0.36) { c.kind = 'bush'; c.scale = 0.7 + r2 * 0.5; c.bloom = 0.1; }
      else if (r < 0.385) c.kind = 'marshTree';
      else if (r < 0.4) c.kind = 'hydrangea';
      break;
    case B.PINE:
      if (r < 0.15) { c.kind = 'conifer'; c.scale = 1 + r2 * 0.8; }
      else if (r < 0.34) c.kind = 'fern';
      else if (r < 0.37) { c.kind = 'rock'; c.scale = 0.5 + r2; }
      break;
    case B.BEACH:
      if (s.h > 0.9 && r < 0.2) { c.kind = 'pine'; c.scale = 0.8 + r2 * 0.5; }
      else if (r < 0.32) { c.kind = 'rock'; c.scale = 0.5 + r2 * 1.2; c.wet = s.h < 0.8; }
      break;
    case B.TOWN: if (nearWater && r < 0.35) c.kind = 'willow'; break;
  }
  // Submetre detail appears only where it can be resolved on screen.
  if (lod >= 2 && ['bush', 'wildflowers', 'straw', 'lotus', 'cattail', 'hydrangea', 'fern'].includes(c.kind)) return null;
  return c.kind ? c : null;
}
function emitSakuraAsset(c, lod) {
  const { x, z, seed, scale: s, r2 } = c;
  if (lod && c.kind === 'cherry') return emitCherryLOD(c, lod);
  if (lod >= 2 && ['broadleaf', 'persimmon', 'marshTree', 'willow'].includes(c.kind)) return emitCrownLOD(c, lod);
  switch (c.kind) {
    case 'cherry': cherryTree(x, z, c.variant, seed, s, c.variant === 'ancient' ? 0.8 : 0.5); break;
    case 'willow': willow(x, z, seed); break;
    case 'broadleaf': broadleaf(x, z, s, seed); break;
    case 'persimmon': persimmon(x, z, seed); break;
    case 'conifer': conifer(x, z, s, seed, c.snow); break;
    case 'pine': pine(x, z, s, seed); break;
    case 'rock': rock(x, z, s, seed, { snow: c.snow, wet: c.wet }); break;
    case 'bush': bush(x, z, s, seed, c.bloom); break;
    case 'wildflowers': wildflowers(x, z, seed); break;
    case 'straw': reedPlant(x, z, c.y, 1.05 + r2 * 0.65, seed, 'straw'); reedPlant(x + 0.25, z - 0.2, c.y, 0.9 + r2 * 0.6, seed + 1, 'straw'); break;
    case 'lotus': lotus(x, z, seed); break;
    case 'cattail': cattail(x, z, seed); break;
    case 'marshTree': marshTree(x, z, seed); break;
    case 'hydrangea': hydrangea(x, z, seed); break;
    case 'fern': fern(x, z, seed); break;
  }
}
function emitCherryLOD(c, lod) {
  const K = TREE_KIND[c.variant], s = c.scale, y = c.y, rng = mulberry32(c.seed), yaw = rng() * 6.28;
  const trunk = K.trunkLen * s, radius = (c.variant === 'ancient' ? 5.4 : c.variant === 'shidare' ? 3.4 : 4.2) * s;
  const top = trunk + (c.variant === 'ancient' ? 5.8 : 3.7) * s;
  kit.box('solid', c.x, y + trunk / 2, c.z, K.r * s * 1.3, trunk, K.r * s * 1.3, BARK[(c.seed >>> 0) % BARK.length]);
  const n = lod <= 2 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const a = yaw + i * 2.399, r = i === 0 ? 0 : radius * 0.52;
    const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
    const cy = y + top - (i ? 0.8 + rng() * 0.7 : 0.2) * s;
    if (lod === 1) kit.beam('solid', c.x, y + trunk * 0.8, c.z, x, cy, z, 0.14 * s, 0.14 * s, BARK[0]);
    const col = PALC[c.variant][i % PALC[c.variant].length].clone().multiplyScalar(i === 0 ? 0.95 : 0.82);
    kit.box('blossom', x, cy, z, radius * 1.25, 2.1 * s, radius * 1.1, col, 0, a, 0);
    if (c.variant === 'shidare' && lod <= 2) kit.box('blossom', x, cy - 1.6 * s, z, radius * 0.72, 2.4 * s, radius * 0.72, col.clone().multiplyScalar(0.9));
  }
}
function emitCrownLOD(c, lod) {
  const rng = mulberry32(c.seed), s = c.kind === 'willow' ? 0.85 + rng() * 0.65 : c.scale;
  const height = c.kind === 'willow' ? 4.4 : 3.3, radius = c.kind === 'willow' ? 2.5 : 1.6;
  kit.box('solid', c.x, c.y + height * 0.35 * s, c.z, 0.34 * s, height * 0.7 * s, 0.34 * s, C(0x514738));
  const n = lod === 2 ? 4 : 2;
  for (let i = 0; i < n; i++) {
    const a = rng() * 6.28, r = (0.25 + rng() * 0.45) * radius * s;
    kit.box('foliage', c.x + Math.cos(a) * r, c.y + (height + rng() * 0.35) * s, c.z + Math.sin(a) * r, radius * 1.25 * s, (c.kind === 'willow' ? 1.9 : 1.5) * s, radius * 1.15 * s, C(c.kind === 'willow' ? 0x819c59 : 0x6f9448).multiplyScalar(0.85 + rng() * 0.15), 0, a, 0);
  }
}
function decorateAssets(x0, z0, size, lod, inChunk) {
  kit.detail = ASSET_LOD[lod].detail;
  for (let gz = Math.floor(z0 / 6); gz * 6 < z0 + size; gz++) for (let gx = Math.floor(x0 / 6); gx * 6 < x0 + size; gx++) {
    const c = assetCandidate(gx, gz, lod);
    if (!c || !inChunk(c.x, c.z)) continue;
    if (WORLD_PROFILE.id === 'shanshui') emitShanshuiPlant(c, lod); else emitSakuraAsset(c, lod);
  }
  // Culms use the same finer lattice at every distance, with deterministic thinning.
  const g = 2.3;
  for (let gz = Math.floor(z0 / g); gz * g < z0 + size; gz++) for (let gx = Math.floor(x0 / g); gx * g < x0 + size; gx++) {
    if (h2(gx, gz, SALT[28]) >= ASSET_LOD[lod].bambooRate || h2(gx, gz, SALT[47]) >= 0.42) continue;
    const x = gx * g + h2(gx, gz, SALT[45]) * g, z = gz * g + h2(gx, gz, SALT[46]) * g;
    if (!inChunk(x, z)) continue;
    const s = assetSite(x, z); if (!s || s.biome !== B.BAMBOO) continue;
    const seed = (h2(gx, gz, SALT[48]) * 1e9) | 0;
    if (WORLD_PROFILE.id === 'shanshui') emitShanshuiPlant({ x, z, y: kit.G(x, z), seed, kind: 'bamboo', scale: 1, sample: s, r: 0, r2: h2(gx, gz, SALT[41]) }, lod);
    else bamboo(x, z, seed);
  }
  kit.detail = 1;
}
function townCandidate(bx, bz, row, li) {
  const w = 6.4, d = 7.2, x = bx * 34 + 4.2 + li * 7.6 + w / 2 + 0.3;
  const z = row === 0 ? bz * 26 + 3.7 + d / 2 : (bz + 1) * 26 - 0.5 - d / 2;
  // Include deep eaves and the front veranda in the railway footprint.
  const buildingRadius = Math.hypot(w / 2 + 1.5, d / 2 + 2.0);
  if (railClearance(x, z, buildingRadius) < 0) return null;
  const s = sample(x, z, {});
  if (s.town < 0.62 || s.h < 0.4 || s.pad > 0.05 || s.rail > 0 || s.street || s.river > 0.05 || s.lake > 0.05) return null;
  const r = h2(bx * 8 + li, bz * 2 + row, SALT[61]);
  return { x, z, y: kit.G(x, z), yaw: row === 0 ? Math.PI : 0, seed: (r * 1e9) | 0, r,
    type: r < 0.42 ? 'machiya' : r < 0.66 ? 'shop' : r < 0.8 ? 'tile' : r < 0.88 ? 'kura' : 'garden',
    w: r < 0.66 ? w - 0.6 : r < 0.8 ? w : 4.6, d: r < 0.66 ? d : r < 0.8 ? d - 1.2 : 5.4 };
}
function emitTownHouseLOD(c, lod) {
  if (WORLD_PROFILE.id === 'shanshui') { emitChineseHouseLOD(c, lod); return; }
  const twoStorey = c.type === 'machiya' || c.type === 'shop', h = twoStorey ? 5 : c.type === 'kura' ? 3.6 : 2.7;
  const thatch = c.type === 'thatch', rise = thatch ? c.d * 0.78 : twoStorey ? 1.8 : 1.6;
  kit.push(c.x, c.y, c.z, c.yaw);
  kit.box('solid', 0, h / 2, 0, c.w, h, c.d, c.type === 'kura' ? COL.plaster : COL.plasterShade);
  // A few roof terraces preserve the pitched silhouette instead of a solid column.
  const n = lod === 2 ? 4 : 3;
  for (let i = 0; i < n; i++) {
    const f = i / n, width = c.w + 1.4 - f * c.d * 0.9, depth = (c.d + 1.4) * (1 - f);
    kit.box('solid', 0, h + rise * (i + 0.5) / n, twoStorey ? -0.4 : 0, Math.max(0.8, width), rise / n + 0.05, Math.max(0.35, depth), thatch ? COL.thatch : COL.tile);
  }
  kit.box('glow', 0, twoStorey ? 3.8 : 1.6, c.d / 2 + 0.03, c.w * 0.55, 0.65, 0.06, COL.paper);
  kit.pop();
}
function emitChineseHouseLOD(c, lod = 2) {
  const shop = c.type === 'shop' || c.type === 'machiya';
  // This is the same seeded floor rule as chineseHouse, not a distance rule.
  const twoStorey = shop && mulberry32(c.seed)() < (c.type === 'shop' ? 0.36 : 0.62);
  const h = c.type === 'kura' ? 3.4 : shop ? 2.95 : 2.7;
  kit.push(c.x, c.y, c.z, c.yaw);
  kit.box('solid', 0, 0.1, 0, c.w + 1.6, 0.8, c.d + 1.6, CN.stoneDark);
  kit.box('solid', 0, 0.5 + h / 2, 0, c.w, h, c.d, shop ? CN.redDark : CN.wall);
  // At the outer two tiers, 26 cm posts resolve below a pixel. The wall,
  // foundation, storey rule and full roof remain at their original sites.
  if (lod < 3) for (const sx of [-1, 1]) kit.box('lacquer', sx * c.w / 2, 0.5 + h / 2, c.d / 2 + 0.28, 0.26, h, 0.26, shop ? CN.red : CN.wood);
  kit.box('glow', 0, 2, c.d / 2 + 0.035, c.w * 0.6, 1.25, 0.05, C(0xdec59a));
  let rw = c.w, rd = c.d, roofY = h + 0.62, shift = 0;
  if (twoStorey) {
    const floor = h + 0.58;
    rw -= 0.2; rd -= 0.6; shift = -0.3; roofY = floor + 2.35 + 0.62;
    kit.box('solid', 0, floor + 1.675, shift, rw, 2.35, rd, CN.wall);
    kit.box('glow', 0, floor + 2, rd / 2 + shift + 0.035, rw * 0.6, 1.2, 0.05, C(0xdec59a));
    kit.box('solid', 0, h + 0.62, c.d / 2 + 0.35, c.w + 1, 0.2, 1.8, CN.tile, -0.1, 0, 0);
  }
  const rise = rd * 0.32, ridgeWidth = Math.max(0.7, rw - rd * 0.95 + 0.7);
  // Every tier keeps all three hip-roof courses and the same ridge. The lifted
  // strips sit inside the first course apart from a 5 cm rim, so outer tiers
  // omit only those hidden strips (7/10 parts instead of 11/14 per house).
  for (let i = 0; i < 3; i++) {
    const f = i / 2;
    kit.box('solid', 0, roofY + rise * (i + 0.5) / 3, shift, lerp(rw + 2, ridgeWidth, f), rise / 3 + 0.05, lerp(rd + 2, 0.45, f), i === 0 ? CN.ink : CN.tile);
  }
  if (lod < 3) for (const sz of [-1, 1]) kit.box('solid', 0, roofY + 0.22, shift + sz * (rd / 2 + 0.82), rw + 2, 0.12, 0.45, CN.jade, sz * 0.22, 0, 0);
  kit.box('solid', 0, roofY + rise + 0.13, shift, ridgeWidth + 0.35, 0.18, 0.24, CN.ink);
  kit.pop();
}
function emitLandmarkLOD(a, lod) {
  kit.push(a.x, a.h, a.z, a.yaw);
  const simpleRoof = (y, w, d, shift = 0, col = COL.tile, rise = 1.8) => roof(y, w, d, { type: 'hip', layers: 3, shift, col, rise, over: 1.1, upturn: 0.25, tileEnds: false, barge: false, ridge: true });
  switch (a.type) {
    case 'temple': case 'templeTown': {
      const big = a.type === 'temple', w = big ? 10 : 8, d = big ? 7.5 : 6, px = big ? 11 : 8;
      kit.box('solid', 0, 0.3, -7, w + 3, 0.9, d + 3, COL.stone);
      kit.box('lacquer', 0, 2.7, -7, w, 3.6, d, COL.shuDark);
      kit.box('glow', 0, 2.6, -7 + d / 2 + 0.02, w * 0.65, 1.3, 0.06, COL.paper);
      simpleRoof(4.75, w, d, -7, COL.tile, 3.6);
      let y = 0.5, pw = 5.6;
      for (let i = 0; i < (big ? 5 : 3); i++) {
        const h = i === 0 ? 2.9 : 2;
        kit.box('lacquer', px, y + h / 2, -2, pw, h, pw, COL.shu);
        kit.push(px, y + h + 0.45, -2, 0);
        const ry = roof(0, pw, pw, { type: 'pyramid', layers: 3, over: 1.65, rise: 0.95, upturn: 0.45, ridge: false, tileEnds: false });
        kit.pop(); y += h + 0.45 + ry; pw *= 0.86;
      }
      kit.box('metal', px, y + 2, -2, 0.2, 4, 0.2, COL.gold);
      const gz = big ? 15 : 11;
      for (const x of [-3, 3]) kit.box('lacquer', x, 1.8, gz, 0.36, 3.6, 0.36, COL.shu);
      simpleRoof(3.6, 6, 3, gz);
      break;
    }
    case 'castle': castle(0, 0, 0, 0); break;
    case 'shrine':
      kit.box('solid', 0, 0.2, -4.5, 9.2, 0.6, 8, COL.stoneDark);
      kit.box('lacquer', 0, 2.65, -5.3, 5.6, 3, 4.4, COL.shuDark);
      simpleRoof(4.25, 5.6, 5, -4.8, COL.copper, 2.6);
      for (let i = 0; i < 4; i++) {
        const z = 6 + i * 3.2, y = G(a.x + Math.sin(a.yaw) * z, a.z + Math.cos(a.yaw) * z) - a.h;
        for (const x of [-1.75, 1.75]) kit.box('lacquer', x, y + 2.5, z, 0.4, 5, 0.4, COL.shu);
        kit.box('lacquer', 0, y + 4.8, z, 5.4, 0.35, 0.55, COL.shu);
        kit.box('solid', 0, y + 5.2, z, 5.8, 0.35, 0.6, COL.black);
      }
      break;
    case 'farm':
      emitTownHouseLOD({ x: 0, y: 0, z: 0, yaw: 0, type: 'thatch', w: 9, d: 6.2 }, lod);
      emitTownHouseLOD({ x: 7.5, y: 0, z: -4, yaw: Math.PI / 2, type: 'kura', w: 4.4, d: 5 }, lod);
      emitTownHouseLOD({ x: -8, y: 0, z: 4, yaw: 0.3, type: mulberry32(a.seed)() > 0.5 ? 'tile' : 'thatch', w: 7, d: 5.2 }, lod);
      break;
    case 'teahouse': teahouse(0, 0, 0, 0); break;
    case 'hut':
      kit.box('solid', 0, 1.4, 0, 6, 2.4, 4.6, COL.wood);
      simpleRoof(2.6, 6, 4.6, 0, C(0xe8edf3), 2.4);
      break;
    case 'lighthouse':
      kit.box('solid', 0, 6, 0, 3, 12, 3, COL.white);
      kit.box('solid', 0, 12, 0, 4, 0.35, 4, COL.black);
      kit.box('glow', 0, 12.7, 0, 1.4, 1.3, 1.4, C(0xfff2d0));
      break;
    case 'seaTorii':
      for (const x of [-3.6, 3.6]) kit.box('lacquer', x, 4.6, 0, 0.8, 9.6, 0.8, COL.shu);
      kit.box('solid', 0, 9.6, 0, 12, 0.8, 1, COL.black);
      break;
    case 'pavilion': {
      const y = -a.h;
      kit.box('solid', 0, y + 0.75, 0, 6, 0.2, 6, COL.deck);
      for (const x of [-2.2, 2.2]) for (const z of [-2.2, 2.2]) kit.box('lacquer', x, y + 1.5, z, 0.26, 4.6, 0.26, COL.shu);
      simpleRoof(y + 3.6, 4.4, 4.4, 0, COL.tile, 1.6);
      break;
    }
    default: kit.pop(); return false;
  }
  kit.pop(); return true;
}
