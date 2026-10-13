// Shared creature templates. Clones share geometry and materials.
function buildButterfly(g) {
  const m = new THREE.MeshBasicMaterial({ color: 0xf2e2c8, side: THREE.DoubleSide });
  const wl = new THREE.Group(), wr = new THREE.Group();
  const w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), m); w1.position.x = -0.11; wl.add(w1);
  const w2 = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), m); w2.position.x = 0.11; wr.add(w2);
  g.add(wl, wr); g.userData = { wl, wr, kind: 'butterfly' };
  g.scale.setScalar(1);
}
function buildSparrow(g) {
  const m = new THREE.MeshStandardMaterial({ color: 0x9a7a5a, roughness: 0.9 });
  const m2 = new THREE.MeshStandardMaterial({ color: 0x6a5238, roughness: 0.9 });
  const body = new THREE.Mesh(boxGeo, m); body.scale.set(0.16, 0.15, 0.28); g.add(body);
  const head = new THREE.Mesh(boxGeo, m2); head.scale.set(0.12, 0.12, 0.12); head.position.set(0, 0.08, 0.17); g.add(head);
  const tail = new THREE.Mesh(boxGeo, m2); tail.scale.set(0.1, 0.04, 0.16); tail.position.set(0, 0.02, -0.2); g.add(tail);
  const wl = new THREE.Group(), wr = new THREE.Group();
  const w1 = new THREE.Mesh(boxGeo, m2); w1.scale.set(0.3, 0.02, 0.14); w1.position.x = -0.15; wl.add(w1);
  const w2 = new THREE.Mesh(boxGeo, m2); w2.scale.set(0.3, 0.02, 0.14); w2.position.x = 0.15; wr.add(w2);
  g.add(wl, wr); g.userData = { wl, wr, kind: 'sparrow' };
}
function buildFox(g) {
  const orange = new THREE.MeshStandardMaterial({ color: 0xd06830, roughness: 0.85 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e0d4, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x30281e, roughness: 0.85 });
  const body = new THREE.Mesh(boxGeo, orange); body.scale.set(0.34, 0.3, 0.8); body.position.y = 0.42; g.add(body);
  const chest = new THREE.Mesh(boxGeo, white); chest.scale.set(0.22, 0.2, 0.3); chest.position.set(0, 0.38, 0.28); g.add(chest);
  const head = new THREE.Mesh(boxGeo, orange); head.scale.set(0.26, 0.24, 0.3); head.position.set(0, 0.62, 0.48); g.add(head);
  const snout = new THREE.Mesh(boxGeo, white); snout.scale.set(0.12, 0.1, 0.16); snout.position.set(0, 0.56, 0.66); g.add(snout);
  const nose = new THREE.Mesh(boxGeo, dark); nose.scale.set(0.06, 0.05, 0.05); nose.position.set(0, 0.58, 0.75); g.add(nose);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(boxGeo, dark); ear.scale.set(0.08, 0.16, 0.05); ear.position.set(sx * 0.1, 0.78, 0.46); g.add(ear);
  }
  const tail = new THREE.Mesh(boxGeo, orange); tail.scale.set(0.14, 0.14, 0.5); tail.position.set(0, 0.52, -0.6); g.add(tail);
  const tip = new THREE.Mesh(boxGeo, white); tip.scale.set(0.15, 0.15, 0.12); tip.position.set(0, 0.52, -0.85); g.add(tip);
  g.userData.legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const leg = new THREE.Mesh(boxGeo, dark); leg.scale.set(0.09, 0.3, 0.09); leg.position.set(sx * 0.12, 0.15, sz * 0.26); g.add(leg);
    g.userData.legs.push(leg);
  }
  g.userData.kind = 'fox';
}
function buildDeer(g) {
  const brown = new THREE.MeshStandardMaterial({ color: 0xa87848, roughness: 0.85 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xd8c8a8, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a2c1e, roughness: 0.85 });
  const body = new THREE.Mesh(boxGeo, brown); body.scale.set(0.44, 0.44, 1.0); body.position.y = 0.86; g.add(body);
  const belly = new THREE.Mesh(boxGeo, pale); belly.scale.set(0.34, 0.2, 0.8); belly.position.set(0, 0.68, 0); g.add(belly);
  const neck = new THREE.Mesh(boxGeo, brown); neck.scale.set(0.2, 0.5, 0.2); neck.position.set(0, 1.2, 0.42); g.add(neck);
  const head = new THREE.Mesh(boxGeo, brown); head.scale.set(0.22, 0.22, 0.36); head.position.set(0, 1.5, 0.52); g.add(head);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(boxGeo, brown); ear.scale.set(0.1, 0.12, 0.04); ear.position.set(sx * 0.13, 1.62, 0.46); g.add(ear);
    const antler = new THREE.Mesh(boxGeo, dark); antler.scale.set(0.05, 0.3, 0.05); antler.position.set(sx * 0.08, 1.72, 0.4); g.add(antler);
    const antl2 = new THREE.Mesh(boxGeo, dark); antl2.scale.set(0.05, 0.05, 0.18); antl2.position.set(sx * 0.08, 1.84, 0.46); g.add(antl2);
  }
  g.userData.legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const leg = new THREE.Mesh(boxGeo, dark); leg.scale.set(0.1, 0.66, 0.1); leg.position.set(sx * 0.16, 0.33, sz * 0.34); g.add(leg);
    g.userData.legs.push(leg);
  }
  g.userData.kind = 'deer';
}
function buildHawk(g) {
  const m = new THREE.MeshStandardMaterial({ color: 0x6a5240, roughness: 0.85 });
  const m2 = new THREE.MeshStandardMaterial({ color: 0xd8c8b0, roughness: 0.85 });
  const body = new THREE.Mesh(boxGeo, m); body.scale.set(0.24, 0.2, 0.5); g.add(body);
  const head = new THREE.Mesh(boxGeo, m2); head.scale.set(0.14, 0.12, 0.14); head.position.set(0, 0.06, 0.3); g.add(head);
  const wl = new THREE.Group(), wr = new THREE.Group();
  const w1 = new THREE.Mesh(boxGeo, m); w1.scale.set(0.9, 0.03, 0.3); w1.position.x = -0.45; wl.add(w1);
  const w2 = new THREE.Mesh(boxGeo, m); w2.scale.set(0.9, 0.03, 0.3); w2.position.x = 0.45; wr.add(w2);
  g.add(wl, wr); g.userData = { wl, wr, kind: 'hawk' };
  g.scale.setScalar(1.4);
}
function buildFish(g) {
  const silver = new THREE.MeshStandardMaterial({ color: 0xb1a378, roughness: 0.5, metalness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x4c655b, roughness: 0.65 });
  const body = new THREE.Mesh(foliageGeo, silver); body.scale.set(0.16, 0.2, 0.64); g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.25, 3), dark); tail.rotation.x = Math.PI / 2; tail.position.z = -0.43; g.add(tail);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.17, 3), dark); fin.position.y = 0.14; g.add(fin);
  g.userData = { kind: 'fish', tail };
}

function buildCrane(g) {
  const white = new THREE.MeshStandardMaterial({ color: 0xeee9dc, roughness: 0.8 });
  const black = new THREE.MeshStandardMaterial({ color: 0x242b2c, roughness: 0.8 });
  const red = new THREE.MeshStandardMaterial({ color: 0xa53c32, roughness: 0.75 });
  const ochre = new THREE.MeshStandardMaterial({ color: 0x967547, roughness: 0.75 });
  const part = (geo, mat, scale, position, parent = g) => {
    const m = new THREE.Mesh(geo, mat); m.scale.set(...scale); m.position.set(...position); parent.add(m); return m;
  };
  part(foliageGeo, white, [0.3, 0.29, 0.72], [0, 0, 0]);
  const neck = new THREE.CylinderGeometry(0.055, 0.09, 0.62, 5);
  const n = part(neck, white, [1, 1, 1], [0, 0.26, 0.44]); n.rotation.x = -0.45;
  part(foliageGeo, white, [0.115, 0.115, 0.2], [0, 0.55, 0.61]);
  part(foliageGeo, red, [0.072, 0.025, 0.09], [0, 0.65, 0.59]);
  const beak = part(new THREE.ConeGeometry(0.045, 0.34, 4), ochre, [1, 1, 1], [0, 0.53, 0.88]); beak.rotation.x = Math.PI / 2;
  const wl = new THREE.Group(), wr = new THREE.Group(); g.add(wl, wr);
  for (const [side, wing] of [[-1, wl], [1, wr]]) {
    part(foliageGeo, white, [0.75, 0.055, 0.42], [side * 0.56, 0, -0.02], wing);
    part(foliageGeo, black, [0.34, 0.042, 0.37], [side * 1.12, 0, -0.09], wing);
    const leg = part(new THREE.CylinderGeometry(0.018, 0.024, 0.66, 4), black, [1, 1, 1], [side * 0.1, -0.12, -0.62]); leg.rotation.x = 1.38;
  }
  part(foliageGeo, black, [0.11, 0.05, 0.3], [0, 0.02, -0.65]);
  g.userData = { kind: 'crane', wl, wr };
}

function buildBuffalo(g) {
  const slate = new THREE.MeshStandardMaterial({ color: 0x515b5b, roughness: 0.92, flatShading: true });
  const shoulder = new THREE.MeshStandardMaterial({ color: 0x465252, roughness: 0.93, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x273431, roughness: 0.94, flatShading: true });
  const horn = new THREE.MeshStandardMaterial({ color: 0xaaa898, roughness: 0.82, flatShading: true });
  const hoof = new THREE.MeshStandardMaterial({ color: 0x242b28, roughness: 0.95 });
  const ivory = new THREE.MeshStandardMaterial({ color: 0xb9bda9, roughness: 0.9 });
  const round = new THREE.SphereGeometry(1, 10, 7);
  const part = (geo, mat, scale, pos, name, parent = g) => {
    const m = new THREE.Mesh(geo, mat); m.scale.set(...scale); m.position.set(...pos); m.name = name || ''; parent.add(m); return m;
  };
  const segment = (a, b, ra, rb, mat, name, parent = g) => {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), d = bv.clone().sub(av);
    const m = part(new THREE.CylinderGeometry(rb, ra, d.length(), 6), mat, [1, 1, 1], av.add(bv).multiplyScalar(0.5).toArray(), name, parent);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
  };
  // Broad rib cage, lower belly and a muscular shoulder meet a tapered neck.
  part(round, slate, [0.66, 0.58, 1.12], [0, 1.17, -0.12], 'buffalo-body');
  part(round, shoulder, [0.58, 0.62, 0.55], [0, 1.24, 0.65], 'buffalo-shoulder');
  part(round, shoulder, [0.48, 0.42, 0.61], [0, 1.0, -0.42], 'buffalo-belly');
  const neck = part(round, shoulder, [0.4, 0.46, 0.61], [0, 1.19, 1.0], 'buffalo-neck'); neck.rotation.x = -0.2;
  const head = new THREE.Group(); head.position.set(0, 1.2, 1.44); head.name = 'buffalo-head'; g.add(head);
  part(round, slate, [0.34, 0.38, 0.42], [0, 0.14, 0.05], 'buffalo-skull', head);
  part(round, shoulder, [0.3, 0.22, 0.33], [0, -0.07, 0.39], 'buffalo-muzzle', head);
  part(round, dark, [0.29, 0.14, 0.13], [0, -0.055, 0.62], 'buffalo-nose', head);
  for (const side of [-1, 1]) {
    part(round, dark, [0.018, 0.026, 0.022], [side * 0.28, 0.24, 0.23], 'buffalo-eye-' + side, head);
    part(round, ivory, [0.006, 0.007, 0.008], [side * 0.297, 0.247, 0.237], '', head);
    part(round, hoof, [0.037, 0.023, 0.018], [side * 0.13, -0.05, 0.734], 'buffalo-nostril-' + side, head);
    const ear = part(round, shoulder, [0.31, 0.075, 0.14], [side * 0.44, 0.27, -0.06], 'buffalo-ear-' + side, head); ear.rotation.z = side * 0.15;
    part(round, slate, [0.22, 0.028, 0.09], [side * 0.48, 0.294, -0.052], '', head);
    // Wide crescent horns sweep out, back and upward from the skull.
    const points = [[side * 0.26, 0.43, -0.17], [side * 0.59, 0.43, -0.33], [side * 0.89, 0.54, -0.48], [side * 1.05, 0.78, -0.49], [side * 0.98, 0.96, -0.4]];
    for (let i = 0; i < points.length - 1; i++) segment(points[i], points[i + 1], 0.11 - i * 0.024, i === 3 ? 0.012 : 0.087 - i * 0.024, horn, 'buffalo-horn-' + side + '-' + i, head);
  }
  const legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    // Animation pivots at the hip, so hooves stay connected during each stride.
    const leg = new THREE.Group(); leg.position.set(sx * 0.46, 1.02, sz > 0 ? 0.68 : -0.91); g.add(leg); legs.push(leg);
    segment([0, 0, 0], [sx * 0.02, -0.48, sz * 0.08], 0.17, 0.11, shoulder, 'buffalo-upper-leg', leg);
    segment([sx * 0.02, -0.48, sz * 0.08], [0, -0.9, sz * 0.04], 0.11, 0.08, dark, 'buffalo-lower-leg', leg);
    part(round, hoof, [0.125, 0.105, 0.17], [0, -0.92, sz * 0.04 + 0.05], 'buffalo-hoof', leg);
  }
  const tail = new THREE.Group(); tail.position.set(0, 1.52, -1.19); tail.name = 'buffalo-tail-root'; g.add(tail);
  segment([0, 0, 0], [0.06, -0.42, -0.13], 0.047, 0.029, shoulder, 'buffalo-tail', tail);
  segment([0.06, -0.42, -0.13], [0.11, -0.86, -0.1], 0.029, 0.02, dark, '', tail);
  part(round, dark, [0.085, 0.17, 0.075], [0.11, -0.93, -0.1], 'buffalo-tail-tuft', tail);
  g.userData = { kind: 'buffalo', legs, tail, head };
}
