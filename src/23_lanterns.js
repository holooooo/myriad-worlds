// City lantern colonies: fixed world-space launch sites, pooled geometry.
// Sunlight/rain suppress release; no per-lantern lights or scene graph nodes.
const LANTERNS = { max: 128, sites: [], x: Infinity, z: Infinity, timer: 0, active: 0, refreshes: 0 };
const lanternBodyGeo = new THREE.CylinderGeometry(0.48, 0.33, 0.78, 6, 1);
const lanternRimGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.045, 6, 1);
const lanternFlameGeo = new THREE.OctahedronGeometry(0.095, 0);
const lanternFade = new THREE.InstancedBufferAttribute(new Float32Array(LANTERNS.max), 1);
for (const g of [lanternBodyGeo, lanternRimGeo, lanternFlameGeo]) g.setAttribute('lanternFade', lanternFade);
function lanternMaterial(color, intensity) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: Object.assign({ uColor: { value: C(color).multiplyScalar(intensity) } }, THREE.UniformsUtils.clone(THREE.UniformsLib.fog)),
    vertexShader: `attribute float lanternFade; varying float vFade, vShade;
      #include <fog_pars_vertex>
      void main(){ vec3 transformed = position; vFade = lanternFade; vShade = 0.7 + 0.3 * max(normal.y, abs(normal.x));
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position,1.0);
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vFade, vShade;
      #include <fog_pars_fragment>
      void main(){ if(vFade < 0.005) discard; gl_FragColor = vec4(uColor * vShade, vFade);
        #include <fog_fragment>
      }`,
  });
}
LANTERNS.body = new THREE.InstancedMesh(lanternBodyGeo, lanternMaterial(0xff9b43, 1.7), LANTERNS.max);
LANTERNS.rim = new THREE.InstancedMesh(lanternRimGeo, lanternMaterial(0x523723, 0.6), LANTERNS.max);
LANTERNS.flame = new THREE.InstancedMesh(lanternFlameGeo, lanternMaterial(0xffdf7a, 4.2), LANTERNS.max);
for (const mesh of [LANTERNS.body, LANTERNS.rim, LANTERNS.flame]) {
  mesh.visible = false; mesh.count = 0; mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh); HIDE_IN_MIRROR.add(mesh);
}
const lanternMatrix = new THREE.Matrix4(), lanternQ = new THREE.Quaternion(), lanternEuler = new THREE.Euler(), lanternPos = new THREE.Vector3(), lanternScale = new THREE.Vector3();
function updateLanterns(dt, t) {
  const amount = THEME === 'shanshui' && ['dusk', 'night'].includes(moodName) ? (1 - ATM.rain) * Math.min(1, ATM.lamps) : 0;
  const meshes = [LANTERNS.body, LANTERNS.rim, LANTERNS.flame];
  for (const mesh of meshes) mesh.visible = amount > 0.05;
  if (amount <= 0.05) { LANTERNS.active = 0; return; }
  const cell = 64, x = Math.floor(camera.position.x / cell), z = Math.floor(camera.position.z / cell);
  LANTERNS.timer -= dt;
  if (LANTERNS.timer <= 0 && (x !== LANTERNS.x || z !== LANTERNS.z)) {
    LANTERNS.timer = 1; LANTERNS.x = x; LANTERNS.z = z; LANTERNS.sites = [];
    for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) {
      const gx = x + i, gz = z + j;
      const px = (gx + 0.15 + GEN.h2(gx, gz, GEN.seed + 407) * 0.7) * cell;
      const pz = (gz + 0.15 + GEN.h2(gz, gx, GEN.seed + 619) * 0.7) * cell;
      const s = GEN.sample(px, pz, {});
      if (s.biome !== GEN.B.TOWN || s.h < 0.5 || s.rail > 0.1) continue;
      for (let k = 0; k < 5; k++) {
        const ph = GEN.h2(gx * 5 + k, gz, GEN.seed + 827), a = ph * Math.PI * 2;
        LANTERNS.sites.push({ x: px + Math.cos(a) * 5, y: s.h + 10, z: pz + Math.sin(a) * 5, ph, scale: 0.7 + ph * 0.6 });
      }
    }
    LANTERNS.sites.sort((a, b) => Math.hypot(a.x - camera.position.x, a.z - camera.position.z) - Math.hypot(b.x - camera.position.x, b.z - camera.position.z));
    LANTERNS.refreshes++;
    LOG.debug('business', 'city-lantern-sites-refreshed', { sites: LANTERNS.sites.length });
  }
  const count = Math.min(QUALITY === 'high' ? LANTERNS.max : 64, LANTERNS.sites.length);
  LANTERNS.active = count;
  for (let i = 0; i < count; i++) {
    const site = LANTERNS.sites[i], age = (t * 0.5 + site.ph * 80) % 80;
    const fade = smoothstep(0, 6, age) * (1 - smoothstep(64, 80, age)) * amount;
    lanternFade.setX(i, fade);
    lanternPos.set(site.x + age * 0.18 + Math.sin(t * 0.3 + site.ph * 20), site.y + age * 0.65, site.z + age * 0.08);
    lanternQ.setFromEuler(lanternEuler.set(Math.sin(t * 0.7 + site.ph * 10) * 0.05, site.ph * 6.28, Math.cos(t * 0.5 + site.ph * 9) * 0.06));
    lanternScale.setScalar(site.scale);
    LANTERNS.body.setMatrixAt(i, lanternMatrix.compose(lanternPos, lanternQ, lanternScale));
    lanternPos.y -= 0.39 * site.scale;
    LANTERNS.rim.setMatrixAt(i, lanternMatrix.compose(lanternPos, lanternQ, lanternScale));
    lanternPos.y += 0.1 * site.scale;
    LANTERNS.flame.setMatrixAt(i, lanternMatrix.compose(lanternPos, lanternQ, lanternScale));
  }
  lanternFade.needsUpdate = true;
  for (const mesh of meshes) { mesh.count = count; mesh.instanceMatrix.needsUpdate = true; }
}
