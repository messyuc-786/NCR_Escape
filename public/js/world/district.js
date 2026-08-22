import * as THREE from '/js/vendor/three.module.js';
import { roadSegments } from '/js/roads/network.js';

const ASPHALT = 0x2b2f38;
const CURB = 0x50565f;
const GROUND = 0x0f2a1c;
const GOLF_GRASS = 0x144023;
const METRO_COLOR = 0x8a929e;

export const LIGHTING_MODES = {
  DAY: 'day',
  SUNSET: 'sunset',
  NIGHT: 'night',
};

export const WEATHER_MODES = {
  CLEAR: 'clear',
  RAIN: 'rain',
  HAZE: 'haze',
};

/**
 * Builds the connected Region 1 world: Cyber District, Corporate Mile, Golf Course Belt,
 * Industrial Edge, Old Market, Metro line, trees, signage, streetlights, and weather controllers.
 */
export function buildDistrict(scene) {
  const colliders = [];

  // 1. Main Ground Plane
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    new THREE.MeshStandardMaterial({ color: GROUND, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Golf Course Green Belt Patch (East)
  const golfGrass = new THREE.Mesh(
    new THREE.PlaneGeometry(350, 400),
    new THREE.MeshStandardMaterial({ color: GOLF_GRASS, roughness: 0.9 })
  );
  golfGrass.rotation.x = -Math.PI / 2;
  golfGrass.position.set(280, 0.02, 190);
  golfGrass.receiveShadow = true;
  scene.add(golfGrass);

  // 2. Road Network Meshes
  for (const seg of roadSegments) {
    buildRoadSegment(scene, seg, colliders);
  }

  // 3. Buildings Across All Connected Districts
  buildAllDistrictBuildings(scene, colliders);

  // 4. District Props: Trees (Golf Belt), Silos (Industrial), Gantries (Highways), Metro Line
  buildMetroViaduct(scene);
  buildHighwaySigns(scene);
  buildStreetlights(scene);
  buildGolfTrees(scene);
  buildIndustrialSilos(scene, colliders);

  // 5. World Perimeter Boundaries
  const bound = 620;
  colliders.push({ minX: -bound, maxX: -bound + 3, minZ: -bound, maxZ: bound });
  colliders.push({ minX: bound - 3, maxX: bound, minZ: -bound, maxZ: bound });
  colliders.push({ minX: -bound, maxX: bound, minZ: -bound, maxZ: -bound + 3 });
  colliders.push({ minX: -bound, maxX: bound, minZ: bound - 3, maxZ: bound });

  // 6. Lighting Controller
  const hemi = new THREE.HemisphereLight(0xa8c0ff, 0x4a4436, 1.15);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0x8899bb, 0.65);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffd9a8, 1.5);
  sun.position.set(120, 220, -80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -400;
  sun.shadow.camera.right = 400;
  sun.shadow.camera.top = 400;
  sun.shadow.camera.bottom = -400;
  scene.add(sun);
  scene.fog = new THREE.Fog(0x2a3550, 300, 950);

  let currentLighting = LIGHTING_MODES.DAY;

  function setDayNight(mode) {
    currentLighting = mode;
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
    getCurrentMode: () => currentLighting,
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

  // Dashed lane dividers for multi-lane roads
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

  // Flyover support pillars
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
 * Builds architecture and towers across all 5 Region 1 districts.
 */
function buildAllDistrictBuildings(scene, colliders) {
  const buildingSpecs = [
    // --- Cyber District (Central) ---
    { x: 40, z: -100, w: 22, h: 42, d: 22, color: 0x1c2536, neon: 0x00d4aa },
    { x: -40, z: -60, w: 18, h: 55, d: 18, color: 0x24304a, neon: 0xff7a18 },
    { x: 45, z: -10, w: 20, h: 32, d: 20, color: 0x1a2230, neon: 0x38ef7d },
    { x: -110, z: 40, w: 20, h: 45, d: 26, color: 0x2b3550, neon: 0x00d4aa },
    { x: 110, z: 40, w: 26, h: 62, d: 20, color: 0x1c2536, neon: 0xff2d55 },
    { x: -40, z: 130, w: 24, h: 36, d: 24, color: 0x24304a, neon: 0xf5a623 },
    { x: 45, z: 150, w: 22, h: 50, d: 22, color: 0x1a2230, neon: 0x00d4aa },

    // --- Corporate Mile (North) ---
    { x: 45, z: 270, w: 28, h: 76, d: 24, color: 0x18243b, neon: 0x00d4aa },
    { x: -45, z: 310, w: 26, h: 84, d: 26, color: 0x141f33, neon: 0x4aa8ff },
    { x: 48, z: 390, w: 30, h: 90, d: 30, color: 0x1e2c45, neon: 0xff7a18 },
    { x: -48, z: 430, w: 28, h: 80, d: 28, color: 0x162238, neon: 0x00d4aa },
    { x: 180, z: 340, w: 34, h: 68, d: 26, color: 0x1f2e4a, neon: 0xf5a623 },

    // --- Golf Course Belt (East) ---
    { x: 260, z: 80, w: 24, h: 16, d: 24, color: 0x2d3a4f, neon: 0x38ef7d },
    { x: 340, z: 120, w: 26, h: 18, d: 22, color: 0x33445c, neon: 0x38ef7d },
    { x: 440, z: 180, w: 30, h: 22, d: 26, color: 0x2a384d, neon: 0x00d4aa },
    { x: 440, z: 280, w: 28, h: 20, d: 24, color: 0x28364a, neon: 0x38ef7d },

    // --- Industrial Edge (West) ---
    { x: -260, z: 80, w: 42, h: 18, d: 36, color: 0x3a3f4a, neon: 0xff7a18 },
    { x: -420, z: 120, w: 48, h: 20, d: 40, color: 0x333842, neon: 0xf5a623 },
    { x: -420, z: 220, w: 44, h: 18, d: 38, color: 0x3d434f, neon: 0xff7a18 },
    { x: -240, z: 280, w: 40, h: 16, d: 34, color: 0x383e49, neon: 0xff3d68 },

    // --- Old Market (South) ---
    { x: 42, z: -290, w: 18, h: 24, d: 20, color: 0x4a3b32, neon: 0xffa040 },
    { x: -42, z: -320, w: 16, h: 26, d: 18, color: 0x543e33, neon: 0xffdd55 },
    { x: 44, z: -410, w: 20, h: 22, d: 22, color: 0x46372f, neon: 0xff7a18 },
    { x: -44, z: -440, w: 18, h: 28, d: 20, color: 0x4e3c35, neon: 0xff5533 },
    { x: -110, z: -350, w: 22, h: 20, d: 20, color: 0x44352d, neon: 0xffa040 },
    { x: 110, z: -350, w: 24, h: 22, d: 22, color: 0x4d3b33, neon: 0xffd166 },
  ];

  buildingSpecs.forEach((b) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(b.w, b.h, b.d),
      new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.65, metalness: 0.15 })
    );
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.castShadow = true;
    scene.add(mesh);

    // Neon accent strip
    const neonMat = new THREE.MeshStandardMaterial({
      color: b.neon,
      emissive: b.neon,
      emissiveIntensity: 0.8,
    });
    const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.3, 0.6, b.d + 0.3), neonMat);
    neonStrip.position.set(b.x, b.h + 0.3, b.z);
    scene.add(neonStrip);

    colliders.push({
      minX: b.x - b.w / 2,
      maxX: b.x + b.w / 2,
      minZ: b.z - b.d / 2,
      maxZ: b.z + b.d / 2,
    });
  });
}

function buildGolfTrees(scene) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9 });
  const leavesMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 });

  const treePositions = [
    { x: 210, z: 60 }, { x: 230, z: 110 }, { x: 290, z: 50 },
    { x: 320, z: 90 }, { x: 350, z: 160 }, { x: 370, z: 220 },
    { x: 410, z: 110 }, { x: 420, z: 260 }, { x: 360, z: 300 },
  ];

  treePositions.forEach((pos) => {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3.5, 8), trunkMat);
    trunk.position.y = 1.75;
    group.add(trunk);

    const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.4, 5.0, 8), leavesMat);
    leaves.position.y = 5.2;
    group.add(leaves);

    group.position.set(pos.x, 0, pos.z);
    scene.add(group);
  });
}

function buildIndustrialSilos(scene, colliders) {
  const siloMat = new THREE.MeshStandardMaterial({ color: 0x7c8594, roughness: 0.4, metalness: 0.6 });
  const siloPositions = [
    { x: -310, z: 120, r: 4, h: 16 },
    { x: -310, z: 132, r: 4, h: 16 },
    { x: -310, z: 200, r: 5, h: 18 },
    { x: -310, z: 215, r: 5, h: 18 },
  ];

  siloPositions.forEach((s) => {
    const silo = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r, s.h, 16), siloMat);
    silo.position.set(s.x, s.h / 2, s.z);
    silo.castShadow = true;
    scene.add(silo);

    colliders.push({
      minX: s.x - s.r,
      maxX: s.x + s.r,
      minZ: s.z - s.r,
      maxZ: s.z + s.r,
    });
  });
}

function buildMetroViaduct(scene) {
  const metroX = 18;
  const height = 11;
  const length = 920;
  const pillarSpacing = 40;

  const concreteMat = new THREE.MeshStandardMaterial({ color: METRO_COLOR, roughness: 0.8 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x333b47, roughness: 0.5 });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.2, length), concreteMat);
  deck.position.set(metroX, height, 0);
  scene.add(deck);

  for (const rx of [-1.4, 1.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, length), railMat);
    rail.position.set(metroX + rx, height + 0.75, 0);
    scene.add(rail);
  }

  for (let z = -440; z <= 440; z += pillarSpacing) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, height, 16), concreteMat);
    pillar.position.set(metroX, height / 2, z);
    scene.add(pillar);
  }
}

function buildHighwaySigns(scene) {
  const signMat = new THREE.MeshStandardMaterial({
    color: 0x007a33,
    roughness: 0.4,
  });
  const gantryMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });

  const signLocations = [
    { x: 0, z: -120, label: 'CYBER CITY / NH-48' },
    { x: 0, z: 100, label: 'NOIDA EXPWY / SECTOR 143' },
    { x: 0, z: 320, label: 'CORPORATE MILE / TECH DISTRICT' },
    { x: 0, z: -320, label: 'OLD MARKET / DELHI RING ROAD' },
  ];

  signLocations.forEach((s) => {
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

    const board = new THREE.Mesh(new THREE.BoxGeometry(9.0, 2.2, 0.2), signMat);
    board.position.set(0, 7.5, 0.1);
    gantry.add(board);

    gantry.position.set(s.x, 0, s.z);
    scene.add(gantry);
  });
}

function buildStreetlights(scene) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff2cc,
    emissive: 0xffeedd,
    emissiveIntensity: 0.9,
  });

  const positions = [
    { x: 9.5, z: -400 }, { x: -9.5, z: -400 },
    { x: 9.5, z: -240 }, { x: -9.5, z: -240 },
    { x: 9.5, z: -80 },  { x: -9.5, z: -80 },
    { x: 9.5, z: 80 },   { x: -9.5, z: 80 },
    { x: 9.5, z: 240 },  { x: -9.5, z: 240 },
    { x: 9.5, z: 400 },  { x: -9.5, z: 400 },
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
