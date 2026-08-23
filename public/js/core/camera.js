import * as THREE from '../vendor/three.module.js';

// Camera Modes for NCR ESCAPE (spec §18).
export const CAMERA_MODES = {
  CHASE_FAR: { id: 'far', name: 'CHASE (FAR)', distance: 9.0, height: 4.2, lookAhead: 4.0, lookY: 1.2 },
  CHASE_CLOSE: { id: 'close', name: 'CHASE (CLOSE)', distance: 5.5, height: 2.2, lookAhead: 6.0, lookY: 1.0 },
  HOOD: { id: 'hood', name: 'HOOD CAM', distance: -0.6, height: 1.15, lookAhead: 12.0, lookY: 0.9 },
};

const MODE_KEYS = Object.keys(CAMERA_MODES);
let currentModeIndex = 0;

export function createChaseCamera(aspect) {
  const camera = new THREE.PerspectiveCamera(62, aspect, 0.1, 1200);
  camera.position.set(0, 6, -12);
  return camera;
}

export function getCurrentCameraMode() {
  return CAMERA_MODES[MODE_KEYS[currentModeIndex]];
}

export function cycleCameraMode() {
  currentModeIndex = (currentModeIndex + 1) % MODE_KEYS.length;
  return getCurrentCameraMode();
}

export function snapChaseCamera(camera, carState) {
  const mode = getCurrentCameraMode();
  const sin = Math.sin(carState.heading);
  const cos = Math.cos(carState.heading);

  camera.position.set(
    carState.x - sin * mode.distance,
    mode.height,
    carState.z - cos * mode.distance
  );
  camera.lookAt(
    carState.x + sin * mode.lookAhead,
    mode.lookY,
    carState.z + cos * mode.lookAhead
  );
}

export function updateChaseCamera(camera, carState, dt) {
  const mode = getCurrentCameraMode();
  const sin = Math.sin(carState.heading);
  const cos = Math.cos(carState.heading);

  const targetX = carState.x - sin * mode.distance;
  const targetY = mode.height;
  const targetZ = carState.z - cos * mode.distance;

  // Faster lerp for hood cam to avoid lag behind bonnet
  const lerpSpeed = mode.id === 'hood' ? 14.0 : 4.5;

  camera.position.x += (targetX - camera.position.x) * Math.min(1, dt * lerpSpeed);
  camera.position.y += (targetY - camera.position.y) * Math.min(1, dt * lerpSpeed);
  camera.position.z += (targetZ - camera.position.z) * Math.min(1, dt * lerpSpeed);

  const lookX = carState.x + sin * mode.lookAhead;
  const lookZ = carState.z + cos * mode.lookAhead;
  camera.lookAt(lookX, mode.lookY, lookZ);
}
