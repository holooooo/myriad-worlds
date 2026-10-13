// Stable logical chunk slots map to a dense GPU buffer. Covered, unloaded
// chunks submit no vertices; swapping the last live instance closes holes.
class Pool {
  constructor(geo, mat, cap, opt = {}) {
    this.geo = geo; this.mat = mat; this.cap = 0; this.top = 0; this.free = []; this.opt = opt; this.live = 0;
    this.visibleCount = 0; this.mesh = null;
    this.locations = new Int32Array(Math.max(cap, 256)).fill(-1);
    this.grow(Math.min(cap, 4096));
  }
  grow(cap) {
    const old = this.mesh, mesh = new THREE.InstancedMesh(this.geo, this.mat, cap);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = !!this.opt.cast; mesh.receiveShadow = this.opt.receive !== false;
    if (this.opt.depth) mesh.customDepthMaterial = this.opt.depth;
    mesh.count = this.visibleCount;
    const logical = new Int32Array(cap);
    if (old) {
      mesh.instanceMatrix.array.set(old.instanceMatrix.array.subarray(0, this.visibleCount * 16));
      mesh.instanceColor.array.set(old.instanceColor.array.subarray(0, this.visibleCount * 3));
      logical.set(this.logical.subarray(0, this.visibleCount));
      scene.remove(old); old.dispose(); HIDE_IN_MIRROR.delete(old);
    }
    if (this.opt.noMirror) HIDE_IN_MIRROR.add(mesh);
    this.logical = logical; this.mesh = mesh; this.cap = cap; scene.add(mesh);
  }
  reserveLogical(n) {
    if (n <= this.locations.length) return;
    const next = new Int32Array(Math.max(n, this.locations.length * 2)).fill(-1);
    next.set(this.locations); this.locations = next;
  }
  alloc(n) {
    this.live += n;
    for (let i = 0; i < this.free.length; i++) {
      const b = this.free[i];
      if (b[1] >= n) { const s = b[0]; b[0] += n; b[1] -= n; if (!b[1]) this.free.splice(i, 1); return s; }
    }
    const s = this.top; this.top += n; this.reserveLogical(this.top); return s;
  }
  upload(start, end, color = true) {
    if (end <= start) return;
    const M = this.mesh.instanceMatrix, Cc = this.mesh.instanceColor;
    M.addUpdateRange(start * 16, (end - start) * 16); M.needsUpdate = true;
    if (color) { Cc.addUpdateRange(start * 3, (end - start) * 3); Cc.needsUpdate = true; }
    this.mesh.count = this.visibleCount;
  }
  write(s, m, c) { this.rewrite(s, m.length / 16, m, c); }
  rewrite(s, n, m, c) {
    // Every hidden chunk normally appends as one contiguous typed-array copy.
    if (this.locations[s] < 0) {
      if (this.visibleCount + n > this.cap) this.grow(Math.max(this.cap * 2, this.visibleCount + n + 1024));
      const start = this.visibleCount;
      this.mesh.instanceMatrix.array.set(m, start * 16);
      this.mesh.instanceColor.array.set(c, start * 3);
      for (let i = 0; i < n; i++) { this.locations[s + i] = start + i; this.logical[start + i] = s + i; }
      this.visibleCount += n; this.upload(start, this.visibleCount); return;
    }
    const M = this.mesh.instanceMatrix.array, Cc = this.mesh.instanceColor.array;
    let low = this.visibleCount, high = 0;
    for (let i = 0; i < n; i++) {
      const dest = this.locations[s + i];
      M.set(m.subarray(i * 16, (i + 1) * 16), dest * 16);
      Cc.set(c.subarray(i * 3, (i + 1) * 3), dest * 3);
      low = Math.min(low, dest); high = Math.max(high, dest + 1);
    }
    this.upload(low, high);
  }
  clear(s, n) {
    const M = this.mesh.instanceMatrix.array, Cc = this.mesh.instanceColor.array;
    let low = this.visibleCount, high = 0;
    for (let i = 0; i < n; i++) {
      const dest = this.locations[s + i]; if (dest < 0) continue;
      const last = --this.visibleCount;
      if (dest !== last) {
        M.copyWithin(dest * 16, last * 16, (last + 1) * 16);
        Cc.copyWithin(dest * 3, last * 3, (last + 1) * 3);
        const moved = this.logical[last]; this.logical[dest] = moved; this.locations[moved] = dest;
        low = Math.min(low, dest); high = Math.max(high, dest + 1);
      }
      this.locations[s + i] = -1;
    }
    this.mesh.count = this.visibleCount;
    this.upload(low, Math.min(high, this.visibleCount));
  }
  release(s, n) {
    this.clear(s, n); this.live -= n;
    this.free.push([s, n]); this.free.sort((a, b) => a[0] - b[0]);
    for (let i = this.free.length - 1; i > 0; i--) {
      const a = this.free[i - 1], b = this.free[i];
      if (a[0] + a[1] === b[0]) { a[1] += b[1]; this.free.splice(i, 1); }
    }
    while (this.free.length) {
      const b = this.free.at(-1); if (b[0] + b[1] !== this.top) break;
      this.top = b[0]; this.free.pop();
    }
  }
}
const POOLS = [];
for (let li = 0; li < NL; li++) {
  const P = {}, base = li === 0 ? 1 : 0.5;
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
