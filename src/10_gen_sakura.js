// Original Sakura World rules, kept independent of the rendering engine.
// A profile owns terrain, biome thresholds and landmark selection.
const SAKURA_BIOME_NAMES = [
  ['海', 'Coast & sea'], ['浜', 'Pine beach'], ['里山', 'Satoyama'], ['桜', 'Sakura grove'], ['棚田', 'Rice terraces'],
  ['城下町', 'Castle town'], ['杉山', 'Cedar mountains'], ['竹林', 'Bamboo forest'], ['雪山', 'Snow peaks'], ['湖', 'Lake'], ['川', 'River'],
  ['草原', 'Meadow'], ['湿地', 'Marshland'], ['高原', 'Pine highland'],
];

/** large-scale fields (no carving) */
const SAKURA_FIELDS = { C: 0, E: 0, Hu: 0, V: 0, L: 0, R: 0, land: 0, mt: 0, hills: 0, detail: 0, rid: 0, sak: 0, bam: 0 };
function sakuraFields(x, z, o = SAKURA_FIELDS) {
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
function sakuraNatural(x, z, o = {}) {
  const f = sakuraFields(x, z);
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


function sakuraClassify(o, h, n, x, z) {
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
function sakuraAnchor(a, n, r, roll, rd) {
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
}
