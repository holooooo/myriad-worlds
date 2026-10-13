// Shared habitat rules used by spawning, navigation and regression checks.
// Inspect the whole footprint: a dry centre alone is insufficient at a shoreline.
function habitatAt(kind, x, z) {
  const s = sample(x, z, {});
  if (s.biome === B.TOWN || s.town > 0.45 || s.street || s.pad > 0.2 || s.rail > 0.1 || s.tunnel) return null;
  if (kind === 'fish') return s.waterLevel !== null && s.waterLevel - s.h > 0.65 && !s.paddy && s.biome !== B.OCEAN ? s : null;
  if (kind === 'crane') return [B.MARSH, B.PADDY, B.LAKE, B.RIVER, B.SATO].includes(s.biome) && s.h < 90 ? s : null;
  if (kind === 'buffalo') {
    if (![B.PADDY, B.MARSH, B.SATO, B.MEADOW].includes(s.biome) || s.h < 0.25 || s.h > 62 || s.waterLevel !== null && s.waterLevel - s.h > 0.3) return null;
    for (const [dx, dz] of [[1.1, 0], [-1.1, 0], [0, 1.1], [0, -1.1]]) {
      const n = sample(x + dx, z + dz, {});
      if (n.h < 0.25 || n.waterLevel !== null && n.waterLevel - n.h > 0.3 || n.town > 0.45 || n.street || n.pad > 0.2 || n.rail > 0.1 || Math.abs(n.h - s.h) > 0.45) return null;
    }
    return s;
  }
  if (kind !== 'fox' && kind !== 'deer') return s;
  if (s.waterLevel !== null || s.h < 0.45 || s.paddy || s.biome === B.BEACH && s.h < 1) return null;
  const r = kind === 'deer' ? 0.75 : 0.5;
  for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
    const n = sample(x + dx, z + dz, {});
    if (n.waterLevel !== null || n.h < 0.25 || n.paddy || n.town > 0.45 || n.street || n.pad > 0.2 || n.rail > 0.1 || Math.abs(n.h - s.h) > 0.7) return null;
  }
  return s;
}
function habitatPath(kind, ax, az, bx, bz) {
  const length = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(length / 0.4));
  let previous = null;
  for (let i = 0; i <= steps; i++) {
    const s = habitatAt(kind, lerp(ax, bx, i / steps), lerp(az, bz, i / steps));
    if (!s || kind === 'fish' && previous && (s.waterId !== previous.waterId || Math.abs(s.waterLevel - previous.waterLevel) > 0.05) || previous && ['fox', 'deer', 'buffalo'].includes(kind) && Math.abs(s.h - previous.h) > 0.45) return false;
    previous = s;
  }
  return true;
}
