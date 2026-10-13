// --- wildlife: biome-driven creatures (food chain) -----------------------
// butterfly -> sparrow -> fox ; deer graze meadows ; hawk hunts sparrows
const FAUNA = [];
const SAKURA_FAUNA = {
  [GEN.B.SATO]: ['butterfly', 'sparrow', 'fox', 'deer', 'hawk'],
  [GEN.B.SAKURA]: ['butterfly', 'sparrow', 'fox', 'hawk'],
  [GEN.B.MEADOW]: ['butterfly', 'sparrow', 'deer', 'fox', 'hawk'],
  [GEN.B.MARSH]: ['butterfly', 'sparrow', 'fox', 'fish'],
  [GEN.B.PADDY]: ['butterfly', 'sparrow', 'hawk'],
  [GEN.B.BAMBOO]: ['sparrow', 'fox'],
  [GEN.B.CEDAR]: ['sparrow', 'fox', 'hawk', 'deer'],
  [GEN.B.PINE]: ['sparrow', 'fox', 'deer', 'hawk'],
  [GEN.B.BEACH]: ['sparrow', 'hawk'],
  [GEN.B.SNOW]: ['fox'],
  [GEN.B.LAKE]: ['sparrow', 'hawk', 'fish'],
  [GEN.B.RIVER]: ['sparrow', 'butterfly', 'fish'],
};
let faunaProfile = null, faunaKinds = new Set();
{
  const plan = [['butterfly', 14, buildButterfly], ['sparrow', 10, buildSparrow], ['fox', 4, buildFox], ['deer', 5, buildDeer], ['hawk', 3, buildHawk], ['fish', 12, buildFish], ['crane', 7, buildCrane], ['buffalo', 5, buildBuffalo]];
  for (const [kind, n, build] of plan) {
    const template = new THREE.Group(); build(template);
    if (template.userData.wl) { template.userData.wl.name = 'left-wing'; template.userData.wr.name = 'right-wing'; }
    if (template.userData.legs) template.userData.legs.forEach((l, i) => { l.name = 'leg-' + i; });
    if (template.userData.tail) template.userData.tail.name = 'tail';
    template.userData = {};
    for (let i = 0; i < n; i++) {
      const g = template.clone();
      g.userData.kind = kind;
      g.userData.wl = g.getObjectByName('left-wing'); g.userData.wr = g.getObjectByName('right-wing');
      if (g.getObjectByName('leg-0')) g.userData.legs = [0, 1, 2, 3].map(i => g.getObjectByName('leg-' + i));
      g.userData.tail = g.getObjectByName('tail');
      g.visible = false; scene.add(g);
      FAUNA.push({ id: kind + '-' + i, g, kind, active: false, x: 0, z: 0, y: 0, yaw: Math.random() * 6.28, ph: Math.random() * 10, state: 'idle', stateT: 0, spawnT: Math.random(), tx: 0, tz: 0 });
    }
  }
}
function faunaTarget(f, x, z) {
  if (!GEN.habitatPath(f.kind, f.x, f.z, x, z)) return false;
  f.tx = x; f.tz = z; return true;
}
function groundYFor(kind, x, z) {
  const h = GEN.heightAt(x, z);
  if (kind === 'fish') return Math.max(h + 0.25, -0.6);
  if (kind === 'butterfly') return Math.max(h, 0) + 1.4;
  if (kind === 'sparrow') return Math.max(h, 0) + 1.2;
  if (kind === 'hawk') return Math.max(h, 0) + 15;
  if (kind === 'crane') return Math.max(h, 0) + 5;
  if (kind === 'buffalo') return h + (GEN.sample(x, z, {}).paddy ? 0.08 : 0);
  return h;
}
function updateFauna(dt, t) {
  const c = camera.position;
  const biomeFauna = GEN.profile.fauna || SAKURA_FAUNA;
  if (faunaProfile !== biomeFauna) { faunaProfile = biomeFauna; faunaKinds = new Set(Object.values(biomeFauna).flat()); }
  for (const f of FAUNA) {
    if (!faunaKinds.has(f.kind)) { f.active = false; f.g.visible = false; continue; }
    const bound = FOLLOW.target && FOLLOW.target.g === f.g;
    let d = Math.hypot(f.x - c.x, f.z - c.z);
    if (!f.active) {
      f.spawnT -= dt;
      if (f.spawnT > 0) continue;
      f.spawnT = 0.3 + Math.random() * 0.7;
      const a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 50;
      const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
      const habitat = GEN.habitatAt(f.kind, x, z);
      if (!habitat || !(biomeFauna[habitat.biome] || []).includes(f.kind)) continue;
      f.x = f.tx = x; f.z = f.tz = z; f.y = groundYFor(f.kind, x, z);
      f.active = true; f.stateT = 0; f.g.visible = true;
      // Spawning replaces stale coordinates, particularly after teleporting.
      d = Math.hypot(f.x - c.x, f.z - c.z);
      LOG.debug('business', 'wildlife-spawned', { kind: f.kind, x, z });
    }
    if (!bound && d > 130) { f.active = false; f.g.visible = false; continue; }
    f.stateT -= dt;
    const walker = ['fox', 'deer', 'buffalo'].includes(f.kind);
    if (f.stateT <= 0) {
      f.state = walker && Math.random() < 0.4 ? 'graze' : f.kind === 'sparrow' && Math.random() < 0.4 ? 'hop' : 'move';
      f.stateT = 1.5 + Math.random() * 3;
      let found = false;
      for (let i = 0; i < 6 && !found; i++) {
        const a = walker && !bound && d < 9 && i === 0 ? Math.atan2(f.z - c.z, f.x - c.x) : Math.random() * Math.PI * 2;
        const r = walker ? 4 + Math.random() * 7 : f.kind === 'hawk' ? 25 : 4 + Math.random() * 5;
        found = faunaTarget(f, f.x + Math.cos(a) * r, f.z + Math.sin(a) * r);
      }
      if (!found) { f.tx = f.x; f.tz = f.z; f.state = 'graze'; }
    }
    // Predators use the same habitat constraints when pursuing their prey.
    if (f.kind === 'fox' && f.state !== 'graze') {
      for (const prey of FAUNA) if (prey.active && ['butterfly', 'sparrow'].includes(prey.kind) && Math.hypot(prey.x - f.x, prey.z - f.z) < 5) {
        faunaTarget(f, prey.x, prey.z); break;
      }
    }
    const speed = f.state === 'graze' ? 0 : f.kind === 'buffalo' ? 0.75 : f.kind === 'crane' ? 3 : f.kind === 'fox' ? 2.6 : f.kind === 'deer' ? 3.2 : f.kind === 'butterfly' ? 1.2 : f.kind === 'fish' ? 1.8 : f.kind === 'sparrow' && f.state === 'hop' ? 0.7 : 4.5;
    const dx = f.tx - f.x, dz = f.tz - f.z, length = Math.hypot(dx, dz), step = Math.min(speed * dt, length);
    let moving = false;
    if (step > 0.001) {
      const x = f.x + dx / length * step, z = f.z + dz / length * step;
      const habitat = GEN.habitatAt(f.kind, x, z);
      if (habitat && (!walker || Math.abs(habitat.h - f.y) < 0.45)) {
        f.x = x; f.z = z; f.yaw = Math.atan2(dx, dz); f.y = groundYFor(f.kind, x, z);
        moving = true;
      } else { f.tx = f.x; f.tz = f.z; f.stateT = 0; }
    }
    const flutter = f.kind === 'crane' ? Math.sin(t * 0.6 + f.ph) * 0.4 : f.kind === 'hawk' ? Math.sin(t * 0.4 + f.ph) * 2 : f.kind === 'butterfly' ? Math.sin(t * 2 + f.ph) * 0.25 : f.kind === 'sparrow' ? Math.sin(t * 1.3 + f.ph) * 0.15 : f.kind === 'fish' ? Math.sin(t * 1.5 + f.ph) * 0.08 : 0;
    f.g.position.set(f.x, f.y + flutter, f.z); f.g.rotation.y = f.yaw;
    const fl = Math.sin(t * (moving ? 7 : 1.2) + f.ph) * (moving ? 0.45 : 0.04);
    if (f.g.userData.legs) f.g.userData.legs.forEach((leg, i) => { leg.rotation.x = fl * (i === 0 || i === 3 ? 1 : -1); });
    if (f.g.userData.wl) {
      const wing = Math.sin(t * (f.kind === 'butterfly' ? 22 : f.kind === 'crane' ? 2.2 : f.kind === 'hawk' ? 3.5 : 11) + f.ph) * 0.5;
      f.g.userData.wl.rotation.z = wing; f.g.userData.wr.rotation.z = -wing;
    }
    if (f.g.userData.tail) f.g.userData.tail.rotation.y = Math.sin(t * 8 + f.ph) * 0.3;
    f.g.visible = !(['butterfly', 'hawk'].includes(f.kind) && ATM.rain > 0.4);
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
    g.userData = { wl, wr, ph: i * 0.7, rural: false, off: new THREE.Vector3((i % 3 - 1) * 7 + i, (i % 2) * 3, -i * 5) };
    g.scale.setScalar(1.2);
    g.visible = false;
    scene.add(g);
    FX.birds.push(g);
  }
}
const FLOCK = { center: new THREE.Vector3(), initialized: false, habitatNext: 0 };
function updateBirds(t) {
  const followed = FOLLOW.target && FOLLOW.target.kind === 'bird';
  if (!FLOCK.initialized || !followed && FLOCK.center.distanceTo(camera.position) > 650) {
    FLOCK.center.copy(camera.position); FLOCK.initialized = true; FLOCK.habitatNext = 0;
  }
  const checkHabitat = t >= FLOCK.habitatNext;
  if (checkHabitat) FLOCK.habitatNext = t + 0.75;
  const c = FLOCK.center;
  for (const [i, b] of FX.birds.entries()) {
    const d = b.userData, a = t * 0.02 * (REDUCED ? 0.4 : 1) + 0.6;
    b.position.set(c.x + Math.cos(a) * 220 + d.off.x, Math.max(c.y, 20) + 70 + d.off.y, c.z - 260 + Math.sin(a) * 120 + d.off.z);
    if (checkHabitat) d.rural = !!GEN.habitatAt('hawk', b.position.x, b.position.z);
    b.visible = d.rural && ATM.rain < 0.5 && moodName !== 'night' && FOLLOW.target?.g !== b;
    b.rotation.y = Math.atan2(-Math.sin(a) * 220, Math.cos(a) * 120);
    const fl = Math.sin(t * 5.2 + d.ph) * 0.55 * (REDUCED ? 0.4 : 1);
    d.wl.rotation.z = fl; d.wr.rotation.z = -fl;
  }
}
