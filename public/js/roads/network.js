// Plain data describing Cyber District's road network.
//
// This file is the single source of truth for roads. It is read by:
//   - world/district.js          (road/curb mesh generation)
//   - traffic/trafficSystem.js   (lane paths, density, speed limits)
//   - racing/                    (future: race routes reference segment ids, never geometry)
// A road is defined once here and never re-authored per system.
//
// Per spec §12 each segment carries: id, type, lanes, width, speedLimit, connections,
// traffic settings, and race suitability.

export const roadSegments = [
  {
    id: 'main-boulevard',
    type: 'highway',
    from: { x: 0, z: -220 },
    to: { x: 0, z: 220 },
    width: 16,
    lanes: 2,                // lanes PER DIRECTION
    speedLimit: 26,          // m/s (~94 km/h)
    elevated: false,
    traffic: { density: 1.0, allowTrucks: true },
    raceSuitability: 'high-speed',
    connections: ['corporate-loop'],
    exits: ['north-to-corporate-mile', 'south-to-old-market'],
  },
  {
    id: 'corporate-loop',
    type: 'urban',
    from: { x: -170, z: 40 },
    to: { x: 170, z: 40 },
    width: 10,
    lanes: 1,
    speedLimit: 15,          // m/s (~54 km/h)
    elevated: false,
    traffic: { density: 0.9, allowTrucks: false },
    raceSuitability: 'technical',
    connections: ['main-boulevard', 'service-lane'],
    exits: ['east-to-golf-belt', 'west-to-industrial-edge'],
  },
  {
    id: 'service-lane',
    type: 'service',
    from: { x: -60, z: 90 },
    to: { x: -60, z: -10 },
    width: 5,
    lanes: 1,
    speedLimit: 9,           // m/s (~32 km/h)
    elevated: false,
    traffic: { density: 0.35, allowTrucks: false },
    raceSuitability: 'shortcut',
    connections: ['corporate-loop'],
    exits: [],
  },
  {
    id: 'flyover-ramp',
    type: 'highway-elevated',
    from: { x: 0, z: -40 },
    to: { x: 0, z: 120 },
    width: 12,
    lanes: 1,
    speedLimit: 30,
    elevated: true,
    liftHeight: 9,
    // No AI traffic on the flyover yet: it has no on/off ramp geometry for cars to merge
    // through, so spawning them there would make them pop in mid-air. Marked explicitly
    // rather than faked.
    traffic: { density: 0, allowTrucks: false },
    raceSuitability: 'high-speed',
    connections: [],
    exits: [],
  },
];

export const raceRoutes = [
  {
    id: 'cyber-loop-1',
    label: 'Cyber District Loop',
    segments: ['main-boulevard', 'flyover-ramp', 'corporate-loop', 'service-lane'],
  },
];

export const spawnPoint = { x: 0, y: 0.6, z: -180, headingDeg: 0 };

/** Segments AI traffic may use (ground level, density > 0). */
export function getDrivableSegments() {
  return roadSegments.filter((s) => !s.elevated && s.traffic.density > 0);
}

/**
 * Which world axis a road predominantly runs along. Used to group segments into opposing
 * traffic-light phases: roads on different axes cannot hold green simultaneously.
 */
export function axisOf(seg) {
  return Math.abs(seg.to.x - seg.from.x) > Math.abs(seg.to.z - seg.from.z) ? 'x' : 'z';
}

function cross2(ax, az, bx, bz) {
  return ax * bz - az * bx;
}

/**
 * Computes where two segments physically cross, using a standard parametric line-segment
 * intersection. Deliberately generic rather than hardcoding the two junctions this district
 * happens to have — adding a new road to roadSegments should produce new intersections for
 * free, which is the whole point of keeping roads as data (spec §12).
 */
function segIntersect(a, b) {
  const rx = a.to.x - a.from.x;
  const rz = a.to.z - a.from.z;
  const sx = b.to.x - b.from.x;
  const sz = b.to.z - b.from.z;

  const denom = cross2(rx, rz, sx, sz);
  if (Math.abs(denom) < 1e-6) return null; // parallel or collinear

  const qpx = b.from.x - a.from.x;
  const qpz = b.from.z - a.from.z;
  const t = cross2(qpx, qpz, sx, sz) / denom;
  const u = cross2(qpx, qpz, rx, rz) / denom;

  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.from.x + rx * t, z: a.from.z + rz * t };
}

/** All junctions between drivable roads, derived from the segment data. */
export function getIntersections() {
  const segs = getDrivableSegments();
  const out = [];
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const p = segIntersect(segs[i], segs[j]);
      if (!p) continue;
      out.push({
        id: `${segs[i].id}__${segs[j].id}`,
        x: p.x,
        z: p.z,
        segIds: [segs[i].id, segs[j].id],
        // Junction box half-size: the wider of the two roads, so a car is considered "inside"
        // the intersection for as long as it's physically over the painted crossing.
        half: Math.max(segs[i].width, segs[j].width) / 2,
      });
    }
  }
  return out;
}

/**
 * Parametric position (0..1) of a world point along a segment, measured in travel direction.
 * Mirrors sampleLane's dir convention so the two never disagree about which end is the start.
 */
export function tAlong(seg, x, z, dir) {
  const ax = dir > 0 ? seg.from.x : seg.to.x;
  const az = dir > 0 ? seg.from.z : seg.to.z;
  const bx = dir > 0 ? seg.to.x : seg.from.x;
  const bz = dir > 0 ? seg.to.z : seg.from.z;
  const len = Math.hypot(bx - ax, bz - az);
  if (len < 1e-6) return 0;
  return Math.hypot(x - ax, z - az) / len;
}

export function segmentLength(seg) {
  return Math.hypot(seg.to.x - seg.from.x, seg.to.z - seg.from.z);
}

/**
 * Returns a world-space point + heading for a position along a segment lane.
 * @param t 0..1 along the segment in travel direction
 * @param dir +1 = from->to, -1 = to->from
 * @param laneIndex 0..lanes-1, offset outward from the centre line
 */
export function sampleLane(seg, t, dir, laneIndex) {
  const ax = dir > 0 ? seg.from.x : seg.to.x;
  const az = dir > 0 ? seg.from.z : seg.to.z;
  const bx = dir > 0 ? seg.to.x : seg.from.x;
  const bz = dir > 0 ? seg.to.z : seg.from.z;

  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  const heading = Math.atan2(dx, dz);

  // Keep-left convention: lanes stack outward from the centre line on the travel side.
  const laneWidth = seg.width / (seg.lanes * 2);
  const offset = laneWidth * (0.5 + laneIndex);
  const px = Math.cos(heading) * offset;
  const pz = -Math.sin(heading) * offset;

  return { x: ax + dx * t + px, z: az + dz * t + pz, heading, length: len };
}
