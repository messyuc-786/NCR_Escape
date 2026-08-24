// Arcade/simcade integration step (spec §10-11). Not a rigid-body simulation — deliberately
// simple, cheap, and predictable for a first slice. See TECHNICAL_ARCHITECTURE.md §Physics.

const DRAG = 0.994;          // per-frame speed decay when coasting
const BRAKE_DRAG = 0.90;
const CAR_HALF_W = 1.0;
const CAR_HALF_D = 2.15;

export function createCarState(spawnPoint) {
  return {
    x: spawnPoint.x,
    z: spawnPoint.z,
    heading: (spawnPoint.headingDeg || 0) * (Math.PI / 180),
    speed: 0,          // signed, m/s, +forward / -reverse
    steerInput: 0,
    driftYaw: 0,         // extra yaw applied while drifting
    nitro: 100,          // 0 to 100 nitro capacity
    isBoosting: false,
  };
}

export function stepCarPhysics(state, input, vehicle, dt, colliders) {
  const { throttle, brake, steer, handbrake, nitro: wantsNitro } = input;

  // Nitro Boost
  const canBoost = wantsNitro && state.nitro > 5 && state.speed > 3;
  state.isBoosting = canBoost;

  if (canBoost) {
    state.nitro = Math.max(0, state.nitro - 28 * dt);
  } else {
    state.nitro = Math.min(100, state.nitro + 7 * (vehicle.nitroRefill || 1.0) * dt); // Passive refill
  }

  const effectiveAccel = vehicle.acceleration * (canBoost ? 1.55 : 1.0);
  const maxTopSpeed = vehicle.topSpeed * (canBoost ? 1.18 : 1.0);

  // Longitudinal
  if (throttle > 0) {
    state.speed += effectiveAccel * throttle * dt;
  } else if (brake > 0) {
    if (state.speed > 0.5) {
      state.speed -= vehicle.braking * brake * dt;
    } else {
      state.speed -= vehicle.acceleration * 0.55 * brake * dt; // reverse accel
    }
  } else {
    state.speed *= handbrake ? BRAKE_DRAG : DRAG;
    if (Math.abs(state.speed) < 0.05) state.speed = 0;
  }

  state.speed = clamp(state.speed, -vehicle.topSpeed * 0.4, maxTopSpeed);

  // Lateral / steering — scaled down at high speed for arcade stability
  const speedFactor = 1 - Math.min(Math.abs(state.speed) / vehicle.topSpeed, 1) * 0.55;
  const steerStrength = vehicle.handling * speedFactor;
  const turn = steer * steerStrength * dt * (state.speed >= 0 ? 1 : -1);

  if (handbrake && Math.abs(state.speed) > 3) {
    // Rear grip loss -> extra yaw beyond the steer input, classic arcade drift
    const driftAmount = (1 - vehicle.grip) + vehicle.drift * 0.8;
    state.driftYaw += (steer * driftAmount - state.driftYaw) * Math.min(1, dt * 3);
  } else {
    state.driftYaw += (0 - state.driftYaw) * Math.min(1, dt * 4);
  }

  state.heading += turn + state.driftYaw * dt * 1.8;

  // Integrate position
  const nextX = state.x + Math.sin(state.heading) * state.speed * dt;
  const nextZ = state.z + Math.cos(state.heading) * state.speed * dt;

  const resolved = resolveCollisions(nextX, nextZ, colliders);
  state.x = resolved.x;
  state.z = resolved.z;
  if (resolved.hit) state.speed *= 0.55; // soft speed loss on impact

  return state;
}

function resolveCollisions(x, z, colliders) {
  let hit = false;
  for (const c of colliders) {
    const minX = c.minX - CAR_HALF_W;
    const maxX = c.maxX + CAR_HALF_W;
    const minZ = c.minZ - CAR_HALF_D;
    const maxZ = c.maxZ + CAR_HALF_D;
    if (x > minX && x < maxX && z > minZ && z < maxZ) {
      hit = true;
      const overlapLeft = x - minX;
      const overlapRight = maxX - x;
      const overlapTop = z - minZ;
      const overlapBottom = maxZ - z;
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      if (minOverlap === overlapLeft) x = minX;
      else if (minOverlap === overlapRight) x = maxX;
      else if (minOverlap === overlapTop) z = minZ;
      else z = maxZ;
    }
  }
  return { x, z, hit };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
