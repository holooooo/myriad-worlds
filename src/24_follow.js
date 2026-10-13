// First-person rides share one controller; movement remains owned by each unit.
const FOLLOW = { target: null, yaw: 0, pitch: 0, near: camera.near };
const UNIT_LABELS = { bird: '鸟 · Bird', sparrow: '麻雀 · Sparrow', hawk: '鹰 · Hawk', butterfly: '蝴蝶 · Butterfly', fox: '狐狸 · Fox', deer: '鹿 · Deer', fish: '鱼 · Fish', train: '火车 · Train', crane: '仙鹤 · Crane', buffalo: '水牛 · Buffalo' };
const UNIT_EYES = { bird: [0, 0.18, 0.78], sparrow: [0, 0.1, 0.24], hawk: [0, 0.1, 0.39], butterfly: [0, 0.05, 0.16], fox: [0, 0.63, 0.77], deer: [0, 1.58, 0.76], fish: [0, 0.07, 0.4], train: [-2.2, 3.15, 0], crane: [0, 0.55, 0.86], buffalo: [0, 1.46, 1.24] };
const followEye = new THREE.Vector3(), followForward = new THREE.Vector3(), selectPoint = new THREE.Vector3();
const unitRay = new THREE.Raycaster(), pointerNDC = new THREE.Vector2();
function nearbyUnits() {
  const units = FAUNA.filter(f => f.active && (f.g.visible || FOLLOW.target?.g === f.g)).map(f => ({ id: f.id, kind: f.kind, g: f.g, source: f }));
  FX.birds.forEach((g, i) => { if (g.visible || FOLLOW.target?.g === g) units.push({ id: 'bird-' + i, kind: 'bird', g }); });
  TRAIN.cars.forEach((c, i) => { if (c.g.visible || FOLLOW.target?.g === c.g) units.push({ id: 'train-' + i, kind: 'train', g: c.g, line: TRAIN.line, periodK: TRAIN.periodK }); });
  return units.filter(u => u.g.position.distanceTo(camera.position) < 1100).sort((a, b) => a.g.position.distanceToSquared(camera.position) - b.g.position.distanceToSquared(camera.position));
}
function startFollow(unit) {
  if (typeof unit === 'string') unit = nearbyUnits().find(u => u.id === unit);
  if (!unit || unit.source && !unit.source.active) return false;
  stopFollow(false); stopTour(); tour = false; introT = 1; keys.clear();
  FOLLOW.target = unit; FOLLOW.yaw = 0; FOLLOW.pitch = 0;
  camera.near = unit.kind === 'fish' ? 0.04 : 0.08; camera.updateProjectionMatrix();
  unit.g.visible = false;
  updateFollow(0);
  $('btnFollow').textContent = '退出跟随 · Exit'; $('btnFollow').setAttribute('aria-pressed', 'true');
  toast(UNIT_LABELS[unit.kind] + ' · 第一视角 · Drag to look · Esc to exit');
  LOG.info('business', 'unit-follow-started', { id: unit.id, kind: unit.kind });
  return true;
}
function stopFollow(showToast = true) {
  const unit = FOLLOW.target;
  if (!unit) return;
  FOLLOW.target = null;
  unit.g.visible = !unit.source || unit.source.active;
  camera.near = FOLLOW.near; camera.updateProjectionMatrix();
  camG.pos.copy(camS.pos); camG.yaw = camS.yaw; camG.pitch = camS.pitch;
  $('btnFollow').textContent = '跟随 · Follow'; $('btnFollow').setAttribute('aria-pressed', 'false');
  LOG.info('business', 'unit-follow-ended', { id: unit.id });
  if (showToast) toast('已退出跟随 · Free camera');
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
  followEye.set(...UNIT_EYES[unit.kind]).applyMatrix4(unit.g.matrixWorld);
  followForward.set(unit.kind === 'train' ? 1 : 0, 0, unit.kind === 'train' ? 0 : 1).transformDirection(unit.g.matrixWorld);
  const yaw = Math.atan2(followForward.x, followForward.z) + FOLLOW.yaw;
  // The eye is rigidly attached to the unit; only heading is eased for comfort.
  camS.pos.copy(followEye); camG.pos.copy(followEye);
  camS.yaw += wrapA(yaw - camS.yaw) * (dt ? 1 - Math.exp(-dt * 12) : 1);
  camS.pitch += (FOLLOW.pitch - camS.pitch) * (dt ? 1 - Math.exp(-dt * 12) : 1);
  camG.yaw = camS.yaw; camG.pitch = camS.pitch;
  unit.g.visible = false;
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
  const units = nearbyUnits();
  openMenu('<h2 id="menuTitle">移动单位 · Follow</h2><p>点击单位切换到它的第一视角。拖动环顾，按 Esc 或退出按钮返回。</p><div id="unitList"></div><div class="btnRow"><button class="btnPri" id="menuClose">Close</button></div>');
  const list = $('unitList');
  if (!units.length) list.textContent = '附近暂时没有移动单位，向树林、水边或铁路移动。';
  for (const unit of units) {
    const button = document.createElement('button'); button.className = 'btnSec'; button.style.cssText = 'display:block;width:100%;text-align:left;margin:.4rem 0';
    button.textContent = UNIT_LABELS[unit.kind] + ' · ' + Math.round(unit.g.position.distanceTo(camera.position)) + ' m';
    button.dataset.unit = unit.id;
    button.onclick = () => { closeMenu(); startFollow(unit); };
    list.appendChild(button);
  }
  $('menuClose').onclick = closeMenu;
}
$('btnFollow').addEventListener('click', openFollowMenu);
