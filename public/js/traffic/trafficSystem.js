import { getDrivableSegments, sampleLane, tAlong, segmentLength } from '/js/roads/network.js';
import { pickTrafficType, buildTrafficMesh } from '/js/vehicles/trafficVehicle.js';
import { IntersectionController } from '/js/traffic/intersections.js';

// Phase 4 + 4b traffic AI. Reads road data from roads/network.js — the same file
// world/district.js uses to build the road meshes — so lanes always line up with the painted
// road without any duplicated geometry.
//
// Implemented: spawn along lanes, lane following, per-type + per-road speed, forward collision
// avoidance (slow for the car ahead in your lane), distance-based despawn/respawn, traffic
// lights with per-axis right-of-way, stopping at red, and turning through junctions onto a
// crossing road instead of despawning at a segment end.
//
// NOT yet implemented (see ROADMAP): lane changes mid-segment, emergency vehicles.

const MAX_TRAFFIC = 34;
const DESPAWN_DISTANCE = 320;    // beyond this from the player, recycle the car
const SPAWN_MIN_DISTANCE = 22;   // never pop a car in this close to the player
const SPAWN_MAX_DISTANCE = 200;
const FOLLOW_DISTANCE = 14;      // start slowing within this gap to the car ahead
const MIN_GAP = 6;               // hard stop gap
const STOP_LINE_GAP = 3.0;       // how far before the junction box a car waits at red
const LIGHT_LOOKAHEAD = 30;      // start reacting to a signal within this distance
const TURN_CHANCE = 0.4;         // odds a car turns rather than continuing straight

export class TrafficSystem {
  constructor(scene) {
    this.scene = scene;
    this.segments = getDrivableSegments();
    this.segById = new Map(this.segments.map((s) => [s.id, s]));
    this.cars = [];

    this.intersections = new IntersectionController(scene);

    // Index junctions per segment once, so the per-frame path is a lookup rather than a
    // geometry search across every road for every car.
    this.junctionsBySeg = new Map();
    for (const seg of this.segments) {
      const list = this.intersections.intersections
        .filter((ix) => ix.segIds.includes(seg.id))
        .map((ix) => ({
          ix,
          // The crossing road, i.e. what a car turning here would move onto.
          otherSeg: this.segById.get(ix.segIds.find((id) => id !== seg.id)),
        }))
        .filter((j) => j.otherSeg);
      this.junctionsBySeg.set(seg.id, list);
    }

    // Total density across roads decides how many of MAX_TRAFFIC each road gets.
    this.totalDensity = this.segments.reduce((s, seg) => s + seg.traffic.density, 0);

    for (let i = 0; i < MAX_TRAFFIC; i++) {
      this.cars.push(this.createCar());
    }
  }

  /**
   * Distributes all traffic into the ring around the player. Call once after the player
   * spawns — without this, cars are placed by pure random `t` and clump wherever the road
   * data happens to be dense, leaving the player's own stretch of road empty.
   */
  seed(playerX, playerZ) {
    for (const car of this.cars) {
      this.respawn(car, playerX, playerZ);
    }
  }

  /** Picks a road weighted by its configured traffic density (spec §12 traffic settings). */
  pickSegment() {
    let r = Math.random() * this.totalDensity;
    for (const seg of this.segments) {
      r -= seg.traffic.density;
      if (r <= 0) return seg;
    }
    return this.segments[this.segments.length - 1];
  }

  createCar() {
    const seg = this.pickSegment();
    const type = pickTrafficType(seg.traffic.allowTrucks);
    const mesh = buildTrafficMesh(type);
    this.scene.add(mesh);

    const car = {
      mesh,
      type,
      seg,
      dir: Math.random() < 0.5 ? 1 : -1,
      lane: Math.floor(Math.random() * seg.lanes),
      t: Math.random(),
      speed: 0,
      targetSpeed: 0,
      halfW: Math.max(type.body.w, type.cabin.w) / 2,
      halfD: type.body.d / 2,
    };
    this.assignRoute(car, seg);
    return car;
  }

  /** Puts a car onto a (new) segment with a fresh lane, direction, and cruise speed. */
  assignRoute(car, seg, t = Math.random()) {
    car.seg = seg;
    car.dir = Math.random() < 0.5 ? 1 : -1;
    car.lane = Math.floor(Math.random() * seg.lanes);
    car.t = t;
    // Per-car speed variance so traffic isn't a uniform convoy (spec §13 "vary vehicle speeds")
    const variance = 0.85 + Math.random() * 0.3;
    car.targetSpeed = seg.speedLimit * car.type.speedScale * variance;
    car.speed = car.targetSpeed;
    car.halfW = Math.max(car.type.body.w, car.type.cabin.w) / 2;
    car.halfD = car.type.body.d / 2;
    this.refreshJunctions(car);
  }

  /**
   * Recomputes where this car's junctions sit along its current segment, expressed in the
   * car's own travel direction, sorted ahead-first. Must be called on every route change:
   * a t-value is only meaningful relative to a specific segment AND direction.
   */
  refreshJunctions(car) {
    const list = this.junctionsBySeg.get(car.seg.id) || [];
    const len = segmentLength(car.seg);
    car.junctions = list
      .map((j) => ({
        ix: j.ix,
        otherSeg: j.otherSeg,
        t: tAlong(car.seg, j.ix.x, j.ix.z, car.dir),
        // Half-width of the junction box expressed in t units on this segment.
        halfT: j.ix.half / len,
      }))
      .sort((a, b) => a.t - b.t);
  }

  /**
   * Moves a car off its current road onto the crossing road at a junction — a real turn,
   * preserving world position so the car doesn't teleport across the box.
   */
  turnOnto(car, junction) {
    const next = junction.otherSeg;
    // Pick the travel direction on the new road; either is a legal turn at a crossroads.
    const dir = Math.random() < 0.5 ? 1 : -1;
    const t = tAlong(next, junction.ix.x, junction.ix.z, dir);

    // Refuse a turn that would immediately dump the car off the end of the new road.
    if (t > 0.97) return false;

    car.seg = next;
    car.dir = dir;
    car.lane = Math.floor(Math.random() * next.lanes);
    car.t = t;
    const variance = 0.85 + Math.random() * 0.3;
    car.targetSpeed = next.speedLimit * car.type.speedScale * variance;
    this.refreshJunctions(car);
    return true;
  }

  /** Respawns a car somewhere valid but off-screen relative to the player. */
  respawn(car, playerX, playerZ) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const seg = this.pickSegment();
      const t = Math.random();
      const dir = Math.random() < 0.5 ? 1 : -1;
      const lane = Math.floor(Math.random() * seg.lanes);
      const p = sampleLane(seg, t, dir, lane);
      const dist = Math.hypot(p.x - playerX, p.z - playerZ);
      if (dist > SPAWN_MIN_DISTANCE && dist < SPAWN_MAX_DISTANCE) {
        this.assignRoute(car, seg, t);
        car.dir = dir;
        car.lane = lane;
        // assignRoute picked its own direction; junction t-values are direction-relative,
        // so they must be recomputed against the direction actually used here.
        this.refreshJunctions(car);
        return;
      }
    }
    // Couldn't find a good slot this frame — leave it where it is and retry next frame.
  }

  update(dt, playerX, playerZ) {
    this.intersections.update(dt);

    for (const car of this.cars) {
      const sample = sampleLane(car.seg, car.t, car.dir, car.lane);

      // --- Forward avoidance: find nearest car ahead in the same segment/dir/lane ---
      let gap = Infinity;
      for (const other of this.cars) {
        if (other === car) continue;
        if (other.seg !== car.seg || other.dir !== car.dir || other.lane !== car.lane) continue;
        const delta = (other.t - car.t) * sample.length;
        if (delta > 0 && delta < gap) gap = delta;
      }

      let desired = car.targetSpeed;
      if (gap < MIN_GAP) {
        desired = 0;
      } else if (gap < FOLLOW_DISTANCE) {
        desired = car.targetSpeed * ((gap - MIN_GAP) / (FOLLOW_DISTANCE - MIN_GAP));
      }

      // Also yield to the player if they're right in front in this lane
      const toPlayerX = playerX - sample.x;
      const toPlayerZ = playerZ - sample.z;
      const forwardDot = Math.sin(sample.heading) * toPlayerX + Math.cos(sample.heading) * toPlayerZ;
      const lateral = Math.abs(Math.cos(sample.heading) * toPlayerX - Math.sin(sample.heading) * toPlayerZ);
      if (forwardDot > 0 && forwardDot < FOLLOW_DISTANCE && lateral < 2.6) {
        desired = Math.min(desired, Math.max(0, car.targetSpeed * ((forwardDot - MIN_GAP) / FOLLOW_DISTANCE)));
      }

      // --- Traffic lights: find the nearest upcoming junction on this segment ---
      const len = sample.length;
      let nextJunction = null;
      let junctionAheadT = Infinity;
      if (car.junctions) {
        for (const j of car.junctions) {
          const stopT = j.t - j.halfT - STOP_LINE_GAP / len;
          if (stopT > car.t) { nextJunction = j; junctionAheadT = stopT; break; }
        }
      }

      let atStopLine = false;
      if (nextJunction) {
        const distToStop = (junctionAheadT - car.t) * len;
        const axis = this.intersections.axisForSegment(car.seg.id);
        const clear = this.intersections.mayProceed(nextJunction.ix, axis);

        if (distToStop < LIGHT_LOOKAHEAD && distToStop > -2) {
          if (!clear) {
            atStopLine = true;
            if (distToStop < FOLLOW_DISTANCE) {
              desired = Math.min(
                desired,
                Math.max(0, car.targetSpeed * (distToStop / FOLLOW_DISTANCE))
              );
            }
          } else if (car.t >= nextJunction.t - nextJunction.halfT && !car.turnDecided) {
            // Entering the box on a clear light: commit once to straight-through or a turn,
            // so the decision doesn't flip-flop every frame while inside the junction.
            car.turnDecided = true;
            if (Math.random() < TURN_CHANCE) {
              this.turnOnto(car, nextJunction);
              continue; // seg/t just changed; resume from the top next frame
            }
          }
        }
      }

      if (!atStopLine) {
        // Clear the "already decided this junction" flag once we're well past any box, so
        // the next junction ahead gets a fresh decision.
        if (!nextJunction || car.t > (nextJunction.t + nextJunction.halfT)) {
          car.turnDecided = false;
        }
      }

      // Smooth accel/brake toward the desired speed
      const rate = desired < car.speed ? 14 : 5;
      car.speed += (desired - car.speed) * Math.min(1, dt * rate);
      if (car.speed < 0.01) car.speed = 0;

      // Advance along the lane
      car.t += (car.speed * dt) / sample.length;

      // Reached the end of its road, or drifted far from the player -> recycle
      const distToPlayer = Math.hypot(sample.x - playerX, sample.z - playerZ);
      if (car.t >= 1 || distToPlayer > DESPAWN_DISTANCE) {
        this.respawn(car, playerX, playerZ);
        continue;
      }

      const pos = sampleLane(car.seg, car.t, car.dir, car.lane);
      car.mesh.position.set(pos.x, 0, pos.z);
      car.mesh.rotation.y = pos.heading;
      car.x = pos.x;
      car.z = pos.z;
    }
  }

  /** AABB colliders for the player physics step, so traffic is solid, not scenery. */
  getColliders() {
    const out = [];
    for (const car of this.cars) {
      if (car.x === undefined) continue;
      // Axis-aligned approximation of an oriented box; padded to the larger extent so the
      // player can't slip through a car that's angled relative to the axes.
      const r = Math.max(car.halfW, car.halfD * 0.72);
      out.push({ minX: car.x - r, maxX: car.x + r, minZ: car.z - r, maxZ: car.z + r });
    }
    return out;
  }

  /** Debug/telemetry hook used by the smoke test. */
  getDebugState() {
    const moving = this.cars.filter((c) => c.speed > 0.5).length;
    return { total: this.cars.length, moving };
  }

  /** Test hook: traffic-light phase per junction, so the smoke test can assert opposing
   * axes are never simultaneously green. */
  getIntersectionState() {
    return this.intersections.getDebugState();
  }

  /**
   * Per-car positions/extents. Test-only hook: lets the smoke test prove cars actually move,
   * stay on the road network, and are solid to the player — none of which is observable from
   * getDebugState()'s counters alone.
   */
  getPositions() {
    return this.cars
      .filter((c) => c.x !== undefined)
      .map((c) => ({
        x: c.x,
        z: c.z,
        speed: c.speed,
        segId: c.seg.id,
        halfW: c.halfW,
        halfD: c.halfD,
      }));
  }
}
