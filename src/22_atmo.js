// =====================================================================
//  Atmosphere: moods, volumetric light & fog, colour grading
// =====================================================================
const MOODS = {
  sunrise: {
    label: ['日出', 'Sunrise'], icon: 'sunrise',
    // Sun just cresting the horizon: deep pink-violet zenith, vivid orange band, heavy warm mist
    skyTop: 0x1a2a6c, skyMid: 0x6b3fa0, skyHor: 0xf97c3c, glow: 0xff6030, glowPow: 18, sunDir: [0.62, 0.04, -0.78], sunCol: 0xffa060, sunSize: 0.000032,
    stars: 0, moon: 0, cloud: 0.28, cloudCol: 0xffc4a0, cloudShade: 0x8a6070,
    fog: 0xd09888, fogD: 0.006, fogFall: 0.055, haze: 0.00026, fogMax: 0.87, fogGlow: 0xb85030, fogGlowPow: 18,
    key: 0xff9060, keyI: 2.8, keyDir: [0.58, 0.20, -0.79], hemiSky: 0xd0a0c8, hemiGround: 0x5a3828, hemiI: 1.05,
    exposure: 1.02, bloom: 0.38, lamps: 0, glowWin: 0.08, blossomSelf: 0.11, fireflies: 0, rain: 0, wet: 0,
    vDens: 0.014, vFall: 0.17, vBase: 0, vSun: 0xff9068, vSunI: 0.95, vAmb: 0xb890b0, vAmbI: 0.55, vAniso: 0.68, vNoise: 0.8,
    shallow: 0x6a7e80, deep: 0x1a3040, wSun: 0xffa878,
    gLift: [0.018, 0.004, 0.028], gGain: [1.06, 0.97, 0.90], gSat: 1.08, gContrast: 1.06, vig: 0.55,
  },
  morning: {
    label: ['晨雾', 'Morning mist'], icon: 'sunrise',
    skyTop: 0x3d78c4, skyMid: 0x84aede, skyHor: 0xe8d3c6, glow: 0xffc08a, glowPow: 34, sunDir: [0.78, 0.14, -0.6], sunCol: 0xfff0d4, sunSize: 0.000018,
    stars: 0, moon: 0, cloud: 0.32, cloudCol: 0xfff1e2, cloudShade: 0xa6b4cc,
    fog: 0xbec9d6, fogD: 0.005, fogFall: 0.05, haze: 0.00019, fogMax: 0.82, fogGlow: 0x8a6440, fogGlowPow: 21,
    key: 0xffd9b4, keyI: 3.3, keyDir: [0.74, 0.36, -0.56], hemiSky: 0xb3c9ea, hemiGround: 0x5e5240, hemiI: 1.15,
    exposure: 0.95, bloom: 0.3, lamps: 0, glowWin: 0.05, blossomSelf: 0.09, fireflies: 0, rain: 0, wet: 0,
    vDens: 0.011, vFall: 0.16, vBase: 0, vSun: 0xffd9b0, vSunI: 0.85, vAmb: 0x9fb0c6, vAmbI: 0.5, vAniso: 0.62, vNoise: 0.75,
    shallow: 0x4d7d78, deep: 0x153743, wSun: 0xfff0d0,
    gLift: [0.0, 0.004, 0.02], gGain: [1.04, 1.0, 0.95], gSat: 1.04, gContrast: 1.04, vig: 0.5,
  },
  golden: {
    label: ['夕焼け', 'Golden hour'], icon: 'sunset',
    skyTop: 0x2f4f8e, skyMid: 0x7c8fbd, skyHor: 0xf1b98a, glow: 0xff9a4a, glowPow: 32, sunDir: [-0.82, 0.07, -0.56], sunCol: 0xffd09a, sunSize: 0.000025,
    stars: 0, moon: 0, cloud: 0.42, cloudCol: 0xffc6a0, cloudShade: 0x6f6d8f,
    fog: 0xc59a86, fogD: 0.0042, fogFall: 0.045, haze: 0.00028, fogMax: 0.88, fogGlow: 0xa8603a, fogGlowPow: 24,
    key: 0xffb27a, keyI: 3.6, keyDir: [-0.8, 0.22, -0.55], hemiSky: 0x9fb0d8, hemiGround: 0x5a4034, hemiI: 1.05,
    exposure: 0.92, bloom: 0.34, lamps: 0.55, glowWin: 0.45, blossomSelf: 0.1, fireflies: 0, rain: 0, wet: 0,
    // vDens raised to 0.009 so light shafts through foliage/buildings are visible
    vDens: 0.009, vFall: 0.06, vBase: 0, vSun: 0xffa868, vSunI: 0.80, vAmb: 0x8a7a90, vAmbI: 0.25, vAniso: 0.68, vNoise: 0.5,
    shallow: 0x55706a, deep: 0x1a2c38, wSun: 0xffc080,
    gLift: [0.012, 0.0, 0.03], gGain: [1.06, 0.99, 0.92], gSat: 1.06, gContrast: 1.06, vig: 0.6,
  },
  dusk: {
    label: ['薄暮', 'Blue hour'], icon: 'moon',
    skyTop: 0x0b1838, skyMid: 0x2a4a8a, skyHor: 0x8fa2cc, glow: 0xe2a07c, glowPow: 10, sunDir: [-0.42, 0.03, -1], sunCol: 0x000000, sunSize: 0.0002,
    stars: 0.85, moon: 0.6, cloud: 0.1, cloudCol: 0x6f84b4, cloudShade: 0x2a3860,
    fog: 0x63759f, fogD: 0.0042, fogFall: 0.034, haze: 0.0003, fogMax: 0.93, fogGlow: 0x3a2630, fogGlowPow: 8,
    key: 0xaebcf5, keyI: 0.85, keyDir: [-0.5, 0.62, -0.62], hemiSky: 0x8ea4dc, hemiGround: 0x2b2a35, hemiI: 2.0,
    exposure: 1.2, bloom: 0.42, lamps: 1, glowWin: 1.0, blossomSelf: 0.12, fireflies: 1, rain: 0, wet: 0,
    vDens: 0.006, vFall: 0.06, vBase: 0, vSun: 0x8ea4e8, vSunI: 0.8, vAmb: 0x4a5a86, vAmbI: 0.4, vAniso: 0.45, vNoise: 0.6,
    shallow: 0x3a6468, deep: 0x0a1c29, wSun: 0x8f8fb8,
    gLift: [0.0, 0.006, 0.03], gGain: [1.03, 0.99, 1.0], gSat: 1.02, gContrast: 1.05, vig: 0.62,
  },
  night: {
    label: ['月夜', 'Moonlit night'], icon: 'stars',
    skyTop: 0x040812, skyMid: 0x0d1a33, skyHor: 0x2a3a5c, glow: 0x283c66, glowPow: 6, sunDir: [0.35, 0.42, -0.84], sunCol: 0x000000, sunSize: 0.0002,
    stars: 1.4, moon: 1.5, cloud: 0.12, cloudCol: 0x3a4a6c, cloudShade: 0x121a2c,
    fog: 0x1c2740, fogD: 0.004, fogFall: 0.03, haze: 0.00028, fogMax: 0.92, fogGlow: 0x1a2a4a, fogGlowPow: 10,
    key: 0x8aa2e8, keyI: 0.75, keyDir: [0.35, 0.62, -0.7], hemiSky: 0x50628f, hemiGround: 0x15151e, hemiI: 1.3,
    exposure: 1.45, bloom: 0.55, lamps: 1.25, glowWin: 1.25, blossomSelf: 0.1, fireflies: 1, rain: 0, wet: 0,
    vDens: 0.005, vFall: 0.05, vBase: 0, vSun: 0x7f98e0, vSunI: 0.9, vAmb: 0x1f2a48, vAmbI: 0.38, vAniso: 0.55, vNoise: 0.6,
    shallow: 0x223848, deep: 0x050c16, wSun: 0x9fb2ff,
    gLift: [0.0, 0.004, 0.02], gGain: [0.98, 1.0, 1.06], gSat: 0.94, gContrast: 1.06, vig: 0.7,
  },
  rain: {
    label: ['春雨', 'Spring rain'], icon: 'rain',
    skyTop: 0x434d59, skyMid: 0x5a6571, skyHor: 0x848e96, glow: 0x000000, glowPow: 4, sunDir: [-0.3, 0.2, -1], sunCol: 0x000000, sunSize: 0.0002,
    stars: 0, moon: 0, cloud: 1.0, cloudCol: 0x8b949c, cloudShade: 0x4f5964,
    fog: 0x737f89, fogD: 0.008, fogFall: 0.03, haze: 0.0009, fogMax: 0.93, fogGlow: 0x000000, fogGlowPow: 4,
    key: 0xc5cdd8, keyI: 0.5, keyDir: [-0.25, 0.9, -0.3], hemiSky: 0xa6b1bf, hemiGround: 0x3b3e40, hemiI: 1.75,
    exposure: 1.1, bloom: 0.45, lamps: 0.95, glowWin: 0.9, blossomSelf: 0.06, fireflies: 0, rain: 1, wet: 1,
    vDens: 0.009, vFall: 0.04, vBase: 0, vSun: 0x9aa4ae, vSunI: 0.2, vAmb: 0x7a8690, vAmbI: 0.4, vAniso: 0.2, vNoise: 0.8,
    shallow: 0x3e5a5c, deep: 0x16242c, wSun: 0x000000,
    gLift: [0.006, 0.01, 0.014], gGain: [0.98, 1.0, 1.02], gSat: 0.88, gContrast: 1.03, vig: 0.55,
  },
};
const NUMK = new Set(['glowPow', 'sunSize', 'stars', 'moon', 'cloud', 'fogD', 'fogFall', 'haze', 'fogMax', 'fogGlowPow', 'keyI', 'hemiI', 'exposure', 'bloom', 'lamps', 'glowWin', 'blossomSelf', 'fireflies', 'rain', 'wet', 'vDens', 'vFall', 'vBase', 'vSunI', 'vAmbI', 'vAniso', 'vNoise', 'gSat', 'gContrast', 'vig']);
function compileMood(m) {
  const o = {};
  for (const [k, v] of Object.entries(m)) {
    if (k === 'label' || k === 'icon') continue;
    if (k === 'gLift' || k === 'gGain') o[k] = new THREE.Vector3(...v);
    else if (Array.isArray(v)) o[k] = new THREE.Vector3(...v).normalize();
    else if (NUMK.has(k)) o[k] = v;
    else o[k] = C(v);
  }
  return o;
}
const MOODC = Object.fromEntries(Object.entries(MOODS).map(([k, v]) => [k, compileMood(v)]));
const cloneMood = (m) => { const o = {}; for (const [k, v] of Object.entries(m)) o[k] = typeof v === 'number' ? v : v.clone(); return o; };
let moodName = MOODS[QS.get('mood')] ? QS.get('mood') : 'golden';
const ATM = cloneMood(MOODC[moodName]);
let moodFrom = cloneMood(ATM), moodTo = MOODC[moodName], moodT = 1, envTimer = 0;
function blendMood(t) {
  for (const k of Object.keys(moodTo)) {
    const a = moodFrom[k], b = moodTo[k];
    if (typeof b === 'number') ATM[k] = lerp(a, b, t);
    else if (b.isVector3 && k !== 'gLift' && k !== 'gGain') ATM[k].copy(a).lerp(b, t).normalize();
    else ATM[k].copy(a).lerp(b, t);
  }
}
// --- PMREM environment from the sky ------------------------------------
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.add(new THREE.Mesh(sky.geometry, skyMat));
let envRT = null;
function refreshEnv() { const rt = pmrem.fromScene(envScene, 0.035, 0.1, 6000); scene.environment = rt.texture; if (envRT) envRT.dispose(); envRT = rt; }
// --- post-processing chain ---------------------------------------------
const msaa = QUALITY === 'high' ? 4 : 2;
const rt0 = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: msaa });
rt0.depthTexture = new THREE.DepthTexture(innerWidth, innerHeight);
rt0.depthTexture.type = THREE.UnsignedIntType;
const composer = new EffectComposer(renderer, rt0);
composer.setPixelRatio(pixelRatioFor(QUALITY));
composer.setSize(innerWidth, innerHeight);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const VOL_FS = `
  #include <packing>
  uniform sampler2D tDepth, tShadow;
  uniform mat4 uInvProj, uCamWorld, uShadowM;
  uniform vec3 uCamPos, uSunDir, uSunCol, uAmb;
  uniform float uDens, uFall, uBase, uMaxDist, uTime, uAniso, uNoise, uShadowOn, uFrame;
  uniform sampler2D uMistMap;
  uniform vec2 uMistOrigin;
  uniform float uMistSpan, uMistAmount;
  uniform vec4 uCloudSea;
  varying vec2 vUv;
  float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(h31(i), h31(i+vec3(1,0,0)), f.x), mix(h31(i+vec3(0,1,0)), h31(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(h31(i+vec3(0,0,1)), h31(i+vec3(1,0,1)), f.x), mix(h31(i+vec3(0,1,1)), h31(i+vec3(1,1,1)), f.x), f.y), f.z); }
  float hg(float c, float g){ float g2 = g * g; return (1.0 - g2) / (4.0 * 3.14159 * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }
  float localMist(vec3 p) {
    vec2 uv = (p.xz - uMistOrigin) / uMistSpan;
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;
    vec2 texel = vec2(1.0 / 32.0), grid = uv / texel - 0.5, cell = floor(grid), f = fract(grid);
    vec4 a = texture2D(uMistMap, (cell + 0.5) * texel), b = texture2D(uMistMap, (cell + vec2(1.5, 0.5)) * texel);
    vec4 c = texture2D(uMistMap, (cell + vec2(0.5, 1.5)) * texel), d = texture2D(uMistMap, (cell + 1.5) * texel);
    vec4 m = mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    if (m.x * uMistAmount < 0.0000001) return 0.0;
    float height = (p.y - m.y) / max(m.z, 0.8);
    // Above/below the layer its Gaussian tail is below 1e-7. Avoid eight
    // noise hashes per step where no visible local mist can contribute.
    if (abs(height) > 4.2) return 0.0;
    float curl = n3(p * vec3(0.055, 0.22, 0.055) - vec3(uTime * 0.025, 0.0, uTime * 0.01));
    float pulse = 0.65 + 0.35 * sin(uTime * 0.09 + p.x * 0.014 + p.z * 0.009);
    float border = smoothstep(0.0, 0.09, min(min(uv.x, uv.y), min(1.0-uv.x, 1.0-uv.y)));
    return m.x * exp(-height * height) * smoothstep(0.2, 0.68, curl) * pulse * uMistAmount * border;
  }
  float cloudSea(vec3 p) {
    if (uCloudSea.x < 0.001) return 0.0;
    // uCloudSea: x=strength, y=base altitude, z=thickness, w=unused
    float base = uCloudSea.y;
    float thick = uCloudSea.z;

    // --- coarse billowing surface via 3-octave fBm ---
    vec2 drift = vec2(uTime * 0.0018, uTime * 0.0009);
    float c0 = n3(vec3(p.xz * 0.0055 + drift, 0.0));
    float c1 = n3(vec3(p.xz * 0.013  + drift * 1.8 + 4.3, 1.7)) * 0.5;
    float c2 = n3(vec3(p.xz * 0.031  + drift * 3.4 + 9.1, 3.5)) * 0.25;
    float billow = (c0 + c1 + c2) / 1.75;    // normalised ~[0,1]

    // Undulating cloud-top surface: rises and falls with the billow noise.
    // Extra vertical stretch at peaks makes cauliflower-like towers.
    float topWarp = billow * thick * 1.35;
    float cloudTop = base + topWarp;

    // Broad altitude window — early exit outside generous bounds
    if (p.y <= base - 6.0 || p.y >= cloudTop + 12.0) return 0.0;

    // Vertical profile: hard flat base → gradual falloff above lumpy top.
    // Asymmetry (fast onset, slow top fade) matches real cumulus underbelly.
    float belowBase = smoothstep(base - 4.0, base + 1.5, p.y);
    float aboveTop  = 1.0 - smoothstep(cloudTop + 1.0, cloudTop + 10.0, p.y);
    float layer = belowBase * aboveTop;

    // High-frequency holes punch through the deck so it reads as a sea
    // of individual cloud masses, not a solid slab.
    float holeNoise = n3(vec3(p.xz * 0.009 - drift * 0.7 + 2.2, 0.55));
    float holes = smoothstep(0.28, 0.62, holeNoise);

    // Vertical density gradient: denser near the flat base, wispy at top.
    // Clamp p.y within [base, cloudTop] before mapping to avoid NaN when
    // cloudTop == base (degenerate billow = 0 case).
    float invThick = 1.0 / max(topWarp, 0.5);
    float vt = clamp((p.y - base) * invThick, 0.0, 1.0);
    float vertGrad = 1.0 - vt * vt;   // dense at bottom, taper upward

    // Camera-altitude gate: cloud sea fades out as camera descends below
    // the base so low-altitude views see only sky, not smoggy haze.
    // uCloudSea.w carries camY passed from JS (see updateMist).
    float camY = uCloudSea.w;
    // Full presence when camera is well above base; vanish when it drops
    // more than 18 units below the base.
    float camGate = smoothstep(base - 18.0, base + 8.0, camY);

    return layer * holes * vertGrad * uCloudSea.x * camGate;
  }
  void main(){
    float d = texture2D(tDepth, vUv).x;
    vec4 ndc = vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
    vec4 vp = uInvProj * ndc; vp /= vp.w;
    vec3 wp = (uCamWorld * vp).xyz;
    vec3 rd = wp - uCamPos;
    float dist = length(rd); rd /= max(dist, 1e-4);
    if (d >= 0.99999) dist = uMaxDist;
    dist = min(dist, uMaxDist);
    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy + uFrame * vec2(5.588, 3.142), vec2(0.06711056, 0.00583715))));
    const int STEPS = VOL_STEPS;
    float stepLen = dist / float(STEPS);
    float cosT = dot(rd, uSunDir);
    // Keep the forward phase peak bounded so warm fog retains depth instead
    // of producing a screen-sized white/yellow halo around low sunlight.
    float phase = 0.08 + min(hg(cosT, uAniso) * 1.7, 0.7) + hg(cosT, -0.25) * 0.45;
    vec3 sunL = uSunCol * phase;
    float T = 1.0; vec3 S = vec3(0.0);
    for (int i = 0; i < STEPS; i++) {
      float t = (float(i) + ign) * stepLen;
      vec3 p = uCamPos + rd * t;
      float h = p.y - uBase;
      float dens = uDens * exp(-max(h, -8.0) * uFall);
      if (uNoise > 0.0 && dens > 0.0000001) dens *= max(0.0, 1.0 + uNoise * (n3(p * 0.045 + vec3(uTime * 0.35, 0.0, uTime * 0.12)) * 1.6 - 0.8 + (n3(p * 0.13 - uTime * 0.2) - 0.5) * 0.6));
      dens += localMist(p) + cloudSea(p);
      if (dens < 0.0000001) continue;
      float vis = 1.0;
      if (uShadowOn > 0.5) {
        vec4 sc = uShadowM * vec4(p, 1.0);
        sc.xyz /= sc.w;
        if (sc.x > 0.0 && sc.x < 1.0 && sc.y > 0.0 && sc.y < 1.0 && sc.z < 1.0) vis = step(sc.z - 0.0015, unpackRGBAToDepth(texture2D(tShadow, sc.xy)));
      }
      vec3 Ls = sunL * vis + uAmb;
      float tr = exp(-dens * stepLen);
      S += T * Ls * (1.0 - tr);
      T *= tr;
      if (T < 0.02) break;
    }
    gl_FragColor = vec4(S, T);
  }`;
const VOL_STEPS = QUALITY === 'high' ? 32 : 18;
class VolumePass extends Pass {
  constructor() {
    super();
    this.needsSwap = true;
    this.scale = QUALITY === 'high' ? 0.5 : 0.35;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
    this.rtB = this.rt.clone();
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tDepth: { value: null }, tShadow: { value: null }, uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uShadowM: { value: new THREE.Matrix4() },
        uCamPos: { value: new THREE.Vector3() }, uSunDir: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uAmb: { value: new THREE.Color() },
        uDens: { value: 0.01 }, uFall: { value: 0.05 }, uBase: { value: 0 }, uMaxDist: { value: 420 }, uTime: { value: 0 }, uAniso: { value: 0.6 }, uNoise: { value: 0.5 }, uShadowOn: { value: 0 }, uFrame: { value: 0 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: VOL_FS.replace('VOL_STEPS', String(VOL_STEPS)),
      depthTest: false, depthWrite: false,
    });
    this.blur = new THREE.ShaderMaterial({
      uniforms: { tVol: { value: null }, tDepth: { value: null }, uDir: { value: new THREE.Vector2() } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform sampler2D tVol, tDepth; uniform vec2 uDir; varying vec2 vUv;
        void main(){ float d0 = texture2D(tDepth, vUv).x; vec4 s = vec4(0.0); float w = 0.0;
          for (int i = -3; i <= 3; i++) { vec2 uv = vUv + uDir * float(i); float dd = texture2D(tDepth, uv).x;
            float wi = exp(-float(i * i) * 0.18) * exp(-abs(dd - d0) * 900.0); s += texture2D(tVol, uv) * wi; w += wi; }
          gl_FragColor = s / max(w, 1e-4); }`,
      depthTest: false, depthWrite: false,
    });
    this.comp = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, tVol: { value: null }, uOn: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse, tVol; uniform float uOn; varying vec2 vUv;
        void main(){ vec4 c = texture2D(tDiffuse, vUv); vec4 v = texture2D(tVol, vUv);
          gl_FragColor = vec4(mix(c.rgb, c.rgb * v.a + v.rgb, uOn), c.a); }`,
      depthTest: false, depthWrite: false,
    });
    this.q = new FullScreenQuad(this.mat);
  }
  setSize(w, h) {
    const sw = Math.max(2, Math.round(w * this.scale)), sh = Math.max(2, Math.round(h * this.scale));
    this.rt.setSize(sw, sh); this.rtB.setSize(sw, sh);
    this.texel = [1 / sw, 1 / sh];
  }
  setQuality(q) {
    this.scale = q === 'high' ? 0.5 : 0.35;
    this.mat.fragmentShader = VOL_FS.replace('VOL_STEPS', q === 'high' ? '32' : '18');
    this.mat.needsUpdate = true;
  }
  render(r, writeBuffer, readBuffer) {
    const u = this.mat.uniforms;
    u.tDepth.value = readBuffer.depthTexture;
    const sm = key.shadow && key.shadow.map;
    u.uShadowOn.value = sm && SHADOW.valid ? 1 : 0;
    if (sm) { u.tShadow.value = sm.texture; u.uShadowM.value.copy(key.shadow.matrix); }
    u.uInvProj.value.copy(camera.projectionMatrixInverse);
    u.uCamWorld.value.copy(camera.matrixWorld);
    u.uCamPos.value.copy(camera.position);
    u.uFrame.value = (u.uFrame.value + 1) % 64;
    this.q.material = this.mat; r.setRenderTarget(this.rt); this.q.render(r);
    const b = this.blur.uniforms;
    b.tDepth.value = readBuffer.depthTexture;
    b.tVol.value = this.rt.texture; b.uDir.value.set(this.texel[0] * 1.5, 0); this.q.material = this.blur; r.setRenderTarget(this.rtB); this.q.render(r);
    b.tVol.value = this.rtB.texture; b.uDir.value.set(0, this.texel[1] * 1.5); r.setRenderTarget(this.rt); this.q.render(r);
    this.comp.uniforms.tDiffuse.value = readBuffer.texture;
    this.comp.uniforms.tVol.value = this.rt.texture;
    this.q.material = this.comp;
    r.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.q.render(r);
  }
}
const volPass = new VolumePass();
composer.addPass(volPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.55, 0.88);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.55 }, uTime: { value: 0 }, uLift: { value: new THREE.Vector3() }, uGain: { value: new THREE.Vector3(1, 1, 1) }, uSat: { value: 1 }, uContrast: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig, uTime, uSat, uContrast; uniform vec3 uLift, uGain; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv);
      vec3 x = c.rgb;
      float l = dot(x, vec3(0.2126, 0.7152, 0.0722));
      x = mix(vec3(l), x, uSat);
      x = (x - 0.5) * uContrast + 0.5;
      x = x * uGain + uLift * (1.0 - x);
      vec2 d = vUv - 0.5; d.x *= 1.25;
      x *= 1.0 - dot(d, d) * uVig;
      float n = fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 61.0, vec2(12.9898, 78.233))) * 43758.5453);
      x += (n - 0.5) * (1.8 / 255.0);
      gl_FragColor = vec4(clamp(x, 0.0, 1.0), c.a); }`,
});
composer.addPass(grade);
// --- shadows follow the explorer ----------------------------------------
const SHADOW = { center: new THREE.Vector3(1e9, 0, 0), valid: false, timer: 0 };
function updateShadow(dt, force) {
  SHADOW.timer -= dt;
  const p = camera.position;
  const fw = new THREE.Vector3(); camera.getWorldDirection(fw); fw.y = 0; fw.normalize();
  const tx = Math.round((p.x + fw.x * 45) / 8) * 8, tz = Math.round((p.z + fw.z * 45) / 8) * 8;
  const moved = Math.hypot(tx - SHADOW.center.x, tz - SHADOW.center.z) > 0.5;
  if (force || ((moved || STREAM.dirtyShadow) && SHADOW.timer <= 0)) {
    const gy = Math.max(0, GEN.heightAt(tx, tz));
    SHADOW.center.set(tx, gy, tz);
    key.target.position.copy(SHADOW.center);
    key.position.copy(SHADOW.center).addScaledVector(ATM.keyDir, 400);
    key.target.updateMatrixWorld(); key.updateMatrixWorld();
    renderer.shadowMap.needsUpdate = true;
    SHADOW.valid = true;
    SHADOW.timer = 0.35;
    STREAM.dirtyShadow = false;
  }
}
const ambTmp = new THREE.Color(), _c1 = new THREE.Color();
function applyAtmosphere() {
  const A = ATM;
  SKY_U.uTop.value.copy(A.skyTop); SKY_U.uMid.value.copy(A.skyMid); SKY_U.uHor.value.copy(A.skyHor);
  SKY_U.uGlow.value.copy(A.glow); SKY_U.uGlowPow.value = A.glowPow; SKY_U.uSunDir.value.copy(A.sunDir);
  SKY_U.uSunCol.value.copy(A.sunCol).multiplyScalar(1.7); SKY_U.uSunSize.value = A.sunSize;
  SKY_U.uStars.value = A.stars; SKY_U.uCloud.value = A.cloud; SKY_U.uMoon.value = A.moon;
  SKY_U.uMoonDir.value.copy(A.keyDir);
  SKY_U.uCloudCol.value.copy(A.cloudCol); SKY_U.uCloudShade.value.copy(A.cloudShade);
  scene.fog.color.copy(A.fog); scene.fog.near = A.fogD; scene.fog.far = A.fogFall;
  FOGU.sun.x = A.sunDir.x; FOGU.sun.y = A.sunDir.y; FOGU.sun.z = A.sunDir.z; FOGU.sun.w = A.fogGlowPow;
  FOGU.glow.x = A.fogGlow.r * 0.24; FOGU.glow.y = A.fogGlow.g * 0.24; FOGU.glow.z = A.fogGlow.b * 0.24; FOGU.glow.w = A.haze;
  FOGU.params.y = A.fogMax;
  key.color.copy(A.key); key.intensity = A.keyI;
  hemi.color.copy(A.hemiSky); hemi.groundColor.copy(A.hemiGround); hemi.intensity = A.hemiI;
  renderer.toneMappingExposure = A.exposure;
  bloom.strength = A.bloom;
  GLOW_U.value = A.glowWin; BLOOMSELF_U.value = A.blossomSelf; WET_U.value = A.wet;
  const vu = volPass.mat.uniforms;
  vu.uDens.value = A.vDens; vu.uFall.value = A.vFall; vu.uBase.value = A.vBase; vu.uAniso.value = A.vAniso; vu.uNoise.value = A.vNoise;
  vu.uSunDir.value.copy(A.keyDir);
  vu.uSunCol.value.copy(A.vSun).multiplyScalar(A.vSunI); vu.uAmb.value.copy(A.vAmb).multiplyScalar(A.vAmbI);
  const gu = grade.uniforms;
  gu.uLift.value.copy(A.gLift); gu.uGain.value.copy(A.gGain); gu.uSat.value = A.gSat; gu.uContrast.value = A.gContrast; gu.uVig.value = A.vig;
  ambTmp.copy(A.hemiSky).multiplyScalar(A.hemiI * 0.2).add(_c1.copy(A.key).multiplyScalar(A.keyI * 0.06));
  WATER_U.uSky.value.copy(ambTmp).multiplyScalar(1.6);
  WATER_U.uHorizon.value.copy(A.skyHor).multiplyScalar(0.85);
  WATER_U.uZenith.value.copy(A.skyMid).lerp(A.skyTop, 0.4);
  WATER_U.uShallow.value.copy(A.shallow); WATER_U.uDeep.value.copy(A.deep);
  WATER_U.uSun.value.copy(A.wSun).multiplyScalar(A.keyI * 0.5);
  WATER_U.uSunDir.value.copy(A.keyDir);
  WATER_U.uRain.value = A.rain;
  FX_APPLY(A);
  applySkySettings();
}
function setMood(name, instant = false) {
  if (!MOODS[name]) return;
  LOG.info('business', 'atmosphere-changed', { mood: name });
  moodFrom = cloneMood(ATM); moodTo = MOODC[name]; moodName = name; moodT = instant ? 1 : 0;
  if (instant) { blendMood(1); applyAtmosphere(); refreshEnv(); updateShadow(0, true); }
  $('moodLine').textContent = I18N.t('mood.' + name);
  SKY_SETTINGS.sync();
  document.querySelectorAll('#moods button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mood === name)));
  if (typeof audio !== 'undefined') audio.setMood(name);
}
function updateMood(dt) {
  if (moodT >= 1) return;
  moodT = Math.min(1, moodT + dt / 2.6);
  blendMood(moodT * moodT * (3 - 2 * moodT));
  applyAtmosphere();
  envTimer -= dt;
  if (envTimer <= 0 || moodT >= 1) { refreshEnv(); envTimer = 0.3; updateShadow(0, true); }
}

// --- Free time mode -------------------------------------------------------
// Drives a continuous 24-h sky by interpolating between mood anchors.
// The sun follows a tilted arc (azimuth ~135° east of north); the moon
// rises opposite. All sky uniforms update every frame while active.
const FREE_TIME = { on: false, minutes: 0 }; // 0-1440
const FT_ANCHORS = [
  { t:   0, mood: 'night'  },
  { t: 330, mood: 'dusk'   },  // 5:30 pre-dawn
  { t: 360, mood: 'sunrise'},  // 6:00 sunrise
  { t: 480, mood: 'morning'},  // 8:00 morning mist
  { t: 720, mood: 'golden' },  // 12:00 → use golden as midday proxy
  { t:1080, mood: 'golden' },  // 18:00 golden hour
  { t:1170, mood: 'dusk'   },  // 19:30 dusk
  { t:1260, mood: 'night'  },  // 21:00 night
  { t:1440, mood: 'night'  },
];
function _ftBlendedMood(minutes) {
  let lo = FT_ANCHORS[0], hi = FT_ANCHORS[FT_ANCHORS.length - 1];
  for (let i = 0; i < FT_ANCHORS.length - 1; i++) {
    if (minutes >= FT_ANCHORS[i].t && minutes <= FT_ANCHORS[i + 1].t) { lo = FT_ANCHORS[i]; hi = FT_ANCHORS[i + 1]; break; }
  }
  const span = hi.t - lo.t || 1, t = (minutes - lo.t) / span;
  const ease = t * t * (3 - 2 * t);
  const A = MOODC[lo.mood], B = MOODC[hi.mood];
  for (const k of Object.keys(A)) {
    const a = A[k], b = B[k];
    if (typeof b === 'number') ATM[k] = lerp(a, b, ease);
    else if (b.isVector3 && k !== 'gLift' && k !== 'gGain') ATM[k].copy(a).lerp(b, ease).normalize();
    else ATM[k].copy(a).lerp(b, ease);
  }
  // Override sun direction with a proper arc: azimuth 135° east of north, max elevation ~55°
  const noon = 720, sunAngle = ((minutes - noon) / 720) * Math.PI; // -π..π over the day
  const elevation = Math.sin(sunAngle) * 0.88;     // max ~0.88 at noon
  const azimuth   = Math.cos(sunAngle);
  const sunDir = new THREE.Vector3(azimuth * 0.72, elevation, azimuth * 0.55).normalize();
  ATM.sunDir.copy(sunDir);
  ATM.keyDir.copy(sunDir);
  // Moon rises 12 hours later opposite the sun
  const moonAngle = sunAngle + Math.PI;
  const moonElev  = Math.sin(moonAngle) * 0.75;
  const moonAz    = Math.cos(moonAngle);
  SKY_U.uMoonDir.value.set(moonAz * 0.72, moonElev, moonAz * 0.55).normalize();
  // Stars fade with sun elevation
  ATM.stars = Math.max(0, -elevation) * 1.5;
  ATM.moon  = Math.max(0, -elevation) * 1.2;
}
function applyFreeTime(minutes) {
  FREE_TIME.minutes = minutes;
  _ftBlendedMood(minutes);
  applyAtmosphere();
  refreshEnv();
  updateShadow(0, true);
  // Update clock display
  const h = Math.floor(minutes / 60), m = minutes % 60;
  const el = $('timeClock'); if (el) el.textContent = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
  // Phase label
  const phaseEl = $('timePhase');
  if (phaseEl) {
    const phase = minutes < 300 || minutes >= 1200 ? 'night' : minutes < 420 ? 'dawn' : minutes < 1080 ? 'day' : 'dusk';
    phaseEl.textContent = I18N.t('time.phase.' + phase);
  }
}
function toggleFreeTime(force) {
  FREE_TIME.on = force !== undefined ? force : !FREE_TIME.on;
  const dock = $('timeDock'); if (dock) dock.hidden = !FREE_TIME.on;
  if (FREE_TIME.on) {
    // Initialise slider position from current mood
    const minuteMap = { sunrise:360, morning:480, golden:1080, dusk:1170, night:0, rain:720 };
    FREE_TIME.minutes = minuteMap[moodName] ?? 720;
    const sl = $('timeSlider'); if (sl) { sl.value = FREE_TIME.minutes; sl.dispatchEvent(new Event('input')); }
    applyFreeTime(FREE_TIME.minutes);
  } else {
    setMood(moodName, true);
  }
  return FREE_TIME.on;
}
