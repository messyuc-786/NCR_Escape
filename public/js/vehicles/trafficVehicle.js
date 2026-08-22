import * as THREE from '/js/vendor/three.module.js';

// Original fictional civilian vehicle types for AI traffic. No real manufacturer names,
// logos, or copyrighted designs — simple low-poly silhouettes only.
// `footprint` is the AABB half-extent used for player<->traffic collision.

export const TRAFFIC_TYPES = [
  {
    id: 'commuter-hatch',
    weight: 0.4,                 // spawn probability weight
    speedScale: 0.85,            // fraction of the road's speed limit this type cruises at
    body: { w: 1.7, h: 0.6, d: 3.6 },
    cabin: { w: 1.4, h: 0.5, d: 1.7, z: -0.1 },
    colors: [0xc9ced6, 0x8e97a3, 0x5d6675, 0xb0483f],
    isTruck: false,
  },
  {
    id: 'city-sedan',
    weight: 0.32,
    speedScale: 0.95,
    body: { w: 1.8, h: 0.6, d: 4.3 },
    cabin: { w: 1.5, h: 0.48, d: 1.9, z: -0.2 },
    colors: [0x2f3b52, 0xdad5cc, 0x374a3d, 0x6b6f76],
    isTruck: false,
  },
  {
    id: 'three-wheeler',
    weight: 0.16,
    speedScale: 0.6,
    body: { w: 1.3, h: 0.75, d: 2.4 },
    cabin: { w: 1.2, h: 0.6, d: 1.3, z: -0.1 },
    colors: [0xf2c14b, 0xf2c14b, 0x3f7d4f],
    isTruck: false,
  },
  {
    id: 'goods-truck',
    weight: 0.12,
    speedScale: 0.55,
    body: { w: 2.3, h: 1.5, d: 6.6 },
    cabin: { w: 2.2, h: 0.9, d: 1.9, z: -2.2 },
    colors: [0x9b5a3c, 0x4a6f8a, 0xa8a093],
    isTruck: true,
  },
];

/** Weighted random pick, filtered by whether the road allows trucks. */
export function pickTrafficType(allowTrucks) {
  const pool = TRAFFIC_TYPES.filter((t) => allowTrucks || !t.isTruck);
  const total = pool.reduce((sum, t) => sum + t.weight, 0);
  let r = Math.random() * total;
  for (const t of pool) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return pool[pool.length - 1];
}

export function buildTrafficMesh(type) {
  const group = new THREE.Group();
  const color = type.colors[Math.floor(Math.random() * type.colors.length)];

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.15 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x11161d, roughness: 0.25, metalness: 0.6 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

  const b = type.body;
  const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), bodyMat);
  body.position.y = b.h / 2 + 0.34;
  body.castShadow = true;
  group.add(body);

  const c = type.cabin;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), glassMat);
  cabin.position.set(0, b.h + c.h / 2 + 0.34, c.z);
  cabin.castShadow = true;
  group.add(cabin);

  // Wheels
  const wheelR = type.isTruck ? 0.45 : 0.32;
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.26, 12);
  const wheelX = b.w / 2 - 0.1;
  const wheelZ = b.d / 2 - 0.9;
  for (const [wx, wz] of [[wheelX, wheelZ], [-wheelX, wheelZ], [wheelX, -wheelZ], [-wheelX, -wheelZ]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wheelR, wz);
    group.add(w);
  }

  // Rear light strip so traffic reads correctly at night from behind
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xcc2b2b, emissive: 0xcc2b2b, emissiveIntensity: 0.5,
  });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.85, 0.1, 0.07), tailMat);
  tail.position.set(0, b.h * 0.6 + 0.34, -b.d / 2 - 0.02);
  group.add(tail);

  return group;
}
