// ---------------------------------------------------------------------
//  Kit: collects instanced cube transforms per material bucket
// ---------------------------------------------------------------------
class FBuf {
  constructor(n = 1024) { this.a = new Float32Array(n); this.n = 0; }
  grow(k) { if (this.n + k > this.a.length) { const b = new Float32Array(Math.max(this.a.length * 2, this.n + k)); b.set(this.a.subarray(0, this.n)); this.a = b; } }
  push(arr, k) { this.grow(k); for (let i = 0; i < k; i++) this.a[this.n++] = arr[i]; }
  push3(a, b, c) { this.grow(3); this.a[this.n++] = a; this.a[this.n++] = b; this.a[this.n++] = c; }
  out() { return this.a.slice(0, this.n); }
}
const _hc = new Col();
const colOf = (c) => (typeof c === 'number' ? _hc.setHex(c) : c);
const QI = [0, 0, 0, 1];
class Kit {
  constructor() { this.reset(); }
  reset() {
    this.b = {}; this.F = m4I(); this.stack = []; this.loc = new Float64Array(16); this.wm = new Float64Array(16);
    this.lights = new FBuf(64); this.spots = { petal: new FBuf(64), smoke: new FBuf(16), fly: new FBuf(64) };
    this.G = (x, z) => 0; this.detail = 1;
  }
  bucket(n) { return this.b[n] || (this.b[n] = { m: new FBuf(16 * 256), c: new FBuf(3 * 256) }); }
  push(x, y, z, yaw = 0) {
    this.stack.push(this.F);
    const r = m4I(), c = Math.cos(yaw), s = Math.sin(yaw);
    r[0] = c; r[2] = -s; r[8] = s; r[10] = c; r[12] = x; r[13] = y; r[14] = z;
    this.F = m4Mul(this.F, r, new Float64Array(16));
  }
  pop() { this.F = this.stack.pop(); }
  _emit(mat, m, col) {
    const B = this.bucket(mat), c = colOf(col);
    B.m.push(m, 16); B.c.push3(c.r, c.g, c.b);
  }
  box(mat, x, y, z, sx, sy, sz, col, rx = 0, ry = 0, rz = 0) {
    const q = (rx || ry || rz) ? qEuler(rx, ry, rz) : QI;
    m4Compose(this.loc, x, y, z, q, sx, sy, sz);
    this._emit(mat, m4Mul(this.F, this.loc, this.wm), col);
  }
  beam(mat, ax, ay, az, bx, by, bz, tx, tz, col, roll = 0) {
    const d = new V3(bx - ax, by - ay, bz - az), L = d.length(); d.multiplyScalar(1 / (L || 1));
    let q = qUnit(UP, d);
    if (roll) q = qMul(q, qAxis(0, 1, 0, roll));
    m4Compose(this.loc, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, q, tx, L, tz);
    this._emit(mat, m4Mul(this.F, this.loc, this.wm), col);
  }
  boxW(mat, p, q, sx, sy, sz, col) {
    m4Compose(this.wm, p.x, p.y, p.z, q, sx, sy, sz);
    this._emit(mat, this.wm, col);
  }
  world(x, y, z) {
    const F = this.F;
    return [F[0] * x + F[4] * y + F[8] * z + F[12], F[1] * x + F[5] * y + F[9] * z + F[13], F[2] * x + F[6] * y + F[10] * z + F[14]];
  }
  light(x, y, z, i = 1, warm = 1) { const p = this.world(x, y, z); this.lights.push3(p[0], p[1], p[2]); this.lights.push3(i, warm, 0); }
  spot(kind, x, y, z) { this.spots[kind].push3(x, y, z); }
}
const kit = new Kit();
const G = (x, z) => kit.G(x, z);

const COL = {
  wood: C(0x5a3f2f), woodDark: C(0x35271e), woodLight: C(0x8d6d50), cedar: C(0x7b5b41), deck: C(0x8a6a4c),
  shu: C(0xcc4a2e), shuDark: C(0x9b3424), plaster: C(0xe6dfcf), plasterShade: C(0xcfc6b2),
  tile: C(0x3e444d), tileB: C(0x363b43), tileEdge: C(0x59606a), tileDark: C(0x2a2e34),
  thatch: C(0x8c7049), thatchB: C(0x7a6040), thatchTop: C(0x4f3f2c),
  stone: C(0x8e8a82), stoneDark: C(0x67645e), stoneLight: C(0xa9a59b), moss: C(0x56693c),
  copper: C(0x5c9784), copperB: C(0x518876), gold: C(0xc8a14c), black: C(0x22201e),
  paper: C(0xf3e6cb), lanternRed: C(0xd2553a), rope: C(0xcdb27b), felt: C(0xb83b30), indigo: C(0x2c3b5c), white: C(0xf2f0ea),
  pineDark: C(0x2f4a33), pine: C(0x3c5a3a), steel: C(0x55585c), interior: C(0x1e1915),
};

// ---------------------------------------------------------------------
//  Architectural parts (kit-local coordinates)
// ---------------------------------------------------------------------
function wallPiece(mat, ox, oz, ax, az, nx, nz, s, along, y, h, off, thick, col) {
  const x = ox + ax * s + nx * off, z = oz + az * s + nz * off;
  if (Math.abs(ax) > 0.5) kit.box(mat, x, y, z, along, h, thick, col);
  else kit.box(mat, x, y, z, thick, h, along, col);
}
function fillBay(type, ox, oz, ax, az, nx, nz, s, bw, y0, h, o = {}) {
  const W = bw - 0.18;
  const wp = (mat, sOff, al, y, hh, off, th, col) => wallPiece(mat, ox, oz, ax, az, nx, nz, s + sOff, al, y, hh, off, th, col);
  const frame = o.frame || COL.woodDark;
  const lite = kit.detail < 0.6;
  if (type === 'plaster') wp('solid', 0, W, y0 + h / 2, h, 0, 0.16, o.wall || COL.plaster);
  else if (type === 'wood') {
    wp('solid', 0, W, y0 + h / 2, h, 0, 0.16, o.plank || COL.wood);
    if (!lite) for (let k = 1; k < 4; k++) wp('solid', 0, W, y0 + h * k / 4, 0.05, 0.09, 0.05, COL.woodDark);
  } else if (type === 'shoji') {
    const kh = 0.55;
    wp('solid', 0, W, y0 + kh / 2, kh, 0.0, 0.16, COL.wood);
    const ph = h - kh;
    wp('glow', 0, W, y0 + kh + ph / 2, ph, -0.02, 0.06, o.paper || COL.paper);
    if (!lite) {
      const nv = Math.max(2, Math.round(W / 0.4)), nh = Math.max(2, Math.round(ph / 0.45));
      for (let i = 0; i <= nv; i++) wp('solid', -W / 2 + (W * i) / nv, 0.055, y0 + kh + ph / 2, ph, 0.04, 0.06, frame);
      for (let j = 1; j < nh; j++) wp('solid', 0, W, y0 + kh + (ph * j) / nh, 0.05, 0.04, 0.06, frame);
    }
  } else if (type === 'koshi') {
    wp('glow', 0, W, y0 + h / 2, h, -0.04, 0.05, o.paper || COL.paper);
    const n = Math.max(3, Math.round(W / (lite ? 0.3 : 0.16)));
    for (let i = 0; i <= n; i++) wp('solid', -W / 2 + (W * i) / n, 0.06, y0 + h / 2, h, 0.05, 0.07, COL.woodDark);
    wp('solid', 0, W, y0 + h * 0.62, 0.06, 0.06, 0.08, COL.woodDark);
  } else if (type === 'door') {
    wp('solid', 0, W, y0 + h / 2, h, -0.1, 0.05, C(0x17130f));
    if (o.noren) for (let i = 0; i < 3; i++) wp('solid', -W / 2 + W * (i + 0.5) / 3, W / 3 - 0.05, y0 + h - 0.42, 0.78, 0.1, 0.03, o.noren);
  } else if (type === 'window') {
    wp('solid', 0, W, y0 + h * 0.2, h * 0.4, 0, 0.16, o.wall || COL.plaster);
    wp('solid', 0, W, y0 + h * 0.88, h * 0.24, 0, 0.16, o.wall || COL.plaster);
    const wy = y0 + h * 0.58, wh = h * 0.36;
    wp('solid', -W * 0.36, W * 0.28, wy, wh, 0, 0.16, o.wall || COL.plaster);
    wp('solid', W * 0.36, W * 0.28, wy, wh, 0, 0.16, o.wall || COL.plaster);
    wp('glow', 0, W * 0.44, wy, wh, -0.02, 0.06, o.paper || COL.paper);
    for (let i = 0; i <= 4; i++) wp('solid', -W * 0.22 + W * 0.11 * i, 0.05, wy, wh, 0.05, 0.05, COL.woodDark);
  }
}
function body(w, d, y0, h, o = {}) {
  const bay = o.bay || 1.8;
  const postC = o.post || COL.woodDark, postM = o.postMat || 'solid', ps = o.postSize || 0.24;
  const nxB = Math.max(1, Math.round(w / bay)), nzB = Math.max(1, Math.round(d / bay));
  const sides = [
    { name: 'front', ox: -w / 2, oz: d / 2, ax: 1, az: 0, nx: 0, nz: 1, L: w, n: nxB },
    { name: 'back', ox: w / 2, oz: -d / 2, ax: -1, az: 0, nx: 0, nz: -1, L: w, n: nxB },
    { name: 'left', ox: -w / 2, oz: -d / 2, ax: 0, az: 1, nx: -1, nz: 0, L: d, n: nzB },
    { name: 'right', ox: w / 2, oz: d / 2, ax: 0, az: -1, nx: 1, nz: 0, L: d, n: nzB },
  ];
  for (const S of sides) {
    for (let i = 0; i < S.n; i++) {
      const s0 = (S.L * i) / S.n;
      kit.box(postM, S.ox + S.ax * s0, y0 + h / 2, S.oz + S.az * s0, ps, h, ps, postC);
      const type = o.fill ? o.fill(S.name, i, S.n) : 'plaster';
      fillBay(type, S.ox, S.oz, S.ax, S.az, S.nx, S.nz, s0 + S.L / S.n / 2, S.L / S.n, y0, h - 0.3, o);
    }
    wallPiece(postM, S.ox, S.oz, S.ax, S.az, S.nx, S.nz, S.L / 2, S.L + 0.3, y0 + h - 0.15, 0.3, 0.02, 0.26, postC);
    wallPiece('solid', S.ox, S.oz, S.ax, S.az, S.nx, S.nz, S.L / 2, S.L + 0.2, y0 + 0.06, 0.12, 0.03, 0.24, COL.woodDark);
  }
  kit.box('solid', 0, y0 + h / 2, 0, w - 0.3, h - 0.1, d - 0.3, COL.interior);
}
function roof(y, w, d, o = {}) {
  const type = o.type || 'irimoya', n = o.layers || 10;
  const over = o.over !== undefined ? o.over : 0.9, rise = o.rise !== undefined ? o.rise : d * 0.45;
  const t = rise / n, W0 = w / 2 + over, D0 = d / 2 + over;
  const col = o.col || COL.tile, colB = o.colB || COL.tileB, edge = o.edge || COL.tileEdge, mat = o.mat || 'solid';
  const curve = o.curve || 1.7, sh = o.shift || 0;
  const ridgeMin = type === 'pyramid' ? 0.0 : Math.max(0.35, W0 - D0 * 0.95);
  const L = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1), g = 1 - Math.pow(1 - f, curve);
    const dz = Math.max(0.22, D0 * (1 - g * 0.96));
    let dx;
    if (type === 'gable') dx = W0;
    else if (type === 'irimoya') dx = Math.max(Math.max(ridgeMin, W0 - D0 * 0.5), W0 - (D0 - dz));
    else dx = Math.max(type === 'pyramid' ? dz : ridgeMin, W0 - (D0 - dz));
    const yy = y + i * t;
    L.push({ dx, dz, y: yy });
    const jit = o.rough ? (h2(i, n, 3) - 0.5) * 0.12 : 0;
    kit.box(mat, 0, yy + t / 2, sh, (dx + jit) * 2, t * 1.04, (dz + jit) * 2, i === 0 ? edge : (i % 2 ? colB : col));
  }
  const top = L[n - 1], ry = top.y + t;
  if (type === 'gable' || type === 'irimoya') {
    const gx = type === 'gable' ? w / 2 + 0.05 : top.dx - 0.25;
    for (let i = 0; i < n; i++) {
      const l = L[i];
      if (type === 'irimoya' && l.dx > gx + 0.3) continue;
      for (const sx of [-1, 1]) kit.box('solid', sx * gx, l.y - t * 0.1, sh, 0.12, t * 1.05, Math.max(0.1, l.dz * 2 - 0.6), o.gableCol || COL.plasterShade);
    }
    if (type === 'gable' && o.barge !== false) for (const sx of [-1, 1]) for (const sz of [-1, 1])
      kit.beam('solid', sx * (W0 + 0.04), y + 0.05, sh + sz * D0, sx * (W0 + 0.04), ry, sh + sz * 0.1, 0.12, 0.26, o.bargeCol || COL.woodDark);
  }
  if (o.ridge !== false) {
    const rl = type === 'pyramid' ? 0.6 : top.dx * 2 + 0.3;
    kit.box(mat, 0, ry + 0.12, sh, rl, 0.3, 0.42, o.ridgeCol || COL.tileDark);
    if (type !== 'pyramid') for (const sx of [-1, 1]) kit.box(mat, sx * (rl / 2), ry + 0.26, sh, 0.34, 0.58, 0.54, o.ridgeCol || COL.tileDark);
  }
  if (type !== 'gable' && o.hips !== false) {
    const step = Math.max(1, Math.floor(n / 4));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      let last = null;
      const maxI = type === 'irimoya' ? Math.floor(n * 0.55) : n - 1;
      for (let i = 0; i <= maxI; i += step) {
        const l = L[i], p = [sx * l.dx, l.y + t * 1.05, sh + sz * l.dz];
        if (last) kit.beam(mat, last[0], last[1], last[2], p[0], p[1], p[2], 0.2, 0.2, o.ridgeCol || COL.tileDark);
        last = p;
      }
    }
  }
  if (o.tileEnds !== false && kit.detail > 0.6) {
    const nx = Math.round((W0 * 2) / 0.36);
    for (let i = 0; i <= nx; i++) for (const sz of [-1, 1]) kit.box(mat, -W0 + (W0 * 2 * i) / nx, y + t * 0.45, sh + sz * (D0 + 0.05), 0.16, t * 0.9, 0.12, COL.tileDark);
    if (type !== 'gable') {
      const nz = Math.round((D0 * 2) / 0.36);
      for (let i = 0; i <= nz; i++) for (const sx of [-1, 1]) kit.box(mat, sx * (W0 + 0.05), y + t * 0.45, sh - D0 + (D0 * 2 * i) / nz, 0.12, t * 0.9, 0.16, COL.tileDark);
    }
  }
  if (o.upturn) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    kit.beam(mat, sx * (W0 - 0.9), y + t * 0.6, sh + sz * (D0 - 0.9), sx * (W0 + 0.28), y + t + o.upturn, sh + sz * (D0 + 0.28), 0.32, 0.32, edge);
    if (o.bells) kit.box('metal', sx * (W0 + 0.12), y - 0.25, sh + sz * (D0 + 0.12), 0.14, 0.28, 0.14, COL.gold);
  }
  if (o.rafters && kit.detail > 0.6) {
    const nr = Math.round((W0 * 2 - 0.6) / 0.45);
    for (let i = 0; i <= nr; i++) for (const sz of [-1, 1]) kit.box('solid', -W0 + 0.3 + ((W0 * 2 - 0.6) * i) / nr, y - 0.06, sh + sz * (d / 2 + over * 0.5), 0.1, 0.12, over * 0.95, o.rafterCol || COL.woodDark);
  }
  return ry;
}
function chochin(x, y, z, k = 1, col = COL.paper, light = 0) {
  kit.box('solid', x, y + 0.36 * k, z, 0.04, 0.5 * k, 0.04, COL.black);
  kit.box('glow', x, y, z, 0.34 * k, 0.48 * k, 0.34 * k, col);
  kit.box('solid', x, y + 0.26 * k, z, 0.26 * k, 0.06 * k, 0.26 * k, COL.black);
  kit.box('solid', x, y - 0.26 * k, z, 0.26 * k, 0.06 * k, 0.26 * k, COL.black);
  if (light) kit.light(x, y, z, light);
}
function stoneLantern(x, z, k = 1, yawR = 0, light = 0.7, style = 'kasuga', gy) {
  kit.push(x, gy !== undefined ? gy : G(x, z), z, yawR);
  const S = (mat, px, py, pz, sx, sy, sz, c, ry = 0) => kit.box(mat, px * k, py * k, pz * k, sx * k, sy * k, sz * k, c, 0, ry, 0);
  const st = COL.stone, sd = COL.stoneDark, sl = COL.stoneLight;
  if (style === 'yukimi') {
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.3; S('solid', Math.cos(a) * 0.42, 0.32, Math.sin(a) * 0.42, 0.16, 0.66, 0.16, sd); }
    S('solid', 0, 0.72, 0, 0.7, 0.16, 0.7, st);
    S('solid', 0, 1.0, 0, 0.5, 0.42, 0.5, sd);
    S('glow', 0, 1.0, 0, 0.36, 0.3, 0.52, COL.paper);
    S('solid', 0, 1.28, 0, 1.5, 0.14, 1.5, st, 0.785);
    S('solid', 0, 1.4, 0, 1.0, 0.14, 1.0, sl, 0.785);
    S('solid', 0, 1.52, 0, 0.5, 0.14, 0.5, st, 0.785);
    S('solid', 0, 1.68, 0, 0.2, 0.2, 0.2, sl);
    if (light) kit.light(0, 1.0 * k, 0, light);
  } else {
    S('solid', 0, 0.12, 0, 1.05, 0.24, 1.05, sd);
    S('solid', 0, 0.32, 0, 0.75, 0.16, 0.75, st);
    S('solid', 0, 0.95, 0, 0.32, 1.2, 0.32, st);
    S('solid', 0, 1.6, 0, 0.82, 0.18, 0.82, sl);
    for (const [px, pz] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) S('solid', px, 2.0, pz, 0.1, 0.5, 0.1, st);
    S('glow', 0, 2.0, 0, 0.42, 0.42, 0.42, COL.paper);
    S('solid', 0, 2.29, 0, 1.18, 0.14, 1.18, st);
    S('solid', 0, 2.41, 0, 0.92, 0.12, 0.92, sl);
    S('solid', 0, 2.52, 0, 0.6, 0.12, 0.6, st);
    S('solid', 0, 2.7, 0, 0.2, 0.26, 0.2, st);
    S('solid', 0.2, 2.37, -0.1, 0.5, 0.04, 0.4, COL.moss);
    if (light) kit.light(0, 2.0 * k, 0, light);
  }
  kit.pop();
}
function torii(x, z, yaw, k = 1, gy, col = COL.shu) {
  kit.push(x, gy !== undefined ? gy : G(x, z), z, yaw);
  const H = 4.6 * k, span = 3.6 * k, pr = 0.36 * k;
  for (const sx of [-1, 1]) {
    kit.box('lacquer', sx * span / 2, H / 2, 0, pr, H, pr, col);
    kit.box('solid', sx * span / 2, 0.3 * k, 0, pr * 1.3, 0.6 * k, pr * 1.3, COL.black);
  }
  kit.box('lacquer', 0, H * 0.78, 0, span + 1.0 * k, 0.28 * k, 0.26 * k, col);
  kit.box('lacquer', 0, H * 0.89, 0, 0.26 * k, H * 0.18, 0.2 * k, col);
  kit.box('lacquer', 0, H - 0.06 * k, 0, span + 1.5 * k, 0.3 * k, 0.4 * k, col);
  const kw = span / 2 + 1.2 * k;
  kit.beam('solid', -kw * 0.45, H + 0.24 * k, 0, kw * 0.45, H + 0.24 * k, 0, 0.3 * k, 0.5 * k, COL.black);
  for (const sx of [-1, 1]) kit.beam('solid', sx * kw * 0.42, H + 0.24 * k, 0, sx * (kw + 0.1 * k), H + 0.5 * k, 0, 0.3 * k, 0.5 * k, COL.black);
  kit.box('solid', 0, H * 0.72, 0.02, span - 0.2, 0.12 * k, 0.12 * k, COL.rope);
  for (let i = -1; i <= 1; i++) kit.box('solid', i * span * 0.25, H * 0.72 - 0.22 * k, 0.04, 0.08 * k, 0.28 * k, 0.02, COL.white);
  kit.pop();
}

// ---------------------------------------------------------------------
//  Buildings
// ---------------------------------------------------------------------
function house(x, y, z, yaw, type, w, d, seed, glow = true) {
  const rng = mulberry32(seed);
  kit.push(x, y, z, yaw);
  kit.box('solid', 0, -0.45, 0, w + 0.7, 1.1, d + 0.7, COL.stoneDark);
  kit.box('solid', 0, 0.12, 0, w + 0.3, 0.14, d + 0.3, COL.stone);
  const nor = [COL.indigo, C(0x6a4a3a), C(0x7a3b30), C(0x3b4b3a)][Math.floor(rng() * 4)];
  if (type === 'thatch') {
    const h = 2.5;
    body(w, d, 0.2, h, { bay: 1.8, fill: (s, i) => s === 'front' ? (i === 1 ? 'door' : (i === 0 ? 'wood' : 'shoji')) : (s === 'back' ? 'wood' : (i === 1 ? 'window' : 'plaster')), noren: nor });
    roof(h + 0.15, w, d, { type: 'irimoya', layers: 13, over: 0.8, rise: d * 0.78, col: COL.thatch, colB: COL.thatchB, edge: COL.thatchB, ridgeCol: COL.thatchTop, rough: true, tileEnds: false, hips: false, curve: 1.15, gableCol: COL.woodDark });
    const ry = h + 0.15 + d * 0.78;
    for (let i = -2; i <= 2; i++) kit.beam('solid', i * w * 0.15, ry - 0.2, -0.55, i * w * 0.15, ry + 0.35, 0.55, 0.12, 0.12, COL.woodDark);
    kit.box('solid', 0, 0.42, d / 2 + 0.55, w - 0.2, 0.1, 0.9, COL.deck);
    for (let i = 0; i < 3; i++) kit.box('solid', -w / 2 - 0.5, 0.3 + i * 0.28, -d / 4, 0.7, 0.26, 1.8, i % 2 ? COL.woodLight : COL.cedar);
    const sp = kit.world(w * 0.3, ry - 0.3, 0); kit.spot('smoke', sp[0], sp[1], sp[2]);
    if (rng() > 0.4) chochin(w / 2 - 0.5, h - 0.4, d / 2 + 0.4, 0.9, COL.paper, 0.9);
  } else if (type === 'machiya' || type === 'shop') {
    const h1 = 2.6, h2_ = 2.2;
    body(w, d, 0.2, h1, { bay: 1.7, fill: (s, i) => s === 'front' ? (i === 1 ? 'door' : 'koshi') : (s === 'back' ? 'shoji' : 'plaster'), noren: type === 'shop' ? C(0x8a2f28) : nor });
    roof(h1 + 0.1, w + 0.4, 0.9, { type: 'gable', layers: 3, over: 0.25, rise: 0.36, shift: d / 2 + 0.25, barge: false, ridge: false, col: COL.tileB, tileEnds: false });
    kit.push(0, h1 + 0.2, -0.4, 0);
    body(w - 0.2, d - 0.8, 0, h2_, { bay: 1.6, fill: (s) => s === 'front' ? 'koshi' : (s === 'back' ? 'window' : 'plaster') });
    kit.pop();
    roof(h1 + h2_ + 0.3, w - 0.2, d - 0.8, { type: 'gable', layers: 9, over: 0.7, rise: 1.8, shift: -0.4 });
    if (type === 'shop') { chochin(-w / 2 + 0.5, h1 - 0.45, d / 2 + 0.55, 1.0, COL.lanternRed, 1.2); chochin(w / 2 - 0.5, h1 - 0.45, d / 2 + 0.55, 1.0, COL.lanternRed, 0); }
    else if (rng() > 0.5) chochin(-w / 2 + 0.6, h1 - 0.5, d / 2 + 0.55, 0.9, COL.paper, 1.0);
  } else if (type === 'kura') {
    const h = 3.6;
    kit.box('solid', 0, 0.75, 0, w, 1.1, d, C(0x2b2a2a));
    kit.box('solid', 0, 1.3 + (h - 1.1) / 2, 0, w, h - 1.1, d, COL.plaster);
    kit.box('solid', 0, h + 0.05, 0, w + 0.25, 0.3, d + 0.25, COL.plasterShade);
    for (const sx of [-1, 1]) { kit.box('solid', sx * (w / 2 + 0.01), 2.8, 0, 0.1, 0.7, 0.8, C(0x2b2a2a)); kit.box('glow', sx * (w / 2 + 0.02), 2.8, 0, 0.06, 0.4, 0.5, COL.paper); }
    kit.box('solid', 0, 1.3, d / 2 + 0.08, 1.2, 2.0, 0.16, C(0x3a3330));
    roof(h + 0.15, w, d, { type: 'gable', layers: 8, over: 0.55, rise: 1.6, gableCol: COL.plaster });
  } else {
    const h = 2.5;
    body(w, d, 0.2, h, { bay: 1.75, fill: (s, i, n) => s === 'front' ? (i === Math.floor(n / 2) ? 'door' : 'shoji') : (s === 'back' ? 'wood' : (i === 0 ? 'window' : 'plaster')), noren: nor });
    roof(h + 0.2, w, d, { type: rng() > 0.5 ? 'hip' : 'irimoya', layers: 10, over: 0.85, rise: 1.9, upturn: 0.12 });
    kit.box('solid', 0, 0.42, d / 2 + 0.5, w - 0.3, 0.1, 0.8, COL.deck);
    if (rng() > 0.4) chochin(w / 2 - 0.4, h - 0.5, d / 2 + 0.5, 0.85, COL.paper, 0.8);
  }
  kit.pop();
}
function pagoda(x, y, z, yaw, tiers = 5) {
  kit.push(x, y, z, yaw);
  kit.box('solid', 0, -0.4, 0, 9.0, 1.2, 9.0, COL.stoneDark);
  kit.box('solid', 0, 0.3, 0, 7.6, 0.4, 7.6, COL.stone);
  let yy = 0.5, w = 5.6;
  for (let tier = 0; tier < tiers; tier++) {
    const h = tier === 0 ? 2.9 : 2.0;
    kit.push(0, yy, 0, 0);
    body(w, w, 0, h, { bay: w / 3, post: COL.shu, postMat: 'lacquer', postSize: 0.3, fill: (s, i) => (i === 1 ? (tier === 0 ? 'shoji' : 'koshi') : 'plaster'), paper: C(0xf6dcae) });
    kit.pop();
    kit.box('lacquer', 0, yy + h + 0.12, 0, w + 0.5, 0.24, w + 0.5, COL.shuDark);
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      for (let j = -2; j <= 2; j++) {
        const lx = j * (w / 5), lz = w / 2 + 0.4;
        kit.box('solid', Math.cos(ang) * lx - Math.sin(ang) * lz, yy + h + 0.36, Math.sin(ang) * lx + Math.cos(ang) * lz, 0.3, 0.24, 0.3, COL.woodDark);
      }
    }
    const ry = roof(yy + h + 0.45, w, w, { type: 'pyramid', layers: 6, over: 1.65, rise: 0.95, upturn: 0.45, rafters: true, bells: true, ridge: false, curve: 1.6 });
    yy = ry - 0.25; w *= 0.86;
    if (tier < tiers - 1) { kit.box('lacquer', 0, yy + 0.1, 0, w * 0.9, 0.2, w * 0.9, COL.shu); yy += 0.25; }
  }
  kit.box('solid', 0, yy + 0.3, 0, 1.6, 0.6, 1.6, COL.tileDark);
  kit.box('metal', 0, yy + 0.75, 0, 1.0, 0.3, 1.0, COL.gold);
  for (let i = 0; i < 9; i++) kit.box('metal', 0, yy + 1.15 + i * 0.42, 0, 0.62 - i * 0.025, 0.16, 0.62 - i * 0.025, COL.gold, 0, (i % 2) * 0.785, 0);
  kit.box('metal', 0, yy + 3.0, 0, 0.12, 4.2, 0.12, COL.gold);
  kit.box('metal', 0, yy + 5.3, 0, 0.42, 0.34, 0.42, COL.gold);
  kit.light(0, 1.6, 4.5, 1.3);
  kit.pop();
}
function hall(x, y, z, yaw, w = 10, d = 7.5) {
  kit.push(x, y, z, yaw);
  kit.box('solid', 0, -0.2, 0, w + 3, 1.0, d + 3, COL.stoneDark);
  kit.box('solid', 0, 0.4, 0, w + 2, 0.3, d + 2, COL.stone);
  for (let i = 0; i < 4; i++) kit.box('solid', 0, 0.12 + i * 0.12, d / 2 + 1.5 + (3 - i) * 0.35, 3.2, 0.14, 0.4, COL.stoneLight);
  kit.box('solid', 0, 0.75, 0, w + 1.4, 0.2, d + 1.4, COL.deck);
  kit.push(0, 0.85, 0, 0);
  body(w, d, 0, 3.6, { bay: 2.0, post: COL.shu, postMat: 'lacquer', postSize: 0.36, fill: (s, i, n) => s === 'front' ? 'shoji' : (s === 'back' ? 'plaster' : (i % 2 ? 'koshi' : 'plaster')), paper: C(0xf5dfb8) });
  kit.pop();
  kit.box('lacquer', 0, 4.6, 0, w + 0.8, 0.3, d + 0.8, COL.shuDark);
  roof(4.75, w, d, { type: 'irimoya', layers: 13, over: 2.0, rise: 3.6, upturn: 0.4, rafters: true, curve: 1.9 });
  chochin(-w / 4, 3.3, d / 2 + 1.3, 1.3, COL.paper, 1.6);
  chochin(w / 4, 3.3, d / 2 + 1.3, 1.3, COL.paper, 0);
  kit.pop();
}
function gate(x, y, z, yaw, k = 1) {
  kit.push(x, y, z, yaw);
  const w = 6 * k, d = 3 * k, h = 3.4 * k;
  kit.box('solid', 0, 0.1, 0, w + 1, 0.3, d + 1, COL.stone);
  for (const sx of [-1, -0.33, 0.33, 1]) for (const sz of [-1, 1]) kit.box('lacquer', sx * w / 2, h / 2 + 0.2, sz * d / 2, 0.36 * k, h, 0.36 * k, COL.shu);
  for (const sx of [-1, 1]) kit.box('solid', sx * w * 0.67 / 2 + sx * w * 0.17, 1.6 * k, 0, w * 0.3, 2.4 * k, 0.2, COL.plaster);
  kit.box('lacquer', 0, h + 0.2, 0, w + 0.6, 0.4, d + 0.6, COL.shuDark);
  roof(h + 0.4, w, d, { type: 'irimoya', layers: 10, over: 1.2, rise: 2.2 * k, upturn: 0.3, rafters: true });
  kit.pop();
}
function castle(x, y, z, yaw) {
  kit.push(x, y, z, yaw);
  // battered stone base (ishigaki)
  for (let i = 0; i < 7; i++) {
    const s = 22 - i * 1.0;
    kit.box('solid', 0, i * 1.0 + 0.5, 0, s, 1.02, s * 0.82, i % 2 ? C(0x8f8a80) : C(0x7f7a72));
  }
  let yy = 7.0, w = 13.5, d = 11;
  for (let t = 0; t < 4; t++) {
    const h = t === 0 ? 4.2 : 3.2;
    kit.box('solid', 0, yy + h / 2, 0, w, h, d, COL.plaster);
    kit.box('solid', 0, yy + 0.5, 0, w + 0.06, 1.0, d + 0.06, C(0x2e2c2b));
    const nw = Math.max(2, Math.round(w / 2.4));
    for (let i = 0; i < nw; i++) for (const sz of [-1, 1]) {
      kit.box('solid', -w / 2 + (i + 0.5) * w / nw, yy + h * 0.6, sz * (d / 2 + 0.04), 0.9, 0.9, 0.06, C(0x2b2a29));
      kit.box('glow', -w / 2 + (i + 0.5) * w / nw, yy + h * 0.6, sz * (d / 2 + 0.06), 0.55, 0.55, 0.04, C(0xf2d7a8));
    }
    const ry = roof(yy + h, w, d, { type: t === 3 ? 'irimoya' : 'hip', layers: 7, over: 1.4, rise: 1.6 + t * 0.15, upturn: 0.45, col: C(0x3a4250), colB: C(0x323947), edge: C(0x5c6370) });
    if (t === 1) for (const sx of [-1, 1]) roof(yy + h - 0.3, 3.5, d + 0.6, { type: 'gable', layers: 6, over: 0.6, rise: 1.6, shift: 0, col: C(0x3a4250) });
    if (t === 3) for (const sx of [-1, 1]) { kit.box('metal', sx * (w / 2 + 0.8), ry + 0.5, 0, 0.4, 1.0, 0.7, COL.gold); kit.box('metal', sx * (w / 2 + 0.8), ry + 1.1, 0, 0.3, 0.3, 0.9, COL.gold); }
    yy = ry - 0.4; w *= 0.78; d *= 0.8;
  }
  kit.light(0, 7.8, 10, 1.6);
  kit.pop();
}
function shrine(x, y, z, yaw) {
  kit.push(x, y, z, yaw);
  kit.box('solid', 0, 0.2, -0.5, 9.2, 0.6, 8.0, COL.stoneDark);
  kit.box('solid', 0, 0.55, -0.9, 7.4, 0.3, 6.2, COL.stone);
  kit.push(0, 0.7, -1.3, 0);
  const w = 5.6, d = 4.4, h = 3.0;
  kit.box('solid', 0, 0.35, 0, w + 1.2, 0.2, d + 1.2, COL.wood);
  kit.push(0, 0.45, 0, 0);
  body(w, d, 0, h, { bay: 1.4, post: COL.shu, postMat: 'lacquer', postSize: 0.3, fill: (s, i, n) => s === 'front' ? (i === 0 || i === n - 1 ? 'koshi' : 'shoji') : (s === 'back' ? 'plaster' : 'koshi'), paper: C(0xf6e2bf) });
  kit.pop();
  const ry = roof(h + 0.55, w, d + 0.6, { type: 'gable', layers: 12, over: 1.1, rise: 2.6, shift: 0.5, col: COL.copper, colB: COL.copperB, edge: C(0x7fb3a0), ridgeCol: C(0x3e6b5d), tileEnds: false, gableCol: COL.plaster, bargeCol: COL.shu, rafters: true, rafterCol: COL.shu });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.beam('solid', sx * (w / 2 + 1.0), ry - 0.6, 0.5, sx * (w / 2 + 1.25), ry + 1.0, 0.5 + sz * 0.7, 0.14, 0.26, C(0x3e6b5d));
  for (let i = -2; i <= 2; i++) { kit.box('solid', i * 0.9, ry + 0.4, 0.5, 0.28, 0.28, 0.9, C(0x3e6b5d)); kit.box('metal', i * 0.9, ry + 0.4, 0.97, 0.3, 0.3, 0.06, COL.gold); }
  kit.box('solid', 0, h - 0.2, d / 2 + 0.75, w - 0.4, 0.26, 0.26, COL.rope);
  for (let i = -3; i <= 3; i++) kit.box('solid', i * 0.75, h - 0.55, d / 2 + 0.8, 0.12, 0.3, 0.03, COL.white);
  kit.box('metal', 0, h - 0.6, d / 2 + 0.9, 0.36, 0.36, 0.36, COL.gold);
  kit.box('solid', 0, 0.75, d / 2 + 1.2, 1.4, 0.7, 0.7, COL.wood);
  chochin(-w / 2 + 0.2, h - 0.3, d / 2 + 0.95, 1.0, COL.paper, 1.5);
  chochin(w / 2 - 0.2, h - 0.3, d / 2 + 0.95, 1.0, COL.paper, 0);
  kit.pop();
  for (const sx of [-1, 1]) {
    kit.push(sx * 2.4, 0.7, 2.6, 0);
    kit.box('solid', 0, 0.3, 0, 0.8, 0.6, 0.8, COL.stoneDark);
    kit.box('solid', 0, 0.85, 0.05, 0.55, 0.55, 0.65, COL.stone);
    kit.box('solid', 0, 1.3, 0.15, 0.5, 0.45, 0.45, COL.stoneLight);
    kit.box('solid', 0, 1.6, 0.05, 0.56, 0.18, 0.38, COL.moss);
    kit.pop();
  }
  kit.pop();
}
function teahouse(x, y, z, yaw, overWater = false) {
  kit.push(x, y, z, yaw);
  const w = 8.4, d = 5.2, h = 2.7;
  if (overWater) for (const px of [-w / 2, 0, w / 2]) for (const pz of [-d / 2, d / 2 + 2.6]) kit.box('solid', px, -1.6, pz, 0.26, 3.6, 0.26, COL.woodDark);
  kit.box('solid', 0, -0.25, 0, w + 0.6, 0.7, d + 0.6, overWater ? COL.woodDark : COL.stoneDark);
  kit.box('solid', 0, 0.2, 0, w + 0.1, 0.2, d + 0.1, COL.deck);
  kit.push(0, 0.3, 0, 0);
  body(w, d, 0, h, { bay: 1.7, fill: (s, i) => s === 'front' ? (i === 2 ? 'door' : 'shoji') : (s === 'back' ? (i === 1 ? 'door' : 'plaster') : (i === 1 ? 'shoji' : 'plaster')), noren: COL.indigo });
  roof(h + 0.05, w, d, { type: 'irimoya', layers: 11, over: 1.05, rise: 2.4, upturn: 0.25, rafters: true });
  const vd = 2.6;
  for (let i = 0; i < 12; i++) kit.box('solid', -w / 2 + 0.35 + i * (w - 0.7) / 11, 0.0, d / 2 + vd / 2 + 0.1, (w - 0.7) / 11 - 0.04, 0.12, vd, i % 2 ? COL.deck : COL.cedar);
  for (const px of [-w / 2 + 0.3, 0, w / 2 - 0.3]) kit.box('solid', px, 0.55, d / 2 + vd - 0.05, 0.12, 1.0, 0.12, COL.woodDark);
  kit.box('solid', 0, 0.95, d / 2 + vd - 0.05, w - 0.4, 0.1, 0.14, COL.wood);
  roof(h - 0.15, w + 0.2, vd * 0.9, { type: 'gable', layers: 4, over: 0.3, rise: 0.4, shift: d / 2 + vd * 0.4, barge: false, ridge: false, tileEnds: false, col: COL.tileB });
  for (const px of [-w / 2 + 0.3, w / 2 - 0.3]) kit.box('solid', px, h / 2 - 0.1, d / 2 + vd - 0.2, 0.16, h - 0.2, 0.16, COL.woodDark);
  for (const bx of [-2.2, 1.8]) { kit.box('solid', bx, 0.42, d / 2 + 1.4, 1.8, 0.1, 0.7, COL.wood); kit.box('solid', bx, 0.49, d / 2 + 1.4, 1.75, 0.04, 0.72, COL.felt); }
  for (const lx of [-w / 2 - 0.2, -w / 6, w / 6, w / 2 + 0.2]) chochin(lx, h - 0.75, d / 2 + vd - 0.25, 1.0, COL.lanternRed, lx === -w / 6 ? 2.0 : 0);
  kit.pop();
  if (!overWater) {
    kit.push(-1.2, 0.3, -d / 2 - 1.9, 0);
    kit.box('solid', 0, 1.3, 0, 0.08, 2.6, 0.08, COL.woodDark);
    for (let i = 0; i < 4; i++) kit.box('solid', 0, 2.55 + i * 0.13, 0, 3.2 - i * 0.75, 0.1, 3.2 - i * 0.75, i % 2 ? COL.felt : C(0xc2402f), 0, i * 0.3927 + 0.2, 0);
    kit.pop();
  }
  kit.pop();
}
function boat(x, z, yaw, y = -0.12) {
  kit.push(x, y, z, yaw);
  for (let i = 0; i < 4; i++) kit.box('solid', 0, i * 0.14, 0, 0.9 + i * 0.22, 0.14, 3.6 + i * 0.25, i === 3 ? COL.woodLight : COL.wood);
  kit.box('solid', 0, 0.3, 0, 1.2, 0.2, 3.4, C(0x221a14));
  kit.box('solid', 0, 0.62, 0, 1.4, 0.08, 0.3, COL.woodLight);
  kit.pop();
}
function arcBridge(ax, az, bx, bz, deck, width = 3.0, arch = 2.4, red = true) {
  const len = Math.hypot(bx - ax, bz - az) + 1.0, half = len / 2;
  const yaw = Math.atan2(-(bz - az), bx - ax);
  kit.push((ax + bx) / 2, 0, (az + bz) / 2, yaw);
  const N = Math.max(10, Math.round(len * 1.2));
  const yAt = (x) => deck + arch * Math.pow(Math.max(0, Math.cos((x / half) * Math.PI * 0.5)), 1.25);
  const rail = red ? COL.shu : COL.woodDark, mat = red ? 'lacquer' : 'solid';
  for (let i = 0; i < N; i++) {
    const x0 = -half + (len * i) / N, x1 = x0 + len / N;
    kit.beam('solid', x0, yAt(x0), 0, x1, yAt(x1), 0, width, 0.16, i % 2 ? COL.deck : C(0x806246), Math.PI / 2);
    for (const sz of [-1, 1]) kit.beam(mat, x0, yAt(x0) - 0.22, sz * (width / 2 + 0.06), x1, yAt(x1) - 0.22, sz * (width / 2 + 0.06), 0.42, 0.18, rail, Math.PI / 2);
  }
  const np = Math.max(4, Math.round(len / 2.4));
  for (let i = 0; i <= np; i++) {
    const x = -half + 0.4 + ((len - 0.8) * i) / np, y = yAt(x);
    for (const sz of [-1, 1]) {
      kit.box(mat, x, y + 0.55, sz * (width / 2 - 0.05), 0.2, 1.1, 0.2, rail);
      if (red && (i === 0 || i === np)) kit.box('metal', x, y + 1.25, sz * (width / 2 - 0.05), 0.3, 0.26, 0.3, COL.gold);
    }
    if (i < np) {
      const x2 = -half + 0.4 + ((len - 0.8) * (i + 1)) / np;
      for (const sz of [-1, 1]) kit.beam(mat, x, y + 1.04, sz * (width / 2 - 0.05), x2, yAt(x2) + 1.04, sz * (width / 2 - 0.05), 0.14, 0.16, rail, Math.PI / 2);
    }
  }
  for (const px of [-half * 0.5, half * 0.5]) { const y = yAt(px); for (const sz of [-1, 1]) kit.box(mat, px, (y - 3) / 2, sz * (width / 2 - 0.25), 0.3, y + 3, 0.3, red ? COL.shuDark : COL.woodDark); }
  kit.pop();
}
function lighthouse(x, y, z) {
  kit.push(x, y, z, 0);
  kit.box('solid', 0, 0.3, 0, 5, 0.8, 5, COL.stoneDark);
  for (let i = 0; i < 9; i++) { const s = 3.2 - i * 0.12; kit.box('solid', 0, 0.7 + i * 1.2 + 0.6, 0, s, 1.22, s, i % 4 === 3 ? C(0xd8d4cc) : COL.white, 0, (i % 2) * 0.785 * 0, 0); }
  kit.box('solid', 0, 11.7, 0, 3.4, 0.25, 3.4, COL.black);
  kit.box('glow', 0, 12.5, 0, 1.4, 1.3, 1.4, C(0xfff2d0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box('solid', sx * 0.72, 12.5, sz * 0.72, 0.12, 1.3, 0.12, COL.black);
  kit.box('solid', 0, 13.35, 0, 1.9, 0.35, 1.9, C(0xa83a2c));
  kit.box('solid', 0, 13.7, 0, 0.9, 0.4, 0.9, C(0xa83a2c));
  kit.light(0, 12.5, 0, 3.0);
  kit.pop();
}
function hut(x, y, z, yaw) {
  kit.push(x, y, z, yaw);
  kit.box('solid', 0, -0.3, 0, 7, 0.9, 5.6, COL.stoneDark);
  body(6, 4.6, 0.15, 2.4, { bay: 2, fill: (s, i) => s === 'front' ? (i === 1 ? 'door' : 'shoji') : 'wood' , noren: COL.indigo});
  roof(2.6, 6, 4.6, { type: 'gable', layers: 10, over: 0.9, rise: 2.4, col: C(0xe8edf3), colB: C(0xdde4ec), edge: C(0x6a5040), ridgeCol: C(0xf3f6fa), tileEnds: false });
  const p = kit.world(1.8, 5.2, 0); kit.spot('smoke', p[0], p[1], p[2]);
  chochin(-2.2, 2.0, 2.7, 0.9, COL.paper, 1.2);
  kit.pop();
  torii(x + Math.sin(yaw) * 10, z + Math.cos(yaw) * 10, yaw, 0.7);
}
function scarecrow(x, z, yaw) {
  const y = G(x, z);
  kit.push(x, y, z, yaw);
  kit.box('solid', 0, 0.9, 0, 0.08, 1.8, 0.08, COL.woodDark);
  kit.box('solid', 0, 1.35, 0, 1.4, 0.06, 0.06, COL.woodDark);
  kit.box('solid', 0, 1.25, 0, 0.6, 0.6, 0.25, C(0x4a5a7a));
  kit.box('solid', 0, 1.75, 0, 0.32, 0.3, 0.3, C(0xe0d6c0));
  kit.box('solid', 0, 2.0, 0, 0.9, 0.12, 0.9, C(0xb59a5c), 0, 0.4, 0);
  kit.box('solid', 0, 2.12, 0, 0.4, 0.14, 0.4, C(0xb59a5c), 0, 0.4, 0);
  kit.pop();
}

// ---------------------------------------------------------------------
//  Trees & plants
// ---------------------------------------------------------------------
const BARK = [C(0x3a2f2b), C(0x463a33), C(0x2d2522), C(0x524338), C(0x3f3a33)];
const PALETTES = {
  yama: [0xf6c3d2, 0xf2b2c5, 0xf9d6e0, 0xeda3bb, 0xfbe4ea, 0xf4bccc],
  pale: [0xfbe3ea, 0xf7d3de, 0xfdf0f3, 0xf3c6d4, 0xf9dbe4, 0xfff4f6],
  shidare: [0xf3a6be, 0xee96b2, 0xf7c1d1, 0xe98aa9, 0xf8cfdb, 0xf1adc2],
  ancient: [0xf7c6d4, 0xf2b4c7, 0xfadbe4, 0xeea6bd, 0xfde8ee, 0xf5bdcd, 0xf9d0dc],
};
const PALC = {}; for (const k in PALETTES) PALC[k] = PALETTES[k].map((h) => C(h));
const TREE_KIND = {
  yama:    { trunkLen: 2.8, r: 0.42, firstLen: 3.3, maxD: 4, cl: 1.2, spread: [0.5, 0.95], up: 0.03, kids0: 3, droop: 0.0, strands: 0 },
  pale:    { trunkLen: 2.4, r: 0.46, firstLen: 3.6, maxD: 4, cl: 1.35, spread: [0.6, 1.05], up: 0.02, kids0: 3, droop: 0.02, strands: 0 },
  shidare: { trunkLen: 4.4, r: 0.48, firstLen: 2.6, maxD: 3, cl: 0.8, spread: [0.5, 0.85], up: 0.06, kids0: 4, droop: 0.0, strands: 1 },
  ancient: { trunkLen: 4.4, r: 1.15, firstLen: 5.2, maxD: 5, cl: 1.45, spread: [0.5, 0.9], up: 0.02, kids0: 4, droop: 0.035, strands: 0 },
};
const _q0 = [0, 0, 0, 1];
function cherryTree(x, z, kind, seed, S = 1, detail = 0.55) {
  const K = TREE_KIND[kind];
  const rng = mulberry32(seed * 9973 + 17);
  const RR = (a, b) => a + (b - a) * rng();
  const pal = PALC[kind];
  const gy = G(x, z);
  const ancient = kind === 'ancient';
  const noiseOff = seed * 13.7;
  const c0 = new V3(), c1 = new V3(), mid = new V3();
  const seg = (a, b, r) => {
    c0.copy(b).sub(a); const L = c0.length(); c0.multiplyScalar(1 / L);
    const q = qMul(qUnit(UP, c0), qAxis(0, 1, 0, rng() * 1.6));
    kit.boxW('solid', mid.copy(a).add(b).multiplyScalar(0.5), q, r * 2, L + r * 0.8, r * 2, BARK[Math.floor(rng() * BARK.length)]);
  };
  const tmpCol = new Col();
  let spots = 0;
  const cluster = (p, size, dh) => {
    const sx = size * RR(1.05, 1.4), sy = size * RR(0.55, 0.75), sz = size * RR(1.05, 1.4);
    const cx = p.x + (dh ? dh.x * size * 0.25 : 0), cy = p.y + sy * 0.3, cz = p.z + (dh ? dh.z * size * 0.25 : 0);
    if (spots < 3 && rng() < 0.35) { kit.spot('petal', cx, cy, cz); spots++; }
    const vol = 4.19 * sx * sy * sz;
    const N = Math.round(vol * (ancient ? 7.0 : 4.6) * detail);
    const cube = 0.36 / Math.sqrt(detail);
    for (let i = 0; i < N; i++) {
      let ux, uy, uz, l2;
      do { ux = rng() * 2 - 1; uy = rng() * 2 - 1; uz = rng() * 2 - 1; l2 = ux * ux + uy * uy + uz * uz; } while (l2 > 1);
      const sl = Math.sqrt(l2) || 1; ux /= sl; uy /= sl; uz /= sl;
      const rr = lerp(0.35, 1, Math.pow(l2, 0.12)) * (0.85 + rng() * 0.15);
      const px = cx + ux * sx * rr, py = cy + uy * sy * rr, pz = cz + uz * sz * rr;
      if (vn3(px * 0.75 + noiseOff, py * 0.9, pz * 0.75, 5) < -0.12) continue;
      const s = cube * RR(0.7, 1.25);
      const ao = 0.58 + 0.42 * Math.pow(clamp((uy + 1) / 2, 0, 1), 0.8) * lerp(0.75, 1, rr);
      tmpCol.copy(pal[Math.floor(rng() * pal.length)]).multiplyScalar(ao * RR(0.94, 1.04));
      if (rng() < 0.04) tmpCol.lerp(C(0x7a5a3a), 0.55);
      kit.boxW('blossom', c1.set(px, py, pz), qEuler(RR(-0.12, 0.12), rng() * Math.PI, RR(-0.12, 0.12)), s, s * RR(0.85, 1.0), s, tmpCol);
    }
  };
  const strand = (p, len) => {
    let sx = p.x, sy = p.y, sz = p.z;
    const n = Math.round(len / 0.38), ox = RR(-0.1, 0.1), oz = RR(-0.1, 0.1);
    for (let i = 0; i < n; i++) {
      sx += ox + RR(-0.06, 0.06); sz += oz + RR(-0.06, 0.06); sy -= 0.38;
      if (sy < gy + 0.6) break;
      if (rng() < 0.12) continue;
      const s = lerp(0.3, 0.16, i / n) * RR(0.8, 1.2);
      tmpCol.copy(pal[Math.floor(rng() * pal.length)]).multiplyScalar(RR(0.85, 1.0));
      kit.boxW('blossom', c1.set(sx, sy, sz), qAxis(0, 1, 0, rng() * 3), s, s * 1.2, s, tmpCol);
    }
  };
  const tips = [];
  const branch = (p, dir, len, r, depth, lean) => {
    const segLen = clamp(r * 2.3, 0.4, 1.25), n = Math.max(2, Math.round(len / segLen)), step = len / n;
    const cur = p.clone(), d = dir.clone(), wob = depth === 0 ? 0.12 : 0.22;
    for (let i = 0; i < n; i++) {
      d.x += RR(-1, 1) * wob; d.z += RR(-1, 1) * wob; d.y += RR(-1, 1) * wob * 0.5 + K.up - K.droop * depth;
      d.normalize();
      const nx = cur.clone().addScaledVector(d, step);
      seg(cur, nx, lerp(r, r * 0.74, (i + 1) / n));
      cur.copy(nx);
      if (depth >= K.maxD - 1 && i < n - 1 && rng() < 0.4) tips.push({ p: cur.clone(), d: d.clone(), s: 0.7 });
    }
    if (depth < K.maxD) {
      const kids = depth === 0 ? K.kids0 : (rng() < 0.3 ? 3 : 2);
      const a1 = new V3().crossVectors(d, Math.abs(d.y) < 0.9 ? UP : new V3(1, 0, 0)).normalize();
      const a2 = new V3().crossVectors(d, a1).normalize();
      const phase = rng() * Math.PI * 2;
      for (let k = 0; k < kids; k++) {
        const az = phase + (k / kids) * Math.PI * 2 + RR(-0.4, 0.4), tilt = RR(K.spread[0], K.spread[1]);
        const nd = d.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(a1, Math.sin(tilt) * Math.cos(az)).addScaledVector(a2, Math.sin(tilt) * Math.sin(az));
        if (lean) nd.addScaledVector(lean, 0.25 / (depth + 1));
        nd.y = Math.max(nd.y, -0.15); nd.normalize();
        branch(cur, nd, depth === 0 ? K.firstLen * S * RR(0.85, 1.15) : len * RR(0.62, 0.82), r * RR(0.58, 0.7), depth + 1, lean);
      }
    } else tips.push({ p: cur.clone(), d: d.clone(), s: 1 });
  };
  const base = new V3(x, gy - 0.3, z);
  const lean = new V3(RR(-1, 1), 0, RR(-1, 1)).normalize();
  if (ancient) {
    for (let sI = 0; sI < 4; sI++) {
      let prev = null;
      for (let i = 0; i <= 8; i++) {
        const f = i / 8, ang = (sI / 4) * Math.PI * 2 + f * 2.2, rad = lerp(1.0, 0.45, f);
        const p = new V3(base.x + Math.cos(ang) * rad + lean.x * f * f, base.y + f * K.trunkLen, base.z + Math.sin(ang) * rad + lean.z * f * f);
        if (prev) seg(prev, p, lerp(0.6, 0.42, f));
        prev = p;
      }
    }
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + RR(-0.2, 0.2);
      let px = base.x + Math.cos(ang) * 0.8, pz = base.z + Math.sin(ang) * 0.8, py = base.y + 0.9, r = 0.55;
      for (let k = 0; k < 4; k++) {
        const nxp = px + Math.cos(ang) * 0.9, nzp = pz + Math.sin(ang) * 0.9, nyp = G(nxp, nzp) + r * 0.25;
        seg(new V3(px, py, pz), new V3(nxp, nyp, nzp), r); px = nxp; pz = nzp; py = nyp; r *= 0.78;
      }
    }
    const top = new V3(base.x + lean.x, base.y + K.trunkLen, base.z + lean.z);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + RR(-0.3, 0.3);
      branch(top, new V3(Math.cos(a), RR(0.55, 0.8), Math.sin(a)).normalize(), K.firstLen * RR(0.85, 1.1), 0.7, 1, lean);
    }
  } else {
    branch(base, new V3(lean.x * 0.15, 1, lean.z * 0.15).normalize(), K.trunkLen * S, K.r * S, 0, lean);
  }
  for (const t of tips) {
    cluster(t.p, K.cl * S * t.s * RR(0.85, 1.2), t.d);
    if (K.strands && rng() < K.strands) strand(t.p, RR(3.5, 6.5) * S);
  }
}
function conifer(x, z, s, seed, snowy = false, y) {
  const rng = mulberry32(seed);
  const gy = y !== undefined ? y : G(x, z);
  const c = C([0x2f4c37, 0x35533b, 0x2b4436, 0x3b5a3a, 0x2a4032][Math.floor(rng() * 5)]).multiplyScalar(0.85 + rng() * 0.3);
  const ry = rng() * Math.PI;
  kit.box('solid', x, gy + 0.9 * s, z, 0.34 * s, 1.8 * s, 0.34 * s, C(0x5a4636));
  const tiers = [[1.75, 2.5, 1.25, 0.66], [2.8, 2.1, 1.15, 0.74], [3.75, 1.7, 1.05, 0.8], [4.6, 1.3, 0.95, 0.86], [5.35, 0.85, 0.85, 0.92], [6.0, 0.4, 0.7, 0.98]];
  for (let i = 0; i < tiers.length; i++) {
    const [ty, w, hh, sh] = tiers[i];
    kit.box('leaf', x, gy + ty * s, z, w * s, hh * s, w * s, c.clone().multiplyScalar(sh), 0, ry + i * 0.6, 0);
    if (snowy && i < 5) kit.box('solid', x, gy + (ty + hh * 0.5) * s, z, w * s * 0.86, 0.14 * s, w * s * 0.86, C(0xe9eef5), 0, ry + i * 0.6 + 0.2, 0);
  }
}
function broadleaf(x, z, s, seed, tint) {
  const rng = mulberry32(seed);
  const gy = G(x, z);
  const base = tint || C([0x6f9448, 0x7fa255, 0x5d8340, 0x8cab5c][Math.floor(rng() * 4)]);
  kit.box('solid', x, gy + 1.1 * s, z, 0.34 * s, 2.2 * s, 0.34 * s, C(0x5a4636));
  for (let i = 0; i < 16; i++) {
    let ux, uy, uz; do { ux = rng() * 2 - 1; uy = rng() * 2 - 1; uz = rng() * 2 - 1; } while (ux * ux + uy * uy + uz * uz > 1);
    const k = (0.6 + rng() * 0.5) * s, sh = 0.72 + 0.3 * (uy + 1) / 2;
    kit.box('leaf', x + ux * 1.5 * s, gy + (3.3 + uy) * s, z + uz * 1.5 * s, k, k * 0.85, k, base.clone().multiplyScalar(sh * (0.9 + rng() * 0.2)), 0, rng() * 3, 0);
  }
  if (tint === 'persimmon') return;
}
function persimmon(x, z, seed) {
  const rng = mulberry32(seed);
  broadleaf(x, z, 0.9, seed, C(0x5f7f3c));
  const gy = G(x, z);
  for (let i = 0; i < 9; i++) kit.box('solid', x + (rng() - 0.5) * 2.6, gy + 2.4 + rng() * 1.6, z + (rng() - 0.5) * 2.6, 0.2, 0.2, 0.2, C(0xe2702a));
}
function pine(x, z, s, seed) {
  const rng = mulberry32(seed);
  const y = G(x, z);
  let p = new V3(x, y - 0.2, z), d = new V3(rng() - 0.5, 1.4, rng() - 0.5).normalize();
  const mid = new V3();
  for (let i = 0; i < 6; i++) {
    d.x += (rng() - 0.5) * 0.5; d.z += (rng() - 0.5) * 0.5; d.normalize();
    const n = p.clone().addScaledVector(d, 1.0 * s);
    kit.boxW('solid', mid.copy(p).add(n).multiplyScalar(0.5), qUnit(UP, d), 0.42 * s * (1 - i * 0.08), 1.25 * s, 0.42 * s * (1 - i * 0.08), C(0x4a3b30));
    p = n;
    if (i >= 2) {
      const ang = rng() * Math.PI * 2, L = (1.3 + rng() * 1.2) * s;
      const q = p.clone().add(new V3(Math.cos(ang) * L, 0.2 * s, Math.sin(ang) * L));
      const dd = q.clone().sub(p), l = dd.length(); dd.normalize();
      kit.boxW('solid', mid.copy(p).add(q).multiplyScalar(0.5), qUnit(UP, dd), 0.18 * s, l, 0.18 * s, C(0x4a3b30));
      for (let k = 0; k < 4; k++) kit.box('leaf', q.x + (rng() - 0.5) * 1.6 * s, q.y + 0.25 * s + rng() * 0.3 * s, q.z + (rng() - 0.5) * 1.6 * s, (1.1 + rng() * 0.8) * s, 0.45 * s, (1.1 + rng() * 0.8) * s, (k % 2 ? COL.pine : COL.pineDark).clone().multiplyScalar(0.9 + rng() * 0.2), 0, rng() * 3, 0);
    }
  }
  for (let k = 0; k < 3; k++) kit.box('leaf', p.x + (rng() - 0.5) * 1.2 * s, p.y + 0.3 * s, p.z + (rng() - 0.5) * 1.2 * s, 1.6 * s, 0.5 * s, 1.6 * s, COL.pine, 0, rng() * 3, 0);
}
function bamboo(x, z, seed) {
  const rng = mulberry32(seed);
  const y = G(x, z), H = 8 + rng() * 7, lean = (rng() - 0.5) * 0.09, lean2 = (rng() - 0.5) * 0.09;
  const c = C(rng() > 0.5 ? 0x7d9c50 : 0x6d8c46).multiplyScalar(0.85 + rng() * 0.25);
  kit.box('solid', x + lean * H * 0.5, y + H / 2, z + lean2 * H * 0.5, 0.13, H, 0.13, c, lean2, 0, -lean);
  for (let n = 1; n < 5; n++) kit.box('solid', x + lean * H * n / 5, y + H * n / 5, z + lean2 * H * n / 5, 0.16, 0.045, 0.16, c.clone().multiplyScalar(0.8));
  for (let k = 0; k < 3; k++) kit.box('leaf', x + lean * H + (rng() - 0.5) * 1.4, y + H - rng() * 2.4, z + lean2 * H + (rng() - 0.5) * 1.4, 0.75 + rng() * 0.5, 0.16, 0.75 + rng() * 0.5, C(0x7a9c4c).multiplyScalar(0.8 + rng() * 0.3), (rng() - 0.5) * 0.5, rng() * 3, (rng() - 0.5) * 0.5);
}
function willow(x, z, seed) {
  const rng = mulberry32(seed);
  const y = G(x, z);
  kit.box('solid', x, y + 1.6, z, 0.4, 3.2, 0.4, C(0x4a4036), 0.05, 0, 0.04);
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2, r = 0.6 + rng() * 1.8;
    const sx = x + Math.cos(a) * r, sz = z + Math.sin(a) * r;
    const L = 1.8 + rng() * 2.2;
    kit.box('leaf', sx, y + 4.0 - L / 2, sz, 0.18, L, 0.18, C(rng() > 0.5 ? 0x8fae55 : 0x7d9c4a).multiplyScalar(0.85 + rng() * 0.2));
  }
  kit.box('leaf', x, y + 4.0, z, 3.4, 0.6, 3.4, C(0x86a350), 0, rng() * 3, 0);
}
// lotus pads & marsh flowers
function lotus(x, z, seed) {
  const rng = mulberry32(seed);
  const y = G(x, z);
  const n = 2 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const px = x + (rng() - 0.5) * 1.8, pz = z + (rng() - 0.5) * 1.8;
    const s = 0.5 + rng() * 0.5;
    kit.box('leaf', px, y + 0.12, pz, s, 0.07, s, C(rng() > 0.3 ? 0x4a7a3c : 0x568a44), 0, rng() * 3, 0);
    if (rng() > 0.65) kit.box('solid', px + 0.1, y + 0.24, pz + 0.06, 0.16, 0.16, 0.16, C(rng() > 0.5 ? 0xe89ab0 : 0xf2d0dc));
  }
}
// cattails (蒲草) — taller than reeds with dark-brown spike
function cattail(x, z, seed) {
  const rng = mulberry32(seed);
  const y = G(x, z);
  const n = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const px = x + (rng() - 0.5) * 0.8, pz = z + (rng() - 0.5) * 0.8;
    const h = 1.6 + rng() * 1.2;
    kit.box('solid', px, y + h / 2, pz, 0.05, h, 0.05, C(0x7d9c4a).multiplyScalar(0.85 + rng() * 0.25), (rng() - 0.5) * 0.12, rng() * 3, (rng() - 0.5) * 0.12);
    if (rng() > 0.35) kit.box('solid', px, y + h + 0.16, pz, 0.08, 0.38, 0.08, C(0x6a4a30), 0, 0, (rng() - 0.5) * 0.2);
  }
}
// lavender / wildflower clump for meadows
function wildflowers(x, z, seed) {
  const rng = mulberry32(seed);
  const y = G(x, z);
  const cols = [C(0x8a7ab8), C(0xd8b8d8), C(0xe8d84a), C(0xe88aa0), C(0xf0f0e0)];
  for (let i = 0; i < 7; i++) {
    const px = x + (rng() - 0.5) * 1.1, pz = z + (rng() - 0.5) * 1.1;
    const h = 0.3 + rng() * 0.35;
    kit.box('solid', px, y + h / 2, pz, 0.04, h, 0.04, C(0x5d7a3a));
    kit.box('solid', px, y + h, pz, 0.14, 0.12, 0.14, cols[Math.floor(rng() * cols.length)].multiplyScalar(0.85 + rng() * 0.3), 0, rng() * 3, 0);
  }
}
// fern (厥) for forest floors
function fern(x, z, seed) {
  const rng = mulberry32(seed);
  const y = G(x, z);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 6.28 + rng();
    const L = 0.5 + rng() * 0.5;
    kit.box('leaf', x + Math.cos(a) * L * 0.4, y + 0.22, z + Math.sin(a) * L * 0.4, L, 0.09, 0.2, C(0x3e6a34).multiplyScalar(0.85 + rng() * 0.3), 0, a, 0.35);
  }
}
// shrub willow / round bush tree for marsh edges
function marshTree(x, z, seed) {
  const rng = mulberry32(seed);
  const y = G(x, z);
  kit.box('solid', x, y + 1.0, z, 0.34, 2.0, 0.34, C(0x4a4036), (rng() - 0.5) * 0.15, 0, (rng() - 0.5) * 0.15);
  for (let i = 0; i < 10; i++) {
    let ux, uy, uz; do { ux = rng() * 2 - 1; uy = rng() * 2 - 1; uz = rng() * 2 - 1; } while (ux * ux + uy * uy + uz * uz > 1);
    const s = 0.7 + rng() * 0.5;
    kit.box('leaf', x + ux * 1.4, y + 2.4 + uy * 0.8, z + uz * 1.4, s, s * 0.8, s, C(0x55753a).multiplyScalar(0.75 + 0.35 * (uy + 1) / 2), 0, rng() * 3, 0);
  }
}
// blue hydrangea (紫阳花) along marsh & temple paths
function hydrangea(x, z, seed) {
  const rng = mulberry32(seed);
  const y = G(x, z);
  const col = [C(0x7a8ad8), C(0x9a7ad0), C(0xd8d0e8)][Math.floor(rng() * 3)];
  kit.box('solid', x, y + 0.3, z, 0.12, 0.6, 0.12, C(0x4a4a38));
  for (let i = 0; i < 8; i++) {
    let ux, uy, uz; do { ux = rng() * 2 - 1; uy = rng(); uz = rng() * 2 - 1; } while (ux * ux + uy * uy + uz * uz > 1);
    kit.box('leaf', x + ux * 0.5, y + 0.7 + uy * 0.4, z + uz * 0.5, 0.3, 0.22, 0.3, col.multiplyScalar(0.85 + rng() * 0.3), 0, rng() * 3, 0);
  }
}
function bush(x, z, s, seed, bloom = 0) {
  const rng = mulberry32(seed);
  const y = G(x, z), n = Math.round(14 * s * s) + 6;
  const flower = [C(0xc0607f), C(0xd88aa6), C(0xcf7894), C(0xe8dcd6)][Math.floor(rng() * 4)];
  for (let i = 0; i < n; i++) {
    let ux, uy, uz, l2;
    do { ux = rng() * 2 - 1; uy = rng(); uz = rng() * 2 - 1; l2 = ux * ux + uy * uy + uz * uz; } while (l2 > 1);
    const r = Math.pow(l2, 0.15), sz = (0.26 + rng() * 0.16) * Math.sqrt(s), sl = Math.sqrt(l2) || 1;
    const c = rng() < bloom * (0.4 + uy * 0.6) ? flower.clone().multiplyScalar(0.8 + rng() * 0.25) : C([0x3d5c33, 0x4a6a3a, 0x557540, 0x44633a][Math.floor(rng() * 4)]).multiplyScalar(0.7 + 0.4 * uy);
    kit.box('leaf', x + (ux / sl) * r * 1.05 * s, y + 0.12 + uy * 0.7 * s, z + (uz / sl) * r * 1.05 * s, sz, sz * 0.85, sz, c, 0, rng() * 3, 0);
  }
}
function rock(x, z, size, seed, opt = {}) {
  const rng = mulberry32(seed);
  const y = opt.y !== undefined ? opt.y : G(x, z);
  const base = opt.wet ? C(0x5a5a56) : (rng() > 0.5 ? COL.stone : C(0x847f76));
  const n = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const sx = size * (0.6 + rng() * 0.7), sy = size * (0.4 + rng() * 0.45), sz = size * (0.6 + rng() * 0.7);
    const ox = (rng() - 0.5) * size * 0.8, oz = (rng() - 0.5) * size * 0.8, yy = y - sy * 0.2 + (i === 0 ? 0 : rng() * sy * 0.3);
    kit.box('solid', x + ox, yy + sy * 0.5, z + oz, sx, sy, sz, base.clone().multiplyScalar(0.8 + rng() * 0.3), (rng() - 0.5) * 0.3, rng() * 3, (rng() - 0.5) * 0.3);
    if (opt.snow && i === 0) kit.box('solid', x + ox, yy + sy + 0.04, z + oz, sx * 0.85, 0.12, sz * 0.8, C(0xeef2f7));
    else if (!opt.wet && rng() > 0.5 && i === 0) kit.box('solid', x + ox, yy + sy + 0.02, z + oz, sx * 0.7, 0.08, sz * 0.6, COL.moss);
  }
}
// distant impostors (LOD1)
function impConifer(x, y, z, s, c) { kit.box('leaf', x, y + 2.6 * s, z, 1.9 * s, 3.4 * s, 1.9 * s, c); kit.box('leaf', x, y + 5.0 * s, z, 1.0 * s, 1.8 * s, 1.0 * s, c.clone().multiplyScalar(1.1)); }
function impCherry(x, y, z, s, c) { kit.box('solid', x, y + 1.2 * s, z, 0.5 * s, 2.4 * s, 0.5 * s, BARK[0]); kit.box('blossom', x, y + 3.2 * s, z, 4.2 * s, 2.2 * s, 4.2 * s, c); kit.box('blossom', x + 0.6 * s, y + 4.2 * s, z - 0.4 * s, 2.6 * s, 1.4 * s, 2.6 * s, c.clone().multiplyScalar(1.06)); }
function impHouse(x, y, z, yaw, w, d, roofC) { kit.push(x, y, z, yaw); kit.box('solid', 0, 1.4, 0, w, 2.8, d, COL.plasterShade); kit.box('solid', 0, 3.3, 0, w + 1.2, 1.2, d + 1.0, roofC); kit.box('solid', 0, 4.1, 0, w * 0.6, 0.6, d * 0.4, roofC); kit.pop(); }
