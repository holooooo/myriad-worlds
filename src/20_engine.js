// =====================================================================
//  SAKURA WORLD — engine: boot, renderer, materials, pools, streaming
// =====================================================================
window.__svStarted = true;
const $ = (id) => document.getElementById(id);
const QS = new URLSearchParams(location.search);
let booted = false;
const T0 = performance.now();
const mark = (l) => { if (QS.has('timing')) console.log('[m]', Math.round(performance.now() - T0), l); };
function setProgress(p, msg) {
  $('ldFill').style.transform = `scaleX(${Math.max(0, Math.min(1, p))})`;
  if (msg) $('ldStatus').textContent = msg;
}
function fatal(title, msg, detail) {
  $('loader').style.display = 'none';
  $('fatal').hidden = false;
  $('fatalTitle').textContent = title; $('fatalMsg').textContent = msg || ''; $('fatalCode').textContent = detail || '';
}
window.addEventListener('error', (e) => { if (!booted) fatal('The world could not be generated', 'An unexpected error stopped the scene from loading.', e.message || String(e.error || e)); else console.error(e.error || e.message); });
window.addEventListener('unhandledrejection', (e) => { const r = e.reason; if (!booted) fatal('The world could not be generated', 'An unexpected error stopped the scene from loading.', (r && (r.stack || r.message)) || String(r)); });
const nextFrame = () => new Promise((r) => setTimeout(r, 16));
const GL_LEVEL = (() => { try { const c = document.createElement('canvas'); if (c.getContext('webgl2')) return 2; if (c.getContext('webgl')) return 1; } catch (e) { /* */ } return 0; })();
if (GL_LEVEL < 2) {
  fatal('WebGL 2 is not available', 'This explorable world needs WebGL 2 (hardware-accelerated graphics). Enable hardware acceleration or open the page in a current Chrome, Edge, Firefox or Safari.', '');
  throw new Error('WebGL2 unsupported');
}
let THREE, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass, Pass, FullScreenQuad;
try {
  const m = await Promise.all([
    import('three'), import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
    import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/OutputPass.js'),
    import('three/addons/postprocessing/ShaderPass.js'), import('three/addons/postprocessing/Pass.js'),
  ]);
  THREE = m[0]; ({ EffectComposer } = m[1]); ({ RenderPass } = m[2]); ({ UnrealBloomPass } = m[3]); ({ OutputPass } = m[4]); ({ ShaderPass } = m[5]); ({ Pass, FullScreenQuad } = m[6]);
} catch (e) {
  fatal('The 3D engine could not be downloaded', 'Three.js is loaded from the jsDelivr CDN. Please check your internet connection (or any content blocker) and reload.', String(e && e.message || e));
  throw e;
}
const GEN_SRC = $('gen-src').textContent;
const GEN = new Function(GEN_SRC + '\nreturn GEN;')();
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches || QS.has('still');
const COARSE = matchMedia('(pointer: coarse)').matches;
const SMALL = Math.min(innerWidth, innerHeight) < 600;
let QUALITY = QS.get('q') || ((COARSE || SMALL) ? 'lite' : 'high');
let SEED = QS.get('seed') || localStorage.getItem('sakura-world-seed') || 'sakura';
GEN.setSeed(SEED);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const C = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
setProgress(0.08, 'Starting the world generator…');

// ---------------------------------------------------------------------
//  Global fog chunks (height + distance + sun glow) for every material
// ---------------------------------------------------------------------
const FOGU = { sun: { x: 0, y: 0.2, z: -1, w: 6 }, glow: { x: 0.3, y: 0.2, z: 0.2, w: 0.0003 }, params: { x: 0, y: 0.95, z: 0, w: 0 } };
(function patchFog() {
  const S = THREE.ShaderChunk;
  S.fog_pars_vertex = `#ifdef USE_FOG\n varying vec3 vFogWorldPos;\n#endif`;
  S.fog_vertex = `#ifdef USE_FOG
    vec4 svFogP = vec4( transformed, 1.0 );
    #ifdef USE_INSTANCING
      svFogP = instanceMatrix * svFogP;
    #endif
    vFogWorldPos = ( modelMatrix * svFogP ).xyz;
  #endif`;
  S.fog_pars_fragment = `#ifdef USE_FOG
    uniform vec3 fogColor; uniform float fogNear; uniform float fogFar;
    uniform vec4 uFogSun; uniform vec4 uFogGlow; uniform vec4 uFogParams;
    varying vec3 vFogWorldPos;
  #endif`;
  S.fog_fragment = `#ifdef USE_FOG
  {
    vec3 fRd = vFogWorldPos - cameraPosition;
    float fDist = max(length(fRd), 1e-3);
    vec3 fDir = fRd / fDist;
    float fb = max(fogFar, 1e-4);
    float fCamH = cameraPosition.y - uFogParams.x;
    float fAmt;
    if (abs(fDir.y) > 1e-3) fAmt = fogNear * exp(-fCamH * fb) * (1.0 - exp(-fDist * fDir.y * fb)) / (fDir.y * fb);
    else fAmt = fogNear * exp(-fCamH * fb) * fDist;
    fAmt = max(fAmt, 0.0) + uFogGlow.w * fDist;
    float fF = min(1.0 - exp(-fAmt), uFogParams.y);
    float fS = max(dot(fDir, uFogSun.xyz), 0.0);
    vec3 fCol = fogColor + uFogGlow.rgb * pow(fS, uFogSun.w);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fCol, fF);
  }
  #endif`;
  const extra = { uFogSun: { value: FOGU.sun }, uFogGlow: { value: FOGU.glow }, uFogParams: { value: FOGU.params } };
  Object.assign(THREE.UniformsLib.fog, extra);
  for (const k of Object.keys(THREE.ShaderLib)) { const u = THREE.ShaderLib[k].uniforms; if (u && u.fogColor) Object.assign(u, extra); }
})();

// ---------------------------------------------------------------------
//  Renderer & scene
// ---------------------------------------------------------------------
const canvas = $('scene');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false }); }
catch (e) { fatal('WebGL could not start', 'The browser refused to create a WebGL context. Try enabling hardware acceleration or closing other GPU-heavy tabs.', String(e && e.message || e)); throw e; }
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
let prScale = 1;
const pixelRatioFor = (q) => (q === 'high' ? Math.min(devicePixelRatio, 1.6) : Math.min(devicePixelRatio, 1.2)) * prScale;
renderer.setPixelRatio(pixelRatioFor(QUALITY));
renderer.setSize(innerWidth, innerHeight, false);
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fatal('The graphics context was lost', 'The GPU reset or ran out of memory. Reload the page (Lite quality uses less memory).', ''); });
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x6b7aa3, 0.004, 0.04);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.4, 7000);
camera.position.set(0, 40, 0);
const hemi = new THREE.HemisphereLight(0x8a9fd8, 0x2a2833, 1.0);
const key = new THREE.DirectionalLight(0xb4c2ff, 1.0);
key.castShadow = true;
{
  const sc = key.shadow.camera;
  sc.left = -105; sc.right = 105; sc.top = 105; sc.bottom = -105; sc.near = 10; sc.far = 900;
  key.shadow.bias = -0.0002; key.shadow.normalBias = 0.35; key.shadow.radius = 4;
  const ms = QUALITY === 'high' ? 4096 : 2048;
  key.shadow.mapSize.set(ms, ms);
}
scene.add(hemi, key, key.target);

// ---------------------------------------------------------------------
//  Sky dome (gradient, sun / moon, clouds, stars)
// ---------------------------------------------------------------------
const SKY_U = {
  uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHor: { value: new THREE.Color() },
  uGlow: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 0.1, -1) }, uSunCol: { value: new THREE.Color() },
  uGlowPow: { value: 6 }, uSunSize: { value: 0.0004 }, uStars: { value: 0 }, uCloud: { value: 0.3 }, uTime: { value: 0 },
  uCloudCol: { value: new THREE.Color() }, uCloudShade: { value: new THREE.Color() },
  uMoonDir: { value: new THREE.Vector3(0.3, 0.5, -0.8).normalize() }, uMoon: { value: 0 },
};
const SKY_FS = /* glsl */`
  uniform vec3 uTop, uMid, uHor, uGlow, uSunDir, uSunCol, uCloudCol, uCloudShade, uMoonDir;
  uniform float uGlowPow, uSunSize, uStars, uCloud, uTime, uMoon;
  varying vec3 vDir;
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * n2(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
  void main(){
    vec3 d = normalize(vDir);
    float y = d.y;
    vec3 col = mix(uHor, uMid, smoothstep(-0.02, 0.24, y));
    col = mix(col, uTop, smoothstep(0.2, 0.9, y));
    float s = max(dot(d, uSunDir), 0.0);
    float hb = 1.0 - smoothstep(-0.06, 0.32, y);
    col += uGlow * (pow(s, uGlowPow) * hb + pow(s, 3.0) * 0.07 * hb + pow(s, 600.0) * 0.6);
    col += uSunCol * smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.55, s);
    if (uMoon > 0.0) {
      float m = dot(d, uMoonDir);
      float disc = smoothstep(0.99955, 0.99968, m);
      float crescent = 1.0 - smoothstep(0.99955, 0.99968, dot(d, normalize(uMoonDir + vec3(0.012, 0.006, 0.0))));
      col += vec3(1.0, 0.96, 0.88) * disc * crescent * 2.2 * uMoon + vec3(0.5, 0.6, 0.9) * pow(max(m, 0.0), 220.0) * 0.12 * uMoon;
    }
    if (uCloud > 0.001 && y > -0.06) {
      vec2 cp = d.xz / (max(y, 0.0) + 0.14) * 1.3 + vec2(uTime * 0.006, uTime * 0.002);
      float c = fbm(cp);
      float cov = smoothstep(0.62 - 0.3 * uCloud, 0.98 - 0.2 * uCloud, c);
      float lit = clamp(0.5 + (fbm(cp + 0.35) - c) * 3.0, 0.0, 1.0);
      vec3 cc = mix(uCloudShade, uCloudCol, lit) + uGlow * pow(s, 4.0) * 0.35 * lit;
      col = mix(col, cc, cov * smoothstep(-0.04, 0.1, y) * (0.55 + 0.45 * uCloud));
    }
    if (uStars > 0.001) {
      vec3 g = d * 240.0; vec3 id = floor(g); float r = h31(id);
      if (r > 0.9965) { vec3 f = fract(g) - 0.5; float st = smoothstep(0.32, 0.0, length(f)) * (0.6 + 0.4 * sin(uTime * 1.7 + r * 400.0));
        col += vec3(0.85, 0.9, 1.0) * st * uStars * smoothstep(0.12, 0.55, y); }
    }
    col = mix(col, uHor * 0.85, smoothstep(0.0, -0.25, y));
    col *= 1.0 + (h21(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.03;
    gl_FragColor = vec4(col, 1.0);
  }`;
const skyMat = new THREE.ShaderMaterial({
  uniforms: SKY_U, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: SKY_FS,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), skyMat);
sky.frustumCulled = false; sky.renderOrder = -10;
scene.add(sky);

// ---------------------------------------------------------------------
//  Materials (one set per LOD; far LODs hide inside nearer coverage)
// ---------------------------------------------------------------------
const NL = GEN.LODS.length;
const TIME_U = { value: 0 }, SWAY_U = { value: REDUCED ? 0 : 1 }, GLOW_U = { value: 1 }, BLOOMSELF_U = { value: 0.1 };
const WET_U = { value: 0 }, SNOWY_U = { value: 0 };
function chainCompile(mat, fn, keyPart) {
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); fn(sh); };
  mat.customProgramCacheKey = () => prevKey() + '|' + keyPart;
}
function patchEmissive(mat, u, tint) {
  chainCompile(mat, (sh) => {
    sh.uniforms.uEmis = u; sh.uniforms.uEmisTint = { value: tint };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uEmis; uniform vec3 uEmisTint;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#if defined(USE_COLOR) || defined(USE_INSTANCING_COLOR)\n totalEmissiveRadiance += vColor.rgb * uEmisTint * uEmis;\n#endif');
  }, 'emis');
}
function patchSway(mat, amp, grass) {
  chainCompile(mat, (sh) => {
    sh.uniforms.uTime = TIME_U; sh.uniforms.uSway = SWAY_U;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uSway;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 swIp = instanceMatrix[3].xyz;
          float swW = sin(uTime * 1.25 + swIp.x * 0.31 + swIp.z * 0.23) * 0.6 + sin(uTime * 2.3 + swIp.y * 0.9 + swIp.x) * 0.4;
          transformed.xz += vec2(swW, swW * 0.6) * ${amp.toFixed(3)} * uSway * ${grass ? 'max(position.y, 0.0) * 2.0' : '1.0'};
        #endif`);
  }, 'sway' + (grass ? 'g' : 'b'));
}
function patchWet(mat) {
  // rain: darker, glossier surfaces facing the sky
  chainCompile(mat, (sh) => {
    sh.uniforms.uWet = WET_U;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uWet;')
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.28, uWet * 0.65);
        diffuseColor.rgb *= 1.0 - 0.22 * uWet;`);
  }, 'wet');
}
const terrainMats = [], kitMats = [];
for (let li = 0; li < NL; li++) {
  const tm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: li === 0 ? 0.92 : 0.97, metalness: 0, envMapIntensity: 0.3 });
  patchWet(tm);
  terrainMats.push(tm);
  const km = {
    solid: new THREE.MeshStandardMaterial({ roughness: 0.84, metalness: 0, envMapIntensity: 0.35 }),
    lacquer: new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0, envMapIntensity: 0.7 }),
    metal: new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.85, envMapIntensity: 1.2 }),
    leaf: new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0, envMapIntensity: 0.3 }),
    glow: new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, envMapIntensity: 0.2 }),
    blossom: new THREE.MeshStandardMaterial({ roughness: 0.66, metalness: 0, envMapIntensity: 0.45 }),
  };
  patchEmissive(km.glow, GLOW_U, new THREE.Color(1.0, 0.55, 0.24).multiplyScalar(2.4));
  patchEmissive(km.blossom, BLOOMSELF_U, new THREE.Color(1.0, 0.82, 0.88));
  if (li === 0) { patchSway(km.blossom, 0.09, false); patchSway(km.leaf, 0.035, false); }
  for (const k of ['solid', 'lacquer']) patchWet(km[k]);
  kitMats.push(km);
}
const tuftMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, envMapIntensity: 0.3 });
patchSway(tuftMat, 0.07, true);

// geometry
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const blossomGeo = new THREE.BoxGeometry(1, 1, 1);
{
  const P = blossomGeo.attributes.position, N = blossomGeo.attributes.normal, v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { n.fromBufferAttribute(N, i); v.fromBufferAttribute(P, i); n.addScaledVector(v, 1.1).normalize(); N.setXYZ(i, n.x, n.y, n.z); }
}
function mergeBoxes(list) {
  const pos = [], nor = [], col = [], idx = [];
  const g = new THREE.BoxGeometry(1, 1, 1), P = g.attributes.position, N = g.attributes.normal, I = g.index;
  const m = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3();
  for (const b of list) {
    m.compose(new THREE.Vector3(b.x, b.y, b.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(b.rx || 0, b.ry || 0, b.rz || 0)), new THREE.Vector3(b.sx, b.sy, b.sz));
    nm.getNormalMatrix(m);
    const base = pos.length / 3;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z);
      const sh = b.grad ? lerp(b.grad[0], b.grad[1], P.getY(i) + 0.5) : 1;
      col.push(sh, sh, sh);
    }
    for (let i = 0; i < I.count; i++) idx.push(base + I.getX(i));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.setIndex(idx);
  return out;
}
const tuftGeo = mergeBoxes([
  { x: 0, y: 0.25, z: 0, sx: 0.06, sy: 0.5, sz: 0.06, grad: [0.45, 1.05] },
  { x: 0.08, y: 0.2, z: 0.02, sx: 0.05, sy: 0.42, sz: 0.05, rz: -0.35, grad: [0.45, 1.0] },
  { x: -0.07, y: 0.21, z: -0.03, sx: 0.05, sy: 0.44, sz: 0.05, rx: 0.3, rz: 0.25, grad: [0.45, 1.0] },
]);

// ---------------------------------------------------------------------
//  Water (planar mirror shared by every water chunk)
// ---------------------------------------------------------------------
const HIDE_IN_MIRROR = new Set();
const MIRROR = { rt: null, cam: new THREE.PerspectiveCamera(), texMatrix: new THREE.Matrix4(), active: false, scale: QUALITY === 'high' ? 0.5 : 0.33 };
const WATER_U = {
  uTime: TIME_U, uRain: { value: 0 }, tMirror: { value: null }, uTexMatrix: { value: MIRROR.texMatrix }, uMirrorOn: { value: 0 },
  uShallow: { value: C(0x3d6a6a) }, uDeep: { value: C(0x0d2430) }, uSky: { value: new THREE.Color(0.5, 0.55, 0.7) },
  uSun: { value: new THREE.Color(0.4, 0.4, 0.5) }, uSunDir: { value: new THREE.Vector3(0, 0.3, -1).normalize() },
  uHorizon: { value: new THREE.Color(0.3, 0.35, 0.5) }, uZenith: { value: new THREE.Color(0.1, 0.15, 0.3) },
};
const WATER_VS = /* glsl */`
  attribute float depth;
  varying vec3 vWorld; varying float vDepth; varying vec4 vRUv;
  uniform mat4 uTexMatrix;
  #include <fog_pars_vertex>
  void main(){
    vec3 transformed = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz; vDepth = depth;
    vRUv = uTexMatrix * wp;
    gl_Position = projectionMatrix * viewMatrix * wp;
    #include <fog_vertex>
  }`;
const WATER_FS = /* glsl */`
  uniform sampler2D tMirror; uniform float uTime, uRain, uMirrorOn;
  uniform vec3 uShallow, uDeep, uSky, uSun, uSunDir, uHorizon, uZenith;
  varying vec3 vWorld; varying float vDepth; varying vec4 vRUv;
  #include <fog_pars_fragment>
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
  float waves(vec2 p, float big){
    float t = uTime;
    return n2(p*0.32 + vec2(t*0.09, t*0.035))*0.62 + n2(p*0.85 + vec2(-t*0.14, t*0.10))*0.27 + n2(p*2.1 + vec2(t*0.22, -t*0.17))*0.11
      + big * (sin(p.x * 0.18 + p.y * 0.05 + t * 0.9) * 0.5 + sin(p.y * 0.23 - t * 0.7) * 0.4);
  }
  void main(){
    vec2 p = vWorld.xz;
    float big = smoothstep(2.0, 9.0, vDepth) * 0.35;
    float e = 0.2;
    float h0 = waves(p, big), hx = waves(p + vec2(e, 0.0), big), hz = waves(p + vec2(0.0, e), big);
    vec3 N = normalize(vec3(-(hx - h0) / e * 0.32, 1.0, -(hz - h0) / e * 0.32));
    if (uRain > 0.01) {
      vec2 g = p * 1.7; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
      float rnd = h21(id); vec2 c = (vec2(h21(id + 3.1), h21(id + 7.7)) - 0.5) * 0.3;
      float ph = fract(uTime * 0.85 + rnd), r = length(f - c), rr = ph * 0.42;
      float ring = sin((r - rr) * 60.0) * exp(-pow((r - rr) * 13.0, 2.0)) * (1.0 - ph);
      vec2 dr = normalize(f - c + 1e-4);
      N = normalize(N + vec3(dr.x, 0.0, dr.y) * ring * 0.45 * uRain);
    }
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = 0.02 + 0.98 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);
    vec3 R = reflect(-V, N);
    vec3 refl = mix(uHorizon, uZenith, smoothstep(0.0, 0.6, R.y));
    #ifndef PADDY
    if (uMirrorOn > 0.5) { vec2 ruv = vRUv.xy / vRUv.w + N.xz * 0.016; refl = texture2D(tMirror, ruv).rgb; }
    #endif
    float dep = vDepth;
    vec3 body = mix(uShallow, uDeep, smoothstep(0.0, 4.0, dep)) * uSky;
    float rs = clamp(mix(0.42, 1.0, fres), 0.0, 1.0);
    vec3 col = mix(body, refl, rs);
    col += uSun * pow(max(dot(R, uSunDir), 0.0), 300.0) * 2.0;
    float foam = (1.0 - smoothstep(0.03, 0.42, dep)) * (0.5 + 0.5 * n2(p * 2.4 + uTime * 0.25));
    col = mix(col, uSky * 0.75 + uHorizon * 0.25, foam * 0.3);
    float a = mix(0.62, 0.98, smoothstep(0.1, 1.8, dep));
    #ifdef PADDY
      a = 0.86;
    #endif
    a = max(a, rs) * smoothstep(0.0, 0.14, dep);
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
    #include <fog_fragment>
  }`;
const mkWaterMat = (paddy) => {
  const m = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, WATER_U, THREE.UniformsUtils.clone(THREE.UniformsLib.fog)),
    vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, fog: true, defines: paddy ? { PADDY: 1 } : {},
  });
  for (const k of Object.keys(WATER_U)) m.uniforms[k] = WATER_U[k];
  return m;
};
const waterMat = mkWaterMat(false), paddyMat = mkWaterMat(true);
paddyMat.uniforms.uShallow.value = C(0x5a7a4a);
paddyMat.uniforms.uDeep.value = C(0x2c4428);
const _rp = new THREE.Plane(), _rn = new THREE.Vector3(0, 1, 0), _rv = new THREE.Vector3(), _rt = new THREE.Vector3(), _rq = new THREE.Vector4(), _rc = new THREE.Vector4();
const _rm = new THREE.Matrix4(), _look = new THREE.Vector3();
function renderMirror() {
  const mc = MIRROR.cam;
  if (camera.position.y < 0.05) { MIRROR.active = false; return; }
  _rv.copy(camera.position); _rv.y = -_rv.y;
  _rm.extractRotation(camera.matrixWorld);
  _look.set(0, 0, -1).applyMatrix4(_rm).add(camera.position);
  _rt.copy(_look); _rt.y = -_rt.y;
  mc.position.copy(_rv);
  mc.up.set(0, 1, 0).applyMatrix4(_rm); mc.up.y = -mc.up.y;
  mc.lookAt(_rt);
  mc.far = camera.far; mc.near = camera.near;
  mc.updateMatrixWorld();
  mc.projectionMatrix.copy(camera.projectionMatrix);
  MIRROR.texMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  MIRROR.texMatrix.multiply(mc.projectionMatrix).multiply(mc.matrixWorldInverse);
  // oblique near plane = water plane
  _rp.setFromNormalAndCoplanarPoint(_rn, new THREE.Vector3(0, 0, 0));
  _rp.applyMatrix4(mc.matrixWorldInverse);
  _rc.set(_rp.normal.x, _rp.normal.y, _rp.normal.z, _rp.constant);
  const pm = mc.projectionMatrix;
  _rq.x = (Math.sign(_rc.x) + pm.elements[8]) / pm.elements[0];
  _rq.y = (Math.sign(_rc.y) + pm.elements[9]) / pm.elements[5];
  _rq.z = -1.0; _rq.w = (1.0 + pm.elements[10]) / pm.elements[14];
  _rc.multiplyScalar(2.0 / _rc.dot(_rq));
  pm.elements[2] = _rc.x; pm.elements[6] = _rc.y; pm.elements[10] = _rc.z + 1.0 - 0.003; pm.elements[14] = _rc.w;
  const hidden = [];
  for (const o of HIDE_IN_MIRROR) if (o.visible) { o.visible = false; hidden.push(o); }
  const rt0 = renderer.getRenderTarget();
  const auto = renderer.shadowMap.autoUpdate; const need = renderer.shadowMap.needsUpdate;
  renderer.shadowMap.needsUpdate = false;
  renderer.setRenderTarget(MIRROR.rt);
  renderer.clear();
  renderer.render(scene, mc);
  renderer.setRenderTarget(rt0);
  renderer.shadowMap.autoUpdate = auto; renderer.shadowMap.needsUpdate = need;
  for (const o of hidden) o.visible = true;
  MIRROR.active = true;
}

// ---------------------------------------------------------------------
//  Instance pools: one InstancedMesh per (LOD, material), block-allocated
// ---------------------------------------------------------------------
class Pool {
  constructor(geo, mat, cap, opt = {}) {
    this.geo = geo; this.mat = mat; this.cap = 0; this.top = 0; this.free = []; this.opt = opt; this.live = 0;
    this.mesh = null; this.grow(cap);
  }
  grow(cap) {
    const old = this.mesh;
    const mesh = new THREE.InstancedMesh(this.geo, this.mat, cap);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    mesh.frustumCulled = false;
    mesh.castShadow = !!this.opt.cast; mesh.receiveShadow = this.opt.receive !== false;
    mesh.count = this.top;
    mesh.instanceMatrix.array.fill(0);
    if (old) {
      mesh.instanceMatrix.array.set(old.instanceMatrix.array.subarray(0, this.top * 16));
      mesh.instanceColor.array.set(old.instanceColor.array.subarray(0, this.top * 3));
      scene.remove(old); old.dispose();
      if (this.opt.noMirror) HIDE_IN_MIRROR.delete(old);
    }
    if (this.opt.noMirror) HIDE_IN_MIRROR.add(mesh);
    this.mesh = mesh; this.cap = cap;
    scene.add(mesh);
  }
  alloc(n) {
    for (let i = 0; i < this.free.length; i++) {
      const b = this.free[i];
      if (b[1] >= n) { const s = b[0]; b[0] += n; b[1] -= n; if (!b[1]) this.free.splice(i, 1); this.live += n; return s; }
    }
    if (this.top + n > this.cap) this.grow(Math.max(this.cap * 2, this.top + n + 1024));
    const s = this.top; this.top += n; this.mesh.count = this.top; this.live += n;
    return s;
  }
  write(s, m, c) {
    const M = this.mesh.instanceMatrix, Cc = this.mesh.instanceColor;
    M.array.set(m, s * 16); Cc.array.set(c, s * 3);
    M.addUpdateRange(s * 16, m.length); Cc.addUpdateRange(s * 3, c.length);
    M.needsUpdate = true; Cc.needsUpdate = true;
  }
  clear(s, n) {
    const M = this.mesh.instanceMatrix;
    M.array.fill(0, s * 16, (s + n) * 16);
    M.addUpdateRange(s * 16, n * 16); M.needsUpdate = true;
  }
  rewrite(s, n, m, c) {
    const M = this.mesh.instanceMatrix, Cc = this.mesh.instanceColor;
    M.array.set(m, s * 16); Cc.array.set(c, s * 3);
    M.addUpdateRange(s * 16, n * 16); Cc.addUpdateRange(s * 3, c.length); M.needsUpdate = true; Cc.needsUpdate = true;
  }
  release(s, n) {
    const M = this.mesh.instanceMatrix;
    M.array.fill(0, s * 16, (s + n) * 16);
    M.addUpdateRange(s * 16, n * 16); M.needsUpdate = true;
    this.live -= n;
    if (s + n === this.top) { this.top = s; this.mesh.count = this.top; this.mergeTop(); }
    else { this.free.push([s, n]); this.free.sort((a, b) => a[0] - b[0]); for (let i = this.free.length - 1; i > 0; i--) { const a = this.free[i - 1], b = this.free[i]; if (a[0] + a[1] === b[0]) { a[1] += b[1]; this.free.splice(i, 1); } } }
  }
  mergeTop() { let ch = true; while (ch) { ch = false; for (let i = 0; i < this.free.length; i++) { const b = this.free[i]; if (b[0] + b[1] === this.top) { this.top = b[0]; this.free.splice(i, 1); this.mesh.count = this.top; ch = true; break; } } } }
}
const POOLS = [];
for (let li = 0; li < NL; li++) {
  const P = {};
  const base = li === 0 ? 1 : 0.5;
  P.solid = new Pool(boxGeo, kitMats[li].solid, Math.round(80000 * base), { cast: li === 0 });
  P.lacquer = new Pool(boxGeo, kitMats[li].lacquer, 6000, { cast: li === 0 });
  P.metal = new Pool(boxGeo, kitMats[li].metal, 3000, { cast: li === 0 });
  P.leaf = new Pool(boxGeo, kitMats[li].leaf, Math.round(60000 * base), { cast: li === 0 });
  P.glow = new Pool(boxGeo, kitMats[li].glow, 6000, { cast: false });
  P.blossom = new Pool(blossomGeo, kitMats[li].blossom, Math.round(120000 * base), { cast: li === 0 });
  if (li === 0) P.tuft = new Pool(tuftGeo, tuftMat, 60000, { cast: false, noMirror: true });
  if (li >= 2) for (const k of Object.keys(P)) HIDE_IN_MIRROR.add(P[k].mesh), P[k].opt.noMirror = true;
  POOLS.push(P);
}
