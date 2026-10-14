// Shanshui assets and ecosystem selection share the same candidate seed at
// every distance. LOD changes detail inside an asset, never its species.
//
// Ecology follows the painting: plants cluster where the composition needs
// weight (waterline willows, terrace-edge peach, cliff pines) and large tracts
// are deliberately left bare — 留白, negative space, is a material here.
function pickShanshuiPlant(s, r, r2, nearWater) {
  if (s.waterLevel != null) return null;
  if (s.paddy || s.snow) return s.snow && r < 0.16 ? 'rock' : null;
  switch (s.biome) {
    case B.SAKURA: return r < 0.46 ? 'peach' : r < 0.57 ? 'broadleaf' : null;
    case B.CEDAR: return r < 0.28 ? 'huangshanPine' : r < 0.37 ? 'rock' : null;
    case B.PINE: return r < 0.36 ? 'huangshanPine' : r < 0.44 ? 'rock' : null;
    case B.BAMBOO: return r < 0.66 ? 'bamboo' : r < 0.73 ? 'cypress' : null;
    case B.SATO:
      // Willows only hug the waterline; the meadow behind stays open.
      if (nearWater && r < 0.22) return 'willow';
      return r < 0.06 ? 'peach' : r < 0.19 ? 'broadleaf' : r < 0.24 ? 'cypress' : null;
    case B.MARSH: return shoreHeight(s) < 0.8 && r < 0.17 ? 'lotus' : r < 0.38 ? 'reed' : r < 0.44 ? 'willow' : null;
    case B.MEADOW: return r < 0.03 ? 'peach' : r < 0.09 ? 'wildflowers' : null;
    case B.BEACH: return s.h > 1 && r < 0.18 ? 'huangshanPine' : r < 0.28 ? 'rock' : null;
    case B.TOWN:
      // Waterside towns keep a willow every few bays, and nothing else inside
      // the built fabric — the streets are the composition.
      if (nearWater && r < 0.2) return 'willow';
      return null;
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

// ---------------------------------------------------------------------
//  Composition helpers — layout primitives shared by the compounds
// ---------------------------------------------------------------------

// A paved spine: the stone-paved main axis of a settlement. Alternating slab
// tones read as a laid pavement rather than a painted stripe.
function cnAxisPaving(halfW, from, to, o = {}) {
  const step = o.step || 2.4, y = o.y || 0.07, tone = o.tone || CN.court;
  for (let z = from; z < to; z += step) {
    const j = h2(Math.round(z * 8), o.seed || 5, SALT[60]);
    kit.box('solid', (j - 0.5) * 0.16, y, z + step / 2, halfW * 2, 0.13, step + 0.06, tone.clone().multiplyScalar(0.9 + j * 0.16));
  }
  if (kit.detail > 0.3) for (const sx of [-1, 1]) kit.box('solid', sx * (halfW + 0.3), y + 0.02, (from + to) / 2, 0.55, 0.2, to - from, CN.plinth);
}

// A cross street used to divide ward plots.
function cnCrossStreet(halfW, span, y = 0.07, seed = 5) {
  const step = 2.4;
  for (let x = -span; x < span; x += step) {
    const j = h2(Math.round(x * 8), seed, SALT[61]);
    kit.box('solid', x + step / 2, y, 0, step + 0.06, 0.13, halfW * 2, CN.courtDark.clone().multiplyScalar(0.92 + j * 0.14));
  }
}

// A walled courtyard: earth court inside, four walls, one gate on +Z.
// Returns the inner half-extents so callers can fill it with restraint.
function cnCourtyard(w, d, o = {}) {
  const wallH = o.wallH || 2.5, gap = o.gap || 3.2;
  // Earth court, subtly warmer than the street outside.
  kit.box('solid', 0, 0.05, 0, w, 0.1, d, CN.courtWarm);
  // Paving strip in front of the gate, leading in from the street.
  kit.box('solid', 0, 0.07, d / 2 + 1.6, gap + 1.0, 0.12, 3.2, CN.court);
  // North wall (full), east/west walls (full), south wall (split by the gate).
  kit.box('solid', 0, wallH / 2, -d / 2, w, wallH, 0.36, CN.wallShade);
  for (const sx of [-1, 1]) kit.box('solid', sx * w / 2, wallH / 2, 0, 0.36, wallH, d, CN.wallShade);
  const seg = Math.max(0.5, (w - gap) / 2);
  for (const sx of [-1, 1]) kit.box('solid', sx * (gap + seg) / 2, wallH / 2, d / 2, seg, wallH, 0.36, CN.wallShade);
  // Tiled coping: a thin dark band makes the wall line legible at distance.
  kit.box('solid', 0, wallH + 0.14, -d / 2, w + 0.5, 0.22, 0.62, CN.tileDeep);
  for (const sx of [-1, 1]) kit.box('solid', sx * w / 2, wallH + 0.14, 0, 0.62, 0.22, d + 0.5, CN.tileDeep);
  for (const sx of [-1, 1]) kit.box('solid', sx * (gap + seg) / 2, wallH + 0.14, d / 2, seg + 0.5, 0.22, 0.62, CN.tileDeep);
  // The gate: two red posts under a small tiled roof.
  for (const sx of [-1, 1]) kit.box('lacquer', sx * gap / 2, wallH * 0.6, d / 2, 0.28, wallH * 1.2, 0.34, CN.redDark);
  kit.push(0, wallH * 1.2, d / 2); chineseRoof(0, gap + 1.4, 1.0, { gold: false, rise: 0.42, over: 0.4, upturn: 0.28 }); kit.pop();
  // Threshold stone at the gate mouth.
  kit.box('solid', 0, 0.1, d / 2, gap + 0.8, 0.2, 0.9, CN.plinth);
  return { w: w / 2 - 0.6, d: d / 2 - 0.6 };
}

// ---------------------------------------------------------------------
//  The Chang'an ward — an ordered axial city block
// ---------------------------------------------------------------------
// Layout (local +Z is the front, toward the avenue):
//   +Z   zhuque avenue frontage — shops and a paifang gate
//    0   cross street, dividing the block into a front and rear ward
//   -Z   rear courtyard ward with a hall and two side wings
// A north-south paved axis threads the whole block through to the wall gate.
// Footprint stays inside the anchor radius (36).
function cnChanganLocal(a, lod) {
  const seed = a.seed, rng = mulberry32(seed);

  // --- Enclosure: low ward wall with a gate on the avenue frontage ---
  const WW = 34, WD = 30, WH = 3.0;
  chineseWallLocal(WW, WD, WH, true);

  // --- North-south main axis, street to street ---
  cnAxisPaving(3.4, -WD / 2 + 2, WD / 2 - 2, { seed, tone: CN.court });
  // --- East-west cross street dividing the two wards ---
  cnCrossStreet(2.6, WW / 2 - 2, 0.07, seed + 1);

  // --- Front ward (+Z): two rows of shophouse terrace facing the avenue ---
  // Row A sits right on the avenue; row B backs onto the cross street.
  const shopW = 6.4, shopD = 5.2, bays = 4;
  for (let i = 0; i < bays; i++) {
    const x = -WW / 2 + 5.2 + i * 7.6;
    if (x > WW / 2 - 4) break;
    // Front row faces +Z (the avenue); rear row faces -Z (the cross street).
    const frontH = 2.9 + (i % 3) * 0.55 + rng() * 0.3;
    kit.push(x, 0, WD / 2 - 3.6);
    chineseHallLocal(shopW, shopD, frontH, i === 1, false, { gold: false });
    kit.pop();
    chineseLantern(x + 2.6, 2.4, WD / 2 - 3.6 + shopD / 2 + 0.7, 0.75, i === 1 ? 1.0 : 0);
    const rearH = 2.6 + (i % 2) * 0.4;
    kit.push(x + 1.6, 0, 6.4, Math.PI);
    chineseHallLocal(shopW, shopD - 0.6, rearH, false, i % 2 === 0, { gold: false });
    kit.pop();
  }

  // --- Paifang on the axis at the avenue frontage: the ward's front door ---
  kit.push(0, 0, WD / 2 + 1.4); chinesePaifangLocal(0.85); kit.pop();

  // --- Rear ward (-Z): a walled courtyard with a modest hall ---
  kit.push(0, 0, -13);
  cnCourtyard(20, 13, { wallH: 2.4, gap: 3.0 });
  const hallH = 3.2 + (rng() < 0.4 ? 0.6 : 0);
  kit.push(0, 0, -2.0); chineseHallLocal(13, 7.4, hallH, false, false, { gold: false }); kit.pop();
  // Two low side wings keep the courtyard's axial symmetry.
  for (const sx of [-1, 1]) {
    kit.push(sx * 7.2, 0, 2.0, Math.PI / 2);
    chineseHallLocal(7.6, 4.6, 2.4, false, true, { gold: false });
    kit.pop();
  }
  // A single well off-axis — the courtyard's small daily focal point.
  kit.box('solid', -5.2, 0.5, 5.2, 1.5, 1.0, 1.5, CN.plinthDark);
  kit.box('solid', -5.2, 1.06, 5.2, 1.1, 0.14, 1.1, C(0x3a4644));
  if (lod < 2) { kit.push(4.6, 0, 5.4); chinesePeachLocal(0.8, seed + 7, lod); kit.pop(); }
  kit.pop();

  // --- Corner watch pavilions on the ward wall ---
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    if (lod > 1 && sz > 0) continue;
    kit.push(sx * (WW / 2 - 1.4), WH, sz * (WD / 2 - 1.4));
    chinesePavilionLocal(0.62);
    kit.pop();
  }

  // --- Street lanterns: every other bay, never a uniform row ---
  // These are emitted inside kit.push(a.x, a.h, a.z), so omitting the explicit
  // y would default to G(x, z) — a *world-space* terrain sample taken at
  // local coordinates. That floated the whole row into the sky. y = 0 pins
  // them to the ward's own pad.
  if (lod < 3) {
    for (let i = 0; i < bays; i++) {
      const x = -WW / 2 + 5.2 + i * 7.6;
      if (x > WW / 2 - 4) break;
      chinesePathLantern(x - 3.4, WD / 2 + 2.6, 0, 0.95, 0);
    }
  }
}

// ---------------------------------------------------------------------
//  Palace: ordered axial plan inside the pad radius
// ---------------------------------------------------------------------
// south gate → outer court → inner gate → raised throne terrace →
// throne hall (tallest) → rear residence. Galleries link the courts.
function cnPalaceLocal(a, lod) {
  const seed = a.seed, rng = mulberry32(seed);
  const OW = 56, OD = 50, WH = 4.4;

  // --- Enclosure wall with the south gate opening ---
  chineseWallLocal(OW, OD, WH, true);

  // --- Ground treatment: outer court, then the raised throne terrace ---
  kit.box('solid', 0, 0.05,  8, 44, 0.1, 30, CN.courtDark);   // outer court earth
  kit.box('solid', 0, 0.06, 20, 12, 0.12, 20, CN.court);       // imperial way
  // Three-step stone terrace carrying the throne hall.
  for (let i = 0; i < 3; i++) kit.box('solid', 0, 0.26 + i * 0.5, -8, 34 - i * 2.2, 0.5, 22 - i * 1.6, i % 2 ? CN.plinth : CN.plinthDark);
  kit.box('solid', 0, 1.62, -8, 31, 0.2, 19.4, CN.plinthTop);
  // Balustrades around the terrace edge.
  if (kit.detail > 0.3) for (const sz of [-1, 1]) {
    kit.box('solid', 0, 2.0, -8 + sz * 9.9, 32, 0.16, 0.16, CN.stone);
    for (let x = -15; x <= 15; x += 3.2) kit.box('solid', x, 1.85, -8 + sz * 9.9, 0.22, 0.5, 0.22, CN.stone);
  }
  // Grand stair down to the court, on the axis.
  const steps = kit.detail > 0.3 ? 8 : 4;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    kit.box('solid', 0, 1.5 - t * 1.5, 3.0 + t * 5.0, 12 - t * 1.2, 1.5 / steps + 0.06, 5.0 / steps + 0.04, i % 2 ? CN.plinth : CN.plinthTop);
  }

  // --- South gatehouse: pierced wall + two-eave hall above ---
  for (const sx of [-1, 1]) kit.box('solid', sx * 9.5, WH / 2, OD / 2, 6.4, WH, 1.8, CN.stoneDark);
  kit.box('solid', 0, WH - 1.0, OD / 2, 6.2, 2.0, 1.9, C(0x1e1b18));   // gate arch
  kit.push(0, WH, OD / 2 - 1.2); chineseHallLocal(19, 7, 4.0, true); kit.pop();

  // --- Inner gatehouse at mid-court, lower than the throne hall ---
  kit.push(0, 0, OD / 2 - 20); chineseHallLocal(16, 5.4, 3.6, true); kit.pop();

  // --- Throne hall: the tallest, deepest massing in the compound ---
  // Compound-local yaw; the raised terrace puts its ridge well above 13 m.
  kit.push(0, 1.72, -8);
  cnPalaceHallLocal(26, 14, 6.0, seed);
  kit.pop();

  // --- Rear residence, quieter and lower ---
  kit.push(0, 0, -28); chineseHallLocal(19, 9, 4.0, false); kit.pop();

  // --- Side galleries: open colonnades linking outer and inner courts ---
  for (const sx of [-1, 1]) {
    kit.push(sx * 22, 0, -2, Math.PI / 2);
    chineseHallLocal(30, 5.2, 3.0, false, true, { gold: false });
    kit.pop();
    // Corner pavilions at the outer wall.
    kit.push(sx * (OW / 2 - 1.6), WH, OD / 2 - 1.6); chinesePavilionLocal(0.85); kit.pop();
  }

  // --- Ceremonial vessels flanking the stair, leaving the axis clear ---
  // Every decorated element stays inside the enclosure wall so the compound's
  // silhouette footprint is identical at every LOD.
  if (kit.detail > 0.3) {
    for (const sx of [-1, 1]) {
      kit.box('solid', sx * 10.5, 0.55, 10, 2.2, 0.9, 2.2, CN.plinthDark);
      kit.box('metal', sx * 10.5, 1.6, 10, 1.2, 1.3, 1.2, C(0x637973));
      kit.box('metal', sx * 10.5, 2.35, 10, 1.55, 0.18, 1.55, CN.gold);
    }
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) chineseLantern(sx * 7.6, 2.5, 6 + i * 4, 1.0, i === 1 ? 1.2 : 0);
  }

  // --- Garden court behind the residence: deliberately sparse, and inside the
  // wall so it never alters the silhouette footprint between LODs. ---
  kit.push(-11, 0, -20); chinesePineLocal(1.0, seed, 0); kit.pop();
  kit.push(12, 0, -21); chinesePineLocal(0.8, seed + 3, 0); kit.pop();
}

// The throne hall: a deep double-eave hall with side galleries. Kept separate
// so the palace's silhouette hierarchy reads clearly: this is the peak.
function cnPalaceHallLocal(w, d, h, seed) {
  chineseHallLocal(w, d, h, true);
  // Secondary eaves down both long sides: the classic double-eave profile.
  for (const side of [-1, 1]) {
    kit.push(0, 0, side * (d / 2 + 0.3));
    chineseRoof(h * 0.58, w + 0.6, 2.2, { gold: true, rise: 0.62, over: 0.65, upturn: 0.35 });
    kit.pop();
  }
  if (kit.detail > 0.3) for (const side of [-1, 1]) chineseLantern(side * w * 0.28, 3.2, d / 2 + 1.45, 1.1, side < 0 ? 1.6 : 0);
}

// ---------------------------------------------------------------------
//  Waterside teahouse — raised over the water, stacked and restrained
// ---------------------------------------------------------------------
function cnTeahouseLocal(a, lod) {
  const seed = a.seed, rng = mulberry32(seed);
  const w = 10.0, d = 6.6, h = 2.9;

  // Stone base, partly standing in the water.
  kit.box('solid', 0, -0.30, 0, w + 1.8, 1.1, d + 1.8, CN.plinthDark);
  kit.box('solid', 0,  0.24, 0, w + 1.3, 0.2, d + 1.3, CN.plinth);
  // Piles where the platform meets the water.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box('solid', sx * (w / 2 - 0.4), -1.5, sz * (d / 2 - 0.4), 0.34, 3.0, 0.34, CN.wood);

  // Ground storey.
  kit.box('solid', 0, 0.44 + h / 2, -d * 0.15, w - 0.4, h, d * 0.66, CN.wall);
  for (const sx of [-1, 1]) kit.box('solid', sx * (w / 2 - 0.12), 0.44 + h / 2, 0, 0.22, h, d, CN.wallShade);
  kit.box('solid', 0, 0.44 + h / 2, d / 2 - 0.09, w - 0.2, h, 0.16, CN.wood);
  // Lattice bays: warm interior light seen through timber screens.
  const bays = Math.max(3, Math.round(w / 2.5));
  for (let i = 0; i < bays; i++) {
    const x = -w / 2 + w * (i + 0.5) / bays, bw = w / bays - 0.3;
    const door = i === Math.floor(bays / 2);
    kit.box(door ? 'solid' : 'glow', x, door ? 1.35 : 1.95, d / 2 + 0.03, bw * 0.78, door ? 2.0 : 1.45, 0.05, door ? C(0x272623) : C(0xdec59a));
    if (!door && kit.detail > 0.6) kit.box('solid', x, 1.95, d / 2 + 0.07, 0.06, 1.45, 0.03, CN.wood);
  }
  // Timber columns, grey — a civilian building, not a hall.
  const count = kit.detail > 0.3 ? Math.max(3, Math.round(w / 2.8)) : 2;
  for (let i = 0; i <= count; i++) for (const sz of [-1, 1]) {
    const x = -w / 2 + w * i / count;
    kit.box('lacquer', x, 0.44 + h / 2, sz * (d / 2 + 0.28), 0.24, h, 0.24, CN.wood);
  }
  kit.box('solid', 0, h + 0.44, 0, w + 0.7, 0.28, d + 0.8, CN.wood);
  const floor2 = chineseRoof(h + 0.56, w + 0.2, d + 0.3, { gold: false });

  // Upper storey — a viewing room with a wraparound balcony. This second roof
  // gives the teahouse its distinctive stacked waterside silhouette.
  const uw = w - 1.4, ud = d - 1.8, uh = 2.3;
  kit.push(0, floor2 - 0.1, -0.2);
  chineseHallLocal(uw, ud, uh, false, false, { gold: false });
  kit.pop();
  // Balcony deck and railing around the upper floor.
  kit.box('solid', 0, floor2 + 0.06, 0, w + 0.5, 0.16, d + 0.5, CN.wood);
  if (kit.detail > 0.3) for (const sz of [-1, 1]) {
    kit.box('solid', 0, floor2 + 0.72, sz * (d / 2 + 0.3), w + 0.5, 0.1, 0.12, CN.wood);
    for (let x = -w / 2; x <= w / 2; x += 1.5) kit.box('solid', x, floor2 + 0.44, sz * (d / 2 + 0.3), 0.08, 0.56, 0.08, CN.wood);
  }
  // Warm upper windows so the teahouse glows across the water at night.
  if (kit.detail > 0.3) for (let i = 0; i < bays; i++) {
    const x = -uw / 2 + uw * (i + 0.5) / bays;
    kit.box('glow', x, floor2 + uh * 0.6, -0.2 + ud / 2 + 0.02, uw / bays - 0.34, 1.25, 0.05, C(0xd8c48a));
  }

  // --- Front veranda reaching over the water ---
  const vd = 2.4, front = d / 2 + vd / 2;
  kit.box('solid', 0, 0.3, front, w + 0.6, 0.18, vd + 0.4, CN.wood);
  if (kit.detail > 0.3) {
    kit.box('solid', 0, 1.06, d / 2 + vd, w + 0.2, 0.1, 0.12, CN.wood);
    kit.box('solid', 0, 0.52, d / 2 + vd, w + 0.2, 0.08, 0.1, CN.wood);
    for (let x = -w / 2; x <= w / 2; x += 1.5) kit.box('solid', x, 0.79, d / 2 + vd, 0.08, 0.54, 0.08, CN.wood);
    for (const px of [-w / 2 - 0.1, w / 2 + 0.1]) kit.box('solid', px, 0.75, d / 2 + vd - 0.3, 0.18, 1.5, 0.18, CN.wood);
    // Low tiled awning over the veranda.
    kit.push(0, h + 0.44, d / 2 + 1.1);
    chineseRoof(0, w + 0.4, 2.6, { gold: false, rise: 0.5, over: 0.4, upturn: 0.28 });
    kit.pop();
    // Tea benches and lanterns — a social frontage.
    for (const bx of [-2.4, 2.4]) {
      kit.box('solid', bx, 0.6, front, 1.9, 0.12, 0.66, CN.wood);
      kit.box('solid', bx, 0.7, front, 1.75, 0.06, 0.66, CN.plinth);
      kit.box('solid', bx, 0.92, front, 0.3, 0.28, 0.3, C(0xddd2b0));
    }
    for (const lx of [-3.6, 0, 3.6]) chineseLantern(lx, 2.0, d / 2 + vd - 0.2, 0.86, lx === 0 ? 1.3 : 0);
    // Hanging shop sign on the water side.
    kit.box('solid', 0, 2.5, d / 2 + vd + 0.16, 2.4, 0.56, 0.12, CN.ink);
    kit.box('metal', 0, 2.5, d / 2 + vd + 0.23, 2.2, 0.04, 0.03, CN.gold);
  }
}

// ---------------------------------------------------------------------
//  Water-town edge: the town meets the river by design
// ---------------------------------------------------------------------
// Detects the water side from local samples and builds an embankment, a
// landing stair, a jetty with a moored boat edge, and willows.
function cnWaterfrontLocal(a, lod) {
  // Probe the compass for the nearest open water within the teahouse frontage.
  let best = null;
  for (let k = 0; k < 16; k++) {
    const ang = (k / 16) * Math.PI * 2;
    const dx = Math.cos(ang), dz = Math.sin(ang);
    for (let dd = 8; dd <= 30; dd += 2) {
      const s = sample(a.x + dx * dd, a.z + dz * dd, {});
      if (s.waterLevel !== null && !s.paddy && s.waterLevel > s.h - 2.5) {
        if (!best || dd < best.d) best = { d: dd, ang, level: s.waterLevel, drop: Math.max(1.0, s.waterLevel - s.h) };
        break;
      }
    }
  }
  if (!best || best.d > 28) return null;
  // Build in a local frame whose +Z faces the water.  The anchor yaw rotates
  // world +X toward the water, so back out the frame angle from the direction
  // vector rather than passing a bare angle to atan2.
  const yaw = a.yaw + Math.atan2(Math.sin(best.ang), Math.cos(best.ang)) - Math.PI / 2;
  const drop = clamp(best.drop, 0.8, 4.0);
  const side = 1;
  kit.push(a.x, a.h, a.z, yaw);
  // Embankment runs along the waterline, facing the water.
  chineseEmbankmentLocal(24, side, drop, { depth: 1.9 });
  // Landing steps and a jetty, offset from each other along the frontage.
  kit.push(-6.5, 0, 0); chineseWaterStepsLocal(side, drop, 5); kit.pop();
  kit.push(7.5, 0, 0); chineseJettyLocal(6.0, side, drop, { width: 2.0 }); kit.pop();
  // Moored boat edge: a low punt alongside the jetty, plus a mooring post.
  if (lod < 3) {
    kit.push(9.4, -drop * 0.4 + 0.1, side * 5.4, 0.12);
    kit.box('solid', 0, -0.32, 0, 1.5, 0.5, 4.6, CN.woodDark);
    kit.box('solid', 0, -0.05, 0, 1.2, 0.14, 4.2, CN.wood);
    kit.box('solid', 0, 0.22, -1.6, 1.3, 0.5, 0.24, CN.wood);
    kit.box('solid', 0, 0.85, 1.4, 0.09, 1.6, 0.09, CN.wood);
    kit.pop();
  }
  kit.pop();
  // Willows along the waterline.  willow() places in world space, so compute
  // each world position from the compound frame and call it outside the push.
  if (lod < 2) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    for (const [lx, sc] of [[-10.5, 0.95], [-2.0, 0.8], [3.4, 1.05], [13.5, 0.85]]) {
      const wx = a.x + cy * lx + sy * 0.5, wz = a.z - sy * lx + cy * 0.5;
      willow(wx, wz, a.seed + Math.round(lx * 10) + Math.round(sc * 100), a.h + 0.1);
    }
  }
  return { dist: best.d, drop, yaw };
}

// ---------------------------------------------------------------------
//  Structure dispatch
// ---------------------------------------------------------------------
function buildShanshuiStructure(a, lod) {
  if (!['changan', 'palace', 'chineseTeahouse', 'monastery', 'paifang', 'waterPavilion', 'terraceFarm', 'mountainPavilion'].includes(a.type)) return false;
  const previous = kit.detail; kit.detail = lod === 0 ? 1 : lod === 1 ? 0.45 : 0.25;
  switch (a.type) {
    case 'palace': kit.push(a.x, a.h, a.z, a.yaw); cnPalaceLocal(a, lod); kit.pop(); break;
    case 'chineseTeahouse': {
      kit.push(a.x, a.h, a.z, a.yaw); cnTeahouseLocal(a, lod); kit.pop();
      // A teahouse always faces water: give it the full waterside frontage.
      cnWaterfrontLocal(a, lod);
      break;
    }
    case 'changan': kit.push(a.x, a.h, a.z, a.yaw); cnChanganLocal(a, lod); kit.pop(); break;
    case 'monastery': cnMonasteryLocal(a, lod); break;
    case 'paifang': kit.push(a.x, a.h, a.z, a.yaw); cnPaifangStopLocal(a, lod); kit.pop(); break;
    case 'mountainPavilion': cnMountainPavilionLocal(a, lod); break;
    case 'waterPavilion': cnWaterPavilionLocal(a, lod); break;
    case 'terraceFarm': cnTerraceFarmLocal(a, lod); break;
  }
  kit.detail = previous;
  return true;
}

// A hillside monastery: walled court, tall hall on the axis, gate paifang,
// two low side halls, and a paved processional spine.
function cnMonasteryLocal(a, lod) {
  const seed = a.seed;
  kit.push(a.x, a.h, a.z, a.yaw);
  chineseWallLocal(34, 34, 2.4, true);
  kit.box('solid', 0, 0.05, 0, 26, 0.1, 28, CN.courtWarm);       // courtyard earth
  cnAxisPaving(2.6, -14, 14, { seed, tone: CN.court });           // paved spine
  // Main hall on the axis, raised on a stone terrace.
  kit.box('solid', 0, 0.34, -7, 21, 0.7, 13, CN.plinthDark);
  kit.push(0, 0.62, -7); chineseHallLocal(17, 9, 4.2, true); kit.pop();
  // Front gate paifang and its threshold.
  kit.push(0, 0, 15.5); chinesePaifangLocal(0.8); kit.pop();
  // Two low side halls, turned to face the courtyard's centre.
  for (const sx of [-1, 1]) {
    kit.push(sx * 12.5, 0, 2, Math.PI / 2);
    chineseHallLocal(12, 4.6, 2.8, false, true, { gold: false });
    kit.pop();
    // Bell and drum pavilions, symmetric about the axis.
    if (lod < 2) { kit.push(sx * 8.6, 0, 10); chinesePavilionLocal(0.5); kit.pop(); }
  }
  // Incense burner on the axis, between gate and hall.
  kit.box('solid', 0, 0.55, 5, 1.9, 1.1, 1.9, CN.plinthDark);
  kit.box('metal', 0, 1.35, 5, 1.2, 0.6, 1.2, C(0x637973));
  if (kit.detail > 0.3 && lod < 3) chineseLantern(0, 1.9, 5, 0.7, 1.1);
  // Cliff pines inside the court, deliberately placed, not scattered.
  if (lod < 2) {
    for (const [px, pz, sc] of [[-10, -12, 0.85], [10.5, -13, 1.0]]) {
      kit.push(px, 0, pz); chinesePineLocal(sc, seed + px, lod); kit.pop();
    }
  }
  kit.pop();
}

// A roadside paifang: the arch plus a short paved approach that makes it read
// as a threshold on a road rather than an isolated prop.
function cnPaifangStopLocal(a, lod) {
  chinesePaifangLocal(1.0);
  const len = 18, step = 2.4;
  for (let z = -len / 2; z < len / 2; z += step) {
    const j = h2(Math.round(z * 8), a.seed, SALT[60]);
    kit.box('solid', (j - 0.5) * 0.14, 0.06, z + step / 2, 4.0, 0.12, step + 0.05, CN.court.clone().multiplyScalar(0.92 + j * 0.14));
  }
  if (kit.detail > 0.3) for (const sx of [-1, 1]) {
    kit.box('solid', sx * 2.5, 0.7, len / 2 + 0.6, 1.4, 0.3, 1.0, CN.plinthDark);
    kit.box('solid', sx * 2.5, 1.15, len / 2 + 0.6, 0.24, 1.0, 0.24, CN.wood);
  }
}

// Mountain pavilion: a lookout terrace with a pine and a stone-paved approach.
function cnMountainPavilionLocal(a, lod) {
  kit.push(a.x, a.h, a.z, a.yaw);
  chinesePavilionLocal(1.0);
  if (kit.detail > 0.3) {
    // Stone lip of the terrace, anchoring the pavilion to the ridge.
    for (const sz of [-1, 1]) kit.box('solid', 0, -0.05, sz * 3.5, 7.4, 0.5, 1.0, CN.plinthDark);
    for (const sx of [-1, 1]) kit.box('solid', sx * 3.5, -0.05, 0, 1.0, 0.5, 6.4, CN.plinthDark);
    // A few roughly-set approach steps.
    for (let i = 0; i < 5; i++) kit.box('solid', (h2(i, a.seed, 44) - 0.5) * 0.3, -0.1 - i * 0.16, 5.2 + i * 0.8, 2.0 - i * 0.1, 0.26, 0.9, i % 2 ? CN.plinth : CN.stone);
  }
  if (lod < 3) { kit.push(-6.2, 0, -2); chinesePineLocal(0.9, a.seed, lod); kit.pop(); }
  kit.pop();
}

// Water pavilion: an open kiosk over the lake, on piles, with a jetty and a
// stone bridge stub reaching the shore.
function cnWaterPavilionLocal(a, lod) {
  const water = a.r === 0;
  kit.push(a.x, a.h, a.z, a.yaw);
  chinesePavilionLocal(1.0, water);
  if (water && lod < 2) {
    // A short jetty and a stepping-stone line toward the nearest shore.
    kit.box('solid', 0, 0.4, 6.4, 2.1, 0.22, 7.5, CN.wood);
    for (const sx of [-1, 1]) kit.box('solid', sx * 0.95, 1.0, 6.4, 0.09, 0.1, 7.5, CN.woodDark);
    for (let i = 1; i <= 4; i++) {
      const s = sample(a.x, a.z + 10 + i * 2.0, {});
      if (s.waterLevel === null) break;
      kit.box('solid', (h2(i, a.seed, 71) - 0.5) * 0.6, s.waterLevel + 0.1, 10 + i * 2.0, 1.1, 0.3, 1.0, CN.plinth);
    }
  }
  kit.pop();
}

// Terrace farmstead: a courtyard of farm buildings set on the terrace, with a
// threshing floor, a well and a peach tree at the wall.
function cnTerraceFarmLocal(a, lod) {
  const seed = a.seed;
  kit.push(a.x, a.h, a.z, a.yaw);
  // Packed-earth threshing floor — the courtyard's working surface.
  kit.box('solid', 0, 0.04, 0, 22, 0.09, 18, CN.courtWarm);
  // Low boundary wall with a gate, keeping the farmstead legible as a place.
  cnCourtyard(19, 15, { wallH: 2.0, gap: 3.0 });
  // Main dwelling, set back on the axis.
  kit.push(-1.5, 0, -3.0); chineseHallLocal(10.5, 6.4, 2.8, false, false, { gold: false }); kit.pop();
  // Barn, turned across the courtyard, roofed in thatch tones.
  kit.push(6.5, 0, 2.5, Math.PI / 2);
  chineseHallLocal(7.4, 5.0, 2.5, false, true, { gold: false });
  kit.pop();
  // Well and a small millstone.
  kit.box('solid', -5.0, 0.5, 4.0, 1.5, 1.0, 1.5, CN.plinthDark);
  kit.box('solid', -5.0, 1.06, 4.0, 1.1, 0.14, 1.1, C(0x3a4644));
  kit.box('solid', 3.2, 0.2, 5.6, 1.5, 0.34, 1.5, CN.stone);
  // Peach at the wall and a path lantern by the gate.
  if (lod < 2) {
    kit.push(-7.0, 0, -4.5); chinesePeachLocal(0.8, seed, lod); kit.pop();
    chineseLantern(1.2, 2.0, 7.0, 0.7, 0.8);
  }
  kit.pop();
}
