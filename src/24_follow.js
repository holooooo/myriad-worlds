// First-person rides share one controller; movement remains owned by each unit.
const FOLLOW = { target: null, viewMode: 'first', sideSign: 1, yaw: 0, pitch: 0, near: camera.near };
const UNIT_EYES = { bird: [0, 0.18, 0.78], sparrow: [0, 0.1, 0.24], hawk: [0, 0.1, 0.39], butterfly: [0, 0.05, 0.16], fox: [0, 0.63, 0.77], deer: [0, 1.58, 0.76], fish: [0, 0.07, 0.4], train: [-2.2, 3.15, 0], crane: [0, 0.55, 0.86], buffalo: [0, 1.46, 1.24] };
const followEye = new THREE.Vector3(), followLook = new THREE.Vector3(), followForward = new THREE.Vector3(), selectPoint = new THREE.Vector3();
const unitRay = new THREE.Raycaster(), pointerNDC = new THREE.Vector2();
let followViewUI = null;
const unitLabel = unit => I18N.unitName(unit, GEN.theme);
function updateFollowButton() {
  $('btnFollow').textContent = I18N.t(FOLLOW.target ? 'action.follow.exit' : 'action.follow');
  $('btnFollow').setAttribute('aria-pressed', String(!!FOLLOW.target));
  updateFollowViewUI();
}
function initFollowViewUI() {
  if (followViewUI) return;
  const style = document.createElement('style');
  style.textContent = '#followViewControls{position:absolute;bottom:92px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;max-width:calc(100vw - 32px);padding:5px;background:var(--panel);border:1px solid var(--line);pointer-events:auto;white-space:nowrap}#followViewControls[hidden]{display:none}#followViewLabel{padding:0 5px;font-size:.65rem;color:var(--muted)}#followViewControls button{padding:8px 12px;font-size:.72rem;color:var(--muted)}#followViewControls button:hover{background:#eff0d412;color:var(--paper)}#followViewControls button[aria-pressed="true"]{background:#d5b77b20;color:var(--accent)}@media(max-width:900px){#followViewControls{bottom:136px}}@media(max-width:600px){#followViewControls{bottom:calc(124px + env(safe-area-inset-bottom))}}';
  document.head.appendChild(style);
  const root = document.createElement('div'), label = document.createElement('span');
  root.id = 'followViewControls'; root.hidden = true; root.setAttribute('role', 'group'); root.setAttribute('aria-labelledby', 'followViewLabel');
  label.id = 'followViewLabel'; root.appendChild(label);
  const buttons = ['first', 'side'].map(mode => {
    const button = document.createElement('button'); button.type = 'button'; button.id = mode === 'first' ? 'followViewFirst' : 'followViewSide'; button.dataset.followView = mode;
    button.onclick = () => setFollowViewMode(mode); root.appendChild(button); return button;
  });
  root.addEventListener('keydown', e => {
    if ([' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) e.stopPropagation();
    const index = buttons.indexOf(document.activeElement);
    if (index >= 0 && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); buttons[e.key === 'Home' ? 0 : e.key === 'End' ? 1 : (index + 1) % 2].focus();
    }
  });
  $('hud').appendChild(root); followViewUI = { root, label, buttons }; updateFollowViewUI();
}
function updateFollowViewUI() {
  if (!followViewUI) return;
  const show = FOLLOW.target?.kind === 'train';
  followViewUI.root.hidden = !show;
  followViewUI.label.textContent = I18N.t('follow.view.group');
  for (const button of followViewUI.buttons) {
    const key = 'follow.view.' + button.dataset.followView;
    button.textContent = I18N.t(key); button.setAttribute('title', I18N.t(key + '.title')); button.setAttribute('aria-label', I18N.t(key + '.title'));
    button.setAttribute('aria-pressed', String(FOLLOW.viewMode === button.dataset.followView));
  }
  if (!show && followViewUI.buttons.includes(document.activeElement)) $('btnFollow').focus();
}
function setFollowViewMode(mode) {
  if (FOLLOW.target?.kind !== 'train' || !['first', 'side'].includes(mode)) {
    LOG.warn('business', 'follow-view-rejected', { mode }); return false;
  }
  LOG.debug('access', 'follow-view-requested', { mode });
  if (FOLLOW.viewMode !== mode) {
    if (mode === 'side') {
      // Choose once on entry: continuously changing banks must not flip the view.
      FOLLOW.target.g.updateMatrixWorld(true);
      followEye.set(-TRAIN.len / 2, 11, 55).applyMatrix4(FOLLOW.target.g.matrixWorld);
      followLook.set(-TRAIN.len / 2, 11, -55).applyMatrix4(FOLLOW.target.g.matrixWorld);
      FOLLOW.sideSign = GEN.heightAt(followLook.x, followLook.z) < GEN.heightAt(followEye.x, followEye.z) ? -1 : 1;
    }
    FOLLOW.viewMode = mode; FOLLOW.yaw = 0; FOLLOW.pitch = 0;
    camera.near = mode === 'side' ? FOLLOW.near : 0.08; camera.updateProjectionMatrix();
    updateFollow(0); updateFollowViewUI();
    toastKey('toast.follow.trainView', () => ({ view: I18N.t('follow.view.' + mode) }));
    LOG.info('business', 'follow-view-changed', { mode, id: FOLLOW.target.id, sideSign: FOLLOW.sideSign });
  }
  return true;
}
function nearbyUnits() {
  const units = FAUNA.filter(f => f.active && (f.g.visible || FOLLOW.target?.g === f.g)).map(f => ({ id: f.id, kind: f.kind, g: f.g, source: f }));
  if (typeof SETTLEMENTS !== 'undefined') for (const u of SETTLEMENTS.units) if (u.active && (u.g.visible || FOLLOW.target?.g === u.g)) units.push({ id: u.id, kind: u.kind, g: u.g, obj: u.g, source: u, eye: u.eye, label: u.label });
  FX.birds.forEach((g, i) => { if (g.visible || FOLLOW.target?.g === g) units.push({ id: 'bird-' + i, kind: 'bird', g }); });
  TRAIN.cars.forEach((c, i) => { if (c.g.visible || FOLLOW.target?.g === c.g) units.push({ id: 'train-' + i, kind: 'train', g: c.g, line: TRAIN.line, periodK: TRAIN.periodK }); });
  return units.filter(u => u.g.position.distanceTo(camera.position) < 1100).sort((a, b) => a.g.position.distanceToSquared(camera.position) - b.g.position.distanceToSquared(camera.position));
}
function startFollow(unit) {
  if (typeof unit === 'string') unit = nearbyUnits().find(u => u.id === unit);
  if (!unit) return false;
  unit = { ...unit, g: unit.g || unit.obj, source: unit.source || (typeof unit.active === 'boolean' ? unit : null) };
  if (unit.kind === 'train') {
    // Every carriage belongs to the same convoy; boarding always starts at its driver.
    unit = { ...unit, id: 'train-0', g: TRAIN.cars[0]?.g, source: null, eye: UNIT_EYES.train, line: unit.line ?? TRAIN.line, periodK: unit.periodK ?? TRAIN.periodK };
  }
  const eye = unit.eye || UNIT_EYES[unit.kind];
  if (!unit.g || unit.source && !unit.source.active || !Array.isArray(eye) || eye.length !== 3 || !eye.every(Number.isFinite)) {
    LOG.warn('business', 'unit-follow-rejected', { id: unit.id, kind: unit.kind }); return false;
  }
  unit.eye = eye;
  LOG.debug('access', 'unit-follow-requested', { id: unit.id, kind: unit.kind });
  stopFollow(false); stopTour(); tour = false; introT = 1; keys.clear();
  FOLLOW.target = unit; FOLLOW.viewMode = 'first'; FOLLOW.sideSign = 1; FOLLOW.yaw = 0; FOLLOW.pitch = 0;
  camera.near = unit.kind === 'fish' ? 0.04 : 0.08; camera.updateProjectionMatrix();
  unit.g.visible = false;
  if (unit.kind === 'train') initFollowViewUI();
  updateFollow(0);
  updateFollowButton();
  toastKey('toast.follow.started', () => ({ unit: unitLabel(unit) }));
  LOG.info('business', 'unit-follow-started', { id: unit.id, kind: unit.kind });
  return true;
}
function stopFollow(showToast = true) {
  const unit = FOLLOW.target;
  if (!unit) return;
  FOLLOW.target = null;
  FOLLOW.viewMode = 'first';
  FOLLOW.sideSign = 1;
  unit.g.visible = !unit.source || unit.source.active;
  camera.near = FOLLOW.near; camera.updateProjectionMatrix();
  camG.pos.copy(camS.pos); camG.yaw = camS.yaw; camG.pitch = camS.pitch;
  updateFollowButton();
  LOG.info('business', 'unit-follow-ended', { id: unit.id });
  if (showToast) toastKey('toast.follow.ended');
}
function lookFollow(dx, dy, sensitivity) {
  FOLLOW.yaw -= dx * sensitivity;
  FOLLOW.pitch = clamp(FOLLOW.pitch - dy * sensitivity, -1.4, 1.2);
}
function updateFollow(dt) {
  const unit = FOLLOW.target;
  if (!unit) return false;
  if (unit.source && !unit.source.active) { stopFollow(); return false; }
  unit.g.updateMatrixWorld(true);
  const side = unit.kind === 'train' && FOLLOW.viewMode === 'side';
  let yaw, pitch;
  if (side) {
    followEye.set(-TRAIN.len / 2, 11, 55 * FOLLOW.sideSign).applyMatrix4(unit.g.matrixWorld);
    followEye.y = Math.max(followEye.y, GEN.heightAt(followEye.x, followEye.z) + 4);
    followLook.set(-TRAIN.len / 2, 2.5, 0).applyMatrix4(unit.g.matrixWorld);
    if (dt) camS.pos.lerp(followEye, 1 - Math.exp(-dt * 8)); else camS.pos.copy(followEye);
    // The eased path can cross a ridge even when its destination is clear.
    camS.pos.y = Math.max(camS.pos.y, GEN.heightAt(camS.pos.x, camS.pos.z) + 3);
    camG.pos.copy(camS.pos);
    followForward.copy(followLook).sub(camS.pos);
    yaw = Math.atan2(followForward.x, followForward.z) + FOLLOW.yaw;
    pitch = clamp(Math.atan2(followForward.y, Math.hypot(followForward.x, followForward.z)) + FOLLOW.pitch, -1.4, 1.2);
  } else {
    followEye.set(...unit.eye).applyMatrix4(unit.g.matrixWorld);
    followForward.set(unit.kind === 'train' ? 1 : 0, 0, unit.kind === 'train' ? 0 : 1).transformDirection(unit.g.matrixWorld);
    yaw = Math.atan2(followForward.x, followForward.z) + FOLLOW.yaw; pitch = FOLLOW.pitch;
    // The driver/animal eye stays rigidly attached; only heading is eased.
    camS.pos.copy(followEye); camG.pos.copy(followEye);
  }
  camS.yaw += wrapA(yaw - camS.yaw) * (dt ? 1 - Math.exp(-dt * 12) : 1);
  camS.pitch += (pitch - camS.pitch) * (dt ? 1 - Math.exp(-dt * 12) : 1);
  camG.yaw = camS.yaw; camG.pitch = camS.pitch;
  if (unit.kind === 'train') for (const car of TRAIN.cars) car.g.visible = side || car.g !== unit.g;
  else unit.g.visible = false;
  return true;
}
function selectUnit(x, y) {
  if (FOLLOW.target) return;
  const rect = canvas.getBoundingClientRect();
  pointerNDC.set((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2);
  unitRay.setFromCamera(pointerNDC, camera);
  const units = nearbyUnits();
  units.forEach(u => u.g.updateMatrixWorld(true));
  const hit = unitRay.intersectObjects(units.map(u => u.g), true)[0];
  let selected = hit && units.find(u => { for (let g = hit.object; g; g = g.parent) if (g === u.g) return true; return false; });
  // A modest screen-space tolerance makes small birds and fish selectable.
  if (!selected) {
    let best = 14;
    for (const unit of units) {
      selectPoint.copy(unit.g.position).project(camera);
      if (selectPoint.z < -1 || selectPoint.z > 1) continue;
      const distance = Math.hypot((selectPoint.x - pointerNDC.x) * rect.width / 2, (selectPoint.y - pointerNDC.y) * rect.height / 2);
      if (distance < best) { best = distance; selected = unit; }
    }
  }
  if (!selected) return;
  // Terrain still occludes click selection, including fish beneath banks.
  unitRay.set(camera.position, followForward.copy(selected.g.position).sub(camera.position).normalize());
  const ground = unitRay.intersectObjects([...ST.chunks.values()].filter(c => c.shown).map(c => c.terrain), false)[0];
  if (ground && ground.distance + 0.5 < selected.g.position.distanceTo(camera.position)) return;
  startFollow(selected);
}
function openFollowMenu() {
  if (FOLLOW.target) { stopFollow(); return; }
  renderFollowMenu();
}
// Reserve one row per kind before distributing the shared display budget.
// A busy street cannot push boats, trains or distant birds out of the menu.
function followMenuGroups(units, focusedId = null) {
  const byKind = new Map(), order = (a, b) => a.distance - b.distance || (String(a.unit.id) < String(b.unit.id) ? -1 : String(a.unit.id) > String(b.unit.id) ? 1 : 0);
  for (const unit of units) {
    const distance = unit.g.position.distanceTo(camera.position);
    if (!Number.isFinite(distance)) continue;
    if (!byKind.has(unit.kind)) byKind.set(unit.kind, { kind: unit.kind, entries: [], shown: 1 });
    byKind.get(unit.kind).entries.push({ unit, distance });
  }
  const groups = [...byKind.values()];
  for (const group of groups) {
    group.entries.sort(order);
    group.limit = Math.min(group.entries.length, ['bird', 'sparrow', 'hawk', 'crane'].includes(group.kind) ? 12 : 6);
  }
  groups.sort((a, b) => a.entries[0].distance - b.entries[0].distance || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0));
  let remaining = Math.max(48, groups.length) - groups.length;
  while (remaining > 0) {
    let allocated = false;
    for (const group of groups) if (group.shown < group.limit && remaining > 0) { group.shown++; remaining--; allocated = true; }
    if (!allocated) break;
  }
  for (const group of groups) {
    group.visible = group.entries.slice(0, group.shown);
    // Retain keyboard focus if movement changes which rows fit in this group.
    const focused = focusedId && group.entries.find(e => e.unit.id === focusedId);
    if (focused && !group.visible.includes(focused)) { group.visible[group.visible.length - 1] = focused; group.visible.sort(order); }
  }
  return groups;
}
function renderFollowMenu() {
  const focusedId = document.activeElement?.dataset?.unit, units = nearbyUnits(), groups = followMenuGroups(units, focusedId);
  openMenu('<h2 id="menuTitle">'+I18N.t('menu.follow.title')+'</h2><p>'+I18N.t('menu.follow.intro')+'</p><div id="unitList"></div><div class="btnRow"><button class="btnPri" id="menuClose">'+I18N.t('action.close')+'</button></div>', renderFollowMenu);
  const list = $('unitList'); list.style.display = 'block';
  if (!units.length) list.textContent = I18N.t('menu.follow.empty');
  for (const group of groups) {
    const section = document.createElement('section'), heading = document.createElement('h3'), grid = document.createElement('div');
    heading.id = 'follow-group-' + group.kind;
    heading.textContent = I18N.followGroupName(group.kind, GEN.theme) + ' · ' + I18N.t('menu.follow.count', { count: group.entries.length });
    section.setAttribute('role', 'group'); section.setAttribute('aria-labelledby', heading.id); section.dataset.kind = group.kind;
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px';
    section.appendChild(heading); section.appendChild(grid);
    for (const { unit, distance } of group.visible) {
      const button = document.createElement('button'); button.className = 'btnSec'; button.id = 'follow-unit-' + unit.id;
      button.style.cssText = 'display:block;width:100%;text-align:left';
      button.textContent = unitLabel(unit) + ' · ' + I18N.t('menu.follow.distance', { distance: Math.round(distance) });
      button.dataset.unit = unit.id;
      button.onclick = () => { closeMenu(); startFollow(unit); };
      grid.appendChild(button);
    }
    if (group.visible.length < group.entries.length) {
      const count = document.createElement('p'); count.textContent = I18N.t('menu.follow.shown', { shown: group.visible.length, total: group.entries.length });
      count.style.cssText = 'font-size:.7rem;margin:8px 0 0'; section.appendChild(count);
    }
    list.appendChild(section);
  }
  $('menuClose').onclick = closeMenu;
  if (focusedId) $('follow-unit-' + focusedId)?.focus();
  LOG.debug('access', 'follow-menu-opened', { kinds: groups.length, units: units.length, shown: groups.reduce((n, group) => n + group.visible.length, 0) });
}
$('btnFollow').addEventListener('click', openFollowMenu);
I18N.onChange(updateFollowButton);
