import * as THREE from '/js/vendor/three.module.js';
import { buildDistrict, LIGHTING_MODES } from '/js/world/district.js';
import { buildVehicleMesh, VEHICLE_CATALOGUE } from '/js/vehicles/vehicle.js';
import { createCarState, stepCarPhysics } from '/js/physics/carPhysics.js';
import { readInput, consumePress, initTouchControls } from '/js/core/input.js';
import { createChaseCamera, updateChaseCamera, snapChaseCamera } from '/js/core/camera.js';
import { updateHUD } from '/js/ui/hud.js';
import { Minimap } from '/js/ui/minimap.js';
import { spawnPoint } from '/js/roads/network.js';
import { TrafficSystem } from '/js/traffic/trafficSystem.js';
import { RaceSystem, RACE_STATE } from '/js/racing/raceSystem.js';
import { Progression } from '/js/progression/progression.js';
import { GameUI } from '/js/ui/gameUI.js';
import { audioEngine } from '/js/audio/audioEngine.js';

const canvas = document.getElementById('game-canvas');
const startBtn = document.getElementById('start-btn');
const introOverlay = document.getElementById('intro-overlay');
const modeToggleBtn = document.getElementById('mode-toggle');
const audioToggleBtn = document.getElementById('audio-toggle');
const touchToggleBtn = document.getElementById('touch-toggle');
const touchControls = document.getElementById('touch-controls');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a3550);

const camera = createChaseCamera(window.innerWidth / window.innerHeight);
const { colliders, setDayNight, getCurrentMode } = buildDistrict(scene);

// --- Progression + Garage + Vehicles -----------------------------------------
const progression = new Progression();
let activeCarDef = progression.getSelectedVehicle();
let vehicle = progression.applyUpgrades(activeCarDef);

let carMesh = buildVehicleMesh(activeCarDef, progression.data.selectedPaint);
scene.add(carMesh);

function rebuildCarMesh() {
  scene.remove(carMesh);
  activeCarDef = progression.getSelectedVehicle();
  vehicle = progression.applyUpgrades(activeCarDef);
  carMesh = buildVehicleMesh(activeCarDef, progression.data.selectedPaint);
  carMesh.position.set(carState.x, 0, carState.z);
  carMesh.rotation.y = carState.heading;
  scene.add(carMesh);
}

const traffic = new TrafficSystem(scene);
const minimap = new Minimap('minimap-canvas');

let paused = false;

const ui = new GameUI(
  progression,
  (key) => {
    const ok = progression.buyUpgrade(key);
    if (ok) vehicle = progression.applyUpgrades(activeCarDef);
    return ok;
  },
  (vehicleId) => {
    const ok = progression.selectVehicle(vehicleId);
    if (ok) rebuildCarMesh();
    return ok;
  },
  (paintHex) => {
    progression.selectPaint(paintHex);
    rebuildCarMesh();
  },
  () => { paused = false; }
);

ui.updateWallet();
document.getElementById('garage-open').addEventListener('click', () => {
  paused = true;
  ui.openGarage();
});

// --- Racing -----------------------------------------------------------------
const race = new RaceSystem(scene, (result) => {
  progression.awardRace(result, race.activeEvent?.id);
  audioEngine.playChime();
  ui.showResults(result);
  paused = true;
});

ui.onResultsClosed = () => {
  race.dismissResults();
  paused = false;
};

let carState = createCarState(spawnPoint);
carMesh.position.set(carState.x, 0, carState.z);
snapChaseCamera(camera, carState);
traffic.seed(carState.x, carState.z);
traffic.update(0.016, carState.x, carState.z);

// --- Drift Scoring System ---------------------------------------------------
let driftScore = 0;
let driftMultiplier = 1.0;
let driftDuration = 0;
let lastDriftEnd = 0;

function updateDriftScore(dt, state, isHandbraking) {
  const absSpeed = Math.abs(state.speed);
  const isDrifting = (isHandbraking || Math.abs(state.driftYaw) > 0.15) && absSpeed > 6.5;

  if (isDrifting) {
    driftDuration += dt;
    driftMultiplier = Math.min(3.5, 1.0 + Math.floor(driftDuration / 1.0) * 0.5);
    const scoreRate = absSpeed * 8 * Math.max(0.5, Math.abs(state.driftYaw) * 2);
    driftScore += scoreRate * driftMultiplier * dt;
    lastDriftEnd = performance.now();
    ui.updateDrift(driftScore, driftMultiplier, true);
  } else {
    if (driftScore > 0 && performance.now() - lastDriftEnd > 700) {
      // Bank drift score
      if (driftScore > 50) {
        progression.awardDrift(driftScore);
        ui.updateWallet();
      }
      driftScore = 0;
      driftMultiplier = 1.0;
      driftDuration = 0;
      ui.updateDrift(0, 1.0, false);
    }
  }

  return isDrifting;
}

// --- Quick Toggles (Day/Night, Audio, Touch) --------------------------------
if (modeToggleBtn) {
  modeToggleBtn.addEventListener('click', () => {
    const cur = getCurrentMode();
    const next = cur === LIGHTING_MODES.DAY ? LIGHTING_MODES.SUNSET : cur === LIGHTING_MODES.SUNSET ? LIGHTING_MODES.NIGHT : LIGHTING_MODES.DAY;
    setDayNight(next);
    modeToggleBtn.textContent = next === LIGHTING_MODES.DAY ? '☀️ DAY' : next === LIGHTING_MODES.SUNSET ? '🌅 SUNSET' : '🌙 NIGHT';
  });
}

if (audioToggleBtn) {
  audioToggleBtn.addEventListener('click', () => {
    const isMuted = audioEngine.toggleMute();
    audioToggleBtn.textContent = isMuted ? '🔇 MUTED' : '🔊 SOUND';
  });
}

if (touchToggleBtn && touchControls) {
  touchToggleBtn.addEventListener('click', () => {
    touchControls.classList.toggle('hidden');
  });
}

// Initialize on-screen touch controls
initTouchControls();

let running = false;
let lastTime = performance.now();

// Exposed for the Playwright smoke tests
window.__DEBUG_SPEED = () => Math.abs(carState.speed);
window.__DEBUG_POS = () => ({ x: carState.x, z: carState.z });
window.__DEBUG_TRAFFIC = () => traffic.getDebugState();
window.__DEBUG_TRAFFIC_POSITIONS = () => traffic.getPositions();
window.__DEBUG_INTERSECTIONS = () => traffic.getIntersectionState();
window.__DEBUG_RACE = () => race.getDebugState();
window.__DEBUG_PROGRESSION = () => ({ ...progression.data, level: progression.level });
window.__DEBUG_VEHICLE = () => ({ ...vehicle });
window.__DEBUG_TELEPORT = (x, z, heading = 0) => {
  carState.x = x;
  carState.z = z;
  carState.speed = 0;
  carState.heading = heading;
  carState.driftYaw = 0;
};

function resetCar() {
  carState = createCarState(spawnPoint);
  carMesh.position.set(carState.x, 0, carState.z);
  snapChaseCamera(camera, carState);
  traffic.seed(carState.x, carState.z);
  driftScore = 0;
  driftMultiplier = 1.0;
  driftDuration = 0;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

let lastCountdownNum = null;

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (running && !paused) {
    const input = readInput();
    if (input.reset) resetCar();

    const interactPressed = consumePress('KeyE');

    traffic.update(dt, carState.x, carState.z);
    race.update(dt, carState.x, carState.z, interactPressed);

    // Audio cue during countdown
    if (race.state === RACE_STATE.COUNTDOWN) {
      const curNum = Math.ceil(race.countdown);
      if (curNum !== lastCountdownNum) {
        lastCountdownNum = curNum;
        audioEngine.playBeep(curNum === 0);
      }
    } else {
      lastCountdownNum = null;
    }

    const frozen = race.state === RACE_STATE.COUNTDOWN;
    const frameColliders = colliders.concat(traffic.getColliders());

    if (frozen) {
      carState.speed = 0;
      carState.driftYaw = 0;
    }

    const speedBeforeStep = carState.speed;

    stepCarPhysics(
      carState,
      frozen
        ? { throttle: 0, brake: 0, steer: 0, handbrake: false }
        : { throttle: input.throttle, brake: input.brake, steer: input.steer, handbrake: input.handbrake },
      vehicle,
      dt,
      frameColliders
    );

    // Impact sound check on sudden deceleration from collision
    if (Math.abs(speedBeforeStep) > 10 && Math.abs(carState.speed) < Math.abs(speedBeforeStep) * 0.7) {
      audioEngine.playCollision(1.0);
    }

    const isDrifting = updateDriftScore(dt, carState, input.handbrake);

    carMesh.position.set(carState.x, 0, carState.z);
    carMesh.rotation.y = carState.heading;

    // Wheel spin animation
    if (carMesh.userData.wheels) {
      const spinDelta = (carState.speed * dt) / 0.34;
      carMesh.userData.wheels.forEach((w) => {
        w.rotation.x += spinDelta;
      });
    }

    updateChaseCamera(camera, carState, dt);
    updateHUD(carState, vehicle);
    minimap.update(carState, traffic, race);
    ui.updateRace(race);
    audioEngine.update(carState.speed, input.throttle, isDrifting, dt);
  }

  renderer.render(scene, camera);
}

startBtn.addEventListener('click', () => {
  introOverlay.classList.add('hidden');
  audioEngine.unlock();
  running = true;
});

// Also unlock audio on initial touch or click anywhere
window.addEventListener('touchstart', () => audioEngine.unlock(), { once: true, passive: true });
window.addEventListener('click', () => audioEngine.unlock(), { once: true, passive: true });

requestAnimationFrame(animate);
