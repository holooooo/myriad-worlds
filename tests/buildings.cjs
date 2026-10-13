const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'world.manifest.json')));
// Test-only exposure of pure asset builders, inside the worker generator's
// closure. Production exports and deterministic generation stay unchanged.
let source = manifest.generator.map(p => fs.readFileSync(path.join(root, 'src', p), 'utf8')).join('\n');
source = source.replace('  setSeed, setTheme,', '  castle, teahouse, buildShanshuiStructure, setSeed, setTheme,');
const GEN = vm.runInNewContext(source + '\nGEN;');
function facts() {
  let count = 0; const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const [kind, b] of Object.entries(GEN.kit.b)) {
    const m = b.m.out(), c = b.c.out();
    assert(m.every(Number.isFinite) && c.every(Number.isFinite), 'Non-finite ' + kind + ' mesh');
    assert.equal(c.length, m.length / 16 * 3);
    for (let i = 0; i < m.length; i += 16) {
      const v = m.subarray(i, i + 16);
      const determinant = v[0] * (v[5] * v[10] - v[6] * v[9]) - v[4] * (v[1] * v[10] - v[2] * v[9]) + v[8] * (v[1] * v[6] - v[2] * v[5]);
      assert(determinant > 0, 'Collapsed/reflected ' + kind + ' part');
      for (let axis = 0; axis < 3; axis++) {
        const half = (Math.abs(v[axis]) + Math.abs(v[axis + 4]) + Math.abs(v[axis + 8])) * 0.5;
        min[axis] = Math.min(min[axis], v[axis + 12] - half); max[axis] = Math.max(max[axis], v[axis + 12] + half);
      }
      count++;
    }
  }
  assert.equal(GEN.kit.stack.length, 0, 'Unbalanced asset transform stack');
  return { count, min, max, signature: JSON.stringify(Object.fromEntries(Object.entries(GEN.kit.b).map(([k,b]) => [k, Array.from(b.m.out())]))) };
}
function build(type, lod, yaw = 0) {
  GEN.kit.reset(); GEN.kit.detail = [1, 0.45, 0.25, 0.16, 0.1][lod];
  if (type === 'castle' || type === 'teahouse') GEN[type](0, 0, 0, yaw);
  else assert(GEN.buildShanshuiStructure({ type, x: 0, z: 0, h: 0, yaw, seed: 42, r: type === 'palace' ? 60 : 13 }, lod));
  return facts();
}
let instances = 0; const report = {};
for (const [theme, types] of [['sakura', ['castle', 'teahouse']], ['shanshui', ['palace', 'chineseTeahouse']]]) {
  GEN.setTheme(theme); report[theme] = {};
  for (const type of types) {
    const near = build(type, 0), far = build(type, 4);
    assert.equal(build(type, 0).signature, near.signature, 'Asset changed without seed/layout change');
    assert(far.count < near.count, 'LOD failed to simplify ' + type);
    for (const axis of [0, 2]) {
      assert(Math.abs(near.min[axis] - far.min[axis]) < 0.8 && Math.abs(near.max[axis] - far.max[axis]) < 0.8, 'Distant asset footprint changed: ' + type);
    }
    assert(Math.abs(near.max[1] - far.max[1]) < 0.6, 'Distant asset skyline changed: ' + type);
    const expectedRadius = type === 'palace' ? 60 : type === 'castle' ? 27 : 13;
    for (let lod = 0; lod < 5; lod++) for (const yaw of [0, Math.PI / 4, Math.PI / 2]) {
      const f = build(type, lod, yaw); instances += f.count;
      assert(Math.max(Math.abs(f.min[0]), Math.abs(f.max[0]), Math.abs(f.min[2]), Math.abs(f.max[2])) <= expectedRadius, 'Asset exceeds pad/rail contract: ' + type);
    }
    assert(near.max[1] > (type === 'castle' ? 22 : type === 'palace' ? 13 : 7), 'Incomplete building massing: ' + type + ' height=' + near.max[1]);
    report[theme][type] = { near: near.count, far: far.count, height: near.max[1] };
  }
}
assert(instances > 1000);
console.info(JSON.stringify({ instances, report }));
