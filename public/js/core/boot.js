import * as THREE from '../vendor/three.module.js';
import { buildDistrict, LIGHTING_MODES } from '../world/district.js';
import { WeatherSystem, WEATHER_TYPES } from '../world/weather.js';
import { TimeCycleSystem } from '../world/timeCycle.js';
import { SpeedTrapSystem } from '../world/speedTraps.js';
import { PoliceSystem } from '../traffic/policeSystem.js';
import { SoundSystem } from '../audio/soundSystem.js';
import { SoundSystemUI } from '../ui/soundSystemUI.js';
import { MultiplayerSystem } from '../multiplayer/multiplayerSystem.js';
import { PhotoMode } from './photoMode.js';
import { WorldMap } from '../ui/worldMap.js';
import { buildVehicleMesh, VEHICLE_CATALOGUE } from '../vehicles/vehicle.js';
import { createCarState, stepCarPhysics } from '../physics/carPhysics.js';
import { readInput, consumePress, initTouchControls } from './input.js';
import { createChaseCamera, updateChaseCamera, snapChaseCamera, cycleCameraMode } from './camera.js';
import { updateHUD } from '../ui/hud.js';
import { Minimap } from '../ui/minimap.js';
import { spawnPoint } from '../roads/network.js';
import { TrafficSystem } from '../traffic/trafficSystem.js';
import { RaceSystem, RACE_STATE } from '../racing/raceSystem.js';
import { Progression } from '../progression/progression.js';
import { AchievementSystem } from '../progression/achievementSystem.js';
import { GameUI } from '../ui/gameUI.js';
import { audioEngine } from '../audio/audioEngine.js';
import { PedestrianSystem } from '../world/pedestrianSystem.js';

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
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
const timeCycle = new TimeCycleSystem(scene, setDayNight);
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
const pedestrians = new PedestrianSystem(scene);
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

// --- Arcade Near-Miss Traffic Bonus & Slalom Combo Detection -----------------
let lastNearMissTime = 0;
let nearMissComboCount = 0;
const nearmissBadge = document.getElementById('nearmiss-badge');
const nearmissText = document.getElementById('nearmiss-text');
const nearmissCombo = document.getElementById('nearmiss-combo');

function checkNearMisses(state, trafficPositions) {
  const kmh = Math.abs(state.speed) * 3.6;
  if (kmh < 40) return;

  const now = performance.now();
  if (now - lastNearMissTime > 3800) {
    nearMissComboCount = 0;
  }

  for (const t of trafficPositions) {
    if (t.x === undefined) continue;
    const dist = Math.hypot(state.x - t.x, state.z - t.z);
    if (dist > 1.8 && dist < 3.8) {
      if (now - lastNearMissTime < 800) return; // debounce same vehicle

      lastNearMissTime = now;
      nearMissComboCount++;
      state.nitro = Math.min(100, state.nitro + 22); // Instant nitro refill reward

      let baseCash = dist < 2.7 ? 250 : 100;
      let label = dist < 2.7 ? '🔥 CLOSE CALL!' : '⚡ NEAR MISS';
      let bonusCash = baseCash;

      if (nearMissComboCount === 2) {
        bonusCash = 300;
      } else if (nearMissComboCount === 3) {
        bonusCash = 600;
      } else if (nearMissComboCount >= 4) {
        bonusCash = 1500;
        label = '🏎️ TRAFFIC SLALOM!';
      }

      progression.awardDrift(bonusCash);
      achievements.recordNearMiss();
      ui.updateWallet();
      audioEngine.playChime();

      if (nearmissHud) {
        if (nearmissBadge) nearmissBadge.textContent = label;
        if (nearmissText) nearmissText.textContent = `+₹${bonusCash}`;
        if (nearmissCombo) {
          if (nearMissComboCount >= 2) {
            nearmissCombo.textContent = `COMBO ×${nearMissComboCount}`;
            nearmissCombo.classList.remove('hidden');
          } else {
            nearmissCombo.classList.add('hidden');
          }
        }
        nearmissHud.classList.remove('hidden');
        if (nearmissTimeout) clearTimeout(nearmissTimeout);
        nearmissTimeout = setTimeout(() => {
          nearmissHud.classList.add('hidden');
        }, 1400);
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
    const label = timeCycle.cycleMode();
    modeToggleBtn.textContent = label;
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
window.__DEBUG_PEDESTRIANS = () => pedestrians.getDebugState();
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
  pedestrians.seed(carState.x, carState.z);
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
    pedestrians.update(dt, carState.x, carState.z, carState.speed);
    race.update(dt, carState.x, carState.z, interactPressed, traffic.getPositions());
    weather.update(dt, carState.x, carState.z);
    timeCycle.update(dt);
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
  } else if (!running) {
    // Subtle slow cinematic breathing / camera sway on the title screen
    const titleTime = now * 0.0004;
    camera.position.x = carState.x + 3.8 + Math.sin(titleTime) * 0.4;
    camera.position.y = 1.35 + Math.cos(titleTime * 0.8) * 0.1;
    camera.position.z = carState.z + 5.8 + Math.cos(titleTime) * 0.3;
    camera.lookAt(carState.x - 0.2, 0.7, carState.z);

    // Tick title UI elements in real-time
    updateTitleRadioUI();
    updateTitleLocationUI();
  }

  renderer.render(scene, camera);
}

// Initial Title Screen Showcase Camera Position
camera.position.set(carState.x + 3.8, 1.35, carState.z + 5.8);
camera.lookAt(carState.x - 0.2, 0.7, carState.z);

// --- Title Screen & Modals Integration ---
const modalHowToPlay = document.getElementById('modal-how-to-play');
const btnHowToPlay = document.getElementById('btn-how-to-play');
const howToPlayClose = document.getElementById('how-to-play-close');

const modalSettings = document.getElementById('modal-settings');
const btnSettingsOpen = document.getElementById('btn-settings-open');
const settingsClose = document.getElementById('settings-close');

const settingsAudioToggle = document.getElementById('settings-audio-toggle');
const settingsModeToggle = document.getElementById('settings-mode-toggle');
const settingsWeatherToggle = document.getElementById('settings-weather-toggle');
const settingsCamToggle = document.getElementById('settings-cam-toggle');

const hudElement = document.getElementById('hud');
const topbarElement = document.getElementById('topbar');

if (btnHowToPlay && modalHowToPlay) {
  btnHowToPlay.addEventListener('click', () => {
    modalHowToPlay.classList.remove('hidden');
  });
}
if (howToPlayClose && modalHowToPlay) {
  howToPlayClose.addEventListener('click', () => {
    modalHowToPlay.classList.add('hidden');
  });
}

if (btnSettingsOpen && modalSettings) {
  btnSettingsOpen.addEventListener('click', () => {
    modalSettings.classList.remove('hidden');
  });
}
if (settingsClose && modalSettings) {
  settingsClose.addEventListener('click', () => {
    modalSettings.classList.add('hidden');
  });
}

// Settings modal live toggles
if (settingsAudioToggle) {
  settingsAudioToggle.addEventListener('click', () => {
    const isMuted = audioEngine.toggleMute();
    settingsAudioToggle.textContent = isMuted ? '🔇 FX: OFF' : '🔊 FX: ON';
    if (audioToggleBtn) audioToggleBtn.textContent = isMuted ? '🔇 FX: OFF' : '🔊 FX: ON';
  });
}

if (settingsModeToggle) {
  settingsModeToggle.addEventListener('click', () => {
    const label = timeCycle.cycleMode();
    settingsModeToggle.textContent = label;
    if (modeToggleBtn) modeToggleBtn.textContent = label;
  });
}

if (settingsWeatherToggle) {
  settingsWeatherToggle.addEventListener('click', () => {
    const cur = weather.currentWeather;
    const next = cur === WEATHER_TYPES.CLEAR ? WEATHER_TYPES.RAIN : cur === WEATHER_TYPES.RAIN ? WEATHER_TYPES.HAZE : WEATHER_TYPES.CLEAR;
    weather.setWeather(next);
    settingsWeatherToggle.textContent = next === WEATHER_TYPES.CLEAR ? '☀️ CLEAR' : next === WEATHER_TYPES.RAIN ? '🌧️ RAIN' : '🌫️ HAZE';
    if (weatherToggleBtn) weatherToggleBtn.textContent = next === WEATHER_TYPES.CLEAR ? '☀️ CLEAR' : next === WEATHER_TYPES.RAIN ? '🌧️ RAIN' : '🌫️ HAZE';
  });
}

if (settingsCamToggle) {
  settingsCamToggle.addEventListener('click', () => {
    const nextCam = cycleCameraMode();
    settingsCamToggle.textContent = `🎥 ${nextCam.name}`;
    if (cameraToggleBtn) cameraToggleBtn.textContent = `🎥 ${nextCam.name}`;
  });
}

// ▶ DRIVE Primary CTA Click Handler
if (startBtn) {
  startBtn.addEventListener('click', () => {
    if (introOverlay) introOverlay.classList.add('hidden');
    if (modalHowToPlay) modalHowToPlay.classList.add('hidden');
    if (modalSettings) modalSettings.classList.add('hidden');

    // Reveal Gameplay HUD cleanly
    if (hudElement) hudElement.classList.remove('hidden');
    if (topbarElement) topbarElement.classList.remove('hidden');
    if (minimapContainer) minimapContainer.classList.remove('hidden');
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      if (touchControls) touchControls.classList.remove('hidden');
    }

    snapChaseCamera(camera, carState);
    pedestrians.seed(carState.x, carState.z);
    audioEngine.unlock();
    running = true;
  });
}

// Title UI Radio Widget State Updater
const titleCassette = document.getElementById('title-cassette-widget');
const deckPlayBtn = document.getElementById('deck-play-btn');
const deckTrackTitle = document.getElementById('deck-track-title');
const deckTrackSub = document.getElementById('deck-track-sub');
const reels = document.querySelectorAll('.cassette-reel');

function updateTitleRadioUI() {
  if (!titleCassette) return;
  const track = soundSystem.getCurrentTrack();
  if (track) {
    if (deckTrackTitle) deckTrackTitle.textContent = track.title;
    if (deckTrackSub) deckTrackSub.textContent = `${track.artist} (${track.era})`;
  }
  const isPlaying = soundSystem.isPlaying;
  if (isPlaying) {
    titleCassette.classList.add('playing');
    if (deckPlayBtn) deckPlayBtn.textContent = '⏸';
    reels.forEach(r => r.style.animationPlayState = 'running');
  } else {
    titleCassette.classList.remove('playing');
    if (deckPlayBtn) deckPlayBtn.textContent = '▶';
    reels.forEach(r => r.style.animationPlayState = 'paused');
  }
}

// Title UI Location Widget State Updater
let lastLocationUpdateTime = 0;
function updateTitleLocationUI() {
  const now = performance.now();
  if (now - lastLocationUpdateTime < 1000) return;
  lastLocationUpdateTime = now;

  const districtVal = document.getElementById('loc-val-district');
  const timeVal = document.getElementById('loc-val-time');
  const weatherVal = document.getElementById('loc-val-weather');
  const roadVal = document.getElementById('loc-val-road');

  if (districtVal) {
    const dName = minimap.getDistrictName(carState.x, carState.z);
    districtVal.textContent = dName;
    if (roadVal) {
      if (dName.includes('EXPRESSWAY')) {
        roadVal.textContent = 'NOIDA EXPRESSWAY';
      } else if (dName.includes('BRIDGE') || dName.includes('CROSSING')) {
        roadVal.textContent = 'YAMUNA BRIDGE FLYOVER';
      } else if (dName.includes('DELHI')) {
        roadVal.textContent = 'DELHI GT ROAD';
      } else {
        roadVal.textContent = 'NCR EXPRESSWAY';
      }
    }
  }

  if (timeVal) {
    const hours = Math.floor(timeCycle.timeOfDay * 24);
    const minutes = Math.floor((timeCycle.timeOfDay * 24 % 1) * 60);
    timeVal.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  if (weatherVal) {
    weatherVal.textContent = weather.currentWeather;
  }
}





// Title Screen Quick Menu & In-Car Radio Deck
const deckPlayBtnWidget = document.getElementById('deck-play-btn');
const btnMenuGarage = document.getElementById('btn-menu-garage');
const btnMenuMap = document.getElementById('btn-menu-map');
const btnMenuRadio = document.getElementById('btn-menu-radio');
const btnQuickSettings = document.getElementById('btn-quick-settings');
const btnQuickExit = document.getElementById('btn-quick-exit');

if (deckPlayBtnWidget) {
  deckPlayBtnWidget.addEventListener('click', () => {
    audioEngine.unlock();
    soundSystem.toggle();
    updateTitleRadioUI();
  });
}

if (btnMenuRadio) {
  btnMenuRadio.addEventListener('click', () => {
    audioEngine.unlock();
    soundSystem.toggle();
    updateTitleRadioUI();
  });
}

if (btnMenuGarage) {
  btnMenuGarage.addEventListener('click', () => {
    ui.openGarage();
  });
}

if (btnMenuMap) {
  btnMenuMap.addEventListener('click', () => {
    worldMap.open(carState);
  });
}

if (btnQuickSettings && modalSettings) {
  btnQuickSettings.addEventListener('click', () => {
    modalSettings.classList.remove('hidden');
  });
}

if (btnQuickExit) {
  btnQuickExit.addEventListener('click', () => {
    if (confirm('Are you sure you want to shut down?')) {
      window.close();
    }
  });
}

window.addEventListener('touchstart', () => audioEngine.unlock(), { once: true, passive: true });
window.addEventListener('click', () => audioEngine.unlock(), { once: true, passive: true });

requestAnimationFrame(animate);


