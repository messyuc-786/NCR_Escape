import * as THREE from '/js/vendor/three.module.js';
import { getIntersections, axisOf, getDrivableSegments } from '/js/roads/network.js';

// Phase 4b — intersection right-of-way.
//
// Junctions are derived from road data (roads/network.js getIntersections), not hand-placed,
// so a new road in the data file produces new junctions and new signals automatically.
//
// Phase model: roads are grouped by which world axis they run along, and only one axis holds
// green at a time, with an all-red clearance gap between phases so cars already inside the box
// can get out before the cross traffic is released. This is the minimum needed for cars to
// share a junction without driving through each other.

const GREEN_TIME = 9.0;
const YELLOW_TIME = 2.0;
const ALL_RED_TIME = 1.2;

export const LIGHT = { GREEN: 'green', YELLOW: 'yellow', RED: 'red' };

const COLORS = {
  [LIGHT.GREEN]: 0x35d07f,
  [LIGHT.YELLOW]: 0xffc23d,
  [LIGHT.RED]: 0xff3b30,
};

export class IntersectionController {
  constructor(scene) {
    this.scene = scene;
    this.intersections = getIntersections();

    const segs = getDrivableSegments();
    this.axisBySeg = new Map(segs.map((s) => [s.id, axisOf(s)]));

    for (const ix of this.intersections) {
      // Which axes actually meet here. If a junction somehow has only one axis it stays green.
      ix.axes = [...new Set(ix.segIds.map((id) => this.axisBySeg.get(id)))];
      ix.greenAxis = ix.axes[0];
      ix.phase = LIGHT.GREEN;
      // Stagger phases so every junction in the district doesn't flip in lockstep.
      ix.timer = Math.random() * GREEN_TIME;
      ix.signals = this.buildSignals(ix);
    }
  }

  /** A signal head on each corner, facing the road it governs. */
  buildSignals(ix) {
    const heads = [];
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2f38 });

    for (const segId of ix.segIds) {
      const axis = this.axisBySeg.get(segId);
      // Place the head just outside the junction box, offset across the road it controls.
      const offsets = axis === 'z'
        ? [{ dx: ix.half + 2.2, dz: -ix.half - 1.5 }, { dx: -ix.half - 2.2, dz: ix.half + 1.5 }]
        : [{ dx: -ix.half - 1.5, dz: ix.half + 2.2 }, { dx: ix.half + 1.5, dz: -ix.half - 2.2 }];

      for (const o of offsets) {
        const group = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 5.2, 8), poleMat);
        pole.position.y = 2.6;
        group.add(pole);

        const lensMat = new THREE.MeshStandardMaterial({
          color: COLORS[LIGHT.RED],
          emissive: COLORS[LIGHT.RED],
          emissiveIntensity: 1.1,
        });
        const lens = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), lensMat);
        lens.position.y = 5.0;
        group.add(lens);

        group.position.set(ix.x + o.dx, 0, ix.z + o.dz);
        this.scene.add(group);
        heads.push({ axis, lens });
      }
    }
    return heads;
  }

  update(dt) {
    for (const ix of this.intersections) {
      if (ix.axes.length < 2) continue; // nothing to arbitrate

      ix.timer += dt;
      if (ix.phase === LIGHT.GREEN && ix.timer >= GREEN_TIME) {
        ix.phase = LIGHT.YELLOW;
        ix.timer = 0;
      } else if (ix.phase === LIGHT.YELLOW && ix.timer >= YELLOW_TIME) {
        ix.phase = LIGHT.RED; // all-red clearance
        ix.timer = 0;
      } else if (ix.phase === LIGHT.RED && ix.timer >= ALL_RED_TIME) {
        // Hand green to the other axis
        const idx = ix.axes.indexOf(ix.greenAxis);
        ix.greenAxis = ix.axes[(idx + 1) % ix.axes.length];
        ix.phase = LIGHT.GREEN;
        ix.timer = 0;
      }

      for (const head of ix.signals) {
        const state = this.stateFor(ix, head.axis);
        const c = COLORS[state];
        head.lens.material.color.setHex(c);
        head.lens.material.emissive.setHex(c);
      }
    }
  }

  /** Light state an approaching car on `axis` sees at this junction. */
  stateFor(ix, axis) {
    if (ix.axes.length < 2) return LIGHT.GREEN;
    if (ix.greenAxis !== axis) return LIGHT.RED;
    return ix.phase; // green or yellow for the active axis; all-red reads as red
  }

  mayProceed(ix, axis) {
    const s = this.stateFor(ix, axis);
    // Yellow still lets a car clear the box rather than stopping dead on the line.
    return s === LIGHT.GREEN || s === LIGHT.YELLOW;
  }

  axisForSegment(segId) {
    return this.axisBySeg.get(segId);
  }

  /** Test hook: lets the smoke test assert opposing axes are never simultaneously green. */
  getDebugState() {
    return this.intersections.map((ix) => ({
      id: ix.id,
      x: ix.x,
      z: ix.z,
      greenAxis: ix.greenAxis,
      phase: ix.phase,
      states: Object.fromEntries(ix.axes.map((a) => [a, this.stateFor(ix, a)])),
    }));
  }
}
