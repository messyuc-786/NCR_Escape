import { getDrivableSegments, sampleLane, tAlong, segmentLength } from '../roads/network.js';
import { pickTrafficType, buildTrafficMesh, TRAFFIC_TYPES } from '../vehicles/trafficVehicle.js';
import { IntersectionController, LIGHT } from './intersections.js';

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

const MAX_TRAFFIC = 54;
const DESPAWN_DISTANCE = 320;    // beyond this from the player, recycle the car
const SPAWN_MIN_DISTANCE = 20;   // never pop a car in this close to the player
const SPAWN_MAX_DISTANCE = 220;
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
    const mainSeg = this.segById.get('main-boulevard');
    let mainCount = 0;
    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];
      if (mainSeg && mainCount < 6) {
        const t = 0.2 + (mainCount / 6) * 0.6;
        const dir = mainCount % 2 === 0 ? 1 : -1;
        const lane = mainCount % mainSeg.lanes;
        this.assignRoute(car, mainSeg, t);
        car.dir = dir;
        car.lane = lane;
        this.refreshJunctions(car);
        const pos = sampleLane(mainSeg, t, dir, lane);
        car.mesh.position.set(pos.x, 0, pos.z);
        car.mesh.rotation.y = pos.heading;
        car.x = pos.x;
        car.z = pos.z;
        mainCount++;
      } else {
        this.respawn(car, playerX, playerZ);
      }
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

  pickTrafficTypeForSegment(seg) {
    const isTruckAllowed = seg.traffic.allowTrucks;
    const pool = TRAFFIC_TYPES.filter((t) => isTruckAllowed || !t.isTruck);
    
    // Default weights
    const weights = {
      'commuter-hatch': 0.4,
      'city-sedan': 0.32,
      'three-wheeler': 0.16,
      'goods-truck': 0.12,
    };
    
    const id = seg.id.toLowerCase();
    
    if (id.includes('main-boulevard') || id.includes('corporate') || id.includes('cyber') || id.includes('golf')) {
      // Gurugram Cyber City: High sedans, SUVs/taxis, low autos, low trucks (Step 12)
      weights['commuter-hatch'] = 0.35;
      weights['city-sedan'] = 0.55;
      weights['three-wheeler'] = 0.08;
      weights['goods-truck'] = 0.02;
    } else if (id.includes('delhi')) {
      // Delhi: Higher variety, more auto-rickshaws and hatchbacks (Step 12)
      weights['commuter-hatch'] = 0.45;
      weights['city-sedan'] = 0.20;
      weights['three-wheeler'] = 0.25;
      weights['goods-truck'] = 0.10;
    } else if (id.includes('yamuna')) {
      // Yamuna: High trucks/buses, no auto-rickshaws, higher speeds (Step 12)
      weights['commuter-hatch'] = 0.20;
      weights['city-sedan'] = 0.25;
      weights['three-wheeler'] = 0.00;
      weights['goods-truck'] = 0.55;
    } else if (id.includes('noida') || id.includes('expressway') || id.includes('sector-143')) {
      // Noida/Expressway: High sedans, high speed trucks, low auto-rickshaws (Step 12)
      weights['commuter-hatch'] = 0.30;
      weights['city-sedan'] = 0.50;
      weights['three-wheeler'] = 0.02;
      weights['goods-truck'] = 0.18;
    }

    const filteredPool = pool.filter((t) => weights[t.id] > 0);
    const total = filteredPool.reduce((sum, t) => sum + (weights[t.id] || 0), 0);
    let r = Math.random() * total;
    for (const t of filteredPool) {
      r -= (weights[t.id] || 0);
      if (r <= 0) return t;
    }
    return filteredPool[filteredPool.length - 1];
  }

  getActiveTimeMode() {
    if (!window.timeCycle) return 'day';
    if (window.timeCycle.mode === 'auto') {
      const tod = window.timeCycle.timeOfDay;
      if (tod >= 0.15 && tod < 0.45) return 'day';
      if (tod >= 0.45 && tod < 0.65) return 'sunset';
      return 'night';
    }
    return window.timeCycle.mode;
  }

  getActiveWeather() {
    if (window.weather) {
      return window.weather.currentWeather;
    }
    return 'clear';
  }

  createCar() {
    const seg = this.pickSegment();
    const type = this.pickTrafficTypeForSegment(seg);
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
    car.visualLane = car.lane;
    this.assignRoute(car, seg);
    return car;
  }

  /** Puts a car onto a (new) segment with a fresh lane, direction, and cruise speed. */
  assignRoute(car, seg, t = Math.random()) {
    car.seg = seg;
    car.dir = Math.random() < 0.5 ? 1 : -1;
    car.lane = Math.floor(Math.random() * seg.lanes);
    car.visualLane = car.lane;
    car.t = t;
    
    // Type-based realistic speed clamps: SLOW (25-40 km/h), NORMAL (40-65 km/h), FAST (65-90 km/h)
    let minKmh = 40;
    let maxKmh = 65;
    if (car.type.id === 'three-wheeler' || car.type.id === 'goods-truck') {
      minKmh = 25;
      maxKmh = 40;
    } else if (car.type.id === 'city-sedan') {
      minKmh = 65;
      maxKmh = 90;
    }
    const targetKmh = minKmh + Math.random() * (maxKmh - minKmh);
    car.targetSpeed = targetKmh / 3.6;
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
    const dir = Math.random() < 0.5 ? 1 : -1;
    const t = tAlong(next, junction.ix.x, junction.ix.z, dir);

    if (t > 0.97) return false;

    car.seg = next;
    car.dir = dir;
    car.lane = Math.floor(Math.random() * next.lanes);
    car.visualLane = car.lane;
    car.t = t;
    
    let minKmh = 40;
    let maxKmh = 65;
    if (car.type.id === 'three-wheeler' || car.type.id === 'goods-truck') {
      minKmh = 25;
      maxKmh = 40;
    } else if (car.type.id === 'city-sedan') {
      minKmh = 65;
      maxKmh = 90;
    }
    const targetKmh = minKmh + Math.random() * (maxKmh - minKmh);
    car.targetSpeed = targetKmh / 3.6;
    this.refreshJunctions(car);
    return true;
  }

  /** Respawns a car somewhere valid but off-screen relative to the player. */
  respawn(car, playerX, playerZ, playerHeading = 0, playerSpeed = 0) {
    const speedFactor = Math.max(0, playerSpeed * 0.8);
    const minAheadDist = 65 + speedFactor; // Pushed further ahead at higher speeds
    const minBehindDist = 35;

    for (let attempt = 0; attempt < 16; attempt++) {
      const seg = this.pickSegment();
      const t = Math.random();
      const dir = Math.random() < 0.5 ? 1 : -1;
      const lane = Math.floor(Math.random() * seg.lanes);
      const p = sampleLane(seg, t, dir, lane);
      
      const toSpawnX = p.x - playerX;
      const toSpawnZ = p.z - playerZ;
      const dist = Math.hypot(toSpawnX, toSpawnZ);
      
      const dot = Math.sin(playerHeading) * toSpawnX + Math.cos(playerHeading) * toSpawnZ;
      const minAllowed = dot > 0 ? minAheadDist : minBehindDist;

      if (dist > minAllowed && dist < SPAWN_MAX_DISTANCE) {
        // Double-check no close overlap with existing active cars
        let overlapping = false;
        for (const other of this.cars) {
          if (other === car || other.x === undefined) continue;
          if (Math.hypot(p.x - other.x, p.z - other.z) < 8.0) {
            overlapping = true;
            break;
          }
        }

        if (!overlapping) {
          this.assignRoute(car, seg, t);
          car.dir = dir;
          car.lane = lane;
          car.visualLane = lane;
          this.refreshJunctions(car);
          return;
        }
      }
    }
  }

  update(dt, playerX, playerZ, playerHeading = 0, playerSpeed = 0) {
    this.intersections.update(dt);

    // 1. Difficulty density scaling based on elapsed time inside TrafficRun
    let activeLimit = MAX_TRAFFIC;
    if (window.trafficRun && window.trafficRun.active) {
      const elapsed = window.trafficRun.elapsedTime || 0;
      let densityMult = 1.0;
      if (elapsed < 30) {
        densityMult = 0.45; // EASY
      } else if (elapsed < 90) {
        densityMult = 0.70; // NORMAL
      } else if (elapsed < 180) {
        densityMult = 0.95; // BUSY
      } else {
        densityMult = 1.20; // INTENSE
      }
      activeLimit = Math.floor(MAX_TRAFFIC * densityMult);
    }

    // Time of day density/speed adjustments (Step 13)
    let timeDensityMult = 1.0;
    let timeSpeedMult = 1.0;
    const timeMode = this.getActiveTimeMode();
    if (timeMode === 'sunset') {
      timeDensityMult = 1.2; // Evening rush hour
    } else if (timeMode === 'night') {
      timeDensityMult = 0.6; // Clearer roads at night
      timeSpeedMult = 1.25;  // Higher cruising speeds at night!
    }

    activeLimit = Math.floor(activeLimit * timeDensityMult);

    // Weather adjustments (Step 14)
    const weatherMode = this.getActiveWeather();
    const isRain = weatherMode === 'rain';

    for (let idx = 0; idx < this.cars.length; idx++) {
      const car = this.cars[idx];
      const isActive = idx < activeLimit;
      car.mesh.visible = isActive;
      if (!isActive) {
        car.x = undefined;
        car.z = undefined;
        car.mesh.position.set(99999, 99999, 99999);
        continue;
      }

      // Smooth visual lane changes interpolation
      if (car.visualLane === undefined) {
        car.visualLane = car.lane;
      }
      if (car.visualLane !== car.lane) {
        const step = Math.sign(car.lane - car.visualLane) * Math.min(Math.abs(car.lane - car.visualLane), dt * 1.5);
        car.visualLane += step;
      }

      const sample = sampleLane(car.seg, car.t, car.dir, car.visualLane);

      // --- Vehicle type behavior overrides (Step 9) ---
      let accelRate = 5.0;
      let decelRate = isRain ? 8.0 : 14.0; // smoother braking in rain
      let minGap = MIN_GAP;
      let followDist = FOLLOW_DISTANCE;
      let laneChangeChance = 0.005;

      if (car.type.id === 'three-wheeler') {
        accelRate = 3.0; // Slower acceleration
      } else if (car.type.id === 'goods-truck') {
        accelRate = 2.2; // Very slow acceleration
        minGap = 9.0;    // Large following gap
        followDist = 18.0;
      } else if (car.type.id === 'city-sedan') {
        accelRate = 6.5; // Faster acceleration
        laneChangeChance = 0.012; // More aggressive lane weaving!
      }

      // Weather speed clamp (Step 14)
      const adjustedTargetSpeed = car.targetSpeed * timeSpeedMult * (isRain ? 0.85 : 1.0);
      if (isRain) {
        minGap *= 1.25;
        followDist *= 1.25;
        laneChangeChance *= 0.5; // Cautious lane changes in rain
      }

      // --- Forward avoidance: find nearest car ahead in the same segment/dir/lane ---
      let gap = Infinity;
      for (const other of this.cars) {
        if (other === car || other.x === undefined) continue;
        if (other.seg !== car.seg || other.dir !== car.dir || other.lane !== car.lane) continue;
        const delta = (other.t - car.t) * sample.length;
        if (delta > 0 && delta < gap) gap = delta;
      }

      let desired = adjustedTargetSpeed;
      if (gap < minGap) {
        desired = 0;
      } else if (gap < followDist) {
        desired = adjustedTargetSpeed * ((gap - minGap) / (followDist - minGap));
      }

      // Yield to the player if they're right in front in this lane (keeps safe distance queue, Step 7)
      const toPlayerX = playerX - sample.x;
      const toPlayerZ = playerZ - sample.z;
      const forwardDot = Math.sin(sample.heading) * toPlayerX + Math.cos(sample.heading) * toPlayerZ;
      const lateral = Math.abs(Math.cos(sample.heading) * toPlayerX - Math.sin(sample.heading) * toPlayerZ);
      if (forwardDot > 0 && forwardDot < followDist && lateral < 2.6) {
        desired = Math.min(desired, Math.max(0, adjustedTargetSpeed * ((forwardDot - minGap) / followDist)));
      }

      // Occasional random lane change AI rules (Step 4 Lane Behavior)
      if (Math.random() < laneChangeChance && car.speed > 5) {
        const seg = car.seg;
        if (seg.lanes > 1) {
          const adjacentLanes = [];
          if (car.lane > 0) adjacentLanes.push(car.lane - 1);
          if (car.lane < seg.lanes - 1) adjacentLanes.push(car.lane + 1);

          if (adjacentLanes.length > 0) {
            const nextLane = adjacentLanes[Math.floor(Math.random() * adjacentLanes.length)];
            let laneClear = true;
            for (const other of this.cars) {
              if (other === car || other.x === undefined) continue;
              if (other.seg === car.seg && other.dir === car.dir && other.lane === nextLane) {
                if (Math.abs(other.t - car.t) < 0.05) {
                  laneClear = false;
                  break;
                }
              }
            }
            if (laneClear) {
              car.lane = nextLane;
            }
          }
        }
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
        
        // Query the state machine phase (Step 4 AI response & Step 5 Yellow choices)
        const state = this.intersections.stateFor(nextJunction.ix, axis);
        let clear = true;
        if (state === LIGHT.RED) {
          clear = false;
        } else if (state === LIGHT.YELLOW) {
          // Yellow behavior decision index (Step 5)
          if (car.yellowDecision === undefined) {
            car.yellowDecision = 0.8 + Math.random() * 0.6; // Stretches safe distance threshold
          }
          const safeStopDistance = car.speed * 1.8 * car.yellowDecision;
          if (distToStop > safeStopDistance) {
            clear = false; // Prepare to stop
          } else {
            clear = true;  // Too close to stop safely, cross junction
          }
        } else {
          // Green resets decision flag
          car.yellowDecision = undefined;
        }

        if (distToStop < LIGHT_LOOKAHEAD && distToStop > -2) {
          if (!clear) {
            atStopLine = true;
            if (distToStop < followDist) {
              desired = Math.min(
                desired,
                Math.max(0, adjustedTargetSpeed * (distToStop / followDist))
              );
            }
          } else if (car.t >= nextJunction.t - nextJunction.halfT && !car.turnDecided) {
            car.turnDecided = true;
            if (Math.random() < TURN_CHANCE) {
              this.turnOnto(car, nextJunction);
              continue;
            }
          }
        }
      }

      if (!atStopLine) {
        if (!nextJunction || car.t > (nextJunction.t + nextJunction.halfT)) {
          car.turnDecided = false;
        }
      }

      // --- Reaction timer release wave (Step 6 Reaction delay & Step 8 release wave) ---
      if (desired > 0 && car.speed === 0) {
        if (car.reactionTimer === undefined) {
          car.reactionTimer = 0.15 + Math.random() * 0.35; // 0.15s to 0.50s delay
        }
        if (car.reactionTimer > 0) {
          car.reactionTimer -= dt;
          desired = 0; // Hold position
        }
      } else if (car.speed > 0.5) {
        car.reactionTimer = undefined; // Reset when moving
      }

      // Smooth acceleration and deceleration limits (Step 4 & Step 9)
      const rate = desired < car.speed ? decelRate : accelRate;
      car.speed += (desired - car.speed) * Math.min(1, dt * rate);
      if (car.speed < 0.01) car.speed = 0;

      car.t += (car.speed * dt) / sample.length;

      const distToPlayer = Math.hypot(sample.x - playerX, sample.z - playerZ);
      if (car.t >= 1 || distToPlayer > DESPAWN_DISTANCE) {
        this.respawn(car, playerX, playerZ, playerHeading, playerSpeed);
        continue;
      }

      const pos = sampleLane(car.seg, car.t, car.dir, car.visualLane);
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
      .map((c, index) => ({
        id: index,
        x: c.x,
        z: c.z,
        speed: c.speed,
        segId: c.seg.id,
        halfW: c.halfW,
        halfD: c.halfD,
        typeId: c.type.id,
      }));
  }
}
