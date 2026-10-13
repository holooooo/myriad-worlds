// =====================================================================

//  Ambient life: steam train, smoke, petals, fireflies, rain, snow, birds
// =====================================================================
const FX = {};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s1 = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();

// --- steam train (built with the same cube kit as the world) -----------
function kitToGroup(build) {
  const K = GEN.kit;
  K.reset(); K.G = () => 0;
  build(K);
  const g = new THREE.Group();
  for (const [name, b] of Object.entries(K.b)) {
    const m = b.m.out(), c = b.c.out(), n = c.length / 3;
    const mat = kitMats[0][name] || kitMats[0].solid;
    const mesh = new THREE.InstancedMesh(name === 'blossom' ? blossomGeo : boxGeo, mat, n);
    mesh.instanceMatrix.array.set(m); mesh.instanceColor = new THREE.InstancedBufferAttribute(c, 3);
    mesh.castShadow = name !== 'glow'; mesh.receiveShadow = true; mesh.computeBoundingSphere();
    g.add(mesh);
  }
  return g;
}
const TCOL = { black: GEN.C(0x1d1e21), iron: GEN.C(0x2b2d31), red: GEN.C(0x8e2a22), brass: GEN.C(0xb8923e), maroon: GEN.C(0x5b2a23), roof: GEN.C(0x2c2a2a), win: GEN.C(0xf3dcb0), gold: GEN.C(0xc8a14c) };
function buildLoco(K) {
  // local frame: +x forward, y up, rails at y=0
  for (const sx of [-3.4, -1.6, 0.2, 2.0]) for (const sz of [-0.72, 0.72]) K.box('solid', sx, 0.75, sz, 1.5, 1.5, 0.16, TCOL.red);
  for (const sx of [3.9, 4.8]) for (const sz of [-0.72, 0.72]) K.box('solid', sx, 0.45, sz, 0.8, 0.8, 0.14, TCOL.red);
  K.box('solid', 0, 1.35, 0, 10, 0.4, 2.4, TCOL.iron);
  K.box('solid', 0.8, 2.25, 0, 7.4, 1.7, 1.75, TCOL.black);
  K.box('solid', 0.8, 2.25, 0, 7.0, 1.9, 1.5, TCOL.black);
  for (const x of [-0.8, 1.6, 3.4]) K.box('metal', x, 2.3, 0, 0.12, 2.0, 1.9, TCOL.brass);
  K.box('solid', 4.6, 2.25, 0, 0.3, 1.8, 1.8, TCOL.iron);
  K.box('glow', 4.85, 2.4, 0, 0.12, 0.5, 0.5, GEN.C(0xfff2c8));
  K.box('solid', 3.6, 3.6, 0, 0.6, 1.4, 0.6, TCOL.black);
  K.box('solid', 3.6, 4.35, 0, 0.85, 0.25, 0.85, TCOL.black);
  K.box('metal', 1.6, 3.35, 0, 0.7, 0.6, 0.7, TCOL.brass);
  K.box('solid', -0.4, 3.3, 0, 0.6, 0.55, 0.6, TCOL.black);
  K.box('solid', -3.6, 2.6, 0, 2.8, 2.6, 2.5, TCOL.black);
  K.box('solid', -3.6, 4.05, 0, 3.2, 0.25, 2.8, TCOL.roof);
  for (const sz of [-1.26, 1.26]) K.box('glow', -3.3, 2.9, sz, 1.1, 0.8, 0.04, TCOL.win);
  K.box('solid', 5.1, 0.6, 0, 0.5, 0.5, 2.4, TCOL.red);
  K.box('solid', 4.7, 1.0, 0, 0.3, 0.3, 2.0, TCOL.iron);
}
function buildTender(K) {
  for (const sx of [-1.6, 1.6]) for (const sz of [-0.72, 0.72]) K.box('solid', sx, 0.5, sz, 0.9, 0.9, 0.14, TCOL.red);
  K.box('solid', 0, 1.2, 0, 5.4, 0.3, 2.4, TCOL.iron);
  K.box('solid', 0, 2.1, 0, 5.2, 1.6, 2.4, TCOL.black);
  K.box('solid', 0, 3.0, 0, 4.6, 0.3, 2.0, GEN.C(0x141414));
}
function buildCoach(K) {
  for (const sx of [-4.8, -3.8, 3.8, 4.8]) for (const sz of [-0.72, 0.72]) K.box('solid', sx, 0.5, sz, 0.9, 0.9, 0.14, TCOL.iron);
  K.box('solid', 0, 1.15, 0, 12.6, 0.3, 2.5, TCOL.iron);
  K.box('solid', 0, 2.35, 0, 12.4, 2.2, 2.6, TCOL.maroon);
  K.box('solid', 0, 1.45, 0, 12.45, 0.12, 2.64, TCOL.gold);
  for (let i = 0; i < 8; i++) for (const sz of [-1.31, 1.31]) K.box('glow', -5.1 + i * 1.46, 2.6, sz, 0.9, 0.85, 0.04, TCOL.win);
  K.box('solid', 0, 3.6, 0, 12.6, 0.3, 2.7, TCOL.roof);
  K.box('solid', 0, 3.85, 0, 11.8, 0.22, 1.8, TCOL.roof);
}
const TRAIN = { cars: [], speed: 13.5, period: 3400, line: null, len: 0, phase: 0, smokeT: 0 };
{
  const specs = [['loco', buildLoco, 11], ['tender', buildTender, 6], ['coach', buildCoach, 13.2], ['coach', buildCoach, 13.2], ['coach', buildCoach, 13.2]];
  let off = 0;
  for (const [kind, fn, len] of specs) {
    const g = kitToGroup(fn);
    g.visible = false;
    scene.add(g);
    TRAIN.cars.push({ g, off: off + len / 2, kind });
    off += len + 0.6;
  }
  TRAIN.len = off;
  TRAIN.headLamp = new THREE.PointLight(0xffe2b0, 0, 40, 2);
  scene.add(TRAIN.headLamp);
}
const _ty = new THREE.Vector3();
function updateTrain(dt, t) {
  const cx = camera.position.x, cz = camera.position.z;
  const n = GEN.railLine(cz);
  const near = Math.abs(GEN.railZ(n, cx) - cz) < 900;
  if (!near) { for (const c of TRAIN.cars) c.g.visible = false; TRAIN.line = null; TRAIN.headLamp.intensity = 0; return; }
  TRAIN.line = n;
  const P = TRAIN.period;
  const X = t * TRAIN.speed * (REDUCED ? 0.5 : 1) + GEN.h2(n, 5, 7) * P;
  const k = Math.round((cx - X) / P);
  const head = X + k * P;
  TRAIN.headX = head; window.__headX = head;
  for (const c of TRAIN.cars) {
    const x = head - c.off;
    const z = GEN.railZ(n, x), y = GEN.railH(n, x) + 0.32;
    const dz = GEN.railDZ(n, x);
    c.g.position.set(x, y, z);
    c.g.rotation.set(0, Math.atan2(-dz, 1), 0);
    c.g.visible = Math.abs(x - cx) < 1100;
  }
  const lx = head + 6, lz = GEN.railZ(n, lx);
  TRAIN.headLamp.position.set(lx, GEN.railH(n, lx) + 2.5, lz);
  TRAIN.headLamp.intensity = 60 * ATM.lamps;
  // chimney steam
  TRAIN.smokeT -= dt;
  if (TRAIN.smokeT <= 0 && Math.abs(head - cx) < 700) {
    TRAIN.smokeT = 0.09;
    const loco = TRAIN.cars[0].g;
    _ty.set(3.6, 4.6, 0).applyMatrix4(loco.matrixWorld);
    emitSmoke(_ty.x, _ty.y, _ty.z, 1.0, 1.6, true);
  }
}

// --- soft smoke puffs (train + farmhouse chimneys) ------------------------
{
  const N = 420;
  const pos = new Float32Array(N * 3), age = new Float32Array(N), size = new Float32Array(N);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('age', new THREE.BufferAttribute(age, 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('psize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uPx: { value: 1 }, uCol: { value: new THREE.Color(0.8, 0.8, 0.82) }, uLit: { value: new THREE.Color(1, 0.9, 0.8) } },
    vertexShader: `attribute float age; attribute float psize; uniform float uPx; varying float vA; varying float vAge;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vAge = age;
        vA = age > 0.0 ? smoothstep(0.0, 0.08, age) * (1.0 - smoothstep(0.35, 1.0, age)) : 0.0;
        gl_PointSize = age > 0.0 ? uPx * psize * (0.5 + age * 2.2) * 300.0 / -mv.z : 0.0;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uCol, uLit; varying float vA; varying float vAge;
      void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); float a = smoothstep(0.5, 0.05, r) * vA * 0.42;
        if (a < 0.003) discard; vec3 c = mix(uLit, uCol, smoothstep(-0.3, 0.3, d.y) * 0.6 + vAge * 0.4); gl_FragColor = vec4(c, a); }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false; pts.renderOrder = 4;
  scene.add(pts);
  FX.smoke = { pts, pos, age, size, vel: new Float32Array(N * 3), life: new Float32Array(N), next: 0, N };
}
function emitSmoke(x, y, z, s, life, train) {
  const S = FX.smoke, i = S.next; S.next = (S.next + 1) % S.N;
  S.pos[i * 3] = x; S.pos[i * 3 + 1] = y; S.pos[i * 3 + 2] = z;
  S.vel[i * 3] = (Math.random() - 0.5) * 0.4 + (train ? -1.5 : 0.25); S.vel[i * 3 + 1] = train ? 2.2 + Math.random() : 0.55 + Math.random() * 0.3; S.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
  S.age[i] = 0.001; S.life[i] = life * (train ? 5 : 9); S.size[i] = s * (train ? 1.6 : 0.8);
}
let chimneyT = 0;
function updateSmoke(dt) {
  const S = FX.smoke;
  for (let i = 0; i < S.N; i++) {
    if (S.age[i] <= 0) continue;
    S.age[i] += dt / S.life[i];
    if (S.age[i] >= 1) { S.age[i] = 0; continue; }
    S.pos[i * 3] += S.vel[i * 3] * dt; S.pos[i * 3 + 1] += S.vel[i * 3 + 1] * dt; S.pos[i * 3 + 2] += S.vel[i * 3 + 2] * dt;
    S.vel[i * 3 + 1] *= 1 - dt * 0.25; S.vel[i * 3] += 0.18 * dt;
  }
  chimneyT -= dt;
  if (chimneyT <= 0) {
    chimneyT = 0.5;
    for (const ch of ST.chunks.values()) {
      if (!ch.shown || ch.L > 1 || !ch.data) continue;
      const a = ch.data.spots.smoke;
      for (let i = 0; i < a.length; i += 3) if (Math.hypot(a[i] - camera.position.x, a[i + 2] - camera.position.z) < 220) emitSmoke(a[i] + Math.random() * 0.3, a[i + 1], a[i + 2], 0.6, 1, false);
    }
  }
  S.pts.geometry.attributes.position.needsUpdate = true;
  S.pts.geometry.attributes.age.needsUpdate = true;
  S.pts.geometry.attributes.psize.needsUpdate = true;
}

// --- falling petals near the explorer ----------------------------------
{
  const N = QUALITY === 'high' ? 600 : 260;
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 0.09), new THREE.MeshStandardMaterial({ color: GEN.C(0xf8d2dc).r ? new THREE.Color(0xf8d2dc) : 0xf8d2dc, side: THREE.DoubleSide, roughness: 0.6, emissive: new THREE.Color(0xf5b8c8), emissiveIntensity: 0.08 }), N);
  mesh.frustumCulled = false;
  const st = [];
  for (let i = 0; i < N; i++) st.push({ p: new THREE.Vector3(0, -999, 0), r: new THREE.Euler(), w: new THREE.Vector3(), ph: Math.random() * 10, vy: 0.5, floor: -999, dead: true });
  scene.add(mesh); HIDE_IN_MIRROR.add(mesh);
  FX.petals = { mesh, st, N, spots: [] };
}
let petalScan = 0;
function updatePetals(dt, t) {
  const P = FX.petals;
  petalScan -= dt;
  if (petalScan <= 0) {
    petalScan = 1;
    P.spots = [];
    for (const ch of ST.chunks.values()) {
      if (!ch.shown || ch.L > 0 || !ch.data) continue;
      const a = ch.data.spots.petal;
      for (let i = 0; i < a.length; i += 3) if (Math.hypot(a[i] - camera.position.x, a[i + 2] - camera.position.z) < 70) P.spots.push([a[i], a[i + 1], a[i + 2]]);
    }
  }
  const slow = REDUCED ? 0.35 : 1, wx = 0.55 + Math.sin(t * 0.13) * 0.3;
  for (let i = 0; i < P.N; i++) {
    const s = P.st[i];
    if (s.dead || s.p.y < s.floor) {
      if (s.landed === undefined && !s.dead) { s.landed = 2 + Math.random() * 4; s.p.y = s.floor; s.r.x = -Math.PI / 2; }
      if (s.landed !== undefined) { s.landed -= dt; if (s.landed > 0) { setPetal(i, s); continue; } }
      delete s.landed;
      if (!P.spots.length) { s.dead = true; s.p.y = -999; setPetal(i, s); continue; }
      const src = P.spots[Math.floor(Math.random() * P.spots.length)];
      s.p.set(src[0] + (Math.random() - 0.5) * 3, src[1] + (Math.random() - 0.5) * 1.5 - (s.dead ? Math.random() * 5 : 0), src[2] + (Math.random() - 0.5) * 3);
      s.vy = 0.45 + Math.random() * 0.4; s.w.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
      s.floor = Math.max(GEN.heightAt(s.p.x, s.p.z), 0.03) + 0.02; s.dead = false;
    }
    s.p.x += (wx + Math.sin(t * 2.1 + s.ph) * 0.5) * dt * slow; s.p.z += (0.25 + Math.cos(t * 1.7 + s.ph) * 0.4) * dt * slow;
    s.p.y -= s.vy * (0.75 + 0.35 * Math.sin(t * 3 + s.ph)) * dt * slow;
    s.r.x += s.w.x * dt * slow; s.r.y += s.w.y * dt * slow; s.r.z += s.w.z * dt * slow;
    setPetal(i, s);
  }
  P.mesh.instanceMatrix.needsUpdate = true;
}
function setPetal(i, s) { _q.setFromEuler(_e.set(s.r.x, s.r.y, s.r.z)); _m.compose(s.p, _q, _s1); FX.petals.mesh.setMatrixAt(i, _m); }

// --- fireflies -------------------------------------------------------------
{
  const N = 160;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3).fill(-9999), 3));
  const seed = new Float32Array(N); for (let i = 0; i < N; i++) seed[i] = Math.random() * 100;
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: TIME_U, uAmt: { value: 1 }, uPx: { value: 1 } },
    vertexShader: `attribute float seed; uniform float uTime, uAmt, uPx; varying float vA;
      void main(){ vec3 p = position;
        p.x += sin(uTime*0.35 + seed)*1.6; p.z += cos(uTime*0.3 + seed*1.7)*1.6; p.y += sin(uTime*0.5 + seed*2.3)*0.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float blink = pow(max(sin(uTime*(0.8 + fract(seed)*0.9) + seed*3.0), 0.0), 3.0);
        vA = blink * uAmt; gl_PointSize = uPx * (36.0 / -mv.z) * (0.6 + blink * 0.6); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, r); a = a * a * vA; if (a < 0.01) discard; gl_FragColor = vec4(vec3(1.0, 0.92, 0.45) * a * 2.4, a); }`,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); HIDE_IN_MIRROR.add(pts);
  FX.flies = { pts, N, timer: 0 };
}
function updateFlies(dt) {
  const F = FX.flies;
  F.timer -= dt;
  if (F.timer > 0 || !F.pts.visible) return;
  F.timer = 1.5;
  const spots = [];
  for (const ch of ST.chunks.values()) {
    if (!ch.shown || ch.L > 0 || !ch.data) continue;
    const a = ch.data.spots.fly;
    for (let i = 0; i < a.length; i += 3) spots.push(a[i], a[i + 1], a[i + 2]);
  }
  const pos = F.pts.geometry.attributes.position;
  for (let i = 0; i < F.N; i++) {
    const n = spots.length / 3;
    if (!n || i >= n * 6) { pos.setXYZ(i, 0, -9999, 0); continue; }
    const k = (i % n) * 3, r = ((i * 2654435761) >>> 0) / 4294967296, r2 = ((i * 40503) % 997) / 997;
    pos.setXYZ(i, spots[k] + (r - 0.5) * 14, spots[k + 1] + r2 * 2, spots[k + 2] + (r2 - 0.5) * 14);
  }
  pos.needsUpdate = true;
}

// --- rain & snow --------------------------------------------------------
{
  const N = QUALITY === 'high' ? 6000 : 2600;
  const pos = new Float32Array(N * 6), end = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) { const x = (Math.random() - 0.5) * 90, y = Math.random() * 40, z = (Math.random() - 0.5) * 90; pos.set([x, y, z, x, y, z], i * 6); end[i * 2 + 1] = 1; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('endp', new THREE.BufferAttribute(end, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: TIME_U, uAmt: { value: 0 }, uCam: { value: new THREE.Vector3() }, uCol: { value: new THREE.Color(0.6, 0.65, 0.72) } },
    vertexShader: `attribute float endp; uniform float uTime, uAmt; uniform vec3 uCam; varying float vA;
      void main(){ vec3 p = position;
        p.y = mod(p.y - uTime * 26.0, 40.0);
        p.x = uCam.x + mod(p.x - uCam.x + 45.0, 90.0) - 45.0; p.z = uCam.z + mod(p.z - uCam.z + 45.0, 90.0) - 45.0;
        p.y += uCam.y - 14.0; p += vec3(0.25, 1.0, 0.1) * endp * 0.75;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = uAmt * (0.5 + 0.5 * endp) * smoothstep(60.0, 8.0, -mv.z) * smoothstep(0.5, 3.0, -mv.z);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uCol; varying float vA; void main(){ if (vA < 0.01) discard; gl_FragColor = vec4(uCol, vA * 0.2); }`,
  });
  const lines = new THREE.LineSegments(g, m); lines.frustumCulled = false; lines.visible = false; scene.add(lines); HIDE_IN_MIRROR.add(lines);
  FX.rain = lines;
  const NS = QUALITY === 'high' ? 3500 : 1500;
  const sp = new Float32Array(NS * 3), ss = new Float32Array(NS);
  for (let i = 0; i < NS; i++) { sp[i * 3] = (Math.random() - 0.5) * 70; sp[i * 3 + 1] = Math.random() * 30; sp[i * 3 + 2] = (Math.random() - 0.5) * 70; ss[i] = Math.random(); }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('seed', new THREE.BufferAttribute(ss, 1));
  const sm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: TIME_U, uAmt: { value: 0 }, uCam: { value: new THREE.Vector3() }, uPx: { value: 1 } },
    vertexShader: `attribute float seed; uniform float uTime, uAmt, uPx; uniform vec3 uCam; varying float vA;
      void main(){ vec3 p = position;
        p.y = mod(p.y - uTime * (1.2 + seed * 0.8), 30.0);
        p.x += sin(uTime * 0.8 + seed * 40.0) * 0.8 + uTime * 0.6; p.z += cos(uTime * 0.6 + seed * 30.0) * 0.8;
        p.x = uCam.x + mod(p.x - uCam.x + 35.0, 70.0) - 35.0; p.z = uCam.z + mod(p.z - uCam.z + 35.0, 70.0) - 35.0; p.y += uCam.y - 10.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = uAmt * smoothstep(45.0, 6.0, -mv.z);
        gl_PointSize = uPx * (0.6 + seed) * 60.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, r) * vA * 0.85; if (a < 0.01) discard; gl_FragColor = vec4(vec3(0.95, 0.97, 1.0), a); }`,
  });
  const snow = new THREE.Points(sg, sm); snow.frustumCulled = false; snow.visible = false; scene.add(snow); HIDE_IN_MIRROR.add(snow);
  FX.snow = snow;
}
let snowiness = 0;
function updateWeather(dt) {
  const b = HUD.biome;
  const cold = (b === GEN.B.SNOW ? 1 : 0) || (camera.position.y > 70 ? 1 : 0);
  snowiness += (cold - snowiness) * Math.min(1, dt * 0.8);
  const rain = ATM.rain * (1 - snowiness);
  const snow = Math.max(ATM.rain, 0.25 * (moodName !== 'golden' ? 1 : 0)) * snowiness;
  FX.rain.material.uniforms.uAmt.value = rain; FX.rain.visible = rain > 0.01;
  FX.snow.material.uniforms.uAmt.value = snow; FX.snow.visible = snow > 0.01;
  FX.rain.material.uniforms.uCam.value.copy(camera.position); FX.snow.material.uniforms.uCam.value.copy(camera.position);
}

// --- wildlife: biome-driven creatures (food chain) -----------------------
// butterfly -> sparrow -> fox ; deer graze meadows ; hawk hunts sparrows
function buildButterfly(g) {
  const m = new THREE.MeshBasicMaterial({ color: 0xf2e2c8, side: THREE.DoubleSide });
  const wl = new THREE.Group(), wr = new THREE.Group();
  const w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), m); w1.position.x = -0.11; wl.add(w1);
  const w2 = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), m); w2.position.x = 0.11; wr.add(w2);
  g.add(wl, wr); g.userData = { wl, wr, kind: 'butterfly' };
  g.scale.setScalar(1);
}
function buildSparrow(g) {
  const m = new THREE.MeshStandardMaterial({ color: 0x9a7a5a, roughness: 0.9 });
  const m2 = new THREE.MeshStandardMaterial({ color: 0x6a5238, roughness: 0.9 });
  const body = new THREE.Mesh(boxGeo, m); body.scale.set(0.16, 0.15, 0.28); g.add(body);
  const head = new THREE.Mesh(boxGeo, m2); head.scale.set(0.12, 0.12, 0.12); head.position.set(0, 0.08, 0.17); g.add(head);
  const tail = new THREE.Mesh(boxGeo, m2); tail.scale.set(0.1, 0.04, 0.16); tail.position.set(0, 0.02, -0.2); g.add(tail);
  const wl = new THREE.Group(), wr = new THREE.Group();
  const w1 = new THREE.Mesh(boxGeo, m2); w1.scale.set(0.3, 0.02, 0.14); w1.position.x = -0.15; wl.add(w1);
  const w2 = new THREE.Mesh(boxGeo, m2); w2.scale.set(0.3, 0.02, 0.14); w2.position.x = 0.15; wr.add(w2);
  g.add(wl, wr); g.userData = { wl, wr, kind: 'sparrow' };
}
function buildFox(g) {
  const orange = new THREE.MeshStandardMaterial({ color: 0xd06830, roughness: 0.85 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e0d4, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x30281e, roughness: 0.85 });
  const body = new THREE.Mesh(boxGeo, orange); body.scale.set(0.34, 0.3, 0.8); body.position.y = 0.42; g.add(body);
  const chest = new THREE.Mesh(boxGeo, white); chest.scale.set(0.22, 0.2, 0.3); chest.position.set(0, 0.38, 0.28); g.add(chest);
  const head = new THREE.Mesh(boxGeo, orange); head.scale.set(0.26, 0.24, 0.3); head.position.set(0, 0.62, 0.48); g.add(head);
  const snout = new THREE.Mesh(boxGeo, white); snout.scale.set(0.12, 0.1, 0.16); snout.position.set(0, 0.56, 0.66); g.add(snout);
  const nose = new THREE.Mesh(boxGeo, dark); nose.scale.set(0.06, 0.05, 0.05); nose.position.set(0, 0.58, 0.75); g.add(nose);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(boxGeo, dark); ear.scale.set(0.08, 0.16, 0.05); ear.position.set(sx * 0.1, 0.78, 0.46); g.add(ear);
  }
  const tail = new THREE.Mesh(boxGeo, orange); tail.scale.set(0.14, 0.14, 0.5); tail.position.set(0, 0.52, -0.6); g.add(tail);
  const tip = new THREE.Mesh(boxGeo, white); tip.scale.set(0.15, 0.15, 0.12); tip.position.set(0, 0.52, -0.85); g.add(tip);
  g.userData.legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const leg = new THREE.Mesh(boxGeo, dark); leg.scale.set(0.09, 0.3, 0.09); leg.position.set(sx * 0.12, 0.15, sz * 0.26); g.add(leg);
    g.userData.legs.push(leg);
  }
  g.userData.kind = 'fox';
}
function buildDeer(g) {
  const brown = new THREE.MeshStandardMaterial({ color: 0xa87848, roughness: 0.85 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xd8c8a8, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a2c1e, roughness: 0.85 });
  const body = new THREE.Mesh(boxGeo, brown); body.scale.set(0.44, 0.44, 1.0); body.position.y = 0.86; g.add(body);
  const belly = new THREE.Mesh(boxGeo, pale); belly.scale.set(0.34, 0.2, 0.8); belly.position.set(0, 0.68, 0); g.add(belly);
  const neck = new THREE.Mesh(boxGeo, brown); neck.scale.set(0.2, 0.5, 0.2); neck.position.set(0, 1.2, 0.42); g.add(neck);
  const head = new THREE.Mesh(boxGeo, brown); head.scale.set(0.22, 0.22, 0.36); head.position.set(0, 1.5, 0.52); g.add(head);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(boxGeo, brown); ear.scale.set(0.1, 0.12, 0.04); ear.position.set(sx * 0.13, 1.62, 0.46); g.add(ear);
    const antler = new THREE.Mesh(boxGeo, dark); antler.scale.set(0.05, 0.3, 0.05); antler.position.set(sx * 0.08, 1.72, 0.4); g.add(antler);
    const antl2 = new THREE.Mesh(boxGeo, dark); antl2.scale.set(0.05, 0.05, 0.18); antl2.position.set(sx * 0.08, 1.84, 0.46); g.add(antl2);
  }
  g.userData.legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const leg = new THREE.Mesh(boxGeo, dark); leg.scale.set(0.1, 0.66, 0.1); leg.position.set(sx * 0.16, 0.33, sz * 0.34); g.add(leg);
    g.userData.legs.push(leg);
  }
  g.userData.kind = 'deer';
}
function buildHawk(g) {
  const m = new THREE.MeshStandardMaterial({ color: 0x6a5240, roughness: 0.85 });
  const m2 = new THREE.MeshStandardMaterial({ color: 0xd8c8b0, roughness: 0.85 });
  const body = new THREE.Mesh(boxGeo, m); body.scale.set(0.24, 0.2, 0.5); g.add(body);
  const head = new THREE.Mesh(boxGeo, m2); head.scale.set(0.14, 0.12, 0.14); head.position.set(0, 0.06, 0.3); g.add(head);
  const wl = new THREE.Group(), wr = new THREE.Group();
  const w1 = new THREE.Mesh(boxGeo, m); w1.scale.set(0.9, 0.03, 0.3); w1.position.x = -0.45; wl.add(w1);
  const w2 = new THREE.Mesh(boxGeo, m); w2.scale.set(0.9, 0.03, 0.3); w2.position.x = 0.45; wr.add(w2);
  g.add(wl, wr); g.userData = { wl, wr, kind: 'hawk' };
  g.scale.setScalar(1.4);
}
const FAUNA = [];
{
  const plan = [
    ['butterfly', 14, buildButterfly], ['sparrow', 10, buildSparrow], ['fox', 4, buildFox],
    ['deer', 5, buildDeer], ['hawk', 3, buildHawk],
  ];
  for (const [kind, n, build] of plan) {
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group();
      build(g);
      g.visible = false;
      scene.add(g);
      FAUNA.push({ g, kind, active: false, x: 0, z: 0, y: 0, yaw: Math.random() * 6.28, ph: Math.random() * 10, state: 'idle', stateT: 0, tx: 0, tz: 0, flee: 0 });
    }
  }
}
const BIOME_FAUNA = {
  [GEN.B.SATO]: ['butterfly', 'sparrow', 'fox', 'deer', 'hawk'],
  [GEN.B.SAKURA]: ['butterfly', 'butterfly', 'sparrow', 'fox', 'hawk'],
  [GEN.B.MEADOW]: ['butterfly', 'butterfly', 'sparrow', 'deer', 'deer', 'fox', 'hawk'],
  [GEN.B.MARSH]: ['butterfly', 'sparrow', 'fox'],
  [GEN.B.PADDY]: ['butterfly', 'sparrow', 'hawk'],
  [GEN.B.BAMBOO]: ['sparrow', 'fox'],
  [GEN.B.CEDAR]: ['sparrow', 'fox', 'hawk', 'deer'],
  [GEN.B.PINE]: ['sparrow', 'fox', 'deer', 'hawk'],
  [GEN.B.BEACH]: ['sparrow', 'hawk'],
  [GEN.B.SNOW]: ['fox', 'fox'],
  [GEN.B.TOWN]: ['sparrow', 'sparrow', 'butterfly'],
  [GEN.B.LAKE]: ['sparrow', 'hawk'],
  [GEN.B.RIVER]: ['sparrow', 'butterfly'],
};
const groundYFor = (kind, x, z) => {
  const h = GEN.heightAt(x, z);
  if (kind === 'butterfly') return Math.max(h, 0) + 1.0 + Math.random() * 1.2;
  if (kind === 'sparrow') return Math.max(h, 0) + (Math.random() < 0.6 ? 0.7 : 2.5 + Math.random() * 2);
  if (kind === 'hawk') return Math.max(h, 0) + 12 + Math.random() * 8;
  return Math.max(h, 0); // ground walkers
};
function updateFauna(dt, t) {
  const c = camera.position;
  for (const f of FAUNA) {
    const d = Math.hypot(f.x - c.x, f.z - c.z);
    // manage activity ring
    if (!f.active) {
      if (Math.random() < 0.12) {
        const ang = Math.random() * 6.28, r = 18 + Math.random() * 45;
        f.x = c.x + Math.cos(ang) * r; f.z = c.z + Math.sin(ang) * r;
        const b = GEN.biomeAt(f.x, f.z).biome;
        const want = BIOME_FAUNA[b] || [];
        if (want.includes(f.kind)) {
          f.y = groundYFor(f.kind, f.x, f.z);
          f.active = true; f.placed = true; f.g.visible = true;
        }
      }
      continue;
    }
    if (d > 130) { f.active = false; f.g.visible = false; f.placed = false; continue; }
    // behaviour state machine
    f.stateT -= dt;
    if (f.stateT <= 0) {
      if (f.kind === 'fox' || f.kind === 'deer') {
        f.state = f.state === 'graze' ? 'walk' : (Math.random() < 0.4 ? 'graze' : 'walk');
        f.stateT = f.state === 'graze' ? 2 + Math.random() * 3 : 1.5 + Math.random() * 3;
        if (f.state === 'walk') { const a = Math.random() * 6.28; f.tx = f.x + Math.cos(a) * 8; f.tz = f.z + Math.sin(a) * 8; }
        // flee from the explorer when very close
        if (d < 9) { const a = Math.atan2(f.x - c.x, f.z - c.z); f.tx = f.x + Math.sin(a) * 22; f.tz = f.z + Math.cos(a) * 22; f.state = 'walk'; f.stateT = 1.6; }
      } else if (f.kind === 'butterfly') {
        f.state = 'flutter'; f.stateT = 1 + Math.random() * 2;
        f.tx = f.x + (Math.random() - 0.5) * 8; f.tz = f.z + (Math.random() - 0.5) * 8;
      } else if (f.kind === 'sparrow') {
        f.state = Math.random() < 0.5 ? 'hop' : 'fly';
        f.stateT = 1 + Math.random() * 2;
        f.tx = f.x + (Math.random() - 0.5) * 7; f.tz = f.z + (Math.random() - 0.5) * 7;
      } else if (f.kind === 'hawk') {
        f.state = 'soar'; f.stateT = 4 + Math.random() * 4;
      }
    }
    // motion
    const sp = f.kind === 'fox' ? (f.state === 'walk' ? 2.6 : 0) : f.kind === 'deer' ? (f.state === 'walk' ? 3.2 : 0)
      : f.kind === 'butterfly' ? 1.6 : f.kind === 'sparrow' ? (f.state === 'fly' ? 3.5 : 0.7) : 4.5;
    if (sp > 0) {
      const dx = f.tx - f.x, dz = f.tz - f.z, L = Math.hypot(dx, dz) || 1;
      const step = Math.min(sp * dt, L);
      f.x += dx / L * step; f.z += dz / L * step;
      f.yaw = Math.atan2(dx, dz);
    }
    // food chain: hawks dive at nearby sparrows, foxes stalk butterflies/sparrows on the ground
    if (f.kind === 'hawk' && f.state === 'soar') {
      let prey = null, pd = 26;
      for (const o of FAUNA) if (o.active && o.kind === 'sparrow') { const dd = Math.hypot(o.x - f.x, o.z - f.z); if (dd < pd) { pd = dd; prey = o; } }
      if (prey) { f.tx = prey.x; f.tz = prey.z; if (pd < 3) { prey.x = c.x + (Math.random() - 0.5) * 160; prey.z = c.z + (Math.random() - 0.5) * 160; prey.y = groundYFor('sparrow', prey.x, prey.z); prey.stateT = 0; } }
    }
    if (f.kind === 'fox' && f.state === 'walk') {
      for (const o of FAUNA) if (o.active && o.kind === 'butterfly' && Math.hypot(o.x - f.x, o.z - f.z) < 6) { f.tx = o.x; f.tz = o.z; break; }
    }
    // apply transform
    f.g.position.set(f.x, f.kind === 'hawk' || f.kind === 'sparrow' && f.state === 'fly' ? f.y + Math.sin(t * 1.3 + f.ph) * 0.4 : f.y, f.z);
    if (f.kind === 'hawk') { f.y = Math.max(GEN.heightAt(f.x, f.z), 0) + 12 + Math.sin(t * 0.4 + f.ph) * 3; f.g.position.y = f.y; }
    f.g.rotation.y = f.yaw;
    const spd = f.kind === 'fox' || f.kind === 'deer' ? (f.state === 'walk' ? 7 : 1.2) : 9;
    const fl = Math.sin(t * spd + f.ph);
    if (f.g.userData.legs) { f.g.userData.legs[0].rotation.x = fl * 0.5; f.g.userData.legs[1].rotation.x = -fl * 0.5; f.g.userData.legs[2].rotation.x = -fl * 0.5; f.g.userData.legs[3].rotation.x = fl * 0.5; }
    if (f.g.userData.wl) { const w = f.kind === 'butterfly' ? Math.sin(t * 22 + f.ph) * 0.9 : Math.sin(t * (f.kind === 'hawk' ? 3.5 : 11) + f.ph) * 0.5; f.g.userData.wl.rotation.z = w; f.g.userData.wr.rotation.z = -w; }
  }
}
// --- distant birds --------------------------------------------------------
{
  FX.birds = [];
  const bm = new THREE.MeshBasicMaterial({ color: 0x1b2230, fog: true });
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(boxGeo, bm); body.scale.set(0.35, 0.3, 1.2); g.add(body);
    const wl = new THREE.Group(), wr = new THREE.Group();
    const w1 = new THREE.Mesh(boxGeo, bm); w1.scale.set(2.0, 0.08, 0.6); w1.position.x = -1.0; wl.add(w1);
    const w2 = new THREE.Mesh(boxGeo, bm); w2.scale.set(2.0, 0.08, 0.6); w2.position.x = 1.0; wr.add(w2);
    g.add(wl, wr);
    g.userData = { wl, wr, ph: i * 0.7, off: new THREE.Vector3((i % 3 - 1) * 7 + i, (i % 2) * 3, -i * 5) };
    g.scale.setScalar(1.2);
    scene.add(g);
    FX.birds.push(g);
  }
}
function updateBirds(t) {
  const c = camera.position;
  for (const [i, b] of FX.birds.entries()) {
    const d = b.userData, a = t * 0.02 * (REDUCED ? 0.4 : 1) + 0.6;
    b.position.set(c.x + Math.cos(a) * 220 + d.off.x, Math.max(c.y, 20) + 70 + d.off.y, c.z - 260 + Math.sin(a) * 120 + d.off.z);
    b.rotation.y = a + Math.PI;
    const fl = Math.sin(t * 5.2 + d.ph) * 0.55 * (REDUCED ? 0.4 : 1);
    d.wl.rotation.z = fl; d.wr.rotation.z = -fl;
  }
}
function FX_APPLY(A) {
  for (const f of FAUNA) {
    if (f.kind === 'butterfly' || f.kind === 'hawk') f.g.visible = f.active && A.rain < 0.4;
  }
  FX.flies.pts.material.uniforms.uAmt.value = A.fireflies; FX.flies.pts.visible = A.fireflies > 0.01;
  for (const b of FX.birds) b.visible = A.rain < 0.5 && moodName !== 'night';
  FX.smoke.pts.material.uniforms.uCol.value.copy(A.hemiSky).multiplyScalar(A.hemiI * 0.32).add(_c1.copy(A.fog).multiplyScalar(0.25));
  FX.smoke.pts.material.uniforms.uLit.value.copy(A.key).multiplyScalar(Math.min(1.4, A.keyI * 0.3)).add(FX.smoke.pts.material.uniforms.uCol.value);
}


