// Settlement life uses bounded clone pools and validated short routes.
// Roads, house pads, rail corridors and individual water bodies own navigation.
const SETTLEMENTS = (() => {
  const units = [], plan = [['farmer', 4, 2], ['merchant', 6, 3], ['official', 2, 1], ['carriage', 2, 1], ['sedan', 1, 1], ['fishingBoat', 4, 2], ['merchantBoat', 2, 1]];
  let initialized = false, profile = '', cursor = 0, spawnClock = 0, sequence = 0;
  const labels = {
    shanshui: { farmer: '农人 · Farmer', merchant: '行商 · Merchant', official: '官员 · Official', carriage: '马车 · Horse carriage', sedan: '轿子 · Sedan chair', fishingBoat: '渔舟 · Fishing boat', merchantBoat: '商船 · Trading vessel' },
    sakura: { farmer: '稻农 · Rice farmer', merchant: '町人 · Town merchant', official: '侍臣 · Retainer', carriage: '牛车 · Ox cart', sedan: '驾笼 · Kago', fishingBoat: '和船 · Fishing boat', merchantBoat: '廻船 · Coastal trader' },
  };
  const waterLabel = { river: '河', lake: '湖', ocean: '海' };
  const mod = (v, n) => ((v % n) + n) % n;
  const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  function random(u, salt) { return GEN.h2(u.index + sequence * 37, salt, GEN.seed + 1907); }
  function isBound(u) { return FOLLOW.target && FOLLOW.target.g === u.g; }
  function clearCorridor(x, z) {
    return (!GEN.railClearance || GEN.railClearance(x, z) >= 0) && (!GEN.structureAt || !GEN.structureAt(x, z, 0.3));
  }
  function waterAt(x, z) {
    if (!clearCorridor(x, z)) return null;
    if (GEN.waterAt) return GEN.waterAt(x, z);
    const s = GEN.sample(x, z, {});
    return s.h < 0 && !s.paddy ? { level: 0, depth: -s.h, bed: s.h, kind: s.biome === GEN.B.OCEAN ? 'ocean' : s.biome === GEN.B.LAKE ? 'lake' : 'river', id: 'sea-level' } : null;
  }
  function setModel(u, waterKind = 'river') {
    const key = profile + ':' + u.kind + ':' + waterKind;
    if (u.modelKey === key) return;
    if (u.g) scene.remove(u.g);
    u.g = u.obj = SETTLEMENT_ASSETS.get(u.kind, profile, waterKind).clone(); u.g.visible = false; scene.add(u.g);
    u.modelKey = key; u.eye = u.g.userData.eye; u.width = u.g.userData.width; u.length = u.g.userData.length; u.center = u.g.userData.center || 0;
    u.nodes = { legs: [], arms: [], wheels: [], oars: [], sails: [] };
    u.g.traverse(o => {
      if (o.name.startsWith(u.kind === 'carriage' ? 'animal-leg-' : 'person-leg-')) u.nodes.legs.push(o);
      if (o.name.startsWith('person-arm-')) u.nodes.arms.push(o);
      if (o.name.startsWith('wheel-')) u.nodes.wheels.push(o);
      if (o.name.startsWith('boat-oar-')) u.nodes.oars.push(o);
      if (o.name === 'sail-rig') u.nodes.sails.push(o);
    });
    u.label = labels[profile][u.kind] + (u.domain === 'water' ? ' · ' + waterLabel[waterKind] : '');
  }
  function landSample(u, x, z) {
    if (!clearCorridor(x, z)) return null;
    const s = GEN.sample(x, z, {});
    if ((s.waterLevel != null || s.waterLevel === undefined && s.h < 0) || s.paddy || s.pad > 0.14 || s.rail > 0.05 || s.tunnel || s.railCut > 0.5) return null;
    if (u.kind === 'farmer') {
      if (!(s.street && s.town > 0.55 || s.path > 0.16 && [GEN.B.SATO, GEN.B.PADDY, GEN.B.MEADOW].includes(s.biome))) return null;
    } else if (!s.street || s.town < 0.55) return null;
    return s;
  }
  function validPoint(u, x, z, yaw = u.yaw, reference = u.water) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), halfW = u.width * 0.5 + 0.07, halfL = u.length * 0.5 + 0.07;
    const center = u.domain === 'water' ? waterAt(x, z) : landSample(u, x, z);
    if (!center) return null;
    if (u.domain === 'water' && (center.kind === 'paddy' || center.depth < (u.kind === 'merchantBoat' ? 0.8 : 0.48))) return null;
    // Narrow pillar bases can sit between a vessel's corners and centre.
    // Probe its interior only for structures; terrain/depth reads stay bounded.
    if (u.domain === 'water' && GEN.structureAt) {
      const rows = Math.max(1, Math.ceil(halfL * 2 / 1.2));
      for (let row = 0; row <= rows; row++) for (const lx of [-halfW, 0, halfW]) {
        const dz = -halfL + halfL * 2 * row / rows + u.center;
        if (GEN.structureAt(x + cy * lx + sy * dz, z - sy * lx + cy * dz, 0.3)) return null;
      }
    }
    const expected = reference || center;
    for (const [lx, lz] of [[-halfW, -halfL], [halfW, -halfL], [-halfW, halfL], [halfW, halfL], [0, -halfL], [0, halfL]]) {
      const dz = lz + u.center, px = x + cy * lx + sy * dz, pz = z - sy * lx + cy * dz;
      const s = u.domain === 'water' ? waterAt(px, pz) : landSample(u, px, pz);
      if (!s) return null;
      if (u.domain === 'water') {
        if (s.kind !== expected.kind || s.id !== expected.id || Math.abs(s.level - expected.level) > 0.025 || s.depth < (u.kind === 'merchantBoat' ? 0.8 : 0.48)) return null;
      } else if (Math.abs(s.h - center.h) > (u.vehicle ? 0.36 : 0.45)) return null;
    }
    if (u.domain === 'water' && (center.kind !== expected.kind || center.id !== expected.id || Math.abs(center.level - expected.level) > 0.025)) return null;
    return center;
  }
  function canTravel(u, ax, az, bx, bz, yaw) {
    const dist = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(dist / 0.7));
    let previous = null;
    for (let i = 0; i <= n; i++) {
      const s = validPoint(u, ax + (bx - ax) * i / n, az + (bz - az) * i / n, yaw);
      if (!s || u.domain === 'land' && previous && Math.abs(s.h - previous.h) > 0.34) return false;
      previous = s;
    }
    return true;
  }
  function canTurn(u, yaw) {
    const delta = angleDiff(yaw, u.yaw), n = Math.max(1, Math.ceil(Math.abs(delta) / 0.24));
    for (let i = 1; i <= n; i++) if (!validPoint(u, u.x, u.z, u.yaw + delta * i / n)) return false;
    return true;
  }
  function overlaps(u, other, x, z, yaw = u.yaw) {
    const ux = x + Math.sin(yaw) * u.center, uz = z + Math.cos(yaw) * u.center;
    const ox = other.x + Math.sin(other.yaw) * other.center, oz = other.z + Math.cos(other.yaw) * other.center;
    const radius = (u.vehicle || u.domain === 'water' ? u.length * 0.42 : u.width * 0.5) + (other.vehicle || other.domain === 'water' ? other.length * 0.42 : other.width * 0.5) + 0.15;
    return Math.hypot(ux - ox, uz - oz) < radius;
  }
  function chooseRoute(u) {
    const s = u.domain === 'land' ? GEN.sample(u.x, u.z, {}) : null;
    for (let i = 0; i < 5; i++) {
      const r = random(u, i + 43), dist = u.vehicle ? 8 + r * 12 : u.domain === 'water' ? 4 + r * 10 : 4 + r * 9;
      let a = random(u, i + 77) * Math.PI * 2;
      if (s && s.street) {
        const alongZ = mod(u.x, 34) < 3.6, alongX = mod(u.z, 26) < 3.2;
        const axisZ = alongZ && (!alongX || r > 0.5);
        a = (axisZ ? 0 : Math.PI / 2) + (r < 0.5 ? Math.PI : 0);
      }
      const x = u.x + Math.sin(a) * dist, z = u.z + Math.cos(a) * dist;
      if ((u.vehicle || u.domain === 'water') && !canTurn(u, a)) continue;
      if (!canTravel(u, u.x, u.z, x, z, a)) continue;
      u.tx = x; u.tz = z; u.goalYaw = a; u.routeTimer = dist / u.speed + 2; u.routeMoving = true; return true;
    }
    u.tx = u.x; u.tz = u.z; u.routeMoving = false; u.routeTimer = 0.8 + random(u, 89) * 1.5; return false;
  }
  function spawn(u) {
    sequence++;
    for (let i = 0; i < 7; i++) {
      const a = random(u, i * 5 + 1) * Math.PI * 2, radius = 16 + random(u, i * 5 + 2) * (u.domain === 'water' ? 145 : 95);
      let x = camera.position.x + Math.cos(a) * radius, z = camera.position.z + Math.sin(a) * radius, yaw = random(u, i * 5 + 3) * Math.PI * 2;
      if (u.domain === 'water') {
        const w = waterAt(x, z); if (!w || w.kind === 'paddy') continue;
        setModel(u, w.kind); u.water = w;
      } else if (u.kind !== 'farmer' || random(u, i * 5 + 4) > 0.45) {
        if (random(u, i * 5 + 4) > 0.5) { x = Math.round(x / 34) * 34 + 1.8; yaw = 0; }
        else { z = Math.round(z / 26) * 26 + 1.6; yaw = Math.PI / 2; }
      }
      const s = validPoint(u, x, z, yaw, u.water);
      if (!s) continue;
      // Separate bodies while keeping traffic on its actual street/water route.
      if (units.some(other => other.active && other.domain === u.domain && overlaps(u, other, x, z, yaw))) continue;
      u.x = u.tx = x; u.z = u.tz = z; u.yaw = u.goalYaw = yaw; u.y = u.domain === 'water' ? s.level : s.h;
      u.active = true; u.routeTimer = 0; u.routeMoving = false; u.checkTimer = 0.4; u.g.position.set(x, u.y, z); u.g.rotation.set(0, yaw, 0); u.g.visible = true;
      LOG.debug('business', 'settlement-unit-spawned', { id: u.id, kind: u.kind, water: u.water && u.water.kind, x, z });
      return true;
    }
    u.water = null; return false;
  }
  function reset() {
    if (typeof FOLLOW !== 'undefined' && FOLLOW.target && units.some(u => u.g === FOLLOW.target.g)) stopFollow(false);
    for (const u of units) { u.active = false; u.g.visible = false; u.water = null; u.spawnTimer = u.index * 0.025; u.routeTimer = 0; u.routeMoving = false; }
    cursor = 0; sequence = 0; spawnClock = 0;
    LOG.debug('business', 'settlement-life-reset', { units: units.length });
  }
  function init() {
    if (initialized && profile === GEN.theme) { reset(); return; }
    try {
      if (initialized) { reset(); for (const u of units) scene.remove(u.g); units.length = 0; }
      profile = GEN.theme === 'shanshui' ? 'shanshui' : 'sakura';
      let index = 0;
      for (const [kind, count, lite] of plan) for (let i = 0; i < count; i++) {
        const domain = kind.endsWith('Boat') ? 'water' : 'land', vehicle = kind === 'carriage' || kind === 'sedan';
        const u = { id: 'settlement-' + kind + '-' + i, index: index++, kind, slot: i, lite, domain, vehicle, active: false, g: null, x: 0, z: 0, y: 0, yaw: 0, tx: 0, tz: 0, water: null, distance: 0, spawnTimer: 0, routeTimer: 0, checkTimer: 0 };
        u.speed = vehicle ? kind === 'carriage' ? 1.8 : 1.05 : domain === 'water' ? kind === 'merchantBoat' ? 1.2 : 0.75 : kind === 'official' ? 0.95 : 1.1;
        setModel(u); units.push(u);
      }
      initialized = true; reset();
      LOG.info('business', 'settlement-pools-ready', { theme: profile, maximum: units.length, residents: 12, traffic: 3, vessels: 6 });
    } catch (e) { LOG.error('error', 'settlement-initialization-failed', { message: String(e && e.stack || e) }); throw e; }
  }
  function animate(u, dt, t, moved) {
    const amplitude = REDUCED ? 0.5 : 1, walking = moved > 0.0001;
    for (const [i, leg] of u.nodes.legs.entries()) {
      if (u.domain === 'water') continue;
      leg.rotation.x = walking ? Math.sin(u.distance * 6 + (i % 2) * Math.PI) * 0.42 * amplitude : 0;
    }
    if (!u.vehicle) for (const [i, arm] of u.nodes.arms.entries()) arm.rotation.x = u.domain === 'water' ? Math.sin(t * 1.8) * 0.17 * amplitude : walking ? -Math.sin(u.distance * 6 + (i % 2) * Math.PI) * 0.28 * amplitude : 0;
    for (const wheel of u.nodes.wheels) wheel.rotation.x += moved / 0.42;
    for (const [i, oar] of u.nodes.oars.entries()) oar.rotation.y = Math.sin(t * 1.8 + i * Math.PI) * 0.18 * amplitude;
    for (const sail of u.nodes.sails) sail.rotation.y = 0.22 + Math.sin(t * 0.5 + u.index) * 0.055 * amplitude;
    u.g.position.set(u.x, u.y + (u.domain === 'water' ? Math.sin(t * 1.1 + u.index) * 0.025 * amplitude : 0), u.z);
    u.g.rotation.set(u.domain === 'water' ? Math.sin(t * 0.8 + u.index) * 0.012 * amplitude : 0, u.yaw, u.domain === 'water' ? Math.sin(t + u.index) * 0.009 * amplitude : 0);
  }
  function update(dt, t) {
    if (!initialized) return;
    if (profile !== GEN.theme) { init(); }
    spawnClock -= dt;
    if (spawnClock <= 0) {
      spawnClock = 0.22;
      let attempts = 0;
      for (let n = 0; n < units.length && attempts < 2; n++) {
        const u = units[cursor++ % units.length];
        if (u.active || QUALITY !== 'high' && u.slot >= u.lite) continue;
        if (u.spawnTimer > 0) continue;
        u.spawnTimer = 1.4; spawn(u); attempts++;
      }
    }
    for (const u of units) {
      u.spawnTimer -= dt;
      if (!u.active) continue;
      const bound = isBound(u);
      if (!bound && (QUALITY !== 'high' && u.slot >= u.lite || Math.hypot(u.x - camera.position.x, u.z - camera.position.z) > (u.domain === 'water' ? 290 : 190))) { u.active = false; u.g.visible = false; continue; }
      u.routeTimer -= dt; u.checkTimer -= dt;
      const distance = Math.hypot(u.tx - u.x, u.tz - u.z);
      if (u.routeMoving && distance < 0.12) { u.routeMoving = false; u.routeTimer = 0.65 + random(u, 91) * 1.2; }
      if (u.routeTimer <= 0) { sequence++; chooseRoute(u); }
      // Long bodies turn inside the already checked footprint before advancing.
      // Moving through a corner while still sideways would cut across houses.
      if ((u.vehicle || u.domain === 'water') && Math.abs(angleDiff(u.goalYaw, u.yaw)) > 0.001) {
        const delta = angleDiff(u.goalYaw, u.yaw);
        u.yaw = Math.abs(delta) < 0.06 ? u.goalYaw : u.yaw + delta * Math.min(1, dt * 4);
        animate(u, dt, t, 0); u.g.visible = !bound; continue;
      }
      const dx = u.tx - u.x, dz = u.tz - u.z, remaining = Math.hypot(dx, dz), moved = Math.min(u.speed * dt, remaining);
      if (moved > 0.001) {
        const yaw = u.yaw + angleDiff(u.goalYaw, u.yaw) * Math.min(1, dt * 4);
        const x = u.x + dx / remaining * moved, z = u.z + dz / remaining * moved;
        if (u.checkTimer <= 0) {
          u.checkTimer = 0.32;
          const point = validPoint(u, x, z, yaw);
          if (!point) { u.tx = u.x; u.tz = u.z; u.routeMoving = false; u.routeTimer = 0.8; animate(u, dt, t, 0); u.g.visible = !bound; continue; }
          u.y = u.domain === 'water' ? point.level : point.h;
        }
        const blocked = units.some(other => other !== u && other.active && other.domain === u.domain && overlaps(u, other, x, z, yaw));
        if (!blocked) { u.x = x; u.z = z; u.yaw = yaw; u.distance += moved; animate(u, dt, t, moved); }
        else animate(u, dt, t, 0);
      } else animate(u, dt, t, 0);
      u.g.visible = !bound;
    }
  }
  return { init, update, reset, units, validPoint, canTravel };
})();
