// Road network dataset for NCR ESCAPE (spec §3-6, §11-12).
// Single source of truth for rendering, collisions, traffic lane following, and junction generation.

export const roadSegments = [
  // --- Cyber District Central ---
  {
    id: 'main-boulevard',
    type: 'highway',
    district: 'Cyber District',
    from: { x: 0, z: -220 },
    to: { x: 0, z: 220 },
    width: 16,
    lanes: 2,
    speedLimit: 26, // ~94 km/h
    elevated: false,
    traffic: { density: 1.0, allowTrucks: true },
    raceSuitability: 'high-speed',
    connections: ['corporate-loop', 'flyover-ramp'],
    exits: ['corporate-mile', 'old-market-avenue'],
  },
  {
    id: 'corporate-loop',
    type: 'urban',
    district: 'Cyber District',
    from: { x: -170, z: 40 },
    to: { x: 170, z: 40 },
    width: 11,
    lanes: 1,
    speedLimit: 16, // ~58 km/h
    elevated: false,
    traffic: { density: 0.9, allowTrucks: false },
    raceSuitability: 'technical',
    connections: ['main-boulevard', 'service-lane'],
    exits: ['golf-belt-east', 'industrial-edge-west'],
  },
  {
    id: 'service-lane',
    type: 'service',
    district: 'Cyber District',
    from: { x: -60, z: 90 },
    to: { x: -60, z: -10 },
    width: 5,
    lanes: 1,
    speedLimit: 10,
    elevated: false,
    traffic: { density: 0.35, allowTrucks: false },
    raceSuitability: 'shortcut',
    connections: ['corporate-loop'],
    exits: [],
  },
  {
    id: 'flyover-ramp',
    type: 'highway-elevated',
    district: 'Cyber District',
    from: { x: 0, z: -40 },
    to: { x: 0, z: 120 },
    width: 12,
    lanes: 1,
    speedLimit: 32,
    elevated: true,
    liftHeight: 9,
    traffic: { density: 0, allowTrucks: false },
    raceSuitability: 'high-speed',
    connections: [],
    exits: [],
  },

  // --- Corporate Mile (North Expansion) ---
  {
    id: 'corporate-mile',
    type: 'highway',
    district: 'Corporate Mile',
    from: { x: 0, z: 220 },
    to: { x: 0, z: 480 },
    width: 16,
    lanes: 2,
    speedLimit: 28, // ~100 km/h
    elevated: false,
    traffic: { density: 0.85, allowTrucks: true },
    raceSuitability: 'high-speed',
    connections: ['corporate-connector', 'industrial-north-link'],
    exits: ['noida-corridor-future'],
  },
  {
    id: 'corporate-connector',
    type: 'urban',
    district: 'Corporate Mile',
    from: { x: 0, z: 340 },
    to: { x: 380, z: 340 },
    width: 11,
    lanes: 1,
    speedLimit: 18,
    elevated: false,
    traffic: { density: 0.75, allowTrucks: false },
    raceSuitability: 'technical',
    connections: ['corporate-mile', 'golf-belt-north'],
    exits: [],
  },
  {
    id: 'industrial-north-link',
    type: 'industrial',
    district: 'Corporate Mile',
    from: { x: -360, z: 280 },
    to: { x: 0, z: 280 },
    width: 12,
    lanes: 1,
    speedLimit: 17,
    elevated: false,
    traffic: { density: 0.8, allowTrucks: true },
    raceSuitability: 'medium',
    connections: ['corporate-mile', 'industrial-haul-road'],
    exits: [],
  },

  // --- Golf Course Belt (East Expansion) ---
  {
    id: 'golf-belt-east',
    type: 'urban',
    district: 'Golf Course Belt',
    from: { x: 170, z: 40 },
    to: { x: 380, z: 40 },
    width: 12,
    lanes: 1,
    speedLimit: 20,
    elevated: false,
    traffic: { density: 0.7, allowTrucks: false },
    raceSuitability: 'smooth-curves',
    connections: ['corporate-loop', 'golf-belt-north'],
    exits: [],
  },
  {
    id: 'golf-belt-north',
    type: 'urban',
    district: 'Golf Course Belt',
    from: { x: 380, z: 40 },
    to: { x: 380, z: 340 },
    width: 12,
    lanes: 1,
    speedLimit: 22,
    elevated: false,
    traffic: { density: 0.65, allowTrucks: false },
    raceSuitability: 'high-speed',
    connections: ['golf-belt-east', 'corporate-connector'],
    exits: [],
  },

  // --- Industrial Edge (West Expansion) ---
  {
    id: 'industrial-edge-west',
    type: 'industrial',
    district: 'Industrial Edge',
    from: { x: -360, z: 40 },
    to: { x: -170, z: 40 },
    width: 12,
    lanes: 1,
    speedLimit: 16,
    elevated: false,
    traffic: { density: 0.85, allowTrucks: true },
    raceSuitability: 'drifting',
    connections: ['corporate-loop', 'industrial-haul-road'],
    exits: [],
  },
  {
    id: 'industrial-haul-road',
    type: 'industrial',
    district: 'Industrial Edge',
    from: { x: -360, z: 40 },
    to: { x: -360, z: 280 },
    width: 13,
    lanes: 1,
    speedLimit: 16,
    elevated: false,
    traffic: { density: 0.9, allowTrucks: true },
    raceSuitability: 'drifting',
    connections: ['industrial-edge-west', 'industrial-north-link'],
    exits: [],
  },

  // --- Old Market & Delhi Gate (South Expansion) ---
  {
    id: 'old-market-avenue',
    type: 'urban-dense',
    district: 'Old Market',
    from: { x: 0, z: -480 },
    to: { x: 0, z: -220 },
    width: 14,
    lanes: 2,
    speedLimit: 18,
    elevated: false,
    traffic: { density: 1.1, allowTrucks: true },
    raceSuitability: 'heavy-traffic-weaving',
    connections: ['main-boulevard', 'old-market-cross'],
    exits: ['delhi-ring-road-future'],
  },
  {
    id: 'old-market-cross',
    type: 'urban-dense',
    district: 'Old Market',
    from: { x: -180, z: -350 },
    to: { x: 180, z: -350 },
    width: 10,
    lanes: 1,
    speedLimit: 14,
    elevated: false,
    traffic: { density: 1.15, allowTrucks: false },
    raceSuitability: 'technical-traffic',
    connections: ['old-market-avenue'],
    exits: [],
  },
];

export const raceRoutes = [
  {
    id: 'cyber-loop-1',
    label: 'Cyber District Loop',
    segments: ['main-boulevard', 'flyover-ramp', 'corporate-loop', 'service-lane'],
  },
  {
    id: 'corporate-grand-prix',
    label: 'Corporate Mile Grand Prix',
    segments: ['main-boulevard', 'corporate-mile', 'corporate-connector', 'golf-belt-north', 'golf-belt-east', 'corporate-loop'],
  },
  {
    id: 'industrial-drift-run',
    label: 'Industrial Edge Drift Run',
    segments: ['industrial-edge-west', 'industrial-haul-road', 'industrial-north-link'],
  },
];

export const spawnPoint = { x: 0, y: 0.6, z: -180, headingDeg: 0 };

/** Segments AI traffic may use (ground level, density > 0). */
export function getDrivableSegments() {
  return roadSegments.filter((s) => !s.elevated && s.traffic.density > 0);
}

/**
 * Which world axis a road predominantly runs along.
 */
export function axisOf(seg) {
  return Math.abs(seg.to.x - seg.from.x) > Math.abs(seg.to.z - seg.from.z) ? 'x' : 'z';
}

function cross2(ax, az, bx, bz) {
  return ax * bz - az * bx;
}

/**
 * Computes where two segments physically cross using parametric line-segment intersection.
 */
function segIntersect(a, b) {
  const rx = a.to.x - a.from.x;
  const rz = a.to.z - a.from.z;
  const sx = b.to.x - b.from.x;
  const sz = b.to.z - b.from.z;

  const denom = cross2(rx, rz, sx, sz);
  if (Math.abs(denom) < 1e-6) return null;

  const qpx = b.from.x - a.from.x;
  const qpz = b.from.z - a.from.z;
  const t = cross2(qpx, qpz, sx, sz) / denom;
  const u = cross2(qpx, qpz, rx, rz) / denom;

  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.from.x + rx * t, z: a.from.z + rz * t };
}

/** All derived junctions between drivable roads. */
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
        half: Math.max(segs[i].width, segs[j].width) / 2,
      });
    }
  }
  return out;
}

/**
 * Parametric position (0..1) of a world point along a segment in travel direction.
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

  // Keep-left convention
  const laneWidth = seg.width / (seg.lanes * 2);
  const offset = laneWidth * (0.5 + laneIndex);
  const px = Math.cos(heading) * offset;
  const pz = -Math.sin(heading) * offset;

  return { x: ax + dx * t + px, z: az + dz * t + pz, heading, length: len };
}
