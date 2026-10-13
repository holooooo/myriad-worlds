// Moving settlement assets. Geometry/materials belong to cached templates;
// actor clones share them and keep only their transform/animation nodes.
const SETTLEMENT_ASSETS = (() => {
  const templates = new Map(), materials = new Map();
  const sphere = new THREE.IcosahedronGeometry(0.5, 1), cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
  const hatCone = new THREE.ConeGeometry(0.48, 0.18, 8), wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.11, 10);
  function material(hex, double = false) {
    const key = hex + ':' + double;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.87, side: double ? THREE.DoubleSide : THREE.FrontSide }));
    return materials.get(key);
  }
  function mesh(parent, geo, hex, size, pos, name = '', double = false) {
    const m = new THREE.Mesh(geo, material(hex, double)); m.scale.set(...size); m.position.set(...pos); m.name = name;
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (g, hex, size, pos, name = '') => mesh(g, boxGeo, hex, size, pos, name);
  function pivot(g, name, pos) { const p = new THREE.Group(); p.name = name; p.position.set(...pos); g.add(p); return p; }
  function canopy(w, d, rise) {
    const p = [], n = 8;
    for (let i = 0; i < n; i++) {
      const xa = (i / n - 0.5) * w, xb = ((i + 1) / n - 0.5) * w;
      const ya = Math.cos((i / n - 0.5) * Math.PI) * rise, yb = Math.cos(((i + 1) / n - 0.5) * Math.PI) * rise;
      p.push(xa, ya, -d / 2, xa, ya, d / 2, xb, yb, d / 2, xa, ya, -d / 2, xb, yb, d / 2, xb, yb, -d / 2);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.computeVertexNormals(); return geo;
  }
  function mergeStatic(group) {
    for (const child of group.children) if (child.isGroup) mergeStatic(child);
    const batches = new Map();
    for (const m of group.children) if (m.isMesh && !m.name) {
      if (!batches.has(m.material)) batches.set(m.material, []); batches.get(m.material).push(m);
    }
    for (const [mat, list] of batches) {
      if (list.length < 2) continue;
      const positions = [], normals = [], indices = [];
      const v = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
      for (const m of list) {
        m.updateMatrix(); normalMatrix.getNormalMatrix(m.matrix);
        const p = m.geometry.attributes.position, n = m.geometry.attributes.normal, base = positions.length / 3;
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(m.matrix); positions.push(v.x, v.y, v.z);
          v.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize(); normals.push(v.x, v.y, v.z);
        }
        const idx = m.geometry.index;
        for (let i = 0; i < (idx ? idx.count : p.count); i++) indices.push(base + (idx ? idx.getX(i) : i));
        group.remove(m);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); geo.setIndex(indices);
      const merged = new THREE.Mesh(geo, mat); merged.castShadow = merged.receiveShadow = true; group.add(merged);
    }
  }
  function resident(role, theme, equipment = true) {
    const chinese = theme === 'shanshui', g = new THREE.Group(), skin = 0xc9956c, dark = 0x303437;
    const cloth = role === 'official' ? chinese ? 0x594867 : 0x344658 : role === 'merchant' ? chinese ? 0x7b5d3d : 0x3b5960 : chinese ? 0x7a8564 : 0x60716c;
    mesh(g, sphere, skin, [0.28, 0.31, 0.27], [0, 1.49, 0.01]);
    box(g, cloth, [0.46, 0.55, 0.29], [0, 1.08, 0]);
    box(g, role === 'official' ? 0xbead68 : 0x8b7356, [0.47, 0.06, 0.31], [0, 0.88, 0]);
    box(g, skin, [0.04, 0.055, 0.05], [0, 1.46, 0.145]);
    for (const side of [-1, 1]) {
      box(g, dark, [0.022, 0.019, 0.015], [side * 0.065, 1.51, 0.14]);
      const arm = pivot(g, 'person-arm-' + (side < 0 ? 0 : 1), [side * 0.29, 1.28, 0]);
      box(arm, cloth, [role === 'official' ? 0.22 : 0.14, 0.36, 0.18], [0, -0.17, 0]); box(arm, skin, [0.1, 0.14, 0.11], [0, -0.4, 0]);
      const leg = pivot(g, 'person-leg-' + (side < 0 ? 0 : 1), [side * 0.13, 0.79, 0]);
      box(leg, cloth, [0.17, 0.64, 0.21], [0, -0.31, 0]); box(leg, dark, [0.18, 0.11, 0.29], [0, -0.74, 0.05]);
    }
    if (role === 'farmer') {
      mesh(g, hatCone, 0xb6a271, [1, 1, 1], [0, 1.69, 0]);
      if (equipment) {
        const basket = mesh(g, cylinder, 0x9b794e, [0.29, 0.44, 0.29], [0, 1.07, -0.29]); basket.rotation.x = -0.15;
        box(g, 0x766149, [0.05, 0.55, 0.05], [0.39, 0.83, 0]);
        box(g, 0x5a615c, [0.26, 0.05, 0.08], [0.4, 0.56, 0.06]);
      }
    } else if (role === 'official') {
      box(g, cloth, [0.5, 0.31, 0.34], [0, 0.78, 0]);
      box(g, dark, [0.29, 0.12, 0.27], [0, 1.69, 0]);
      if (chinese) for (const side of [-1, 1]) box(g, dark, [0.28, 0.045, 0.1], [side * 0.25, 1.72, -0.02]);
      else { box(g, dark, [0.11, 0.13, 0.11], [0, 1.78, -0.05]); box(g, 0x6a5841, [0.05, 0.05, 0.76], [-0.32, 0.84, -0.08]); }
      box(g, 0xc8b36e, [0.07, 0.16, 0.018], [0, 1.11, 0.158]);
    } else {
      box(g, chinese ? 0x403e36 : 0x263c49, [0.3, 0.46, 0.32], [0, 1.11, 0]);
      box(g, chinese ? 0x494135 : 0xc7b48d, [0.3, 0.09, 0.29], [0, 1.63, 0]);
      box(g, 0xb59162, [0.22, 0.26, 0.18], [-0.32, 0.86, -0.03]);
      const bundle = mesh(g, sphere, 0x936d4c, [0.42, 0.35, 0.31], [0, 1.1, -0.33]); bundle.rotation.z = 0.12;
    }
    g.userData = { eye: [0, 1.53, 0.17], width: 0.7, length: 0.7 }; mergeStatic(g); return g;
  }
  function draftAnimal(g, theme) {
    const ox = theme === 'sakura', coat = ox ? 0x615c50 : 0x805941, dark = 0x34332e;
    mesh(g, sphere, coat, [0.53, 0.65, 1.06], [0, 0.94, 2.7]);
    mesh(g, sphere, coat, [0.3, 0.42, 0.47], [0, 1.19, 3.35]);
    mesh(g, sphere, coat, [0.27, 0.2, 0.3], [0, 1.07, 3.61]);
    for (const side of [-1, 1]) {
      box(g, coat, [0.08, 0.23, 0.1], [side * 0.13, 1.54, 3.3]);
      box(g, dark, [0.035, 0.025, 0.02], [side * 0.14, 1.25, 3.52]);
      if (ox) { const horn = mesh(g, cylinder, 0xb8b29a, [0.065, 0.36, 0.065], [side * 0.3, 1.45, 3.27]); horn.rotation.z = -side * 0.8; }
      for (const sz of [-1, 1]) {
        const p = pivot(g, 'animal-leg-' + side + '-' + sz, [side * 0.18, 0.77, 2.7 + sz * 0.36]);
        mesh(p, cylinder, coat, [0.09, 0.65, 0.09], [0, -0.31, 0]); box(p, dark, [0.14, 0.13, 0.18], [0, -0.7, 0.03]);
      }
    }
    if (!ox) box(g, dark, [0.15, 0.23, 0.58], [0, 1.18, 3.01]);
    const tail = box(g, dark, [0.06, 0.62, 0.06], [0, 0.86, 2.1]); tail.rotation.x = 0.25;
    box(g, 0x372f24, [0.61, 0.065, 0.12], [0, 1.14, 3.0]);
  }
  function vehicle(kind, theme) {
    const chinese = theme === 'shanshui', g = new THREE.Group(), wood = 0x70533a, trim = chinese ? 0x943f32 : 0x3e4b49;
    if (kind === 'carriage') {
      box(g, wood, [1.55, 0.18, 2.22], [0, 0.64, 0]);
      for (const side of [-1, 1]) {
        box(g, wood, [0.08, 0.1, 3.15], [side * 0.55, 0.69, 2.0]);
        box(g, trim, [0.09, 1.21, 2.0], [side * 0.73, 1.38, -0.1]);
        for (const z of [-0.75, 0.75]) {
          const p = pivot(g, 'wheel-' + side + '-' + z, [side * 0.87, 0.43, z]);
          const w = mesh(p, wheelGeo, 0x443b31, [1, 1, 1], [0, 0, 0]); w.rotation.z = Math.PI / 2;
          for (let i = 0; i < 4; i++) { const spoke = box(p, 0x998362, [0.12, 0.035, 0.72], [0, 0, 0]); spoke.rotation.x = i * Math.PI / 4; }
        }
      }
      box(g, trim, [1.42, 1.2, 0.08], [0, 1.35, -1.04]);
      mesh(g, canopy(1.9, 2.6, 0.36), chinese ? 0x3f6269 : 0x9c8b65, [1, 1, 1], [0, 1.95, -0.12], '', true);
      const driver = resident('farmer', theme, false); driver.scale.setScalar(0.76); driver.position.set(0, 0.66, 0.76); g.add(driver);
      draftAnimal(g, theme); g.userData = { eye: [0, 1.85, 0.9], width: 1.96, length: 6.2, center: 1.3 };
    } else {
      box(g, wood, [1.1, 0.13, 1.45], [0, 0.74, 0]);
      for (const side of [-1, 1]) {
        box(g, wood, [0.075, 0.08, 4.5], [side * 0.71, 0.99, 0]);
        box(g, trim, [0.055, 1.08, 1.45], [side * 0.55, 1.33, 0]);
        for (const z of [-0.72, 0.72]) box(g, 0xc7ad78, [0.1, 1.17, 0.1], [side * 0.54, 1.36, z]);
      }
      for (const z of [-0.73, 0.73]) box(g, chinese ? 0x8b3c39 : 0xb2a080, [0.95, 1.02, 0.035], [0, 1.34, z]);
      mesh(g, canopy(1.6, 1.95, 0.28), chinese ? 0x563e43 : 0x667168, [1, 1, 1], [0, 1.92, 0], '', true);
      for (const side of [-1, 1]) for (const z of [-1.58, 1.58]) {
        const bearer = resident('farmer', theme, false); bearer.scale.setScalar(0.78); bearer.position.set(side * 0.8, 0, z);
        bearer.traverse(o => { if (o.name.startsWith('person-arm-')) o.rotation.x = -1.1; }); g.add(bearer);
      }
      g.userData = { eye: [0, 1.48, 0.25], width: 2.4, length: 4.8, center: 0 };
    }
    mergeStatic(g); return g;
  }
  function hull(w, l) {
    const stations = [[-0.5, 0.04], [-0.36, 0.79], [-0.12, 1], [0.18, 0.97], [0.38, 0.64], [0.5, 0.04]], p = [];
    const quad = (a, b, c, d) => p.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < stations.length - 1; i++) {
      const [za, wa] = stations[i], [zb, wb] = stations[i + 1];
      const al = [-w * wa / 2, 0.18, za * l], ar = [w * wa / 2, 0.18, za * l], bl = [-w * wb / 2, 0.18, zb * l], br = [w * wb / 2, 0.18, zb * l];
      const abl = [al[0] * 0.35, -0.34, al[2]], abr = [ar[0] * 0.35, -0.34, ar[2]], bbl = [bl[0] * 0.35, -0.34, bl[2]], bbr = [br[0] * 0.35, -0.34, br[2]];
      quad(al, abl, bbl, bl); quad(ar, br, bbr, abr); quad(al, bl, br, ar); quad(abl, abr, bbr, bbl);
    }
    for (const [i, reverse] of [[0, true], [stations.length - 1, false]]) {
      const [z, width] = stations[i], x = w * width / 2;
      const a = [-x, 0.18, z * l], b = [x, 0.18, z * l], c = [x * 0.35, -0.34, z * l], d = [-x * 0.35, -0.34, z * l];
      if (reverse) quad(d, c, b, a); else quad(a, b, c, d);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.computeVertexNormals(); return geo;
  }
  function sail(w, h, chinese) {
    const p = [], nx = 4, ny = 5;
    const at = (x, y) => [(x - 0.35) * w * (chinese ? 1 - y * 0.27 : 1), y * h, Math.sin(x * Math.PI) * Math.sin(y * Math.PI) * 0.26];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) p.push(...at(i / nx, j / ny), ...at((i + 1) / nx, j / ny), ...at((i + 1) / nx, (j + 1) / ny), ...at(i / nx, j / ny), ...at((i + 1) / nx, (j + 1) / ny), ...at(i / nx, (j + 1) / ny));
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.computeVertexNormals(); return geo;
  }
  function boat(kind, waterKind, theme) {
    const merchant = kind === 'merchantBoat', chinese = theme === 'shanshui', ocean = waterKind === 'ocean', river = waterKind === 'river';
    const w = merchant ? ocean ? 2.7 : river ? 1.65 : 2.05 : ocean ? 1.65 : river ? 1.08 : 1.35;
    const l = merchant ? ocean ? 9 : river ? 6.4 : 7.2 : ocean ? 5.8 : river ? 4.2 : 4.8;
    const g = new THREE.Group(), wood = chinese ? 0x6c513b : 0x7e674e;
    mesh(g, hull(w, l), wood, [1, 1, 1], [0, 0, 0], '', true);
    for (let i = 0; i < 5; i++) box(g, 0x9b8462, [w * 0.72, 0.022, 0.12], [0, 0.2, (i - 2) * l * 0.13]);
    if (merchant || chinese && river) {
      const cw = w * 0.79, cl = l * (merchant ? 0.33 : 0.37), z = -l * 0.17;
      for (const side of [-1, 1]) {
        box(g, 0x443f35, [0.06, 0.86, cl], [side * cw / 2, 0.65, z]);
        box(g, 0xc1ac79, [0.07, 0.22, cl * 0.7], [side * (cw / 2 + 0.01), 0.77, z]);
      }
      mesh(g, canopy(cw + 0.28, cl + 0.28, 0.3), chinese ? 0x384746 : 0x8e8b71, [1, 1, 1], [0, 1.1, z], '', true);
    } else {
      mesh(g, cylinder, 0xa28559, [0.46, 0.31, 0.46], [-w * 0.19, 0.38, -l * 0.1]);
      const net = mesh(g, new THREE.TorusGeometry(0.29, 0.018, 3, 8), 0x6a795f, [1, 1, 1], [w * 0.31, 0.5, -l * 0.14]); net.rotation.x = -0.65;
    }
    if (merchant) for (let i = 0; i < 3; i++) {
      box(g, i % 2 ? 0x8c744e : 0x75634a, [w * 0.42, 0.45, 0.48], [(i % 2 - 0.5) * w * 0.35, 0.43, l * 0.17 + i * 0.43]);
      box(g, 0xb69c69, [w * 0.44, 0.035, 0.51], [(i % 2 - 0.5) * w * 0.35, 0.47, l * 0.17 + i * 0.43]);
    }
    if (ocean || merchant && !river) {
      const h = merchant ? 4.6 : 3.1, sw = w * (chinese ? 1.4 : 1.25);
      mesh(g, cylinder, 0x60523d, [0.075, h + 0.65, 0.075], [0, h / 2 + 0.22, 0]);
      const cloth = mesh(g, sail(sw, h * 0.72, chinese), chinese ? 0xa46b48 : 0xd1c8a5, [1, 1, 1], [0, h * 0.24, 0], 'boat-sail', true);
      const rig = pivot(g, 'sail-rig', [0, h * 0.24, 0]);
      g.remove(cloth); cloth.position.set(0, 0, 0); rig.add(cloth);
      for (let i = 0; i <= 5; i++) box(rig, 0x67563d, [sw * (chinese ? 1 - i / 5 * 0.27 : 1), 0.025, 0.034], [sw * 0.15, h * 0.72 * i / 5, 0.015]);
    }
    for (const side of [-1, 1]) {
      const oar = pivot(g, 'boat-oar-' + side, [side * w * 0.42, 0.31, -l * 0.28]);
      const shaft = box(oar, 0x8f7a55, [0.035, 0.035, w * 1.2], [side * w * 0.23, 0, -w * 0.35]); shaft.rotation.y = side * 0.55;
      const blade = box(oar, 0x806d4d, [0.12, 0.035, 0.38], [side * w * 0.52, -0.035, -w * 0.92]); blade.rotation.y = side * 0.55;
    }
    const crew = resident('farmer', theme, false); crew.scale.setScalar(0.75); crew.position.set(0, 0.19, -l * 0.33); g.add(crew);
    g.userData = { eye: [0, 1.36, -l * 0.28], width: w, length: l, center: 0, waterKind };
    mergeStatic(g); return g;
  }
  function get(kind, theme, waterKind = 'river') {
    const key = theme + ':' + kind + ':' + waterKind;
    if (!templates.has(key)) {
      const template = ['farmer', 'merchant', 'official'].includes(kind) ? resident(kind, theme) : ['carriage', 'sedan'].includes(kind) ? vehicle(kind, theme) : boat(kind, waterKind, theme);
      templates.set(key, template);
    }
    return templates.get(key);
  }
  return { get };
})();
