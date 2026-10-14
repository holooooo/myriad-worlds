// =====================================================================
//  Controls, UI, audio, main loop, boot
// =====================================================================
let introT = REDUCED || QS.has('nointro') ? 1 : 0;
const camS = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, fov: 55 };
const camG = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, fov: 55 };
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function fwdOf(yaw, pitch, out = new THREE.Vector3()) { return out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)); }
let fadeEl = null, fadeVersion = 0;
async function cutFade(fn) {
  if (REDUCED) { await fn(); return; }
  const version = ++fadeVersion;
  if (!fadeEl) { fadeEl = document.createElement('div'); fadeEl.style.cssText = 'position:fixed;inset:0;background:#0b1120;opacity:0;pointer-events:none;z-index:4;transition:opacity .25s ease'; document.body.appendChild(fadeEl); }
  fadeEl.style.opacity = '1';
  await new Promise(resolve => setTimeout(resolve, 260));
  if (version !== fadeVersion) return;
  try { await fn(); }
  catch (error) { LOG.error('error', 'camera-transition-failed', { message: String(error.message || error) }); }
  finally { if (version === fadeVersion) fadeEl.style.opacity = '0'; }
}
function snapTo(pos, yaw, pitch, fov = 55) {
  camS.pos.set(...pos); camG.pos.set(...pos);
  camS.yaw = camG.yaw = yaw; camS.pitch = camG.pitch = pitch; camS.fov = camG.fov = fov;
}
function minCamY(x, z) {
  const h = GEN.heightAt(x, z);
  return Math.max(h < 0 ? 1.4 : h + 1.7, 1.4);
}
const keys = new Set();
let interacted = false, tour = false;
function markInteract() { if (!interacted) { interacted = true; setTimeout(() => { const h = $('hint'); if (h) h.classList.add('gone'); }, 500); } if (introT < 1) introT = 1; if (car && car.on) stopTour(); }
const pointers = new Map();
let pinchD = 0;
canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false }); canvas.classList.add('dragging'); markInteract(); if (pointers.size === 2) { for (const p of pointers.values()) p.moved = true; const [a, b] = [...pointers.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); } });
canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  p.moved ||= Math.hypot(p.x - p.startX, p.y - p.startY) > 6;
  if (pointers.size === 1) { const s = (e.pointerType === 'touch' ? 0.0045 : 0.0032) * (camS.fov / 55); if (FOLLOW.target) lookFollow(dx, dy, s); else { camG.yaw -= dx * s; camG.pitch -= dy * s; } }
  else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchD > 0 && !FOLLOW.target) camG.pos.addScaledVector(fwdOf(camS.yaw, camS.pitch), (d - pinchD) * 0.10);
    pinchD = d;
  }
});
const endPtr = (e) => { const p = pointers.get(e.pointerId); pointers.delete(e.pointerId); if (pointers.size < 2) pinchD = 0; if (!pointers.size) canvas.classList.remove('dragging'); if (p && !p.moved && e.type === 'pointerup') selectUnit(e.clientX, e.clientY); };
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault(); markInteract();
  if (FOLLOW.target) return;
  let d = clamp(e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1), -240, 240);
  camG.pos.addScaledVector(fwdOf(camS.yaw, camS.pitch), -d * 0.035 * (1 + camS.pos.y / 70));
}, { passive: false });
// crouch state + sprint speed ramp
const MOVE = { eye: 1.7, eyeG: 1.7, sprint: 1 };   // eye height (current/goal), sprint multiplier 1..3
function keyMove(dt) {
  if (!keys.size) return;
  // sprint: holding Shift ramps the multiplier toward 3x; releasing decays back to 1x
  MOVE.sprint = keys.has('shift') ? Math.min(3, MOVE.sprint + dt * 0.8) : Math.max(1, MOVE.sprint - dt * 2.4);
  const sp = 14 * MOVE.sprint * dt * ((keys.has('alt') || keys.has('c')) ? 0.45 : 1);
  const f = fwdOf(camG.yaw, 0), r = new THREE.Vector3(-f.z, 0, f.x);
  if (keys.has('w') || keys.has('arrowup')) camG.pos.addScaledVector(f, sp);
  if (keys.has('s') || keys.has('arrowdown')) camG.pos.addScaledVector(f, -sp);
  if (keys.has('a') || keys.has('arrowleft')) camG.pos.addScaledVector(r, -sp);
  if (keys.has('d') || keys.has('arrowright')) camG.pos.addScaledVector(r, sp);
  if (keys.has('e') || keys.has(' ')) camG.pos.y += sp * 0.8;
  if (keys.has('q')) camG.pos.y -= sp * 0.8;
}
function clampGoal() {
  const p = camG.pos;
  // crouch: lower the eye height goal; only near the ground does it actually crouch
  MOVE.eyeG = (keys.has('alt') || keys.has('c')) ? 0.75 : 1.7;
  const ground = minCamY(p.x, p.z);
  // crouching lets the camera glide a touch lower than standing
  p.y = clamp(p.y, (keys.has('alt') || keys.has('c')) ? ground - 0.95 : ground, 260);
  camG.pitch = clamp(camG.pitch, -1.5, 1.1);
  camG.fov = clamp(camG.fov, 28, 70);
}
const TAU = Math.PI * 2;
const fwdV = new THREE.Vector3(), _t = new THREE.Vector3();
let tourT = 0, tourC = new THREE.Vector3(), tourR = 40, tourH = 12;
function updateCamera(dt) {
  updateCarousel(dt);
  if (updateFollow(dt)) {
    MOVE.eye = MOVE.eyeG = 1.7;
  } else if (car.on) {
    MOVE.eye = MOVE.eyeG = 1.7;
  } else if (tour) {
    tourT += dt / 120;
    const a = tourT * TAU;
    const cx = tourC.x + Math.cos(a) * tourR, cz = tourC.z + Math.sin(a) * tourR * 0.7;
    camS.pos.set(cx, tourH + Math.sin(tourT * 3) * 2, cz);
    camS.yaw = -a - Math.PI / 2; camS.pitch = -0.12;
  } else {
    keyMove(dt); clampGoal();
    const kp = 1 - Math.exp(-dt * 5.5), kr = 1 - Math.exp(-dt * 9);
    camS.pos.lerp(camG.pos, kp);
    camS.yaw += wrapA(camG.yaw - camS.yaw) * kr;
    camS.pitch += (camG.pitch - camS.pitch) * kr;
    camS.fov += (camG.fov - camS.fov) * kp;
  }
  let off = 0;
  if (introT < 1) { introT = Math.min(1, introT + dt / 6); off = 1 - smoothstep(0, 1, introT); }
  // smooth crouch: ease eye height; the lens drops by the eased amount, scaled by proximity to ground
  MOVE.eye += (MOVE.eyeG - MOVE.eye) * Math.min(1, dt * 9);
  camera.position.copy(camS.pos);
  const gnd = minCamY(camS.pos.x, camS.pos.z);
  const crouchK = clamp(1 - (camera.position.y - gnd) / 2.5, 0, 1);
  if (!FOLLOW.target) camera.position.y -= (1.7 - MOVE.eye) * crouchK;
  if (off > 0) { camera.position.add(fwdV.set(Math.sin(camS.yaw), 0, Math.cos(camS.yaw)).multiplyScalar(-30 * off)); camera.position.y += 6 * off; }
  fwdOf(camS.yaw, camS.pitch - off * 0.05, fwdV);
  camera.lookAt(_t.copy(camera.position).add(fwdV));
  const aspect = innerWidth / innerHeight;
  const fov = CINEMATIC.lensFov(camS.fov, aspect);
  if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
// ---- scene carousel: visits the best landmarks in sequence ----
const SAKURA_CAROUSEL = [
  { key: 'temple', dwell: 14, dist: 46, h: 13 },
  { key: 'castle', dwell: 16, dist: 74, h: 18 },
  { key: 'farm', dwell: 12, dist: 40, h: 11 },
  { key: 4, dwell: 12, dist: 36, h: 10 },      // rice terraces
  { key: 'teahouse', dwell: 12, dist: 38, h: 11 },
  { key: 'pavilion', dwell: 12, dist: 36, h: 11 },
  { key: 'shrine', dwell: 12, dist: 34, h: 10 },
  { key: 'lighthouse', dwell: 12, dist: 40, h: 12 },
  { key: 'hut', dwell: 12, dist: 36, h: 12 },   // snow hut
  { key: 'seaTorii', dwell: 12, dist: 40, h: 11 },
  { key: 'rail', dwell: 0, dist: 30, h: 8, train: true },
];
const CAROUSEL = THEME === 'shanshui' ? GEN.profile.landmarks.map(t => ({ key: t.key, dwell: 15, dist: 50, h: 15 })) : SAKURA_CAROUSEL;
const car = { on: false, i: 0, t: 0, leg: 'idle', mode: 'auto', token: 0, tgt: null, check: 0, replanning: false, first: true };
function updateTourButton() {
  const b = $('btnTour'); if (!b) return;
  b.setAttribute('aria-pressed', String(car.on));
  b.setAttribute('aria-label', I18N.t(car.on ? 'action.tour.stop' : 'action.tour'));
  b.setAttribute('title', I18N.t(car.on ? 'action.tour.stop' : 'action.tour.title'));
  b.textContent = car.on ? '⏸' : I18N.t('action.tour');
}
async function carouselFind(key, stop = {}, index = 0) {
  const f = GEN.findBiome(key, camera.position.x, camera.position.z, 12000);
  if (!f) return null;
  const shot = await CINEMATIC.plan(f, { mode: REDUCED ? 'static' : car.mode, index, dist: f.lakeGroup ? 210 : Math.max(stop.dist || 40, f.r > 15 ? 70 : 40), height: f.lakeGroup ? 43 : stop.h || 14 });
  if (!shot) return null;
  const v = CINEMATIC.pose(shot, 0);
  return { pos: v.pos, look: v.look, shot, feature: f };
}
function startTour(options = {}) {
  stopFollow(false);
  if (car.on) { stopTour(); return; }
  car.mode = ['static', 'orbit', 'pan', 'auto'].includes(options.mode) ? options.mode : 'auto';
  car.on = true; car.i = 0; car.t = 0; car.leg = 'find'; car.tgt = null; car.replanning = false; car.first = true; car.token++;
  tour = false; introT = 1; keys.clear();
  document.body.classList.toggle('touring', true);
  closeMenu(); CINEMATIC.progress('finding', 0);
  LOG.info('access', 'tour-start-requested', { mode: car.mode });
  updateTourButton();
  toastKey('toast.tour.started');
  return carouselNext();
}
function stopTour() {
  document.body.classList.toggle('touring', false);
  car.token++; CINEMATIC.cancel();
  fadeVersion++; if (fadeEl) fadeEl.style.opacity = '0';
  if (!car.on) { // plain orbit when toggled off-carousel
    tour = false; updateTourButton();
    return;
  }
  car.on = false; car.tgt = null; car.leg = 'idle'; car.replanning = false;
  camG.pos.copy(camS.pos); camG.yaw = camS.yaw; camG.pitch = camS.pitch; camG.fov = camS.fov;
  LOG.info('access', 'tour-stop-requested', {});
  updateTourButton();
  toastKey('toast.tour.ended');
}
function placeTourCamera(shot, progress = 0) {
  const { pos, look, fov } = CINEMATIC.pose(shot, progress);
  snapTo(pos, Math.atan2(look[0] - pos[0], look[2] - pos[2]), Math.atan2(look[1] - pos[1], Math.hypot(look[0] - pos[0], look[2] - pos[2])), fov);
}
function tourChunksReady(spot) {
  // A camera cut remains covered while the actual local meshes are arriving.
  // Coarse rings can be ready long before the destination itself is ready.
  return [spot.pos, spot.look].every(p => [...ST.chunks.values()].some(ch => ch.state === 'ready' && ch.shown && ch.L <= 1 && ch.data &&
    p[0] >= ch.data.x0 && p[0] < ch.data.x0 + ch.data.size && p[2] >= ch.data.z0 && p[2] < ch.data.z0 + ch.data.size));
}
async function revealTourShot(spot, token) {
  // Fly the camera to the incoming composition instead of dipping to black.
  // Only the very first shot of a tour fades in, because there is no previous
  // pose to travel from; every later hop is a continuous eased dolly.
  const hasTravel = typeof CINEMATIC.beginTravel === 'function';
  const canTravel = hasTravel && !car.first && !REDUCED;

  if (canTravel) {
    // --- smooth travel path ---
    car.leg = 'travel'; CINEMATIC.progress('transition', 0);
    const fromPose = { pos: [camS.pos.x, camS.pos.y, camS.pos.z], yaw: camS.yaw, pitch: camS.pitch, fov: camS.fov };
    const travelDur = CINEMATIC.beginTravel(fromPose, spot.shot);
    let elapsed = 0;
    let lastTs = performance.now();
    while (car.on && token === car.token) {
      await nextFrame();
      if (!car.on || token !== car.token) return;
      const now = performance.now();
      const dt = Math.min((now - lastTs) / 1000, 0.1);
      lastTs = now;
      elapsed += dt;
      const frame = CINEMATIC.updateTravel(dt);
      if (frame) {
        const p = frame.pos;
        snapTo(Array.isArray(p) ? p : [p.x, p.y, p.z], frame.yaw, frame.pitch, frame.fov);
        CINEMATIC.progress('transition', Math.min(elapsed / travelDur, 1));
      }
      if (!frame || frame.done || elapsed >= travelDur + 0.5) break;
    }
    if (!car.on || token !== car.token) return;
    // Arrive exactly on the planned pose, then let the local meshes catch up
    // while the camera holds still — no fade, the shot simply resolves.
    placeTourCamera(spot.shot);
    car.leg = 'loading'; CINEMATIC.progress('loading', 0);
    const began = performance.now();
    while (car.on && token === car.token && !tourChunksReady(spot) && performance.now() - began < 8000) await nextFrame();
    if (!car.on || token !== car.token) return;
    if (!tourChunksReady(spot)) LOG.warn('business', 'tour-destination-load-timeout', { x: spot.feature.x, z: spot.feature.z });
    const refined = await CINEMATIC.refine(spot.shot, 0, true);
    if (!car.on || token !== car.token) return;
    if (!refined) { await carouselNext(); return; }
    spot.shot = refined; placeTourCamera(refined);
    car.t = 0; car.check = 0; car.leg = 'dwell'; CINEMATIC.progress('dwell', 0);
  } else {
    // --- first shot (or reduced motion / no travel API): fade in ---
    car.leg = 'cut'; car.first = false; CINEMATIC.progress('transition', 0);
    await cutFade(async () => {
      if (!car.on || token !== car.token) return;
      placeTourCamera(spot.shot); car.leg = 'loading';
      CINEMATIC.progress('loading', 0);
      const began = performance.now();
      while (car.on && token === car.token && !tourChunksReady(spot) && performance.now() - began < 8000) await nextFrame();
      if (!car.on || token !== car.token) return;
      if (!tourChunksReady(spot)) LOG.warn('business', 'tour-destination-load-timeout', { x: spot.feature.x, z: spot.feature.z });
      const refined = await CINEMATIC.refine(spot.shot, 0, true);
      if (!car.on || token !== car.token) return;
      if (!refined) { await carouselNext(); return; }
      spot.shot = refined; placeTourCamera(refined);
      car.t = 0; car.check = 0; car.leg = 'dwell'; CINEMATIC.progress('dwell', 0);
    });
  }
}
async function carouselNext() {
  if (!car.on) return;
  const token = ++car.token;
  CINEMATIC.cancel(); CINEMATIC.progress('finding', 0);
  car.leg = 'find'; car.tgt = null; car.replanning = false;
  for (let attempt = 0; attempt < CAROUSEL.length; attempt++) {
    const stop = CAROUSEL[car.i % CAROUSEL.length], index = car.i++;
    await nextFrame(); if (!car.on || token !== car.token) return;
    const spot = await carouselFind(stop.key, stop, index);
    if (!car.on || token !== car.token) return;
    if (!spot) { LOG.debug('business', 'tour-destination-skipped', { destination: stop.key }); continue; }
    car.tgt = spot; car.dwell = stop.train ? 26 : stop.dwell;
    await revealTourShot(spot, token); return;
  }
  LOG.warn('business', 'tour-no-safe-destinations', {}); stopTour();
}
function updateCarousel(dt) {
  if (!car.on || !car.tgt || car.leg !== 'dwell' || car.replanning) return;
  car.t += dt; car.check -= dt;
  const progress = clamp(car.t / car.dwell, 0, 1);
  if (car.check <= 0) {
    car.check = 0.8;
    const token = car.token, shot = car.tgt.shot;
    car.replanning = true;
    CINEMATIC.refine(shot, progress).then(next => {
      if (!car.on || token !== car.token) return;
      car.replanning = false;
      if (!next) { carouselNext(); return; }
      if (next !== shot) { car.tgt.shot = next; revealTourShot(car.tgt, token); }
    }).catch(error => {
      if (!car.on || token !== car.token) return;
      car.replanning = false; LOG.error('error', 'tour-refinement-failed', { message: String(error.message || error) }); carouselNext();
    });
  }
  placeTourCamera(car.tgt.shot, progress); CINEMATIC.progress('dwell', progress);
  if (car.t >= car.dwell) carouselNext();
}
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  const isMove = ['w', 'a', 's', 'd', 'q', 'e', ' ', 'alt', 'c', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k);
  if ((e.metaKey || (e.altKey && k !== 'alt' && k !== 'c') || e.ctrlKey) && !isMove) return;
  if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
  if (isMove) {
    stopFollow(false); keys.add(k); markInteract(); stopTour(); if (k.startsWith('arrow') || k === 'alt') e.preventDefault(); return;
  }
  if (e.repeat) return;
  if (k === 't') startTour();
  else if (/^[1-5]$/.test(k)) { const mood = ['morning', 'golden', 'dusk', 'night', 'rain'][Number(k) - 1]; LOG.info('access', 'atmosphere-shortcut', { mood }); setMood(mood); }
  else if (k === 'h') toggleUI();
  else if (k === 'p') saveImage();
  else if (k === 'escape') { stopTour(); stopFollow(); closeMenu(); }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
// --- UI helpers -----------------------------------------------------------
let toastT = 0, lastToastKey = null;
function toast(msg) { lastToastKey = null; const t = $('toast'); if (!t) { LOG.debug('business', 'toast', { message: msg }); return; } t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); }
function toastKey(key, args) { toast(I18N.t(key, typeof args === 'function' ? args() : args)); lastToastKey = { key, args }; }
function toggleUI(force) { document.body.classList.toggle('hidden-ui', force !== undefined ? force : !document.body.classList.contains('hidden-ui')); }
function saveImage() {
  renderFrame(0);
  canvas.toBlob((blob) => {
    if (!blob) { toastKey('toast.shot.failed'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'myriad-worlds-' + SEED + '-' + moodName + '-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toastKey('toast.shot.saved');
  }, 'image/png');
}
// --- biome HUD --------------------------------------------------------------
const HUD = { biome: -1, timer: 0 };
function updateHUD(dt) {
  HUD.timer -= dt;
  if (HUD.timer > 0) return;
  HUD.timer = 0.5;
  const p = camera.position;
  const b = GEN.biomeAt(p.x, p.z);
  HUD.biome = b.biome;
  // Ambient bed follows the ground you are standing on, blended smoothly.
  audio.setBiome(b.biome);
  $('altVal').textContent = Math.round(p.y) + ' m';
  // The brand glyph carries the current biome: one kanji, read at a glance.
  const glyph = $('bioGlyph');
  if (glyph) {
    const g = (GEN.BIOME_NAMES[b.biome] && GEN.BIOME_NAMES[b.biome][0]) || '境';
    if (glyph.textContent !== g) glyph.textContent = g;
    glyph.title = I18N.biomeName(b.biome, THEME);
  }
  const load = Math.round(STREAM.readyFrac * 100);
  $('loadSnap').hidden = load >= 100;
  if (load < 100) $('loadSnap').textContent = I18N.t('loading.chunks', { percent: load });
}
async function teleport(key) {
  stopFollow(false); stopTour();
  LOG.info('access', 'teleport-requested', { destination: key });
  toastKey('toast.teleport.search');
  await nextFrame();
  const f = GEN.findBiome(key, camera.position.x, camera.position.z, 12000);
  if (!f) { LOG.warn('business', 'teleport-destination-unavailable', { destination: key }); toastKey('toast.teleport.missing'); return; }
  let pos, tgt;
  if (f.rail) {
    const side = GEN.heightAt(f.x, f.z - 14) < GEN.heightAt(f.x, f.z + 14) ? -1 : 1;
    pos = [f.x + 30, f.h + 4.5, f.z + side * 16];
    tgt = [f.x - 120, f.h + 2, f.z];
  }
  else { const v = GEN.vantage(f, f.lakeGroup ? 210 : f.r > 15 ? 70 : 42, f.lakeGroup ? 43 : f.r > 15 ? 18 : 11); pos = v.pos; tgt = v.target; }
  cutFade(() => {
    camG.pos.set(...pos); camS.pos.set(...pos);
    const d = new THREE.Vector3(tgt[0] - pos[0], tgt[1] - pos[1], tgt[2] - pos[2]).normalize();
    camG.yaw = camS.yaw = Math.atan2(d.x, d.z);
    camG.pitch = camS.pitch = Math.asin(d.y);
    introT = 1;
  });
  LOG.info('business', 'teleport-arrived', { destination: key, x: f.x, z: f.z });
  toastKey('toast.teleport.arrived');
}
// --- ambient sound ---------------------------------------------------------
// Fully layered generative soundscape:
//  • Continuous noise layers (wind, stream, rain, ocean, forest, crickets)
//  • Procedural melody: pentatonic koto/guqin phrases for sakura,
//    pentatonic erhu/xiao phrases for shanshui, each themed to mood
//  • Stochastic events: birds, frogs, wind chime, temple bell, water drops
//  • Biome blending: player position drives smooth layer crossfades
//  • Mood crossfade: all gains ramp smoothly on mood change
const audio = (() => {
  let ctx = null, master = null, on = false, schedTimer = null;
  let currentMood = moodName, currentBiome = -1, theme = THEME;

  // Shared node references — rebuilt on first toggle
  const layers = {}; // name -> GainNode feeding master
  const FADE = 2.0;  // seconds for mood/biome crossfade

  // ---------------------------------------------------------------------------
  //  Noise palette
  // ---------------------------------------------------------------------------
  function makeNoiseBuf(seconds = 4, tint = 'white') {
    const sr = ctx.sampleRate, len = sr * seconds;
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (tint === 'pink') { lp = lp * 0.98 + w * 0.02; d[i] = w * 0.5 + lp * 8; }
      else if (tint === 'brown') { lp = lp * 0.995 + w * 0.005; d[i] = lp * 20; }
      else d[i] = w;
    }
    // normalise
    let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
    if (peak > 0) for (let i = 0; i < len; i++) d[i] /= peak;
    return buf;
  }

  function loopNoise(buf, offset = 0) {
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = offset; s.start(0); return s;
  }

  function makeLayer(name, src, ...filterDefs) {
    // filterDefs: [{type, freq, Q, gain}]
    let node = src;
    for (const f of filterDefs) {
      const bq = ctx.createBiquadFilter(); bq.type = f.type;
      bq.frequency.value = f.freq; if (f.Q) bq.Q.value = f.Q; if (f.gain != null) bq.gain.value = f.gain;
      node.connect(bq); node = bq;
    }
    const g = ctx.createGain(); g.gain.value = 0; node.connect(g); g.connect(master);
    layers[name] = g; return g;
  }

  // ---------------------------------------------------------------------------
  //  Melodic helpers
  // ---------------------------------------------------------------------------
  // Pentatonic scales: root-relative semitones
  const PENTA_MINOR = [0, 3, 5, 7, 10]; // classic pentatonic minor (erhu/guqin)
  const PENTA_MAJOR = [0, 2, 4, 7, 9];  // pentatonic major (koto)
  function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function pentatonicNote(rootMidi, scale, degree) { const oct = Math.floor(degree / scale.length), d = degree % scale.length; return rootMidi + oct * 12 + scale[d]; }

  // A very gentle triangle-wave pluck with natural exponential decay
  function pluck(freq, attack, decay, vol, when) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    // Slight vibrato for erhu warmth
    const vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = 5.5; vg.gain.value = freq * 0.008;
    vib.connect(vg); vg.connect(o.frequency); vib.start(when); vib.stop(when + decay + 0.1);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    o.connect(g); g.connect(master); o.start(when); o.stop(when + decay + 0.05);
  }

  // A soft sine bell/chime
  function bell(freq, decay, vol, when) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    // Add a subtle 2nd partial
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = 'sine'; o2.frequency.value = freq * 2.756; g2.gain.value = vol * 0.18;
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vol, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    g2.gain.setValueAtTime(0, when); g2.gain.linearRampToValueAtTime(vol * 0.18, when + 0.004);
    g2.gain.exponentialRampToValueAtTime(0.0001, when + decay * 0.7);
    o.connect(g); g.connect(master); o2.connect(g2); g2.connect(master);
    o.start(when); o.stop(when + decay + 0.05); o2.start(when); o2.stop(when + decay * 0.8);
  }

  // Soft bird chirp — two-note warble, no harsh frequencies
  function bird(vol, when) {
    const f0 = 2200 + Math.random() * 1400, up = 1.12 + Math.random() * 0.22;
    const notes = Math.random() < 0.4 ? [[f0, 0.06], [f0 * up, 0.08], [f0 * up * 0.97, 0.06]]
                                        : [[f0, 0.07], [f0 * up, 0.06]];
    let t = when;
    for (const [f, dur] of notes) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.06, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02); t += dur + 0.04 + Math.random() * 0.05;
    }
  }

  // Frog croak
  function frog(vol, when) {
    const f = 180 + Math.random() * 60;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth';
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 2;
    o.frequency.setValueAtTime(f, when); o.frequency.exponentialRampToValueAtTime(f * 0.7, when + 0.18);
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vol, when + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
    o.connect(lp); lp.connect(g); g.connect(master); o.start(when); o.stop(when + 0.25);
  }

  // Water drip for mountain/river ambience
  function drip(vol, when) {
    const f = 800 + Math.random() * 600;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, when); o.frequency.exponentialRampToValueAtTime(f * 0.4, when + 0.12);
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vol, when + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
    o.connect(g); g.connect(master); o.start(when); o.stop(when + 0.2);
  }

  // ---------------------------------------------------------------------------
  //  Level tables: [noise layers] keyed by mood, biome-adaptive in setLevels()
  // ---------------------------------------------------------------------------
  //  Each entry: { stream, wind, rain, ocean, forest, cricket, vol }
  const MOOD_LEVELS = {
    morning: { stream:0.12, wind:0.04, rain:0, ocean:0.02, forest:0.10, cricket:0.05, vol:0.80 },
    golden:  { stream:0.11, wind:0.04, rain:0, ocean:0.02, forest:0.08, cricket:0.18, vol:0.85 },
    dusk:    { stream:0.08, wind:0.05, rain:0, ocean:0.02, forest:0.04, cricket:0.35, vol:0.90 },
    night:   { stream:0.06, wind:0.06, rain:0, ocean:0.02, forest:0.02, cricket:0.42, vol:0.75 },
    rain:    { stream:0.08, wind:0.08, rain:0.32, ocean:0.01, forest:0.06, cricket:0,    vol:0.80 },
  };

  // Biome multipliers (applied on top of mood baseline)
  const BIOME_MUL = {
    [0/*OCEAN*/]:  { stream:0.1, wind:1.5, ocean:3.0, forest:0, cricket:0.2 },
    [1/*BEACH*/]:  { stream:0.2, wind:1.2, ocean:2.2, forest:0, cricket:0.1 },
    [2/*SATO*/]:   { stream:0.8, wind:0.8, ocean:0,   forest:1.2, cricket:1.0 },
    [3/*SAKURA*/]: { stream:0.6, wind:0.6, ocean:0,   forest:1.4, cricket:0.8 },
    [4/*PADDY*/]:  { stream:1.0, wind:0.5, ocean:0,   forest:0.8, cricket:1.4 },
    [5/*TOWN*/]:   { stream:0.5, wind:0.5, ocean:0,   forest:0.6, cricket:0.6 },
    [6/*CEDAR*/]:  { stream:0.5, wind:1.0, ocean:0,   forest:1.8, cricket:0.4 },
    [7/*BAMBOO*/]: { stream:0.4, wind:1.3, ocean:0,   forest:1.4, cricket:0.6 },
    [8/*SNOW*/]:   { stream:0.1, wind:2.0, ocean:0,   forest:0.3, cricket:0   },
    [9/*LAKE*/]:   { stream:0.3, wind:0.7, ocean:0,   forest:0.8, cricket:1.0 },
    [10/*RIVER*/]: { stream:2.0, wind:0.5, ocean:0,   forest:0.9, cricket:0.8 },
    [11/*MEADOW*/]:{ stream:0.4, wind:0.8, ocean:0,   forest:1.0, cricket:1.2 },
    [12/*MARSH*/]: { stream:0.6, wind:0.4, ocean:0,   forest:1.0, cricket:1.6 },
    [13/*PINE*/]:  { stream:0.3, wind:1.4, ocean:0,   forest:1.6, cricket:0.3 },
  };

  function setLevels(fade = FADE) {
    if (!ctx) return;
    const M = MOOD_LEVELS[currentMood] || MOOD_LEVELS.golden;
    const bm = BIOME_MUL[currentBiome] || BIOME_MUL[2];
    const t = ctx.currentTime, tc = fade / 3;
    const apply = (name, base, mul = 1) => {
      if (!layers[name]) return;
      layers[name].gain.setTargetAtTime(base * (bm[name] ?? mul) * M.vol, t, tc);
    };
    apply('stream',  M.stream);
    apply('wind',    M.wind);
    apply('rain',    M.rain, 1);
    apply('ocean',   M.ocean);
    apply('forest',  M.forest);
    apply('cricket', M.cricket);
    master.gain.setTargetAtTime(M.vol, t, tc);
  }

  // ---------------------------------------------------------------------------
  //  Melodic phrase scheduling
  // ---------------------------------------------------------------------------
  // Melody parameters driven by mood + theme
  function melodyParams() {
    const isShanshui = theme === 'shanshui';
    // Root MIDI: morning bright, dusk/night lower register
    const rootMap = { morning: 64, golden: 62, dusk: 59, night: 57, rain: 60 };
    const root = rootMap[currentMood] ?? 62;
    const scale = isShanshui ? PENTA_MINOR : PENTA_MAJOR;
    const speed = currentMood === 'night' ? 1.8 : currentMood === 'morning' ? 1.2 : 1.5;
    const vol = currentMood === 'rain' ? 0.012 : currentMood === 'night' ? 0.018 : 0.022;
    const noteCount = 3 + Math.floor(Math.random() * 3);
    return { root, scale, speed, vol, noteCount, isShanshui };
  }

  function playPhrase() {
    if (!on || !ctx) return;
    const { root, scale, speed, vol, noteCount, isShanshui } = melodyParams();
    const now = ctx.currentTime;
    let t = now + 0.1;
    // Choose a contiguous ascending or descending run with a leap at the end
    const start = Math.floor(Math.random() * scale.length);
    const dir = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < noteCount; i++) {
      const degree = start + dir * i;
      const midi = pentatonicNote(root, scale, ((degree % scale.length) + scale.length * 2) % scale.length)
                   + Math.floor(degree / scale.length) * 12;
      const freq = midiToHz(midi);
      const dur = (isShanshui ? 1.6 : 1.2) * speed * (1 + Math.random() * 0.3);
      const decay = dur * 2.8;
      if (isShanshui) pluck(freq, 0.015, decay, vol * (0.7 + Math.random() * 0.3), t);
      else             bell(freq, decay, vol * (0.7 + Math.random() * 0.3), t);
      t += dur + (Math.random() < 0.35 ? speed * 0.5 : 0); // occasional rest
    }
    // Temple bell in dusk/night
    if ((currentMood === 'dusk' || currentMood === 'night') && Math.random() < 0.12) {
      const bellMidi = isShanshui ? 36 : 41; // low D or F
      bell(midiToHz(bellMidi), 6.5, 0.03, ctx.currentTime + 0.5 + Math.random() * 2);
    }
  }

  // ---------------------------------------------------------------------------
  //  Stochastic event scheduling
  // ---------------------------------------------------------------------------
  function scheduleEvents() {
    if (!on) return;
    const M = MOOD_LEVELS[currentMood] || MOOD_LEVELS.golden;
    const bm = BIOME_MUL[currentBiome] || BIOME_MUL[2];
    const isMorning = currentMood === 'morning';
    const isNight = currentMood === 'night' || currentMood === 'dusk';
    const isRain = currentMood === 'rain';

    // Birds — morning/golden and forested biomes
    const birdMul = ((bm.forest ?? 1) + (bm.cricket ?? 1)) / 2;
    if (!isRain && !isNight && Math.random() < 0.45 * (isMorning ? 1.6 : 1) * birdMul * M.vol)
      bird(0.016 + Math.random() * 0.008, ctx.currentTime + Math.random() * 0.5);

    // Frogs — marsh/lake/paddy and dusk/night
    const frogBiomes = new Set([4, 9, 12]);
    if (isNight && frogBiomes.has(currentBiome) && Math.random() < 0.5)
      frog(0.02, ctx.currentTime + Math.random() * 1.2);

    // Water drip — river/mountain/rain
    if ((currentBiome === 10 || currentBiome === 6 || isRain) && Math.random() < 0.3)
      drip(0.018, ctx.currentTime + Math.random() * 0.8);

    // Melodic phrase — quieter moods more frequent, avoid in loud rain
    const phraseProbability = isRain ? 0.08 : isNight ? 0.18 : 0.22;
    if (Math.random() < phraseProbability) playPhrase();

    const interval = isNight ? 2800 + Math.random() * 3500
                   : isRain  ? 3500 + Math.random() * 4000
                              : 1800 + Math.random() * 2800;
    schedTimer = setTimeout(scheduleEvents, interval);
  }

  // ---------------------------------------------------------------------------
  //  Build / wire Web Audio graph
  // ---------------------------------------------------------------------------
  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);

    // --- noise buffers (created once, looped) ---
    const white = makeNoiseBuf(5, 'white');
    const pink  = makeNoiseBuf(6, 'pink');
    const brown = makeNoiseBuf(7, 'brown');

    // stream — bandpass centred on babbling-brook frequencies with slow LFO
    const streamSrc = loopNoise(pink, 1.3);
    const bp1 = ctx.createBiquadFilter(); bp1.type = 'bandpass'; bp1.frequency.value = 700; bp1.Q.value = 0.5;
    const bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 1400; bp2.Q.value = 0.8;
    const lfo1 = ctx.createOscillator(); lfo1.frequency.value = 0.09;
    const lg1 = ctx.createGain(); lg1.gain.value = 280; lfo1.connect(lg1); lg1.connect(bp1.frequency); lfo1.start();
    streamSrc.connect(bp1); bp1.connect(bp2);
    const sgain = ctx.createGain(); sgain.gain.value = 0; bp2.connect(sgain); sgain.connect(master); layers.stream = sgain;

    // wind — low-frequency brown noise, slight high-frequency shimmer
    const windSrc = loopNoise(brown, 0.7);
    const wlp = ctx.createBiquadFilter(); wlp.type = 'lowpass'; wlp.frequency.value = 480;
    const wshim = ctx.createBiquadFilter(); wshim.type = 'highpass'; wshim.frequency.value = 2400;
    const whiteW = loopNoise(white, 2.1);
    windSrc.connect(wlp);
    const wgain = ctx.createGain(); wgain.gain.value = 0;
    const wsg = ctx.createGain(); wsg.gain.value = 0.1;
    whiteW.connect(wshim); wshim.connect(wsg); wlp.connect(wgain); wsg.connect(wgain); wgain.connect(master); layers.wind = wgain;

    // rain — shaped white noise, higher frequencies
    const rainSrc = loopNoise(white, 1.8);
    const rhp = ctx.createBiquadFilter(); rhp.type = 'highpass'; rhp.frequency.value = 1500;
    const rlp = ctx.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 9000;
    rainSrc.connect(rhp); rhp.connect(rlp);
    const rgain = ctx.createGain(); rgain.gain.value = 0; rlp.connect(rgain); rgain.connect(master); layers.rain = rgain;

    // ocean — slow surf swell: low rumble + white spray
    const oceanSrc = loopNoise(brown, 4.2);
    const olp = ctx.createBiquadFilter(); olp.type = 'lowpass'; olp.frequency.value = 260;
    const oSpray = loopNoise(white, 3.1);
    const oSlp = ctx.createBiquadFilter(); oSlp.type = 'bandpass'; oSlp.frequency.value = 800; oSlp.Q.value = 0.3;
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.07;
    const lg2 = ctx.createGain(); lg2.gain.value = 0.12; lfo2.connect(lg2); lfo2.start();
    const ogain = ctx.createGain(); ogain.gain.value = 0;
    oceanSrc.connect(olp); olp.connect(ogain); oSpray.connect(oSlp); oSlp.connect(ogain); ogain.connect(master); layers.ocean = ogain;

    // forest — mid pink noise filtered to sound like leaves
    const forestSrc = loopNoise(pink, 3.5);
    const flp = ctx.createBiquadFilter(); flp.type = 'bandpass'; flp.frequency.value = 1100; flp.Q.value = 0.4;
    const lfo3 = ctx.createOscillator(); lfo3.frequency.value = 0.21;
    const lg3 = ctx.createGain(); lg3.gain.value = 160; lfo3.connect(lg3); lg3.connect(flp.frequency); lfo3.start();
    const fgain = ctx.createGain(); fgain.gain.value = 0; forestSrc.connect(flp); flp.connect(fgain); fgain.connect(master); layers.forest = fgain;

    // cricket — amplitude-modulated high-pitched narrow band
    const cricketSrc = loopNoise(white, 2.0);
    const cbp = ctx.createBiquadFilter(); cbp.type = 'bandpass'; cbp.frequency.value = 4800; cbp.Q.value = 4;
    const cam = ctx.createOscillator(); cam.frequency.value = 22;
    const camg = ctx.createGain(); camg.gain.value = 0;
    const cenv = ctx.createGain(); cenv.gain.value = 1;
    cam.connect(camg); camg.connect(cenv.gain); cenv.gain.setValueAtTime(0.5, ctx.currentTime);
    cam.start(); cricketSrc.connect(cbp); cbp.connect(cenv); cenv.connect(camg);
    const cgain = ctx.createGain(); cgain.gain.value = 0; cbp.connect(cgain); cgain.connect(master); layers.cricket = cgain;
  }

  // ---------------------------------------------------------------------------
  //  Public API
  // ---------------------------------------------------------------------------
  return {
    async toggle() {
      if (!on) {
        if (!ctx) build();
        await ctx.resume();
        on = true;
        theme = THEME;
        setLevels(0.8);
        scheduleEvents();
      } else {
        on = false;
        clearTimeout(schedTimer);
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
        setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 2000);
      }
      const b = $('btnSound');
      if (b) {
        b.setAttribute('aria-pressed', String(on));
        const o1 = b.querySelector('.snd-on'), o2 = b.querySelector('.snd-off');
        if (o1) o1.style.display = on ? '' : 'none';
        if (o2) o2.style.display = on ? 'none' : '';
      }
      return on;
    },

    // Called when mood changes — smooth crossfade
    setMood(m) {
      currentMood = m;
      setLevels(FADE);
    },

    // Called from updateHUD — biome has changed, smooth blend
    setBiome(b) {
      if (b === currentBiome) return;
      currentBiome = b;
      setLevels(FADE * 1.5);
    },

    setTheme(t) { theme = t; },
  };
})();
if ($('btnTour')) $('btnTour').addEventListener('click', () => startTour());
if ($('btnShot')) $('btnShot').addEventListener('click', saveImage);
if ($('btnSound')) $('btnSound').addEventListener('click', async () => {
  try { const on = await audio.toggle(); toastKey(on ? 'toast.sound.on' : 'toast.sound.off'); } catch (e) { LOG.warn('error', 'audio-unavailable', { message: String(e.message || e) }); toastKey('toast.sound.failed'); }
});
document.querySelectorAll('#moods button').forEach((b) => b.addEventListener('click', () => {
  if (typeof FREE_TIME !== 'undefined' && FREE_TIME.on) toggleFreeTime(false);
  setMood(b.dataset.mood);
}));
// Free-time slider
if ($('timeSlider')) {
  $('timeSlider').addEventListener('input', (e) => {
    if (typeof applyFreeTime === 'function') applyFreeTime(Number(e.target.value));
  });
}
// Add free-time toggle button to tools bar if it exists
(function() {
  const tools = document.querySelector('.tools');
  if (!tools) return;
  const btn = document.createElement('button');
  btn.className = 'ib'; btn.id = 'btnTime'; btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('data-tip', I18N.t('time.mode.title'));
  btn.setAttribute('aria-label', I18N.t('time.mode'));
  btn.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>';
  btn.addEventListener('click', () => {
    const on = typeof toggleFreeTime === 'function' ? toggleFreeTime() : false;
    btn.setAttribute('aria-pressed', String(on));
    toastKey(on ? 'toast.time.on' : 'toast.time.off');
  });
  tools.appendChild(btn);
})();
// --- main loop -----------------------------------------------------------
let clockT = 0, lastNow = performance.now(), fpsN = 0, fpsT = 0, fpsShow = 60, autoChecked = QS.has('q');
let mirrorFrame = 0;
function renderFrame(dt) {
  sky.position.copy(camera.position);
  grade.uniforms.uTime.value = clockT;
  composer.render(dt);
}
function loop(now) {
  requestAnimationFrame(loop);
  const elapsed = Math.max(0, (now - lastNow) / 1000);
  const dt = Math.min(0.05, elapsed);
  lastNow = now;
  if (document.hidden) return;
  clockT += dt;
  TIME_U.value = clockT; SKY_U.uTime.value = clockT;
  updateMood(dt);
  updateTrain(dt, clockT);
  updateBirds(clockT);
  updateFauna(dt, clockT);
  SETTLEMENTS.update(dt, clockT);
  updateCamera(dt);
  updateMist(dt, clockT);
  updateLanterns(dt, clockT);
  streamUpdate(camera.position);
  integrateSome(QUALITY === 'high' ? 4 : 6);
  cullInstances(dt);
  updateShadow(dt);
  if (STREAM.visibleWater && (mirrorFrame = (mirrorFrame + 1) % (QUALITY === 'high' ? 1 : 2)) === 0) { WATER_U.uMirrorOn.value = 1; renderMirror(); }
  updateLamps(dt, ATM.lamps);
  updateSmoke(dt);
  updatePetals(dt, clockT);
  updateFlies(dt);
  updateWeather(dt);
  updateHUD(dt);
  renderFrame(dt);
  fpsN++; fpsT += elapsed; if (window.__frameHook) window.__frameHook();
  if (fpsT >= 0.5) { fpsShow = fpsN / fpsT; fpsN = 0; fpsT = 0; $('fpsVal').textContent = Math.round(fpsShow); }
  if (!autoChecked && clockT > 3) {
    if (fpsShow < 40 && prScale > 0.7) { prScale = Math.max(0.7, prScale - 0.15); applyQuality(QUALITY); }
    else if (fpsShow < 24 && QUALITY === 'high') { prScale = 1; applyQuality('lite'); toastKey('toast.quality.lite'); autoChecked = true; }
    else if (fpsShow >= 40) autoChecked = true;
  }
}
function applyQuality(q) {
  if (!['high', 'lite'].includes(q)) q = 'high';
  QUALITY = q;
  LOG.info('business', 'render-quality-changed', { quality: q });
  volPass.setQuality(q);
  setWaterQuality(q);
  const pr = pixelRatioFor(q);
  renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
  const ms = q === 'high' ? 4 : 2;
  for (const r of [composer.renderTarget1, composer.renderTarget2]) if (r.samples !== ms) { r.samples = ms; r.dispose(); }
  renderer.shadowMap.needsUpdate = true;
  resize();
  applyAtmosphere();
}
function resize() {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  volPass.setSize(w, h);
  FX.flies.pts.material.uniforms.uPx.value = renderer.getPixelRatio() * h / 900;
  FX.smoke.pts.material.uniforms.uPx.value = renderer.getPixelRatio() * h / 900;
  FX.snow.material.uniforms.uPx.value = renderer.getPixelRatio() * h / 900;
}
window.addEventListener('resize', resize);
// --- boot ----------------------------------------------------------------
I18N.setLogger(LOG);
I18N.onChange(() => {
  $('moodLine').textContent = I18N.t('mood.' + moodName);
  updateTourButton();
  HUD.timer = 0; updateHUD(0);
  if (lastToastKey) $('toast').textContent = I18N.t(lastToastKey.key, typeof lastToastKey.args === 'function' ? lastToastKey.args() : lastToastKey.args);
  if (typeof SKY_SETTINGS !== 'undefined') SKY_SETTINGS.setLanguage(I18N.lang);
});
I18N.init();
setProgress(0.2, I18N.t('loading.vantage'));
await nextFrame();
const spawn = GEN.findSpawn();
mark('spawn');
setProgress(0.3, I18N.t('loading.firstChunks'));
await nextFrame();
{
  const L0 = GEN.LODS[0], cx = Math.round(spawn.target[0] / L0.size), cz = Math.round(spawn.target[2] / L0.size);
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const ch = requestChunk(0, cx + i, cz + j, 0);
    ch.state = 'gen';
    const c = GEN.genChunk(cx + i, cz + j, 0);
    integrate({ key: ch.key, gen: genTag, c });
  }
  mark('primed');
}
snapTo(spawn.pos, Math.atan2(spawn.target[0] - spawn.pos[0], spawn.target[2] - spawn.pos[2]), Math.atan2(spawn.target[1] - spawn.pos[1], Math.hypot(spawn.target[0] - spawn.pos[0], spawn.target[2] - spawn.pos[2])), 55);
camera.position.copy(camS.pos);
SETTLEMENTS.init();
setProgress(0.5, I18N.t('loading.light'));
await nextFrame();
applyQuality(QUALITY);
setMood(moodName, true);
refreshEnv();
updateShadow(0, true);
setProgress(0.7, I18N.t('loading.shaders'));
await nextFrame();
try { await renderer.compileAsync(scene, camera); } catch (e) { LOG.warn('error', 'shader-precompile-failed', { message: String(e.message || e) }); }
mark('compiled');
renderFrame(0);
setProgress(1, I18N.t('loading.welcome'));
booted = true;
$('hud').hidden = false;
window.__sv = {
  ready: true, GEN, camera, scene, renderer, teleport, setMood, applyQuality, startTour, stopTour, saveImage, I18N,
  cinematic: { get state() { return { ...CINEMATIC.state, running: car.on, ready: car.on && car.leg === 'dwell', destination: car.tgt?.feature.type || null }; },
    get ready() { return car.on && car.leg === 'dwell'; }, next: carouselNext },
  ST, STREAM, POOLS, key, keys, MOVE, FAUNA, SETTLEMENTS, FOLLOW, FX, TRAIN, MIST, LANTERNS, WATER_U, MIRROR, volPass, LOG, startFollow, stopFollow, setFollowViewMode, openFollowMenu, nearbyUnits,
  goCam(x, y, z, tx, ty, tz) { snapTo([x, y, z], Math.atan2(tx - x, tz - z), Math.atan2(ty - y, Math.hypot(tx - x, tz - z)), 55); introT = 1; },
  get state() { return { seed: SEED, theme: THEME, language: I18N.lang, mood: moodName, quality: QUALITY, stableCapture: QS.get('capture') === 'stable', biome: HUD.biome >= 0 ? GEN.BIOME_NAMES[HUD.biome][1] : '?' }; },
};
requestAnimationFrame((t) => { lastNow = t; loop(t); });
setTimeout(() => { $('loader').classList.add('done'); setTimeout(() => { const l = $('loader'); if (l) l.remove(); }, 1200); }, 250);
if (!interacted) setTimeout(() => toastKey('toast.explore'), 2500);
window.__tp = async (key) => { await teleport(key); await new Promise(r=>setTimeout(r,800)); return JSON.stringify({cam:[camera.position.x|0, camera.position.y|0, camera.position.z|0]}); };
