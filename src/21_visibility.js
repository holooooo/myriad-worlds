// Project the complete perspective frustum onto the horizontal plane. Nearby
// LOD0 shadow casters stay resident; shadowless far assets need a smaller guard.
function instanceView(x, z, fx, fz, horizontal, vertical, fov, aspect) {
  const tanV = Math.tan(fov * Math.PI / 360);
  // The upper/lower image edge can face behind the camera when looking down
  // or up. Keep every direction in that case, including reflected scenery.
  const minForward = horizontal - Math.abs(vertical) * tanV;
  const half = Math.atan(tanV * aspect / Math.max(0.001, minForward)) + 0.08;
  return { x, z, fx, fz, horizontal, allDirections: minForward <= 0.05 || half >= 1.5, tanHalf: Math.tan(Math.min(half, 1.5)) };
}
function instanceRegionVisible(ch, view) {
  if (view.allDirections) return true;
  const dx = ch.cx0 - view.x, dz = ch.cz0 - view.z;
  const extent = ch.data.size * 0.5 + 78; // 72m landmark overhang + 6m movement guard
  const near = ch.L === 0 ? 310 : 90;
  if (Math.hypot(Math.max(Math.abs(dx) - extent, 0), Math.max(Math.abs(dz) - extent, 0)) <= near) return true;
  // Exact square support against both inward-facing cone planes avoids the
  // large false-positive border of a circumscribed circle plus linear padding.
  const t = view.tanHalf, leftX = view.fx * t + view.fz, leftZ = view.fz * t - view.fx;
  const rightX = view.fx * t - view.fz, rightZ = view.fz * t + view.fx;
  return dx * view.fx + dz * view.fz >= -extent * (Math.abs(view.fx) + Math.abs(view.fz)) &&
    dx * leftX + dz * leftZ >= -extent * (Math.abs(leftX) + Math.abs(leftZ)) &&
    dx * rightX + dz * rightZ >= -extent * (Math.abs(rightX) + Math.abs(rightZ));
}
const INSTANCE_CULL = { direction: new THREE.Vector3(), x: Infinity, z: Infinity, fx: 0, fz: 0, vertical: 0, fov: 0, aspect: 0, timer: 0, tests: 0 };
function cullInstances(dt, force = false) {
  const c = INSTANCE_CULL, p = camera.position, direction = camera.getWorldDirection(c.direction);
  const horizontal = Math.hypot(direction.x, direction.z), fx = direction.x / (horizontal || 1), fz = direction.z / (horizontal || 1);
  c.timer -= dt;
  if (!force && !STREAM.visibilityDirty && c.timer > 0 && Math.hypot(p.x - c.x, p.z - c.z) < 5 && fx * c.fx + fz * c.fz > 0.998 && Math.abs(direction.y - c.vertical) < 0.003 && c.fov === camera.fov && c.aspect === camera.aspect) return;
  c.x = p.x; c.z = p.z; c.fx = fx; c.fz = fz; c.vertical = direction.y; c.fov = camera.fov; c.aspect = camera.aspect; c.timer = 0.12;
  STREAM.visibilityDirty = false;
  const view = instanceView(p.x, p.z, fx, fz, horizontal, direction.y, camera.fov, camera.aspect);
  for (const ch of ST.chunks.values()) {
    if (!ch.shown || !ch.data) continue;
    const visible = instanceRegionVisible(ch, view); c.tests++;
    if (ch.instancesVisible === visible) continue;
    ch.instancesVisible = visible;
    for (const b of ch.blocks) {
      if (visible) { b.pool.rewrite(b.s, b.n, b.m, b.c); b.dirty = false; }
      else { b.pool.clear(b.s, b.n); b.dirty = true; }
    }
  }
}
