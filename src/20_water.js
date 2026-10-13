// =====================================================================
//  Water: shared surface shading and a single bounded planar reflection.
//  The renderer owns chunks; this module owns only water materials/targets.
// =====================================================================
const MIRROR = {
  rt: null, cam: new THREE.PerspectiveCamera(), texMatrix: new THREE.Matrix4(),
  active: false, level: 0, scale: QUALITY === 'high' ? 0.5 : 0.33, samples: QUALITY === 'high' ? 2 : 0,
  theme: null, quality: null, failed: false, renders: 0,
};
const WATER_U = {
  uTime: TIME_U, uRain: { value: 0 }, tMirror: { value: null }, uTexMatrix: { value: MIRROR.texMatrix }, uMirrorOn: { value: 0 }, uMirrorLevel: { value: 0 },
  uShallow: { value: C(0x4d7d78) }, uDeep: { value: C(0x153743) }, uSky: { value: new THREE.Color(0.5, 0.55, 0.7) },
  uSun: { value: new THREE.Color(0.4, 0.4, 0.5) }, uSunDir: { value: new THREE.Vector3(0, 0.3, -1).normalize() },
  uHorizon: { value: new THREE.Color(0.3, 0.35, 0.5) }, uZenith: { value: new THREE.Color(0.1, 0.15, 0.3) },
  uClearShallow: { value: C(0x70b9ab) }, uClearDeep: { value: C(0x164753) }, uClarity: { value: 0.25 },
  uDetail: { value: QUALITY === 'high' ? 1 : 0 }, uMirrorTexel: { value: new THREE.Vector2(1, 1) },
};
const WATER_VS = /* glsl */`
  attribute float depth; attribute vec3 tint; attribute float clarity;
  varying vec3 vWorld; varying float vDepth; varying vec4 vRUv; varying vec3 vWaterTint; varying float vClarity;
  uniform mat4 uTexMatrix;
  #include <fog_pars_vertex>
  void main(){
    vec3 transformed = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz; vDepth = depth; vWaterTint = tint; vClarity = clarity;
    vRUv = uTexMatrix * wp;
    gl_Position = projectionMatrix * viewMatrix * wp;
    #include <fog_vertex>
  }`;
const WATER_FS = /* glsl */`
  uniform sampler2D tMirror;
  uniform float uTime, uRain, uMirrorOn, uClarity, uDetail, uMirrorLevel;
  uniform vec2 uMirrorTexel;
  uniform vec3 uShallow, uDeep, uSky, uSun, uSunDir, uHorizon, uZenith, uClearShallow, uClearDeep;
  varying vec3 vWorld; varying float vDepth; varying vec4 vRUv; varying vec3 vWaterTint; varying float vClarity;
  #include <fog_pars_fragment>
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
  vec2 waveSlope(vec2 p, float dep){
    // Analytic derivatives avoid nine repeated noise evaluations per pixel.
    float t = uTime, open = smoothstep(0.1, 5.0, dep);
    vec2 d1 = vec2(0.94, 0.34), d2 = vec2(-0.39, 0.92), d3 = vec2(0.68, -0.73);
    vec2 slope = d1 * cos(dot(p, d1) * 0.72 + t * 0.8) * (0.025 + 0.042 * open);
    slope += d2 * cos(dot(p, d2) * 1.31 - t * 1.15) * 0.038;
    float detail = 1.0 - smoothstep(0.12, 0.65, length(fwidth(p)));
    slope += d3 * cos(dot(p, d3) * 4.7 + t * 1.7) * 0.033 * detail;
    if (uDetail > 0.5) slope += vec2(0.22, 0.98) * cos(dot(p, vec2(0.22, 0.98)) * 9.3 - t * 2.1) * 0.022 * detail;
    #ifdef PADDY
      slope *= 0.4;
    #endif
    return slope;
  }
  void main(){
    float dep = max(vDepth, 0.0);
    vec2 p = vWorld.xz;
    vec2 slope = waveSlope(p, dep);
    vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));
    if (uRain > 0.01) {
      vec2 g = p * 1.7, id = floor(g), f = fract(g) - 0.5;
      float rnd = h21(id); vec2 c = (vec2(h21(id + 3.1), h21(id + 7.7)) - 0.5) * 0.3;
      float ph = fract(uTime * 0.85 + rnd), r = length(f - c), rr = ph * 0.42;
      float ring = sin((r - rr) * 60.0) * exp(-pow((r - rr) * 13.0, 2.0)) * (1.0 - ph);
      vec2 dr = normalize(f - c + 1e-4);
      N = normalize(N + vec3(dr.x, 0.0, dr.y) * ring * 0.3 * uRain);
    }
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vWorld);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fres = 0.0204 + 0.9796 * pow(1.0 - ndv, 5.0);
    vec3 R = reflect(-V, N);
    vec3 refl = mix(uHorizon, uZenith, smoothstep(0.0, 0.65, R.y));
    #ifndef PADDY
    if (uMirrorOn > 0.5 && vRUv.w > 0.0 && abs(vWorld.y - uMirrorLevel) < 0.05) {
      float distanceToEye = length(cameraPosition - vWorld);
      vec2 ruv = vRUv.xy / vRUv.w + N.xz * mix(0.021, 0.003, smoothstep(20.0, 240.0, distanceToEye));
      float edge = min(min(ruv.x, ruv.y), min(1.0 - ruv.x, 1.0 - ruv.y));
      float mirrorWeight = smoothstep(0.0, 0.035, edge);
      vec2 uv = clamp(ruv, uMirrorTexel, vec2(1.0) - uMirrorTexel);
      vec3 mirrorColor = texture2D(tMirror, uv).rgb;
      if (uDetail > 0.5) {
        vec2 blur = uMirrorTexel * (0.5 + 1.7 * (1.0 - ndv));
        mirrorColor = mirrorColor * 0.6 + (texture2D(tMirror, uv + blur).rgb + texture2D(tMirror, uv - blur).rgb) * 0.2;
      }
      refl = mix(refl, mirrorColor, mirrorWeight);
    }
    #endif
    float hasTint = step(0.0001, length(vWaterTint));
    float clear = mix(uClarity, vClarity, hasTint);
    vec3 clearShallow = mix(uClearShallow, vWaterTint, hasTint * 0.9);
    vec3 clearDeep = mix(uClearDeep, vWaterTint * vec3(0.22, 0.38, 0.5), hasTint * 0.8);
    vec3 shallow = mix(uShallow, clearShallow, clear), deep = mix(uDeep, clearDeep, clear);
    // Exponential absorption preserves jade shallows and blue-green depth.
    float absorption = 1.0 - exp(-dep * 0.42);
    vec3 body = mix(shallow, deep, absorption) * uSky;
    float reflection = fres + (1.0 - fres) * 0.24;
    #ifdef PADDY
      reflection = fres + (1.0 - fres) * 0.14;
    #endif
    vec3 col = mix(body, refl, reflection);
    float sunGlint = pow(max(dot(R, uSunDir), 0.0), mix(220.0, 480.0, 1.0 - uRain));
    col += uSun * sunGlint * 1.8;
    float shore = (1.0 - smoothstep(0.0, 0.58, dep));
    float ripple = 0.5 + 0.5 * sin(dep * 24.0 - uTime * 1.45 + n2(p * 0.32) * 4.0);
    float foam = shore * smoothstep(0.64, 0.94, ripple) * 0.18;
    col = mix(col, uSky * 0.75 + uHorizon * 0.25, foam);
    if (uDetail > 0.5) {
      float caustic = pow(max(0.0, sin(p.x * 2.3 + p.y * 0.8 + uTime * 0.6) * sin(p.y * 2.8 - p.x * 0.6 - uTime * 0.45)), 12.0);
      col += shallow * uSun * caustic * exp(-dep * 0.8) * (1.0 - reflection) * 0.11;
    }
    float a = max(reflection, mix(0.36, 0.96, 1.0 - exp(-dep * 0.75)));
    #ifdef PADDY
      a = max(reflection, 0.68);
    #endif
    a *= smoothstep(0.0, 0.14, vDepth);
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
    #include <fog_fragment>
  }`;
function mkWaterMat(paddy) {
  const uniforms = Object.assign({}, WATER_U, THREE.UniformsUtils.clone(THREE.UniformsLib.fog));
  if (paddy) {
    // Paddy colours must never mutate the live lake/river uniform objects.
    uniforms.uShallow = { value: C(0x6c8768) }; uniforms.uDeep = { value: C(0x31493b) };
    uniforms.uClarity = { value: 0 };
  }
  return new THREE.ShaderMaterial({
    name: paddy ? 'terrace-water' : 'lake-river-water', uniforms,
    vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, fog: true,
    side: THREE.DoubleSide, defines: paddy ? { PADDY: 1 } : {},
  });
}
const waterMat = mkWaterMat(false), paddyMat = mkWaterMat(true);
function setWaterTheme(theme) {
  const next = theme === 'shanshui' ? 'shanshui' : 'sakura';
  if (MIRROR.theme === next) return;
  MIRROR.theme = next;
  const palette = GEN.theme === next && GEN.profile && GEN.profile.water;
  WATER_U.uClearShallow.value.setHex(palette && palette.shallow != null ? palette.shallow : next === 'shanshui' ? 0x76c8b3 : 0x70b9ab);
  WATER_U.uClearDeep.value.setHex(palette && palette.deep != null ? palette.deep : next === 'shanshui' ? 0x11656b : 0x164753);
  WATER_U.uClarity.value = next === 'shanshui' ? 0.72 : 0.25;
  LOG.info('business', 'water-theme-changed', { theme: next });
}
function setWaterQuality(q) {
  const next = q === 'high' ? 'high' : 'lite';
  MIRROR.scale = next === 'high' ? 0.5 : 0.33;
  MIRROR.samples = next === 'high' ? 2 : 0;
  WATER_U.uDetail.value = next === 'high' ? 1 : 0;
  if (MIRROR.quality !== next) LOG.debug('business', 'water-quality-changed', { quality: next, scale: MIRROR.scale, samples: MIRROR.samples });
  MIRROR.quality = next;
}
const _waterTargetSize = new THREE.Vector2();
function ensureWaterTarget() {
  const size = renderer.getDrawingBufferSize(_waterTargetSize);
  const scale = Math.min(MIRROR.scale, 1536 / Math.max(size.x, size.y));
  const w = Math.max(128, Math.round(size.x * scale)), h = Math.max(128, Math.round(size.y * scale));
  if (!MIRROR.rt) {
    MIRROR.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: MIRROR.samples, stencilBuffer: false });
    MIRROR.rt.texture.name = 'shared-water-reflection';
    WATER_U.tMirror.value = MIRROR.rt.texture;
    LOG.debug('business', 'water-reflection-created', { width: w, height: h, samples: MIRROR.samples });
  } else {
    if (MIRROR.rt.samples !== MIRROR.samples) { MIRROR.rt.samples = MIRROR.samples; MIRROR.rt.dispose(); }
    if (MIRROR.rt.width !== w || MIRROR.rt.height !== h) MIRROR.rt.setSize(w, h);
  }
  WATER_U.uMirrorTexel.value.set(1 / w, 1 / h);
}
const _waterPlane = new THREE.Plane(), _waterNormal = new THREE.Vector3(0, 1, 0), _waterOrigin = new THREE.Vector3();
const _mirrorPosition = new THREE.Vector3(), _mirrorTarget = new THREE.Vector3(), _mirrorLook = new THREE.Vector3();
const _mirrorQ = new THREE.Vector4(), _mirrorClip = new THREE.Vector4(), _mirrorRotation = new THREE.Matrix4();
function nearestWaterLevel() {
  let distance = Infinity, level = 0;
  for (const mesh of scene.children) {
    if (!mesh.visible || mesh.material !== waterMat) continue;
    const p = mesh.geometry.getAttribute('position'); if (!p) continue;
    const stride = Math.max(1, Math.floor(p.count / 96));
    for (let i = 0; i < p.count; i += stride) {
      const d = (p.getX(i) - camera.position.x) ** 2 + (p.getZ(i) - camera.position.z) ** 2;
      if (d < distance) { distance = d; level = p.getY(i); }
    }
  }
  return level;
}
function renderMirror() {
  if (MIRROR.quality !== QUALITY) setWaterQuality(QUALITY);
  setWaterTheme(GEN.theme);
  WATER_U.uMirrorOn.value = 0;
  MIRROR.active = false;
  const surface = GEN.waterAt ? GEN.waterAt(camera.position.x, camera.position.z) : null;
  const level = surface && surface.kind !== 'paddy' ? surface.level : nearestWaterLevel();
  MIRROR.level = level; WATER_U.uMirrorLevel.value = level;
  // A submerged camera is relative to its own lake surface, at any elevation.
  if (camera.position.y < level + 0.05 || MIRROR.failed) return;
  ensureWaterTarget();
  const mc = MIRROR.cam;
  _mirrorPosition.copy(camera.position); _mirrorPosition.y = 2 * level - _mirrorPosition.y;
  _mirrorRotation.extractRotation(camera.matrixWorld);
  _mirrorLook.set(0, 0, -1).applyMatrix4(_mirrorRotation).add(camera.position);
  _mirrorTarget.copy(_mirrorLook); _mirrorTarget.y = 2 * level - _mirrorTarget.y;
  mc.position.copy(_mirrorPosition);
  mc.up.set(0, 1, 0).applyMatrix4(_mirrorRotation); mc.up.y = -mc.up.y;
  mc.lookAt(_mirrorTarget); mc.far = camera.far; mc.near = camera.near;
  mc.updateMatrixWorld(); mc.projectionMatrix.copy(camera.projectionMatrix);
  MIRROR.texMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  MIRROR.texMatrix.multiply(mc.projectionMatrix).multiply(mc.matrixWorldInverse);
  _waterOrigin.y = level;
  _waterPlane.setFromNormalAndCoplanarPoint(_waterNormal, _waterOrigin).applyMatrix4(mc.matrixWorldInverse);
  _mirrorClip.set(_waterPlane.normal.x, _waterPlane.normal.y, _waterPlane.normal.z, _waterPlane.constant);
  const pm = mc.projectionMatrix;
  _mirrorQ.set((Math.sign(_mirrorClip.x) + pm.elements[8]) / pm.elements[0], (Math.sign(_mirrorClip.y) + pm.elements[9]) / pm.elements[5], -1, (1 + pm.elements[10]) / pm.elements[14]);
  const denominator = _mirrorClip.dot(_mirrorQ);
  if (Math.abs(denominator) < 1e-6) return;
  _mirrorClip.multiplyScalar(2 / denominator);
  pm.elements[2] = _mirrorClip.x; pm.elements[6] = _mirrorClip.y; pm.elements[10] = _mirrorClip.z + 1 - 0.003; pm.elements[14] = _mirrorClip.w;
  mc.projectionMatrixInverse.copy(pm).invert();
  const hidden = [], rt = renderer.getRenderTarget(), xr = renderer.xr.enabled;
  const auto = renderer.shadowMap.autoUpdate, need = renderer.shadowMap.needsUpdate;
  try {
    // Exclude every water surface, including terraces, to avoid feedback.
    for (const o of scene.children) if (o.visible && (HIDE_IN_MIRROR.has(o) || o.material === waterMat || o.material === paddyMat)) { o.visible = false; hidden.push(o); }
    renderer.xr.enabled = false; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = false;
    renderer.setRenderTarget(MIRROR.rt); renderer.clear(); renderer.render(scene, mc);
    MIRROR.active = true; MIRROR.renders++; WATER_U.uMirrorOn.value = 1;
  } catch (e) {
    MIRROR.failed = true;
    LOG.error('error', 'water-reflection-failed', { message: String(e && e.message || e) });
  } finally {
    renderer.setRenderTarget(rt); renderer.xr.enabled = xr;
    renderer.shadowMap.autoUpdate = auto; renderer.shadowMap.needsUpdate = need;
    for (const o of hidden) o.visible = true;
  }
}
setWaterTheme(GEN.theme);
setWaterQuality(QUALITY);
