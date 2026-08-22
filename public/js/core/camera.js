import * as THREE from '/js/vendor/three.module.js';

export function createChaseCamera(aspect) {
  const camera = new THREE.PerspectiveCamera(62, aspect, 0.1, 1200);
  camera.position.set(0, 6, -12);
  return camera;
}

/** Snaps the camera directly behind the car with no lerp — call once on spawn/reset so the
 * first frame is already framed correctly instead of swooping in from a hardcoded default. */
export function snapChaseCamera(camera, carState) {
  const distance = 9;
  const height = 4.2;
  camera.position.set(
    carState.x - Math.sin(carState.heading) * distance,
    height,
    carState.z - Math.cos(carState.heading) * distance
  );
  camera.lookAt(
    carState.x + Math.sin(carState.heading) * 4,
    1.2,
    carState.z + Math.cos(carState.heading) * 4
  );
}

export function updateChaseCamera(camera, carState, dt) {
  const distance = 9;
  const height = 4.2;
  const behindX = carState.x - Math.sin(carState.heading) * distance;
  const behindZ = carState.z - Math.cos(carState.heading) * distance;

  camera.position.x += (behindX - camera.position.x) * Math.min(1, dt * 4.5);
  camera.position.y += (height - camera.position.y) * Math.min(1, dt * 4.5);
  camera.position.z += (behindZ - camera.position.z) * Math.min(1, dt * 4.5);

  const lookX = carState.x + Math.sin(carState.heading) * 4;
  const lookZ = carState.z + Math.cos(carState.heading) * 4;
  camera.lookAt(lookX, 1.2, lookZ);
}
