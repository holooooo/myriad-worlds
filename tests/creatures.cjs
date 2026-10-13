const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const os = require('node:os');
(async () => {
  let modulePath = process.env.THREE_MODULE;
  if (!modulePath) {
    // Reuse an exact-version local cache; callers may supply an offline module.
    const cache = path.join(os.tmpdir(), 'sakura-assets-three171'); fs.mkdirSync(cache, { recursive: true });
    for (const name of ['three.module.js', 'three.core.js']) {
      const file = path.join(cache, name);
      if (!fs.existsSync(file)) {
        const response = await fetch('https://unpkg.com/three@0.171.0/build/' + name, { signal: AbortSignal.timeout(20000) });
        assert(response.ok, 'Cannot fetch Three.js fixture: ' + response.status);
        fs.writeFileSync(file, await response.text());
      }
    }
    fs.writeFileSync(path.join(cache, 'package.json'), '{"type":"module"}');
    modulePath = path.join(cache, 'three.module.js');
  }
  const THREE = await import(pathToFileURL(modulePath));
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', '23_unit_assets.js'), 'utf8');
  const build = vm.runInNewContext(source + '\nbuildBuffalo;', { THREE, boxGeo: new THREE.BoxGeometry(1,1,1), foliageGeo: new THREE.IcosahedronGeometry(0.65,0) });
  const template = new THREE.Group(); build(template); template.updateMatrixWorld(true);
  const parts = ['buffalo-body', 'buffalo-shoulder', 'buffalo-neck', 'buffalo-head', 'buffalo-muzzle', 'buffalo-nose', 'buffalo-tail-tuft'];
  for (const name of parts) assert(template.getObjectByName(name), 'Missing anatomical part: ' + name);
  assert.equal(template.userData.legs.length, 4);
  assert(template.userData.tail.isGroup, 'Tail must rotate from the rump');
  const bounds = new THREE.Box3().setFromObject(template), size = bounds.getSize(new THREE.Vector3());
  assert(bounds.min.y > -0.06 && bounds.min.y < 0.12, 'Hooves must meet ground level');
  assert(size.x > 1.9 && size.z > 3.0 && size.y > 2.0, 'Buffalo has incomplete body/horn silhouette');
  assert.equal(template.children.filter(c => c.name === 'buffalo-head').length, 1);
  let triangles = 0, meshes = 0;
  template.traverse(o => {
    if (!o.isMesh) return;
    assert(o.geometry.attributes.position.array.every(Number.isFinite));
    assert(o.matrixWorld.elements.every(Number.isFinite));
    triangles += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; meshes++;
  });
  assert(triangles < 10000, 'Creature geometry exceeds shared-template budget');
  // Match wildlife's real cloning and reference-restoration contract.
  template.userData.legs.forEach((l,i) => { l.name = 'leg-' + i; }); template.userData.tail.name = 'tail'; template.userData = {};
  const clone = template.clone();
  const legs = [0,1,2,3].map(i => clone.getObjectByName('leg-' + i)), tail = clone.getObjectByName('tail');
  assert(legs.every(l => l && l.isGroup)); assert(tail && tail.isGroup);
  legs.forEach((l,i) => { l.rotation.x = i % 2 ? -0.4 : 0.4; }); tail.rotation.y = 0.3;
  clone.updateMatrixWorld(true);
  assert.equal(template.getObjectByName('leg-0').rotation.x, 0, 'Clone gait mutated its shared template');
  const templateBody = template.getObjectByName('buffalo-body'), cloneBody = clone.getObjectByName('buffalo-body');
  assert.equal(templateBody.geometry, cloneBody.geometry); assert.equal(templateBody.material, cloneBody.material);
  console.info(JSON.stringify({ three: THREE.REVISION, meshes, triangles, size: size.toArray(), legs: legs.length, independentCloneGait: true }));
})().catch(e => { console.error(e); process.exitCode=1; });
