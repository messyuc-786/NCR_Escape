import * as THREE from '/js/vendor/three.module.js';
import { raceEvents, EVENT_TYPES } from '/js/racing/events.js';

// Phase 5 race framework. One reusable state machine drives every event; nothing about
// "cyber-sprint-1" specifically appears below. Adding another sprint is a data edit in
// racing/events.js. Other event types (circuit/drift/etc.) need their own completion rule
// in `checkCompletion` — declared in events.js, not yet implemented, not faked.

export const RACE_STATE = {
  IDLE: 'idle',            // free driving, no event in range
  PROMPT: 'prompt',        // player is inside a marker, can press E
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
    this.elapsed = 0;
    this.countdown = 0;
    this.lastResult = null;

    this.markerMeshes = new Map();
    this.checkpointMeshes = [];

    for (const ev of raceEvents) {
      this.markerMeshes.set(ev.id, this.buildMarker(ev));
    }
  }

  buildMarker(ev) {
    const group = new THREE.Group();
    // Slim beacon rather than a wide cylinder: a wide one fills the screen the moment the
    // player drives inside its radius, which is exactly when they most need to read the world.
    // The beacon sits in a live driving lane, so it must be readable without becoming an
    // obstacle the player tries to steer around. Earlier version was 1.1m x 15m at 30%
    // opacity, which rendered as a solid orange bar blocking the road ahead (caught in a
    // screenshot, not by any assertion). Thin + faint + lifted clear of eye level instead.
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

    // Keep a handle on the pillar (and where it stands) so update() can fade it out as the
    // player closes in — the chase camera sits ~9m behind the car and would otherwise end up
    // *inside* this cylinder, filling half the screen with flat orange.
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
      // Open-ended ring wall the player drives through; low opacity + no depth write so it
      // never blocks the view of the road when you're inside it.
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

  /** Only the current checkpoint (and the next one, dimmer) is shown — keeps the world readable. */
  refreshCheckpointVisibility() {
    this.checkpointMeshes.forEach((m, i) => {
      m.visible = i === this.checkpointIndex || i === this.checkpointIndex + 1;
      m.material.opacity = i === this.checkpointIndex ? 0.26 : 0.10;
    });
  }

  startEvent(ev) {
    this.activeEvent = ev;
    this.state = RACE_STATE.COUNTDOWN;
    this.countdown = COUNTDOWN_SECONDS;
    this.checkpointIndex = 0;
    this.elapsed = 0;
    this.lastResult = null;
    this.buildCheckpointMeshes(ev);
    this.refreshCheckpointVisibility();
    this.markerMeshes.get(ev.id).visible = false;
  }

  abandon() {
    if (this.activeEvent) this.markerMeshes.get(this.activeEvent.id).visible = true;
    this.clearCheckpointMeshes();
    this.activeEvent = null;
    this.state = RACE_STATE.IDLE;
  }

  /** Completion rule per event type. Only sprint is implemented (see events.js). */
  checkCompletion(ev) {
    switch (ev.type) {
      case EVENT_TYPES.SPRINT:
        return this.checkpointIndex >= ev.checkpoints.length;
      default:
        // Unimplemented type — never silently "completes".
        return false;
    }
  }

  update(dt, playerX, playerZ, interactPressed) {
    // Pulse markers so they read as interactive
    const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.08;
    for (const g of this.markerMeshes.values()) {
      g.scale.set(pulse, 1, pulse);

      // Fade the vertical beacon out over the last ~26m. Beyond that it's the thing that
      // makes the event findable; up close the prompt card has taken over and the pillar is
      // only in the way. Full transparency by 12m keeps the chase camera from ever passing
      // through a visible surface. The ground ring stays lit the whole time.
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
        if (d < ev.marker.radius) { this.nearbyEvent = ev; break; }
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
      const cp = ev.checkpoints[this.checkpointIndex];
      if (cp) {
        const d = Math.hypot(playerX - cp.x, playerZ - cp.z);
        if (d < cp.radius) {
          this.checkpointIndex++;
          this.refreshCheckpointVisibility();
        }
      }

      if (this.checkCompletion(ev)) {
        this.finish(ev);
      }
      return;
    }
  }

  finish(ev) {
    this.state = RACE_STATE.FINISHED;
    const beatTarget = this.elapsed <= ev.targetTime;
    const cash = ev.reward.cash + (beatTarget ? ev.bonusReward.cash : 0);
    const xp = ev.reward.xp + (beatTarget ? ev.bonusReward.xp : 0);
    const rep = ev.reward.rep + (beatTarget ? ev.bonusReward.rep : 0);

    this.lastResult = {
      eventLabel: ev.label,
      time: this.elapsed,
      targetTime: ev.targetTime,
      beatTarget,
      cash, xp, rep,
    };

    this.clearCheckpointMeshes();
    this.markerMeshes.get(ev.id).visible = true;
    if (this.onReward) this.onReward(this.lastResult);
  }

  dismissResults() {
    this.activeEvent = null;
    this.state = RACE_STATE.IDLE;
  }

  getDebugState() {
    return {
      state: this.state,
      checkpointIndex: this.checkpointIndex,
      elapsed: Number(this.elapsed.toFixed(2)),
      lastResult: this.lastResult,
    };
  }
}
