import * as THREE from '/js/vendor/three.module.js';
import { buildDistrict, LIGHTING_MODES } from '/js/world/district.js';
import { WeatherSystem, WEATHER_TYPES } from '/js/world/weather.js';
import { SpeedTrapSystem } from '/js/world/speedTraps.js';
import { PoliceSystem } from '/js/traffic/policeSystem.js';
import { SoundSystem } from '/js/audio/soundSystem.js';
import { SoundSystemUI } from '/js/ui/soundSystemUI.js';
import { MultiplayerSystem } from '/js/multiplayer/multiplayerSystem.js';
import { PhotoMode } from '/js/core/photoMode.js';
import { WorldMap } from '/js/ui/worldMap.js';
import { buildVehicleMesh, VEHICLE_CATALOGUE } from '/js/vehicles/vehicle.js';
import { createCarState, stepCarPhysics } from '/js/physics/carPhysics.js';
import { readInput, consumePress, initTouchControls } from '/js/core/input.js';
import { createChaseCamera, updateChaseCamera, snapChaseCamera, cycleCameraMode } from '/js/core/camera.js';
import { updateHUD } from '/js/ui/hud.js';
import { Minimap } from '/js/ui/minimap.js';
import { spawnPoint } from '/js/roads/network.js';
import { TrafficSystem } from '/js/traffic/trafficSystem.js';
import { RaceSystem, RACE_STATE } from '/js/racing/raceSystem.js';
import { Progression } from '/js/progression/progression.js';
import { AchievementSystem } from '/js/progression/achievementSystem.js';
import { GameUI } from '/js/ui/gameUI.js';
import { audioEngine } from '/js/audio/audioEngine.js';

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

const canvas = document.getElementById('game-canvas');
const startBtn = document.getElementById('start-btn');
const introOverlay = document.getElementById('intro-overlay');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const modeToggleBtn = document.getElementById('mode-toggle');
const weatherToggleBtn = document.getElementById('weather-toggle');
const audioToggleBtn = document.getElementById('audio-toggle');
const cameraToggleBtn = document.getElementById('camera-toggle');
const mapOpenBtn = document.getElementById('map-open');
const photoOpenBtn = document.getElementById('photo-open');
const touchControls = document.getElementById('touch-controls');
const garageOpenBtn = document.getElementById('garage-open');
const minimapContainer = document.getElementById('minimap-container');

// Speed trap, Police & Near-miss HUD elements
const speedtrapHud = document.getElementById('speedtrap-hud');
const speedtrapVal = document.getElementById('speedtrap-val');
const speedtrapReward = document.getElementById('speedtrap-reward');
const policeHud = document.getElementById('police-hud');
const policeStars = document.getElementById('police-stars');
const policeStatus = document.getElementById('police-status');
const nearmissHud = document.getElementById('nearmiss-hud');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a3550);

const camera = createChaseCamera(window.innerWidth / window.innerHeight);
const { colliders, setDayNight, getCurrentMode } = buildDistrict(scene);
const weather = new WeatherSystem(scene);
const soundSystem = new SoundSystem(audioEngine);

let paused = false;

// In-Car Sound System & Subwoofer UI
const soundUI = new SoundSystemUI(soundSystem, () => {
  paused = false;
});

if (soundToggleBtn) {
  soundToggleBtn.addEventListener('click', () => {
    paused = true;
    soundUI.open();
  });
}

// --- Progression + Achievements + Garage + Vehicles -------------------------
const progression = new Progression();
const achievements = new AchievementSystem(progression, () => {
  audioEngine.playChime();
  if (ui) ui.updateWallet();
});

let activeCarDef = progression.getSelectedVehicle();
let vehicle = progression.applyUpgrades(activeCarDef);

let nitroFlameL = null;
let nitroFlameR = null;
let backfireFlame = null;

function createExhaustFlames() {
  const nitroMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.85 });
  const backfireMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.95 });
  const flameGeo = new THREE.ConeGeometry(0.12, 0.65, 8);
  flameGeo.rotateX(-Math.PI / 2);

  const flameL = new THREE.Mesh(flameGeo, nitroMat);
  flameL.position.set(0.45, 0.35, -2.35);
  flameL.visible = false;

  const flameR = new THREE.Mesh(flameGeo, nitroMat);
  flameR.position.set(-0.45, 0.35, -2.35);
  flameR.visible = false;

  const bfGeo = new THREE.ConeGeometry(0.16, 0.45, 8);
  bfGeo.rotateX(-Math.PI / 2);
  const bfFlame = new THREE.Mesh(bfGeo, backfireMat);
  bfFlame.position.set(0, 0.35, -2.3);
  bfFlame.visible = false;

  return { flameL, flameR, bfFlame };
}

let carMesh = buildVehicleMesh(activeCarDef, progression.data.selectedPaint, progression.data.selectedNeon);
const exFlames = createExhaustFlames();
nitroFlameL = exFlames.flameL;
nitroFlameR = exFlames.flameR;
backfireFlame = exFlames.bfFlame;
carMesh.add(nitroFlameL);
carMesh.add(nitroFlameR);
carMesh.add(backfireFlame);
scene.add(carMesh);

function rebuildCarMesh() {
  scene.remove(carMesh);
  activeCarDef = progression.getSelectedVehicle();
  vehicle = progression.applyUpgrades(activeCarDef);
  carMesh = buildVehicleMesh(activeCarDef, progression.data.selectedPaint, progression.data.selectedNeon);
  const newEx = createExhaustFlames();
  nitroFlameL = newEx.flameL;
  nitroFlameR = newEx.flameR;
  backfireFlame = newEx.bfFlame;
  carMesh.add(nitroFlameL);
  carMesh.add(nitroFlameR);
  carMesh.add(backfireFlame);
  carMesh.position.set(carState.x, 0, carState.z);
  carMesh.rotation.y = carState.heading;
  scene.add(carMesh);
}

const traffic = new TrafficSystem(scene);
const minimap = new Minimap('minimap-canvas', 'minimap-label');
const multiplayer = new MultiplayerSystem(scene);

// Full-Screen World Map
const worldMap = new WorldMap(
  (tx, tz) => {
    carState.x = tx;
    carState.z = tz;
    carState.speed = 0;
    carState.driftYaw = 0;
    carMesh.position.set(carState.x, 0, carState.z);
    snapChaseCamera(camera, carState);
    paused = false;
  },
  () => { paused = false; }
);

if (mapOpenBtn) {
  mapOpenBtn.addEventListener('click', () => {
    paused = true;
    worldMap.open(carState);
  });
}

if (minimapContainer) {
  minimapContainer.addEventListener('click', () => {
    paused = true;
    worldMap.open(carState);
  });
}

// Photo Mode
const photoMode = new PhotoMode(scene, camera, renderer, setDayNight, () => {
  paused = false;
  camera.fov = 60;
  camera.updateProjectionMatrix();
});

const origCapture = photoMode.captureScreenshot.bind(photoMode);
photoMode.captureScreenshot = () => {
  origCapture();
  achievements.recordPhotoTaken();
};

if (photoOpenBtn) {
  photoOpenBtn.addEventListener('click', () => {
    paused = true;
    photoMode.enter(carState);
  });
}

const ui = new GameUI(
  progression,
  (key) => {
    const ok = progression.buyUpgrade(key);
    if (ok) {
      vehicle = progression.applyUpgrades(activeCarDef);
      achievements.recordUpgrade();
    }
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
  (neonHex) => {
    progression.selectNeon(neonHex);
    rebuildCarMesh();
  },
  () => { paused = false; }
);

ui.updateWallet();
if (garageOpenBtn) {
  garageOpenBtn.addEventListener('click', () => {
    paused = true;
    ui.openGarage();
  });
}

// --- Racing -----------------------------------------------------------------
const race = new RaceSystem(scene, (result) => {
  progression.awardRace(result, race.activeEvent?.id);
  achievements.recordRaceWin(result.position);
  audioEngine.playChime();
  ui.showResults(result);
  paused = true;
});

ui.onResultsClosed = () => {
  race.dismissResults();
  paused = false;
};

// --- Police Pursuit & Heat System -------------------------------------------
let speedtrapTimeout = null;
let nearmissTimeout = null;

const police = new PoliceSystem(
  scene,
  ({ fine }) => {
    progression.deductBustFine(fine);
    audioEngine.setSiren(false);
    ui.updateWallet();
    if (policeStatus) policeStatus.textContent = `BUSTED! ₹${fine} FINE DEDUCTED`;
    setTimeout(() => {
      if (policeHud) policeHud.classList.add('hidden');
    }, 2500);
  },
  ({ heat, cash, rep }) => {
    progression.awardPoliceEscape(cash, rep);
    achievements.recordPoliceEscape(heat);
    audioEngine.playChime();
    audioEngine.setSiren(false);
    ui.updateWallet();
    if (policeStatus) policeStatus.textContent = `ESCAPED! +₹${cash} CASH`;
    setTimeout(() => {
      if (policeHud) policeHud.classList.add('hidden');
    }, 2500);
  }
);

// --- Speed Trap Radar System ------------------------------------------------
const speedTraps = new SpeedTrapSystem(scene, (res) => {
  audioEngine.playCameraShutter();
  if (res.beatTarget) {
    progression.awardSpeedTrap(res.reward);
    achievements.recordSpeedTrapBeat();
    ui.updateWallet();
    police.addHeat(1);
    audioEngine.setSiren(true);
  }

  if (speedtrapHud) {
    speedtrapVal.innerHTML = `${res.speedKmh} <span>km/h</span>`;
    speedtrapReward.textContent = res.beatTarget
      ? `TARGET ${res.trap.targetKmh} km/h BEAT! +₹${res.reward}`
      : `TARGET ${res.trap.targetKmh} km/h MISSED`;
    speedtrapReward.style.color = res.beatTarget ? '#ffd166' : '#ff7a18';
    speedtrapHud.classList.remove('hidden');

    if (speedtrapTimeout) clearTimeout(speedtrapTimeout);
    speedtrapTimeout = setTimeout(() => {
      speedtrapHud.classList.add('hidden');
    }, 2400);
  }
});

let carState = createCarState(spawnPoint);
carMesh.position.set(carState.x, 0, carState.z);
snapChaseCamera(camera, carState);
traffic.seed(carState.x, carState.z);
traffic.update(0.016, carState.x, carState.z);

// --- Near-Miss Traffic Bonus Detection ---------------------------------------
let lastNearMissTime = 0;

function checkNearMisses(state, trafficPositions) {
  const kmh = Math.abs(state.speed) * 3.6;
  if (kmh < 58) return;

  const now = performance.now();
  if (now - lastNearMissTime < 1500) return;

  for (const t of trafficPositions) {
    if (t.x === undefined) continue;
    const dist = Math.hypot(state.x - t.x, state.z - t.z);
    if (dist > 2.2 && dist < 3.6) {
      lastNearMissTime = now;
      state.nitro = Math.min(100, state.nitro + 18);
      progression.awardDrift(1250);
      achievements.recordNearMiss();
      ui.updateWallet();

      if (nearmissHud) {
        nearmissHud.classList.remove('hidden');
        if (nearmissTimeout) clearTimeout(nearmissTimeout);
        nearmissTimeout = setTimeout(() => {
          nearmissHud.classList.add('hidden');
        }, 1200);
      }
      break;
    }
  }
}

// --- Radar Detector Alert System (Speed Traps & Police) --------------------
let lastRadarChirpTime = 0;
const radarDetectorHud = document.getElementById('radar-detector-hud');
const radarDetectorText = document.getElementById('radar-detector-text');

function updateRadarDetector(state, traps, policeUnits) {
  if (!radarDetectorHud) return;

  let nearestDist = 999;
  let alertType = '';

  // Check speed traps
  if (traps) {
    for (const trap of traps) {
      const dist = Math.hypot(state.x - trap.x, state.z - trap.z);
      if (dist < 85 && dist < nearestDist) {
        nearestDist = dist;
        alertType = `⚠️ CAMERA ${Math.round(dist)}m (${trap.targetKmh}km/h)`;
      }
    }
  }

  // Check police interceptors
  if (policeUnits && policeUnits.length > 0) {
    for (const unit of policeUnits) {
      if (!unit.mesh) continue;
      const dist = Math.hypot(state.x - unit.mesh.position.x, state.z - unit.mesh.position.z);
      if (dist < 110 && dist < nearestDist) {
        nearestDist = dist;
        alertType = `🚨 POLICE RADAR ${Math.round(dist)}m`;
      }
    }
  }

  if (nearestDist < 90) {
    radarDetectorHud.classList.remove('hidden');
    if (radarDetectorText) radarDetectorText.textContent = alertType;

    const now = performance.now();
    const chirpInterval = Math.max(180, (nearestDist / 90) * 800);
    if (now - lastRadarChirpTime > chirpInterval) {
      lastRadarChirpTime = now;
      audioEngine.playRadarChirp(1.0 - (nearestDist / 90));
    }
  } else {
    radarDetectorHud.classList.add('hidden');
  }
}

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
      if (driftScore > 50) {
        progression.awardDrift(driftScore);
        achievements.recordDrift(driftScore);
        state.nitro = Math.min(100, state.nitro + 15);
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

// --- Quick Toggles ----------------------------------------------------------
if (cameraToggleBtn) {
  cameraToggleBtn.addEventListener('click', () => {
    const nextCam = cycleCameraMode();
    cameraToggleBtn.textContent = `🎥 ${nextCam.name}`;
    snapChaseCamera(camera, carState);
  });
}

if (modeToggleBtn) {
  modeToggleBtn.addEventListener('click', () => {
    const cur = getCurrentMode();
    const next = cur === LIGHTING_MODES.DAY ? LIGHTING_MODES.SUNSET : cur === LIGHTING_MODES.SUNSET ? LIGHTING_MODES.NIGHT : LIGHTING_MODES.DAY;
    setDayNight(next);
    modeToggleBtn.textContent = next === LIGHTING_MODES.DAY ? '☀️ DAY' : next === LIGHTING_MODES.SUNSET ? '🌅 SUNSET' : '🌙 NIGHT';
  });
}

if (weatherToggleBtn) {
  weatherToggleBtn.addEventListener('click', () => {
    const cur = weather.currentWeather;
    const next = cur === WEATHER_TYPES.CLEAR ? WEATHER_TYPES.RAIN : cur === WEATHER_TYPES.RAIN ? WEATHER_TYPES.HAZE : WEATHER_TYPES.CLEAR;
    weather.setWeather(next);
    weatherToggleBtn.textContent = next === WEATHER_TYPES.CLEAR ? '☀️ CLEAR' : next === WEATHER_TYPES.RAIN ? '🌧️ RAIN' : '🌫️ HAZE';
  });
}

if (audioToggleBtn) {
  audioToggleBtn.addEventListener('click', () => {
    const isMuted = audioEngine.toggleMute();
    audioToggleBtn.textContent = isMuted ? '🔇 FX: OFF' : '🔊 FX: ON';
  });
}

// Initialize on-screen touch controls
initTouchControls();

let running = false;
let lastTime = performance.now();
let lastThrottle = 0;
let backfireTimeout = null;

// Exposed for Playwright tests
window.__DEBUG_SPEED = () => Math.abs(carState.speed);
window.__DEBUG_POS = () => ({ x: carState.x, z: carState.z });
window.__DEBUG_TRAFFIC = () => traffic.getDebugState();
window.__DEBUG_TRAFFIC_POSITIONS = () => traffic.getPositions();
window.__DEBUG_INTERSECTIONS = () => traffic.getIntersectionState();
window.__DEBUG_RACE = () => race.getDebugState();
window.__DEBUG_POLICE = () => police.getDebugState();
window.__DEBUG_PROGRESSION = () => ({ ...progression.data, level: progression.level });
window.__DEBUG_ACHIEVEMENTS = () => achievements.getUnlockedList();
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
  police.clearHeat();
  audioEngine.setSiren(false);
  if (policeHud) policeHud.classList.add('hidden');
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

  if (photoMode.active) {
    photoMode.update();
    renderer.render(scene, camera);
    return;
  }

  if (running && !paused) {
    const input = readInput();
    if (input.reset) resetCar();

    if (consumePress('KeyH') || input.horn) {
      const tone = Math.floor(Math.random() * 3);
      audioEngine.playHorn(tone);
    }

    if (consumePress('KeyB')) {
      paused = true;
      soundUI.open();
      return;
    }

    if (consumePress('KeyM')) {
      paused = true;
      worldMap.open(carState);
      return;
    }

    if (consumePress('KeyC')) {
      const nextCam = cycleCameraMode();
      if (cameraToggleBtn) cameraToggleBtn.textContent = `🎥 ${nextCam.name}`;
      snapChaseCamera(camera, carState);
    }

    if (consumePress('KeyP')) {
      paused = true;
      photoMode.enter(carState);
      return;
    }

    const interactPressed = consumePress('KeyE');
    const kmh = Math.abs(carState.speed) * 3.6;

    // Exhaust backfire check on sudden deceleration
    if (input.throttle === 0 && lastThrottle > 0.8 && kmh > 65) {
      audioEngine.playBackfire();
      if (backfireFlame) {
        backfireFlame.visible = true;
        if (backfireTimeout) clearTimeout(backfireTimeout);
        backfireTimeout = setTimeout(() => {
          if (backfireFlame) backfireFlame.visible = false;
        }, 110);
      }
    }
    lastThrottle = input.throttle;

    achievements.recordSpeed(kmh);
    achievements.recordDistrict(minimap.getDistrictName(carState.x, carState.z));

    traffic.update(dt, carState.x, carState.z);
    race.update(dt, carState.x, carState.z, interactPressed, traffic.getPositions());
    weather.update(dt, carState.x, carState.z);
    speedTraps.update(dt, carState.x, carState.z, kmh);
    police.update(dt, carState.x, carState.z, kmh);
    multiplayer.update(dt, carState, activeCarDef, progression.data.selectedPaint);
    checkNearMisses(carState, traffic.getPositions());
    updateRadarDetector(carState, speedTraps.traps, police.policeUnits);

    // Update Police Pursuit HUD
    if (police.heat > 0 && policeHud) {
      policeHud.classList.remove('hidden');
      if (policeStars) {
        policeStars.textContent = '★'.repeat(police.heat) + '☆'.repeat(3 - police.heat);
      }
      if (policeStatus) {
        if (police.bustProgress > 0.5) {
          policeStatus.textContent = `BUST IN PROGRESS: ${Math.round((police.bustProgress / 3.0) * 100)}%`;
        } else if (police.escapeCooldown > 0.5) {
          policeStatus.textContent = `ESCAPING... ${Math.round((police.escapeCooldown / 5.0) * 100)}%`;
        } else {
          policeStatus.textContent = `PURSUIT — HEAT ${police.heat}`;
        }
      }
    }

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
    const frameColliders = colliders
      .concat(traffic.getColliders())
      .concat(police.getColliders())
      .concat(multiplayer.getRemoteColliders());

    if (frozen) {
      carState.speed = 0;
      carState.driftYaw = 0;
    }

    const speedBeforeStep = carState.speed;
    const frictionMod = weather.getFrictionMultiplier();
    const effectiveVehicle = {
      ...vehicle,
      grip: vehicle.grip * frictionMod,
    };

    stepCarPhysics(
      carState,
      frozen
        ? { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false }
        : { throttle: input.throttle, brake: input.brake, steer: input.steer, handbrake: input.handbrake, nitro: input.nitro },
      effectiveVehicle,
      dt,
      frameColliders
    );

    // Nitro exhaust flame visibility & camera FOV push
    if (nitroFlameL && nitroFlameR) {
      nitroFlameL.visible = carState.isBoosting;
      nitroFlameR.visible = carState.isBoosting;
    }
    const targetFov = carState.isBoosting ? 67 : 60;
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6);
    camera.updateProjectionMatrix();

    // Impact sound check and police heat trigger on severe collision
    if (Math.abs(speedBeforeStep) > 10 && Math.abs(carState.speed) < Math.abs(speedBeforeStep) * 0.7) {
      audioEngine.playCollision(1.0);
      if (Math.abs(speedBeforeStep) > 18) {
        police.addHeat(1);
        audioEngine.setSiren(true);
      }
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
    minimap.update(carState, traffic, race, multiplayer);
    ui.updateRace(race);
    audioEngine.update(carState.speed, input.throttle, isDrifting, dt);
  }

  renderer.render(scene, camera);
}

if (startBtn) {
  startBtn.addEventListener('click', () => {
    if (introOverlay) introOverlay.classList.add('hidden');
    audioEngine.unlock();
    running = true;
  });
}

window.addEventListener('touchstart', () => audioEngine.unlock(), { once: true, passive: true });
window.addEventListener('click', () => audioEngine.unlock(), { once: true, passive: true });

requestAnimationFrame(animate);
