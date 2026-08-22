// Race/event definitions for NCR ESCAPE (spec §13-15).
// Modular data structure for Sprints, Multi-Lap Circuits, Drift Competitions, and Highway Runs across all 4 regions.

export const EVENT_TYPES = {
  SPRINT: 'sprint',
  CIRCUIT: 'circuit',
  DRIFT: 'drift',
  TIME_TRIAL: 'time-trial',
};

export const raceEvents = [
  // --- Region 1: Gurugram ---
  {
    id: 'cyber-sprint-1',
    label: 'Cyber District Sprint',
    type: EVENT_TYPES.SPRINT,
    difficulty: 'Rookie',
    description: 'Blast north up Main Boulevard, cut into the Corporate Loop, and finish at the service lane.',
    marker: { x: 6, z: -150, radius: 9 },
    laps: 1,
    checkpoints: [
      { x: 0, z: -80, radius: 14 },
      { x: 0, z: 10, radius: 14 },
      { x: -60, z: 40, radius: 16 },
      { x: -60, z: 88, radius: 16 },
    ],
    targetTime: 32,
    reward: { cash: 850, xp: 120, rep: 40 },
    bonusReward: { cash: 400, xp: 60, rep: 20 },
    opponents: [
      { name: 'Kunal (Delhi Racer)', vehicleId: 'vantra-rs', color: 0xd62828 },
      { name: 'Sameer (Noida Speed)', vehicleId: 'kaveri-gt', color: 0x00d4aa },
    ],
  },
  {
    id: 'corporate-circuit-1',
    label: 'Corporate Mile Grand Prix',
    type: EVENT_TYPES.CIRCUIT,
    difficulty: 'Pro',
    description: '2-Lap high-speed circuit through Corporate Mile, Golf Belt, and the central junction.',
    marker: { x: 4, z: 240, radius: 9 },
    laps: 2,
    checkpoints: [
      { x: 0, z: 340, radius: 16 },
      { x: 200, z: 340, radius: 16 },
      { x: 380, z: 200, radius: 16 },
      { x: 380, z: 40, radius: 16 },
      { x: 180, z: 40, radius: 16 },
      { x: 0, z: 40, radius: 16 },
      { x: 0, z: 240, radius: 16 },
    ],
    targetTime: 65,
    reward: { cash: 1800, xp: 320, rep: 120 },
    bonusReward: { cash: 800, xp: 150, rep: 50 },
    opponents: [
      { name: 'Arjun (Viper)', vehicleId: 'garuda-rx', color: 0x111317 },
      { name: 'Rohan (DriftKing)', vehicleId: 'kaveri-gt', color: 0xf5a623 },
      { name: 'Pooja (Apex)', vehicleId: 'vantra-rs', color: 0xff2d55 },
    ],
  },
  {
    id: 'industrial-drift-1',
    label: 'Industrial Edge Drift Battle',
    type: EVENT_TYPES.SPRINT,
    difficulty: 'Drift Spec',
    description: 'Navigate tight warehouse corners and freight loading docks at high drift angles.',
    marker: { x: -200, z: 40, radius: 9 },
    laps: 1,
    checkpoints: [
      { x: -360, z: 40, radius: 16 },
      { x: -360, z: 160, radius: 16 },
      { x: -360, z: 280, radius: 16 },
      { x: -180, z: 280, radius: 16 },
      { x: 0, z: 280, radius: 16 },
    ],
    targetTime: 38,
    reward: { cash: 1400, xp: 240, rep: 90 },
    bonusReward: { cash: 600, xp: 100, rep: 35 },
    opponents: [
      { name: 'Vikram (Sideways)', vehicleId: 'garuda-rx', color: 0xd62828 },
      { name: 'Dev (Turbo)', vehicleId: 'kaveri-gt', color: 0x00d4aa },
    ],
  },
  {
    id: 'old-market-sprint-1',
    label: 'Old Market Traffic Run',
    type: EVENT_TYPES.SPRINT,
    difficulty: 'Heavy Traffic',
    description: 'Weave through heavy bazaar traffic and auto-rickshaws south toward Delhi Ring Road.',
    marker: { x: 4, z: -250, radius: 9 },
    laps: 1,
    checkpoints: [
      { x: 0, z: -320, radius: 16 },
      { x: 0, z: -400, radius: 16 },
      { x: 0, z: -470, radius: 16 },
    ],
    targetTime: 24,
    reward: { cash: 1250, xp: 200, rep: 75 },
    bonusReward: { cash: 500, xp: 80, rep: 30 },
    opponents: [
      { name: 'Kabir (NCR Taxi)', vehicleId: 'vantra-rs', color: 0xf2c14b },
      { name: 'Yash (Street Fox)', vehicleId: 'kaveri-gt', color: 0x1a365d },
    ],
  },

  // --- Region 2 & Bridge: Delhi & Yamuna River ---
  {
    id: 'yamuna-midnight-dash',
    label: 'Yamuna Bridge Midnight Dash',
    type: EVENT_TYPES.SPRINT,
    difficulty: 'High Speed',
    description: 'Full-throttle blast across Delhi Central Vista and the Yamuna Cable-Stayed Bridge into Noida.',
    marker: { x: 0, z: -550, radius: 10 },
    laps: 1,
    checkpoints: [
      { x: 0, z: -660, radius: 18 },
      { x: 0, z: -840, radius: 18 },
      { x: 0, z: -980, radius: 18 },
      { x: 0, z: -1080, radius: 18 },
    ],
    targetTime: 28,
    reward: { cash: 2400, xp: 400, rep: 160 },
    bonusReward: { cash: 1000, xp: 180, rep: 70 },
    opponents: [
      { name: 'Aakash (Phantom)', vehicleId: 'garuda-rx', color: 0x111317 },
      { name: 'Meera (Cyclone)', vehicleId: 'apex-gt', color: 0x8a2be2 },
      { name: 'Raj (Thunder)', vehicleId: 'kaveri-gt', color: 0xff7a18 },
    ],
  },

  // --- Region 3 & 4: Noida Expressway & Sector 143 Tech Finale ---
  {
    id: 'sector-143-championship',
    label: 'Sector 143 Innovation Grand Championship',
    type: EVENT_TYPES.CIRCUIT,
    difficulty: 'Elite Master',
    description: 'Final 2-lap championship finale around the futuristic Sector 143 Innovation Center and Tech Valley.',
    marker: { x: 0, z: -1450, radius: 11 },
    laps: 2,
    checkpoints: [
      { x: 0, z: -1560, radius: 20 },
      { x: 0, z: -1680, radius: 20 },
      { x: 180, z: -1700, radius: 18 },
      { x: -180, z: -1700, radius: 18 },
      { x: 0, z: -1560, radius: 20 },
      { x: 0, z: -1450, radius: 20 },
    ],
    targetTime: 70,
    reward: { cash: 5000, xp: 1000, rep: 450 },
    bonusReward: { cash: 2500, xp: 500, rep: 200 },
    opponents: [
      { name: 'Veer (Apex Legend)', vehicleId: 'apex-gt', color: 0x111317 },
      { name: 'Tara (Electro)', vehicleId: 'kaveri-gt', color: 0x00d4aa },
      { name: 'Karan (Titan)', vehicleId: 'sherpa-4x4', color: 0x5a4d41 },
      { name: 'Zoya (Fury)', vehicleId: 'garuda-rx', color: 0xd62828 },
    ],
  },
];

export function getEventById(id) {
  return raceEvents.find((e) => e.id === id) || null;
}
