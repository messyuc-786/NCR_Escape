// Race/event definitions for NCR ESCAPE (spec §13-15).
// Data-driven event architecture — racing/raceSystem.js runs any event conforming to this structure.

export const EVENT_TYPES = {
  SPRINT: 'sprint',
  CIRCUIT: 'circuit',
  DRIFT: 'drift',
  TIME_TRIAL: 'time-trial',
  CHECKPOINT_RUN: 'checkpoint-run',
  HIGHWAY_RUN: 'highway-run',
  ESCAPE: 'escape',
};

export const raceEvents = [
  {
    id: 'cyber-sprint-1',
    label: 'Cyber District Sprint',
    type: EVENT_TYPES.SPRINT,
    difficulty: 'Rookie',
    description: 'Blast north up Main Boulevard, cut into the Corporate Loop, and finish at the service lane.',
    marker: { x: 6, z: -150, radius: 9 },
    checkpoints: [
      { x: 0, z: -80, radius: 14 },
      { x: 0, z: 10, radius: 14 },
      { x: -60, z: 40, radius: 16 },
      { x: -60, z: 88, radius: 16 },
    ],
    targetTime: 32,
    reward: { cash: 850, xp: 120, rep: 40 },
    bonusReward: { cash: 400, xp: 60, rep: 20 },
  },
  {
    id: 'corporate-circuit-1',
    label: 'Corporate Loop Dash',
    type: EVENT_TYPES.SPRINT,
    difficulty: 'Pro',
    description: 'A technical high-speed blast across the Corporate Loop into the central junction.',
    marker: { x: -140, z: 40, radius: 9 },
    checkpoints: [
      { x: -80, z: 40, radius: 15 },
      { x: 0, z: 40, radius: 15 },
      { x: 80, z: 40, radius: 15 },
      { x: 140, z: 40, radius: 15 },
    ],
    targetTime: 22,
    reward: { cash: 1100, xp: 180, rep: 65 },
    bonusReward: { cash: 550, xp: 90, rep: 30 },
  },
  {
    id: 'expressway-sprint-2',
    label: 'Noida Expressway Highway Run',
    type: EVENT_TYPES.SPRINT,
    difficulty: 'High Speed',
    description: 'High-speed southern run down Main Boulevard toward the Sector 143 expressway gate.',
    marker: { x: -6, z: 180, radius: 9 },
    checkpoints: [
      { x: 0, z: 100, radius: 15 },
      { x: 0, z: 0, radius: 15 },
      { x: 0, z: -100, radius: 15 },
      { x: 0, z: -180, radius: 15 },
    ],
    targetTime: 26,
    reward: { cash: 1350, xp: 220, rep: 80 },
    bonusReward: { cash: 650, xp: 110, rep: 40 },
  },
];

export function getEventById(id) {
  return raceEvents.find((e) => e.id === id) || null;
}
