import * as THREE from '../vendor/three.module.js';
import { buildVehicleMesh, VEHICLE_CATALOGUE } from '../vehicles/vehicle.js';

// Real-Time Multiplayer Client for NCR ESCAPE (spec §19).
// Synchronizes remote players in free-roam with smooth interpolation and custom paint models.

export class MultiplayerSystem {
  constructor(scene, onCountUpdated) {
    this.scene = scene;
    this.onCountUpdated = onCountUpdated;

    this.ws = null;
    this.localId = null;
    this.localName = 'Racer';
    this.remotePlayers = new Map();
    this.connected = false;
    this.lastSendTime = 0;

    this.connect();
  }

  connect() {
    try {
      if (typeof WebSocket === 'undefined') return;
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${location.host}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
      };

      this.ws.onerror = () => {
        // Silently handle offline / headless test environments
        this.connected = false;
      };

      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'init') {
            this.localId = msg.id;
            this.localName = msg.name;
          } else if (msg.type === 'world_sync') {
            this.handleWorldSync(msg.players, msg.count);
          } else if (msg.type === 'player_left') {
            this.removePlayer(msg.id);
          }
        } catch {}
      };

      this.ws.onclose = () => {
        this.connected = false;
        setTimeout(() => this.connect(), 6000);
      };
    } catch {}
  }

  handleWorldSync(playersList, count) {
    if (this.onCountUpdated) {
      this.onCountUpdated(count);
    }

    const activeIds = new Set();

    for (const p of playersList) {
      if (p.id === this.localId) continue;
      activeIds.add(p.id);

      let remote = this.remotePlayers.get(p.id);
      if (!remote) {
        const carDef = VEHICLE_CATALOGUE[p.vehicleId] || VEHICLE_CATALOGUE['vantra-rs'];
        const mesh = buildVehicleMesh(carDef, p.paintHex);
        this.scene.add(mesh);

        remote = {
          id: p.id,
          name: p.name,
          mesh,
          x: p.x,
          z: p.z,
          heading: p.heading,
          targetX: p.x,
          targetZ: p.z,
          targetHeading: p.heading,
          vehicleId: p.vehicleId,
          paintHex: p.paintHex,
        };
        this.remotePlayers.set(p.id, remote);
      } else {
        remote.targetX = p.x;
        remote.targetZ = p.z;
        remote.targetHeading = p.heading;
      }
    }

    for (const [id, r] of this.remotePlayers) {
      if (!activeIds.has(id)) {
        this.removePlayer(id);
      }
    }
  }

  removePlayer(id) {
    const remote = this.remotePlayers.get(id);
    if (remote && remote.mesh) {
      this.scene.remove(remote.mesh);
    }
    this.remotePlayers.delete(id);
  }

  update(dt, localCarState, vehicleDef, customPaint) {
    for (const remote of this.remotePlayers.values()) {
      remote.x += (remote.targetX - remote.x) * Math.min(1, dt * 12);
      remote.z += (remote.targetZ - remote.z) * Math.min(1, dt * 12);

      let angleDiff = remote.targetHeading - remote.heading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      remote.heading += angleDiff * Math.min(1, dt * 12);

      if (remote.mesh) {
        remote.mesh.position.set(remote.x, 0, remote.z);
        remote.mesh.rotation.y = remote.heading;
      }
    }

    const now = performance.now();
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN && now - this.lastSendTime >= 50) {
      this.lastSendTime = now;
      try {
        this.ws.send(JSON.stringify({
          type: 'update',
          x: Number(localCarState.x.toFixed(2)),
          z: Number(localCarState.z.toFixed(2)),
          heading: Number(localCarState.heading.toFixed(3)),
          speed: Number(localCarState.speed.toFixed(2)),
          vehicleId: vehicleDef.id,
          paintHex: customPaint || vehicleDef.defaultColor,
          isBoosting: localCarState.isBoosting,
          driftYaw: Number(localCarState.driftYaw.toFixed(2)),
        }));
      } catch {}
    }
  }

  getRemoteColliders() {
    const colliders = [];
    for (const r of this.remotePlayers.values()) {
      colliders.push({
        minX: r.x - 1.0,
        maxX: r.x + 1.0,
        minZ: r.z - 2.2,
        maxZ: r.z + 2.2,
      });
    }
    return colliders;
  }
}
