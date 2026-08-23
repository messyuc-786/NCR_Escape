import { VEHICLE_CATALOGUE, AVAILABLE_PAINTS } from '../vehicles/vehicle.js';

// Phase 6 Progression & Economy (spec §15-17).
// Cash, XP, Reputation, Level, Garage Vehicles, Custom Paint, and Performance Upgrades.
// Persisted locally with graceful fallback.

const STORAGE_KEY = 'ncr-escape:save:v2';

export const UPGRADES = {
  engine:   { label: 'Engine Tune',      max: 4, baseCost: 600,  stat: 'acceleration', perLevel: 0.12 },
  turbo:    { label: 'Turbo / Induction', max: 4, baseCost: 900,  stat: 'topSpeed',     perLevel: 0.08 },
  tires:    { label: 'Street Tires',      max: 4, baseCost: 500,  stat: 'grip',         perLevel: 0.04 },
  brakes:   { label: 'Sport Brakes',      max: 4, baseCost: 450,  stat: 'braking',      perLevel: 0.10 },
  handling: { label: 'Suspension & Sway', max: 4, baseCost: 550,  stat: 'handling',     perLevel: 0.07 },
};

const DEFAULT_SAVE = {
  cash: 0,
  xp: 0,
  rep: 0,
  selectedVehicleId: 'vantra-rs',
  unlockedVehicles: ['vantra-rs'],
  selectedPaint: null,
  selectedNeon: null,
  completedEvents: [],
  upgrades: { engine: 0, turbo: 0, tires: 0, brakes: 0, handling: 0 },
};

export class Progression {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('ncr-escape:save:v1');
      if (!raw) return { ...DEFAULT_SAVE, upgrades: { ...DEFAULT_SAVE.upgrades } };
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SAVE,
        ...parsed,
        unlockedVehicles: Array.isArray(parsed.unlockedVehicles) ? parsed.unlockedVehicles : ['vantra-rs'],
        upgrades: { ...DEFAULT_SAVE.upgrades, ...(parsed.upgrades || {}) },
      };
    } catch {
      return { ...DEFAULT_SAVE, upgrades: { ...DEFAULT_SAVE.upgrades } };
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      /* storage unavailable — stays in memory */
    }
  }

  get level() {
    return Math.floor(this.data.xp / 500) + 1;
  }

  awardRace(result, eventId) {
    this.data.cash += result.cash;
    this.data.xp += result.xp;
    this.data.rep += result.rep;
    if (eventId && !this.data.completedEvents.includes(eventId)) {
      this.data.completedEvents.push(eventId);
    }
    this.save();
  }

  awardSpeedTrap(cash, rep = 25) {
    this.data.cash += cash;
    this.data.rep += rep;
    this.data.xp += Math.round(cash * 0.4);
    this.save();
  }

  awardPoliceEscape(cash, rep) {
    this.data.cash += cash;
    this.data.rep += rep;
    this.data.xp += Math.round(cash * 0.5);
    this.save();
  }

  deductBustFine(fine) {
    this.data.cash = Math.max(0, this.data.cash - fine);
    this.save();
  }

  awardDrift(points) {
    if (points <= 0) return 0;
    const cashReward = Math.floor(points / 25);
    const xpReward = Math.floor(points / 50);
    this.data.cash += cashReward;
    this.data.xp += xpReward;
    this.save();
    return cashReward;
  }

  upgradeCost(key) {
    const def = UPGRADES[key];
    const lvl = this.data.upgrades[key] || 0;
    if (lvl >= def.max) return null;
    return Math.round(def.baseCost * Math.pow(1.6, lvl));
  }

  canAfford(key) {
    const cost = this.upgradeCost(key);
    return cost !== null && this.data.cash >= cost;
  }

  buyUpgrade(key) {
    const cost = this.upgradeCost(key);
    if (cost === null || this.data.cash < cost) return false;
    this.data.cash -= cost;
    this.data.upgrades[key] = (this.data.upgrades[key] || 0) + 1;
    this.save();
    return true;
  }

  buyVehicle(vehicleId) {
    const carDef = VEHICLE_CATALOGUE[vehicleId];
    if (!carDef || this.data.unlockedVehicles.includes(vehicleId)) return false;
    if (this.data.cash < carDef.price) return false;

    this.data.cash -= carDef.price;
    this.data.unlockedVehicles.push(vehicleId);
    this.data.selectedVehicleId = vehicleId;
    this.save();
    return true;
  }

  selectVehicle(vehicleId) {
    if (this.data.unlockedVehicles.includes(vehicleId)) {
      this.data.selectedVehicleId = vehicleId;
      this.save();
      return true;
    }
    return false;
  }

  selectPaint(colorHex) {
    this.data.selectedPaint = colorHex;
    this.save();
  }

  selectNeon(neonHex) {
    this.data.selectedNeon = neonHex;
    this.save();
  }

  getSelectedVehicle() {
    const id = this.data.selectedVehicleId || 'vantra-rs';
    return VEHICLE_CATALOGUE[id] || VEHICLE_CATALOGUE['vantra-rs'];
  }

  /**
   * Applies purchased upgrades to a vehicle config, modifying real physics stats.
   */
  applyUpgrades(baseVehicle = this.getSelectedVehicle()) {
    const v = { ...baseVehicle };
    for (const [key, def] of Object.entries(UPGRADES)) {
      const lvl = this.data.upgrades[key] || 0;
      if (lvl > 0) v[def.stat] = v[def.stat] * (1 + def.perLevel * lvl);
    }
    if (v.grip > 0.99) v.grip = 0.99;
    return v;
  }

  reset() {
    this.data = { ...DEFAULT_SAVE, upgrades: { ...DEFAULT_SAVE.upgrades } };
    this.save();
  }
}
