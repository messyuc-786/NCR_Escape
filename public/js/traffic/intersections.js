import * as THREE from '../vendor/three.module.js';
import { getIntersections, axisOf, getDrivableSegments } from '../roads/network.js';

// Phase 4b & Phase 1 — Living World Dynamic Traffic Lights
//
// Full 3-aspect overhead cantilever and curb mast signal heads with Red, Yellow, and Green
// lenses, automated phase arbitrations, and synchronized cycle transitions.

// Timings defined globally and centralized (Step 3)
export const SIGNAL_TIMINGS = {
  GREEN: 22.0,
  YELLOW: 4.0,
  ALL_RED: 1.5,
};

export const LIGHT = { GREEN: 'green', YELLOW: 'yellow', RED: 'red' };

const ACTIVE_COLORS = {
  [LIGHT.GREEN]: 0x00e676,
  [LIGHT.YELLOW]: 0xffc400,
  [LIGHT.RED]: 0xff1744,
};

const INACTIVE_COLORS = {
  [LIGHT.GREEN]: 0x042412,
  [LIGHT.YELLOW]: 0x2e2002,
  [LIGHT.RED]: 0x2b060b,
};

export class IntersectionController {
  constructor(scene) {
    this.scene = scene;
    this.intersections = getIntersections();

    const segs = getDrivableSegments();
    this.axisBySeg = new Map(segs.map((s) => [s.id, axisOf(s)]));

    // Calculate total cycle length
    const cycleLength = SIGNAL_TIMINGS.GREEN + SIGNAL_TIMINGS.YELLOW + SIGNAL_TIMINGS.ALL_RED;

    for (const ix of this.intersections) {
      // Which axes actually meet here. If a junction has only one axis it stays green.
      ix.axes = [...new Set(ix.segIds.map((id) => this.axisBySeg.get(id)))];
      ix.greenAxis = ix.axes[0];
      ix.phase = LIGHT.GREEN;

      // Spatial cascade wave synchronization (Step 17)
      // Cascades green states down the Z and X road coordinate lines
      ix.timer = Math.abs(ix.x * 0.025 + ix.z * 0.025) % cycleLength;

      ix.signals = this.buildSignals(ix);

      // Centralized PointLight for night/sunset glow illumination (Step 15)
      if (ix.axes.length >= 2) {
        const pLight = new THREE.PointLight(0xffffff, 0, 18.0, 1.2);
        pLight.position.set(ix.x, 6.2, ix.z);
        this.scene.add(pLight);
        ix.pointLight = pLight;
      }
    }
  }

  /** Builds authentic 3-aspect gantry cantilever overhead & curb signal heads for each approaching road. */
  buildSignals(ix) {
    const heads = [];
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e242d, roughness: 0.6, metalness: 0.8 });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x0f1318, roughness: 0.8, metalness: 0.3 });
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.9 });

    for (const segId of ix.segIds) {
      const axis = this.axisBySeg.get(segId);
      const isZ = axis === 'z';

      const offsets = isZ
        ? [{ dx: ix.half + 2.2, dz: -ix.half - 1.5, rotY: Math.PI }, { dx: -ix.half - 2.2, dz: ix.half + 1.5, rotY: 0 }]
        : [{ dx: -ix.half - 1.5, dz: ix.half + 2.2, rotY: Math.PI / 2 }, { dx: ix.half + 1.5, dz: -ix.half - 2.2, rotY: -Math.PI / 2 }];

      for (const o of offsets) {
        const group = new THREE.Group();

        // 1. Vertical Gantry Pole
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6.4, 10), poleMat);
        mast.position.y = 3.2;
        group.add(mast);

        // 2. Cantilever Horizontal Arm extending toward lane
        const armLength = 4.2;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, armLength, 8), poleMat);
        arm.rotation.z = Math.PI / 2;
        arm.position.set(-armLength / 2, 6.0, 0);
        group.add(arm);

        // Helper to construct a 3-aspect housing with Red, Amber, Green lenses and night PointLight
        const createSignalHead = (posX, posY, posZ, scale = 1.0) => {
          const headGroup = new THREE.Group();

          // Main housing box
          const box = new THREE.Mesh(new THREE.BoxGeometry(0.55 * scale, 1.45 * scale, 0.38 * scale), boxMat);
          headGroup.add(box);

          // Yellow backplate border
          const plate = new THREE.Mesh(
            new THREE.BoxGeometry(0.7 * scale, 1.6 * scale, 0.04 * scale),
            new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.7 })
          );
          plate.position.z = -0.16 * scale;
          headGroup.add(plate);

          // 3 Lenses: Top (Red), Mid (Yellow), Bot (Green)
          const lensGeo = new THREE.SphereGeometry(0.16 * scale, 14, 10);

          const redMat = new THREE.MeshStandardMaterial({
            color: INACTIVE_COLORS[LIGHT.RED],
            emissive: 0x000000,
            roughness: 0.2,
            metalness: 0.1,
          });
          const redLens = new THREE.Mesh(lensGeo, redMat);
          redLens.position.set(0, 0.44 * scale, 0.18 * scale);
          headGroup.add(redLens);

          const yelMat = new THREE.MeshStandardMaterial({
            color: INACTIVE_COLORS[LIGHT.YELLOW],
            emissive: 0x000000,
            roughness: 0.2,
            metalness: 0.1,
          });
          const yelLens = new THREE.Mesh(lensGeo, yelMat);
          yelLens.position.set(0, 0, 0.18 * scale);
          headGroup.add(yelLens);

          const grnMat = new THREE.MeshStandardMaterial({
            color: INACTIVE_COLORS[LIGHT.GREEN],
            emissive: 0x000000,
            roughness: 0.2,
            metalness: 0.1,
          });
          const grnLens = new THREE.Mesh(lensGeo, grnMat);
          grnLens.position.set(0, -0.44 * scale, 0.18 * scale);
          headGroup.add(grnLens);

          // Hood visors over lenses
          [-0.44, 0, 0.44].forEach((ly) => {
            const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.18 * scale, 0.18 * scale, 8, 1, true, 0, Math.PI), visorMat);
            hood.rotation.x = Math.PI / 2;
            hood.position.set(0, (ly + 0.1) * scale, 0.24 * scale);
            headGroup.add(hood);
          });

          headGroup.position.set(posX, posY, posZ);
          group.add(headGroup);

          return { redLens, yelLens, grnLens, headGroup };
        };

        // Overhead Signal Head (hanging from cantilever)
        const overhead = createSignalHead(-3.2, 5.5, 0, 1.15);

        // Lower Curb-level Signal Head
        const curb = createSignalHead(0, 3.4, 0.25, 0.9);

        group.position.set(ix.x + o.dx, 0, ix.z + o.dz);
        group.rotation.y = o.rotY;
        this.scene.add(group);

        // Keep reference for update loop and backward compatibility with tests
        heads.push({
          axis,
          group,
          overhead,
          curb,
          // `lens` property preserved for compatibility with existing tests
          lens: overhead.redLens,
        });
      }
    }
    return heads;
  }

  update(dt) {
    for (const ix of this.intersections) {
      if (ix.axes.length < 2) continue; // nothing to arbitrate

      ix.timer += dt;
      if (ix.phase === LIGHT.GREEN && ix.timer >= SIGNAL_TIMINGS.GREEN) {
        ix.phase = LIGHT.YELLOW;
        ix.timer = 0;
      } else if (ix.phase === LIGHT.YELLOW && ix.timer >= SIGNAL_TIMINGS.YELLOW) {
        ix.phase = LIGHT.RED; // all-red clearance
        ix.timer = 0;
      } else if (ix.phase === LIGHT.RED && ix.timer >= SIGNAL_TIMINGS.ALL_RED) {
        // Hand green to the other axis
        const idx = ix.axes.indexOf(ix.greenAxis);
        ix.greenAxis = ix.axes[(idx + 1) % ix.axes.length];
        ix.phase = LIGHT.GREEN;
        ix.timer = 0;
      }

      // Update central PointLight color and intensity based on active phase (Step 15)
      if (ix.pointLight) {
        let isDark = false;
        if (window.timeCycle) {
          const mode = window.timeCycle.mode;
          const tod = window.timeCycle.timeOfDay;
          const isAutoDark = mode === 'auto' && (tod < 0.15 || tod >= 0.45);
          isDark = mode === 'night' || mode === 'sunset' || isAutoDark;
        }

        if (isDark) {
          ix.pointLight.intensity = 2.5;
          if (ix.phase === LIGHT.GREEN) {
            ix.pointLight.color.setHex(ACTIVE_COLORS[LIGHT.GREEN]);
          } else if (ix.phase === LIGHT.YELLOW) {
            ix.pointLight.color.setHex(ACTIVE_COLORS[LIGHT.YELLOW]);
          } else {
            ix.pointLight.color.setHex(ACTIVE_COLORS[LIGHT.RED]);
          }
        } else {
          ix.pointLight.intensity = 0; // turn off during daylight
        }
      }

      for (const head of ix.signals) {
        const state = this.stateFor(ix, head.axis);
        this.applyHeadState(head.overhead, state);
        this.applyHeadState(head.curb, state);
      }
    }
  }

  /** Applies Red, Amber, or Green emissive lighting to the physical 3-aspect signal head. */
  applyHeadState(headObj, state) {
    const isRed = state === LIGHT.RED;
    const isYel = state === LIGHT.YELLOW;
    const isGrn = state === LIGHT.GREEN;

    // Red lens
    headObj.redLens.material.color.setHex(isRed ? ACTIVE_COLORS[LIGHT.RED] : INACTIVE_COLORS[LIGHT.RED]);
    headObj.redLens.material.emissive.setHex(isRed ? ACTIVE_COLORS[LIGHT.RED] : 0x000000);
    headObj.redLens.material.emissiveIntensity = isRed ? 2.5 : 0;

    // Yellow lens
    headObj.yelLens.material.color.setHex(isYel ? ACTIVE_COLORS[LIGHT.YELLOW] : INACTIVE_COLORS[LIGHT.YELLOW]);
    headObj.yelLens.material.emissive.setHex(isYel ? ACTIVE_COLORS[LIGHT.YELLOW] : 0x000000);
    headObj.yelLens.material.emissiveIntensity = isYel ? 2.5 : 0;

    // Green lens
    headObj.grnLens.material.color.setHex(isGrn ? ACTIVE_COLORS[LIGHT.GREEN] : INACTIVE_COLORS[LIGHT.GREEN]);
    headObj.grnLens.material.emissive.setHex(isGrn ? ACTIVE_COLORS[LIGHT.GREEN] : 0x000000);
    headObj.grnLens.material.emissiveIntensity = isGrn ? 2.5 : 0;
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

