import * as THREE from '/js/vendor/three.module.js';

// Original fictional vehicle lineup for NCR ESCAPE (spec §9).
// No copyrighted designs, real manufacturer names, or logos.
// Stats feed carPhysics.js directly to ensure upgrades and vehicle choices create genuine physical differences.

export const VEHICLE_CATALOGUE = {
  'vantra-rs': {
    id: 'vantra-rs',
    name: 'Vantra RS',
    category: 'Street Hatchback',
    description: 'Agile, responsive starter hatchback tuned for tight NCR urban corners.',
    price: 0,
    unlockedByDefault: true,
    topSpeed: 62,       // m/s (~223 km/h)
    acceleration: 26,    // m/s^2
    braking: 34,         // m/s^2
    handling: 2.6,        // radians/sec turn agility
    grip: 0.92,            // 0..1 lateral grip
    drift: 0.60,           // 0..1 oversteer factor
    weight: 1150,          // kg
    defaultColor: 0xff7a18, // Cyber Orange
    bodyShape: 'hatchback',
  },
  'kaveri-gt': {
    id: 'kaveri-gt',
    name: 'Kaveri GT',
    category: 'Sport Coupe',
    description: 'Low-slung aerodynamic sports coupe built for Noida Expressway high-speed runs.',
    price: 2800,
    unlockedByDefault: false,
    topSpeed: 74,       // m/s (~266 km/h)
    acceleration: 31,
    braking: 38,
    handling: 2.85,
    grip: 0.94,
    drift: 0.72,
    weight: 1220,
    defaultColor: 0x00d4aa, // Noida Electric Teal
    bodyShape: 'coupe',
  },
  'garuda-rx': {
    id: 'garuda-rx',
    name: 'Garuda RX',
    category: 'Performance Muscle Sedan',
    description: 'High-torque rear-wheel powerhouse designed for aggressive drifting and heavy acceleration.',
    price: 4500,
    unlockedByDefault: false,
    topSpeed: 78,       // m/s (~280 km/h)
    acceleration: 35,
    braking: 36,
    handling: 2.50,
    grip: 0.88,
    drift: 0.85,
    weight: 1480,
    defaultColor: 0xd62828, // Delhi Crimson
    bodyShape: 'sedan',
  },
  'indus-cruiser': {
    id: 'indus-cruiser',
    name: 'Indus Cruiser',
    category: 'Urban Performance SUV',
    description: 'Heavy reinforced chassis with solid high-speed stability and rough-surface road dominance.',
    price: 3600,
    unlockedByDefault: false,
    topSpeed: 66,       // m/s (~237 km/h)
    acceleration: 28,
    braking: 32,
    handling: 2.30,
    grip: 0.95,
    drift: 0.45,
    weight: 1850,
    defaultColor: 0x1f4068, // Midnight Steel Blue
    bodyShape: 'suv',
  },
};

export const VANTRA_RS = VEHICLE_CATALOGUE['vantra-rs'];

export const AVAILABLE_PAINTS = [
  { id: 'orange', name: 'Cyber Orange', hex: 0xff7a18 },
  { id: 'teal', name: 'Noida Electric Teal', hex: 0x00d4aa },
  { id: 'crimson', name: 'Delhi Crimson', hex: 0xd62828 },
  { id: 'midnight', name: 'Gurugram Midnight', hex: 0x1a365d },
  { id: 'gold', name: 'Aravalli Gold', hex: 0xf5a623 },
  { id: 'silver', name: 'Silver Frost', hex: 0xe2e8f0 },
  { id: 'black', name: 'Stealth Phantom', hex: 0x111317 },
];

/**
 * Builds a 3D procedural vehicle mesh according to model geometry and custom paint.
 */
export function buildVehicleMesh(vehicleDef = VANTRA_RS, customColor = null) {
  const group = new THREE.Group();
  const colorHex = customColor !== null ? customColor : (vehicleDef.defaultColor || 0xff7a18);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.35,
    metalness: 0.45,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0d131a,
    roughness: 0.1,
    metalness: 0.85,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x181818,
    roughness: 0.7,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x0d0d0d,
    roughness: 0.8,
  });
  const headLightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff0dd,
    emissiveIntensity: 0.8,
  });
  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xff1e38,
    emissive: 0xff1e38,
    emissiveIntensity: 0.7,
  });

  const shape = vehicleDef.bodyShape || 'hatchback';

  let bodyWidth = 1.9, bodyHeight = 0.55, bodyLength = 4.2;
  let cabinWidth = 1.5, cabinHeight = 0.50, cabinLength = 2.0, cabinZ = -0.2, cabinY = 0.98;
  let wheelRadius = 0.34, wheelZ = 1.35;

  if (shape === 'coupe') {
    bodyWidth = 1.95; bodyHeight = 0.48; bodyLength = 4.4;
    cabinWidth = 1.45; cabinHeight = 0.44; cabinLength = 2.1; cabinZ = -0.1; cabinY = 0.88;
    wheelRadius = 0.35;
  } else if (shape === 'sedan') {
    bodyWidth = 1.92; bodyHeight = 0.54; bodyLength = 4.5;
    cabinWidth = 1.48; cabinHeight = 0.50; cabinLength = 2.3; cabinZ = -0.15; cabinY = 0.97;
    wheelRadius = 0.34;
  } else if (shape === 'suv') {
    bodyWidth = 2.05; bodyHeight = 0.68; bodyLength = 4.4;
    cabinWidth = 1.65; cabinHeight = 0.60; cabinLength = 2.4; cabinZ = -0.1; cabinY = 1.20;
    wheelRadius = 0.38;
  }

  // Main chassis
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength), bodyMat);
  body.position.y = bodyHeight;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength), glassMat);
  cabin.position.set(0, cabinY, cabinZ);
  cabin.castShadow = true;
  group.add(cabin);

  // Roof cap
  const roof = new THREE.Mesh(new THREE.BoxGeometry(cabinWidth - 0.05, 0.05, cabinLength - 0.2), bodyMat);
  roof.position.set(0, cabinY + cabinHeight / 2 + 0.02, cabinZ);
  roof.castShadow = true;
  group.add(roof);

  // Sports rear spoiler for coupe & muscle sedan
  if (shape === 'coupe' || shape === 'sedan') {
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
    const wing = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.85, 0.05, 0.35), wingMat);
    wing.position.set(0, bodyHeight + 0.35, -bodyLength / 2 + 0.3);
    wing.castShadow = true;
    group.add(wing);

    const postGeo = new THREE.BoxGeometry(0.06, 0.35, 0.06);
    const postL = new THREE.Mesh(postGeo, wingMat);
    postL.position.set(0.45, bodyHeight + 0.17, -bodyLength / 2 + 0.3);
    group.add(postL);
    const postR = new THREE.Mesh(postGeo, wingMat);
    postR.position.set(-0.45, bodyHeight + 0.17, -bodyLength / 2 + 0.3);
    group.add(postR);
  }

  // Headlights
  const headL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), headLightMat);
  headL.position.set(bodyWidth / 2 - 0.3, bodyHeight + 0.05, bodyLength / 2 + 0.01);
  group.add(headL);
  const headR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), headLightMat);
  headR.position.set(-bodyWidth / 2 + 0.3, bodyHeight + 0.05, bodyLength / 2 + 0.01);
  group.add(headR);

  // Tail light strip
  const tail = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.88, 0.10, 0.08), tailLightMat);
  tail.position.set(0, bodyHeight + 0.08, -bodyLength / 2 - 0.01);
  group.add(tail);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.28, 16);
  const wheelPositions = [
    [bodyWidth / 2, wheelRadius, wheelZ],
    [-bodyWidth / 2, wheelRadius, wheelZ],
    [bodyWidth / 2, wheelRadius, -wheelZ],
    [-bodyWidth / 2, wheelRadius, -wheelZ],
  ];
  const wheels = wheelPositions.map(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    w.castShadow = true;
    group.add(w);
    return w;
  });

  group.userData.bodyMaterial = bodyMat;
  group.userData.wheels = wheels;
  return group;
}
