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
const SALT = new Int32Array(96);
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
const BIOME_NAMES = [];
const RAIL_SP = 1500;
let anchorCache = new Map(), railKnots = new Map();
function setSeed(seed) {
  SEED = hashStr(seed);
  const r = mulberry32(SEED);
  for (let i = 0; i < SALT.length; i++) SALT[i] = (r() * 4294967296) | 0;
  anchorCache = new Map(); railKnots = new Map();
}
setSeed('sakura');

/** Terrain rules are selected by the active world profile. */
const NS = {};
function natural(x, z, o = NS) { return WORLD_PROFILE.natural(x, z, o); }

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
    let s = 0, water = -Infinity;
    for (const d of [-60, -30, 0, 30, 60]) {
      const x = i * RK + d, terrain = natural(x, railZ(n, x), {});
      s += Math.max(terrain.h, terrain.waterLevel || 0);
      if (terrain.waterLevel !== null && !terrain.paddy) water = Math.max(water, terrain.waterLevel + 2.2);
    }
    v = Math.max(clamp(s / 5 + 1.6, 3.2, 100), water);
    railKnots.set(k, v);
    if (railKnots.size > 20000) railKnots.clear();
  }
  return v;
}
function railH(n, x) {
  const i = Math.floor(x / RK), t = x / RK - i;
  const p0 = railKnot(n, i - 1), p1 = railKnot(n, i), p2 = railKnot(n, i + 1), p3 = railKnot(n, i + 2);
  const t2 = t * t, t3 = t2 * t;
  const grade = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  const surface = natural(x, railZ(n, x), {});
  return surface.waterLevel !== null && !surface.paddy ? Math.max(grade, surface.waterLevel + 2.2) : grade;
}
function railLine(z) { return Math.round((z - 420) / RAIL_SP); }
// Conservative clearance for an asset footprint, including trackside space.
function railClearance(x, z, radius = 0) {
  const line = railLine(z);
  let clearance = Infinity;
  for (const dx of [-radius, -radius * 0.5, 0, radius * 0.5, radius]) {
    const px = x + dx, d = Math.abs(z - railZ(line, px)) / Math.sqrt(1 + railDZ(line, px) ** 2);
    clearance = Math.min(clearance, d - radius - 7);
  }
  return clearance;
}


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
  WORLD_PROFILE.anchor(a, n, r, roll, rd);
  if (a.type && railClearance(a.x, a.z, Math.max(a.r, 8) + 3) < 0) { a.type = null; a.r = 0; }
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

// Navigation reads the same waterfront footprints that the asset builders emit.
// Dry building pads are already handled by sample(); a lake is not a building pad.
const waterfrontAnchors = [], pavilionBridges = new WeakMap();
function pavilionBridge(a) {
  if (pavilionBridges.has(a)) return pavilionBridges.get(a);
  let best = null;
  for (let k = 0; k < 16 && !best; k++) for (let d = 6; d < 48; d += 2) {
    const ang = (k / 16) * Math.PI * 2;
    if (sample(a.x + Math.cos(ang) * d, a.z + Math.sin(ang) * d, {}).h > 0.4) {
      if (!best || d < best.d) best = { d, ang };
      break;
    }
  }
  if (best && best.d < 46) {
    const dx = Math.cos(best.ang), dz = Math.sin(best.ang);
    best = { ax: a.x + dx * 3.2, az: a.z + dz * 3.2,
      bx: a.x + dx * (best.d + 1.5), bz: a.z + dz * (best.d + 1.5), arch: Math.min(2.2, best.d * 0.12) };
  } else best = null;
  pavilionBridges.set(a, best);
  return best;
}
function structureAt(x, z, padding = 0) {
  padding = Number.isFinite(padding) ? Math.max(0, padding) : 0;
  nearAnchors(x, z, waterfrontAnchors);
  for (const a of waterfrontAnchors) {
    if (a.type !== 'waterPavilion' && a.type !== 'pavilion' && a.type !== 'seaTorii') continue;
    const dx = x - a.x, dz = z - a.z, cy = Math.cos(a.yaw), sy = Math.sin(a.yaw);
    const lx = cy * dx - sy * dz, lz = sy * dx + cy * dz;
    if (a.type === 'waterPavilion') {
      if (Math.abs(lx) <= 3.4 + padding && Math.abs(lz) <= 3.4 + padding) return a;
      if (!a.r && Math.abs(lx) <= 1.05 + padding && Math.abs(lz - 6.4) <= 3.75 + padding) return a;
    } else if (a.type === 'seaTorii') {
      const post = 3.6 * 2.1 / 2, half = 0.36 * 2.1 * 1.3 / 2;
      if (Math.abs(Math.abs(lx) - post) <= half + padding && Math.abs(lz) <= half + padding) return a;
    } else {
      if (Math.abs(lx) <= 3.2 + padding && Math.abs(lz) <= 3.2 + padding) return a;
      const bridge = pavilionBridge(a);
      if (bridge) {
        const vx = bridge.bx - bridge.ax, vz = bridge.bz - bridge.az, length = Math.hypot(vx, vz);
        const px = x - (bridge.ax + bridge.bx) / 2, pz = z - (bridge.az + bridge.bz) / 2;
        // arcBridge extends its deck by 0.5 m at both ends and its rails by 0.27 m.
        if (Math.abs((px * vx + pz * vz) / length) <= length / 2 + 0.5 + padding &&
            Math.abs((px * vz - pz * vx) / length) <= 1.47 + padding) return a;
      }
    }
  }
  return null;
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
  o.waterLevel = n.waterLevel == null ? null : n.waterLevel; o.waterKind = n.waterKind || null;
  o.waterTint = n.waterTint || null; o.waterId = n.waterId || null; o.waterClarity = n.waterClarity || 0; o.lakeLevel = n.lakeLevel == null ? null : n.lakeLevel;
  o.beach = n.beach; o.mt = n.mt; o.path = n.path; o.snowLine = n.snowLine; o.land = n.land;
  o.sak = n.f.sak; o.bam = n.f.bam; o.Hu = n.f.Hu;
  // town street grid
  o.street = 0;
  if (n.town > 0.55 && h > 0.3) {
    const gx = ((x % 34) + 34) % 34, gz = ((z % 26) + 26) % 26;
    if (gx < 3.6 || gz < 3.2) o.street = 1;
  }
  // Rail carving is applied after structure pads so no pad can refill a cut.
  o.rail = 0; o.tunnel = 0; o.railCut = 0;
  const ln = railLine(z), rz = railZ(ln, x), rd = Math.abs(z - rz) / Math.sqrt(1 + railDZ(ln, x) ** 2);
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
  if (rd < 40) {
    const rh = railH(ln, x); o.railH = rh; o.railN = ln;
    const cut = h > rh - 0.65, shoulder = Math.min(36, 10 + Math.max(0, h - rh) * 0.45);
    const w = 1 - smoothstep(4.6, shoulder, rd);
    if (cut) { h = lerp(h, rh - 0.65, w); o.railCut = w; if (w > 0.001) o.paddy = 0; }
    o.rail = 1 - smoothstep(2.5, 4.6, rd);
    if (o.rail > 0 || w > 0.5) { o.paddy = 0; o.path = 0; o.street = 0; }
  }
  o.h = h;
  o.snow = h > n.snowLine ? 1 : 0;
  if (o.waterLevel !== null && (h >= o.waterLevel || o.waterKind === 'paddy' && !o.paddy)) {
    o.waterLevel = null; o.waterKind = null; o.waterId = null;
  }
  o.biome = classify(o, h, n, x, z);
  // biome wobble may claim a paddy cell for another biome: release the terrace flattening
  if (o.paddy && o.biome !== B.PADDY) {
    o.h = n.prePaddy !== undefined ? n.prePaddy : o.nat;   // smooth pre-terrace height
    o.paddy = 0; o.plate = 0;
  }
  if (o.waterLevel !== null && (o.h >= o.waterLevel || o.waterKind === 'paddy' && !o.paddy)) {
    o.waterLevel = null; o.waterKind = null; o.waterId = null;
  }
  return o;
}
function waterAt(x, z) {
  const s = sample(x, z, {});
  if (s.waterLevel === null) return null;
  const kind = s.waterKind || 'river', hex = WORLD_PROFILE.water[kind] || WORLD_PROFILE.water.shallow;
  const c = s.waterTint ? null : C(hex);
  return { level: s.waterLevel, depth: s.waterLevel - s.h, kind, id: s.waterId || kind,
    tint: s.waterTint || [c.r, c.g, c.b], clarity: s.waterClarity, bed: s.h };
}
// biome-boundary noise: wobble every threshold with large-scale noise so borders curve
function bnoise(x, z, amp) { return vn(x * 0.004 + 31.7, z * 0.004 - 12.3, SALT[25]) * amp; }
function classify(o, h, n, x, z) { return WORLD_PROFILE.classify(o, h, n, x, z); }
function heightAt(x, z) { return sample(x, z, {}).h; }
