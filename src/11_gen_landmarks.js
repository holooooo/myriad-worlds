// Landmark layouts are shared by near and far meshes. Distance only removes
// joinery and window bars; keeps, side towers and verandas remain in place.
function landmarkRoof(y, w, d, o = {}) {
  return roof(y, w, d, {
    type: o.type || 'hip', layers: kit.detail > 0.6 ? 8 : kit.detail > 0.3 ? 5 : 3,
    over: o.over === undefined ? 1.1 : o.over, rise: o.rise || 1.5, upturn: o.upturn || 0.25,
    col: o.col || C(0x3c4650), colB: C(0x323b44), edge: C(0x626d74), gableCol: COL.plaster,
    tileEnds: kit.detail > 0.6, hips: kit.detail > 0.3, rafters: false, curve: 1.7,
  });
}
function castleStoreyLocal(y, w, d, h, top = false) {
  kit.box('solid', 0, y + h / 2, 0, w, h, d, COL.plaster);
  kit.box('solid', 0, y + 0.28, 0, w + 0.08, 0.56, d + 0.08, C(0x3e3e3b));
  const count = kit.detail > 0.3 ? Math.max(2, Math.round(w / 2.5)) : 2;
  for (let i = 0; i < count; i++) for (const side of [-1, 1]) {
    const x = -w / 2 + w * (i + 0.5) / count, z = side * (d / 2 + 0.015);
    kit.box('solid', x, y + h * 0.57, z, 0.85, h * 0.32, 0.04, C(0x293332));
    kit.box('glow', x, y + h * 0.57, z + side * 0.025, 0.55, h * 0.26, 0.025, C(0xd1c7ad));
    if (kit.detail > 0.6) kit.box('solid', x, y + h * 0.57, z + side * 0.05, 0.045, h * 0.3, 0.025, COL.woodDark);
  }
  for (const side of [-1, 1]) kit.box('solid', side * (w / 2 + 0.02), y + h * 0.58, 0, 0.06, 0.65, d * 0.52, C(0x353d3c));
  return landmarkRoof(y + h, w, d, { type: top ? 'irimoya' : 'hip', rise: top ? 1.8 : 1.45, over: 1.3 });
}
function castle(x, y, z, yaw) {
  kit.push(x, y, z, yaw);
  const n = kit.detail > 0.6 ? 7 : 3, baseH = 6.4;
  for (let i = 0; i < n; i++) {
    const t = i / n, w = lerp(22, 16, t), d = lerp(18.5, 14.1, t);
    kit.box('solid', -1.5, (i + 0.5) * baseH / n, -1.0, w, baseH / n + 0.04, d, C(i % 2 ? 0x8a8f87 : 0x757f79));
  }
  // The stone revetment, four-tier keep and lower connected watchtower form
  // an asymmetric daimyo castle rather than a stack of identical roofs.
  kit.push(-1.5, 0, -1.0);
  let floor = baseH, w = 13, d = 10.5;
  for (let i = 0; i < 4; i++) {
    const h = [3.8, 3.0, 2.65, 2.5][i], top = castleStoreyLocal(floor, w, d, h, i === 3);
    if (i === 1 || i === 2) {
      for (const side of [-1, 1]) {
        kit.push(side * w * 0.25, 0, d / 2 + 0.28);
        landmarkRoof(floor + h - 0.48, w * 0.35, 1.2, { type: 'gable', rise: 1.2, over: 0.4 });
        kit.pop();
      }
    }
    if (i === 3) for (const side of [-1, 1]) {
      kit.box('metal', side * (w / 2 + 0.45), top + 0.38, 0, 0.26, 0.7, 0.26, COL.gold, 0, 0, side * 0.25);
      kit.box('metal', side * (w / 2 + 0.38), top + 0.8, 0, 0.14, 0.34, 0.46, COL.gold);
    }
    floor = top - 0.35; w *= 0.78; d *= 0.8;
  }
  kit.pop();
  kit.push(12.5, 0, -6.5);
  kit.box('solid', 0, 1.25, 0, 6.4, 2.5, 6.4, COL.stoneDark);
  const wt = castleStoreyLocal(2.5, 5.2, 5.1, 2.8);
  castleStoreyLocal(wt - 0.3, 4.2, 4.1, 2.0, true); kit.pop();
  // White bailey walls and an open-roofed entrance frame the approach.
  for (const side of [-1, 1]) {
    kit.box('solid', side * 18, 1.4, 0, 0.55, 2.8, 31, COL.plasterShade);
    kit.box('solid', side * 18, 2.9, 0, 1.15, 0.28, 31.5, COL.tileDark);
    kit.box('solid', side * 10.8, 1.4, 15.5, 14.5, 2.8, 0.55, COL.plasterShade);
    kit.box('solid', side * 10.8, 2.9, 15.5, 15.0, 0.28, 1.15, COL.tileDark);
  }
  kit.box('solid', 0, 1.4, -15.5, 36.5, 2.8, 0.55, COL.plasterShade);
  kit.box('solid', 0, 2.9, -15.5, 37, 0.28, 1.15, COL.tileDark);
  for (const side of [-1, 1]) kit.box('solid', side * 2.7, 1.8, 15.5, 0.35, 3.6, 0.35, COL.woodDark);
  kit.push(0, 0, 15.5); landmarkRoof(3.5, 6.4, 2.7, { type: 'gable', rise: 1.6, over: 0.65 }); kit.pop();
  kit.box('solid', 0, 0.07, 10, 3.2, 0.14, 9, COL.stoneLight);
  if (kit.detail > 0.3) for (const side of [-1, 1]) { chochin(side * 2.35, 2.5, 15.8, 0.85, COL.paper, side < 0 ? 1 : 0); }
  kit.pop();
}
function teahouse(x, y, z, yaw, overWater = false) {
  kit.push(x, y, z, yaw);
  const w = 8.4, d = 5.2, h = 2.55, upper = 2.1;
  if (overWater) for (const px of [-w / 2, 0, w / 2]) for (const pz of [-d / 2, d / 2 + 2.3]) kit.box('solid', px, -1.5, pz, 0.26, 3.5, 0.26, COL.woodDark);
  kit.box('solid', 0, -0.12, 0, w + 0.6, 0.7, d + 0.6, overWater ? COL.woodDark : COL.stoneDark);
  kit.box('solid', 0, 0.28, 0, w + 0.4, 0.12, d + 0.4, COL.deck);
  if (kit.detail > 0.3) {
    body(w, d, 0.35, h, { bay: 2.1, fill: (s, i) => s === 'front' ? (i === 1 ? 'door' : 'shoji') : s === 'back' ? 'plaster' : 'koshi', noren: COL.indigo });
  } else {
    kit.box('solid', 0, h / 2 + 0.35, 0, w, h, d, COL.plasterShade);
    kit.box('glow', 0, 1.8, d / 2 + 0.03, w * 0.75, 1.4, 0.05, COL.paper);
  }
  const floor = h + 0.5;
  kit.box('solid', 0, floor, 0, w + 0.25, 0.2, d + 0.25, COL.woodDark);
  if (kit.detail > 0.3) body(w - 0.35, d - 0.5, floor + 0.1, upper, { bay: 2.05, fill: (s) => s === 'front' ? 'koshi' : s === 'back' ? 'plaster' : 'shoji' });
  else { kit.box('solid', 0, floor + 0.1 + upper / 2, -0.15, w - 0.35, upper, d - 0.5, COL.plasterShade); kit.box('glow', 0, floor + upper * 0.6, d / 2 - 0.2, w * 0.7, 0.9, 0.05, COL.paper); }
  landmarkRoof(floor + upper + 0.15, w - 0.15, d - 0.4, { type: 'irimoya', rise: 2.15, over: 0.95 });
  const vd = 2.3, front = d / 2 + vd / 2;
  kit.box('solid', 0, 0.35, front, w + 0.4, 0.18, vd + 0.2, COL.deck);
  kit.box('solid', 0, 1.15, d / 2 + vd, w + 0.1, 0.1, 0.12, COL.woodDark);
  for (const px of [-w / 2, 0, w / 2]) kit.box('solid', px, 0.8, d / 2 + vd, 0.12, 0.9, 0.12, COL.woodDark);
  kit.push(0, 0, d / 2 + 1.0); landmarkRoof(h + 0.2, w + 0.2, 2.2, { type: 'gable', rise: 0.42, over: 0.35 }); kit.pop();
  for (const px of [-w / 2, w / 2]) kit.box('solid', px, h / 2 + 0.25, d / 2 + vd, 0.16, h, 0.16, COL.woodDark);
  if (kit.detail > 0.3) {
    for (const bx of [-2.1, 2.1]) { kit.box('solid', bx, 0.65, front, 1.8, 0.1, 0.6, COL.wood); kit.box('solid', bx, 0.71, front, 1.65, 0.05, 0.6, COL.felt); }
    for (const lx of [-3.4, 0, 3.4]) chochin(lx, 2.1, d / 2 + vd - 0.2, 0.85, COL.lanternRed, lx === 0 ? 1.3 : 0);
    kit.box('solid', 2.8, h - 0.45, d / 2 + vd + 0.08, 0.48, 1.35, 0.1, COL.woodLight);
    if (kit.detail > 0.6) for (let i = 0; i < 3; i++) kit.box('solid', 2.8, h - 0.85 + i * 0.32, d / 2 + vd + 0.145, 0.26, 0.055, 0.02, COL.indigo);
  }
  kit.pop();
}
