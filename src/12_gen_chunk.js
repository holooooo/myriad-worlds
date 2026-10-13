// ---------------------------------------------------------------------
//  Terrain palette
// ---------------------------------------------------------------------
const PAL = {
  grassA: C(0x6c8c44), grassB: C(0x58753a), grassC: C(0x8fa253), moss: C(0x4a6034), forest: C(0x34492d),
  cedarFloor: C(0x4f5f38), bambooFloor: C(0x77844a), soil: C(0x5b4a3a), soilDark: C(0x3b3129),
  rock: C(0x77736b), rockDark: C(0x55524d), gravel: C(0x989080), gravelDark: C(0x827b6d),
  street: C(0x8d8981), streetB: C(0x7d7a73), lot: C(0x86775f), bedSand: C(0x6a6150), bedDeep: C(0x1f2d2b),
  oceanSand: C(0xa29676), wetStone: C(0x464a46), pebble: C(0x7b786f), petal: C(0xf4cbd6),
  snow: C(0xe9eef6), snowShade: C(0xc4cfe0), sand: C(0xd5c6a0), sandWet: C(0x9f9174), mud: C(0x4a4032),
  levee: C(0x7ba04a), ballast: C(0x6b6863), nanohana: C(0xd9c24a),
  canCedar: C(0x2b4231), canSakura: C(0xd8a2b5), canBamboo: C(0x5f8240), canTown: C(0x555b64), canSato: C(0x50703c),
  meadowA: C(0x8fae52), meadowB: C(0x7aa045), marshA: C(0x4f6a38), marshB: C(0x3e5730), marshWater: C(0x3d5136),
  pineFloor: C(0x5d6f3d), canPine: C(0x37552e), lavender: C(0x8a7ab8), cotton: C(0xe8e2d2),
};
const tc = new Col(), tc2 = new Col();
function cellColor(x, z, s, slope, lod, out) {
  if (WORLD_PROFILE.id === 'shanshui') return shanshuiCellColor(x, z, s, slope, lod, out);
  const j = h2(Math.floor(x * 3), Math.floor(z * 3), 77), j2 = h2(Math.floor(x * 3) + 91, Math.floor(z * 3) - 37, 78);
  const n = fbm(x * 0.045, z * 0.045, 2, 16);
  const h = s.h;
  if (h < -0.15) {
    const dep = clamp(-h / 3.5, 0, 1);
    out.copy(s.biome === B.OCEAN ? PAL.oceanSand : PAL.bedSand).lerp(PAL.bedDeep, smoothstep(0, 1, dep));
    if (j > 0.9 && dep < 0.4) out.lerp(PAL.pebble, 0.3);
    return out;
  }
  if (s.rail > 0.3 && !s.tunnel) return out.copy(PAL.ballast).multiplyScalar(0.9 + j * 0.15);
  if (s.street) {
    const slab = h2(Math.floor(x / 1.5), Math.floor(z / 1.2), 80);
    return out.copy(PAL.street).lerp(PAL.streetB, slab * 0.6).multiplyScalar(0.94 + j * 0.08);
  }
  if (s.snow) return out.copy(PAL.snow).lerp(PAL.snowShade, clamp(slope * 0.25 + j * 0.2, 0, 1)).lerp(PAL.rock, clamp((slope - 2.4) * 0.3, 0, 0.35));
  if (s.path > 0.35) return out.copy(PAL.gravel).lerp(PAL.gravelDark, clamp(0.5 + n * 0.6 + (j - 0.5) * 0.3, 0, 1));
  const rockish = slope > (s.biome === B.CEDAR || s.biome === B.PINE || s.biome === B.BAMBOO ? 2.2 : 1.35);
  if (rockish) { out.copy(PAL.rock).lerp(PAL.rockDark, clamp(n * 0.4, 0, 1)); if (slope < 2.2 && j2 > 0.6 && !s.snow) out.lerp(PAL.moss, 0.45); return out; }
  switch (s.biome) {
    case B.BEACH: {
      out.copy(PAL.sand).lerp(PAL.sandWet, smoothstep(1.4, 0.2, h)).multiplyScalar(0.95 + j * 0.08);
      if (h > 1.6) out.lerp(PAL.grassB, smoothstep(1.6, 2.6, h));
      return out;
    }
    case B.PADDY: return out.copy(PAL.mud).multiplyScalar(0.9 + j * 0.15);
    case B.TOWN: {
      if (lod > 0) return out.copy(PAL.canTown).lerp(PAL.lot, clamp(n, 0, 1) * 0.4);
      out.copy(PAL.lot).lerp(PAL.moss, j2 > 0.7 ? 0.5 : 0.1).multiplyScalar(0.92 + j * 0.1);
      return out;
    }
    case B.CEDAR: {
      if (lod > 0) return out.copy(PAL.canCedar).multiplyScalar(0.9 + n * 0.15);
      out.copy(PAL.pineFloor).lerp(PAL.cedarFloor, 0.4).lerp(PAL.moss, clamp(0.2 + n * 0.5, 0, 0.75)).multiplyScalar(0.93 + n * 0.1);
      return out;
    }
    case B.MEADOW: {
      if (lod > 0) return out.copy(PAL.canSato).lerp(PAL.meadowA, 0.5).multiplyScalar(0.9 + n * 0.15);
      out.copy(PAL.meadowA).lerp(PAL.meadowB, clamp(0.5 + n * 0.8, 0, 1)).multiplyScalar(0.94 + j * 0.09);
      if (j2 > 0.985) out.lerp(PAL.lavender, 0.4);          // sparse wild flowers
      else if (j2 > 0.975) out.lerp(PAL.cotton, 0.3);
      else if (j2 > 0.965) out.lerp(PAL.nanohana, 0.35);
      return out;
    }
    case B.MARSH: {
      if (lod > 0) return out.copy(PAL.canPine).lerp(PAL.marshA, 0.5).multiplyScalar(0.85 + n * 0.15);
      out.copy(PAL.marshA).lerp(PAL.marshB, n * 0.5 + 0.5).multiplyScalar(0.85 + j * 0.15);
      if (s.h < 0.55) out.lerp(PAL.marshWater, smoothstep(0.55, 0.0, s.h) * 0.7); // standing water sheen
      return out;
    }
    case B.PINE: {
      if (lod > 0) return out.copy(PAL.canPine).multiplyScalar(0.9 + n * 0.15);
      out.copy(PAL.pineFloor).lerp(PAL.cedarFloor, 0.4).lerp(PAL.moss, clamp(0.3 + n * 0.5, 0, 0.8)).multiplyScalar(0.96 + n * 0.06);
      return out;
    }
    case B.BAMBOO: {
      if (lod > 0) return out.copy(PAL.canBamboo).multiplyScalar(0.9 + n * 0.15);
      return out.copy(PAL.pineFloor).lerp(PAL.bambooFloor, 0.75).lerp(PAL.soil, 0.15).multiplyScalar(0.92 + j * 0.12);
    }
    case B.SNOW: return out.copy(PAL.snow).lerp(PAL.snowShade, 0.5 + j * 0.25).lerp(PAL.rock, clamp((slope - 2.4) * 0.3, 0, 0.35));
  }
  // grass (satoyama / sakura)
  const g = clamp(0.5 + n * 0.9, 0, 1);
  out.copy(PAL.grassB).lerp(PAL.grassA, g);
  if (n > 0.25) out.lerp(PAL.grassC, (n - 0.25) * 1.2);
  out.multiplyScalar(0.95 + n * 0.08);
  if (lod > 0) {
    if (s.biome === B.SAKURA) out.lerp(PAL.canSakura, 0.55 + j * 0.2);
    else out.lerp(PAL.canSato, 0.45);
    return out;
  }
  if (s.biome === B.SAKURA) {
    const p = clamp(s.sak * 2.2 - 0.3, 0, 0.6);
    if (j2 < p * 0.45) out.lerp(PAL.petal, 0.55 + j * 0.2); else out.lerp(PAL.petal, p * 0.12);
  } else if (fbm(x * 0.02, z * 0.02, 2, 17) > 0.32 && j2 > 0.55) out.lerp(PAL.nanohana, 0.75);
  if (slope > 0.8) out.lerp(PAL.soil, (slope - 0.8) * 0.6);
  return out;
}

// ---------------------------------------------------------------------
//  Chunk generation
// ---------------------------------------------------------------------
const LODS = [
  { size: 32, cs: 1, q: 0.25 },
  { size: 64, cs: 2, q: 0.75 },
  { size: 128, cs: 4, q: 1.5 },
  { size: 256, cs: 8, q: 3 },
  { size: 512, cs: 16, q: 6 },
];
const quant = (h, q) => Math.round(h / q) * q;

function genChunk(cx, cz, lod) {
  const L = LODS[lod], N = Math.round(L.size / L.cs), cs = L.cs, q = L.q;
  const x0 = cx * L.size, z0 = cz * L.size;
  const W = N + 2;
  const raw = new Float32Array(W * W), hq = new Float32Array(W * W);
  const info = new Array(W * W);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const x = x0 + (i - 0.5) * cs, z = z0 + (j - 0.5) * cs;
    const s = sample(x, z, {});
    const k = j * W + i;
    raw[k] = s.h; info[k] = s;
    if (lod === 0) hq[k] = (s.h < -0.5) ? quant(s.h, q * 0.5) : quant(s.h, q);
    else {
      // far LODs: average the raw height over the cell footprint (kills the 1m staircase driver)
      const avg = (s.h * 2 + natural(x + cs * 0.5, z, {}).h + natural(x - cs * 0.5, z, {}).h + natural(x, z + cs * 0.5, {}).h + natural(x, z - cs * 0.5, {}).h) / 6;
      hq[k] = avg;
    }
    if (s.paddy) hq[k] = s.plate;
    // a cell claimed by another biome loses its paddy flat/levee (biome noise wobbles edges)
    if (s.paddy && s.biome !== B.PADDY) { info[k].paddy = 0; hq[k] = (s.h < -0.5) ? quant(s.h, q * 0.5) : quant(s.h, q); }
  }
  // gentle 3-tap smoothing on hills kills the grazing-light staircase shimmer
  if (lod === 0) {
    const hq2 = hq.slice();
    for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
      const k = j * W + i, s = info[k];
      if (s.street || s.rail > 0.1 || s.pad > 0.2 || s.paddy || s.h < 0.2) continue;
      const steep = Math.max(Math.abs(raw[k] - raw[k + 1]), Math.abs(raw[k] - raw[k - 1]), Math.abs(raw[k] - raw[k + W]), Math.abs(raw[k] - raw[k - W]));
      if (steep > cs * 0.55) continue;
      hq[k] = (hq2[k] * 2 + hq2[k - 1] + hq2[k + 1] + hq2[k - W] + hq2[k + W]) / 6;
    }
  }
  // paddy levees: plate cells bordering a lower or non-paddy neighbour
  const levee = new Uint8Array(W * W);
  for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
    const k = j * W + i, s = info[k];
    if (!s.paddy) continue;
    for (const d of [1, -1, W, -W]) { const t = info[k + d]; if (!t.paddy || t.plate < s.plate - 0.1) { levee[k] = 1; break; } }
  }
  for (let k = 0; k < W * W; k++) if (levee[k]) hq[k] += 0.25;

  // ---- terrain mesh ----
  const skirt = Math.max(8, cs * 8);
  let bed = Infinity;
  for (const h of hq) bed = Math.min(bed, h);
  bed -= skirt;
  const nb = (i, j, h) => {
    const v = hq[j * W + i];
    return (i < 1 || j < 1 || i > N || j > N) ? bed : v;
  };
  let quads = 1; // The underside closes the skirt without per-cell solids.
  for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
    const h = hq[j * W + i]; quads++;
    if (nb(i + 1, j, h) < h) quads++; if (nb(i - 1, j, h) < h) quads++; if (nb(i, j + 1, h) < h) quads++; if (nb(i, j - 1, h) < h) quads++;
  }
  // Every LOD has a continuous skirt below its lowest sampled terrain.
  const pos = new Float32Array(quads * 12), nor = new Float32Array(quads * 12), col = new Float32Array(quads * 12);
  const idx = quads * 4 > 65535 ? new Uint32Array(quads * 6) : new Uint16Array(quads * 6);
  let v = 0, f = 0;
  const put = (x, y, z, a, b, c, cc, k) => {
    const o = v * 3; pos[o] = x; pos[o + 1] = y; pos[o + 2] = z; nor[o] = a; nor[o + 1] = b; nor[o + 2] = c;
    col[o] = cc.r * k; col[o + 1] = cc.g * k; col[o + 2] = cc.b * k; v++;
  };
  const quad = () => { const b = v - 4, o = f * 6; idx[o] = b; idx[o + 1] = b + 1; idx[o + 2] = b + 2; idx[o + 3] = b; idx[o + 4] = b + 2; idx[o + 5] = b + 3; f++; };
  const top = new Col(), wt = new Col(), wb = new Col();
  let minY = 1e9, maxY = -1e9;
  const water = [], paddyW = [];
  for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
    const k = j * W + i, h = hq[k], s = info[k];
    const xa = x0 + (i - 1) * cs, xb = xa + cs, za = z0 + (j - 1) * cs, zb = za + cs;
    const slope = Math.max(Math.abs(raw[k] - raw[k + 1]), Math.abs(raw[k] - raw[k - 1]), Math.abs(raw[k] - raw[k + W]), Math.abs(raw[k] - raw[k - W])) / cs;
    cellColor(xa + cs / 2, za + cs / 2, s, slope, lod >= 3 ? 1 : 0, top);
    if (levee[k]) top.copy(PAL.levee).multiplyScalar(0.85 + h2(i, j, 5) * 0.2);
    const under = h < -0.15;
    const rocky = slope > 1.6 || (s.biome === B.SNOW && !s.snow);
    if (under) { wt.copy(top).multiplyScalar(0.8); wb.copy(PAL.bedDeep).multiplyScalar(0.8); }
    else if (s.snow) { wt.copy(top).multiplyScalar(0.94); wb.copy(PAL.snowShade).multiplyScalar(0.72); }
    else if (rocky) { wt.copy(top).lerp(PAL.rock, 0.55).multiplyScalar(0.92); wb.copy(PAL.rockDark).multiplyScalar(0.62); }
    else if (s.street || s.path > 0.3 || s.rail > 0.3) { wt.copy(top).multiplyScalar(0.85); wb.copy(COL.stone).multiplyScalar(0.55); }
    else if (s.biome === B.BEACH) { wt.copy(top).multiplyScalar(0.88); wb.copy(PAL.sandWet).multiplyScalar(0.7); }
    else if (lod === 0) { wt.copy(top).multiplyScalar(0.92); wb.copy(top).lerp(PAL.soilDark, 0.35).multiplyScalar(0.8); }
    else { wt.copy(top).multiplyScalar(0.96); wb.copy(top).multiplyScalar(0.8); }
    const hE = nb(i + 1, j, h), hW = nb(i - 1, j, h), hN = nb(i, j + 1, h), hS = nb(i, j - 1, h);
    const th = 1e9, hv = (a, b) => hq[b * W + a];   // corner AO disabled: patchworked on slopes (waffle)
    const ao = (a, b, c) => 1 - 0.12 * ((a > h + th) + (b > h + th) + (c > h + th) * 0.7);
    put(xa, h, za, 0, 1, 0, top, ao(hv(i - 1, j), hv(i, j - 1), hv(i - 1, j - 1)));
    put(xa, h, zb, 0, 1, 0, top, ao(hv(i - 1, j), hv(i, j + 1), hv(i - 1, j + 1)));
    put(xb, h, zb, 0, 1, 0, top, ao(hv(i + 1, j), hv(i, j + 1), hv(i + 1, j + 1)));
    put(xb, h, za, 0, 1, 0, top, ao(hv(i + 1, j), hv(i, j - 1), hv(i + 1, j - 1)));
    quad();
    if (h < minY) minY = h; if (h > maxY) maxY = h;
    const wall = (hn, ax, az, bx, bz, nx_, nz_) => {
      const b = h - hn < 1.0 ? tc2.copy(wt).lerp(wb, 0.55) : wb;
      put(ax, hn, az, nx_, 0, nz_, b, 0.92); put(ax, h, az, nx_, 0, nz_, wt, 1); put(bx, h, bz, nx_, 0, nz_, wt, 1); put(bx, hn, bz, nx_, 0, nz_, b, 0.92); quad();
      if (hn < minY) minY = hn;
    };
    // Every positive step needs a wall. Smoothing produces sub-quantum
    // steps too; skipping those exposes the sky, especially from above.
    if (hE < h) wall(hE, xb, za, xb, zb, 1, 0);
    if (hW < h) wall(hW, xa, zb, xa, za, -1, 0);
    if (hN < h) wall(hN, xb, zb, xa, zb, 0, 1);
    if (hS < h) wall(hS, xa, za, xb, za, 0, -1);
    if (h < 0) water.push(i, j);
    else if (s.paddy && !levee[k]) paddyW.push(i, j);
  }
  put(x0, bed, z0, 0, -1, 0, PAL.soilDark, 1);
  put(x0 + L.size, bed, z0, 0, -1, 0, PAL.soilDark, 1);
  put(x0 + L.size, bed, z0 + L.size, 0, -1, 0, PAL.soilDark, 1);
  put(x0, bed, z0 + L.size, 0, -1, 0, PAL.soilDark, 1);
  quad();
  const terrain = { pos, nor, col, idx, minY, maxY: Math.max(maxY, 0) };
  // ---- water quads (y = 0) with per-vertex depth ----
  const mkWater = (list, yOf, depthOf) => {
    if (!list.length) return null;
    const n = list.length / 2;
    const wp = new Float32Array(n * 12), wd = new Float32Array(n * 4);
    const wi = n * 4 > 65535 ? new Uint32Array(n * 6) : new Uint16Array(n * 6);
    for (let t = 0; t < n; t++) {
      const i = list[t * 2], j = list[t * 2 + 1];
      const xa = x0 + (i - 1) * cs, za = z0 + (j - 1) * cs, y = yOf(i, j);
      const corner = [[0, 0], [0, 1], [1, 1], [1, 0]];
      for (let c = 0; c < 4; c++) {
        const ci = corner[c][0], cj = corner[c][1];
        wp[t * 12 + c * 3] = xa + ci * cs; wp[t * 12 + c * 3 + 1] = y; wp[t * 12 + c * 3 + 2] = za + cj * cs;
        let dsum = 0;
        for (const [di, dj] of [[ci - 1, cj - 1], [ci, cj - 1], [ci - 1, cj], [ci, cj]]) dsum += depthOf(i + di, j + dj);
        wd[t * 4 + c] = dsum / 4;
      }
      const b = t * 4, o = t * 6;
      wi[o] = b; wi[o + 1] = b + 1; wi[o + 2] = b + 2; wi[o + 3] = b; wi[o + 4] = b + 2; wi[o + 5] = b + 3;
    }
    return { pos: wp, depth: wd, idx: wi };
  };
  const waterM = mkWater(water, () => 0, (i, j) => clamp(-raw[clamp(j, 0, W - 1) * W + clamp(i, 0, W - 1)], -2, 12));
  const paddyM = mkWater(paddyW, (i, j) => hq[j * W + i] + 0.16, (i, j) => { const k = clamp(j, 0, W - 1) * W + clamp(i, 0, W - 1); return info[k].paddy && !levee[k] ? 0.45 : -0.3; });

  // ---- decorations ----
  kit.reset();
  const inChunk = (x, z) => x >= x0 && x < x0 + L.size && z >= z0 && z < z0 + L.size;
  const cellK = (x, z) => { const i = Math.floor((x - x0) / cs) + 1, j = Math.floor((z - z0) / cs) + 1; return (i < 0 || j < 0 || i >= W || j >= W) ? -1 : j * W + i; };
  kit.G = (x, z) => { const k = cellK(x, z); return k >= 0 ? hq[k] : quant(sample(x, z, {}).h, q); };
  const tufts = new FBuf(16 * 512), tuftC = new FBuf(3 * 512);
  // Chunk generation also runs in a Worker, where `window` is unavailable.
  if (lod === 0 && !globalThis.__bareTerrain) decorate(x0, z0, L.size, info, hq, raw, W, cellK, inChunk, tufts, tuftC, levee);
  else decorateFar(x0, z0, L.size, lod, info, hq, raw, W, cellK, inChunk);
  const inst = {};
  for (const [name, b] of Object.entries(kit.b)) inst[name] = { m: b.m.out(), c: b.c.out() };
  return {
    cx, cz, lod, x0, z0, size: L.size, terrain, water: waterM, paddy: paddyM, inst,
    tuft: { m: tufts.out(), c: tuftC.out() }, lights: kit.lights.out(),
    spots: { petal: kit.spots.petal.out(), smoke: kit.spots.smoke.out(), fly: kit.spots.fly.out() },
  };
}

function slopeAt(k, raw, W) { return Math.max(Math.abs(raw[k] - raw[k + 1]), Math.abs(raw[k] - raw[k - 1]), Math.abs(raw[k] - raw[k + W]), Math.abs(raw[k] - raw[k - W])); }

function decorate(x0, z0, size, info, hq, raw, W, cellK, inChunk, tufts, tuftC, levee) {
  const m16 = new Float64Array(16);
  decorateAssets(x0, z0, size, 0, inChunk);
  // Sparse terrace ornaments are close-up detail; tree sites remain shared.
  const g = 6;
  for (let gz = Math.floor(z0 / g); gz * g < z0 + size; gz++) for (let gx = Math.floor(x0 / g); gx * g < x0 + size; gx++) {
    const x = gx * g + h2(gx, gz, SALT[42]) * g, z = gz * g + h2(gx, gz, SALT[43]) * g;
    if (!inChunk(x, z)) continue;
    const k = cellK(x, z), s = info[k], r = h2(gx, gz, SALT[40]);
    if (!s.paddy) continue;
    const seed = (h2(gx, gz, SALT[44]) * 1e9) | 0;
    if (levee[k] && r < 0.025) {
      if (WORLD_PROFILE.id === 'shanshui') emitShanshuiPlant({ x, z, y: hq[k], seed, kind: 'peach', scale: 0.8, r, r2: 0.5, sample: s }, 0);
      else cherryTree(x, z, 'yama', seed, 0.8, 0.45);
    } else if (!levee[k] && r > 0.985) scarecrow(x, z, h2(gx, gz, SALT[41]) * 6);
  }
  // rice seedlings on flooded plates
  const gR = 1.1;
  for (let gz = Math.floor(z0 / gR); gz * gR < z0 + size; gz++) for (let gx = Math.floor(x0 / gR); gx * gR < x0 + size; gx++) {
    const x = gx * gR + h2(gx, gz, SALT[63]) * gR, z = gz * gR + h2(gx, gz, SALT[64]) * gR;
    if (!inChunk(x, z)) continue;
    const k = cellK(x, z), s = info[k];
    if (!s.paddy || levee[k]) continue;
    if (h2(gx, gz, SALT[65]) < 0.75) {
      const rr = h2(gx, gz, SALT[66]);
      const c = C([0x7aa24a, 0x6d9440, 0x86ab52][Math.floor(rr * 3)]);
      const H = 0.35 + rr * 0.25;
      kit.box('rice', x, kit.G(x, z) + 0.14, z, 0.65, H, 0.65, c, 0, rr * 6, 0);
    }
  }
  // reed beds (芦苇): dense stands in shallow water & wet shores
  const gRe = 1.9;
  for (let gz = Math.floor(z0 / gRe); gz * gRe < z0 + size; gz++) for (let gx = Math.floor(x0 / gRe); gx * gRe < x0 + size; gx++) {
    const x = gx * gRe + h2(gx, gz, SALT[67]) * gRe, z = gz * gRe + h2(gx, gz, SALT[68]) * gRe;
    if (!inChunk(x, z)) continue;
    const k = cellK(x, z), s = info[k];
    const wetShore = (s.h > -1.1 && s.h < 0.55 && (s.valley > 0.12 || s.lake > 0.03 || s.biome === B.LAKE || s.biome === B.RIVER));
    if (!wetShore || s.street || s.rail > 0.1 || s.pad > 0.1) continue;
    if (h2(gx, gz, SALT[69]) > 0.62) continue;
    const n = 2 + Math.floor(h2(gx, gz, SALT[70]) * 3);
    for (let j = 0; j < n; j++) {
      const rx = x + (h2(gx, j, SALT[71]) - 0.5) * 1.6, rz = z + (h2(gz, j, SALT[72]) - 0.5) * 1.6;
      const rk = cellK(rx, rz); if (rk < 0) continue;
      const rs = info[rk];
      if (rs.h > 0.8 || rs.h < -1.4) continue;
      const y = kit.G(rx, rz);
      const hh = 1.5 + h2(gx, gz + j, SALT[73]) * 1.1;
      reedPlant(rx, rz, y, hh, (h2(gx + j, gz, SALT[73]) * 1e9) | 0);
    }
  }
  // rocks along water, stone lanterns on lanes
  const gr = 7;
  for (let gz = Math.floor(z0 / gr); gz * gr < z0 + size; gz++) for (let gx = Math.floor(x0 / gr); gx * gr < x0 + size; gx++) {
    const x = gx * gr + h2(gx, gz, SALT[49]) * gr, z = gz * gr + h2(gx, gz, SALT[50]) * gr;
    if (!inChunk(x, z)) continue;
    const k = cellK(x, z), s = info[k], r = h2(gx, gz, SALT[51]);
    if (s.h > -0.8 && s.h < 0.6 && s.pad < 0.1 && r < 0.35) rock(x, z, 0.4 + r * 2.2, (r * 1e9) | 0, { wet: true, y: Math.max(hq[k], -0.6) });
  }
  const gl = 28;
  for (let gz = Math.floor(z0 / gl); gz * gl < z0 + size; gz++) for (let gx = Math.floor(x0 / gl); gx * gl < x0 + size; gx++) {
    const x = gx * gl + h2(gx, gz, SALT[52]) * gl, z = gz * gl + h2(gx, gz, SALT[53]) * gl;
    if (!inChunk(x, z)) continue;
    const k = cellK(x, z), s = info[k];
    if (s.path > 0.15 && s.path < 0.6 && h2(gx, gz, SALT[54]) < 0.55) stoneLantern(x, z, 0.62, h2(gx, gz, 1) * 6, 0.8);
    // hydrangeas line damp path edges
    if (s.path > 0.1 && s.path < 0.5 && s.Hu > 0.1 && h2(gx, gz, SALT[79]) < 0.4) {
      const px = x + (h2(gx, gz, SALT[80]) - 0.5) * 5, pz = z + (h2(gz, gx, SALT[81]) - 0.5) * 5;
      if (inChunk(px, pz) && info[cellK(px, pz)].path < 0.1) hydrangea(px, pz, (h2(px, pz, 9) * 1e9) | 0);
    }
  }
  // fireflies / petals
  for (let t = 0; t < 6; t++) {
    const x = x0 + h2(t, x0, SALT[55] ^ z0) * size, z = z0 + h2(t, z0, SALT[56] ^ x0) * size;
    const s = info[cellK(x, z)];
    if ((s.paddy || (s.h > 0 && s.h < 2.2 && (s.valley > 0.3 || s.lake > 0.05))) && s.biome !== B.SNOW) kit.spot('fly', x, Math.max(s.h, 0) + 1.2, z);
  }
  // river crossings on farm lanes: plank bridges
  for (let j = 1; j < W - 1; j++) for (let i = 1; i < W - 1; i++) {
    const s = info[j * W + i];
    if (s.h < -0.3 && s.path > 0.2 && s.river > 0.2) {
      const x = x0 + (i - 0.5), z = z0 + (j - 0.5);
      kit.box('solid', x, 1.0, z, 1.04, 0.16, 1.04, (i + j) % 2 ? COL.deck : COL.cedar);
      if ((i + j) % 3 === 0) kit.box('solid', x, -0.6, z, 0.18, 3.2, 0.18, COL.woodDark);
    }
  }
  // grass tufts
  const gt = 1.35;
  for (let gz = Math.floor(z0 / gt); gz * gt < z0 + size; gz++) for (let gx = Math.floor(x0 / gt); gx * gt < x0 + size; gx++) {
    const x = gx * gt + h2(gx, gz, SALT[57]) * gt, z = gz * gt + h2(gx, gz, SALT[58]) * gt;
    if (!inChunk(x, z)) continue;
    const k = cellK(x, z), s = info[k], r = h2(gx, gz, SALT[59]);
    let p = 0, reed = false;
    if (s.street || s.rail > 0.1 || s.h < -0.05 || s.snow || s.pad > 0.4) continue;
    if (s.paddy) { p = levee[k] ? 0.55 : 0; }
    else switch (s.biome) {
      case B.SATO: p = 0.5; break; case B.SAKURA: p = 0.4; break; case B.CEDAR: p = 0.1; break; case B.BAMBOO: p = 0.08; break;
      case B.BEACH: p = s.h > 1 ? 0.25 : 0; break; case B.TOWN: p = 0.04; break; case B.SNOW: p = 0.08; break;
      case B.MEADOW: p = 0.85; break; case B.MARSH: p = s.h > 0.5 ? 0.5 : 0.85; break; case B.PINE: p = 0; break; default: p = 0.3;
    }
    if (s.h < 1.3 && (s.lake > 0.05 || s.valley > 0.2)) { p = 0.8; reed = r < 0.35; }
    if (s.path > 0.3) p *= 0.1;
    if (r > p) continue;
    const rr = h2(gx, gz, SALT[60]);
    const sc = reed ? 0.9 + rr * 0.8 : 0.5 + rr * 0.6, sy = reed ? 1.6 + rr : 1;
    m4Compose(m16, x, hq[k], z, qAxis(0, 1, 0, rr * 6.28), sc, sc * sy, sc);
    tufts.push(m16, 16);
    const base = reed ? C(rr > 0.5 ? 0x8a9a58 : 0x6f8a48) : C([0x5f8240, 0x6e8f45, 0x7b9a4c, 0x55753a][Math.floor(rr * 4)]);
    if (s.biome === B.CEDAR) base.lerp(PAL.forest, 0.4);
    base.multiplyScalar(0.8 + r * 0.6);
    tuftC.push3(base.r, base.g, base.b);
  }
  // castle-town lots
  decorateTown(x0, z0, size, info, cellK, inChunk);
  // railway
  emitRail(x0, z0, size, 0);
  structuresIn(x0, z0, size, inChunk, 0);
}
function structuresIn(x0, z0, size, inChunk, lod) {
  const rx0 = Math.floor(x0 / REG), rz0 = Math.floor(z0 / REG), rx1 = Math.floor((x0 + size) / REG), rz1 = Math.floor((z0 + size) / REG);
  for (let rz = rz0; rz <= rz1; rz++) for (let rx = rx0; rx <= rx1; rx++) {
    const a = anchor(rx, rz);
    if (a.type && inChunk(a.x, a.z)) buildStructure(a, lod);
  }
}

function decorateTown(x0, z0, size, info, cellK, inChunk, lod = 0) {
  kit.detail = ASSET_LOD[lod].detail;
  for (let bz = Math.floor(z0 / 26) - 1; bz * 26 < z0 + size; bz++) for (let bx = Math.floor(x0 / 34) - 1; bx * 34 < x0 + size; bx++) {
    for (let row = 0; row < 2; row++) for (let li = 0; li < 4; li++) {
      const c = townCandidate(bx, bz, row, li);
      if (!c || !inChunk(c.x, c.z)) continue;
      if (c.type === 'garden') {
        if (WORLD_PROFILE.id === 'shanshui') emitShanshuiPlant({ ...c, kind: 'willow', scale: 0.8, r2: c.r, sample: sample(c.x, c.z, {}) }, lod);
        else if (lod === 0) { cherryTree(c.x, c.z, 'shidare', c.seed, 0.8, 0.5); stoneLantern(c.x + 2, c.z, 0.6, 0, 0.8); }
        else emitCherryLOD({ ...c, scale: 0.8, variant: 'shidare' }, lod);
      } else if (lod < 2) house(c.x, c.y, c.z, c.yaw, c.type, c.w, c.d, c.seed);
      else emitTownHouseLOD(c, lod);
    }
    if (lod > 1) continue;
    const lx = bx * 34 + 1.8, lz = bz * 26 + 1.6;
    if (!inChunk(lx, lz)) continue;
    const s = sample(lx, lz, {});
    if (s.town > 0.62 && s.h > 0.4 && s.rail === 0 && s.river < 0.05) {
      const y = kit.G(lx, lz);
      if (WORLD_PROFILE.id === 'shanshui') chinesePathLantern(lx + 2.2, lz + 2, 0, 1, y);
      else {
        kit.box('solid', lx + 2.2, y + 1.3, lz + 2, 0.14, 2.6, 0.14, COL.woodDark);
        chochin(lx + 2.2, y + 2.4, lz + 2, 1.1, h2(bx, bz, 3) > 0.5 ? COL.lanternRed : COL.paper, 1.4);
      }
    }
  }
  kit.detail = 1;
}

function emitRail(x0, z0, size, lod) {
  const n0 = railLine(z0 - 40), n1 = railLine(z0 + size + 40);
  for (let n = n0; n <= n1; n++) {
    const step = lod === 0 ? 0.9 : 8;
    for (let x = Math.ceil(x0 / step) * step; x < x0 + size; x += step) {
      const z = railZ(n, x);
      if (z < z0 || z >= z0 + size) continue;
      const y = railH(n, x), dz = railDZ(n, x), yaw = Math.atan2(-dz, 1);
      const nat = natural(x, z, {}).h;
      if (nat > y + 11) {
        // tunnel: portal where the hillside begins
        const prev = natural(x - step, railZ(n, x - step), {}).h, next = natural(x + step, railZ(n, x + step), {}).h;
        if (lod === 0 && (prev <= y + 11 || next <= y + 11)) {
          kit.push(x, y, z, yaw);
          for (const sz of [-1, 1]) kit.box('solid', 0, 2.6, sz * 2.6, 1.6, 5.4, 1.2, COL.stoneDark);
          kit.box('solid', 0, 5.6, 0, 1.6, 1.4, 6.4, COL.stone);
          kit.box('solid', -0.85, 2.6, 0, 0.2, 5.2, 4.0, C(0x0c0b0a));
          kit.pop();
        }
        continue;
      }
      kit.push(x, y, z, yaw);
      if (lod === 0) {
        kit.box('solid', 0, 0.08, 0, 0.26, 0.16, 2.5, C(0x3d3128));
        for (const sz of [-0.72, 0.72]) kit.box('metal', 0, 0.24, sz, step + 0.02, 0.12, 0.09, COL.steel);
        const bridge = nat < y - 1.6;
        if (bridge) {
          kit.box('solid', 0, -0.25, 0, step + 0.02, 0.5, 3.0, C(0x3a3a3c));
          if (Math.abs(((x % 7.2) + 7.2) % 7.2) < step) {
            const hgt = y - Math.max(nat, -6) + 0.2;
            for (const sz of [-1.1, 1.1]) kit.box('solid', 0, -hgt / 2, sz, 0.45, hgt, 0.45, C(0x4b4b4e));
            kit.box('solid', 0, -hgt * 0.5, 0, 0.25, 0.25, 2.4, C(0x4b4b4e));
          }
          for (const sz of [-1.45, 1.45]) kit.box('solid', 0, 0.7, sz, step + 0.02, 0.08, 0.08, COL.steel);
        }
        if (Math.abs(((x % 36) + 36) % 36) < step && !bridge) {
          kit.box('solid', 0, 3.2, 3.6, 0.18, 6.4, 0.18, C(0x4a3b30));
          kit.box('solid', 0, 6.0, 3.6, 0.12, 0.12, 1.4, C(0x4a3b30));
        }
      } else kit.box('solid', 0, 0.2, 0, step, 0.4, 2.8, C(0x3a3634));
      kit.pop();
    }
    // stations where the line meets a town
    for (let xs = Math.ceil(x0 / 420) * 420; xs < x0 + size; xs += 420) {
      const z = railZ(n, xs);
      if (z < z0 || z >= z0 + size) continue;
      const s = sample(xs, z + 6, {});
      if (s.town < 0.4 && h2(n, Math.round(xs / 420), SALT[62]) > 0.35) continue;
      station(xs, railH(n, xs), z, Math.atan2(-railDZ(n, xs), 1), lod);
    }
  }
}
function station(x, y, z, yaw, lod = 0) {
  if (WORLD_PROFILE.id === 'shanshui') { shanshuiStation(x, y, z, yaw, lod); return; }
  const detail = kit.detail;
  kit.detail = ASSET_LOD[lod].detail;
  kit.push(x, y, z, yaw);
  kit.box('solid', 0, 0.45, 3.4, 30, 0.9, 3.6, COL.stone);
  kit.box('solid', 0, 0.92, 1.75, 30, 0.08, 0.3, C(0xe0d8c0));
  for (let i = -3; i <= 3; i += lod >= 2 ? 3 : 1) kit.box('solid', i * 4.2, 2.6, 4.4, 0.22, 3.4, 0.22, COL.woodDark);
  roof(4.2, 28, 2.6, { type: 'gable', layers: 4, over: 0.6, rise: 0.9, shift: 3.9, col: C(0x4a4f57), tileEnds: false });
  if (lod >= 2) {
    kit.box('solid', 6, 2.2, 4.8, 7, 2.6, 2.6, COL.plasterShade);
    kit.box('glow', 6, 2.1, 6.13, 4.4, 1, 0.06, COL.paper);
    kit.pop(); kit.detail = detail; return;
  }
  kit.push(6, 0.9, 4.8, 0);
  body(7, 2.6, 0, 2.6, { bay: 1.75, fill: (s, i) => s === 'front' ? (i === 1 ? 'door' : 'shoji') : 'plaster', noren: COL.indigo });
  kit.pop();
  kit.box('solid', -4, 3.1, 2.6, 2.4, 0.6, 0.08, COL.white);
  kit.box('solid', -4, 3.1, 2.55, 2.2, 0.08, 0.02, COL.black);
  for (const lx of [-10, 0, 10]) chochin(lx, 3.3, 3.0, 1.0, COL.paper, lx === 0 ? 1.4 : 0);
  kit.pop();
  kit.detail = detail;
}


function decorateFar(x0, z0, size, lod, info, hq, raw, W, cellK, inChunk) {
  decorateAssets(x0, z0, size, lod, inChunk);
  decorateTown(x0, z0, size, info, cellK, inChunk, lod);
  emitRail(x0, z0, size, lod);
  structuresIn(x0, z0, size, inChunk, lod);
}

function buildStructure(a, lod) {
  if (WORLD_PROFILE.id === 'shanshui' && buildShanshuiStructure(a, lod)) return;
  const y = a.h, yaw = a.yaw, sy = Math.sin(yaw), cy = Math.cos(yaw);
  const P = (lx, lz) => [a.x + cy * lx + sy * lz, a.z - sy * lx + cy * lz];
  const rng = mulberry32(a.seed);
  kit.detail = lod === 0 ? 1 : (lod === 1 ? 0.45 : 0.3);
  if (lod >= 3 && emitLandmarkLOD(a, lod)) return;
  switch (a.type) {
    case 'temple': case 'templeTown': {
      const big = a.type === 'temple';
      const hp = P(0, -7); hall(hp[0], y, hp[1], yaw, big ? 10 : 8, big ? 7.5 : 6);
      const pp = P(big ? 11 : 8, -2); pagoda(pp[0], y, pp[1], yaw, big ? 5 : 3);
      const gp = P(0, big ? 15 : 11); gate(gp[0], y, gp[1], yaw, big ? 1 : 0.8);
      for (const lz of [3, 8]) for (const sx of [-1, 1]) { const p = P(sx * 2.8, lz); stoneLantern(p[0], p[1], 0.75, yaw, lz === 3 ? 1.0 : 0.7, 'kasuga', y); }
      for (let i = 0; i < 9; i++) { const p = P(0, -2 + i * 1.6); kit.box('solid', p[0], y + 0.04, p[1], 2.2, 0.12, 1.3, i % 2 ? COL.stone : COL.stoneLight, 0, yaw, 0); }
      if (lod <= 1) {
        for (const [lx, lz, k] of [[-12, 8, 'shidare'], [-14, -5, 'yama'], [13, 11, 'pale']]) { const p = P(lx, lz); cherryTree(p[0], p[1], k, a.seed + lx, 0.95, lod === 0 ? 0.6 : 0.12); }
        const pn = P(-9, -12); pine(pn[0], pn[1], 0.9, a.seed + 9);
        // bell pavilion
        const bp = P(-10, 3);
        kit.push(bp[0], y, bp[1], yaw);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box('lacquer', sx * 1.3, 1.6, sz * 1.3, 0.24, 3.2, 0.24, COL.shu);
        kit.box('metal', 0, 2.2, 0, 1.0, 1.4, 1.0, C(0x5d6b5a));
        roof(3.2, 2.6, 2.6, { type: 'hip', layers: 7, over: 0.7, rise: 1.4, upturn: 0.25 });
        kit.pop();
      }
      break;
    }
    case 'castle': {
      castle(a.x, y, a.z, yaw);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + 0.3, p = [a.x + Math.cos(ang) * 22, a.z + Math.sin(ang) * 22];
        if (lod <= 1) cherryTree(p[0], p[1], i % 3 ? 'yama' : 'pale', a.seed + i, 0.95, lod === 0 ? 0.55 : 0.12);
      }
      for (const sx of [-1, 1]) { const p = P(sx * 4, 13); stoneLantern(p[0], p[1], 0.9, yaw, 1.2, 'kasuga', y); }
      break;
    }
    case 'shrine': {
      const sp = P(0, -4); shrine(sp[0], y, sp[1], yaw);
      for (let i = 0; i < 4; i++) { const p = P(0, 6 + i * 3.2); torii(p[0], p[1], yaw, 0.82, G(p[0], p[1])); }
      for (const sx of [-1, 1]) { const p = P(sx * 2.6, 4.2); stoneLantern(p[0], p[1], 0.6, yaw, sx > 0 ? 0.9 : 0, 'kasuga', y); }
      if (lod <= 1) { const p = P(-7, -1); cherryTree(p[0], p[1], 'shidare', a.seed, 0.95, lod === 0 ? 0.6 : 0.12); const q = P(7, -6); conifer(q[0], q[1], 1.6, a.seed + 3); }
      break;
    }
    case 'farm': {
      house(a.x, y, a.z, yaw, 'thatch', 9, 6.2, a.seed);
      const kp = P(7.5, -4); house(kp[0], y, kp[1], yaw + Math.PI / 2, 'kura', 4.4, 5.0, a.seed + 1);
      const hp = P(-8, 4); house(hp[0], y, hp[1], yaw + 0.3, rng() > 0.5 ? 'tile' : 'thatch', 7, 5.2, a.seed + 2);
      if (lod <= 1) {
        const tp = P(-4, -8); persimmon(tp[0], tp[1], a.seed + 3);
        const cp = P(9, 7); cherryTree(cp[0], cp[1], 'yama', a.seed + 4, 0.9, lod === 0 ? 0.55 : 0.12);
        if (lod === 0) for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) {
          const p = P(-2 + c * 0.8, 8 + r * 1.1);
          kit.box('leaf', p[0], y + 0.2, p[1], 0.5, 0.35 + h2(r, c, 9) * 0.2, 0.5, C(r % 2 ? 0x6f9a44 : 0x5c8a3a), 0, yaw, 0);
        }
        const wp = P(4, 6); kit.box('solid', wp[0], y + 0.4, wp[1], 1.2, 0.8, 1.2, COL.stoneDark); kit.box('solid', wp[0], y + 1.6, wp[1], 0.1, 1.8, 1.4, COL.woodDark, 0, yaw, 0);
      }
      break;
    }
    case 'teahouse': {
      teahouse(a.x, y, a.z, yaw);
      if (lod <= 1) { const p = P(7, 2); cherryTree(p[0], p[1], 'ancient', a.seed, 1, lod === 0 ? 0.75 : 0.12); }
      break;
    }
    case 'hut': hut(a.x, y, a.z, yaw); break;
    case 'lighthouse': lighthouse(a.x, y, a.z); { const p = P(5, 4); if (lod <= 1) pine(p[0], p[1], 0.9, a.seed); } break;
    case 'seaTorii': torii(a.x, a.z, yaw, 2.1, y - 0.2); break;
    case 'pavilion': {
      kit.push(a.x, 0, a.z, yaw);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box('lacquer', sx * 2.2, -0.4 + 1.9, sz * 2.2, 0.26, 4.6, 0.26, COL.shu);
      kit.box('solid', 0, 0.75, 0, 6, 0.2, 6, COL.deck);
      for (const sx of [-1, 1]) kit.box('lacquer', sx * 2.9, 1.3, 0, 0.1, 0.1, 5.8, COL.shu);
      roof(3.6, 4.4, 4.4, { type: 'pyramid', layers: 7, over: 1.0, rise: 1.6, upturn: 0.35, ridge: false });
      kit.box('metal', 0, 5.4, 0, 0.3, 0.8, 0.3, COL.gold);
      chochin(0, 2.9, 0, 1.0, COL.paper, 1.6);
      kit.pop();
      // red bridge to the nearest shore
      let best = null;
      for (let k = 0; k < 16 && !best; k++) for (let d = 6; d < 48; d += 2) {
        const ang = (k / 16) * Math.PI * 2, x = a.x + Math.cos(ang) * d, z = a.z + Math.sin(ang) * d;
        if (sample(x, z, {}).h > 0.4) { if (!best || d < best.d) best = { d, ang }; break; }
      }
      if (best && best.d < 46) {
        const ex = a.x + Math.cos(best.ang) * 3.2, ez = a.z + Math.sin(best.ang) * 3.2;
        const bx = a.x + Math.cos(best.ang) * (best.d + 1.5), bz = a.z + Math.sin(best.ang) * (best.d + 1.5);
        arcBridge(ex, ez, bx, bz, 0.8, 2.4, Math.min(2.2, best.d * 0.12), true);
      }
      break;
    }
  }
  kit.detail = 1;
}

// ---------------------------------------------------------------------
//  Finders (spawn point & biome teleports)
// ---------------------------------------------------------------------
function findBiome(target, x0, z0, maxR = 9000) {
  const step = 48;
  for (let r = 0; r <= maxR; r += step) {
    const n = Math.max(1, Math.round((2 * Math.PI * r) / step));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r * 0.013;
      const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
      if (target === 'rail') { const ln = railLine(z), rz = railZ(ln, x); if (Math.abs(rz - z) < 30 && railH(ln, x) > natural(x, rz, {}).h - 4) return { x, z: rz, h: railH(ln, x), rail: true }; continue; }
      if (typeof target === 'string') {
        const an = anchor(Math.floor(x / REG), Math.floor(z / REG));
        if (an.type === target || (target === 'temple' && an.type === 'templeTown')) return { x: an.x, z: an.z, h: an.h, yaw: an.yaw, type: an.type, r: an.r };
        continue;
      }
      const s = sample(x, z, {});
      if (s.biome === target) {
        // require a few neighbours of the same biome so we land inside it
        let ok = 0;
        for (const [dx, dz] of [[30, 0], [-30, 0], [0, 30], [0, -30]]) if (sample(x + dx, z + dz, {}).biome === target) ok++;
        if (ok >= 3) return { x, z, h: s.h };
      }
    }
  }
  return null;
}
/** a framed vantage point looking at a target location */
function vantage(t, dist = 34, height = 9) {
  let best = null;
  for (let k = 0; k < 12; k++) {
    const ang = (k / 12) * Math.PI * 2 + (t.yaw || 0) + Math.PI / 2;
    const x = t.x + Math.sin(ang) * dist, z = t.z + Math.cos(ang) * dist;
    const g = Math.max(sample(x, z, {}).h, 0);
    let block = 0;
    for (let i = 1; i < 6; i++) { const f = i / 6; const hh = sample(lerp(x, t.x, f), lerp(z, t.z, f), {}).h; block = Math.max(block, hh - lerp(g + height, t.h + 4, f)); }
    const facing = t.yaw !== undefined ? Math.cos(ang - t.yaw) : 0;
    const score = -block * 2 + facing * 3 - Math.abs(g - t.h) * 0.2;
    if (!best || score > best.score) best = { x, z, y: g + height, score };
  }
  return { pos: [best.x, best.y, best.z], target: [t.x, (t.h || 0) + (t.r ? 6 : 3), t.z] };
}
function findSpawn() {
  const order = WORLD_PROFILE.spawnOrder;
  for (const t of order) {
    const f = findBiome(t, 0, 0, 2600);
    if (f) return Object.assign(vantage(f, t === 'changan' ? 68 : t === 'castle' ? 62 : 44, t === 'castle' || t === 'changan' ? 16 : 11), { kind: t });
  }
  return { pos: [0, 40, 0], target: [0, 20, -100], kind: 'none' };
}
function biomeAt(x, z) { const s = sample(x, z, {}); return { biome: s.biome, h: s.h, name: BIOME_NAMES[s.biome], rail: s.rail, snow: s.snow }; }

return {
  setSeed, setTheme, sample, heightAt, natural, habitatAt, habitatPath, genChunk, findBiome, vantage, findSpawn, biomeAt, railZ, railDZ, railH, railLine,
  LODS, ASSET_LOD, assetCandidate, townCandidate, B, BIOME_NAMES, RAIL_SP, kit, house, roof, body, chochin, C, Col, h2, fbm, mulberry32, clamp, lerp, smoothstep,
  get seed() { return SEED; },
  get theme() { return WORLD_PROFILE.id; },
  get profile() { return WORLD_PROFILE; },
};
})();
