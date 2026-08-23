import * as THREE from '../vendor/three.module.js';

// Speed Trap Radar System for NCR ESCAPE (spec §15).
// Detects high-speed expressway runs, flashes radar camera, and awards speed bonuses.

export const SPEED_TRAPS = [
  { id: 'trap-cyber-blvd', name: 'Cyber Boulevard Radar', x: 0, z: -50, targetKmh: 90, reward: 250 },
  { id: 'trap-delhi-ring', name: 'Delhi Ring Road Radar', x: 0, z: -520, targetKmh: 100, reward: 350 },
  { id: 'trap-yamuna-bridge', name: 'Yamuna Bridge Speed Trap', x: 0, z: -910, targetKmh: 110, reward: 500 },
  { id: 'trap-noida-expwy', name: 'Noida Expressway Super Radar', x: 0, z: -1260, targetKmh: 120, reward: 650 },
  { id: 'trap-sector143', name: 'Sector 143 Velocity Trap', x: 0, z: -1580, targetKmh: 115, reward: 550 },
];

export class SpeedTrapSystem {
  constructor(scene, onTrapTriggered) {
    this.scene = scene;
    this.onTrapTriggered = onTrapTriggered;
    this.traps = SPEED_TRAPS;
    this.cooldowns = new Map();

    this.buildRadarGantries();
  }

  buildRadarGantries() {
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const cameraMat = new THREE.MeshStandardMaterial({
      color: 0x00d4aa,
      emissive: 0x00d4aa,
      emissiveIntensity: 0.8,
    });

    this.traps.forEach((trap) => {
      const group = new THREE.Group();

      const beam = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 0.4), gantryMat);
      beam.position.set(0, 7.5, 0);
      group.add(beam);

      for (const rx of [-4, 0, 4]) {
        const cam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.6), cameraMat);
        cam.position.set(rx, 7.2, 0);
        group.add(cam);
      }

      group.position.set(trap.x, 0, trap.z);
      this.scene.add(group);
    });
  }

  update(dt, playerX, playerZ, playerSpeedKmh) {
    const now = performance.now();

    for (const trap of this.traps) {
      const lastTrigger = this.cooldowns.get(trap.id) || 0;
      if (now - lastTrigger < 8000) continue; // 8s cooldown per trap

      const dist = Math.hypot(playerX - trap.x, playerZ - trap.z);
      if (dist < 14) {
        this.cooldowns.set(trap.id, now);
        const beatTarget = playerSpeedKmh >= trap.targetKmh;
        if (this.onTrapTriggered) {
          this.onTrapTriggered({
            trap,
            speedKmh: Math.round(playerSpeedKmh),
            beatTarget,
            reward: beatTarget ? trap.reward : 0,
          });
        }
      }
    }
  }
}
