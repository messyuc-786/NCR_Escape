import * as THREE from '/js/vendor/three.module.js';
import { buildVehicleMesh, VEHICLE_CATALOGUE } from '/js/vehicles/vehicle.js';

// AI Rival Racing Opponent for NCR ESCAPE (spec §13, §14).
// Competes on the race track against the player, navigating checkpoints and avoiding traffic.

export class AIOpponent {
  constructor(name, vehicleId, colorHex, startX, startZ, scene) {
    this.name = name;
    this.vehicleDef = VEHICLE_CATALOGUE[vehicleId] || VEHICLE_CATALOGUE['vantra-rs'];
    this.colorHex = colorHex;
    this.scene = scene;

    this.mesh = buildVehicleMesh(this.vehicleDef, this.colorHex);
    this.mesh.position.set(startX, 0, startZ);
    this.scene.add(this.mesh);

    this.x = startX;
    this.z = startZ;
    this.heading = 0;
    this.speed = 0;
    this.targetSpeed = this.vehicleDef.topSpeed * 0.88;
    this.checkpointIndex = 0;
    this.finished = false;
    this.finishTime = null;
    this.currentLap = 1;
  }

  reset(startX, startZ, heading = 0) {
    this.x = startX;
    this.z = startZ;
    this.heading = heading;
    this.speed = 0;
    this.checkpointIndex = 0;
    this.finished = false;
    this.finishTime = null;
    this.currentLap = 1;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
  }

  update(dt, checkpoints, trafficPositions, totalLaps = 1, elapsed = 0) {
    if (this.finished || !checkpoints || checkpoints.length === 0) return;

    const targetCp = checkpoints[this.checkpointIndex];
    if (!targetCp) return;

    // Steer towards target checkpoint
    const dx = targetCp.x - this.x;
    const dz = targetCp.z - this.z;
    const distToCheckpoint = Math.hypot(dx, dz);
    const targetHeading = Math.atan2(dx, dz);

    // Shortest angular difference
    let angleDiff = targetHeading - this.heading;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const turnRate = this.vehicleDef.handling * 1.35;
    this.heading += Math.max(-turnRate * dt, Math.min(turnRate * dt, angleDiff * 3.5 * dt));

    // Desired speed: slows down slightly for sharp turns
    const turnSeverity = Math.abs(angleDiff);
    const speedLimit = this.targetSpeed * (1 - Math.min(turnSeverity * 0.4, 0.45));

    // Forward raycast to avoid rear-ending traffic
    let forwardBlocked = false;
    if (trafficPositions) {
      for (const car of trafficPositions) {
        if (car.x === undefined) continue;
        const cdx = car.x - this.x;
        const cdz = car.z - this.z;
        const dist = Math.hypot(cdx, cdz);
        if (dist < 12) {
          const carAngle = Math.atan2(cdx, cdz);
          let headingDiff = Math.abs(carAngle - this.heading);
          if (headingDiff < 0.45) {
            forwardBlocked = true;
            break;
          }
        }
      }
    }

    if (forwardBlocked) {
      this.speed = Math.max(8, this.speed - this.vehicleDef.braking * 0.6 * dt);
    } else {
      if (this.speed < speedLimit) {
        this.speed += this.vehicleDef.acceleration * 0.8 * dt;
      } else {
        this.speed -= this.vehicleDef.braking * 0.4 * dt;
      }
    }

    // Move
    this.x += Math.sin(this.heading) * this.speed * dt;
    this.z += Math.cos(this.heading) * this.speed * dt;

    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;

    // Checkpoint detection
    if (distToCheckpoint < targetCp.radius * 1.1) {
      this.checkpointIndex++;
      if (this.checkpointIndex >= checkpoints.length) {
        if (this.currentLap < totalLaps) {
          this.currentLap++;
          this.checkpointIndex = 0;
        } else {
          this.finished = true;
          this.finishTime = elapsed;
        }
      }
    }
  }

  destroy() {
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
    }
  }
}
