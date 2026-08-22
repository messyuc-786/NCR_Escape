import * as THREE from '/js/vendor/three.module.js';
import { raceEvents, EVENT_TYPES } from '/js/racing/events.js';
import { AIOpponent } from '/js/racing/aiOpponent.js';

// Reusable Race Framework for NCR ESCAPE (spec §13-15).
// Supports Sprints, Multi-Lap Circuits, AI Opponents, Checkpoints, and Live Position Tracking.

export const RACE_STATE = {
  IDLE: 'idle',
  PROMPT: 'prompt',
  COUNTDOWN: 'countdown',
  RACING: 'racing',
  FINISHED: 'finished',
};

const COUNTDOWN_SECONDS = 3;

export class RaceSystem {
  constructor(scene, onReward) {
    this.scene = scene;
    this.onReward = onReward;
    this.state = RACE_STATE.IDLE;
    this.activeEvent = null;
    this.nearbyEvent = null;
    this.checkpointIndex = 0;
    this.currentLap = 1;
    this.totalLaps = 1;
    this.elapsed = 0;
    this.countdown = 0;
    this.lastResult = null;
    this.playerPosition = 1;

    this.markerMeshes = new Map();
    this.checkpointMeshes = [];
    this.aiOpponents = [];

    for (const ev of raceEvents) {
      this.markerMeshes.set(ev.id, this.buildMarker(ev));
    }
  }

  buildMarker(ev) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff7a18, transparent: true, opacity: 0.16,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 11, 12, 1, true), mat);
    pillar.position.set(ev.marker.x, 6.5, ev.marker.z);
    group.add(pillar);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(ev.marker.radius * 0.82, ev.marker.radius, 40),
      new THREE.MeshBasicMaterial({
        color: 0xff7a18, side: THREE.DoubleSide,
        transparent: true, opacity: 0.85, depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(ev.marker.x, 0.06, ev.marker.z);
    group.add(ring);

    group.userData.pillar = pillar;
    group.userData.markerX = ev.marker.x;
    group.userData.markerZ = ev.marker.z;

    this.scene.add(group);
    return group;
  }

  buildCheckpointMeshes(ev) {
    this.clearCheckpointMeshes();
    ev.checkpoints.forEach((cp, i) => {
      const isFinish = i === ev.checkpoints.length - 1;
      const color = isFinish ? 0x3ddc84 : 0x4aa8ff;
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.22,
        depthWrite: false, side: THREE.DoubleSide,
      });
      const gate = new THREE.Mesh(
        new THREE.CylinderGeometry(cp.radius, cp.radius, 9, 26, 1, true), mat
      );
      gate.position.set(cp.x, 4.5, cp.z);
      gate.visible = false;
      this.scene.add(gate);
      this.checkpointMeshes.push(gate);
    });
  }

  clearCheckpointMeshes() {
    for (const m of this.checkpointMeshes) this.scene.remove(m);
    this.checkpointMeshes = [];
  }

  refreshCheckpointVisibility() {
    this.checkpointMeshes.forEach((m, i) => {
      m.visible = i === this.checkpointIndex || i === this.checkpointIndex + 1;
      m.material.opacity = i === this.checkpointIndex ? 0.26 : 0.10;
    });
  }

  spawnAIOpponents(ev) {
    this.clearAIOpponents();
    if (!ev.opponents || ev.opponents.length === 0) return;

    ev.opponents.forEach((opp, i) => {
      // Grid start slots behind/alongside marker
      const lateralOffset = (i % 2 === 0 ? 1 : -1) * (3.5 + Math.floor(i / 2) * 2.0);
      const longitudinalOffset = -6 - (i + 1) * 7.0;
      const startX = ev.marker.x + lateralOffset;
      const startZ = ev.marker.z + longitudinalOffset;

      const ai = new AIOpponent(opp.name, opp.vehicleId, opp.color, startX, startZ, this.scene);
      this.aiOpponents.push(ai);
    });
  }

  clearAIOpponents() {
    for (const ai of this.aiOpponents) {
      ai.destroy();
    }
    this.aiOpponents = [];
  }

  startEvent(ev) {
    this.activeEvent = ev;
    this.state = RACE_STATE.COUNTDOWN;
    this.countdown = COUNTDOWN_SECONDS;
    this.checkpointIndex = 0;
    this.currentLap = 1;
    this.totalLaps = ev.laps || 1;
    this.elapsed = 0;
    this.lastResult = null;
    this.playerPosition = 1;

    this.buildCheckpointMeshes(ev);
    this.refreshCheckpointVisibility();
    this.spawnAIOpponents(ev);

    if (this.markerMeshes.has(ev.id)) {
      this.markerMeshes.get(ev.id).visible = false;
    }
  }

  abandon() {
    if (this.activeEvent && this.markerMeshes.has(this.activeEvent.id)) {
      this.markerMeshes.get(this.activeEvent.id).visible = true;
    }
    this.clearCheckpointMeshes();
    this.clearAIOpponents();
    this.activeEvent = null;
    this.state = RACE_STATE.IDLE;
  }

  update(dt, playerX, playerZ, interactPressed, trafficPositions) {
    // Pulse event markers
    const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.08;
    for (const g of this.markerMeshes.values()) {
      g.scale.set(pulse, 1, pulse);

      const pillar = g.userData.pillar;
      if (pillar) {
        const d = Math.hypot(playerX - g.userData.markerX, playerZ - g.userData.markerZ);
        const fade = Math.max(0, Math.min(1, (d - 12) / 14));
        pillar.material.opacity = 0.16 * fade;
        pillar.visible = fade > 0.01;
      }
    }

    if (this.state === RACE_STATE.IDLE || this.state === RACE_STATE.PROMPT) {
      this.nearbyEvent = null;
      for (const ev of raceEvents) {
        const d = Math.hypot(playerX - ev.marker.x, playerZ - ev.marker.z);
        if (d < ev.marker.radius) {
          this.nearbyEvent = ev;
          break;
        }
      }
      this.state = this.nearbyEvent ? RACE_STATE.PROMPT : RACE_STATE.IDLE;

      if (this.state === RACE_STATE.PROMPT && interactPressed) {
        this.startEvent(this.nearbyEvent);
      }
      return;
    }

    if (this.state === RACE_STATE.COUNTDOWN) {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.countdown = 0;
        this.state = RACE_STATE.RACING;
      }
      return;
    }

    if (this.state === RACE_STATE.RACING) {
      this.elapsed += dt;
      const ev = this.activeEvent;

      // Update AI Opponents
      for (const ai of this.aiOpponents) {
        ai.update(dt, ev.checkpoints, trafficPositions, this.totalLaps, this.elapsed);
      }

      // Check Player Checkpoint
      const cp = ev.checkpoints[this.checkpointIndex];
      if (cp) {
        const d = Math.hypot(playerX - cp.x, playerZ - cp.z);
        if (d < cp.radius) {
          this.checkpointIndex++;
          if (this.checkpointIndex >= ev.checkpoints.length) {
            if (this.currentLap < this.totalLaps) {
              this.currentLap++;
              this.checkpointIndex = 0;
            } else {
              this.finish(ev);
              return;
            }
          }
          this.refreshCheckpointVisibility();
        }
      }

      // Calculate Player Position Relative to AI Opponents
      this.updatePlayerPosition(playerX, playerZ, ev);
    }
  }

  updatePlayerPosition(playerX, playerZ, ev) {
    if (!this.aiOpponents.length) {
      this.playerPosition = 1;
      return;
    }

    const playerTotalScore = (this.currentLap - 1) * ev.checkpoints.length + this.checkpointIndex;
    const targetCp = ev.checkpoints[this.checkpointIndex] || ev.checkpoints[0];
    const playerDist = Math.hypot(targetCp.x - playerX, targetCp.z - playerZ);

    let position = 1;
    for (const ai of this.aiOpponents) {
      if (ai.finished) {
        position++;
        continue;
      }
      const aiTotalScore = (ai.currentLap - 1) * ev.checkpoints.length + ai.checkpointIndex;
      if (aiTotalScore > playerTotalScore) {
        position++;
      } else if (aiTotalScore === playerTotalScore) {
        const aiDist = Math.hypot(targetCp.x - ai.x, targetCp.z - ai.z);
        if (aiDist < playerDist) {
          position++;
        }
      }
    }

    this.playerPosition = position;
  }

  finish(ev) {
    this.state = RACE_STATE.FINISHED;
    const beatTarget = this.elapsed <= ev.targetTime;
    const isPodium = this.playerPosition <= 3;
    const posMultiplier = this.playerPosition === 1 ? 1.0 : this.playerPosition === 2 ? 0.75 : this.playerPosition === 3 ? 0.55 : 0.35;

    const baseCash = Math.round(ev.reward.cash * posMultiplier);
    const baseXP = Math.round(ev.reward.xp * posMultiplier);
    const baseRep = Math.round(ev.reward.rep * posMultiplier);

    const bonusCash = beatTarget ? ev.bonusReward.cash : 0;
    const bonusXP = beatTarget ? ev.bonusReward.xp : 0;
    const bonusRep = beatTarget ? ev.bonusReward.rep : 0;

    const cash = baseCash + bonusCash;
    const xp = baseXP + bonusXP;
    const rep = baseRep + bonusRep;

    this.lastResult = {
      eventLabel: ev.label,
      time: this.elapsed,
      targetTime: ev.targetTime,
      beatTarget,
      position: this.playerPosition,
      totalRacers: this.aiOpponents.length + 1,
      cash, xp, rep,
    };

    this.clearCheckpointMeshes();
    if (this.markerMeshes.has(ev.id)) {
      this.markerMeshes.get(ev.id).visible = true;
    }
    if (this.onReward) this.onReward(this.lastResult);
  }

  dismissResults() {
    this.clearAIOpponents();
    this.activeEvent = null;
    this.state = RACE_STATE.IDLE;
  }

  getDebugState() {
    return {
      state: this.state,
      checkpointIndex: this.checkpointIndex,
      currentLap: this.currentLap,
      totalLaps: this.totalLaps,
      position: this.playerPosition,
      elapsed: Number(this.elapsed.toFixed(2)),
      lastResult: this.lastResult,
    };
  }
}
