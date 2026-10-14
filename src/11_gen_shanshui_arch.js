// Chinese architectural asset library. Built from the shared instancing kit;
// distant forms retain their footprint, eaves and roof colour.
//
// Visual language: ink-and-mineral painting. Restrained mineral pigments —
// slate-grey tiles, ochre plaster, vermilion lacquer accents, jade eaves and
// weathered stone — never a saturated toy palette. Every hall sits on a raised
// masonry plinth so buildings settle into the ground instead of floating on it.
const CN = {
  red: C(0xa73d2d), redDark: C(0x6f2926), wall: C(0xe2dac8), wallShade: C(0xcec5b0),
  ink: C(0x343d3f), tile: C(0x424e54), tileDeep: C(0x333c42),
  stone: C(0xaaa69a), stoneDark: C(0x777b76), stoneLight: C(0xc4bfb2),
  wood: C(0x554338), woodDark: C(0x3a2b22), jade: C(0x6e837d),
  gold: C(0xc8ac63), goldDim: C(0xa98a47), ochre: C(0xc09b56),
  plinth: C(0x8f8a80), plinthDark: C(0x6a675f), plinthTop: C(0xb3aea3),
  court: C(0x9c968b), courtDark: C(0x817d76), courtWarm: C(0xa89a83),
  bank: C(0x83807a), bankWet: C(0x5f625f),
};

// Roof: civilian buildings stay grey-slate; only ceremonial halls take gold.
function chineseRoof(y, w, d, o = {}) {
  const close = kit.detail > 0.6;
  return roof(y, w, d, {
    type: o.pavilion ? 'pyramid' : 'hip', layers: close ? 9 : kit.detail > 0.3 ? 5 : 3, shift: o.shift || 0,
    over: o.over || 1.0, rise: o.rise || d * 0.32,
    upturn: o.upturn === undefined ? (close ? 0.85 : 0.65) : o.upturn,
    col: o.gold ? CN.goldDim : CN.tile, colB: o.gold ? C(0x92783f) : CN.tileDeep,
    edge: o.gold ? C(0xc5ac64) : CN.jade, ridgeCol: o.gold ? CN.gold : CN.ink,
    tileEnds: close, hips: close, rafters: close, rafterCol: CN.redDark,
    ridge: !o.pavilion, curve: 1.8,
  });
}

function chineseLantern(x, y, z, s = 1, light = 0.8) {
  kit.box('solid', x, y + s * 0.55, z, 0.025, s * 0.55, 0.025, CN.wood);
  kit.box('glow', x, y, z, s * 0.5, s * 0.68, s * 0.5, C(0xe59b61));
  if (kit.detail > 0.6) kit.box('glow', x, y, z, s * 0.45, s * 0.62, s * 0.45, C(0xe8ad75), 0, Math.PI / 4, 0);
  for (const dy of [-0.36, 0.36]) kit.box('solid', x, y + s * dy, z, s * 0.45, s * 0.08, s * 0.45, CN.redDark);
  if (kit.detail > 0.3) kit.box('solid', x, y - s * 0.56, z, s * 0.045, s * 0.34, s * 0.045, CN.red);
  if (light) kit.light(x, y, z, light);
}

// A raised masonry plinth shared by every hall. Two courses read as a stone
// base at any distance and give the silhouette a stable foot.
function chinesePlinthLocal(w, d, h = 2.0) {
  kit.box('solid', 0, -h * 0.5 + 0.12, 0, w, h, d, CN.plinthDark);
  kit.box('solid', 0, 0.16, 0, w - 0.5, 0.24, d - 0.5, CN.plinth);
  if (kit.detail > 0.3) kit.box('solid', 0, 0.30, 0, w - 1.1, 0.1, d - 1.1, CN.plinthTop);
}

// Single-storey hall in local coordinates. `ornate` adds dou-gong brackets, red
// columns and a golden roof; civilian halls keep grey tiles and timber columns.
function chineseHallLocal(w, d, h = 3.4, ornate = false, open = false, roofStyle = {}) {
  chinesePlinthLocal(w + 1.8, d + 1.8, 1.0);
  if (!open) {
    kit.box('solid', 0, 0.5 + h / 2, -d * 0.18, w - 0.4, h, d * 0.62, ornate ? CN.redDark : CN.wall);
    for (const sx of [-1, 1]) kit.box('solid', sx * (w / 2 - 0.12), 0.5 + h / 2, 0, 0.22, h, d, CN.wall);
    kit.box('solid', 0, 0.5 + h / 2, d / 2 - 0.1, w - 0.2, h, 0.15, CN.wood);
    // Bay rhythm: a dark doorway on the axis, warm lattice windows either side.
    const bays = Math.max(3, Math.round(w / 2.3));
    for (let i = 0; i < bays; i++) {
      const x = -w / 2 + w * (i + 0.5) / bays, bw = w / bays - 0.28;
      const door = i === Math.floor(bays / 2);
      kit.box(door ? 'solid' : 'glow', x, door ? 1.4 : 2.0, d / 2 + 0.025, bw * 0.8, door ? 2.1 : 1.55, 0.05, door ? C(0x272623) : C(0xdec59a));
      if (!door && kit.detail > 0.6) {
        for (const dir of [-1, 1]) kit.beam('solid', x - bw * 0.34, dir > 0 ? 1.3 : 2.7, d / 2 + 0.06, x + bw * 0.34, dir > 0 ? 2.7 : 1.3, d / 2 + 0.06, 0.04, 0.045, CN.wood);
        kit.box('solid', x, 2.0, d / 2 + 0.09, bw * 0.8, 0.07, 0.04, CN.wood);
      }
    }
  }
  const count = kit.detail > 0.3 ? Math.max(3, Math.round(w / 2.6)) : 2;
  for (let i = 0; i <= count; i++) for (const sz of [-1, 1]) {
    const x = -w / 2 + w * i / count, z = sz * (d / 2 + 0.28);
    kit.box('lacquer', x, 0.5 + h / 2, z, 0.26, h, 0.26, ornate ? CN.red : CN.wood);
    if (kit.detail > 0.6 && ornate) {
      // Dou-gong brackets: three nested timber arms beneath the eaves.
      for (let tier = 0; tier < 3; tier++) kit.box('solid', x, h + 0.15 + tier * 0.12, z, 0.5 + tier * 0.25, 0.12, 0.44 + tier * 0.22, tier % 2 ? CN.redDark : CN.red);
    }
  }
  kit.box('solid', 0, h + 0.5, 0, w + 0.7, 0.3, d + 0.9, ornate ? CN.redDark : CN.wood);
  return roofStyle.skip ? h + 0.62 : chineseRoof(h + 0.62, w, d, { gold: roofStyle.gold === undefined ? ornate : roofStyle.gold });
}

// Courtyard wall with tiled coping — used to enclose ward plots and compounds.
function chineseCourtWallLocal(w, d, h = 2.4, o = {}) {
  const gap = o.gap === undefined ? 3.4 : o.gap;
  const t = 0.34;
  const seg = (x, z, sx, sz, len, along) => {
    kit.box('solid', x, h / 2, z, along ? len : t, h, along ? t : len, CN.wallShade);
    kit.box('solid', x, h + 0.16, z, along ? len + 0.3 : t + 0.5, 0.22, along ? t + 0.5 : len + 0.3, CN.tileDeep);
  };
  // North and south walls run full width; the south wall is pierced by a gate.
  seg(0, -d / 2, 1, 0, w, true);
  seg(-(w / 2 + gap / 2) / 2 - 0, d / 2, 1, 0, Math.max(0.5, w / 2 - gap / 2), true);
  seg((w / 2 + gap / 2) / 2, d / 2, 1, 0, Math.max(0.5, w / 2 - gap / 2), true);
  for (const sx of [-1, 1]) seg(sx * w / 2, 0, 0, 1, d, false);
  // The gate itself: two posts and a low tiled lintel.
  for (const sx of [-1, 1]) kit.box('lacquer', sx * gap / 2, h * 0.62, d / 2, 0.3, h * 1.24, 0.34, CN.redDark);
  kit.box('solid', 0, h * 1.24 + 0.2, d / 2, gap + 1.2, 0.32, 0.5, CN.tileDeep);
  if (kit.detail > 0.3) chineseRoof(h * 1.24 + 0.36, gap + 1.6, 1.1, { gold: false, rise: 0.5, over: 0.45, upturn: 0.3 });
}

// Two-storey merchant house / shop fronting a ward street.
function chineseHouse(x, y, z, yaw, type, w, d, seed, glow = true) {
  const shop = type === 'shop' || type === 'machiya', rng = mulberry32(seed);
  const twoStorey = shop && rng() < (type === 'shop' ? 0.36 : 0.62);
  kit.push(x, y, z, yaw);
  const h = type === 'kura' ? 3.4 : shop ? 2.95 : 2.7;
  chineseHallLocal(w, d, h, shop, false, { gold: false, skip: twoStorey });
  if (twoStorey) {
    const floor = h + 0.58;
    kit.push(0, floor, -0.3); chineseHallLocal(w - 0.2, d - 0.6, 2.35, false, false, { gold: false }); kit.pop();
    // A narrow tiled awning separates the shopfront from the upper storey.
    chineseRoof(h + 0.35, w + 0.3, 1.1, { gold: false, shift: d / 2 + 0.35, over: 0.35, rise: 0.45, upturn: 0.22 });
  }
  if (shop && kit.detail > 0.3) {
    kit.box('solid', 0, h - 0.15, d / 2 + 0.35, w * 0.48, 0.55, 0.14, CN.ink);
    kit.box('metal', 0, h + 0.1, d / 2 + 0.43, w * 0.46, 0.04, 0.04, CN.gold);
    for (const sx of [-1, 1]) chineseLantern(sx * w * 0.38, 2.4, d / 2 + 0.75, 0.8, glow && sx < 0 ? 0.9 : 0);
  } else if (kit.detail > 0.3 && glow) chineseLantern(w * 0.35, 2.3, d / 2 + 0.6, 0.65, 0.65);
  if (kit.detail > 0.6 && type === 'thatch') {
    const p = kit.world(-w * 0.3, h + d * 0.3, -d / 4); kit.spot('smoke', ...p);
    for (let i = 0; i < 3; i++) kit.box('solid', -w / 2 - 0.5, 0.3 + i * 0.25, -1.2, 0.75, 0.25, 1.3, COL.woodLight);
  }
  kit.pop();
}

function chinesePaifangLocal(k = 1) {
  for (const sx of [-1, -0.35, 0.35, 1]) {
    kit.box('solid', sx * 4.7 * k, 0.18, 0, 0.8 * k, 0.36, 0.8 * k, CN.stoneDark);
    kit.box('lacquer', sx * 4.7 * k, 2.4 * k, 0, 0.38 * k, 4.8 * k, 0.38 * k, CN.red);
  }
  kit.box('lacquer', 0, 3.7 * k, 0, 10.2 * k, 0.42 * k, 0.4 * k, CN.redDark);
  kit.box('lacquer', 0, 4.4 * k, 0, 10.2 * k, 0.32 * k, 0.4 * k, CN.red);
  for (const sx of [-1, 0, 1]) {
    kit.push(sx * 3.6 * k, sx === 0 ? 0.45 * k : 0, 0, 0);
    chineseRoof(4.55 * k, (sx === 0 ? 4.5 : 2.8) * k, 1.2 * k, { rise: 1.25 * k, over: 0.6 * k });
    kit.pop();
  }
  kit.box('solid', 0, 4.15 * k, 0.28 * k, 2.1 * k, 0.58 * k, 0.12, CN.ink);
  if (kit.detail > 0.3) for (const sx of [-1, 1]) chineseLantern(sx * 2.8 * k, 3.35 * k, 0, 0.8 * k, sx < 0 ? 1 : 0);
}

// Open pavilion: a stone terrace under a pyramid roof, optionally on piles.
function chinesePavilionLocal(k = 1, water = false) {
  kit.box('solid', 0, 0.2, 0, 6.6 * k, 0.4, 6.6 * k, CN.plinthDark);
  kit.box('solid', 0, 0.47, 0, 6.2 * k, 0.15, 6.2 * k, CN.plinth);
  if (water) for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box('solid', sx * 2.4 * k, -1.7, sz * 2.4 * k, 0.38, 4, 0.38, CN.wood);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box('lacquer', sx * 2.25 * k, 2.0 * k, sz * 2.25 * k, 0.26 * k, 3.2 * k, 0.26 * k, CN.red);
  // Low balustrade so the pavilion reads as a place to sit and look out.
  if (kit.detail > 0.3) {
    for (const sz of [-1, 1]) {
      kit.box('solid', 0, 1.15 * k, sz * 2.7 * k, 5.5 * k, 0.12, 0.12, CN.wood);
      kit.box('solid', 0, 0.78 * k, sz * 2.7 * k, 5.5 * k, 0.08, 0.1, CN.wood);
    }
    kit.box('solid', -2.7 * k, 1.15 * k, 0, 0.12, 0.12, 5.5 * k, CN.wood);
    kit.box('solid', -2.7 * k, 0.78 * k, 0, 0.1, 0.08, 5.5 * k, CN.wood);
  }
  const top = chineseRoof(3.65 * k, 4.5 * k, 4.5 * k, { pavilion: true, rise: 2.1 * k, over: 1.15 * k });
  kit.box('metal', 0, top + 0.3, 0, 0.35, 0.6, 0.35, CN.gold);
  if (kit.detail > 0.3) chineseLantern(0, 2.9 * k, 0, 0.7, 1.2);
}

// Battlemented enclosure wall. `gate` opens the south face for compounds.
function chineseWallLocal(w, d, h = 3.8, gate = false) {
  for (const sx of [-1, 1]) kit.box('solid', sx * w / 2, h / 2, 0, 1.4, h, d, CN.stoneDark);
  kit.box('solid', 0, h / 2, -d / 2, w, h, 1.4, CN.stoneDark);
  if (gate) {
    const g = 5.6, seg = Math.max(0.6, (w - g) / 2);
    for (const sx of [-1, 1]) kit.box('solid', sx * (g + seg) / 2, h / 2, d / 2, seg, h, 1.4, CN.stoneDark);
  } else for (const sx of [-1, 1]) kit.box('solid', sx * (w * 0.3), h / 2, d / 2, w * 0.4, h, 1.4, CN.stoneDark);
  if (kit.detail > 0.3) {
    for (let x = -w / 2; x <= w / 2; x += 3) {
      kit.box('solid', x, h + 0.35, -d / 2, 1.2, 0.7, 1.45, CN.stone);
      if (!(gate && Math.abs(x) < 3.2)) kit.box('solid', x, h + 0.35, d / 2, 1.2, 0.7, 1.45, CN.stone);
    }
  }
}

function shanshuiStation(x, y, z, yaw) {
  kit.push(x, y, z, yaw);
  kit.box('solid', 0, 0.45, 3.4, 30, 0.9, 3.6, CN.plinthDark);
  kit.push(0, 0.9, 4.5, 0); chineseHallLocal(23, 3.0, 3.0, false, true); kit.pop();
  if (kit.detail > 0.3) for (const lx of [-8, 0, 8]) chineseLantern(lx, 3.0, 2.4, 0.8, lx === 0 ? 1.2 : 0);
  kit.pop();
}

function chinesePathLantern(x, z, yaw = 0, k = 1, y = G(x, z)) {
  kit.push(x, y, z, yaw);
  kit.box('solid', 0, 1.4 * k, 0, 0.15, 2.8 * k, 0.15, CN.wood);
  kit.box('solid', 0.35 * k, 2.8 * k, 0, 0.9 * k, 0.12, 0.12, CN.wood);
  chineseLantern(0.7 * k, 2.2 * k, 0, 0.85 * k, 0.8);
  kit.pop();
}

// Stone embankment along a waterside frontage: coursed blocks stepping down to
// the water with a landing stair, so a town meets the river by design.
function chineseEmbankmentLocal(len, side, drop, o = {}) {
  const step = o.step || 3.2, depth = o.depth || 1.8;
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + len * (i + 0.5) / n;
    const jitter = (h2(Math.round(x * 4), side, SALT ? SALT[60] : 60) - 0.5) * 0.14;
    // Two courses of ashlar facing the water.
    kit.box('solid', x, -drop * 0.5 + jitter, side * depth * 0.5, len / n - 0.1, drop, depth, CN.bank);
    if (kit.detail > 0.3) kit.box('solid', x, 0.12, side * (depth * 0.5 + 0.1), len / n - 0.1, 0.26, depth + 0.4, CN.plinth);
    if (kit.detail > 0.6 && i % 2 === 0) kit.box('solid', x, -drop - 0.24 + jitter, side * (depth * 0.5 + 0.25), len / n - 0.2, 0.5, 0.6, CN.bankWet);
  }
  return { n, step: len / n };
}

// A flight of stone steps down to the water — the water-town threshold.
function chineseWaterStepsLocal(side, drop, steps = 5) {
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    kit.box('solid', 0, -drop * t, side * (0.6 + t * 1.5), 2.6 - t * 0.4, Math.max(0.3, drop / steps + 0.08), 1.7, i % 2 ? CN.plinth : CN.stone);
  }
  if (kit.detail > 0.3) for (const sx of [-1, 1]) {
    kit.box('solid', sx * 1.5, 0.34, side * 0.4, 0.3, 0.8, 0.9, CN.plinthTop);
  }
}

// Trestle jetty reaching into the water, moored-boat edge at its end.
function chineseJettyLocal(len, side, drop, o = {}) {
  const width = o.width || 1.9;
  kit.box('solid', 0, -drop * 0.4, side * len * 0.5, width, 0.22, len, CN.wood);
  const piles = Math.max(2, Math.round(len / 2.2));
  for (let i = 0; i <= piles; i++) {
    const z = side * len * (i / piles);
    for (const sx of [-1, 1]) kit.box('solid', sx * width * 0.42, -drop * 0.4 - 1.1, z, 0.22, 2.2, 0.22, CN.woodDark);
  }
  if (kit.detail > 0.3) for (const sx of [-1, 1]) {
    kit.box('solid', sx * width * 0.5, -drop * 0.4 + 0.4, side * (len - 0.6), 0.14, 1.0, 0.14, CN.wood);
    kit.box('solid', sx * width * 0.34, -drop * 0.4 + 0.9, side * len * 0.5, 0.1, 0.1, len - 0.5, CN.wood);
  }
}
