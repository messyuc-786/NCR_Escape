import * as THREE from '/js/vendor/three.module.js';
import { roadSegments } from '/js/roads/network.js';

const ASPHALT = 0x2b2f38;
const CURB = 0x50565f;
const GROUND = 0x0f2a1c;
const BUILDING_COLORS = [0x1c2536, 0x24304a, 0x1a2230, 0x2b3550, 0x182030];
const METRO_COLOR = 0x8a929e;

export const LIGHTING_MODES = {
  DAY: 'day',
  SUNSET: 'sunset',
  NIGHT: 'night',
};

/**
 * Builds the Cyber District scene: ground, roads (from roadSegments data), a flyover,
 * NCR metro viaduct line, overhead highway signs, streetlights, buildings with neon accents,
 * and returns colliders and lighting controller for carPhysics and day/night toggles.
 */
export function buildDistrict(scene) {
  const colliders = [];

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshStandardMaterial({ color: GROUND, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Roads
  for (const seg of roadSegments) {
    buildRoadSegment(scene, seg, colliders);
  }

  // Central intersection pad
  const intersection = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshStandardMaterial({
      color: ASPHALT,
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -5,
      polygonOffsetUnits: -5,
    })
  );
  intersection.rotation.x = -Math.PI / 2;
  intersection.position.set(0, 0.06, 40);
  scene.add(intersection);

  // Buildings lining the district
  const buildingSpecs = [
    { x: 40, z: -100, w: 22, h: 38, d: 22, neon: 0x00d4aa },
    { x: -40, z: -60, w: 18, h: 55, d: 18, neon: 0xff7a18 },
    { x: 45, z: -10, w: 20, h: 28, d: 20, neon: 0x38ef7d },
    { x: -110, z: 40, w: 20, h: 42, d: 26, neon: 0x00d4aa },
    { x: 110, z: 40, w: 26, h: 60, d: 20, neon: 0xff2d55 },
    { x: -40, z: 130, w: 24, h: 34, d: 24, neon: 0xf5a623 },
    { x: 45, z: 150, w: 22, h: 46, d: 22, neon: 0x00d4aa },
    { x: 90, z: -60, w: 18, h: 30, d: 18, neon: 0x50e3c2 },
  ];

  buildingSpecs.forEach((b, i) => {
    const color = BUILDING_COLORS[i % BUILDING_COLORS.length];
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(b.w, b.h, b.d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.15 })
    );
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.castShadow = true;
    scene.add(mesh);

    // Neon accent strip on top of building (Cyber NCR vibe)
    const neonMat = new THREE.MeshStandardMaterial({
      color: b.neon,
      emissive: b.neon,
      emissiveIntensity: 0.8,
    });
    const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.2, 0.6, b.d + 0.2), neonMat);
    neonStrip.position.set(b.x, b.h + 0.3, b.z);
    scene.add(neonStrip);

    colliders.push({
      minX: b.x - b.w / 2,
      maxX: b.x + b.w / 2,
      minZ: b.z - b.d / 2,
      maxZ: b.z + b.d / 2,
    });
  });

  // NCR Elevated Metro Rail Track & Viaduct Pillars (Running alongside Main Boulevard)
  buildMetroViaduct(scene);

  // Overhead Highway Signboards
  buildHighwaySigns(scene);

  // Streetlights
  buildStreetlights(scene);

  // Simple perimeter fence colliders so the car can't drive off into the void forever
  const bound = 400;
  colliders.push({ minX: -bound, maxX: -bound + 2, minZ: -bound, maxZ: bound });
  colliders.push({ minX: bound - 2, maxX: bound, minZ: -bound, maxZ: bound });
  colliders.push({ minX: -bound, maxX: bound, minZ: -bound, maxZ: -bound + 2 });
  colliders.push({ minX: -bound, maxX: bound, minZ: bound - 2, maxZ: bound });

  // Lighting setup with dynamic mode controller
  const hemi = new THREE.HemisphereLight(0xa8c0ff, 0x4a4436, 1.15);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0x8899bb, 0.65);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffd9a8, 1.5);
  sun.position.set(120, 180, -80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -250;
  sun.shadow.camera.right = 250;
  sun.shadow.camera.top = 250;
  sun.shadow.camera.bottom = -250;
  scene.add(sun);
  scene.fog = new THREE.Fog(0x2a3550, 260, 700);

  let currentMode = LIGHTING_MODES.DAY;

  function setDayNight(mode) {
    currentMode = mode;
    if (mode === LIGHTING_MODES.NIGHT) {
      scene.background = new THREE.Color(0x0a0e17);
      scene.fog.color = new THREE.Color(0x0a0e17);
      hemi.color.setHex(0x1a243b);
      hemi.groundColor.setHex(0x0d1117);
      hemi.intensity = 0.5;
      ambient.color.setHex(0x222d42);
      ambient.intensity = 0.4;
      sun.color.setHex(0x405580);
      sun.intensity = 0.4;
    } else if (mode === LIGHTING_MODES.SUNSET) {
      scene.background = new THREE.Color(0x3d2338);
      scene.fog.color = new THREE.Color(0x3d2338);
      hemi.color.setHex(0xff7a59);
      hemi.groundColor.setHex(0x2e1b28);
      hemi.intensity = 0.9;
      ambient.color.setHex(0x8a4b62);
      ambient.intensity = 0.6;
      sun.color.setHex(0xffaa44);
      sun.intensity = 1.3;
    } else {
      // Day
      scene.background = new THREE.Color(0x2a3550);
      scene.fog.color = new THREE.Color(0x2a3550);
      hemi.color.setHex(0xa8c0ff);
      hemi.groundColor.setHex(0x4a4436);
      hemi.intensity = 1.15;
      ambient.color.setHex(0x8899bb);
      ambient.intensity = 0.65;
      sun.color.setHex(0xffd9a8);
      sun.intensity = 1.5;
    }
  }

  return {
    colliders,
    setDayNight,
    getCurrentMode: () => currentMode,
  };
}

function buildRoadSegment(scene, seg, colliders) {
  const dx = seg.to.x - seg.from.x;
  const dz = seg.to.z - seg.from.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);
  const midX = (seg.from.x + seg.to.x) / 2;
  const midZ = (seg.from.z + seg.to.z) / 2;
  const lift = seg.liftHeight || 0;

  const roadMat = new THREE.MeshStandardMaterial({
    color: ASPHALT,
    roughness: 0.95,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(seg.width, length), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.rotation.z = -angle;
  road.position.set(midX, 0.05 + lift, midZ);
  road.receiveShadow = true;
  scene.add(road);

  // Road Lane Markings (White dashed centre line)
  if (seg.lanes >= 2 && !seg.elevated) {
    const dashCount = Math.floor(length / 8);
    const dashMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -6,
    });
    for (let i = 0; i < dashCount; i++) {
      const t = (i + 0.5) / dashCount;
      const px = seg.from.x + dx * t;
      const pz = seg.from.z + dz * t;
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 4.0), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.rotation.z = -angle;
      dash.position.set(px, 0.07, pz);
      scene.add(dash);
    }
  }

  // Curbs
  const curbMat = new THREE.MeshStandardMaterial({ color: CURB });
  for (const side of [-1, 1]) {
    const offset = (seg.width / 2 + 0.3) * side;
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, length), curbMat);
    curb.position.set(
      midX + Math.cos(angle) * offset,
      0.15 + lift,
      midZ - Math.sin(angle) * offset
    );
    curb.rotation.y = angle;
    scene.add(curb);
  }

  // Flyover support pillars if elevated
  if (lift > 0) {
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4a });
    for (let t = 0.15; t < 1; t += 0.3) {
      const px = seg.from.x + dx * t;
      const pz = seg.from.z + dz * t;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, lift, 12), pillarMat);
      pillar.position.set(px, lift / 2, pz);
      scene.add(pillar);
    }
  }
}

/**
 * Builds elevated NCR Metro viaduct line running alongside the main corridor.
 */
function buildMetroViaduct(scene) {
  const metroX = 18; // offset from Main Boulevard
  const height = 11;
  const length = 440;
  const pillarSpacing = 40;

  const concreteMat = new THREE.MeshStandardMaterial({ color: METRO_COLOR, roughness: 0.8 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x333b47, roughness: 0.5 });

  // Elevated track deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.2, length), concreteMat);
  deck.position.set(metroX, height, 0);
  scene.add(deck);

  // Twin rails
  for (const rx of [-1.4, 1.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, length), railMat);
    rail.position.set(metroX + rx, height + 0.75, 0);
    scene.add(rail);
  }

  // Support Viaduct Pillars
  for (let z = -200; z <= 200; z += pillarSpacing) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, height, 16), concreteMat);
    pillar.position.set(metroX, height / 2, z);
    scene.add(pillar);
  }
}

/**
 * Builds iconic green highway overhead signboards for NCR routes.
 */
function buildHighwaySigns(scene) {
  const signMat = new THREE.MeshStandardMaterial({
    color: 0x007a33, // Indian Highway Green
    roughness: 0.4,
  });
  const gantryMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });

  const signLocations = [
    { x: 0, z: -120, label: 'CYBER CITY / NH-48', dir: 'NORTH' },
    { x: 0, z: 100, label: 'NOIDA EXPWY / SECTOR 143', dir: 'SOUTH' },
  ];

  signLocations.forEach((s) => {
    // Overhead gantry arch
    const gantry = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.BoxGeometry(22, 0.5, 0.5), gantryMat);
    beam.position.set(0, 7.5, 0);
    gantry.add(beam);

    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7.5, 8), gantryMat);
    postL.position.set(-10.5, 3.75, 0);
    gantry.add(postL);

    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7.5, 8), gantryMat);
    postR.position.set(10.5, 3.75, 0);
    gantry.add(postR);

    // Green Signboard
    const board = new THREE.Mesh(new THREE.BoxGeometry(8.5, 2.2, 0.2), signMat);
    board.position.set(0, 7.5, 0.1);
    gantry.add(board);

    gantry.position.set(s.x, 0, s.z);
    scene.add(gantry);
  });
}

/**
 * Builds streetlight poles along the main routes.
 */
function buildStreetlights(scene) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff2cc,
    emissive: 0xffeedd,
    emissiveIntensity: 0.9,
  });

  const positions = [
    { x: 9.5, z: -160 }, { x: -9.5, z: -160 },
    { x: 9.5, z: -80 },  { x: -9.5, z: -80 },
    { x: 9.5, z: 0 },    { x: -9.5, z: 0 },
    { x: 9.5, z: 80 },   { x: -9.5, z: 80 },
    { x: 9.5, z: 160 },  { x: -9.5, z: 160 },
  ];

  positions.forEach((p) => {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.0, 8), poleMat);
    pole.position.y = 3.5;
    group.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.1), poleMat);
    arm.position.set(p.x > 0 ? -0.7 : 0.7, 6.9, 0);
    group.add(arm);

    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.3), bulbMat);
    bulb.position.set(p.x > 0 ? -1.3 : 1.3, 6.8, 0);
    group.add(bulb);

    group.position.set(p.x, 0, p.z);
    scene.add(group);
  });
}
