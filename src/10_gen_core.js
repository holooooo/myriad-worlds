// =====================================================================
//  GEN — deterministic, dependency-free world generator.
//  Runs inside Web Workers (chunk building) and on the main thread
//  (ground queries, biome lookup, finders). Same seed => same world.
// =====================================================================
var GEN = (function () {
'use strict';

// ---------------------------------------------------------------------
//  Math, hashing, noise
// ---------------------------------------------------------------------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  s = String(s);
  if (/^-?\d+$/.test(s)) return (parseInt(s, 10) | 0) || 1;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h | 0 || 1;
}
let SEED = 1;
const SALT = new Int32Array(64);
function h2(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + s) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function h3(x, y, z, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1440662683) + s) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vn(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function vn3(x, y, z, s) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (i, j, k) => h3(xi + i, yi + j, zi + k, s);
  const x00 = lerp(l(0, 0, 0), l(1, 0, 0), u), x10 = lerp(l(0, 1, 0), l(1, 1, 0), u);
  const x01 = lerp(l(0, 0, 1), l(1, 0, 1), u), x11 = lerp(l(0, 1, 1), l(1, 1, 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w) * 2 - 1;
}
function fbm(x, y, o, k) {
  let s = 0, a = 0.5, f = 1, n = 0;
  const salt = SALT[k & 63];
  for (let i = 0; i < o; i++) { s += a * vn(x * f + i * 17.3, y * f - i * 9.1, salt + i * 7919); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
function ridged(x, y, o, k) {
  let s = 0, a = 0.5, f = 1, n = 0, w = 1;
  const salt = SALT[k & 63];
  for (let i = 0; i < o; i++) {
    let v = 1 - Math.abs(vn(x * f + i * 31.7, y * f + i * 11.3, salt + i * 104729));
    v *= v; v *= w; w = clamp(v * 1.7, 0, 1);
    s += v * a; n += a; a *= 0.5; f *= 2.07;
  }
  return s / n;
}

// ---------------------------------------------------------------------
//  Tiny vector / quaternion / matrix helpers (three.js conventions)
// ---------------------------------------------------------------------
class V3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new V3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  normalize() { const l = this.length() || 1; return this.multiplyScalar(1 / l); }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  crossVectors(a, b) { const x = a.y * b.z - a.z * b.y, y = a.z * b.x - a.x * b.z, z = a.x * b.y - a.y * b.x; return this.set(x, y, z); }
  applyAxisAngle(ax, ang) { return this.applyQuaternion(qAxis(ax.x, ax.y, ax.z, ang)); }
  applyQuaternion(q) {
    const x = this.x, y = this.y, z = this.z, qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
    this.x = x + qw * tx + qy * tz - qz * ty;
    this.y = y + qw * ty + qz * tx - qx * tz;
    this.z = z + qw * tz + qx * ty - qy * tx;
    return this;
  }
}
const UP = new V3(0, 1, 0);
function qEuler(x, y, z) {
  const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2), s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
  return [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3];
}
function qAxis(ax, ay, az, a) { const s = Math.sin(a / 2); return [ax * s, ay * s, az * s, Math.cos(a / 2)]; }
function qMul(a, b) {
  return [a[0] * b[3] + a[3] * b[0] + a[1] * b[2] - a[2] * b[1], a[1] * b[3] + a[3] * b[1] + a[2] * b[0] - a[0] * b[2],
    a[2] * b[3] + a[3] * b[2] + a[0] * b[1] - a[1] * b[0], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
}
function qUnit(f, t) {
  let r = f.x * t.x + f.y * t.y + f.z * t.z + 1, q;
  if (r < 1e-8) { r = 0; q = Math.abs(f.x) > Math.abs(f.z) ? [-f.y, f.x, 0, r] : [0, -f.z, f.y, r]; }
  else q = [f.y * t.z - f.z * t.y, f.z * t.x - f.x * t.z, f.x * t.y - f.y * t.x, r];
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}
function m4Compose(te, px, py, pz, q, sx, sy, sz) {
  const x = q[0], y = q[1], z = q[2], w = q[3];
  const x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  te[0] = (1 - (yy + zz)) * sx; te[1] = (xy + wz) * sx; te[2] = (xz - wy) * sx; te[3] = 0;
  te[4] = (xy - wz) * sy; te[5] = (1 - (xx + zz)) * sy; te[6] = (yz + wx) * sy; te[7] = 0;
  te[8] = (xz + wy) * sz; te[9] = (yz - wx) * sz; te[10] = (1 - (xx + yy)) * sz; te[11] = 0;
  te[12] = px; te[13] = py; te[14] = pz; te[15] = 1;
  return te;
}
function m4Mul(a, b, out) {
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    out[r + c * 4] = a[r] * b[c * 4] + a[r + 4] * b[c * 4 + 1] + a[r + 8] * b[c * 4 + 2] + a[r + 12] * b[c * 4 + 3];
  }
  return out;
}
const m4I = () => { const m = new Float64Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; };

// colours: sRGB hex -> linear rgb
class Col {
  constructor(r = 1, g = 1, b = 1) { this.r = r; this.g = g; this.b = b; }
  static lin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  setHex(h) { this.r = Col.lin(((h >> 16) & 255) / 255); this.g = Col.lin(((h >> 8) & 255) / 255); this.b = Col.lin((h & 255) / 255); return this; }
  copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; }
  clone() { return new Col(this.r, this.g, this.b); }
  multiplyScalar(s) { this.r *= s; this.g *= s; this.b *= s; return this; }
  lerp(c, t) { this.r += (c.r - this.r) * t; this.g += (c.g - this.g) * t; this.b += (c.b - this.b) * t; return this; }
  setScalar(s) { this.r = this.g = this.b = s; return this; }
}
const HEXC = new Map();
function C(hex, k = 1) { let c = HEXC.get(hex); if (!c) { c = new Col().setHex(hex); HEXC.set(hex, c); } return c.clone().multiplyScalar(k); }

// ---------------------------------------------------------------------
//  World fields
// ---------------------------------------------------------------------
const B = { OCEAN: 0, BEACH: 1, SATO: 2, SAKURA: 3, PADDY: 4, TOWN: 5, CEDAR: 6, BAMBOO: 7, SNOW: 8, LAKE: 9, RIVER: 10, MEADOW: 11, MARSH: 12, PINE: 13 };
const BIOME_NAMES = [
  ['海', 'Coast & sea'], ['浜', 'Pine beach'], ['里山', 'Satoyama'], ['桜', 'Sakura grove'], ['棚田', 'Rice terraces'],
  ['城下町', 'Castle town'], ['杉山', 'Cedar mountains'], ['竹林', 'Bamboo forest'], ['雪山', 'Snow peaks'], ['湖', 'Lake'], ['川', 'River'],
  ['草原', 'Meadow'], ['湿地', 'Marshland'], ['高原', 'Pine highland'],
];
const RAIL_SP = 1500;
let anchorCache = new Map(), railKnots = new Map();
function setSeed(seed) {
  SEED = hashStr(seed);
  const r = mulberry32(SEED);
  for (let i = 0; i < 64; i++) SALT[i] = (r() * 4294967296) | 0;
  anchorCache = new Map(); railKnots = new Map();
}
setSeed('sakura');

/** large-scale fields (no carving) */
const F = { C: 0, E: 0, Hu: 0, V: 0, L: 0, R: 0, land: 0, mt: 0, hills: 0, detail: 0, rid: 0, sak: 0, bam: 0 };
function fields(x, z, o = F) {
  const wx = x + fbm(x * 0.0008, z * 0.0008, 3, 1) * 300, wz = z + fbm(x * 0.0008 + 7.3, z * 0.0008 - 3.1, 3, 2) * 300;
  o.C = fbm(wx * 0.0006, wz * 0.0006, 5, 3) + 0.2;
  o.E = fbm(wx * 0.00095, wz * 0.00095, 4, 4) + 0.02;
  o.Hu = fbm(x * 0.0013, z * 0.0013, 3, 5);
  o.V = fbm(x * 0.0011, z * 0.0011, 3, 6);
  o.L = fbm(wx * 0.0032, wz * 0.0032, 3, 7);
  o.R = fbm(wx * 0.00115, wz * 0.00115, 4, 8);
  o.land = smoothstep(-0.1, 0.08, o.C);
  o.mt = smoothstep(0.08, 0.58, o.E) * smoothstep(0.02, 0.28, o.C);
  o.hills = fbm(x * 0.005, z * 0.005, 4, 9);
  o.detail = fbm(x * 0.03, z * 0.03, 2, 10);
  o.rid = ridged(wx * 0.002, wz * 0.002, 5, 11);
  o.sak = fbm(x * 0.006, z * 0.006, 3, 12);
  o.bam = fbm(x * 0.0045, z * 0.0045, 3, 13);
  return o;
}

/** natural terrain (no rail, no structure pads); writes masks into o */
const NS = { h: 0, river: 0, valley: 0, lake: 0, town: 0, paddy: 0, plate: 0, beach: 0, path: 0, mt: 0, land: 0, snowLine: 70 };
function natural(x, z, o = NS) {
  const f = fields(x, z);
  const lowland = 2.6 + (f.hills + 0.55) * 7.0 + f.detail * 0.7;
  const mtn = lowland + 6 + f.rid * f.rid * 165 + f.hills * 12 + Math.pow(f.rid, 7) * 90;
  const mt = f.mt * f.mt * (3 - 2 * f.mt);
  let h = lerp(lowland, mtn, mt);
  const sea = -12 + f.hills * 5 + f.detail;
  h = lerp(sea, h, f.land);
  o.land = f.land; o.mt = mt;
  // castle town: broad flat terraces
  const town = smoothstep(0.26, 0.4, f.V) * smoothstep(0.55, 0.85, f.land) * (1 - smoothstep(0.04, 0.22, mt));
  if (town > 0) h = lerp(h, 2.4 + f.hills * 1.5 + f.detail * 0.2, town * 0.94);
  o.town = town;
  // rice terraces: contour plates on humid gentle land
  const pw = smoothstep(0.12, 0.3, f.Hu) * smoothstep(0.6, 0.9, f.land) * (1 - town) * (1 - smoothstep(0.1, 0.3, mt)) * smoothstep(1.2, 3, h);
  o.paddy = 0; o.plate = 0;
  if (pw + f.detail * 0.12 > 0.55 && h < 14) {
    const st = 1.0;
    const plate = Math.floor(h / st) * st + 0.5;
    o.paddy = 1; o.plate = plate; o.prePaddy = h; h = plate;
  } else o.prePaddy = h;
  // rivers
  const rv = Math.abs(f.R), rw = 0.021;
  const valley = (1 - smoothstep(rw, rw * 5.5, rv)) * f.land * (1 - smoothstep(60, 115, h));
  const core = (1 - smoothstep(rw * 0.42, rw * 1.15, rv)) * f.land * (1 - smoothstep(60, 115, h));
  if (valley > 0) h = lerp(h, Math.min(h, 1.4 + Math.max(0, h - 1.4) * 0.28), valley * 0.85);
  if (core > 0) { h = lerp(h, -1.9 + f.detail * 0.3, core); if (core > 0.3) o.paddy = 0; }
  o.river = core; o.valley = valley;
  // lakes
  const lk = smoothstep(-0.36, -0.54, f.L) * smoothstep(0.5, 0.9, f.land) * (1 - mt) * (1 - town * 0.6);
  if (lk > 0) { h = h - lk * (h + 3.4 - f.detail * 0.6); if (lk > 0.25) o.paddy = 0; }
  o.lake = lk;
  // farm lanes
  const pth = Math.abs(fbm(x * 0.0042, z * 0.0042, 3, 14));
  o.path = (1 - smoothstep(0.006, 0.013, pth)) * (1 - town) * (1 - smoothstep(0.1, 0.25, mt)) * f.land * (h > 0.6 ? 1 : 0);
  if (o.path > 0 && o.paddy) { o.paddy = 0; }
  o.beach = (1 - smoothstep(0.03, 0.2, f.C)) * (h > -0.4 && h < 2.4 ? 1 : 0);
  o.snowLine = 54 + f.detail * 8 + fbm(x * 0.01, z * 0.01, 2, 15) * 9;
  o.h = h;
  o.f = f;
  return o;
}

// ---------------------------------------------------------------------
//  Railways: infinite lines along +x, with smoothed grade
// ---------------------------------------------------------------------
function railZ(n, x) {
  const ph = h2(n, 77, SALT[20]) * 6.28, ps = h2(n, 91, SALT[21]) * 6.28;
  return n * RAIL_SP + 420 + Math.sin(x * 0.0019 + ph) * 150 + Math.sin(x * 0.0051 + ps) * 55;
}
function railDZ(n, x) {
  const ph = h2(n, 77, SALT[20]) * 6.28, ps = h2(n, 91, SALT[21]) * 6.28;
  return Math.cos(x * 0.0019 + ph) * 150 * 0.0019 + Math.cos(x * 0.0051 + ps) * 55 * 0.0051;
}
const RK = 80;
function railKnot(n, i) {
  const k = n + ':' + i;
  let v = railKnots.get(k);
  if (v === undefined) {
    let s = 0;
    for (const d of [-60, -30, 0, 30, 60]) { const x = i * RK + d; s += Math.max(natural(x, railZ(n, x), {}).h, 0); }
    v = clamp(s / 5 + 1.6, 3.2, 58);
    railKnots.set(k, v);
    if (railKnots.size > 20000) railKnots.clear();
  }
  return v;
}
function railH(n, x) {
  const i = Math.floor(x / RK), t = x / RK - i;
  const p0 = railKnot(n, i - 1), p1 = railKnot(n, i), p2 = railKnot(n, i + 1), p3 = railKnot(n, i + 2);
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
function railLine(z) { return Math.round((z - 420) / RAIL_SP); }

// ---------------------------------------------------------------------
//  Structures: one candidate per 176 m region, typed by its biome
// ---------------------------------------------------------------------
const REG = 176;
function anchor(rx, rz) {
  const k = rx + ',' + rz;
  let a = anchorCache.get(k);
  if (a) return a;
  const r = mulberry32((h2(rx, rz, SALT[30]) * 4294967296) | 0);
  const x = rx * REG + 28 + r() * (REG - 56), z = rz * REG + 28 + r() * (REG - 56);
  const n = natural(x, z, {});
  a = { x, z, type: null, h: Math.round(n.h * 4) / 4, r: 0, seed: (r() * 1e9) | 0, yaw: r() * Math.PI * 2 };
  const nl = railLine(z), rd = Math.abs(z - railZ(nl, x));
  const roll = r();
  if (rd < 34) a.type = null;
  else if (n.h < -0.5) {
    if (n.h > -5 && n.h < -0.8 && n.f.C > -0.12 && n.lake < 0.2 && n.river < 0.2) { a.type = 'seaTorii'; a.r = 0; }
    else if (n.lake > 0.4 && n.h > -2.6) { a.type = 'pavilion'; a.r = 0; }
  } else if (n.river > 0.25) a.type = null;
  else if (n.h > n.snowLine - 8 && n.h < n.snowLine + 30 && roll < 0.55) { a.type = 'hut'; a.r = 9; }
  else if (n.town > 0.6) { a.type = roll < 0.45 ? 'castle' : 'templeTown'; a.r = a.type === 'castle' ? 24 : 15; }
  else if (n.mt > 0.18 && n.h < n.snowLine - 6) { a.type = roll < 0.6 ? 'temple' : 'shrine'; a.r = a.type === 'temple' ? 21 : 13; }
  else if (n.beach > 0.3 && n.h > 0.5 && n.h < 6) { a.type = 'lighthouse'; a.r = 7; }
  else if (n.paddy || n.f.Hu > 0.12) { a.type = 'farm'; a.r = 13; }
  else if (n.h > 1 && n.lake < 0.1) { a.type = roll < 0.5 ? 'farm' : (roll < 0.8 ? 'shrine' : 'teahouse'); a.r = a.type === 'farm' ? 13 : (a.type === 'shrine' ? 13 : 10); }
  if (a.type && a.r && (n.h < 0.8 || n.lake > 0.2)) a.type = null;
  if (a.type === 'temple' || a.type === 'shrine') a.yaw = Math.round(a.yaw / (Math.PI / 2)) * (Math.PI / 2) + (r() - 0.5) * 0.5;
  anchorCache.set(k, a);
  if (anchorCache.size > 6000) anchorCache.clear();
  return a;
}
function nearAnchors(x, z, out) {
  out.length = 0;
  const rx = Math.floor(x / REG), rz = Math.floor(z / REG);
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const a = anchor(rx + i, rz + j);
    if (a.type) out.push(a);
  }
  return out;
}

// ---------------------------------------------------------------------
//  Full sample: natural + town streets + rail embankments + pads
// ---------------------------------------------------------------------
const SS = { h: 0, biome: 2, path: 0, street: 0, rail: 0, railH: 0, railN: 0, tunnel: 0, pad: 0, padType: null, paddy: 0, plate: 0, river: 0, lake: 0, town: 0, beach: 0, mt: 0, snow: 0, nat: 0, snowLine: 70, land: 1, sak: 0, bam: 0, Hu: 0 };
const _anc = [];
function sample(x, z, o = SS) {
  const n = natural(x, z);
  let h = n.h;
  o.nat = h; o.paddy = n.paddy; o.plate = n.plate; o.river = n.river; o.lake = n.lake; o.town = n.town; o.valley = n.valley;
  o.beach = n.beach; o.mt = n.mt; o.path = n.path; o.snowLine = n.snowLine; o.land = n.land;
  o.sak = n.f.sak; o.bam = n.f.bam; o.Hu = n.f.Hu;
  // town street grid
  o.street = 0;
  if (n.town > 0.55 && h > 0.3) {
    const gx = ((x % 34) + 34) % 34, gz = ((z % 26) + 26) % 26;
    if (gx < 3.6 || gz < 3.2) o.street = 1;
  }
  // rail
  o.rail = 0; o.tunnel = 0;
  const ln = railLine(z), rz = railZ(ln, x), rd = Math.abs(z - rz) / Math.sqrt(1 + railDZ(ln, x) ** 2);
  if (rd < 16) {
    const rh = railH(ln, x);
    o.railH = rh; o.railN = ln;
    if (h > rh + 11) o.tunnel = 1;
    else {
      const w = 1 - smoothstep(3.2, 10 + Math.abs(h - rh) * 0.6, rd);
      if (h > rh - 2.2 || rd < 4.4) {
        if (h > rh - 2.2) h = lerp(h, rh - 0.35, w);
        o.rail = 1 - smoothstep(2.2, 2.8, rd);
      }
      if (o.rail > 0 || w > 0.5) { o.paddy = 0; o.path = 0; o.street = 0; }
    }
  }
  // structure pads
  o.pad = 0; o.padType = null;
  nearAnchors(x, z, _anc);
  for (const a of _anc) {
    if (!a.r) continue;
    const d = Math.hypot(x - a.x, z - a.z);
    const R = a.r + 7;
    if (d < R) {
      const m = 1 - smoothstep(a.r * 0.82, R, d);
      h = lerp(h, a.h, m);
      if (m > o.pad) { o.pad = m; o.padType = a.type; }
      if (m > 0.3) { o.paddy = 0; o.path = m > 0.6 ? 0 : o.path; }
    }
  }
  if (o.paddy) h = o.plate;
  o.h = h;
  o.snow = h > n.snowLine ? 1 : 0;
  o.biome = classify(o, h, n, x, z);
  // biome wobble may claim a paddy cell for another biome: release the terrace flattening
  if (o.paddy && o.biome !== B.PADDY) {
    o.h = n.prePaddy !== undefined ? n.prePaddy : o.nat;   // smooth pre-terrace height
    o.paddy = 0; o.plate = 0;
  }
  return o;
}
// biome-boundary noise: wobble every threshold with large-scale noise so borders curve
function bnoise(x, z, amp) { return vn(x * 0.004 + 31.7, z * 0.004 - 12.3, SALT[25]) * amp; }
function classify(o, h, n, x, z) {
  if (h < -0.15) {
    if (o.lake > 0.3) return B.LAKE;
    if (o.river > 0.4) return B.RIVER;
    if (n.land < 0.6) return B.OCEAN;
    return o.lake > o.river ? B.LAKE : B.RIVER;
  }
  if (h > n.snowLine - 14 + bnoise(x, z, 14)) return B.SNOW;
  if (o.town > 0.5) return B.TOWN;
  if (o.paddy) return B.PADDY;
  if (o.beach > 0.25 - bnoise(x, z, 0.12)) return B.BEACH;
  // marsh: flat wet lowlands near water tables
  if (h < 3.2 + bnoise(x, z, 0.6) && o.lake + o.valley > 0.055) return B.MARSH;
  if (n.mt > 0.42 + bnoise(x, z, 0.06)) return B.CEDAR;
  // pine highland: mid-altitude cool slopes
  if (h > 20 + bnoise(x, z, 8) && n.mt > 0.2) return B.PINE;
  if (o.bam > 0.24 + bnoise(x, z, 0.06) && o.Hu > -0.1) return B.BAMBOO;
  if (o.sak > 0.2 + bnoise(x, z, 0.06)) return B.SAKURA;
  // meadow: open grass on gentle humid land (also claims some humid plate bands)
  if (o.Hu > 0.18 + bnoise(x, z, 0.07) && n.mt < 0.12 && h < 20) return B.MEADOW;
  return B.SATO;
}
function heightAt(x, z) { return sample(x, z, {}).h; }
