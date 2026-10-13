const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
const source = fs.readFileSync('src/21_visibility.js', 'utf8').split('const INSTANCE_CULL')[0];
const { visible, makeView } = vm.runInNewContext(source + '\n({visible:instanceRegionVisible,makeView:instanceView});');
let checked = 0;
for (const aspect of [.6, 1, 1.8, 2.4]) for (const fov of [35, 55, 74, 80]) for (const pitch of [-1.4, -.9, -.3, 0, .3, .9, 1.4]) for (const yaw of [0, .7, 1.6, 3.4]) {
  const h = Math.cos(pitch), v = Math.sin(pitch), fx = Math.sin(yaw), fz = Math.cos(yaw), tv = Math.tan(fov * Math.PI / 360);
  const view = makeView(0, 0, fx, fz, h, v, fov, aspect);
  // Actual 3D image rays cover pitch, corners, aspect, yaw and reflection.
  for (const distance of [100, 500, 1200, 3000]) for (const u of [-1, -.5, 0, .5, 1]) for (const w of [-1, 0, 1]) {
    const forward = h - v * w * tv, side = u * tv * aspect;
    const x = (fx * forward + fz * side) * distance, z = (fz * forward - fx * side) * distance;
    for (const L of [0, 4]) assert(visible({ cx0: x, cz0: z, L, data: { size: 32 * 2 ** L } }, view), 'Actual visible scenery removed');
    checked++;
  }
  for (const direction of [0, 1, 2, 3]) assert(visible({ cx0: Math.sin(direction) * 300, cz0: Math.cos(direction) * 300, L: 0, data: { size: 32 } }, view), 'Near shadow caster removed');
}
const level = makeView(0, 0, 0, 1, 1, 0, 55, 1.5);
// Between throttled checks the heading can move up to 3.6 degrees and the
// eye up to five metres. The angular/overhang guards must retain image edges.
for (const lagYaw of [-.063, .063]) for (const dx of [-4.9, 4.9]) for (const distance of [500, 1200, 3000]) for (const side of [-1, 1]) {
  const tanH = Math.tan(55 * Math.PI / 360) * 1.5;
  const x = dx + (Math.sin(lagYaw) + Math.cos(lagYaw) * side * tanH) * distance;
  const z = (Math.cos(lagYaw) - Math.sin(lagYaw) * side * tanH) * distance;
  assert(visible({ cx0: x, cz0: z, L: 4, data: { size: 512 } }, level), 'Heading/movement cadence removed an image edge');
}
assert(!visible({ cx0: 0, cz0: -500, L: 4, data: { size: 512 } }, level), 'Rear shadowless chunk survived the 310m exemption');
assert(visible({ cx0: 0, cz0: -300, L: 0, data: { size: 32 } }, level));
for (const pitch of [-1.3, 1.3]) {
  const view = makeView(0, 0, 0, 1, Math.cos(pitch), Math.sin(pitch), 74, 1.5);
  assert(view.allDirections, 'Aerial view crossing the vertical axis needs all directions');
  assert(visible({ cx0: 0, cz0: -2000, L: 4, data: { size: 512 } }, view));
}
function oldVisible(ch, view) {
  const radius = ch.data.size * Math.SQRT1_2 + 72, dx = ch.cx0, dz = ch.cz0;
  if (Math.hypot(dx, dz) <= 310 + radius) return true;
  const forward = dx * view.fx + dz * view.fz, side = Math.abs(dx * view.fz - dz * view.fx);
  return forward >= -radius && side <= Math.max(0, forward) * view.tanHalf + radius * (1 + view.tanHalf);
}
// Compare identical complete quadtree rings without changing asset density.
const counts = { before: 0, after: 0, farBefore: 0, farAfter: 0 };
const oldHalf = Math.atan(Math.tan(55 * Math.PI / 360) * 1.5), oldView = { fx: 0, fz: 1, tanHalf: Math.tan(oldHalf + .18) };
let previousExtent = 0;
for (let L = 0; L < 5; L++) {
  const size = 32 * 2 ** L, ring = L >= 3 ? 7 : L === 1 ? 5 : 6, extent = ring * size;
  for (let z = -extent + size / 2; z < extent; z += size) for (let x = -extent + size / 2; x < extent; x += size) {
    if (Math.abs(x) < previousExtent && Math.abs(z) < previousExtent) continue;
    const ch = { L, cx0: x, cz0: z, data: { size } }, old = oldVisible(ch, oldView), next = visible(ch, level);
    counts.before += old; counts.after += next;
    if (L === 4) { counts.farBefore += old; counts.farAfter += next; }
  }
  previousExtent = extent;
}
assert(counts.after < counts.before * .85, 'Conservative bounds should materially reduce level-view regions');
console.info(JSON.stringify({ actualFrustumRaysChecked: checked, nearShadowCasters: true, aerialViewsConservative: true, levelRingRegions: counts }));
