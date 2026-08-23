import * as THREE from '/js/vendor/three.module.js';

// Police Pursuit & Heat Level System for NCR ESCAPE (spec §16).
// Controls Heat Levels (1-3 stars), PCR police cruiser AI pursuit, escape cooldowns, and bust penalties.

export class PoliceSystem {
  constructor(scene, onBusted, onEscaped) {
    this.scene = scene;
    this.onBusted = onBusted;
    this.onEscaped = onEscaped;

    this.heat = 0; // 0 to 3 stars
    this.policeUnits = [];
    this.bustProgress = 0;
    this.escapeCooldown = 0;
    this.inPursuit = false;
  }

  addHeat(amount = 1) {
    const prev = this.heat;
    this.heat = Math.min(3, Math.max(1, this.heat + amount));
    this.inPursuit = true;
    this.escapeCooldown = 0;

    if (this.heat > prev) {
      this.syncPoliceUnits();
    }
  }

  clearHeat() {
    this.heat = 0;
    this.inPursuit = false;
    this.bustProgress = 0;
    this.escapeCooldown = 0;
    this.destroyAllUnits();
  }

  buildPoliceMesh() {
    const group = new THREE.Group();

    // White PCR body
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

    // Blue side stripe
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 3.8), stripeMat);
    stripeL.position.set(0.98, 0.56, 0);
    group.add(stripeL);
    const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 3.8), stripeMat);
    stripeR.position.set(-0.98, 0.56, 0);
    group.add(stripeR);

    // Roof Police Strobe Light Bar (Red & Blue)
    const redStrobeMat = new THREE.MeshStandardMaterial({
      color: 0xff0033,
      emissive: 0xff0033,
      emissiveIntensity: 1.2,
    });
    const blueStrobeMat = new THREE.MeshStandardMaterial({
      color: 0x0066ff,
      emissive: 0x0066ff,
      emissiveIntensity: 1.2,
    });

    const strobeBar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.2), new THREE.MeshStandardMaterial({ color: 0x111 }));
    strobeBar.position.set(0, 1.26, -0.15);
    group.add(strobeBar);

    const redLight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.16), redStrobeMat);
    redLight.position.set(-0.25, 1.30, -0.15);
    group.add(redLight);

    const blueLight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.16), blueStrobeMat);
    blueLight.position.set(0.25, 1.30, -0.15);
    group.add(blueLight);

    // Wheels
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
      });
    }
  }

  destroyAllUnits() {
    for (const u of this.policeUnits) {
      if (u.mesh) this.scene.remove(u.mesh);
    }
    this.policeUnits = [];
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

  update(dt, playerX, playerZ, playerSpeedKmh) {
    if (this.heat === 0) return;

    // Strobe lights animation
    const flash = Math.sin(performance.now() * 0.015) > 0;
    for (const u of this.policeUnits) {
      if (u.mesh && u.mesh.userData.redLight && u.mesh.userData.blueLight) {
        u.mesh.userData.redLight.material.emissiveIntensity = flash ? 1.5 : 0.1;
        u.mesh.userData.blueLight.material.emissiveIntensity = flash ? 0.1 : 1.5;
      }
    }

    let nearestDist = Infinity;

    for (let i = 0; i < this.policeUnits.length; i++) {
      const u = this.policeUnits[i];

      // Spawn behind player if inactive
      if (!u.active) {
        u.active = true;
        u.x = playerX + (i % 2 === 0 ? 8 : -8);
        u.z = playerZ - 35 - i * 15;
        u.heading = 0;
        u.speed = (playerSpeedKmh / 3.6) * 0.9;
        u.mesh.position.set(u.x, 0, u.z);
      }

      // Pursuit AI: calculate heading to player
      const dx = playerX - u.x;
      const dz = playerZ - u.z;
      const dist = Math.hypot(dx, dz);
      if (dist < nearestDist) nearestDist = dist;

      const targetHeading = Math.atan2(dx, dz);
      let angleDiff = targetHeading - u.heading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      u.heading += Math.max(-2.5 * dt, Math.min(2.5 * dt, angleDiff * 3.0 * dt));

      // Pursuit speed: scales with heat level
      const maxSpeed = 22 + this.heat * 5.0; // up to 37 m/s (~133 km/h)
      if (u.speed < maxSpeed) {
        u.speed += 12 * dt;
      }

      u.x += Math.sin(u.heading) * u.speed * dt;
      u.z += Math.cos(u.heading) * u.speed * dt;

      u.mesh.position.set(u.x, 0, u.z);
      u.mesh.rotation.y = u.heading;
    }

    // Bust Detection: Player stopped near police
    if (playerSpeedKmh < 6 && nearestDist < 9.0) {
      this.bustProgress += dt;
      if (this.bustProgress >= 3.0) {
        // Busted!
        const fine = this.heat * 500;
        this.clearHeat();
        if (this.onBusted) this.onBusted({ fine });
        return;
      }
    } else {
      this.bustProgress = Math.max(0, this.bustProgress - dt * 0.5);
    }

    // Escape Cooldown: Player broke away from police
    if (nearestDist > 90.0) {
      this.escapeCooldown += dt;
      if (this.escapeCooldown >= 5.0) {
        // Escaped!
        const rewardCash = this.heat * 600;
        const rewardRep = this.heat * 150;
        const oldHeat = this.heat;
        this.clearHeat();
        if (this.onEscaped) this.onEscaped({ heat: oldHeat, cash: rewardCash, rep: rewardRep });
      }
    } else {
      this.escapeCooldown = Math.max(0, this.escapeCooldown - dt * 1.5);
    }
  }

  getDebugState() {
    return {
      heat: this.heat,
      inPursuit: this.inPursuit,
      bustProgress: Number(this.bustProgress.toFixed(2)),
      escapeCooldown: Number(this.escapeCooldown.toFixed(2)),
      activeUnits: this.policeUnits.filter((u) => u.active).length,
    };
  }
}
