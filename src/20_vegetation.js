// Shared, texture-free plant meshes: thin blades, branching panicles and
// hanging willow sprays. Each whole plant is one instance with a fixed root.
function buildGrassGeometry(kind) {
  const positions = [], colors = [];
  const tri = (a, b, c, shade) => {
    for (const p of [a, b, c]) { positions.push(...p); colors.push(shade, shade, shade); }
  };
  const ribbon = (points, width, angle, light = 1) => {
    const dx = Math.cos(angle) * width, dz = Math.sin(angle) * width;
    for (let j = 0; j < points.length - 1; j++) {
      const a = points[j], b = points[j + 1], taper = 1 - j / points.length;
      const al = [a[0] - dx * taper, a[1], a[2] - dz * taper], ar = [a[0] + dx * taper, a[1], a[2] + dz * taper];
      const bl = [b[0] - dx * (taper - 0.2), b[1], b[2] - dz * (taper - 0.2)], br = [b[0] + dx * (taper - 0.2), b[1], b[2] + dz * (taper - 0.2)];
      tri(al, ar, br, light * (0.58 + j * 0.16)); tri(al, br, bl, light * (0.58 + j * 0.16));
    }
  };
  if (kind === 'willow') {
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, x = Math.cos(a) * 0.13, z = Math.sin(a) * 0.13;
      ribbon([[0, 0, 0], [x, -0.32, z], [x * 1.6, -0.7, z * 1.6], [x * 1.3, -1, z * 1.3]], 0.035, a, 0.86 + i * 0.03);
    }
  } else {
    const tall = kind === 'reed' || kind === 'straw' || kind === 'cattail';
    const blades = tall ? 4 : 6;
    for (let i = 0; i < blades; i++) {
      const a = i * 2.399, h = (tall ? 0.55 : 0.68) + (i % 3) * 0.13, spread = tall ? 0.2 : 0.28;
      ribbon([[0, 0, 0], [Math.cos(a) * spread * 0.3, h * 0.45, Math.sin(a) * spread * 0.3], [Math.cos(a) * spread, h * 0.83, Math.sin(a) * spread], [Math.cos(a) * spread * 1.3, h, Math.sin(a) * spread * 1.3]], tall ? 0.022 : 0.033, a);
    }
    if (tall) {
      ribbon([[0, 0, 0], [0.02, 0.65, 0], [0.07, 1, 0.025]], 0.008, 0);
      if (kind === 'cattail') {
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI / 3;
          ribbon([[0.05, 0.81, 0.02], [0.07, 0.92, 0.025], [0.08, 1.08, 0.025]], 0.031, a, 0.44);
        }
      } else {
        for (let i = 0; i < 7; i++) {
          const a = i * 2.399, y = 0.82 + i * 0.026, w = 0.12 * (1 - i / 9);
          ribbon([[0.06, y, 0.02], [0.06 + Math.cos(a) * w, y + 0.06, 0.02 + Math.sin(a) * w], [0.08 + Math.cos(a) * w * 0.7, y + 0.11, 0.025 + Math.sin(a) * w * 0.7]], kind === 'straw' ? 0.027 : 0.02, a, 1.18);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}
function patchRootWind(mat, hanging = false) {
  chainCompile(mat, (sh) => {
    sh.uniforms.uTime = TIME_U; sh.uniforms.uSway = SWAY_U;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime, uSway;')
      .replace('#include <project_vertex>', `
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
          vec3 windRoot = (modelMatrix * instanceMatrix[3]).xyz;
          float windWeight = pow(clamp(${hanging ? '-position.y' : 'position.y'}, 0.0, 1.2), 2.0);
          float windWave = sin(uTime * 1.1 + windRoot.x * 0.075 + windRoot.z * 0.055) * 0.7 + sin(uTime * 2.7 + windRoot.x * 0.37) * 0.3;
          float windHeight = length(instanceMatrix[1].xyz);
          float windDistance = 1.0 - smoothstep(80.0, 150.0, distance(windRoot, cameraPosition));
          mvPosition.xz += vec2(0.85, 0.38) * windWave * windWeight * windHeight * 0.14 * uSway * windDistance;
        #endif
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
      `);
  }, hanging ? 'willow-root-wind' : 'plant-root-wind');
}
// Replace the chunky grass shader and add dedicated plant/material pools.
tuftMat.onBeforeCompile = () => {};
tuftMat.customProgramCacheKey = () => 'grass';
tuftMat.side = THREE.DoubleSide;
patchRootWind(tuftMat);
const PLANT_GEOS = Object.fromEntries(['reed', 'straw', 'rice', 'cattail', 'willow'].map(k => [k, buildGrassGeometry(k)]));
const foliageGeo = new THREE.IcosahedronGeometry(0.65, 0);
const needleGeo = new THREE.ConeGeometry(0.58, 1, 7, 1);
const stoneGeo = new THREE.IcosahedronGeometry(0.67, 0);
for (let L = 0; L < NL; L++) {
  const km = kitMats[L], pools = POOLS[L];
  for (const [name, geo] of Object.entries({ foliage: foliageGeo, needle: needleGeo, stone: stoneGeo, ...PLANT_GEOS })) {
    const plant = name in PLANT_GEOS;
    const mat = km[name] = new THREE.MeshStandardMaterial({ roughness: name === 'stone' ? 0.94 : 0.84, vertexColors: plant, side: plant ? THREE.DoubleSide : THREE.FrontSide, envMapIntensity: 0.28 });
    if (plant && L === 0) patchRootWind(mat, name === 'willow');
    else if (name === 'foliage' || name === 'needle') patchSway(mat, 0.025, false);
    const casts = L === 0 && !['rice', 'reed', 'straw', 'cattail'].includes(name);
    pools[name] = new Pool(geo, mat, plant ? (L === 0 ? 5000 : 256) : 5000, { cast: casts, noMirror: L >= 2 || plant && name !== 'willow' });
    if (plant && L === 0 && casts) {
      const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
      patchRootWind(depth, name === 'willow');
      pools[name].opt.depth = depth; pools[name].mesh.customDepthMaterial = depth;
    }
  }
}
