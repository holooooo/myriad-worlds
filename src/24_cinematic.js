// Camera planning uses the same terrain and instance transforms as the world.
// It has no renderer dependency: preview generation/scoring runs in a temporary
// worker, and loaded near meshes can refine that preview before a shot begins.
function createCinematicPlanner({ gen, loaded = () => [], preview = null, logger = null, aspect = () => 16 / 9, bounds = {} }) {
  const limit = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => { t = limit(t, 0, 1); return t * t * (3 - 2 * t); };
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const GRID = 16, CAMERA_MARGIN = 1.6;
  let current = null, sceneCache = null, phase = 'idle', progress = 0;
  function lensFov(base = 55, screenAspect = aspect()) {
    return screenAspect < 1.4 ? Math.min(2 * Math.atan(Math.tan(base * Math.PI / 360) * 1.35) * 180 / Math.PI, 74) : base;
  }
  function lensTan() { return Math.tan(lensFov() * Math.PI / 360); }
  function dimensions(f, options = {}) {
    let radius = Math.max(options.dist || (f.lakeGroup ? 210 : 44), (f.r || 0) * 1.85 + 16);
    const span = f.lakeGroup ? f.r * 0.58 : f.type ? Math.max(5, (f.r || 7) * 0.8) : Math.max(18, radius * 0.38);
    radius = Math.max(radius, span / (lensTan() * Math.max(0.3, aspect())) * 1.2);
    return { radius, span, height: options.height || (f.lakeGroup ? 43 : f.r > 15 ? 18 : 12), extent: radius * 1.45 + span + 24 };
  }
  function surface(x, z) {
    if (gen.sample) { const s = gen.sample(x, z, {}); return Math.max(s.h, s.waterLevel == null ? -Infinity : s.waterLevel); }
    const water = gen.waterAt?.(x, z);
    return Math.max(gen.heightAt(x, z), water ? water.level : -Infinity);
  }
  function floorAt(p) {
    let h = surface(p[0], p[2]);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) h = Math.max(h, surface(p[0] + x, p[2] + z));
    return h + 3.5;
  }
  function assetIndex(chunks, f, extent) {
    const cells = new Map(), boxes = [];
    for (const chunk of chunks) for (const [kind, bucket] of Object.entries(chunk.inst || {})) {
      if (kind === 'tuft') continue;
      const local = bounds[kind] || { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] };
      const localCenter = local.min.map((v, a) => (v + local.max[a]) * 0.5), localHalf = local.min.map((v, a) => (local.max[a] - v) * 0.5);
      const matrices = bucket.m;
      for (let i = 0; i < matrices.length; i += 16) {
        const m = matrices.subarray ? matrices.subarray(i, i + 16) : matrices.slice(i, i + 16);
        const half = [0, 1, 2].map(a => Math.abs(m[a]) * localHalf[0] + Math.abs(m[a + 4]) * localHalf[1] + Math.abs(m[a + 8]) * localHalf[2]);
        const center = [0, 1, 2].map(a => m[12 + a] + m[a] * localCenter[0] + m[a + 4] * localCenter[1] + m[a + 8] * localCenter[2]);
        if (Math.abs(center[0] - f.x) > extent + half[0] || Math.abs(center[2] - f.z) > extent + half[2]) continue;
        const scale = [0, 4, 8].map(a => Math.hypot(m[a], m[a + 1], m[a + 2]));
        if (Math.max(...scale) < 0.6 || scale.some(s => s < 1e-5)) continue;
        const inverse = [0, 4, 8].flatMap((a, j) => [m[a] / scale[j] ** 2, m[a + 1] / scale[j] ** 2, m[a + 2] / scale[j] ** 2]);
        const sway = ['willow', 'reed', 'straw', 'rice', 'cattail'].includes(kind) ? scale[1] * 0.22 : ['leaf', 'blossom', 'foliage', 'needle'].includes(kind) ? Math.max(scale[0], scale[2]) * 0.08 : 0;
        const box = { m, inverse, scale, half, center, localHalf, sway };
        boxes.push(box);
        const margin = CAMERA_MARGIN + box.sway;
        for (let z = Math.floor((center[2] - half[2] - margin) / GRID); z <= Math.floor((center[2] + half[2] + margin) / GRID); z++)
          for (let x = Math.floor((center[0] - half[0] - margin) / GRID); x <= Math.floor((center[0] + half[0] + margin) / GRID); x++) {
            const key = x + ':' + z; if (!cells.has(key)) cells.set(key, []); cells.get(key).push(box);
          }
      }
    }
    function hit(box, from, to, margin) {
      let enter = 0, exit = 1;
      for (let axis = 0; axis < 3; axis++) {
        const a = axis * 3, inv = box.inverse;
        const o = (from[0] - box.center[0]) * inv[a] + (from[1] - box.center[1]) * inv[a + 1] + (from[2] - box.center[2]) * inv[a + 2];
        const d = (to[0] - from[0]) * inv[a] + (to[1] - from[1]) * inv[a + 1] + (to[2] - from[2]) * inv[a + 2];
        const h = box.localHalf[axis] + (margin + box.sway) / box.scale[axis];
        if (Math.abs(d) < 1e-9) { if (Math.abs(o) > h) return null; continue; }
        const t1 = (-h - o) / d, t2 = (h - o) / d;
        enter = Math.max(enter, Math.min(t1, t2)); exit = Math.min(exit, Math.max(t1, t2));
        if (enter > exit) return null;
      }
      return enter;
    }
    function ray(from, to, margin = 0) {
      const visited = new Set(), steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[2] - from[2]) / (GRID * 0.4)));
      let nearest = null;
      // Adjacent grid cells cover a ray which crosses a cell corner between steps.
      for (let i = 0; i <= steps; i++) {
        const x = Math.floor(mix(from[0], to[0], i / steps) / GRID), z = Math.floor(mix(from[2], to[2], i / steps) / GRID);
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) for (const box of cells.get((x + dx) + ':' + (z + dz)) || []) {
          if (visited.has(box)) continue; visited.add(box);
          const t = hit(box, from, to, margin);
          if (t !== null && (nearest === null || t < nearest)) nearest = t;
        }
      }
      return nearest;
    }
    return { boxes, ray, occupied: p => ray(p, p, CAMERA_MARGIN) !== null };
  }
  function targetOf(f, index, span) {
    let top = (f.h || 0) + 6;
    if (f.type) for (const box of index.boxes) {
      if (Math.hypot(box.center[0] - f.x, box.center[2] - f.z) < span && box.center[1] - box.half[1] < (f.h || 0) + 18)
        top = Math.max(top, box.center[1] + box.half[1]);
    }
    return [f.x, (f.h || 0) + (f.type ? limit((top - (f.h || 0)) * 0.46, 3, 16) : 3), f.z];
  }
  function pose(shot, t) {
    const k = ease(t), a = shot.angle + (shot.mode === 'orbit' ? (k - 0.5) * shot.sweep : 0);
    const slide = shot.mode === 'pan' ? (k - 0.5) * shot.slide : 0;
    return { pos: [shot.look[0] + Math.sin(a) * shot.radius + Math.cos(a) * slide, shot.y,
      shot.look[2] + Math.cos(a) * shot.radius - Math.sin(a) * slide], look: shot.look, fov: 55, renderFov: lensFov() };
  }
  function terrainClear(from, to, stop = 1) {
    const horizontal = Math.hypot(from[0] - to[0], from[2] - to[2]);
    const n = Math.max(2, Math.ceil(horizontal * stop / 1.8));
    for (let i = 1; i < n; i++) {
      const t = i / n * stop;
      if (surface(mix(from[0], to[0], t), mix(from[2], to[2], t)) + 0.7 > mix(from[1], to[1], t)) return false;
    }
    return true;
  }
  function view(shot, p, index, detailed = true) {
    if (p[1] < floorAt(p) || p[1] > 255 || index.occupied(p)) return { safe: false, reason: 'camera-clearance' };
    const d = distance(p, shot.look), stop = limit(1 - shot.span / d, 0.35, 0.98);
    const end = p.map((v, a) => mix(v, shot.look[a], stop));
    if (!terrainClear(p, shot.look, stop)) return { safe: false, reason: 'terrain-occlusion' };
    if (index.ray(p, end) !== null) return { safe: false, reason: 'asset-occlusion' };
    if (!detailed) return { safe: true, foreground: 0 };
    const dx = (shot.look[0] - p[0]) / d, dy = (shot.look[1] - p[1]) / d, dz = (shot.look[2] - p[2]) / d;
    const horizontal = Math.hypot(dx, dz), rx = dz / horizontal, rz = -dx / horizontal;
    const up = [-dy * dx / horizontal, horizontal, -dy * dz / horizontal];
    const tan = lensTan(), near = Math.min(32, d * 0.45);
    let foreground = 0;
    for (const sy of [-0.55, 0, 0.55]) for (const sx of [-0.7, 0, 0.7]) {
      const rayEnd = [p[0] + dx * near + rx * sx * near * tan * aspect() + up[0] * sy * near * tan,
        p[1] + dy * near + up[1] * sy * near * tan,
        p[2] + dz * near + rz * sx * near * tan * aspect() + up[2] * sy * near * tan];
      if (index.ray(p, rayEnd) !== null || !terrainClear(p, rayEnd)) foreground++;
    }
    return { safe: foreground <= 3, foreground: foreground / 9, reason: foreground > 3 ? 'near-foreground' : null };
  }
  function assess(shot, index) {
    const travel = shot.mode === 'orbit' ? shot.radius * shot.sweep : shot.mode === 'pan' ? shot.slide : 0;
    const n = Math.max(1, Math.ceil(travel / 1.5));
    let foreground = 0, previous = null;
    for (let i = 0; i <= n; i++) {
      const p = pose(shot, i / n).pos;
      if (previous && index.ray(previous, p, CAMERA_MARGIN) !== null) return { safe: false, reason: 'path-collision' };
      const result = view(shot, p, index, i % 3 === 0 || i === n);
      if (!result.safe) return result;
      foreground = Math.max(foreground, result.foreground); previous = p;
    }
    return { safe: true, foreground, samples: n + 1 };
  }
  function choose(f, options = {}, chunks = []) {
    const dim = dimensions(f, options), index = assetIndex(chunks, f, dim.extent), look = targetOf(f, index, dim.span);
    const requested = ['static', 'orbit', 'pan'].includes(options.mode) ? options.mode : ['static', 'orbit', 'pan'][(options.index || 0) % 3];
    const candidates = [];
    for (const radiusK of [1, 1.22, 1.45]) for (const lift of [0, 14, 32]) for (let k = 0; k < 16; k++) {
      const angle = k / 16 * Math.PI * 2 + (f.yaw || 0), radius = dim.radius * radiusK;
      const shot = { mode: requested, look, span: dim.span, radius, angle, y: (f.h || 0) + dim.height + lift,
        sweep: 0.32, slide: Math.min(24, radius * 0.3), feature: { ...f } };
      for (let j = 0; j <= 8; j++) shot.y = Math.max(shot.y, floorAt(pose(shot, j / 8).pos) + 1.5);
      const p = pose(shot, 0.5).pos;
      if (!view(shot, p, index, false).safe) continue;
      const pitch = Math.atan2(look[1] - p[1], radius), coverage = dim.span / (radius * lensTan() * aspect());
      shot.score = (f.yaw === undefined ? 0 : Math.cos(angle - f.yaw) * 3) - Math.abs(pitch + 0.24) * 8
        - Math.abs(coverage - 0.48) * 9 - lift * 0.045 - (radiusK - 1) * 2;
      candidates.push(shot);
    }
    candidates.sort((a, b) => b.score - a.score);
    let best = null;
    for (const shot of candidates) {
      if (best && shot.score < best.score - 3.5) break;
      const result = assess(shot, index);
      if (!result.safe) continue;
      shot.score -= result.foreground * 12;
      if (!best || shot.score > best.score) best = shot;
    }
    // A still view is preferable when no entire moving path stays clear.
    if (!best && requested !== 'static') return choose(f, { ...options, mode: 'static' }, chunks);
    if (!best) for (const lift of [65, 100, 150]) {
      const shot = { mode: 'static', look, span: dim.span, radius: dim.radius * 1.45, angle: f.yaw || 0,
        y: (f.h || 0) + lift, sweep: 0, slide: 0, score: -100, feature: { ...f } };
      shot.y = Math.max(shot.y, floorAt(pose(shot, 0).pos) + 6);
      if (assess(shot, index).safe) { best = shot; break; }
    }
    return best;
  }
  function loadedChunks(f, extent) {
    // Retain the selected quadtree layer. View-culling is intentionally ignored:
    // assets outside today's frustum will appear as the planned camera turns.
    return [...loaded()].filter(ch => !ch.data || ch.shown).map(ch => ch.data || ch).filter(ch => ch.inst &&
      Math.hypot(Math.max(Math.abs(ch.x0 + ch.size / 2 - f.x) - ch.size / 2, 0),
        Math.max(Math.abs(ch.z0 + ch.size / 2 - f.z) - ch.size / 2, 0)) < extent + 72)
      .map(ch => ({ x0: ch.x0, z0: ch.z0, size: ch.size, lod: ch.lod,
        inst: Object.fromEntries(Object.entries(ch.inst).map(([kind, b]) => [kind, { m: b.m }])) }));
  }
  function mergeChunks(previews, actual) {
    const coverage = new Set();
    for (const ch of actual) for (let z = ch.z0 / 32; z < (ch.z0 + ch.size) / 32; z++)
      for (let x = ch.x0 / 32; x < (ch.x0 + ch.size) / 32; x++) coverage.add(x + ':' + z);
    const remaining = previews.map(ch => {
      const inst = {};
      for (const [kind, b] of Object.entries(ch.inst)) {
        const kept = [];
        for (let i = 0; i < b.m.length; i += 16) {
          if (!coverage.has(Math.floor(b.m[i + 12] / 32) + ':' + Math.floor(b.m[i + 14] / 32)))
            for (let j = 0; j < 16; j++) kept.push(b.m[i + j]);
        }
        if (kept.length) inst[kind] = { m: new Float32Array(kept) };
      }
      return { ...ch, inst };
    });
    return [...remaining, ...actual];
  }
  function refreshScene() {
    if (!current) return null;
    const dim = dimensions(current.feature, current.options), chunks = loadedChunks(current.feature, dim.extent);
    const signature = chunks.map(ch => [ch.x0, ch.z0, ch.lod].join(':')).sort().join('|');
    if (!sceneCache || sceneCache.signature !== signature) sceneCache = {
      signature, chunks, changed: true,
    };
    return sceneCache;
  }
  async function plan(f, options = {}) {
    const result = preview ? await preview(f, options, dimensions(f, options).extent) : null;
    if (preview && !result) return null;
    const chunks = result?.chunks || loadedChunks(f, dimensions(f, options).extent);
    const shot = preview ? result.shot : choose(f, options, chunks);
    if (!shot) { logger?.warn('business', 'tour-view-unavailable', { type: f.type || 'landscape', x: f.x, z: f.z }); return null; }
    current = { feature: f, options, chunks, shot }; sceneCache = null; phase = 'planned'; progress = 0;
    logger?.info('business', 'tour-shot-planned', { mode: shot.mode, x: f.x, z: f.z, radius: Math.round(shot.radius), height: Math.round(shot.y), previewChunks: chunks.length });
    return shot;
  }
  async function refine(shot, t = 0, entirePath = false) {
    const cached = refreshScene(); if (!cached) return shot;
    if (!cached.changed && !entirePath) return shot;
    const request = current;
    let next, reason;
    if (preview?.refine) {
      phase = 'replanning';
      const result = await preview.refine(request.feature, request.options, request.chunks, cached.chunks, shot);
      if (current !== request) return null;
      next = result?.shot || null; reason = result?.reason || 'preview-unavailable';
    } else {
      const chunks = mergeChunks(request.chunks, cached.chunks), index = assetIndex(chunks, request.feature, dimensions(request.feature, request.options).extent);
      const result = assess(shot, index); reason = result.reason;
      next = result.safe ? shot : choose(request.feature, { ...request.options, mode: 'static' }, chunks);
    }
    cached.changed = false;
    if (next && JSON.stringify(next) === JSON.stringify(shot)) return shot;
    logger?.warn('business', 'tour-shot-reframed', { reason, replacement: !!next });
    if (next) request.shot = next;
    return next;
  }

  // --- Smooth cinematic travel between shots ---
  // Instead of teleporting between compositions, the tour eases the camera
  // across: position follows a gently arced path, yaw takes the shortest
  // angular route, pitch and fov blend linearly. The outgoing and incoming
  // poses are the shots' own start poses, so the arc lands exactly on the
  // incoming shot with no visible discontinuity at either end.

  const TRAVEL_MIN_DURATION = 3.5, TRAVEL_MAX_DURATION = 5.5;
  const TRAVEL_ARC_BASE = 16, TRAVEL_ARC_STEP = 30, TRAVEL_ARC_LIMIT = 190;
  const TRAVEL_CLEARANCE = 5, TRAVEL_PROBES = 24;

  // Shortest angular distance between two headings.
  const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
  // Position accessor: accepts [x, y, z] or { x, y, z } (THREE.Vector3).
  const axis = (p, i) => p[i] !== undefined ? p[i] : [p.x, p.y, p.z][i];

  // Reused result of updateTravel: the hot path must not allocate.
  const travelOut = { pos: [0, 0, 0], yaw: 0, pitch: 0, fov: 55, renderFov: 55, done: false };
  let travel = null;

  // Begin an eased fly/dolly from `fromPose` ({ pos, yaw, pitch, fov }) to the
  // start pose of `toShot`. Returns the travel duration in seconds.
  // The arc is solved here, once: if the eased path would clip a ridge the
  // mid-point is raised in steps until the whole path clears the terrain.
  function beginTravel(fromPose, toShot) {
    const to = pose(toShot, 0), from = fromPose.pos, toPos = to.pos;
    const fx = axis(from, 0), fy = axis(from, 1), fz = axis(from, 2);
    const tx = toPos[0], ty = toPos[1], tz = toPos[2];
    const dx = to.look[0] - tx, dy = to.look[1] - ty, dz = to.look[2] - tz;
    const dist = Math.hypot(tx - fx, ty - fy, tz - fz);
    const duration = limit(TRAVEL_MIN_DURATION + dist / 160, TRAVEL_MIN_DURATION, TRAVEL_MAX_DURATION);
    // Arc control point: the straight midpoint raised so the path bows upward.
    const midY = (fy + ty) * 0.5 + TRAVEL_ARC_BASE;
    // Raise the arc until every probe clears the ground beneath it.
    let lift = 0;
    while (lift < TRAVEL_ARC_LIMIT) {
      let clear = true;
      for (let i = 1; i < TRAVEL_PROBES; i++) {
        const k = ease(i / TRAVEL_PROBES), inv = 1 - k;
        const y = inv * inv * fy + 2 * inv * k * (midY + lift) + k * k * ty;
        if (surface(mix(fx, tx, k), mix(fz, tz, k)) + 3.5 + TRAVEL_CLEARANCE > y) { clear = false; break; }
      }
      if (clear) break;
      lift += TRAVEL_ARC_STEP;
    }
    travel = {
      fx, fy, fz, tx, ty, tz, midY: midY + lift,
      fYaw: fromPose.yaw, tYaw: Math.atan2(dx, dz), yawDelta: wrapAngle(Math.atan2(dx, dz) - fromPose.yaw),
      fPitch: fromPose.pitch, tPitch: Math.atan2(dy, Math.hypot(dx, dz)),
      fFov: fromPose.fov || 55, tFov: to.fov, duration, elapsed: 0,
    };
    return duration;
  }

  // Advance the travel by `dt` seconds and return the interpolated camera
  // state ({ pos, yaw, pitch, fov, renderFov, done }), or null when idle.
  // The eased y is clamped to the terrain so the camera can never sink below
  // ground; `done` marks the frame the incoming pose has been reached.
  function updateTravel(dt) {
    if (!travel) return null;
    const s = travel;
    s.elapsed = Math.min(s.elapsed + dt, s.duration);
    const raw = s.elapsed / s.duration, k = ease(raw), inv = 1 - k;
    const x = mix(s.fx, s.tx, k), z = mix(s.fz, s.tz, k);
    travelOut.pos[0] = x;
    travelOut.pos[1] = Math.max(inv * inv * s.fy + 2 * inv * k * s.midY + k * k * s.ty, surface(x, z) + 3.5);
    travelOut.pos[2] = z;
    travelOut.yaw = s.fYaw + s.yawDelta * k;
    travelOut.pitch = mix(s.fPitch, s.tPitch, k);
    travelOut.fov = mix(s.fFov, s.tFov, k);
    travelOut.renderFov = lensFov(travelOut.fov);
    travelOut.done = raw >= 1;
    return travelOut;
  }

  // Abandon an in-flight travel (tour stopped, destination replaced).
  function cancelTravel() { travel = null; }
  function isTravelling() { return travel !== null && travel.elapsed < travel.duration; }

  return { lensFov, dimensions, assetIndex, mergeChunks, choose, pose, assess, view, floorAt, plan, refine,
    // Smooth travel between shots (eased fly/dolly)
    beginTravel, updateTravel, cancelTravel, isTravelling,
    cancel() { preview?.cancel?.(); current = null; sceneCache = null; phase = 'idle'; progress = 0; cancelTravel(); },
    progress(leg, value) { phase = leg; progress = limit(value, 0, 1); },
    get state() { return { phase, progress, mode: current?.shot.mode || null, target: current ? { ...current.feature } : null }; },
  };
}

// Preview workers never create WebGL resources. Each job is terminated on
// completion, cancellation, error or timeout; stale jobs cannot revive a tour.
function createCinematicPreview() {
  let active = null;
  const run = payload => new Promise(resolve => {
    load.cancel();
    let worker, url, timeout;
    const finish = result => {
      if (active?.finish !== finish) return;
      clearTimeout(timeout); worker?.terminate(); if (url) URL.revokeObjectURL(url); active = null; resolve(result);
    };
    active = { finish };
    try {
      const source = GEN_SRC + '\nconst createCinematicPlanner = ' + createCinematicPlanner.toString() + `;
self.onmessage = e => {
  try {
    const { feature, options, extent, seed, theme, previewChunks, actualChunks, previousShot, bounds } = e.data;
    GEN.setTheme(theme); GEN.setSeed(seed);
    const planner = createCinematicPlanner({ gen: GEN, aspect: () => options.aspect, bounds });
    if (previousShot) {
      const chunks = planner.mergeChunks(previewChunks, actualChunks), index = planner.assetIndex(chunks, feature, planner.dimensions(feature, options).extent);
      const result = planner.assess(previousShot, index);
      const shot = result.safe ? previousShot : planner.choose(feature, { ...options, mode: 'static' }, chunks);
      self.postMessage({ shot, reason: result.reason }); return;
    }
    const lod = extent > 220 ? 3 : 2, size = GEN.LODS[lod].size, chunks = [], transfer = [];
    for (let z = Math.floor((feature.z - extent - 72) / size); z <= Math.floor((feature.z + extent + 72) / size); z++)
      for (let x = Math.floor((feature.x - extent - 72) / size); x <= Math.floor((feature.x + extent + 72) / size); x++) {
        if (Math.hypot(Math.max(Math.abs((x + .5) * size - feature.x) - size / 2, 0), Math.max(Math.abs((z + .5) * size - feature.z) - size / 2, 0)) > extent + 72) continue;
        const c = GEN.genChunk(x, z, lod), inst = {};
        for (const [kind, b] of Object.entries(c.inst)) { inst[kind] = { m: b.m }; transfer.push(b.m.buffer); }
        chunks.push({ x0: c.x0, z0: c.z0, size: c.size, lod, inst });
      }
    const shot = planner.choose(feature, options, chunks);
    self.postMessage({ chunks, shot }, transfer);
  } catch (error) { self.postMessage({ error: String(error.stack || error) }); }
};`;
      url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' })); worker = new Worker(url);
      worker.onmessage = e => { if (e.data.error) { LOG.warn('error', 'tour-preview-failed', { message: e.data.error }); finish(null); } else finish(e.data); };
      worker.onerror = e => { LOG.warn('error', 'tour-preview-worker-failed', { message: e.message || String(e) }); finish(null); };
      timeout = setTimeout(() => { LOG.warn('error', 'tour-preview-timeout', {}); finish(null); }, 12000);
      worker.postMessage({ ...payload, options: { ...payload.options, aspect: innerWidth / innerHeight }, seed: SEED, theme: THEME, bounds: cinematicGeometryBounds() });
    } catch (error) { LOG.error('error', 'tour-preview-unavailable', { message: String(error.message || error) }); finish(null); }
  });
  const load = (feature, options, extent) => run({ feature, options, extent });
  // Structured cloning preserves the ST-owned buffers. Transferring them would
  // detach the live world meshes; expensive merge/scoring stays in this worker.
  load.refine = (feature, options, previewChunks, actualChunks, previousShot) => run({ feature, options, previewChunks, actualChunks, previousShot });
  load.cancel = () => active?.finish(null);
  return load;
}
function cinematicGeometryBounds() {
  return Object.fromEntries(Object.entries(POOLS[0]).map(([kind, pool]) => {
    const geo = pool.geo; if (!geo.boundingBox) geo.computeBoundingBox();
    return [kind, { min: geo.boundingBox.min.toArray(), max: geo.boundingBox.max.toArray() }];
  }));
}
const CINEMATIC = createCinematicPlanner({ gen: GEN, loaded: () => ST.chunks.values(), preview: createCinematicPreview(), logger: LOG, aspect: () => innerWidth / innerHeight, bounds: cinematicGeometryBounds() });
