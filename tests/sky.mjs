import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../node_modules/three/build/three.module.js';

const engine = fs.readFileSync(new URL('../src/20_engine.js', import.meta.url), 'utf8');
const atmo = fs.readFileSync(new URL('../src/22_atmo.js', import.meta.url), 'utf8');
const settings = fs.readFileSync(new URL('../src/22_sky_settings.js', import.meta.url), 'utf8');
const moodSource = atmo.slice(atmo.indexOf('const MOODS'), atmo.indexOf('// --- PMREM'));
const skySource = engine.slice(engine.indexOf('const SKY_U'), engine.indexOf('const skyMat'));
const applySource = atmo.slice(atmo.indexOf('const ambTmp'), atmo.indexOf('function setMood'));
const C = (hex) => new THREE.Color(hex), uniform = value => ({ value });
function fixture(saved = '{}', failSave = false) {
  const logs = [], timers = new Map(); let timer = 0, environmentRefreshes = 0;
  const localStorage = { getItem: () => saved, setItem: (_, value) => { if (failSave) throw new Error('quota'); saved = value; } };
  const dependencies = {
    THREE, C, QS: new URLSearchParams('mood=golden'),
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)), lerp: (a, b, t) => a + (b - a) * t,
    LOG: Object.fromEntries(['info', 'warn', 'error', 'debug'].map(level => [level, (...args) => logs.push({ level, args })])),
    localStorage, document: {}, $: () => null, booted: true,
    setTimeout: fn => { timers.set(++timer, fn); return timer; }, clearTimeout: id => timers.delete(id),
    refreshEnv: () => environmentRefreshes++,
    FOGU: { sun: {}, glow: {}, params: {} }, scene: { fog: { color: C(0), near: 0, far: 0 } },
    key: { color: C(0), intensity: 0 }, hemi: { color: C(0), groundColor: C(0), intensity: 0 }, renderer: {}, bloom: {},
    GLOW_U: {}, BLOOMSELF_U: {}, WET_U: {},
    volPass: { mat: { uniforms: Object.fromEntries(['uDens', 'uFall', 'uBase', 'uAniso', 'uNoise'].map(k => [k, uniform(0)]).concat([['uSunDir', uniform(new THREE.Vector3())], ['uSunCol', uniform(C(0))], ['uAmb', uniform(C(0))]])) } },
    grade: { uniforms: Object.fromEntries(['uLift', 'uGain'].map(k => [k, uniform(new THREE.Vector3())]).concat(['uSat', 'uContrast', 'uVig'].map(k => [k, uniform(0)]))) },
    WATER_U: Object.fromEntries(['uSky', 'uHorizon', 'uZenith', 'uShallow', 'uDeep', 'uSun'].map(k => [k, uniform(C(0))]).concat([['uSunDir', uniform(new THREE.Vector3())], ['uRain', uniform(0)]])),
    FX_APPLY() {},
  };
  const api = new Function(...Object.keys(dependencies), moodSource + skySource + applySource + settings + `
    return { SKY_SETTINGS, SKY_U, ATM, MOODS, SKY_FS, applyAtmosphere,
      switchMood(name) { moodName=name; Object.assign(ATM,cloneMood(MOODC[name])); applyAtmosphere(); },
      environment() { return { exposure:renderer.toneMappingExposure, fog:scene.fog.color.clone(), scattering:volPass.mat.uniforms.uSunCol.value.clone() }; } };
  `)(...Object.values(dependencies));
  assert.equal(environmentRefreshes, 0, 'Settings initialization may not apply atmosphere or trigger PMREM before boot');
  api.applyAtmosphere();
  return { ...api, logs, flush() { for (const fn of timers.values()) fn(); timers.clear(); }, refreshes: () => environmentRefreshes, saved: () => JSON.parse(saved) };
}
const api = fixture(), settingsApi = api.SKY_SETTINGS, U = api.SKY_U;
for (const name of Object.keys(api.MOODS)) assert.equal(settingsApi.get(name).planetType, 'off', 'Giant planets must be optional and disabled by default');
assert.equal(U.uPlanetType.value, 0);
const savedPlanets = Object.fromEntries(Object.keys(api.MOODS).map(name => [name, { planetType: 'near-rings', planetSize: 62, planetAzimuth: 133, planetElevation: 24, planetBrightness: 1.1, ringTilt: -67 }]));
const reentered = fixture(JSON.stringify(savedPlanets));
for (const name of Object.keys(api.MOODS)) {
  reentered.switchMood(name);
  assert.equal(reentered.SKY_SETTINGS.get(name).planetType, 'off', 'Re-entering a page must hide saved planets in every mood');
  assert.equal(reentered.SKY_U.uPlanetType.value, 0, 'Saved opt-in planets must not render on boot or mood switches');
  assert.equal(reentered.SKY_SETTINGS.get(name).planetAzimuth, 133);
  assert.ok(Math.abs(reentered.SKY_U.uPlanetRadius.value - Math.sin(31 * Math.PI / 180)) < 1e-12, 'Saved planet geometry remains available when manually enabled again');
}
reentered.SKY_SETTINGS.set('night', 'planetType', 'near-rings'); reentered.switchMood('night');
assert.equal(reentered.SKY_U.uPlanetType.value, 3);
reentered.switchMood('morning'); assert.equal(reentered.SKY_U.uPlanetType.value, 0);
reentered.switchMood('night'); assert.equal(reentered.SKY_U.uPlanetType.value, 3, 'Manual choices persist across moods during the current visit');
const originalEnvironment = api.environment(), originalSun = U.uSunCol.value.clone();
assert.ok(settingsApi.get().sunDiameter < 0.9, 'Default twilight sun must have a restrained angular diameter');
assert.equal(U.uStarCount.value, 0);
assert.equal(settingsApi.set('golden', 'clouds', false), true); assert.equal(U.uCloud.value, 0);
settingsApi.set('golden', 'clouds', true); settingsApi.set('golden', 'cloudAmount', 0.83); assert.equal(U.uCloud.value, 0.83);
settingsApi.set('golden', 'sunDiameter', 1.2); assert.ok(Math.abs(U.uSunSize.value - (1 - Math.cos(1.2 * Math.PI / 360))) < 1e-12);
settingsApi.set('golden', 'sunBrightness', 0.8); assert.ok(U.uSunCol.value.r < originalSun.r);
let previousRedness = 0;
for (const redshift of [0, .2, .4, .6, .8, 1]) {
  settingsApi.set('golden', 'sunRedshift', redshift);
  const redness = U.uSunCol.value.r / U.uSunCol.value.g;
  assert.ok(redness > previousRedness, 'Redshift must change the real solar colour continuously'); previousRedness = redness;
}
assert.ok(U.uSunCol.value.r > U.uSunCol.value.g * 3);
settingsApi.set('golden', 'starCount', 1600); settingsApi.set('golden', 'starDensity', 1.7); settingsApi.set('golden', 'starBrightness', 2.1);
assert.equal(U.uStarCount.value, 1600); assert.equal(U.uStarDensity.value, 1.7); assert.equal(U.uStars.value, 2.1);
assert.equal(api.environment().exposure, originalEnvironment.exposure, 'Correcting solar radiance must not dim the whole scene with exposure');
assert.deepEqual(api.environment().fog.toArray(), originalEnvironment.fog.toArray(), 'Sky edits retain the mood fog colour balance');
assert.equal(api.ATM.sunCol.getHex(), api.MOODS.golden.sunCol, 'Overrides must not mutate the base mood');
api.flush(); assert.equal(api.refreshes(), 1, 'Slider changes must coalesce environment refreshes');

api.switchMood('night'); assert.equal(U.uStarCount.value, 1250); assert.equal(U.uSunCol.value.r, 0);
assert.ok(settingsApi.get('night').moonDiameter >= 3 && settingsApi.get('night').moonDiameter < 3.5, 'Restore the visible artistic disc inherited from the former moon');
assert.equal(settingsApi.get('night').moonHalo, .55); assert.equal(settingsApi.get('night').moonBrightness, .85);
assert.equal(U.uMoonHalo.value, .55); assert.equal(U.uMoonBrightness.value, .85);
assert.ok(U.uMoonRadius.value > .027 && U.uMoonRadius.value < .031);
for (const phase of [0, .18, .25, .38, .5, .62, .75, .82, 1]) { settingsApi.set('night', 'moonPhase', phase); assert.equal(U.uMoonPhase.value, phase); }
settingsApi.set('night', 'moonPhase', .5); assert.ok(U.uMoon.value > 0);
settingsApi.set('night', 'moonDiameter', 6.2); assert.ok(Math.abs(U.uMoonRadius.value - 2 * Math.sin(6.2 * Math.PI / 720)) < 1e-12);
settingsApi.set('night', 'moonHalo', 2.2); assert.equal(U.uMoonHalo.value, 2.2);
settingsApi.set('night', 'moonBrightness', .65); assert.equal(U.uMoonBrightness.value, .65);
settingsApi.set('night', 'starCount', 50000); settingsApi.set('night', 'starDensity', 8);
assert.equal(U.uStarCount.value, 2400); assert.equal(U.uStarDensity.value, 2);
assert.equal(settingsApi.set('night', 'starCount', NaN), false);
assert.equal(settingsApi.set('night', 'unsupported', 2), false);
api.switchMood('golden'); assert.equal(U.uCloud.value, 0.83); assert.equal(U.uStarCount.value, 1600);
settingsApi.reset(); assert.equal(U.uStarCount.value, 0); assert.equal(U.uCloud.value, api.MOODS.golden.cloud);
assert.equal(settingsApi.get('night').starCount, 2400, 'Reset must affect only the current mood');
const retrieved = settingsApi.get('night'); retrieved.starCount = 0; assert.equal(settingsApi.get('night').starCount, 2400);

const beforePlanetSun = U.uSunSize.value;
for (const [mode, index] of [['ice-rings', 1], ['gas-giant', 2], ['near-rings', 3]]) {
  settingsApi.set('golden', 'planetType', mode); assert.equal(U.uPlanetType.value, index);
  settingsApi.set('golden', 'planetSize', 62); settingsApi.set('golden', 'planetAzimuth', 133); settingsApi.set('golden', 'planetElevation', 24);
  settingsApi.set('golden', 'planetBrightness', 1.1); settingsApi.set('golden', 'ringTilt', -67);
  assert.ok(Math.abs(U.uPlanetRadius.value - Math.sin(31 * Math.PI / 180)) < 1e-12);
  assert.ok(Math.abs(U.uPlanetDir.value.length() - 1) < 1e-12);
  assert.ok(Math.abs(U.uPlanetDir.value.y - Math.sin(24 * Math.PI / 180)) < 1e-12);
  assert.equal(U.uPlanetBrightness.value, 1.1); assert.ok(Math.abs(U.uRingTilt.value + 67 * Math.PI / 180) < 1e-12);
  assert.equal(U.uSunSize.value, beforePlanetSun, 'Giant planet size must never alter the solar disc');
}
settingsApi.set('golden', 'planetSize', 500); settingsApi.set('golden', 'planetBrightness', 90); settingsApi.set('golden', 'ringTilt', -500);
assert.ok(U.uPlanetRadius.value < 1 && U.uPlanetRadius.value > 0.8); assert.equal(U.uPlanetBrightness.value, 1.5);
assert.ok(Math.abs(U.uRingTilt.value + 85 * Math.PI / 180) < 1e-12);
assert.equal(settingsApi.set('golden', 'planetType', 'unknown'), false);
api.switchMood('night'); assert.equal(U.uPlanetType.value, 0, 'Planet changes must remain isolated to their mood');
api.switchMood('golden'); assert.equal(U.uPlanetType.value, 3);
settingsApi.reset(); assert.equal(U.uPlanetType.value, 0);

for (const mood of ['morning', 'dusk']) {
  api.switchMood(mood); settingsApi.set(mood, 'sunMoon', true);
  assert.ok(U.uMoon.value > 0 && U.uSunCol.value.r > 0, 'Morning/dusk coexistence must enable both actual shader discs');
  assert.ok(U.uMoonDir.value.dot(U.uSunDir.value) < 0.2, 'Sun and moon must appear in separate regions of the sky');
}
const saved = api.saved(); assert.equal(saved.night.starCount, 2400); assert.equal(saved.golden.sunRedshift, 0);
const restored = fixture(JSON.stringify(saved)); restored.switchMood('night'); assert.equal(restored.SKY_U.uStarCount.value, 2400);
assert.equal(restored.SKY_U.uMoonPhase.value, .5); assert.equal(restored.SKY_U.uMoonHalo.value, 2.2); assert.equal(restored.SKY_U.uMoonBrightness.value, .65);
const migrated = fixture(JSON.stringify({ golden: { redSun: true }, night: { fullMoon: true } }));
assert.equal(migrated.SKY_SETTINGS.get('golden').sunRedshift, 1); assert.equal(migrated.SKY_SETTINGS.get('night').moonPhase, .5);
assert.equal('redSun' in migrated.SKY_SETTINGS.get('golden'), false); assert.equal('fullMoon' in migrated.SKY_SETTINGS.get('night'), false);
assert.equal(Object.keys(settingsApi.get()).length, 19);
assert.ok(fixture('{broken').logs.some(log => log.level === 'warn'));
const failing = fixture('{}', true); failing.SKY_SETTINGS.set('golden', 'clouds', false); assert.ok(failing.logs.some(log => log.level === 'warn'));

const hg = (c, g) => (1 - g * g) / (4 * Math.PI * Math.pow(1 + g * g - 2 * g * c, 1.5));
let maxScatter = 0;
for (const mood of Object.values(api.MOODS)) for (let c = -1; c <= 1.00001; c += 0.005) {
  const phase = 0.08 + Math.min(hg(c, mood.vAniso) * 1.7, 0.7) + hg(c, -0.25) * 0.45;
  maxScatter = Math.max(maxScatter, phase * mood.vSunI); assert.ok(phase < 0.87);
}
assert.ok(maxScatter < 0.78, 'Solar scattering peak must remain bounded in all moods');
assert.match(atmo, /min\(hg\(cosT, uAniso\) \* 1\.7, 0\.7\)/);
assert.match(api.SKY_FS, /i < 4/); assert.doesNotMatch(api.SKY_FS, /for\s*\([^)]*uStar/);
assert.match(api.SKY_FS, /uStarCount \* uStarDensity \/ 25600\.0/);
assert.match(api.SKY_FS, /vec3 lunarSun = vec3\(sin\(phaseAngle\), 0\.0, -phaseCos\)/);
const moonShader = api.SKY_FS.slice(api.SKY_FS.indexOf('float moonCover'), api.SKY_FS.indexOf('// One bounded angular'));
assert.doesNotMatch(moonShader, /lunarSurface|craterSurface|\bn2\(|\bfbm\(|texture/, 'The reference-style moon disc must have a clean, noise-free surface');
assert.match(moonShader, /lunarRadiance\(incidence\)/);
assert.match(moonShader, /lunarHalo\(md, uMoonRadius, uMoonHalo\) \* uMoonBrightness/);
assert.match(moonShader, /\(1\.0 - phaseCos\) \* \(1\.0 - disc\)/, 'Halo must fade with phase and remain outside the disc');
assert.match(api.SKY_FS, /0\.03 \* \(1\.0 - moonCover\)/, 'Screen-space sky grain must not texture the clean moon disc');
assert.doesNotMatch(api.SKY_FS, /uMoonFull/);
// Execute the scalar GLSL helpers themselves; a separate copy of the
// lighting equations would miss regressions to their actual shader values.
function scalarSkyFunction(name) {
  const match = api.SKY_FS.match(new RegExp(`float ${name}\\(([^)]*)\\)\\s*\\{([^}]+)\\}`));
  assert.ok(match, `Missing shader function ${name}`);
  const parameters = match[1].split(',').map(p => p.trim().split(/\s+/).at(-1));
  const body = match[2].replace(/\bfloat\s+/g, 'const ').replace(/\b(max|sqrt|exp)\(/g, 'Math.$1(');
  const run = new Function(...parameters, 'smoothstep', body);
  const smoothstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  return (...values) => run(...values, smoothstep);
}
const lunarRadiance = scalarSkyFunction('lunarRadiance'), lunarHalo = scalarSkyFunction('lunarHalo');
const lunarTint = moonShader.match(/vec3 moonCol = vec3\(([^)]+)\)/)[1].split(',').map(Number);
const defaultNight = fixture().SKY_SETTINGS.get('night'), moonWeight = api.MOODS.night.moon;
const bloomThreshold = Number(atmo.match(/const bloom = new UnrealBloomPass\([^;]*,\s*([\d.]+)\);/)[1]);
const moonPeak = Math.max(...lunarTint) * lunarRadiance(1) * moonWeight * defaultNight.moonBrightness;
assert.ok(moonPeak < bloomThreshold, 'The default full moon must not become a saturated bloom source');
assert.ok(lunarRadiance(.02) > lunarRadiance(1) * .8, 'A lit lunar limb retains the reference disc rather than deep sphere shading');
assert.ok(lunarRadiance(-.02) < lunarRadiance(1) * .01, 'The unlit face must remain dark');
for (let incidence = -1, previous = -1; incidence <= 1.00001; incidence += .002) {
  const value = lunarRadiance(incidence); assert.ok(Number.isFinite(value) && value >= previous); previous = value;
}
const moonRadius = 2 * Math.sin(defaultNight.moonDiameter * Math.PI / 720);
const haloAt = multiples => lunarHalo(moonRadius * multiples, moonRadius, defaultNight.moonHalo) * moonWeight * defaultNight.moonBrightness;
assert.ok(haloAt(2) < .002 && haloAt(3) < .0001, 'The default halo must decay near the moon instead of washing out a large sky region');
assert.equal(lunarHalo(moonRadius, moonRadius, 0), 0, 'Zero halo disables the shader halo completely');
// Integrate the physically illuminated projected disc, independently of UI
// bindings. It must continuously wax to full and wane on the opposite side.
function projectedPhase(phase) {
  const a = phase * Math.PI * 2, lightX = Math.sin(a), lightZ = -Math.cos(a);
  let total = 0, illuminated = 0, centroid = 0;
  for (let j = -127; j <= 127; j++) for (let i = -127; i <= 127; i++) {
    const x = i / 128, y = j / 128, r2 = x * x + y * y; if (r2 >= 1) continue;
    total++;
    if (x * lightX + Math.sqrt(1 - r2) * lightZ > 1e-9) { illuminated++; centroid += x; }
  }
  return { fraction: illuminated / total, centroid: centroid / total };
}
let lastFraction = -1;
for (let phase = 0; phase <= .50001; phase += .025) {
  const result = projectedPhase(phase), expected = (1 - Math.cos(phase * Math.PI * 2)) / 2;
  assert.ok(Math.abs(result.fraction - expected) < .006, 'Lunar phase projected area must follow the physical cycle');
  assert.ok(result.fraction >= lastFraction); lastFraction = result.fraction;
}
assert.equal(projectedPhase(0).fraction, 0); assert.equal(projectedPhase(1).fraction, 0); assert.equal(projectedPhase(.5).fraction, 1);
assert.ok(projectedPhase(.25).centroid > 0 && projectedPhase(.75).centroid < 0);
const planetShader = api.SKY_FS.slice(api.SKY_FS.indexOf('vec3 giantPlanet'), api.SKY_FS.indexOf('void main'));
assert.doesNotMatch(planetShader, /\bfor\s*\(|texture2D|texture\(/, 'Planet rendering must use bounded analytic work without texture or raymarch loops');
assert.match(planetShader, /if \(uPlanetType < 0\.5\) return background/);
assert.match(planetShader, /sphereDistance, ringDistance/);
assert.match(planetShader, /stormUv/);
assert.match(planetShader, /atan\(bodyNormal.x, bodyNormal.z\) \+ uTime \* 0\.02/);
const whitePlanetShader = planetShader.match(/else if \(uPlanetType > 2\.5\) \{([\s\S]*?)\} else \{/)[1];
assert.doesNotMatch(whitePlanetShader, /craterSurface|\bn2\(|\bfbm\(|geology|powder|grains|\btexture(?:2D)?\s*\(/, 'White ring planets must use a smooth sphere without procedural spots');
assert.doesNotMatch(api.SKY_FS, /craterSurface/, 'Unused crater generation must be removed');
assert.match(whitePlanetShader, /surface = vec3\(/);
assert.match(planetShader, /uPlanetType > 2\.5 \? 0\.56 \+ 0\.44 \* sqrt\(lightSide\)/, 'The white sphere uses broad, gentle shading');
assert.match(planetShader, /fissures/);
assert.ok(api.SKY_FS.indexOf('col = giantPlanet') < api.SKY_FS.indexOf('if (uCloud'), 'Local clouds must pass in front of giant planets');
console.info(JSON.stringify({ independentMoods: 5, realUniformControls: 19, moonPhasePhysicalCycle: true, cleanReferenceMoonDisc: true, defaultMoonPeak: +moonPeak.toFixed(3), defaultMoonHaloAtTwoRadii: +haloAt(2).toFixed(5), legacyMoonDiameter: 3.2, continuousSunRedshift: true, optionalGiantPlanetModes: 3, rotatingProceduralPlanets: true, analyticPlanetWithoutExtraPasses: true, maxStarCandidates: 4800, boundedScatteringPeak: +maxScatter.toFixed(3), environmentRefreshesCoalesced: true, unchangedExposureAndFogColour: true }));
