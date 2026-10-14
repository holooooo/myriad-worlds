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
    const mesh = new THREE.InstancedMesh(POOLS[0][name] ? POOLS[0][name].geo : boxGeo, mat, n);
    mesh.instanceMatrix.array.set(m); mesh.instanceColor = new THREE.InstancedBufferAttribute(c, 3);
    mesh.castShadow = name !== 'glow'; mesh.receiveShadow = true; mesh.computeBoundingSphere();
    g.add(mesh);
  }
  return g;
}
const TCOL = { black: GEN.C(0x1d1e21), iron: GEN.C(0x35383d), red: GEN.C(0x8e2a22), brass: GEN.C(0xb8923e), maroon: GEN.C(0x5b2a23), roof: GEN.C(0x2c2a2a), win: GEN.C(0xf3dcb0), gold: GEN.C(0xc8a14c), steel: GEN.C(0x4a4e54), smoke: GEN.C(0x23262a) };
// British-built 4-6-0 export type: tapered boiler, outside cylinders, a tall
// copper-capped chimney and a cab with a wide front spectacle plate.
function buildLoco(K) {
  // local frame: +x forward, y up, rails at y=0
  const WHEEL = GEN.C(0x2a2d31), RIM = GEN.C(0x53575d);
  // driving wheels: three axles, each a squat box with a brighter rim band
  for (const x of [0.1, 2.05, 4.0]) for (const sz of [-1.13, 1.13]) {
    K.box('metal', x, 0.78, sz, 1.62, 1.56, 0.17, WHEEL, 0, 0, Math.PI / 4);
    K.box('metal', x, 0.78, sz * 1.03, 1.72, 1.66, 0.05, RIM, 0, 0, Math.PI / 4);
  }
  // leading bogie pair
  for (const x of [6.35, 7.55]) for (const sz of [-1.05, 1.05]) K.box('metal', x, 0.52, sz, 1.05, 1.04, 0.16, WHEEL, 0, 0, Math.PI / 4);
  // frames and running boards
  for (const sz of [-1.2, 1.2]) {
    K.box('solid', 1.6, 1.28, sz, 11.6, 0.3, 0.24, TCOL.iron);
    K.box('solid', 1.6, 1.9, sz * 1.16, 11.9, 0.16, 0.86, TCOL.black);
    K.box('metal', 1.6, 1.98, sz * 1.58, 11.9, 0.07, 0.07, TCOL.steel);
  }
  K.box('solid', 1.6, 1.5, 0, 11.2, 0.5, 2.1, TCOL.iron);
  // tapered boiler: smokebox forward, firebox under the cab
  const white = GEN.C(0x1a1c1f);
  K.box('solid', 3.55, 2.62, 0, 1.5, 1.72, 1.72, white);
  K.box('metal', 4.24, 2.62, 0, 0.22, 1.86, 1.86, TCOL.steel);
  K.box('solid', 2.45, 2.66, 0, 1.0, 1.8, 1.86, TCOL.black);
  K.box('solid', 1.2, 2.7, 0, 1.6, 1.78, 1.9, TCOL.black);
  K.box('solid', -0.35, 2.72, 0, 1.7, 1.8, 1.94, TCOL.black);
  K.box('solid', -1.5, 2.78, 0, 0.9, 1.92, 2.0, TCOL.black);
  // boiler bands
  if (K.detail > 0.4) for (const x of [0.25, 1.7, 3.0]) K.box('metal', x, 2.68, 0, 0.1, 1.9, 1.96, GEN.C(0x6b6250));
  // chimney with a flared copper cap
  K.box('solid', 3.5, 3.72, 0, 0.52, 1.0, 0.52, TCOL.black);
  K.box('metal', 3.5, 4.28, 0, 0.78, 0.16, 0.78, GEN.C(0xa9713c));
  K.box('solid', 3.5, 4.4, 0, 0.6, 0.1, 0.6, TCOL.iron);
  // steam dome, sand box and whistle
  K.box('solid', 2.3, 3.66, 0, 0.72, 0.6, 0.72, TCOL.black);
  K.box('solid', 1.15, 3.62, 0, 0.62, 0.52, 0.62, TCOL.black);
  K.box('metal', 0.7, 3.95, 0.22, 0.1, 0.34, 0.1, TCOL.brass);
  // outside cylinders driving the middle axle
  for (const sz of [-1.28, 1.28]) {
    K.box('metal', 4.15, 1.42, sz, 1.5, 0.92, 0.62, TCOL.steel);
    K.box('metal', 4.9, 1.42, sz, 0.34, 0.8, 0.66, TCOL.iron);
    K.box('metal', 3.1, 1.42, sz * 0.86, 0.22, 0.2, 0.22, TCOL.brass);
  }
  // cab with a raised roof, side cut-outs and a glowing firebox door
  K.box('solid', -2.6, 2.5, 0, 2.9, 2.5, 2.55, TCOL.maroon);
  K.box('solid', -2.6, 3.86, 0, 3.4, 0.26, 2.95, TCOL.roof);
  K.box('solid', -2.6, 3.72, 0, 3.1, 0.12, 2.7, TCOL.iron);
  for (const sz of [-1.29, 1.29]) {
    K.box('glow', -2.05, 2.95, sz, 1.15, 0.78, 0.05, TCOL.win);
    K.box('glow', -3.5, 2.95, sz, 0.5, 0.72, 0.05, TCOL.win);
  }
  K.box('glow', -4.03, 2.3, 0, 0.06, 0.62, 0.62, GEN.C(0xffb066));
  K.box('solid', -2.6, 1.9, 0, 2.9, 0.35, 2.55, TCOL.iron);
  // front buffer beam, cowcatcher and headlamp
  K.box('solid', 8.05, 1.35, 0, 0.45, 1.5, 2.5, TCOL.red);
  K.box('metal', 8.28, 1.35, 0, 0.1, 0.42, 0.42, TCOL.steel);
  for (const sz of [-0.82, 0.82]) K.box('metal', 7.75, 0.55, sz, 1.0, 0.85, 0.34, TCOL.steel, 0.5, 0, 0);
  K.box('solid', 7.9, 2.9, 0, 0.5, 0.7, 0.7, TCOL.black);
  K.box('glow', 8.14, 2.9, 0, 0.08, 0.46, 0.46, GEN.C(0xfff2c8));
  // backhead coupling to the tender
  K.box('metal', -4.35, 1.4, 0, 0.7, 0.3, 0.3, TCOL.steel);
}
function buildTender(K) {
  const WHEEL = GEN.C(0x2a2d31);
  for (const x of [-1.5, 1.5]) for (const sz of [-1.13, 1.13]) K.box('metal', x, 0.7, sz, 1.4, 1.38, 0.17, WHEEL, 0, 0, Math.PI / 4);
  K.box('solid', 0, 1.3, 0, 6.0, 0.4, 2.2, TCOL.iron);
  for (const sz of [-1.2, 1.2]) K.box('solid', 0, 1.95, sz * 1.14, 6.1, 0.16, 0.8, TCOL.black);
  // coal bunker with visible load
  K.box('solid', 0, 2.35, 0, 5.8, 1.75, 2.35, TCOL.maroon);
  K.box('metal', 0, 2.9, 0, 4.9, 0.42, 1.75, GEN.C(0x15171a));
  K.box('solid', 0, 3.34, 0, 5.9, 0.2, 2.45, TCOL.roof);
  K.box('solid', 0, 3.5, 0, 4.9, 0.16, 1.7, GEN.C(0x1b1d21));
  for (const sz of [-1.19, 1.19]) K.box('solid', 0, 2.35, sz, 5.4, 0.1, 0.06, TCOL.gold);
  K.box('metal', -3.1, 1.35, 0, 0.6, 0.3, 0.3, TCOL.steel);
}
function buildCoach(K) {
  const WHEEL = GEN.C(0x2a2d31);
  // two four-wheel bogies
  for (const bx of [-4.3, 4.3]) {
    K.box('solid', bx, 0.72, 0, 3.4, 0.5, 2.3, TCOL.iron);
    for (const dx of [-1.05, 1.05]) for (const sz of [-1.1, 1.1]) K.box('metal', bx + dx, 0.6, sz, 0.95, 0.94, 0.16, WHEEL, 0, 0, Math.PI / 4);
  }
  // underframe and truss
  K.box('solid', 0, 1.1, 0, 13.0, 0.28, 2.3, TCOL.iron);
  for (const sz of [-1.18, 1.18]) K.box('metal', 0, 1.28, sz, 13.0, 0.12, 0.1, TCOL.steel);
  // body with a gold waist line and a clerestory roof
  K.box('solid', 0, 2.45, 0, 12.9, 2.35, 2.55, TCOL.maroon);
  for (const sz of [-1.29, 1.29]) {
    K.box('solid', 0, 1.45, sz, 12.9, 0.18, 0.06, TCOL.gold);
    K.box('solid', 0, 3.52, sz, 12.9, 0.16, 0.06, TCOL.gold);
  }
  // window band: paired lights with a warm interior
  for (let i = 0; i < 9; i++) {
    const x = -5.4 + i * 1.35;
    for (const sz of [-1.3, 1.3]) {
      K.box('solid', x, 2.62, sz, 1.06, 1.06, 0.05, GEN.C(0x3b2f2a));
      K.box('glow', x, 2.62, sz * 1.02, 0.88, 0.9, 0.04, TCOL.win);
    }
    // ventilators along the roof
    if (i % 2 === 0) K.box('solid', x, 3.98, 0, 0.5, 0.16, 0.5, TCOL.iron);
  }
  // end doors with steps
  for (const dx of [-6.42, 6.42]) {
    K.box('solid', dx, 2.42, 0, 0.16, 2.3, 2.4, GEN.C(0x4a2520));
    K.box('metal', dx * 1.02, 1.7, 0, 0.1, 0.5, 0.5, TCOL.steel);
  }
  // roof: a wide curved cap over a narrower clerestory
  K.box('solid', 0, 3.72, 0, 13.0, 0.22, 2.75, TCOL.roof);
  K.box('solid', 0, 3.88, 0, 12.5, 0.16, 2.15, TCOL.roof);
  K.box('solid', 0, 4.02, 0, 11.6, 0.16, 1.5, TCOL.roof);
}
const TRAIN = { cars: [], speed: 13.5, period: 3400, line: null, len: 0, phase: 0, smokeT: 0 };
{
  const specs = [['loco', buildLoco, 12.6], ['tender', buildTender, 6.6], ['coach', buildCoach, 13.4], ['coach', buildCoach, 13.4], ['coach', buildCoach, 13.4]];
  let off = 0;
  for (const [kind, fn, len] of specs) {
    const g = kitToGroup(fn);
    g.visible = false;
    scene.add(g);
    TRAIN.cars.push({ g, off: off + len / 2, half: len / 2, kind });
    off += len + 0.75;
  }
  TRAIN.len = off;
  TRAIN.headLamp = new THREE.PointLight(0xffe2b0, 0, 40, 2);
  scene.add(TRAIN.headLamp);
}
const _ty = new THREE.Vector3();
// Cars are aligned to the chord of the track they actually stand on. Without
// this each carriage stayed level while the rail climbed, so a consist broke
// apart into separate boxes floating at different heights.
const _cAx = new THREE.Vector3(), _cAy = new THREE.Vector3(), _cAz = new THREE.Vector3(), _cUp = new THREE.Vector3(0, 1, 0), _cM = new THREE.Matrix4(), _cQ = new THREE.Quaternion();
// Real stock has a maximum gradient. `railH` clamps its profile up to clear
// water, which leaves hard knots in the grade; without a cap a carriage
// straddling one of those knots pitches onto its nose against its neighbour.
const TRAIN_MAX_GRADE = 0.075;
function orientCar(g, n, x, half) {
  // Sample the profile over a baseline wider than the body so a single hard
  // knot is averaged away instead of being charged to one carriage.
  const span = half * 1.55;
  const xf = x + span, xb = x - span;
  const zf = GEN.railZ(n, xf), zb = GEN.railZ(n, xb);
  const yf = GEN.railH(n, xf), yb = GEN.railH(n, xb);
  // Build the heading from a unit horizontal direction plus a grade, so the
  // clamp is applied to the actual gradient rather than to a raw component.
  const hx = xf - xb, hz = zf - zb, hl = Math.hypot(hx, hz) || 1e-4;
  let grade = (yf - yb) / hl;
  if (grade > TRAIN_MAX_GRADE) grade = TRAIN_MAX_GRADE;
  else if (grade < -TRAIN_MAX_GRADE) grade = -TRAIN_MAX_GRADE;
  _cAx.set(hx / hl, grade, hz / hl).normalize();
  _cAy.copy(_cUp).addScaledVector(_cAx, -_cUp.dot(_cAx)).normalize();
  _cAz.crossVectors(_cAx, _cAy);
  _cM.makeBasis(_cAx, _cAy, _cAz);
  _cQ.setFromRotationMatrix(_cM);
  // Seat the body on the rail at its own centre. A rigid car riding two bogies
  // crests a summit and sags into a dip; taking the chord average instead
  // would float it above every crest and bury it in every dip.
  g.position.set(x, GEN.railH(n, x) + 0.32, GEN.railZ(n, x));
  g.quaternion.copy(_cQ);
  g.updateMatrixWorld(true);
}
function updateTrain(dt, t) {
  const cx = camera.position.x, cz = camera.position.z;
  const riding = !!(FOLLOW.target && FOLLOW.target.kind === 'train');
  const n = riding ? FOLLOW.target.line : GEN.railLine(cz);
  const near = Math.abs(GEN.railZ(n, cx) - cz) < 900;
  // While riding, the consist is the subject: never cull it on camera
  // distance, or the train vanishes from under the viewer.
  if (!near && !riding) { for (const c of TRAIN.cars) c.g.visible = false; TRAIN.line = null; TRAIN.headLamp.intensity = 0; return; }
  TRAIN.line = n;
  const P = TRAIN.period;
  const X = t * TRAIN.speed * (REDUCED ? 0.5 : 1) + GEN.h2(n, 5, 7) * P;
  const k = riding ? FOLLOW.target.periodK : Math.round((cx - X) / P);
  TRAIN.periodK = k;
  const head = X + k * P;
  TRAIN.headX = head; window.__headX = head;
  const side = riding && FOLLOW.viewMode === 'side';
  for (const c of TRAIN.cars) {
    const x = head - c.off;
    orientCar(c.g, n, x, c.half);
    // Riding hides only the carriage the eye is inside, and only in
    // first-person; every other carriage stays in the shot.
    c.g.visible = riding ? (side || c.g !== FOLLOW.target.g) : Math.abs(x - cx) < 1100;
  }
  const lx = head + 8.4, lz = GEN.railZ(n, lx);
  TRAIN.headLamp.position.set(lx, GEN.railH(n, lx) + 2.9, lz);
  TRAIN.headLamp.intensity = 60 * ATM.lamps;
  // chimney steam
  TRAIN.smokeT -= dt;
  if (TRAIN.smokeT <= 0 && Math.abs(head - cx) < 700) {
    TRAIN.smokeT = 0.09;
    const loco = TRAIN.cars[0].g;
    _ty.set(3.5, 4.5, 0).applyMatrix4(loco.matrixWorld);
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
  FX.petals = { mesh, st, N, spots: [], emission: 0 };
}
let petalScan = 0;
function updatePetals(dt, t) {
  const P = FX.petals;
  petalScan -= dt;
  if (petalScan <= 0) {
    petalScan = 0.3;
    P.spots = [];
    for (const ch of ST.chunks.values()) {
      if (!ch.shown || ch.L > 0 || !ch.data) continue;
      const a = ch.data.spots.petal;
      for (let i = 0; i < a.length; i += 3) if (Math.hypot(a[i] - camera.position.x, a[i + 1] - camera.position.y, a[i + 2] - camera.position.z) < 28) P.spots.push([a[i], a[i + 1], a[i + 2]]);
    }
  }
  const slow = REDUCED ? 0.35 : 1, wx = 0.55 + Math.sin(t * 0.13) * 0.3;
  P.emission = Math.min(30, P.emission + dt * Math.min(100, P.spots.length * 14) * slow);
  for (let i = 0; i < P.N; i++) {
    const s = P.st[i];
    if (s.dead || s.p.y < s.floor) {
      if (s.landed === undefined && !s.dead) { s.landed = 2 + Math.random() * 4; s.p.y = s.floor; s.r.x = -Math.PI / 2; }
      if (s.landed !== undefined) { s.landed -= dt; if (s.landed > 0) { setPetal(i, s); continue; } }
      delete s.landed;
      if (!P.spots.length || P.emission < 1) { s.dead = true; s.p.y = -999; setPetal(i, s); continue; }
      P.emission--;
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

function FX_APPLY(A) {
  for (const f of FAUNA) {
    if (f.kind === 'butterfly' || f.kind === 'hawk') f.g.visible = f.active && A.rain < 0.4;
  }
  FX.flies.pts.material.uniforms.uAmt.value = A.fireflies; FX.flies.pts.visible = A.fireflies > 0.01;
  for (const b of FX.birds) b.visible = b.userData.rural && A.rain < 0.5 && moodName !== 'night' && FOLLOW.target?.g !== b;
  FX.smoke.pts.material.uniforms.uCol.value.copy(A.hemiSky).multiplyScalar(A.hemiI * 0.32).add(_c1.copy(A.fog).multiplyScalar(0.25));
  FX.smoke.pts.material.uniforms.uLit.value.copy(A.key).multiplyScalar(Math.min(1.4, A.keyI * 0.3)).add(FX.smoke.pts.material.uniforms.uCol.value);
}


