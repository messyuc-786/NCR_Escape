import * as THREE from '../vendor/three.module.js';
import { roadSegments } from '../roads/network.js';

const ASPHALT = 0x242831;
const CURB = 0x4a525d;
const GROUND = 0x112b1c;
const GOLF_GRASS = 0x1a4e2b;
const YAMUNA_WATER = 0x0e283e;
const METRO_COLOR = 0x7c8592;
const RED_SANDSTONE = 0x943d2c;

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

const roadMaterials = [];
const reflectionPlanes = [];

// Procedural Window Grid Canvas Texture Generator
function createWindowTexture(litColor = '#ffea9f', unlitColor = '#151d28', rows = 16, cols = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = unlitColor;
  ctx.fillRect(0, 0, 128, 256);

  const padX = 128 / cols;
  const padY = 256 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() > 0.35) {
        ctx.fillStyle = Math.random() > 0.3 ? litColor : '#88c9ff';
        ctx.fillRect(c * padX + 2, r * padY + 2, padX - 4, padY - 4);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const windowTexDay = createWindowTexture('#ffe8a3', '#1e293b');
const windowTexWarm = createWindowTexture('#ffd275', '#16202c');
const windowTexCyber = createWindowTexture('#00d4aa', '#0f172a');
const windowTexNoida = createWindowTexture('#ff9f43', '#1b2230', 20, 10);
const windowTexDelhi = createWindowTexture('#ffcc22', '#2c1e16', 12, 6);

/**
 * Builds the complete organic 4-Region NCR World with authentic Indian street culture,
 * lush vegetation, Gulmohar trees, Chai stalls, roadside Dhabas, Metro murals, and Aravalli mountain horizon.
 */
export function buildDistrict(scene) {
  const colliders = [];

  // 1. Distant Aravalli Mountain Ridge Horizon & Sky
  buildDistantHorizon(scene);
  buildStarrySky(scene);

  // 2. Main Ground Planes (Gurugram + Delhi + Noida + Sector 143)
  const groundNorth = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 1800),
    new THREE.MeshStandardMaterial({ color: GROUND, roughness: 0.95 })
  );
  groundNorth.rotation.x = -Math.PI / 2;
  groundNorth.position.set(0, 0, 0);
  groundNorth.receiveShadow = true;
  scene.add(groundNorth);

  const groundSouth = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 1800),
    new THREE.MeshStandardMaterial({ color: 0x0f2417, roughness: 0.95 })
  );
  groundSouth.rotation.x = -Math.PI / 2;
  groundSouth.position.set(0, 0, -1400);
  groundSouth.receiveShadow = true;
  scene.add(groundSouth);

  // Golf Course Green Belt Patch (East)
  const golfGrass = new THREE.Mesh(
    new THREE.PlaneGeometry(380, 420),
    new THREE.MeshStandardMaterial({ color: GOLF_GRASS, roughness: 0.85 })
  );
  golfGrass.rotation.x = -Math.PI / 2;
  golfGrass.position.set(280, 0.02, 190);
  golfGrass.receiveShadow = true;
  scene.add(golfGrass);

  // 3. Yamuna River Channel & Water Specular Mesh (z: -760 to -1060)
  const yamunaRiver = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 320),
    new THREE.MeshStandardMaterial({
      color: YAMUNA_WATER,
      roughness: 0.1,
      metalness: 0.85,
    })
  );
  yamunaRiver.rotation.x = -Math.PI / 2;
  yamunaRiver.position.set(0, 0.01, -910);
  scene.add(yamunaRiver);

  // 4. Road Network Meshes
  for (const seg of roadSegments) {
    buildRoadSegment(scene, seg, colliders);
  }

  // 5. District Architecture & Detailed Windowed Facades
  buildAllDistrictBuildings(scene, colliders);
  buildCyberSpirePlaza(scene, colliders);
  buildDelhiMonuments(scene, colliders);
  buildYamunaCableStayedBridge(scene);
  buildNoidaTechParks(scene, colliders);
  buildNoidaGatewaySpire(scene, colliders);
  buildSector143InnovationCenter(scene, colliders);

  // 6. Authentic Indian Street Culture & Roadside Details
  buildIndianStreetCulture(scene, colliders);
  buildDelhiBazaar(scene, colliders);

  // 7. Props: Metro Viaduct with Art Murals, Gantries, Streetlights, Organic Trees
  buildMetroViaduct(scene);
  buildHighwaySigns(scene);
  buildStreetlights(scene);
  buildLushIndianTrees(scene);
  buildUtilityPoles(scene);
  buildIndustrialSilos(scene, colliders);

  // 8. World Boundaries
  const boundX = 750;
  const minZ = -1900;
  const maxZ = 650;
  colliders.push({ minX: -boundX, maxX: -boundX + 3, minZ, maxZ });
  colliders.push({ minX: boundX - 3, maxX: boundX, minZ, maxZ });
  colliders.push({ minX: -boundX, maxX: boundX, minZ: maxZ - 3, maxZ });
  colliders.push({ minX: -boundX, maxX: boundX, minZ, maxZ: minZ + 3 });

  // 9. Dynamic Lighting Controller
  const hemi = new THREE.HemisphereLight(0xb2d0ff, 0x4f4939, 1.2);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0x8fa3c7, 0.7);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffe2b8, 1.6);
  sun.position.set(130, 240, -90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -500;
  sun.shadow.camera.right = 500;
  sun.shadow.camera.top = 500;
  sun.shadow.camera.bottom = -500;
  scene.add(sun);
  scene.fog = new THREE.Fog(0x354466, 320, 1150);

  let currentLighting = LIGHTING_MODES.DAY;

  function setDayNight(mode) {
    currentLighting = mode;
    if (mode === LIGHTING_MODES.NIGHT) {
      scene.background = new THREE.Color(0x0a0f1d);
      scene.fog.color = new THREE.Color(0x0a0f1d);
      hemi.color.setHex(0x1e2c4d);
      hemi.groundColor.setHex(0x0c121c);
      hemi.intensity = 0.55;
      ambient.color.setHex(0x283854);
      ambient.intensity = 0.45;
      sun.color.setHex(0x486499);
      sun.intensity = 0.4;

      reflectionPlanes.forEach((p) => {
        p.material.opacity = p.material.color.getHex() === 0xffcc44 ? 0.38 : 0.28;
      });
    } else if (mode === LIGHTING_MODES.SUNSET) {
      scene.background = new THREE.Color(0x4a2638);
      scene.fog.color = new THREE.Color(0x4a2638);
      hemi.color.setHex(0xff835a);
      hemi.groundColor.setHex(0x331c28);
      hemi.intensity = 0.95;
      ambient.color.setHex(0x995368);
      ambient.intensity = 0.65;
      sun.color.setHex(0xffb04a);
      sun.intensity = 1.4;

      reflectionPlanes.forEach((p) => {
        p.material.opacity = p.material.color.getHex() === 0xffcc44 ? 0.22 : 0.14;
      });
    } else {
      scene.background = new THREE.Color(0x354466);
      scene.fog.color = new THREE.Color(0x354466);
      hemi.color.setHex(0xb2d0ff);
      hemi.groundColor.setHex(0x4f4939);
      hemi.intensity = 1.2;
      ambient.color.setHex(0x8fa3c7);
      ambient.intensity = 0.7;
      sun.color.setHex(0xffe2b8);
      sun.intensity = 1.6;

      reflectionPlanes.forEach((p) => {
        p.material.opacity = 0.0;
      });
    }
  }

  function setWeatherMode(mode) {
    if (mode === 'rain') {
      roadMaterials.forEach((m) => {
        m.color.setHex(0x13151c); // Darker wet asphalt
        m.roughness = 0.15; // Slick reflective surface
        m.metalness = 0.55; // Specular wet highlights
      });
      reflectionPlanes.forEach((p) => {
        p.material.opacity = p.material.color.getHex() === 0xffcc44 ? 0.45 : 0.35;
      });
    } else {
      roadMaterials.forEach((m) => {
        m.color.setHex(ASPHALT);
        m.roughness = 0.95;
        m.metalness = 0.05;
      });
      if (currentLighting === LIGHTING_MODES.NIGHT) {
        reflectionPlanes.forEach((p) => {
          p.material.opacity = p.material.color.getHex() === 0xffcc44 ? 0.38 : 0.28;
        });
      } else if (currentLighting === LIGHTING_MODES.SUNSET) {
        reflectionPlanes.forEach((p) => {
          p.material.opacity = p.material.color.getHex() === 0xffcc44 ? 0.22 : 0.14;
        });
      } else {
        reflectionPlanes.forEach((p) => {
          p.material.opacity = 0.0;
        });
      }
    }
  }

  return {
    colliders,
    setDayNight,
    getCurrentMode: () => currentLighting,
    setWeatherMode,
  };
}

// --- Distant Aravalli Mountain Horizon ----------------------------------------
function buildDistantHorizon(scene) {
  const mtnMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.95,
    flatShading: true,
  });

  const numPeaks = 36;
  const radius = 820;

  for (let i = 0; i < numPeaks; i++) {
    const angle = (i / numPeaks) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 600;
    const height = 40 + Math.random() * 65;
    const width = 110 + Math.random() * 80;

    const cone = new THREE.Mesh(new THREE.ConeGeometry(width, height, 5), mtnMat);
    cone.position.set(x, height / 2 - 5, z);
    cone.rotation.y = Math.random() * Math.PI;
    scene.add(cone);
  }
}

// --- Starry Night Sky Dome ---------------------------------------------------
function buildStarrySky(scene) {
  const starCount = 350;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0) * 0.5; // Upper dome
    const r = 900;

    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 80;
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 600;
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2.2,
    transparent: true,
    opacity: 0.85,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
}

// --- Road Segment Construction ----------------------------------------------
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
  roadMaterials.push(roadMat);

  const road = new THREE.Mesh(new THREE.PlaneGeometry(seg.width, length), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.rotation.z = -angle;
  road.position.set(midX, 0.05 + lift, midZ);
  scene.add(road);

  // Sidewalk Curbs or Concrete Highway Barriers (Left & Right)
  const isBarrier = seg.id.includes('expressway') || seg.id.includes('boulevard') || seg.id.includes('bridge');
  const curbMat = new THREE.MeshStandardMaterial({ 
    color: isBarrier ? 0x8a94a6 : CURB, 
    roughness: isBarrier ? 0.75 : 0.9 
  });
  const curbThickness = isBarrier ? 0.95 : 0.8;
  const curbHeight = isBarrier ? 1.25 : 0.25;

  const perpX = Math.cos(angle) * (seg.width / 2 + curbThickness / 2);
  const perpZ = -Math.sin(angle) * (seg.width / 2 + curbThickness / 2);

  const curbL = new THREE.Mesh(new THREE.BoxGeometry(curbThickness, curbHeight, length), curbMat);
  curbL.position.set(midX - perpX, curbHeight / 2 + lift, midZ - perpZ);
  curbL.rotation.y = angle;
  scene.add(curbL);

  const curbR = new THREE.Mesh(new THREE.BoxGeometry(curbThickness, curbHeight, length), curbMat);
  curbR.position.set(midX + perpX, curbHeight / 2 + lift, midZ + perpZ);
  curbR.rotation.y = angle;
  scene.add(curbR);

  // If it's a barrier road (expressway/boulevard/bridge), add a center median guardrail divider barrier
  if (isBarrier) {
    const centerBarrierMat = new THREE.MeshStandardMaterial({ color: 0x718096, roughness: 0.6 });
    const centerBarrier = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.25, length), centerBarrierMat);
    centerBarrier.position.set(midX, 1.25 / 2 + lift, midZ);
    centerBarrier.rotation.y = angle;
    scene.add(centerBarrier);
  }

  // Road Markings (Solid Outer White Lines & Broken Yellow Median)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });

  const lineLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.2, length), lineMat);
  lineLeft.rotation.x = -Math.PI / 2;
  lineLeft.rotation.z = -angle;
  lineLeft.position.set(midX - perpX * 0.88, 0.07 + lift, midZ - perpZ * 0.88);
  scene.add(lineLeft);

  const lineRight = new THREE.Mesh(new THREE.PlaneGeometry(0.2, length), lineMat);
  lineRight.rotation.x = -Math.PI / 2;
  lineRight.rotation.z = -angle;
  lineRight.position.set(midX + perpX * 0.88, 0.07 + lift, midZ + perpZ * 0.88);
  scene.add(lineRight);

  // Center Dashed Yellow Median
  const dashCount = Math.floor(length / 9);
  for (let i = 0; i < dashCount; i++) {
    const t = (i + 0.5) / dashCount - 0.5;
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 4.5), yellowLineMat);
    dash.rotation.x = -Math.PI / 2;
    dash.rotation.z = -angle;
    dash.position.set(midX + dx * t, 0.07 + lift, midZ + dz * t);
    scene.add(dash);
  }
}

// --- District Architecture with Glowing Window Grids & Rooftop Details -------
function buildAllDistrictBuildings(scene, colliders) {
  const buildingSpecs = [
    // --- Cyber City Towers (Gurugram) ---
    { x: -50, z: -150, w: 26, h: 68, d: 24, color: 0x162232, neon: 0x00d4aa, type: 'glass' },
    { x: 50, z: -170, w: 28, h: 78, d: 26, color: 0x1a283c, neon: 0x4aa8ff, type: 'cyber' },
    { x: -48, z: -50, w: 24, h: 58, d: 24, color: 0x182436, neon: 0x00d4aa, type: 'glass' },
    { x: 48, z: -40, w: 26, h: 72, d: 28, color: 0x141f2e, neon: 0xff7a18, type: 'glass' },
    { x: -45, z: 60, w: 20, h: 48, d: 20, color: 0x1e2d42, neon: 0x38ef7d, type: 'cyber' },
    { x: 45, z: 150, w: 22, h: 52, d: 22, color: 0x1c293d, neon: 0x00d4aa, type: 'glass' },

    // --- Corporate Mile ---
    { x: 45, z: 270, w: 28, h: 82, d: 24, color: 0x18243b, neon: 0x00d4aa, type: 'cyber' },
    { x: -45, z: 310, w: 26, h: 88, d: 26, color: 0x141f33, neon: 0x4aa8ff, type: 'glass' },
    { x: 48, z: 390, w: 30, h: 94, d: 30, color: 0x1e2c45, neon: 0xff7a18, type: 'cyber' },
    { x: -48, z: 430, w: 28, h: 84, d: 28, color: 0x162238, neon: 0x00d4aa, type: 'glass' },

    // --- Golf Course Belt Residences ---
    { x: 260, z: 80, w: 24, h: 18, d: 24, color: 0x2d3a4f, neon: 0x38ef7d, type: 'residence' },
    { x: 340, z: 120, w: 26, h: 20, d: 22, color: 0x33445c, neon: 0x38ef7d, type: 'residence' },
    { x: 440, z: 180, w: 30, h: 24, d: 26, color: 0x2a384d, neon: 0x00d4aa, type: 'residence' },

    // --- Industrial Edge ---
    { x: -260, z: 80, w: 42, h: 18, d: 36, color: 0x3a3f4a, neon: 0xff7a18, type: 'industrial' },
    { x: -420, z: 120, w: 48, h: 20, d: 40, color: 0x333842, neon: 0xf5a623, type: 'industrial' },
    { x: -420, z: 220, w: 44, h: 18, d: 38, color: 0x3d434f, neon: 0xff7a18, type: 'industrial' },

    // --- Old Market & Residential Bazaar ---
    { x: 42, z: -290, w: 18, h: 26, d: 20, color: 0x4a3b32, neon: 0xffa040, type: 'residence' },
    { x: -42, z: -320, w: 16, h: 28, d: 18, color: 0x543e33, neon: 0xffdd55, type: 'residence' },
    { x: 44, z: -410, w: 20, h: 24, d: 22, color: 0x46372f, neon: 0xff7a18, type: 'residence' },
    { x: -44, z: -440, w: 18, h: 30, d: 20, color: 0x4e3c35, neon: 0xff5533, type: 'residence' },
  ];

  buildingSpecs.forEach((b) => {
    // Select Facade Texture
    let facadeMat;
    if (b.type === 'glass') {
      facadeMat = new THREE.MeshStandardMaterial({
        color: b.color,
        map: windowTexDay,
        roughness: 0.35,
        metalness: 0.65,
      });
    } else if (b.type === 'cyber') {
      facadeMat = new THREE.MeshStandardMaterial({
        color: b.color,
        map: windowTexCyber,
        roughness: 0.45,
        metalness: 0.55,
      });
    } else {
      facadeMat = new THREE.MeshStandardMaterial({
        color: b.color,
        map: windowTexWarm,
        roughness: 0.75,
        metalness: 0.15,
      });
    }

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), facadeMat);
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.castShadow = true;
    scene.add(mesh);

    // Glowing Rooftop Neon Frame
    const neonMat = new THREE.MeshStandardMaterial({
      color: b.neon,
      emissive: b.neon,
      emissiveIntensity: 0.85,
    });
    const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.4, 0.7, b.d + 0.4), neonMat);
    neonStrip.position.set(b.x, b.h + 0.35, b.z);
    scene.add(neonStrip);

    // Rooftop Props: Water Tank (Sintex) & AC Chillers
    buildRooftopProps(scene, b);

    colliders.push({
      minX: b.x - b.w / 2,
      maxX: b.x + b.w / 2,
      minZ: b.z - b.d / 2,
      maxZ: b.z + b.d / 2,
    });
  });
}

function buildRooftopProps(scene, b) {
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }); // Black Sintex tank
  const acMat = new THREE.MeshStandardMaterial({ color: 0x8892a0, roughness: 0.6 });

  // Black Water Tank
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.2, 8), tankMat);
  tank.position.set(b.x - b.w * 0.25, b.h + 1.2, b.z - b.d * 0.25);
  scene.add(tank);

  // AC Chiller Unit
  const chiller = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 2.0), acMat);
  chiller.position.set(b.x + b.w * 0.2, b.h + 0.8, b.z + b.d * 0.2);
  scene.add(chiller);

  // Rooftop Antenna Mast on tall towers
  if (b.h > 65) {
    const antennaMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 12, 6), tankMat);
    mast.position.set(b.x, b.h + 6, b.z);
    scene.add(mast);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), antennaMat);
    beacon.position.set(b.x, b.h + 12.2, b.z);
    scene.add(beacon);
  }
}

// --- Delhi Monuments & Heritage Structures -----------------------------------
function buildDelhiMonuments(scene, colliders) {
  // India Gate-inspired Heritage Arch at Delhi Central Vista (x: 0, z: -620)
  const archMat = new THREE.MeshStandardMaterial({ color: RED_SANDSTONE, roughness: 0.85 });
  const archGroup = new THREE.Group();

  const pLeft = new THREE.Mesh(new THREE.BoxGeometry(6, 24, 8), archMat);
  pLeft.position.set(-14, 12, 0);
  archGroup.add(pLeft);

  const pRight = new THREE.Mesh(new THREE.BoxGeometry(6, 24, 8), archMat);
  pRight.position.set(14, 12, 0);
  archGroup.add(pRight);

  const topLintel = new THREE.Mesh(new THREE.BoxGeometry(38, 8, 10), archMat);
  topLintel.position.set(0, 26, 0);
  archGroup.add(topLintel);

  archGroup.position.set(0, 0, -620);
  scene.add(archGroup);

  colliders.push({ minX: -17, maxX: -11, minZ: -624, maxZ: -616 });
  colliders.push({ minX: 11, maxX: 17, minZ: -624, maxZ: -616 });

  // Delhi Heritage Pavilions along Ring Road
  for (const x of [-160, 160]) {
    const pav = new THREE.Mesh(new THREE.CylinderGeometry(8, 10, 14, 8), archMat);
    pav.position.set(x, 7, -480);
    scene.add(pav);
    colliders.push({ minX: x - 8, maxX: x + 8, minZ: -488, maxZ: -472 });
  }
}

// --- Yamuna Cable-Stayed Bridge ---------------------------------------------
function buildYamunaCableStayedBridge(scene) {
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x5a6578, roughness: 0.5 });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0xc8d1dc, roughness: 0.3 });

  // Twin Bridge Cable Towers
  for (const z of [-840, -980]) {
    const towerL = new THREE.Mesh(new THREE.BoxGeometry(2.5, 44, 3.5), bridgeMat);
    towerL.position.set(-13, 22, z);
    scene.add(towerL);

    const towerR = new THREE.Mesh(new THREE.BoxGeometry(2.5, 44, 3.5), bridgeMat);
    towerR.position.set(13, 22, z);
    scene.add(towerR);

    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(28, 2.2, 2.5), bridgeMat);
    crossBeam.position.set(0, 38, z);
    scene.add(crossBeam);

    // Diagonal Stay Cables
    for (let k = -40; k <= 40; k += 20) {
      if (k === 0) continue;
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 32), cableMat);
      cable.position.set(k > 0 ? 8 : -8, 23, z + k * 0.8);
      cable.rotation.z = k > 0 ? 0.35 : -0.35;
      scene.add(cable);
    }
  }

  // Riverbank Ghat Stone Steps
  const ghatMat = new THREE.MeshStandardMaterial({ color: 0x6e5d4f, roughness: 0.9 });
  for (const z of [-755, -1065]) {
    const ghat = new THREE.Mesh(new THREE.BoxGeometry(80, 1.2, 12), ghatMat);
    ghat.position.set(0, 0.6, z);
    scene.add(ghat);
  }

  // City light reflections on the water (Step 9)
  const reflectionMat = new THREE.MeshBasicMaterial({
    color: 0xffcc44,
    transparent: true,
    opacity: 0.0, // Fades in at sunset/night
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const reflectionMatBlue = new THREE.MeshBasicMaterial({
    color: 0x44a8ff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const reflectionCoords = [
    { x: -140, z: -910, w: 22, d: 290, mat: reflectionMat },
    { x: -50, z: -910, w: 18, d: 290, mat: reflectionMatBlue },
    { x: 50, z: -910, w: 18, d: 290, mat: reflectionMat },
    { x: 140, z: -910, w: 22, d: 290, mat: reflectionMatBlue }
  ];

  reflectionCoords.forEach((rf) => {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(rf.w, rf.d), rf.mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(rf.x, 0.015, rf.z);
    scene.add(plane);
    reflectionPlanes.push(plane);
  });
}

// --- Noida Expressway Tech Parks & Sector 143 ---------------------------------
function buildNoidaTechParks(scene, colliders) {
  const noidaBuildings = [
    { x: 50, z: -1120, w: 32, h: 76, d: 28, color: 0x1b2838, neon: 0x00d4aa },
    { x: -50, z: -1180, w: 30, h: 84, d: 30, color: 0x152230, neon: 0x4aa8ff },
    { x: 55, z: -1300, w: 34, h: 92, d: 32, color: 0x1e2c40, neon: 0xff7a18 },
    { x: -55, z: -1360, w: 36, h: 98, d: 34, color: 0x182436, neon: 0x38ef7d },
    { x: 180, z: -1240, w: 40, h: 68, d: 36, color: 0x223249, neon: 0xf5a623 },
    { x: -180, z: -1240, w: 42, h: 70, d: 38, color: 0x1d2a3d, neon: 0x00d4aa },
  ];

  noidaBuildings.forEach((b) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(b.w, b.h, b.d),
      new THREE.MeshStandardMaterial({
        color: b.color,
        map: windowTexDay,
        roughness: 0.4,
        metalness: 0.6,
      })
    );
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.castShadow = true;
    scene.add(mesh);

    const neonMat = new THREE.MeshStandardMaterial({
      color: b.neon,
      emissive: b.neon,
      emissiveIntensity: 0.85,
    });
    const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.4, 0.7, b.d + 0.4), neonMat);
    neonStrip.position.set(b.x, b.h + 0.35, b.z);
    scene.add(neonStrip);

    buildRooftopProps(scene, b);

    colliders.push({
      minX: b.x - b.w / 2,
      maxX: b.x + b.w / 2,
      minZ: b.z - b.d / 2,
      maxZ: b.z + b.d / 2,
    });
  });
}

function buildSector143InnovationCenter(scene, colliders) {
  const centerMat = new THREE.MeshStandardMaterial({
    color: 0x1a2638,
    map: windowTexCyber,
    roughness: 0.3,
    metalness: 0.7,
  });

  const domeMat = new THREE.MeshStandardMaterial({
    color: 0x00d4aa,
    emissive: 0x00a880,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.8,
  });

  const hubGroup = new THREE.Group();

  const mainBase = new THREE.Mesh(new THREE.CylinderGeometry(28, 34, 18, 16), centerMat);
  mainBase.position.set(0, 9, 0);
  hubGroup.add(mainBase);

  const glassDome = new THREE.Mesh(new THREE.SphereGeometry(18, 16, 12), domeMat);
  glassDome.position.set(0, 18, 0);
  hubGroup.add(glassDome);

  hubGroup.position.set(0, 0, -1700);
  scene.add(hubGroup);

  colliders.push({ minX: -30, maxX: 30, minZ: -1730, maxZ: -1670 });
}

// --- Authentic Indian Roadside Culture ---------------------------------------
function buildIndianStreetCulture(scene, colliders) {
  // 1. Roadside Chai Tapri (Tea Stalls)
  const chaiLocations = [
    { x: -16, z: -210 },
    { x: 16, z: 70 },
    { x: -18, z: -380 },
    { x: 18, z: -1190 },
  ];

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const tarpMat = new THREE.MeshStandardMaterial({ color: 0x0077b6, roughness: 0.7 }); // Blue Indian tarpaulin
  const kettleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 }); // Brass kettle

  chaiLocations.forEach((loc) => {
    const stall = new THREE.Group();

    // Wooden Table
    const table = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 1.8), woodMat);
    table.position.set(0, 0.55, 0);
    stall.add(table);

    // Blue Tarpaulin Canopy
    const tarp = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.1, 2.6), tarpMat);
    tarp.position.set(0, 2.6, 0);
    stall.add(tarp);

    // Canopy Poles
    for (const px of [-1.8, 1.8]) {
      for (const pz of [-1.1, 1.1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), woodMat);
        pole.position.set(px, 1.3, pz);
        stall.add(pole);
      }
    }

    // Brass Chai Kettle
    const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.45, 8), kettleMat);
    kettle.position.set(0.4, 1.32, 0);
    stall.add(kettle);

    // Wooden Bench
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.6), woodMat);
    bench.position.set(0, 0.25, 1.6);
    stall.add(bench);

    stall.position.set(loc.x, 0, loc.z);
    scene.add(stall);

    colliders.push({ minX: loc.x - 2.5, maxX: loc.x + 2.5, minZ: loc.z - 2.0, maxZ: loc.z + 2.0 });
  });

  // 2. Green & Yellow Auto-Rickshaw Stand Props
  const rickshawMatGreen = new THREE.MeshStandardMaterial({ color: 0x007f3f, roughness: 0.5 });
  const rickshawMatYellow = new THREE.MeshStandardMaterial({ color: 0xffd000, roughness: 0.4 });
  const rickshawBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

  const rickshawSpots = [
    { x: -14, z: -110, rot: 0.2 },
    { x: 14, z: 210, rot: -0.15 },
    { x: -15, z: -460, rot: 0.1 },
    { x: 15, z: -1280, rot: -0.25 },
  ];

  rickshawSpots.forEach((r) => {
    const auto = new THREE.Group();

    // Lower Green Body
    const bodyLower = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 2.6), rickshawMatGreen);
    bodyLower.position.set(0, 0.65, 0);
    auto.add(bodyLower);

    // Upper Yellow Hood Canopy
    const bodyUpper = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 2.0), rickshawMatYellow);
    bodyUpper.position.set(0, 1.45, -0.2);
    auto.add(bodyUpper);

    // Black Wheels
    for (const wx of [-0.85, 0.85]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10), rickshawBlack);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.32, 0.6);
      auto.add(wheel);
    }
    const frontWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10), rickshawBlack);
    frontWheel.rotation.z = Math.PI / 2;
    frontWheel.position.set(0, 0.32, -0.9);
    auto.add(frontWheel);

    auto.position.set(r.x, 0, r.z);
    auto.rotation.y = r.rot;
    scene.add(auto);

    colliders.push({ minX: r.x - 1.2, maxX: r.x + 1.2, minZ: r.z - 1.6, maxZ: r.z + 1.6 });
  });

  // 3. Illuminated Street Transit Shelters (Bus Stops)
  const busStops = [
    { x: 13.5, z: -70 },
    { x: -13.5, z: 180 },
    { x: 14.5, z: -1320 },
  ];

  const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });
  const adMat = new THREE.MeshStandardMaterial({ color: 0xff7a18, emissive: 0xff5500, emissiveIntensity: 0.7 });

  busStops.forEach((b) => {
    const stop = new THREE.Group();

    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.15, 2.2), woodMat);
    roof.position.set(0, 2.8, 0);
    stop.add(roof);

    const backGlass = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.4, 0.08), glassMat);
    backGlass.position.set(0, 1.4, -1.0);
    stop.add(backGlass);

    const adPanel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.1), adMat);
    adPanel.position.set(1.9, 1.4, 0);
    stop.add(adPanel);

    stop.position.set(b.x, 0, b.z);
    scene.add(stop);

    colliders.push({ minX: b.x - 2.4, maxX: b.x + 2.4, minZ: b.z - 1.5, maxZ: b.z + 1.5 });
  });
}

// --- Lush Organic Indian Trees & Gulmohar Blooms ----------------------------
function buildLushIndianTrees(scene) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
  const neemLeafMat = new THREE.MeshStandardMaterial({ color: 0x226b35, roughness: 0.8 }); // Lush Green Neem
  const gulmoharFlowerMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.7 }); // Orange-Red Gulmohar
  const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x1f7a3f, roughness: 0.75 });

  const treePositions = [
    // Boulevard Trees (Central Median & Pavements)
    { x: -11, z: -200, type: 'gulmohar' },
    { x: 11, z: -160, type: 'neem' },
    { x: -11, z: -100, type: 'neem' },
    { x: 11, z: -30, type: 'gulmohar' },
    { x: -11, z: 40, type: 'neem' },
    { x: 11, z: 120, type: 'gulmohar' },
    { x: -11, z: 200, type: 'neem' },
    { x: 11, z: 280, type: 'gulmohar' },
    { x: -11, z: 360, type: 'neem' },

    // Delhi & Yamuna Approach Trees
    { x: -13, z: -520, type: 'neem' },
    { x: 13, z: -560, type: 'gulmohar' },
    { x: -14, z: -700, type: 'palm' },
    { x: 14, z: -730, type: 'palm' },

    // Noida Expressway Green Buffer
    { x: -15, z: -1120, type: 'palm' },
    { x: 15, z: -1160, type: 'gulmohar' },
    { x: -15, z: -1240, type: 'palm' },
    { x: 15, z: -1280, type: 'neem' },
    { x: -15, z: -1360, type: 'gulmohar' },
    { x: 15, z: -1420, type: 'palm' },
    { x: -14, z: -1520, type: 'neem' },
    { x: 14, z: -1600, type: 'gulmohar' },

    // Golf Course Cluster
    { x: 230, z: 60, type: 'neem' },
    { x: 270, z: 90, type: 'gulmohar' },
    { x: 310, z: 140, type: 'neem' },
    { x: 360, z: 170, type: 'gulmohar' },
    { x: 410, z: 210, type: 'neem' },
  ];

  treePositions.forEach((tp) => {
    const tree = new THREE.Group();

    if (tp.type === 'palm') {
      // Royal Palm Tree
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 9.5, 8), trunkMat);
      trunk.position.y = 4.75;
      trunk.rotation.z = 0.05;
      tree.add(trunk);

      for (let p = 0; p < 6; p++) {
        const frondAngle = (p / 6) * Math.PI * 2;
        const frond = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.8), palmLeafMat);
        frond.position.set(Math.cos(frondAngle) * 1.2, 9.2, Math.sin(frondAngle) * 1.2);
        frond.rotation.y = frondAngle;
        frond.rotation.z = -0.35;
        tree.add(frond);
      }
    } else {
      // Broad Shade Tree (Neem / Gulmohar)
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 6.5, 8), trunkMat);
      trunk.position.y = 3.25;
      tree.add(trunk);

      // Multi-Layer Organic Canopy
      const leafMat = tp.type === 'gulmohar' ? gulmoharFlowerMat : neemLeafMat;
      const canopy1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.8, 1), leafMat);
      canopy1.position.set(0, 7.2, 0);
      tree.add(canopy1);

      const canopy2 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 1), neemLeafMat);
      canopy2.position.set(1.2, 6.5, -0.6);
      tree.add(canopy2);

      const canopy3 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0, 1), leafMat);
      canopy3.position.set(-1.0, 6.4, 0.8);
      tree.add(canopy3);
    }

    const scale = 0.82 + Math.random() * 0.38;
    tree.scale.set(scale, scale, scale);
    tree.rotation.y = Math.random() * Math.PI * 2;
    tree.position.set(tp.x, 0, tp.z);
    scene.add(tree);
  });
}

// --- Industrial Storage Silos -----------------------------------------------
function buildIndustrialSilos(scene, colliders) {
  const siloMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.6, metalness: 0.4 });
  const siloPositions = [
    { x: -300, z: 120, r: 8, h: 26 },
    { x: -330, z: 150, r: 9, h: 30 },
    { x: -370, z: 180, r: 8, h: 28 },
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

// --- Metro Viaduct with Colorful Street Art Murals ---------------------------
function buildMetroViaduct(scene) {
  const metroX = 18;
  const height = 11;
  const length = 920;
  const pillarSpacing = 40;

  const concreteMat = new THREE.MeshStandardMaterial({ color: METRO_COLOR, roughness: 0.8 });
  const muralMat = new THREE.MeshStandardMaterial({ color: 0xff7a18, emissive: 0xd9480f, emissiveIntensity: 0.4 });
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

    // Colorful Delhi Metro Street Art Band around pillar base
    const mural = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 3.2, 16), muralMat);
    mural.position.set(metroX, 1.6, z);
    scene.add(mural);
  }
}

// --- Highway Gantries & Green Overhead Signs ---------------------------------
function buildHighwaySigns(scene) {
  const signMat = new THREE.MeshStandardMaterial({ color: 0x007a33, roughness: 0.4 });
  const gantryMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });

  const signLocations = [
    { x: 0, z: -120, label: 'CYBER CITY / NH-48' },
    { x: 0, z: 100, label: 'NOIDA EXPWY / SECTOR 143' },
    { x: 0, z: 320, label: 'CORPORATE MILE / TECH DISTRICT' },
    { x: 0, z: -320, label: 'OLD MARKET / DELHI RING ROAD' },
    { x: 0, z: -600, label: 'DELHI CENTRAL / INDIA GATE' },
    { x: 0, z: -880, label: 'YAMUNA EXPRESSWAY BRIDGE' },
    { x: 0, z: -1200, label: 'NOIDA EXPWY / SECTORS 62-143' },
    { x: 0, z: -1550, label: 'SECTOR 143 / TECHNOLOGY VALLEY' },
  ];

  signLocations.forEach((s) => {
    const gantry = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.BoxGeometry(26, 0.6, 0.6), gantryMat);
    beam.position.set(0, 8.5, 0);
    gantry.add(beam);

    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 8.5, 8), gantryMat);
    postL.position.set(-12.5, 4.25, 0);
    gantry.add(postL);

    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 8.5, 8), gantryMat);
    postR.position.set(12.5, 4.25, 0);
    gantry.add(postR);

    const board = new THREE.Mesh(new THREE.BoxGeometry(11.0, 2.4, 0.2), signMat);
    board.position.set(0, 8.5, 0.1);
    gantry.add(board);

    gantry.position.set(s.x, 0, s.z);
    scene.add(gantry);
  });
}

// --- Streetlamps with Warm Halogen Light Glow --------------------------------
function buildStreetlights(scene) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffea9f,
    emissive: 0xffd275,
    emissiveIntensity: 0.95,
  });

  const positions = [
    { x: 9.5, z: -400 }, { x: -9.5, z: -400 },
    { x: 9.5, z: -240 }, { x: -9.5, z: -240 },
    { x: 9.5, z: -80 },  { x: -9.5, z: -80 },
    { x: 9.5, z: 80 },   { x: -9.5, z: 80 },
    { x: 9.5, z: 240 },  { x: -9.5, z: 240 },
    { x: 9.5, z: 400 },  { x: -9.5, z: 400 },
    { x: 12, z: -680 },  { x: -12, z: -680 },
    { x: 13, z: -1150 }, { x: -13, z: -1150 },
    { x: 13, z: -1350 }, { x: -13, z: -1350 },
    { x: 12, z: -1580 }, { x: -12, z: -1580 },
  ];

  positions.forEach((p) => {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7.5, 8), poleMat);
    pole.position.y = 3.75;
    group.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), poleMat);
    arm.position.set(p.x > 0 ? -0.8 : 0.8, 7.4, 0);
    group.add(arm);

    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.3), bulbMat);
    bulb.position.set(p.x > 0 ? -1.4 : 1.4, 7.3, 0);
    group.add(bulb);

    group.position.set(p.x, 0, p.z);
    scene.add(group);
  });
}

function buildCyberSpirePlaza(scene, colliders) {
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0c1e30,
    map: windowTexCyber,
    roughness: 0.15,
    metalness: 0.85
  });

  const neonBlue = 0x00d4aa;
  const crownMat = new THREE.MeshStandardMaterial({
    color: neonBlue,
    emissive: neonBlue,
    emissiveIntensity: 1.2
  });

  const bridgeMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.4,
    metalness: 0.7
  });

  // Tower A (Left)
  const towerA = new THREE.Mesh(new THREE.BoxGeometry(16, 115, 16), glassMat);
  towerA.position.set(-132, 57.5, 0);
  towerA.castShadow = true;
  scene.add(towerA);

  // Tower B (Right)
  const towerB = new THREE.Mesh(new THREE.BoxGeometry(16, 115, 16), glassMat);
  towerB.position.set(-108, 57.5, 0);
  towerB.castShadow = true;
  scene.add(towerB);

  // High-Altitude Skybridge connecting Tower A and Tower B
  const skybridge = new THREE.Mesh(new THREE.BoxGeometry(10, 4.5, 4.0), bridgeMat);
  skybridge.position.set(-120, 85, 0);
  scene.add(skybridge);

  // Glowing skybridge outlines/windows
  const bridgeWindows = new THREE.Mesh(
    new THREE.BoxGeometry(9.8, 2.2, 4.2),
    crownMat
  );
  bridgeWindows.position.set(-120, 85, 0);
  scene.add(bridgeWindows);

  // Glowing Crowns
  const crownA = new THREE.Mesh(new THREE.BoxGeometry(16.5, 2.0, 16.5), crownMat);
  crownA.position.set(-132, 115.5, 0);
  scene.add(crownA);

  const crownB = new THREE.Mesh(new THREE.BoxGeometry(16.5, 2.0, 16.5), crownMat);
  crownB.position.set(-108, 115.5, 0);
  scene.add(crownB);

  // Large digital facade/ad board on Tower B facing Noida/Delhi direction (southward)
  const billboardBack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 36, 10), bridgeMat);
  billboardBack.position.set(-99.3, 75, 0);
  scene.add(billboardBack);

  const billboardFace = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 34, 9),
    new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00cc66,
      emissiveIntensity: 1.0,
      roughness: 0.1
    })
  );
  billboardFace.position.set(-99.1, 75, 0);
  scene.add(billboardFace);

  colliders.push({ minX: -140, maxX: -124, minZ: -8, maxZ: 8 });
  colliders.push({ minX: -116, maxX: -100, minZ: -8, maxZ: 8 });
}

function buildNoidaGatewaySpire(scene, colliders) {
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    map: windowTexNoida,
    roughness: 0.5,
    metalness: 0.5
  });

  const orangeBeacon = 0xff6b00;
  const beaconMat = new THREE.MeshStandardMaterial({
    color: orangeBeacon,
    emissive: orangeBeacon,
    emissiveIntensity: 1.3
  });

  // Base Tier
  const base = new THREE.Mesh(new THREE.BoxGeometry(26, 42, 26), concreteMat);
  base.position.set(-120, 21, -1250);
  base.castShadow = true;
  scene.add(base);

  // Mid Tier
  const mid = new THREE.Mesh(new THREE.BoxGeometry(20, 42, 20), concreteMat);
  mid.position.set(-120, 63, -1250);
  mid.castShadow = true;
  scene.add(mid);

  // Top Tier
  const top = new THREE.Mesh(new THREE.BoxGeometry(14, 42, 14), concreteMat);
  top.position.set(-120, 105, -1250);
  top.castShadow = true;
  scene.add(top);

  // Orange Glowing Beacon
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.6, 15, 8), beaconMat);
  beacon.position.set(-120, 131.5, -1250);
  scene.add(beacon);

  const crown = new THREE.Mesh(new THREE.BoxGeometry(14.5, 1.5, 14.5), beaconMat);
  crown.position.set(-120, 124.5, -1250);
  scene.add(crown);

  const signBack = new THREE.Mesh(
    new THREE.BoxGeometry(10, 4, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  );
  signBack.position.set(-106.8, 25, -1250);
  scene.add(signBack);

  const signText = new THREE.Mesh(
    new THREE.BoxGeometry(9.6, 3.2, 0.1),
    beaconMat
  );
  signText.position.set(-106.5, 25, -1250);
  scene.add(signText);

  colliders.push({ minX: -133, maxX: -107, minZ: -1263, maxZ: -1237 });
}

function buildDelhiBazaar(scene, colliders) {
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3e2b, roughness: 0.95 });
  const fabricColors = [0xe63946, 0x1d3557, 0x457b9d, 0x2a9d8f, 0xe9c46a];
  const goldLight = 0xffd166;
  const lanternMat = new THREE.MeshStandardMaterial({
    color: goldLight,
    emissive: goldLight,
    emissiveIntensity: 1.5
  });

  const shopLocations = [
    { x: -55, z: -340, rot: 0, title: 'DELHI SPICES' },
    { x: -35, z: -340, rot: 0, title: 'SWEET SHACK' },
    { x: 35, z: -340, rot: 0, title: 'AUTO SPARES' },
    { x: 55, z: -340, rot: 0, title: 'NCR TOYS' },
    { x: -75, z: -360, rot: Math.PI, title: 'CHAI CORNER' },
    { x: -25, z: -360, rot: Math.PI, title: 'TASTY KEBABS' },
    { x: 25, z: -360, rot: Math.PI, title: 'FRUIT CART' },
    { x: 75, z: -360, rot: Math.PI, title: 'SARI BAZAAR' },
  ];

  shopLocations.forEach((s, idx) => {
    const shop = new THREE.Group();

    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.2, 2.2), woodMat);
    counter.position.set(0, 0.6, 0);
    shop.add(counter);

    const color = fabricColors[idx % fabricColors.length];
    const awningMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.15, 2.8), awningMat);
    canopy.position.set(0, 2.5, 0);
    shop.add(canopy);

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x718096, roughness: 0.5 });
    for (const px of [-2.3, 2.3]) {
      for (const pz of [-1.2, 1.2]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6), ironMat);
        pole.position.set(px, 1.25, pz);
        shop.add(pole);
      }
    }

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), lanternMat);
    bulb.position.set(0, 2.1, 0.5);
    shop.add(bulb);

    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4), ironMat);
    cord.position.set(0, 2.35, 0.5);
    shop.add(cord);

    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.6, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
    );
    signBoard.position.set(0, 2.85, 1.1);
    shop.add(signBoard);

    shop.position.set(s.x, 0, s.z);
    shop.rotation.y = s.rot;
    scene.add(shop);

    colliders.push({ minX: s.x - 2.8, maxX: s.x + 2.8, minZ: s.z - 1.8, maxZ: s.z + 1.8 });
  });

  const scooterSpots = [
    { x: -45, z: -343, rot: 0.2 },
    { x: -43, z: -343, rot: -0.1 },
    { x: -15, z: -343, rot: 0.15 },
    { x: 12, z: -343, rot: -0.2 },
    { x: 45, z: -357, rot: Math.PI + 0.1 },
    { x: 48, z: -357, rot: Math.PI - 0.25 },
  ];

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });

  scooterSpots.forEach((spot) => {
    const scooter = new THREE.Group();

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.4), bodyMat);
    body.position.set(0, 0.45, 0);
    scooter.add(body);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.8), tireMat);
    seat.position.set(0, 0.8, -0.1);
    scooter.add(seat);

    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), tireMat);
    bar.position.set(0, 0.95, 0.4);
    scooter.add(bar);

    for (const wz of [-0.5, 0.5]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 8), tireMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.22, wz);
      scooter.add(wheel);
    }

    scooter.position.set(spot.x, 0, spot.z);
    scooter.rotation.y = spot.rot;
    scene.add(scooter);

    colliders.push({ minX: spot.x - 0.4, maxX: spot.x + 0.4, minZ: spot.z - 0.8, maxZ: spot.z + 0.8 });
  });
}

function buildUtilityPoles(scene) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a4f58, roughness: 0.8 });
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

  for (let z = -700; z <= -100; z += 65) {
    const groupL = new THREE.Group();
    const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 9.0, 6), poleMat);
    poleL.position.y = 4.5;
    groupL.add(poleL);

    const beamL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), beamMat);
    beamL.position.set(0, 8.5, 0);
    groupL.add(beamL);

    groupL.position.set(-14.5, 0, z);
    scene.add(groupL);

    const groupR = new THREE.Group();
    const poleR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 9.0, 6), poleMat);
    poleR.position.y = 4.5;
    groupR.add(poleR);

    const beamR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), beamMat);
    beamR.position.set(0, 8.5, 0);
    groupR.add(beamR);

    groupR.position.set(14.5, 0, z);
    scene.add(groupR);

    if (z > -700) {
      for (const offset of [-0.6, 0.6]) {
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 65.1), wireMat);
        wire.rotation.x = Math.PI / 2;
        wire.position.set(-14.5 + offset, 8.45, z - 32.5);
        scene.add(wire);
      }
      for (const offset of [-0.6, 0.6]) {
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 65.1), wireMat);
        wire.rotation.x = Math.PI / 2;
        wire.position.set(14.5 + offset, 8.45, z - 32.5);
        scene.add(wire);
      }
    }
  }
}
