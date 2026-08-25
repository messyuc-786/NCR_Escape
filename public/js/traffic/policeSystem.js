import * as THREE from '../vendor/three.module.js';

// Phase 7 — Police / Heat / Pursuit 2.0
// Arcade pursuit system that builds on the existing NCR traffic/physics stack.

const MAX_HEAT = 3;
const SEARCH_DISTANCE = 105;
const SEARCH_DURATION = 8;
const BUST_DISTANCE = 8.5;
const BUST_SPEED_KMH = 6;
const BUST_DURATION = 2.8;
const NEAR_MISS_WINDOW_MS = 22000;
const NEAR_MISS_HEAT_THRESHOLD = 8;
const HIGH_SPEED_TRIGGER_KMH = 150;
const HIGH_SPEED_TRIGGER_SECONDS = 5;

export class PoliceSystem {
  constructor(scene, onBusted, onEscaped) {
    this.scene = scene;
    this.onBusted = onBusted;
    this.onEscaped = onEscaped;

    this.heat = 0;
    this.policeUnits = [];
    this.bustProgress = 0;
    this.escapeCooldown = 0;
    this.inPursuit = false;
    this.state = 'IDLE'; // IDLE | PURSUIT | SEARCH

    this.lastKnownX = 0;
    this.lastKnownZ = 0;
    this.searchTimer = 0;
    this.pursuitTime = 0;

    this.nearMissWindowStart = 0;
    this.nearMissHeatCount = 0;
    this.highSpeedTimer = 0;
    this.highSpeedTriggered = false;
  }

  addHeat(amount = 1) {
    const prev = this.heat;
    this.heat = Math.min(MAX_HEAT, Math.max(1, this.heat + amount));
    this.inPursuit = true;
    this.state = 'PURSUIT';
    this.escapeCooldown = 0;
    this.searchTimer = 0;
    this.bustProgress = 0;

    if (this.heat > prev) {
      this.syncPoliceUnits();
    }
  }

  reportNearMiss(now = Date.now()) {
    if (this.heat >= MAX_HEAT) return false;
    if (now - this.nearMissWindowStart > NEAR_MISS_WINDOW_MS) {
      this.nearMissWindowStart = now;
      this.nearMissHeatCount = 0;
    }
    this.nearMissHeatCount += 1;
    if (this.nearMissHeatCount >= NEAR_MISS_HEAT_THRESHOLD) {
      this.nearMissHeatCount = 0;
      this.nearMissWindowStart = now;
      this.addHeat(1);
      return true;
    }
    return false;
  }

  observeDriving(speedKmh, dt) {
    if (this.heat >= MAX_HEAT) return false;
    if (speedKmh >= HIGH_SPEED_TRIGGER_KMH) {
      this.highSpeedTimer += dt;
      if (!this.highSpeedTriggered && this.highSpeedTimer >= HIGH_SPEED_TRIGGER_SECONDS) {
        this.highSpeedTriggered = true;
        this.addHeat(1);
        return true;
      }
    } else {
      this.highSpeedTimer = Math.max(0, this.highSpeedTimer - dt * 2);
      if (this.highSpeedTimer < 1) this.highSpeedTriggered = false;
    }
    return false;
  }

  clearHeat() {
    this.heat = 0;
    this.inPursuit = false;
    this.state = 'IDLE';
    this.bustProgress = 0;
    this.escapeCooldown = 0;
    this.searchTimer = 0;
    this.pursuitTime = 0;
    this.nearMissHeatCount = 0;
    this.nearMissWindowStart = 0;
    this.highSpeedTimer = 0;
    this.highSpeedTriggered = false;
    this.destroyAllUnits();
  }

  buildPoliceMesh() {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.56, 4.4), bodyMat);
    body.position.y = 0.56;
    body.castShadow = true;
    group.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.48, 2.2), glassMat);
    cabin.position.set(0, 0.98, -0.15);
    group.add(cabin);

    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 3.8), stripeMat);
    stripeL.position.set(0.98, 0.56, 0);
    group.add(stripeL);
    const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 3.8), stripeMat);
    stripeR.position.set(-0.98, 0.56, 0);
    group.add(stripeR);

    const redStrobeMat = new THREE.MeshStandardMaterial({ color: 0xff0033, emissive: 0xff0033, emissiveIntensity: 1.2 });
    const blueStrobeMat = new THREE.MeshStandardMaterial({ color: 0x0066ff, emissive: 0x0066ff, emissiveIntensity: 1.2 });

    const strobeBar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.2), new THREE.MeshStandardMaterial({ color: 0x111 }));
    strobeBar.position.set(0, 1.26, -0.15);
    group.add(strobeBar);

    const redLight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.16), redStrobeMat);
    redLight.position.set(-0.25, 1.30, -0.15);
    group.add(redLight);
    const blueLight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.16), blueStrobeMat);
    blueLight.position.set(0.25, 1.30, -0.15);
    group.add(blueLight);

    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 14);
    for (const [wx, wz] of [[0.98, 1.3], [-0.98, 1.3], [0.98, -1.3], [-0.98, -1.3]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.34, wz);
      group.add(w);
    }

    group.userData.redLight = redLight;
    group.userData.blueLight = blueLight;
    return group;
  }

  syncPoliceUnits() {
    const targetCount = this.heat;
    while (this.policeUnits.length < targetCount) {
      const mesh = this.buildPoliceMesh();
      this.scene.add(mesh);
      this.policeUnits.push({
        mesh,
        x: 0,
        z: 0,
        heading: 0,
        speed: 0,
        active: false,
        laneOffset: 0,
        targetSpeed: 0,
      });
    }
  }

  destroyAllUnits() {
    for (const u of this.policeUnits) {
      if (u.mesh) this.scene.remove(u.mesh);
    }
    this.policeUnits = [];
  }

  spawnUnit(u, index, playerX, playerZ, playerHeading) {
    const forwardX = Math.sin(playerHeading);
    const forwardZ = Math.cos(playerHeading);
    const sideX = Math.cos(playerHeading);
    const sideZ = -Math.sin(playerHeading);
    const distance = 62 + index * 18;
    const sideOffset = index === 0 ? 6 : index === 1 ? -7 : 0;

    u.active = true;
    u.x = playerX - forwardX * distance + sideX * sideOffset;
    u.z = playerZ - forwardZ * distance + sideZ * sideOffset;
    u.heading = playerHeading;
    u.speed = 12 + this.heat * 3;
    u.targetSpeed = 22 + this.heat * 5;
    u.laneOffset = sideOffset;
    u.mesh.position.set(u.x, 0, u.z);
    u.mesh.rotation.y = u.heading;
  }

  getColliders() {
    return this.policeUnits
      .filter((u) => u.active)
      .map((u) => ({
        minX: u.x - 1.0,
        maxX: u.x + 1.0,
        minZ: u.z - 2.2,
        maxZ: u.z + 2.2,
      }));
  }

  update(dt, playerX, playerZ, playerSpeedKmh, playerHeading = 0) {
    if (this.heat === 0) return;

    this.pursuitTime += dt;

    const flash = Math.sin(performance.now() * 0.015) > 0;
    for (const u of this.policeUnits) {
      if (u.mesh && u.mesh.userData.redLight && u.mesh.userData.blueLight) {
        u.mesh.userData.redLight.material.emissiveIntensity = flash ? 1.5 : 0.1;
        u.mesh.userData.blueLight.material.emissiveIntensity = flash ? 0.1 : 1.5;
      }
    }

    let nearestPlayerDist = Infinity;

    for (let i = 0; i < this.policeUnits.length; i++) {
      const u = this.policeUnits[i];
      if (!u.active) this.spawnUnit(u, i, playerX, playerZ, playerHeading);

      const actualDx = playerX - u.x;
      const actualDz = playerZ - u.z;
      const actualDist = Math.hypot(actualDx, actualDz);
      nearestPlayerDist = Math.min(nearestPlayerDist, actualDist);

      const targetX = this.state === 'SEARCH' ? this.lastKnownX : playerX;
      const targetZ = this.state === 'SEARCH' ? this.lastKnownZ : playerZ;
      const dx = targetX - u.x;
      const dz = targetZ - u.z;

      const targetHeading = Math.atan2(dx, dz);
      let angleDiff = targetHeading - u.heading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const steeringStrength = 2.6 + this.heat * 0.25;
      u.heading += Math.max(-steeringStrength * dt, Math.min(steeringStrength * dt, angleDiff * 3.2 * dt));

      const heatBonus = this.heat * 4.5;
      const playerSpeedMs = Math.max(0, playerSpeedKmh / 3.6);
      const desired = Math.min(40, Math.max(18, playerSpeedMs + 4 + heatBonus));
      u.targetSpeed = desired;
      if (u.speed < u.targetSpeed) u.speed = Math.min(u.targetSpeed, u.speed + (10 + this.heat * 2) * dt);
      else u.speed = Math.max(u.targetSpeed, u.speed - 8 * dt);

      if (this.heat >= 2 && this.state === 'PURSUIT') {
        const sideX = Math.cos(playerHeading);
        const sideZ = -Math.sin(playerHeading);
        const desiredSide = (i % 2 === 0 ? 1 : -1) * Math.min(10, 4 + this.heat * 2);
        const sideTargetX = playerX + sideX * desiredSide;
        const sideTargetZ = playerZ + sideZ * desiredSide;
        const sideErrorX = sideTargetX - u.x;
        const sideErrorZ = sideTargetZ - u.z;
        if (Math.hypot(sideErrorX, sideErrorZ) > 2) {
          const flankHeading = Math.atan2(sideErrorX, sideErrorZ);
          let flankDiff = flankHeading - u.heading;
          while (flankDiff > Math.PI) flankDiff -= Math.PI * 2;
          while (flankDiff < -Math.PI) flankDiff += Math.PI * 2;
          u.heading += Math.max(-1.8 * dt, Math.min(1.8 * dt, flankDiff * dt));
        }
      }

      u.x += Math.sin(u.heading) * u.speed * dt;
      u.z += Math.cos(u.heading) * u.speed * dt;
      u.mesh.position.set(u.x, 0, u.z);
      u.mesh.rotation.y = u.heading;

    }

    if (this.state === 'PURSUIT') {
      if (nearestPlayerDist <= SEARCH_DISTANCE) {
        this.lastKnownX = playerX;
        this.lastKnownZ = playerZ;
      } else {
        this.state = 'SEARCH';
        this.searchTimer = 0;
        this.escapeCooldown = 0;
      }
    } else if (this.state === 'SEARCH') {
      if (nearestPlayerDist <= SEARCH_DISTANCE) {
        this.state = 'PURSUIT';
        this.searchTimer = 0;
        this.escapeCooldown = 0;
      } else {
        this.searchTimer += dt;
        this.escapeCooldown = Math.min(5, this.escapeCooldown + dt);
        if (this.searchTimer >= SEARCH_DURATION) {
          const rewardCash = this.heat * 600;
          const rewardRep = this.heat * 150;
          const oldHeat = this.heat;
          this.clearHeat();
          if (this.onEscaped) this.onEscaped({ heat: oldHeat, cash: rewardCash, rep: rewardRep });
          return;
        }
      }
    }

    if (nearestPlayerDist < BUST_DISTANCE && playerSpeedKmh < BUST_SPEED_KMH) {
      this.bustProgress += dt;
      if (this.bustProgress >= BUST_DURATION) {
        const fine = this.heat * 500;
        this.clearHeat();
        if (this.onBusted) this.onBusted({ fine });
        return;
      }
    } else {
      this.bustProgress = Math.max(0, this.bustProgress - dt * 0.7);
    }
  }

  getDebugState() {
    return {
      heat: this.heat,
      state: this.state,
      inPursuit: this.inPursuit,
      bustProgress: Number(this.bustProgress.toFixed(2)),
      escapeCooldown: Number(this.escapeCooldown.toFixed(2)),
      searchTimer: Number(this.searchTimer.toFixed(2)),
      pursuitTime: Number(this.pursuitTime.toFixed(2)),
      activeUnits: this.policeUnits.filter((u) => u.active).length,
      nearMissHeatCount: this.nearMissHeatCount,
      highSpeedTimer: Number(this.highSpeedTimer.toFixed(2)),
    };
  }
}
