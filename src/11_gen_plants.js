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
  kit.spot('petal', x, gy + K.trunkLen * S + K.firstLen * S * 0.5, z);
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
    const N = Math.min(detail > 0.3 ? 26 : 10, Math.round(vol * (ancient ? 5.0 : 3.4) * detail));
    const cube = 0.43 / Math.sqrt(detail);
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
    // Weeping cherries hang a second, longer curtain of blossom from the
    // outer tips, which is what reads as "shidare" at a distance.
    if (K.strands && rng() < K.strands * 1.45) strand(t.p, RR(3.8, 8.2) * S);
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
    kit.box('needle', x, gy + ty * s, z, w * s, hh * s, w * s, c.clone().multiplyScalar(sh), 0, ry + i * 0.6, 0);
    if (snowy && i < 5) kit.box('solid', x, gy + (ty + hh * 0.5) * s, z, w * s * 0.86, 0.14 * s, w * s * 0.86, C(0xe9eef5), 0, ry + i * 0.6 + 0.2, 0);
  }
}
function broadleaf(x, z, s, seed, tint) {
  const rng = mulberry32(seed);
  const gy = G(x, z);
  const base = tint || C([0x6f9448, 0x7fa255, 0x5d8340, 0x8cab5c][Math.floor(rng() * 4)]);
  kit.box('solid', x, gy + 1.1 * s, z, 0.34 * s, 2.2 * s, 0.34 * s, C(0x5a4636));
  for (let i = 0; i < 8; i++) {
    let ux, uy, uz; do { ux = rng() * 2 - 1; uy = rng() * 2 - 1; uz = rng() * 2 - 1; } while (ux * ux + uy * uy + uz * uz > 1);
    const k = (0.9 + rng() * 0.6) * s, sh = 0.72 + 0.3 * (uy + 1) / 2;
    kit.box('foliage', x + ux * 1.5 * s, gy + (3.3 + uy) * s, z + uz * 1.5 * s, k, k * 0.85, k, base.clone().multiplyScalar(sh * (0.9 + rng() * 0.2)), 0, rng() * 3, 0);
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
  // High-fidelity bamboo: segmented culm with node rings, tapered diameter,
  // lateral branch pairs at each node, and cascading leaf fans.
  const rng = mulberry32(seed);
  const y = G(x, z);
  const H = 9 + rng() * 8;           // culm height 9–17
  const S = 0.9 + rng() * 0.3;       // size scalar
  // Lean: gentle arc in a random direction
  const leanDir = rng() * Math.PI * 2;
  const leanAmt = 0.04 + rng() * 0.06;
  const lx = Math.cos(leanDir) * leanAmt;
  const lz = Math.sin(leanDir) * leanAmt;
  // Culm colours: moso (yellow-green) or madake (cooler green)
  const culmHex = rng() > 0.45 ? 0x8aaa52 : 0x6e9448;
  const culmC = C(culmHex);
  const nodeC = C(culmHex).multiplyScalar(0.72);
  const segments = 7 + Math.floor(rng() * 4);   // 7–10 internodes
  const segH = H / segments;
  // Draw each internode as a tapered box
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const baseY = y + i * segH;
    const midY = baseY + segH * 0.5;
    const cx = x + lx * (i + 0.5) * segH;
    const cz = z + lz * (i + 0.5) * segH;
    const diam = (0.16 - t * 0.09) * S;         // tapers from base to tip
    const shade = 0.78 + t * 0.22;              // darker at base, brighter tip
    kit.box('solid', cx, midY, cz, diam, segH * 0.98, diam,
      culmC.clone().multiplyScalar(shade), lz, 0, -lx);
    // Node ring (slightly wider, darker band)
    if (i > 0) {
      const nx = x + lx * i * segH, nz = z + lz * i * segH;
      kit.box('solid', nx, baseY, nz, diam * 1.28, 0.055 * S, diam * 1.28, nodeC);
    }
    // Lateral branches from mid-culm upward
    if (i >= Math.floor(segments * 0.35)) {
      const branchCount = i >= Math.floor(segments * 0.6) ? 2 : 1;
      for (let b = 0; b < branchCount; b++) {
        const angle = leanDir + Math.PI * b + rng() * 0.6 - 0.3;
        const bLen = (0.9 + rng() * 1.1) * S * (0.5 + t * 0.7);
        const bx = x + lx * i * segH, bz = z + lz * i * segH;
        const tipX = bx + Math.cos(angle) * bLen;
        const tipZ = bz + Math.sin(angle) * bLen;
        const tipY = baseY + segH * (0.35 + rng() * 0.3) + bLen * 0.18;
        // Branch stem
        const bmx = (bx + tipX) * 0.5, bmy = (baseY + segH * 0.4 + tipY) * 0.5, bmz = (bz + tipZ) * 0.5;
        kit.box('solid', bmx, bmy, bmz, 0.05 * S, bLen * 1.05, 0.05 * S,
          nodeC, (tipY - baseY - segH * 0.4) / bLen * 0.8, angle, 0);
        // Leaf fan at branch tip: 3–5 narrow leaf blades
        const leafCount = 3 + Math.floor(rng() * 3);
        const leafC = C(rng() > 0.5 ? 0x8eb858 : 0x7aab50).multiplyScalar(0.82 + rng() * 0.22);
        for (let k = 0; k < leafCount; k++) {
          const la = angle + (k - leafCount * 0.5) * 0.32 + rng() * 0.15;
          const lLen = (0.55 + rng() * 0.55) * S;
          const lx2 = tipX + Math.cos(la) * lLen * 0.5;
          const lz2 = tipZ + Math.sin(la) * lLen * 0.5;
          const ly2 = tipY - lLen * 0.12;
          kit.box('leaf', lx2, ly2, lz2,
            lLen * 0.22, 0.06 * S, lLen,
            leafC.clone().multiplyScalar(0.88 + rng() * 0.24),
            -0.18 - rng() * 0.22, la, (rng() - 0.5) * 0.25);
        }
      }
    }
  }
  // Crown tuft at apex
  const topX = x + lx * H, topZ = z + lz * H, topY = y + H;
  const crownC = C(0x90c05a).multiplyScalar(0.85 + rng() * 0.18);
  for (let k = 0; k < 5; k++) {
    const a = leanDir + k * 1.257 + rng() * 0.4;
    const r = (0.5 + rng() * 0.6) * S;
    kit.box('leaf', topX + Math.cos(a) * r * 0.6, topY - rng() * 0.8, topZ + Math.sin(a) * r * 0.6,
      r * 0.2, 0.07 * S, r,
      crownC.clone().multiplyScalar(0.9 + rng() * 0.2),
      -0.25 - rng() * 0.2, a, (rng() - 0.5) * 0.3);
  }
}
function willow(x, z, seed, gy) {
  // High-fidelity weeping willow: gnarled tapered trunk, radiating primary
  // boughs, dense weeping curtains of cascading strands, layered crown foliage.
  const rng = mulberry32(seed);
  const y = gy === undefined ? G(x, z) : gy;
  const scale = 1.1 + rng() * 0.75;            // larger, more imposing
  const yaw = rng() * Math.PI * 2;
  // Slight lean
  const leanDir = yaw + rng() * 0.5;
  const leanAmt = 0.08 + rng() * 0.1;
  const lx = Math.cos(leanDir) * leanAmt * scale;
  const lz = Math.sin(leanDir) * leanAmt * scale;
  // Trunk: two segments for a slightly bent silhouette
  const trunkH = (3.2 + rng() * 1.4) * scale;
  const midTrunk = [x + lx * 0.4, y + trunkH * 0.45, z + lz * 0.4];
  const crown = [x + lx, y + trunkH, z + lz];
  const barkC = C(0x4a3d2e);
  const barkMid = C(0x584637);
  kit.beam('solid', x, y - 0.2, z, midTrunk[0], midTrunk[1], midTrunk[2],
    0.44 * scale, 0.38 * scale, barkC);
  kit.beam('solid', midTrunk[0], midTrunk[1], midTrunk[2], crown[0], crown[1], crown[2],
    0.38 * scale, 0.28 * scale, barkMid);
  // Crown canopy foliage blob (gives the tree its silhouette mass)
  const canopyC = C(0x6a8e44).multiplyScalar(0.8 + rng() * 0.22);
  const cw = (2.6 + rng() * 1.0) * scale, ch = (2.0 + rng() * 0.8) * scale;
  kit.box('foliage', crown[0], crown[1] + ch * 0.3, crown[2], cw, ch, cw * 0.92, canopyC);
  // Primary boughs: 5–7 radiating arms from crown
  const boughCount = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < boughCount; i++) {
    const a = yaw + i * (Math.PI * 2 / boughCount) + rng() * 0.4;
    const boughR = (1.5 + rng() * 1.4) * scale;
    const bx = crown[0] + Math.cos(a) * boughR;
    const bz = crown[2] + Math.sin(a) * boughR;
    const by = crown[1] + (rng() * 0.9 - 0.1) * scale;   // slight droop
    kit.beam('solid', crown[0], crown[1], crown[2], bx, by, bz,
      0.14 * scale, 0.09 * scale, barkMid);
    // Secondary foliage pad at bough tip
    const leafC = C([0x7da84e, 0x86b052, 0x6e9a44][i % 3]).multiplyScalar(0.84 + rng() * 0.2);
    kit.box('foliage', bx, by + 0.15 * scale, bz,
      (1.2 + rng() * 0.6) * scale, 0.55 * scale, (1.1 + rng() * 0.6) * scale,
      leafC, 0, a, 0);
    // Weeping curtain from each bough: 4–6 cascading strand pairs
    const strandCount = 4 + Math.floor(rng() * 3);
    for (let j = 0; j < strandCount; j++) {
      // Spread strands along the bough arm
      const t = 0.3 + j / strandCount * 0.65;
      const sx = lerp(crown[0], bx, t) + (rng() - 0.5) * 0.8 * scale;
      const sz = lerp(crown[2], bz, t) + (rng() - 0.5) * 0.8 * scale;
      const sy = lerp(crown[1], by, t) + rng() * 0.3 * scale;
      const strandLen = (1.8 + rng() * 2.2) * scale;
      // The weeping strand — a narrow tall box hanging down
      const strandC = C([0x8ab858, 0x7dac4e, 0x6b9840, 0x92c060][j % 4])
        .multiplyScalar(0.82 + rng() * 0.24);
      const strandW = (0.32 + rng() * 0.28) * scale;
      kit.box('willow', sx, sy - strandLen * 0.5, sz,
        strandW, strandLen, strandW * 0.6,
        strandC, -0.06 - rng() * 0.12, a + (rng() - 0.5) * 0.6, (rng() - 0.5) * 0.1);
      // A second shorter inner strand offset inward for layering
      if (rng() > 0.38) {
        const ix = sx + Math.cos(a) * (-0.3 - rng() * 0.3) * scale;
        const iz = sz + Math.sin(a) * (-0.3 - rng() * 0.3) * scale;
        const iLen = strandLen * (0.5 + rng() * 0.4);
        kit.box('willow', ix, sy - iLen * 0.5, iz,
          strandW * 0.75, iLen, strandW * 0.5,
          strandC.clone().multiplyScalar(0.9 + rng() * 0.15),
          -0.04 - rng() * 0.08, a + (rng() - 0.5) * 0.8, 0);
      }
    }
  }
}
function reedPlant(x, z, y, height, seed, kind = 'reed') {
  const rng = mulberry32(seed), width = 0.75 + rng() * 0.5;
  const palette = kind === 'straw' ? [0xc5b17e, 0xb79c67, 0xd1bf8c] : [0x8b9b62, 0xa7aa78, 0x728e54];
  kit.box(kind, x, y - 0.04, z, width, height, width, C(palette[Math.floor(rng() * palette.length)]), 0, rng() * Math.PI * 2, 0);
}
// lotus pads & marsh flowers
function lotus(x, z, seed, gy, lod = 0) {
  const rng = mulberry32(seed), y = Math.max(gy === undefined ? G(x, z) : gy, 0) + 0.08;
  const n = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const px = x + (rng() - 0.5) * 2.2, pz = z + (rng() - 0.5) * 2.2, s = 0.55 + rng() * 0.5, yaw = rng() * 3;
    const c = C(rng() > 0.3 ? 0x4a7a50 : 0x658e59);
    kit.box('leaf', px, y, pz, s, 0.045, s, c, 0, yaw, 0);
    if (lod === 0) kit.box('leaf', px, y + 0.005, pz, s * 0.87, 0.045, s * 0.87, c, 0, yaw + Math.PI / 4, 0);
    if (rng() > 0.67) {
      const fy = y + 0.35, flower = C(rng() > 0.5 ? 0xe9b6b6 : 0xf1d8cc);
      kit.box('solid', px, y + 0.15, pz, 0.025, 0.3, 0.025, C(0x638150));
      if (lod === 0) for (let j = 0; j < 5; j++) {
        const a = j * Math.PI * 2 / 5;
        kit.box('blossom', px + Math.cos(a) * 0.14, fy, pz + Math.sin(a) * 0.14, 0.24, 0.09, 0.16, flower, 0, -a, 0);
      } else kit.box('blossom', px, fy, pz, 0.38, 0.1, 0.38, flower);
      kit.box('solid', px, fy + 0.04, pz, 0.1, 0.06, 0.1, C(0xd6bb69));
    }
  }
}
// cattails (蒲草) — taller than reeds with dark-brown spike
function cattail(x, z, seed) {
  const rng = mulberry32(seed), y = G(x, z);
  for (let i = 0; i < 3; i++) reedPlant(x + (rng() - 0.5) * 0.7, z + (rng() - 0.5) * 0.7, y, 1.7 + rng() * 1.2, seed + i, 'cattail');
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
    kit.box('foliage', x + ux * 1.4, y + 2.4 + uy * 0.8, z + uz * 1.4, s, s * 0.8, s, C(0x55753a).multiplyScalar(0.75 + 0.35 * (uy + 1) / 2), 0, rng() * 3, 0);
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
    kit.box('foliage', x + (ux / sl) * r * 1.05 * s, y + 0.12 + uy * 0.7 * s, z + (uz / sl) * r * 1.05 * s, sz, sz * 0.85, sz, c, 0, rng() * 3, 0);
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
    kit.box('stone', x + ox, yy + sy * 0.5, z + oz, sx, sy, sz, base.clone().multiplyScalar(0.8 + rng() * 0.3), (rng() - 0.5) * 0.3, rng() * 3, (rng() - 0.5) * 0.3);
    if (opt.snow && i === 0) kit.box('solid', x + ox, yy + sy + 0.04, z + oz, sx * 0.85, 0.12, sz * 0.8, C(0xeef2f7));
    else if (!opt.wet && rng() > 0.5 && i === 0) kit.box('solid', x + ox, yy + sy + 0.02, z + oz, sx * 0.7, 0.08, sz * 0.6, COL.moss);
  }
}
// distant impostors (LOD1)
function impConifer(x, y, z, s, c) { kit.box('leaf', x, y + 2.6 * s, z, 1.9 * s, 3.4 * s, 1.9 * s, c); kit.box('leaf', x, y + 5.0 * s, z, 1.0 * s, 1.8 * s, 1.0 * s, c.clone().multiplyScalar(1.1)); }
function impCherry(x, y, z, s, c) { kit.box('solid', x, y + 1.2 * s, z, 0.5 * s, 2.4 * s, 0.5 * s, BARK[0]); kit.box('blossom', x, y + 3.2 * s, z, 4.2 * s, 2.2 * s, 4.2 * s, c); kit.box('blossom', x + 0.6 * s, y + 4.2 * s, z - 0.4 * s, 2.6 * s, 1.4 * s, 2.6 * s, c.clone().multiplyScalar(1.06)); }
function impHouse(x, y, z, yaw, w, d, roofC) { kit.push(x, y, z, yaw); kit.box('solid', 0, 1.4, 0, w, 2.8, d, COL.plasterShade); kit.box('solid', 0, 3.3, 0, w + 1.2, 1.2, d + 1.0, roofC); kit.box('solid', 0, 4.1, 0, w * 0.6, 0.6, d * 0.4, roofC); kit.pop(); }
