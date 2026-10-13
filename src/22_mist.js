// A small world-space habitat atlas drives local fog inside the ray marcher.
// It remains anchored as the camera moves; early/late light increases the
// density above water, and wooded humid patches retain lighter ground mist.
const MIST = { size: 32, cell: 12, x: Infinity, z: Infinity, timer: 0, refreshes: 0, sampled: 0, context: null };
MIST.data = new Float32Array(MIST.size * MIST.size * 4);
MIST.texture = new THREE.DataTexture(MIST.data, MIST.size, MIST.size, THREE.RGBAFormat, THREE.FloatType);
MIST.texture.minFilter = MIST.texture.magFilter = THREE.NearestFilter;
const mistUniforms = volPass.mat.uniforms;
mistUniforms.uMistMap = { value: MIST.texture };
mistUniforms.uMistOrigin = { value: new THREE.Vector2() };
mistUniforms.uMistSpan = { value: MIST.size * MIST.cell };
mistUniforms.uMistAmount = { value: 1 };
mistUniforms.uCloudSea = { value: new THREE.Vector4(0, 35, 16, 0) };
function updateMist(dt, t) {
  const u = volPass.mat.uniforms;
  u.uTime.value = t;
  const lowSun = 1 - smoothstep(0.12, 0.55, ATM.sunDir.y);
  u.uMistAmount.value = 0.35 + lowSun * 0.65 + ATM.rain * 0.3;
  const cloud = GEN.profile.mist;
  const mountainView = smoothstep(25, 65, camera.position.y);
  u.uCloudSea.value.set(cloud?.cloudSea ? (0.012 + lowSun * 0.013) * mountainView : 0, cloud?.base || 42, 20, 0);
  u.uMaxDist.value = cloud?.cloudSea ? 1200 : 420;
  MIST.timer -= dt;
  const x = Math.floor(camera.position.x / MIST.cell) * MIST.cell - MIST.size * MIST.cell / 2;
  const z = Math.floor(camera.position.z / MIST.cell) * MIST.cell - MIST.size * MIST.cell / 2;
  const context = GEN.seed + ':' + GEN.theme;
  if (MIST.context === context && (MIST.timer > 0 || x === MIST.x && z === MIST.z)) return;
  const dx = (x - MIST.x) / MIST.cell, dz = (z - MIST.z) / MIST.cell;
  const previous = MIST.context === context && Number.isFinite(dx + dz) && Math.abs(dx) < MIST.size && Math.abs(dz) < MIST.size ? MIST.data.slice() : null;
  MIST.context = context;
  MIST.timer = 0.7; MIST.x = x; MIST.z = z; MIST.sampled = 0;
  for (let j = 0; j < MIST.size; j++) for (let i = 0; i < MIST.size; i++) {
    const k = (j * MIST.size + i) * 4, oldI = i + dx, oldJ = j + dz;
    if (previous && oldI >= 0 && oldI < MIST.size && oldJ >= 0 && oldJ < MIST.size) {
      const oldK = (oldJ * MIST.size + oldI) * 4;
      MIST.data.set(previous.subarray(oldK, oldK + 4), k);
      continue;
    }
    const px = x + (i + 0.5) * MIST.cell, pz = z + (j + 0.5) * MIST.cell, s = GEN.sample(px, pz, {});
    MIST.sampled++;
    const water = s.h < -0.2 && s.biome !== GEN.B.OCEAN;
    const forest = [GEN.B.MARSH, GEN.B.SAKURA, GEN.B.BAMBOO, GEN.B.CEDAR, GEN.B.PINE].includes(s.biome);
    const rural = s.town < 0.45 && !s.street && s.pad < 0.3 && !s.snow;
    const patch = smoothstep(-0.28, 0.32, GEN.fbm(px * 0.013, pz * 0.013, 2, 21));
    MIST.data[k] = rural ? (water ? 0.055 : forest ? 0.014 : s.paddy ? 0.012 : 0) * patch : 0;
    MIST.data[k + 1] = water ? 0.75 : s.h + 0.8;
    MIST.data[k + 2] = water ? 1.8 : 2.5;
    MIST.data[k + 3] = water ? 1 : 0.45;
  }
  u.uMistOrigin.value.set(x, z); MIST.texture.needsUpdate = true; MIST.refreshes++;
  LOG.debug('business', 'mist-habitat-refreshed', { x, z, sampled: MIST.sampled });
}
