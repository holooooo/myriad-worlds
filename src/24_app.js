// =====================================================================
//  Controls, UI, audio, main loop, boot
// =====================================================================
let introT = REDUCED || QS.has('nointro') ? 1 : 0;
const camS = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, fov: 55 };
const camG = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, fov: 55 };
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function fwdOf(yaw, pitch, out = new THREE.Vector3()) { return out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)); }
let fadeEl = null;
function cutFade(fn) {
  if (REDUCED) { fn(); return; }
  if (!fadeEl) { fadeEl = document.createElement('div'); fadeEl.style.cssText = 'position:fixed;inset:0;background:#0b1120;opacity:0;pointer-events:none;z-index:4;transition:opacity .25s ease'; document.body.appendChild(fadeEl); }
  fadeEl.style.opacity = '1';
  setTimeout(() => { fn(); fadeEl.style.opacity = '0'; }, 260);
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
  let fov = camS.fov;
  if (aspect < 1.4) fov = Math.min(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * 1.35)), 74);
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
const car = { on: false, i: 0, t: 0, leg: 'fly', from: null, dur: 0, tgt: null };
async function carouselFind(key) {
  const f = GEN.findBiome(key, camera.position.x, camera.position.z, 12000);
  if (!f) return null;
  if (f.rail) return { pos: [f.x + 26, f.h + 8, f.z + 14], look: [f.x - 60, f.h + 2, f.z] };
  const v = GEN.vantage(f, f.r > 15 ? 70 : 40, f.r > 15 ? 17 : 11);
  return { pos: v.pos, look: v.target };
}
function startTour() {
  stopFollow(false);
  if (car.on) { stopTour(); return; }
  car.on = true; car.i = 0; car.t = 0; car.leg = 'find';
  const b = $('btnTour'); if (b) { b.setAttribute('aria-pressed', 'true'); b.textContent = '⏸'; }
  toast('Scenic tour · 开始巡游 · click again to stop');
  carouselNext();
}
function stopTour() {
  if (!car.on) { // plain orbit when toggled off-carousel
    tour = false; const b = $('btnTour'); if (b) { b.setAttribute('aria-pressed', 'false'); b.textContent = '🎬'; }
    return;
  }
  car.on = false;
  camG.pos.copy(camS.pos); camG.yaw = camS.yaw; camG.pitch = camS.pitch;
  const b = $('btnTour'); if (b) { b.setAttribute('aria-pressed', 'false'); b.textContent = '🎬'; }
  toast('Tour ended');
}
async function carouselNext() {
  if (!car.on) return;
  const stop = CAROUSEL[car.i % CAROUSEL.length];
  car.i++;
  const spot = await carouselFind(stop.key);
  if (!spot) { carouselNext(); return; }
  car.tgt = spot;
  car.leg = 'fly';
  const dist = Math.hypot(spot.pos[0] - camS.pos.x, spot.pos[2] - camS.pos.z);
  car.dur = clamp(4 + dist / 60, 4, 9) * (REDUCED ? 0.5 : 1);
  car.t = 0;
  car.from = { pos: camS.pos.clone(), yaw: camS.yaw, pitch: camS.pitch, fov: camS.fov };
  if (stop.train) car.dwell = 26; else car.dwell = stop.dwell;
}
function updateCarousel(dt) {
  if (!car.on || !car.tgt) return;
  car.t += dt;
  if (car.leg === 'fly') {
    const k = smoothstep(0, 1, car.t / car.dur);
    const [px, py, pz] = car.tgt.pos, [lx, ly, lz] = car.tgt.look;
    // arc the flight a bit above both ends
    const mx = lerp(car.from.pos.x, px, k), mz = lerp(car.from.pos.z, pz, k);
    const arc = Math.sin(k * Math.PI) * clamp(Math.hypot(px - car.from.pos.x, pz - car.from.pos.z) * 0.12, 2, 14);
    camS.pos.set(mx, Math.max(lerp(car.from.pos.y, py, k) + arc, minCamY(mx, mz) + 1.5), mz);
    const yaw = Math.atan2(lx - camS.pos.x, lz - camS.pos.z);
    const pitch = Math.atan2(ly - camS.pos.y, Math.hypot(lx - camS.pos.x, lz - camS.pos.z));
    camS.yaw += wrapA(yaw - camS.yaw) * Math.min(1, dt * 2.2);
    camS.pitch += (pitch - camS.pitch) * Math.min(1, dt * 2.2);
    camG.pos.copy(camS.pos); camG.yaw = camS.yaw; camG.pitch = camS.pitch;
    if (car.t >= car.dur) { car.leg = 'dwell'; car.t = 0; }
  } else {
    // slow drift while dwelling
    camS.pos.x += Math.sin(clockT * 0.1) * dt * 0.6;
    camS.pos.z += Math.cos(clockT * 0.08) * dt * 0.6;
    if (car.t >= car.dwell) carouselNext();
  }
}
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  const isMove = ['w', 'a', 's', 'd', 'q', 'e', ' ', 'alt', 'c', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k);
  if ((e.metaKey || (e.altKey && k !== 'alt' && k !== 'c') || e.ctrlKey) && !isMove) return;
  if (e.target && /input|textarea/i.test(e.target.tagName)) return;
  if (isMove) {
    stopFollow(false); keys.add(k); markInteract(); stopTour(); if (k.startsWith('arrow') || k === 'alt') e.preventDefault(); return;
  }
  if (e.repeat) return;
  if (k === 't') startTour();
  else if (k === 'h') toggleUI();
  else if (k === 'p') saveImage();
  else if (k === 'escape') { stopFollow(); closeMenu(); }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
// --- UI helpers -----------------------------------------------------------
let toastT = 0;
function toast(msg) { const t = $('toast'); if (!t) { console.log('[toast]', msg); return; } t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); }
function toggleUI(force) { document.body.classList.toggle('hidden-ui', force !== undefined ? force : !document.body.classList.contains('hidden-ui')); }
function saveImage() {
  renderFrame(0);
  canvas.toBlob((blob) => {
    if (!blob) { toast('Could not capture the image'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sakura-world-' + SEED + '-' + moodName + '-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Saved as PNG');
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
  $('altVal').textContent = Math.round(p.y) + ' m';
  let name = GEN.BIOME_NAMES[b.biome][0];
  if (b.rail) name = '線路 · Railway';
  $('bioVal').textContent = name;
  const load = Math.round(STREAM.readyFrac * 100);
  $('loadSnap').hidden = load >= 100;
  if (load < 100) $('loadSnap').textContent = 'Generating ' + load + '%';
}
// --- teleport menu -------------------------------------------------------
const menuEl = $('menu'), menuBox = $('menuBox');
const SAKURA_TELEPORTS = [
  { key: 'temple', label: '寺 · Temple', sub: 'Hillside temple & pagoda' },
  { key: 'castle', label: '城 · Castle', sub: 'Castle town streets' },
  { key: 'shrine', label: '社 · Shrine', sub: 'Torii path in the woods' },
  { key: 'farm', label: '田 · Farmstead', sub: 'Farmhouse & fields' },
  { key: 4, label: '棚田 · Terraces', sub: 'Flooded rice paddies' },
  { key: 'teahouse', label: '茶 · Teahouse', sub: 'Lakeside teahouse' },
  { key: 'lighthouse', label: '灯 · Lighthouse', sub: 'Rocky cape' },
  { key: 'hut', label: '山小屋 · Hut', sub: 'Snow-line cabin' },
  { key: 'pavilion', label: '湖 · Lake', sub: 'Water pavilion' },
  { key: 'seaTorii', label: '鳥居 · Sea torii', sub: 'Torii in the surf' },
  { key: 'rail', label: '駅 · Railway', sub: 'Wait for the train' },
  { key: 3, label: '桜 · Sakura grove', sub: 'Cherry blossom forest' },
  { key: 8, label: '雪山 · Snow peaks', sub: 'Winter highlands' },
];
const TELEPORTS = GEN.profile.landmarks || SAKURA_TELEPORTS;
function openMenu(html) { menuBox.innerHTML = html; menuEl.classList.add('show'); }
function closeMenu() { menuEl.classList.remove('show'); }
const worldTitle = THEME === 'shanshui' ? '山水中国 · Shanshui World' : '樱之世界 · Sakura World';
$('title').querySelector('h1').textContent = worldTitle;
document.title = worldTitle;
function navigateWorld(theme, seed = SEED) {
  const query = new URLSearchParams(location.search);
  query.set('theme', theme); query.set('seed', seed); query.set('q', QUALITY);
  LOG.info('access', 'world-change-requested', { theme, seed });
  location.search = query.toString();
}
$('btnWorld').addEventListener('click', () => {
  openMenu('<h2 id="menuTitle">选择世界 · Worlds</h2>'
    + '<p>同一引擎与种子，独立的地形、资产与生态规则。</p>'
    + '<div class="btnRow"><button class="btnSec" data-world="sakura">樱之世界 · Sakura</button><button class="btnSec" data-world="shanshui">山水中国 · Shanshui</button></div>'
    + '<p>山水中国包含黄山峰林、梯田、九寨彩湖、长安街市、仙鹤与水牛；夜间城镇有孔明灯。</p>'
    + '<div class="btnRow"><button class="btnPri" id="menuClose">返回 · Back</button></div>');
  menuBox.querySelectorAll('[data-world]').forEach(b => b.onclick = () => navigateWorld(b.dataset.world));
  $('menuClose').onclick = closeMenu;
});
if ($('btnHelp')) $('btnHelp').addEventListener('click', () => {
  openMenu('<h2>Guide · 案内</h2>'
    + '<h3>Exploring</h3><ul><li><b>Drag</b> to look · <b>Scroll / pinch</b> to move forward and back</li>'
    + '<li><b>W A S D</b> walk · <b>Space / E</b> rise · <b>Q</b> descend · <b>Shift</b> hold to sprint (ramps to 3x) · <b>Ctrl</b> crouch</li>'
    + '<li><b>T</b> orbiting camera · <b>H</b> hide interface · <b>P</b> save a screenshot</li></ul>'
    + '<h3>Follow · 第一视角</h3><p>Click a bird, fish, animal or train, or choose one using <b>跟随 · Follow</b>. Drag to look around. Press <b>Esc</b> or the exit button to return to the free camera.</p>'
    + '<h3>The world</h3><p>Everything is generated from your seed string: mountains, rivers, lakes, rice terraces, castle towns, bamboo groves, snow peaks, an endless steam railway and its stations. The world is infinite — walk, fly, or teleport anywhere.</p>'
    + '<h3>Atmosphere</h3><p>Five moods — morning mist, golden hour, blue hour, moonlit night and spring rain — change sky, light, fog, lanterns and weather together.</p>'
    + '<h3>Sound</h3><p>Ambient loops are synthesised locally and stay off until you press the sound button.</p>'
    + '<div class="btnRow"><button class="btnPri" id="menuClose">Back to the valley</button></div>');
  $('menuClose').onclick = closeMenu;
});
if ($('btnTele')) $('btnTele').addEventListener('click', () => {
  openMenu('<h2>Wander · 移動</h2>'
    + '<h3>Seed</h3><div id="seedBox"><input id="seedInput" value="' + SEED.replace(/"/g, '&quot;') + '" spellcheck="false" aria-label="World seed"><button class="btnSec" id="seedGo">Regenerate</button><button class="btnSec" id="seedRand">Random</button></div>'
    + '<p>Same seed, same world. Try <b>sakura</b>, <b>yuki</b>, <b>umi</b>, <b>kawa</b>…</p>'
    + '<h3>Teleport</h3><div id="teleList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr));gap:0.5rem">'
    + TELEPORTS.map((t, i) => '<button class="btnSec" data-tele="' + i + '" style="text-align:left;padding:0.6rem 0.8rem"><b>' + t.label + '</b><br><span style="font-size:0.8em;opacity:0.7">' + t.sub + '</span></button>').join('')
    + '</div><div class="btnRow"><button class="btnPri" id="menuClose">Close</button></div>');
  $('menuClose').onclick = closeMenu;
  $('seedGo').onclick = () => { const v = $('seedInput').value.trim() || 'sakura'; localStorage.setItem('sakura-world-seed', v); navigateWorld(THEME, v); };
  $('seedRand').onclick = () => { $('seedInput').value = Math.random().toString(36).slice(2, 8); };
  menuBox.querySelectorAll('[data-tele]').forEach((b) => b.addEventListener('click', () => { closeMenu(); teleport(TELEPORTS[+b.dataset.tele].key); }));
});
async function teleport(key) {
  stopFollow(false); stopTour();
  LOG.info('access', 'teleport-requested', { destination: key });
  toast('Searching…');
  await nextFrame();
  const f = GEN.findBiome(key, camera.position.x, camera.position.z, 12000);
  if (!f) { LOG.warn('business', 'teleport-destination-unavailable', { destination: key }); toast('Not found nearby — try another seed'); return; }
  let pos, tgt;
  if (f.rail) {
    const side = GEN.heightAt(f.x, f.z - 14) < GEN.heightAt(f.x, f.z + 14) ? -1 : 1;
    pos = [f.x + 30, f.h + 4.5, f.z + side * 16];
    tgt = [f.x - 120, f.h + 2, f.z];
  }
  else { const v = GEN.vantage(f, f.r > 15 ? 70 : 42, f.r > 15 ? 18 : 11); pos = v.pos; tgt = v.target; }
  cutFade(() => {
    camG.pos.set(...pos); camS.pos.set(...pos);
    const d = new THREE.Vector3(tgt[0] - pos[0], tgt[1] - pos[1], tgt[2] - pos[2]).normalize();
    camG.yaw = camS.yaw = Math.atan2(d.x, d.z);
    camG.pitch = camS.pitch = Math.asin(d.y);
    introT = 1;
  });
  LOG.info('business', 'teleport-arrived', { destination: key, x: f.x, z: f.z });
  toast('Arrived');
}
// --- ambient sound ---------------------------------------------------------
const audio = (() => {
  let ctx = null, master = null, g = {}, timer = null, on = false, mood = moodName;
  const LEVELS = {
    morning: { stream: 0.16, wind: 0.06, rain: 0, chime: 0.3, birds: 1, insects: 0.2 },
    golden: { stream: 0.14, wind: 0.05, rain: 0, chime: 0.5, birds: 0.6, insects: 0.6 },
    dusk: { stream: 0.15, wind: 0.05, rain: 0, chime: 1, birds: 0.15, insects: 1 },
    night: { stream: 0.1, wind: 0.07, rain: 0, chime: 0.4, birds: 0, insects: 1 },
    rain: { stream: 0.11, wind: 0.09, rain: 0.34, chime: 0.15, birds: 0, insects: 0 },
  };
  function noiseBuf(c) { const b = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.6 + last * 3.0; } return b; }
  function chain(src, nodes, gain) { let n = src; for (const x of nodes) { n.connect(x); n = x; } const gg = ctx.createGain(); gg.gain.value = gain; n.connect(gg); gg.connect(master); return gg; }
  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const buf = noiseBuf(ctx);
    const src = () => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 2); return s; };
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    g.stream = chain(src(), [bp, lp], 0);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13; const lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
    const wl = ctx.createBiquadFilter(); wl.type = 'lowpass'; wl.frequency.value = 340;
    g.wind = chain(src(), [wl], 0);
    const rh = ctx.createBiquadFilter(); rh.type = 'highpass'; rh.frequency.value = 1200;
    const rl = ctx.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 7500;
    g.rain = chain(src(), [rh, rl], 0);
  }
  function chime() {
    const t = ctx.currentTime, base = [1568, 2093, 2349, 2637][Math.floor(Math.random() * 4)];
    for (const [mul, a] of [[1, 0.05], [2.76, 0.018], [5.4, 0.008]]) {
      const o = ctx.createOscillator(), gg = ctx.createGain();
      o.frequency.value = base * mul; o.type = 'sine';
      gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(a, t + 0.005); gg.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
      o.connect(gg); gg.connect(master); o.start(t); o.stop(t + 3);
    }
  }
  function bird() {
    const t0 = ctx.currentTime, n = 2 + Math.floor(Math.random() * 3), f = 2600 + Math.random() * 1600;
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.14, o = ctx.createOscillator(), gg = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.45, t + 0.07);
      gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(0.025, t + 0.015); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      o.connect(gg); gg.connect(master); o.start(t); o.stop(t + 0.13);
    }
  }
  function insect() {
    const t = ctx.currentTime, o = ctx.createOscillator(), am = ctx.createOscillator(), ag = ctx.createGain(), gg = ctx.createGain();
    o.frequency.value = 4200 + Math.random() * 600; am.frequency.value = 38; ag.gain.value = 0.5;
    am.connect(ag); ag.connect(gg.gain);
    gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(0.006, t + 0.3); gg.gain.linearRampToValueAtTime(0, t + 1.6);
    o.connect(gg); gg.connect(master); o.start(t); am.start(t); o.stop(t + 1.7); am.stop(t + 1.7);
  }
  function schedule() {
    const L = LEVELS[mood] || LEVELS.dusk;
    if (Math.random() < 0.35 * L.chime) chime();
    if (Math.random() < 0.5 * L.birds) bird();
    if (Math.random() < 0.4 * L.insects) insect();
    timer = setTimeout(schedule, 1800 + Math.random() * 3200);
  }
  function levels(fade = 2) { if (!ctx) return; const L = LEVELS[mood] || LEVELS.dusk, t = ctx.currentTime; for (const k of ['stream', 'wind', 'rain']) g[k].gain.setTargetAtTime(L[k], t, fade / 3); }
  return {
    async toggle() {
      if (!on) { if (!ctx) build(); await ctx.resume(); on = true; levels(0.5); master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.6); schedule(); }
      else { on = false; clearTimeout(timer); master.gain.setTargetAtTime(0, ctx.currentTime, 0.3); setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 1500); }
      const b = $('btnSound');
      if (b) { b.setAttribute('aria-pressed', String(on)); const o1 = b.querySelector('.snd-on'), o2 = b.querySelector('.snd-off'); if (o1) o1.style.display = on ? '' : 'none'; if (o2) o2.style.display = on ? 'none' : ''; }
      return on;
    },
    setMood(m) { mood = m; levels(); },
  };
})();
if ($('btnTour')) $('btnTour').addEventListener('click', () => startTour());
if ($('btnShot')) $('btnShot').addEventListener('click', saveImage);
if ($('btnSound')) $('btnSound').addEventListener('click', async () => {
  try { const on = await audio.toggle(); toast(on ? 'Ambient sound on' : 'Sound off'); } catch (e) { LOG.warn('error', 'audio-unavailable', { message: String(e.message || e) }); toast('Audio not available'); }
});
document.querySelectorAll('#moods button').forEach((b) => b.addEventListener('click', () => setMood(b.dataset.mood)));
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
  const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
  lastNow = now;
  if (document.hidden) return;
  clockT += dt;
  TIME_U.value = clockT; SKY_U.uTime.value = clockT;
  updateMood(dt);
  updateTrain(dt, clockT);
  updateBirds(clockT);
  updateFauna(dt, clockT);
  updateCamera(dt);
  updateMist(dt, clockT);
  updateLanterns(dt, clockT);
  streamUpdate(camera.position);
  integrateSome(QUALITY === 'high' ? 4 : 6);
  updateShadow(dt);
  if (STREAM.visibleWater && (mirrorFrame = (mirrorFrame + 1) % (QUALITY === 'high' ? 1 : 2)) === 0) { WATER_U.uMirrorOn.value = 1; renderMirror(); }
  updateLamps(dt, ATM.lamps);
  updateSmoke(dt);
  updatePetals(dt, clockT);
  updateFlies(dt);
  updateWeather(dt);
  updateHUD(dt);
  renderFrame(dt);
  fpsN++; fpsT += dt; if (window.__frameHook) window.__frameHook();
  if (fpsT >= 0.5) { fpsShow = fpsN / fpsT; fpsN = 0; fpsT = 0; $('fpsVal').textContent = Math.round(fpsShow); }
  if (!autoChecked && clockT > 3) {
    if (fpsShow < 40 && prScale > 0.7) { prScale = Math.max(0.7, prScale - 0.15); applyQuality(QUALITY); }
    else if (fpsShow < 24 && QUALITY === 'high') { prScale = 1; applyQuality('lite'); toast('Switched to Lite rendering for smoother motion'); autoChecked = true; }
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
setProgress(0.2, 'Searching for a good vantage…');
await nextFrame();
const spawn = GEN.findSpawn();
mark('spawn');
setProgress(0.3, 'Generating the first chunks…');
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
setProgress(0.5, 'Weaving the light…');
await nextFrame();
applyQuality(QUALITY);
setMood(moodName, true);
refreshEnv();
updateShadow(0, true);
setProgress(0.7, 'Compiling shaders…');
await nextFrame();
try { await renderer.compileAsync(scene, camera); } catch (e) { LOG.warn('error', 'shader-precompile-failed', { message: String(e.message || e) }); }
mark('compiled');
renderFrame(0);
setProgress(1, 'Welcome to the valley');
booted = true;
$('hud').hidden = false;
window.__sv = {
  ready: true, GEN, camera, scene, renderer, teleport, setMood, applyQuality, startTour, stopTour, saveImage,
  ST, STREAM, key, keys, MOVE, FAUNA, FOLLOW, FX, TRAIN, MIST, LANTERNS, WATER_U, MIRROR, volPass, LOG, startFollow, stopFollow, openFollowMenu, nearbyUnits,
  goCam(x, y, z, tx, ty, tz) { snapTo([x, y, z], Math.atan2(tx - x, tz - z), Math.atan2(ty - y, Math.hypot(tx - x, tz - z)), 55); introT = 1; },
  get state() { return { seed: SEED, theme: THEME, mood: moodName, quality: QUALITY, biome: HUD.biome >= 0 ? GEN.BIOME_NAMES[HUD.biome][1] : '?' }; },
};
requestAnimationFrame((t) => { lastNow = t; loop(t); });
setTimeout(() => { $('loader').classList.add('done'); setTimeout(() => { const l = $('loader'); if (l) l.remove(); }, 1200); }, 250);
if (!interacted) setTimeout(() => toast('Drag to look around · Scroll or W A S D to explore'), 2500);
window.__tp = async (key) => { await teleport(key); await new Promise(r=>setTimeout(r,800)); return JSON.stringify({cam:[camera.position.x|0, camera.position.y|0, camera.position.z|0]}); };
