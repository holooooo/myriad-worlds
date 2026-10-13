// =====================================================================
//  MYRIAD WORLDS — engine: boot, renderer, materials, pools, streaming
// =====================================================================
window.__svStarted = true;
const LOG = (() => {
  const entries = [];
  function write(level, category, event, detail = {}) {
    const record = { time: new Date().toISOString(), level, category, event, ...detail };
    entries.push(record); if (entries.length > 200) entries.shift();
    if (level !== 'debug' || new URLSearchParams(location.search).has('debug')) console[level]('[myriad-worlds]', record);
  }
  return { entries, info: (c, e, d) => write('info', c, e, d), warn: (c, e, d) => write('warn', c, e, d), error: (c, e, d) => write('error', c, e, d), debug: (c, e, d) => write('debug', c, e, d) };
})();
LOG.info('access', 'page-open', { path: location.pathname });
const $ = (id) => document.getElementById(id);
const QS = new URLSearchParams(location.search);
I18N.applyLabels();
let booted = false;
const T0 = performance.now();
const mark = (l) => { if (QS.has('timing')) console.log('[m]', Math.round(performance.now() - T0), l); };
function setProgress(p, msg) {
  $('ldFill').style.transform = `scaleX(${Math.max(0, Math.min(1, p))})`;
  if (msg) $('ldStatus').textContent = msg;
}
function fatal(title, msg, detail) {
  LOG.error('error', 'fatal', { title, message: msg, detail });
  $('loader').style.display = 'none';
  $('fatal').hidden = false;
  $('fatalTitle').textContent = title; $('fatalMsg').textContent = msg || ''; $('fatalCode').textContent = detail || '';
}
window.addEventListener('error', (e) => { if (!booted) fatal(I18N.t('error.world.title'), I18N.t('error.world.unexpected'), e.message || String(e.error || e)); else LOG.error('error', 'runtime', { message: e.message }); });
window.addEventListener('unhandledrejection', (e) => { const r = e.reason; LOG.error('error', 'promise-rejection', { message: String(r && r.stack || r) }); if (!booted) fatal(I18N.t('error.world.title'), I18N.t('error.world.unexpected'), (r && (r.stack || r.message)) || String(r)); });
const nextFrame = () => new Promise((r) => setTimeout(r, 16));
const GL_LEVEL = (() => { try { const c = document.createElement('canvas'); if (c.getContext('webgl2')) return 2; if (c.getContext('webgl')) return 1; } catch (e) { /* */ } return 0; })();
if (GL_LEVEL < 2) {
  fatal(I18N.t('error.webgl2.title'), I18N.t('error.webgl2.message'), '');
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
  fatal(I18N.t('error.engine.title'), I18N.t('error.engine.message'), String(e && e.message || e));
  throw e;
}
const GEN_SRC = $('gen-src').textContent;
const GEN = new Function(GEN_SRC + '\nreturn GEN;')();
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches || QS.has('still');
const COARSE = matchMedia('(pointer: coarse)').matches;
const SMALL = Math.min(innerWidth, innerHeight) < 600;
let QUALITY = QS.get('q') || ((COARSE || SMALL) ? 'lite' : 'high');
let SEED = QS.get('seed') || localStorage.getItem('myriad-worlds-seed') || localStorage.getItem('sakura-world-seed') || 'sakura';
GEN.setSeed(SEED);
const THEME = QS.get('theme') === 'shanshui' ? 'shanshui' : 'sakura';
GEN.setTheme(THEME);
LOG.info('business', 'world-profile-selected', { theme: THEME, seed: SEED });
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const C = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
setProgress(0.08, I18N.t('loading.generator'));

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
catch (e) { fatal(I18N.t('error.context.title'), I18N.t('error.context.message'), String(e && e.message || e)); throw e; }
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
let prScale = 1;
const pixelRatioFor = (q) => (q === 'high' ? Math.min(devicePixelRatio, 1.6) : Math.min(devicePixelRatio, 1.2)) * prScale;
renderer.setPixelRatio(pixelRatioFor(QUALITY));
renderer.setSize(innerWidth, innerHeight, false);
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fatal(I18N.t('error.lost.title'), I18N.t('error.lost.message'), ''); });
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
  uGlowPow: { value: 32 }, uSunSize: { value: 0.000025 }, uStars: { value: 0 }, uStarCount: { value: 0 }, uStarDensity: { value: 1 }, uCloud: { value: 0.3 }, uTime: { value: 0 },
  uCloudCol: { value: new THREE.Color() }, uCloudShade: { value: new THREE.Color() },
  uMoonDir: { value: new THREE.Vector3(0.3, 0.5, -0.8).normalize() }, uMoon: { value: 0 }, uMoonPhase: { value: 0.18 },
  uMoonRadius: { value: 0.028 }, uMoonBrightness: { value: 0.85 }, uMoonHalo: { value: 0.55 },
  uPlanetDir: { value: new THREE.Vector3(0, 0.3, -1).normalize() }, uPlanetType: { value: 0 },
  uPlanetRadius: { value: 0.37 }, uPlanetBrightness: { value: 0.9 }, uRingTilt: { value: 0.55 },
};
const SKY_FS = /* glsl */`
  uniform vec3 uTop, uMid, uHor, uGlow, uSunDir, uSunCol, uCloudCol, uCloudShade, uMoonDir;
  uniform float uGlowPow, uSunSize, uStars, uStarCount, uStarDensity, uCloud, uTime, uMoon, uMoonPhase, uMoonRadius, uMoonBrightness, uMoonHalo;
  uniform vec3 uPlanetDir;
  uniform float uPlanetType, uPlanetRadius, uPlanetBrightness, uRingTilt;
  varying vec3 vDir;
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * n2(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
  // Valley's sky uses a smooth, plain celestial disc. Keep that restrained
  // appearance here, with a physical terminator rather than noisy craters.
  float lunarRadiance(float incidence) {
    return (0.006 + smoothstep(-0.012, 0.012, incidence) * (0.86 + 0.14 * sqrt(max(incidence, 0.0)))) * 0.60;
  }
  float lunarHalo(float distance, float radius, float amount) {
    float span = max(radius * radius * (1.0 + amount * 0.7), 0.000001);
    return exp(-distance * distance / span) * amount * 0.025;
  }
  vec3 giantPlanet(vec3 d, vec3 background) {
    if (uPlanetType < 0.5) return background;
    vec3 center = uPlanetDir, right = normalize(cross(vec3(0.0, 1.0, 0.0), center)), up = cross(center, right);
    float radius = uPlanetRadius, along = dot(d, center);
    float discriminant = along * along - (1.0 - radius * radius);
    float edge = max(fwidth(discriminant), 0.000015);
    float sphereAlpha = smoothstep(-edge, edge, discriminant) * step(0.0, along);
    float sphereDistance = along - sqrt(max(discriminant, 0.0));
    vec3 normal = normalize(d * sphereDistance - center);
    vec3 surface = vec3(0.0);
    if (sphereAlpha > 0.001) {
      vec3 bodyNormal = vec3(dot(normal, right), dot(normal, up), dot(normal, -center));
      float longitude = atan(bodyNormal.x, bodyNormal.z) + uTime * 0.02;
      float latitude = asin(clamp(bodyNormal.y, -1.0, 1.0));
      // Periodic longitude coordinates keep detail continuous across the seam
      // as every planet rotates slowly on its own axis.
      vec2 weatherUv = vec2(sin(longitude) * 13.0 + cos(longitude) * 4.0, latitude * 17.0 + cos(longitude) * 3.0);
      if (uPlanetType > 1.5 && uPlanetType < 2.5) {
        // Jupiter-like latitude bands and an elliptical, swirling great storm.
        float turbulence = n2(weatherUv) - 0.5, fine = n2(weatherUv * 3.1 + 9.2) - 0.5;
        float bands = 0.5 + 0.5 * sin(latitude * 29.0 + turbulence * 2.1 + sin(latitude * 73.0) * 0.27 + fine * 0.24);
        surface = mix(vec3(0.37, 0.24, 0.15), vec3(0.82, 0.72, 0.54), bands);
        surface *= 0.86 + 0.09 * sin(latitude * 96.0 + turbulence * 3.0) + fine * 0.12;
        float stormLongitude = atan(sin(longitude + 0.45), cos(longitude + 0.45));
        vec2 stormUv = vec2(stormLongitude / 0.29, (latitude + 0.18) / 0.115);
        float stormR = length(stormUv), storm = 1.0 - smoothstep(0.72, 1.13, stormR);
        float spiral = 0.5 + 0.5 * sin(atan(stormUv.y, stormUv.x) * 3.0 - stormR * 13.0);
        surface = mix(surface, mix(vec3(0.46, 0.17, 0.09), vec3(0.72, 0.39, 0.23), spiral), storm * 0.9);
      } else if (uPlanetType > 2.5) {
        // The close white planet is a calm, untextured sphere; its shape
        // comes from broad lighting and the thin layered rings alone.
        surface = vec3(0.84, 0.88, 0.94);
      } else {
        float frost = n2(weatherUv * 0.52), grains = n2(weatherUv * 3.3);
        float fissures = 1.0 - smoothstep(0.025, 0.11, abs(sin(longitude * 17.0 + sin(latitude * 19.0) * 0.65 + frost * 2.0)));
        float polarCap = smoothstep(0.72, 1.28, abs(latitude));
        surface = mix(vec3(0.46, 0.65, 0.77), vec3(0.8, 0.88, 0.91), frost * 0.55 + polarCap * 0.45);
        surface *= (0.91 + grains * 0.09) * (1.0 - fissures * 0.19);
      }
    }
    vec3 light = normalize(-center * 0.55 + uSunDir * 0.45 + up * 0.18);
    float lightSide = max(dot(normal, light), 0.0);
    float lighting = uPlanetType > 2.5 ? 0.56 + 0.44 * sqrt(lightSide) : 0.32 + 0.68 * lightSide;
    float limb = pow(1.0 - max(dot(normal, -d), 0.0), 3.0);
    vec3 sphereCol = (surface * lighting + vec3(0.035, 0.05, 0.065) * limb) * uPlanetBrightness;
    float haze = 0.11 + (1.0 - smoothstep(-0.12, 0.38, d.y)) * 0.2;
    sphereCol = mix(sphereCol, background, haze);
    vec3 result = mix(background, sphereCol, sphereAlpha);
    if (uPlanetType < 1.5 || uPlanetType > 2.5) {
      float facing = uPlanetType > 2.5 ? 0.38 : 0.16;
      vec3 ringNormal = normalize(center * facing + (up * cos(uRingTilt) + right * sin(uRingTilt)) * sqrt(1.0 - facing * facing));
      float denominator = dot(d, ringNormal);
      float safeDenominator = (denominator < 0.0 ? -1.0 : 1.0) * max(abs(denominator), 0.0001);
      float ringDistance = dot(center, ringNormal) / safeDenominator;
      float ringR = length(d * ringDistance - center), inner = radius * 1.28, outer = radius * (uPlanetType > 2.5 ? 2.8 : 2.5);
      float ringEdge = min(max(fwidth(ringR), 0.00015), radius * 0.08);
      float ringAlpha = smoothstep(inner - ringEdge, inner + ringEdge, ringR) * (1.0 - smoothstep(outer - ringEdge, outer + ringEdge, ringR)) * step(0.0, ringDistance);
      if (ringAlpha > 0.001) {
        float radial = clamp((ringR - inner) / (outer - inner), 0.0, 1.0);
        float stripes = 0.63 + 0.22 * sin(radial * 182.0) + 0.15 * sin(radial * 391.0);
        float division = smoothstep(0.009, 0.032, abs(radial - 0.61));
        ringAlpha *= (0.44 + stripes * 0.4) * mix(0.17, 1.0, division);
        vec3 ringCol = mix(vec3(0.43, 0.53, 0.59), vec3(0.79, 0.83, 0.85), radial * 0.5 + stripes * 0.4) * uPlanetBrightness;
        ringCol = mix(ringCol, background, haze * 1.2);
        // Draw the far arc behind the sphere, then the near arc across it.
        result = mix(background, ringCol, ringAlpha);
        result = mix(result, sphereCol, sphereAlpha);
        float frontArc = 1.0 - step(sphereDistance, ringDistance);
        result = mix(result, ringCol, ringAlpha * frontArc * sphereAlpha);
      }
    }
    return result;
  }
  void main(){
    vec3 d = normalize(vDir);
    float y = d.y;
    vec3 col = mix(uHor, uMid, smoothstep(-0.02, 0.24, y));
    col = mix(col, uTop, smoothstep(0.2, 0.9, y));
    float s = max(dot(d, uSunDir), 0.0);
    float hb = 1.0 - smoothstep(-0.06, 0.32, y);
    // A small angular disc and a restrained aureole keep the warm horizon
    // visible without turning half the sky into a white bloom source.
    float sunDistance = length(d - uSunDir), sunRadius = sqrt(2.0 * uSunSize);
    float sunEdge = max(fwidth(sunDistance), 0.00008);
    col += uGlow * pow(s, max(uGlowPow, 14.0)) * hb * 0.18;
    col += uSunCol * exp(-sunDistance * sunDistance / max(uSunSize * 16.0, 0.000001)) * 0.055;
    col += uSunCol * (1.0 - smoothstep(max(sunRadius - sunEdge, 0.0), sunRadius + sunEdge, sunDistance));
    float moonCover = 0.0;
    if (uMoon > 0.0 && uMoonBrightness > 0.0) {
      vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), uMoonDir)), bitangent = cross(uMoonDir, tangent);
      float md = length(d - uMoonDir), edge = max(fwidth(md), 0.00008);
      float disc = 1.0 - smoothstep(uMoonRadius - edge, uMoonRadius + edge, md);
      moonCover = disc;
      float phaseAngle = uMoonPhase * 6.2831853, phaseCos = cos(phaseAngle);
      if (disc > 0.001) {
        vec2 moonUv = vec2(dot(d, tangent), dot(d, bitangent)) / max(uMoonRadius * sqrt(1.0 - uMoonRadius * uMoonRadius * 0.25), 0.0001);
        vec3 normal = vec3(moonUv, sqrt(max(1.0 - dot(moonUv, moonUv), 0.0)));
        vec3 lunarSun = vec3(sin(phaseAngle), 0.0, -phaseCos);
        float incidence = dot(normal, lunarSun);
        vec3 moonCol = vec3(0.82, 0.86, 0.91) * lunarRadiance(incidence);
        col = mix(col, moonCol * uMoon * uMoonBrightness, disc);
      }
      float halo = lunarHalo(md, uMoonRadius, uMoonHalo) * uMoonBrightness * uMoon * 0.5 * (1.0 - phaseCos) * (1.0 - disc);
      col += vec3(0.72, 0.80, 0.94) * halo;
    }
    // One bounded angular cell lookup per pixel; count/density never add
    // geometry or a render pass. Clouds below occlude both stars and moon.
    if (uStarCount > 0.0 && uStars > 0.0 && y > 0.0) {
      vec2 starGrid = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(y, -1.0, 1.0)) / 3.1415927 + 0.5) * vec2(320.0, 160.0);
      vec2 id = floor(starGrid); float r = h21(id + 73.4);
      float probability = clamp(uStarCount * uStarDensity / 25600.0, 0.0, 0.19);
      if (r < probability) {
        vec2 center = vec2(h21(id + 19.7), h21(id + 47.1)) * 0.6 + 0.2;
        float radius = 0.042 + h21(id + 5.3) * 0.035;
        float aa = max(length(fwidth(starGrid)) * 0.45, 0.012);
        float star = 1.0 - smoothstep(radius, radius + aa, length(fract(starGrid) - center));
        float twinkle = 0.84 + 0.16 * sin(uTime * 1.3 + r * 731.0);
        col += mix(vec3(0.74, 0.84, 1.0), vec3(1.0, 0.91, 0.76), h21(id + 8.2)) * star * twinkle * uStars * smoothstep(0.04, 0.3, y) * (1.0 - moonCover);
      }
    }
    col = giantPlanet(d, col);
    if (uCloud > 0.001 && y > -0.06) {
      vec2 cp = d.xz / (max(y, 0.0) + 0.14) * 1.3 + vec2(uTime * 0.006, uTime * 0.002);
      float c = fbm(cp);
      float cov = smoothstep(0.78 - 0.62 * uCloud, 0.94 - 0.38 * uCloud, c);
      float lit = clamp(0.5 + (fbm(cp + 0.35) - c) * 3.0, 0.0, 1.0);
      vec3 cc = mix(uCloudShade, uCloudCol, lit) + uGlow * pow(s, 20.0) * 0.11 * lit;
      col = mix(col, cc, cov * smoothstep(-0.04, 0.1, y) * (0.55 + 0.45 * uCloud));
    }
    col = mix(col, uHor * 0.85, 1.0 - smoothstep(-0.25, 0.0, y));
    col *= 1.0 + (h21(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.03 * (1.0 - moonCover);
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
const tuftGeo = buildGrassGeometry('grass');

// Reflection exclusions are populated as instance pools are allocated.
const HIDE_IN_MIRROR = new Set();
