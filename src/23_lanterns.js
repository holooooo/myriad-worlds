// City lantern colonies: fixed world-space launch sites, pooled geometry.
// Sunlight/rain suppress release; no per-lantern lights or scene graph nodes.
const LANTERNS = { max: 1024, sites: [], x: Infinity, z: Infinity, timer: 0, active: 0, refreshes: 0 };
const lanternBodyGeo = new THREE.CylinderGeometry(0.46, 0.31, 0.74, 8, 1);
const lanternRimGeo  = new THREE.CylinderGeometry(0.33, 0.33, 0.042, 8, 1);
const lanternFlameGeo = new THREE.OctahedronGeometry(0.088, 0);
const lanternFade = new THREE.InstancedBufferAttribute(new Float32Array(LANTERNS.max), 1);
for (const g of [lanternBodyGeo, lanternRimGeo, lanternFlameGeo]) g.setAttribute('lanternFade', lanternFade);
function lanternMaterial(color, intensity) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: Object.assign({ uColor: { value: C(color).multiplyScalar(intensity) } }, THREE.UniformsUtils.clone(THREE.UniformsLib.fog)),
    vertexShader: `attribute float lanternFade; varying float vFade, vShade;
      #include <fog_pars_vertex>
      void main(){ vec3 transformed = position; vFade = lanternFade;
        vShade = 0.65 + 0.35 * max(normal.y, abs(normal.x) * 0.6);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position,1.0);
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vFade, vShade;
      #include <fog_pars_fragment>
      void main(){ if(vFade < 0.004) discard; gl_FragColor = vec4(uColor * vShade, vFade);
        #include <fog_fragment>
      }`,
  });
}
// Three warm tints cycle across the pool to break visual monotony.
const LT = [
  lanternMaterial(0xff9240, 1.8),  // amber
  lanternMaterial(0xffba55, 1.6),  // golden
  lanternMaterial(0xff7e38, 1.9),  // deep orange
];
const LT_rim = lanternMaterial(0x55321a, 0.7);
const LT_flame = lanternMaterial(0xffe07a, 4.8);
// Pre-create instanced meshes for all three body tints.
LANTERNS.bodies = LT.map(mat => {
  const m = new THREE.InstancedMesh(lanternBodyGeo, mat, LANTERNS.max);
  m.visible = false; m.count = 0; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(m); HIDE_IN_MIRROR.add(m); return m;
});
LANTERNS.rim   = new THREE.InstancedMesh(lanternRimGeo,   LT_rim,   LANTERNS.max);
LANTERNS.flame = new THREE.InstancedMesh(lanternFlameGeo, LT_flame, LANTERNS.max);
for (const mesh of [LANTERNS.rim, LANTERNS.flame]) {
  mesh.visible = false; mesh.count = 0; mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh); HIDE_IN_MIRROR.add(mesh);
}
const lanternMatrix = new THREE.Matrix4(), lanternQ = new THREE.Quaternion(), lanternEuler = new THREE.Euler();
const lanternPos = new THREE.Vector3(), lanternScale = new THREE.Vector3();

// Per-body counters so each tint mesh tracks its own instance count.
const bodyCounts = [0, 0, 0];

function updateLanterns(dt, t) {
  const amount = ['dusk', 'night'].includes(moodName) ? (1 - ATM.rain) * Math.min(1, ATM.lamps) : 0;
  const allMeshes = [...LANTERNS.bodies, LANTERNS.rim, LANTERNS.flame];
  for (const mesh of allMeshes) mesh.visible = amount > 0.05;
  if (amount <= 0.05) {
    LANTERNS.active = 0;
    for (const b of LANTERNS.bodies) b.count = 0;
    LANTERNS.rim.count = LANTERNS.flame.count = 0; return;
  }

  const cell = 56, cx = Math.floor(camera.position.x / cell), cz = Math.floor(camera.position.z / cell);
  LANTERNS.timer -= dt;
  if (LANTERNS.timer <= 0 && (cx !== LANTERNS.x || cz !== LANTERNS.z)) {
    LANTERNS.timer = 0.8; LANTERNS.x = cx; LANTERNS.z = cz; LANTERNS.sites = [];
    // Scan a wider footprint so the sky fills with lanterns in every direction.
    for (let j = -8; j <= 8; j++) for (let i = -8; i <= 8; i++) {
      const gx = cx + i, gz = cz + j;
      const px = (gx + 0.12 + GEN.h2(gx, gz, GEN.seed + 407) * 0.76) * cell;
      const pz = (gz + 0.12 + GEN.h2(gz, gx, GEN.seed + 619) * 0.76) * cell;
      const s = GEN.sample(px, pz, {});
      if (s.biome !== GEN.B.TOWN || s.h < 0.5 || s.rail > 0.1) continue;

      // Each town cell spawns several dense burst clusters that feel like a
      // proper festival launch rather than scattered individual lanterns.
      const clusters = 3 + Math.floor(GEN.h2(gx, gz, GEN.seed + 211) * 3); // 3–5 clusters
      for (let c = 0; c < clusters; c++) {
        const ca = GEN.h2(gx * 5 + c, gz, GEN.seed + 313) * Math.PI * 2;
        const cr = 6 + GEN.h2(gz * 5 + c, gx, GEN.seed + 417) * 20;
        const cx0 = px + Math.cos(ca) * cr, cz0 = pz + Math.sin(ca) * cr;
        // Each cluster emits a burst of lanterns with tightly correlated
        // phases so they appear to rise together from the same release point.
        const burstPh = GEN.h2(gx * 11 + c, gz, GEN.seed + 503);
        const burstCount = QUALITY === 'high' ? 28 : 14;
        for (let k = 0; k < burstCount; k++) {
          const ph = burstPh + GEN.h2(gx * 20 + c * burstCount + k, gz, GEN.seed + 827) * 0.18;
          const spread = GEN.h2(k, c + gz * 3, GEN.seed + 911) * 8;
          const a2 = GEN.h2(k + c * 30, gz, GEN.seed + 991) * Math.PI * 2;
          const tint = (k + c) % 3;
          LANTERNS.sites.push({
            x: cx0 + Math.cos(a2) * spread, y: s.h + 5 + ph * 6, z: cz0 + Math.sin(a2) * spread,
            ph, scale: 0.62 + ph * 0.55, tint,
            wx: (GEN.h2(k, gz + c, GEN.seed + 731) - 0.5) * 0.06,
            wz: (GEN.h2(gz, k + c * 2, GEN.seed + 739) - 0.5) * 0.06,
          });
        }
      }
    }
    // Sort nearest-first so the display budget always shows the closest lanterns.
    LANTERNS.sites.sort((a, b) => Math.hypot(a.x - camera.position.x, a.z - camera.position.z) - Math.hypot(b.x - camera.position.x, b.z - camera.position.z));
    LANTERNS.refreshes++;
    LOG.debug('business', 'city-lantern-sites-refreshed', { sites: LANTERNS.sites.length });
  }

  const count = Math.min(LANTERNS.max, LANTERNS.sites.length);
  LANTERNS.active = count;
  bodyCounts[0] = bodyCounts[1] = bodyCounts[2] = 0;
  let rimI = 0, flameI = 0;

  for (let i = 0; i < count; i++) {
    const site = LANTERNS.sites[i];
    // Period 72 s; each lantern rises ~47 m then fades. Stagger by phase so
    // different clusters are always at different altitudes simultaneously.
    const age = (t * 0.48 + site.ph * 72) % 72;
    const fade = smoothstep(0, 5, age) * (1 - smoothstep(58, 72, age)) * amount;
    lanternFade.setX(i, fade);
    // Gentle individual drift per lantern in addition to the shared wind.
    const drift = Math.sin(t * 0.28 + site.ph * 17) * 0.6;
    lanternPos.set(
      site.x + age * (0.16 + site.wx) + drift,
      site.y + age * 0.66,
      site.z + age * (0.07 + site.wz) + Math.cos(t * 0.22 + site.ph * 13) * 0.35,
    );
    lanternQ.setFromEuler(lanternEuler.set(
      Math.sin(t * 0.65 + site.ph * 10) * 0.04,
      site.ph * 6.28,
      Math.cos(t * 0.48 + site.ph * 9) * 0.05,
    ));
    lanternScale.setScalar(site.scale);
    const bodyIdx = bodyCounts[site.tint]++;
    LANTERNS.bodies[site.tint].setMatrixAt(bodyIdx, lanternMatrix.compose(lanternPos, lanternQ, lanternScale));
    lanternPos.y -= 0.37 * site.scale;
    LANTERNS.rim.setMatrixAt(rimI, lanternMatrix.compose(lanternPos, lanternQ, lanternScale));
    lanternPos.y += 0.09 * site.scale;
    LANTERNS.flame.setMatrixAt(flameI, lanternMatrix.compose(lanternPos, lanternQ, lanternScale));
    rimI++; flameI++;
  }

  lanternFade.needsUpdate = true;
  for (let t = 0; t < 3; t++) {
    LANTERNS.bodies[t].count = bodyCounts[t];
    LANTERNS.bodies[t].instanceMatrix.needsUpdate = true;
  }
  LANTERNS.rim.count = LANTERNS.flame.count = rimI;
  LANTERNS.rim.instanceMatrix.needsUpdate = true;
  LANTERNS.flame.instanceMatrix.needsUpdate = true;
}
