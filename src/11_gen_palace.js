// Complete Chinese palace and tea-house compounds. Layout coordinates are
// identical across LODs, including ceremonial courts and connecting galleries.
function palaceBalustradeLocal(w, d, y) {
  for (const side of [-1, 1]) {
    kit.box('solid', side * w / 2, y + 0.75, 0, 0.14, 0.14, d, CN.stone);
    kit.box('solid', 0, y + 0.75, side * d / 2, w, 0.14, 0.14, CN.stone);
  }
  if (kit.detail > 0.3) for (let x = -w / 2; x <= w / 2; x += 3.3) for (const side of [-1, 1]) kit.box('solid', x, y + 0.42, side * d / 2, 0.2, 0.84, 0.2, CN.stone);
}
function palaceHallLocal(w, d, h) {
  chineseHallLocal(w, d, h, true);
  // Deep secondary eaves and a high red gallery make the main hall legible
  // above the low side courts, even from the outermost distance tier.
  for (const side of [-1, 1]) {
    kit.push(0, 0, side * (d / 2 + 0.3));
    chineseRoof(h * 0.58, w + 0.6, 2.2, { gold: true, rise: 0.62, over: 0.65, upturn: 0.35 });
    kit.pop();
  }
  if (kit.detail > 0.3) for (const side of [-1, 1]) chineseLantern(side * w * 0.28, 3.2, d / 2 + 1.45, 1.1, side < 0 ? 1.6 : 0);
}
function chinesePalaceLocal(seed) {
  chineseWallLocal(74, 80, 4.8);
  // The front gate is pierced at ground level and supports a two-eave hall.
  for (const side of [-1, 1]) kit.box('solid', side * 8.2, 2.7, 40, 10.2, 5.4, 7.2, CN.stoneDark);
  kit.box('solid', 0, 5.7, 40, 27, 1.2, 7.2, CN.stone);
  kit.push(0, 6.3, 40); palaceHallLocal(24, 8, 4.2); kit.pop();
  for (const side of [-1, 1]) {
    kit.push(side * 31.5, 4.8, 34); chinesePavilionLocal(1.0); kit.pop();
    kit.push(side * 31.5, 4.8, -34); chinesePavilionLocal(1.0); kit.pop();
  }
  // Outer court, raised central terrace, second court and inner residence.
  kit.box('solid', 0, 0.03, 18, 58, 0.1, 30, CN.stone);
  for (let i = 0; i < 3; i++) kit.box('solid', 0, 0.5 + i * 1.0, -5, 37 - i * 2.1, 1.0, 24 - i * 1.3, i % 2 ? CN.stone : CN.stoneDark);
  palaceBalustradeLocal(33, 21.4, 3);
  const steps = kit.detail > 0.3 ? 8 : 4;
  for (let i = 0; i < steps; i++) kit.box('solid', 0, 0.2 + i * 2.8 / steps, 10 - i * 7 / steps, 10, 2.8 / steps + 0.06, 7 / steps + 0.03, CN.stone);
  kit.push(0, 3.0, -5); palaceHallLocal(28, 14, 6.0); kit.pop();
  kit.push(0, 0, -27); palaceHallLocal(22, 10, 4.2); kit.pop();
  for (const side of [-1, 1]) {
    // Galleries link the outer and inner courts while keeping their open floor.
    kit.push(side * 27, 0, -5, Math.PI / 2); chineseHallLocal(41, 5.2, 2.8, true, true, { gold: false }); kit.pop();
    kit.push(side * 19, 0, -26); chineseHallLocal(10, 8.3, 3.0, false); kit.pop();
  }
  kit.box('solid', 0, 0.12, 24, 8, 0.22, 25, CN.stone);
  if (kit.detail > 0.3) {
    for (let i = 0; i < 4; i++) for (const side of [-1, 1]) chineseLantern(side * 7.2, 2.4, 12 + i * 6, 1.0, i === 1 ? 1.2 : 0);
    // A bronze ceremonial vessel sits off the axis, leaving the stairs open.
    for (const side of [-1, 1]) {
      kit.box('solid', side * 11, 0.45, 14, 2.2, 0.9, 2.2, CN.stoneDark);
      kit.box('metal', side * 11, 1.5, 14, 1.2, 1.3, 1.2, C(0x637973));
      kit.box('metal', side * 11, 2.25, 14, 1.55, 0.18, 1.55, CN.gold);
    }
  }
}
function chineseTeahouseLocal(seed) {
  const w = 11.5, d = 7.5, h = 2.9, floor = 3.55;
  chineseHallLocal(w, d, h, false, false, { skip: true });
  kit.push(0, floor, -0.3); chineseHallLocal(w - 0.6, d - 0.8, 2.5, false, false, { gold: false }); kit.pop();
  // Covered veranda and wraparound upper balcony define a social tea house.
  kit.box('solid', 0, 0.35, d / 2 + 1.4, w + 0.8, 0.18, 3.0, CN.wood);
  chineseRoof(h + 0.15, w + 0.6, 2.0, { shift: d / 2 + 1.0, rise: 0.58, over: 0.6, upturn: 0.32 });
  kit.box('solid', 0, floor + 0.2, d / 2 + 0.5, w + 0.4, 0.18, 1.4, CN.wood);
  kit.box('solid', 0, floor + 1.0, d / 2 + 1.05, w + 0.4, 0.1, 0.12, CN.redDark);
  for (const side of [-1, 1]) {
    kit.box('solid', side * (w / 2 + 0.2), floor + 0.2, 0, 1.2, 0.18, d + 0.8, CN.wood);
    kit.box('solid', side * (w / 2 + 0.7), floor + 1.0, 0, 0.12, 0.1, d + 0.8, CN.redDark);
    kit.box('solid', side * (w / 2 + 0.1), h / 2 + 0.35, d / 2 + 2.6, 0.24, h, 0.24, CN.wood);
  }
  if (kit.detail > 0.3) {
    for (let i = 0; i < 5; i++) kit.box('solid', -w / 2 + i * w / 4, floor + 0.58, d / 2 + 1.05, 0.09, 0.85, 0.09, CN.redDark);
    for (const lx of [-4.8, 0, 4.8]) chineseLantern(lx, 2.4, d / 2 + 2.6, 0.9, lx === 0 ? 1.4 : 0);
    for (const bx of [-2.8, 2.8]) {
      kit.box('solid', bx, 0.72, d / 2 + 1.4, 1.6, 0.15, 0.9, CN.wood);
      for (const dx of [-0.65, 0.65]) kit.box('solid', bx + dx, 0.46, d / 2 + 1.4, 0.35, 0.4, 0.8, CN.redDark);
      kit.box('solid', bx, 0.86, d / 2 + 1.4, 0.16, 0.12, 0.16, C(0xddd2b0));
    }
    kit.box('solid', 0, 2.75, d / 2 + 2.85, 2.7, 0.62, 0.13, CN.ink);
    kit.box('metal', 0, 3.05, d / 2 + 2.93, 2.55, 0.035, 0.03, CN.gold);
  }
}
