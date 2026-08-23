// Achievement & Milestone System for NCR ESCAPE (spec §17, §21).
// Tracks gameplay milestones, awards cash/rep bonuses, and shows glowing toast notifications.

export const ACHIEVEMENTS = [
  {
    id: 'speed_demon',
    title: 'SPEED DEMON',
    desc: 'Reach 200+ km/h on the open highway',
    rewardCash: 1000,
    rewardRep: 50,
    icon: '🚀',
  },
  {
    id: 'drift_master',
    title: 'NCR DRIFT KING',
    desc: 'Score over 1,000 points in a single drift chain',
    rewardCash: 1500,
    rewardRep: 75,
    icon: '💨',
  },
  {
    id: 'grand_tourer',
    title: 'NCR GRAND TOURER',
    desc: 'Cruise across all 4 major NCR regions',
    rewardCash: 2500,
    rewardRep: 120,
    icon: '🗺️',
  },
  {
    id: 'police_evader',
    title: 'MOST WANTED ESCAPEE',
    desc: 'Evade police pursuit at Heat Level 2 or higher',
    rewardCash: 3000,
    rewardRep: 150,
    icon: '🚔',
  },
  {
    id: 'near_miss_pro',
    title: 'HAIR TRIGGER REFLEXES',
    desc: 'Perform 5 high-speed traffic near-misses',
    rewardCash: 1200,
    rewardRep: 60,
    icon: '⚡',
  },
  {
    id: 'first_victory',
    title: 'PODIUM CHAMPION',
    desc: 'Claim 1st place in any street race event',
    rewardCash: 2000,
    rewardRep: 100,
    icon: '🏆',
  },
  {
    id: 'tuning_master',
    title: 'MASTER TUNER',
    desc: 'Upgrade any vehicle component to MAX Tier',
    rewardCash: 1800,
    rewardRep: 80,
    icon: '🛠️',
  },
  {
    id: 'photo_artist',
    title: 'SHUTTERBUG',
    desc: 'Compose and capture a photo in Photo Mode',
    rewardCash: 500,
    rewardRep: 25,
    icon: '📸',
  },
  {
    id: 'radar_ace',
    title: 'RADAR RUNNER',
    desc: 'Beat the speed limit on 3 Expressway speed traps',
    rewardCash: 1500,
    rewardRep: 70,
    icon: '📷',
  },
];

export class AchievementSystem {
  constructor(progression, onUnlock) {
    this.progression = progression;
    this.onUnlock = onUnlock;

    // Load unlocked achievements from progression storage
    if (!this.progression.data.unlockedAchievements) {
      this.progression.data.unlockedAchievements = [];
    }

    this.visitedDistricts = new Set();
    this.nearMissCount = 0;
    this.radarCount = 0;

    this.initHUD();
  }

  initHUD() {
    this.hud = document.getElementById('achievement-hud');
    this.titleEl = document.getElementById('ach-title');
    this.descEl = document.getElementById('ach-desc');
    this.rewardEl = document.getElementById('ach-reward');
    this.hideTimeout = null;
  }

  unlock(id) {
    if (this.progression.data.unlockedAchievements.includes(id)) return;

    const ach = ACHIEVEMENTS.find((a) => a.id === id);
    if (!ach) return;

    this.progression.data.unlockedAchievements.push(id);
    this.progression.data.cash += ach.rewardCash;
    this.progression.data.rep += ach.rewardRep;
    this.progression.save();

    this.showToast(ach);

    if (this.onUnlock) {
      this.onUnlock(ach);
    }
  }

  showToast(ach) {
    if (!this.hud) return;

    if (this.titleEl) this.titleEl.textContent = `${ach.icon} ${ach.title}`;
    if (this.descEl) this.descEl.textContent = ach.desc;
    if (this.rewardEl) this.rewardEl.textContent = `+₹${ach.rewardCash.toLocaleString('en-IN')} · +${ach.rewardRep} REP`;

    this.hud.classList.remove('hidden');

    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => {
      this.hud.classList.add('hidden');
    }, 3500);
  }

  recordSpeed(kmh) {
    if (kmh >= 200) {
      this.unlock('speed_demon');
    }
  }

  recordDrift(score) {
    if (score >= 1000) {
      this.unlock('drift_master');
    }
  }

  recordDistrict(name) {
    this.visitedDistricts.add(name);
    if (this.visitedDistricts.size >= 4) {
      this.unlock('grand_tourer');
    }
  }

  recordNearMiss() {
    this.nearMissCount++;
    if (this.nearMissCount >= 5) {
      this.unlock('near_miss_pro');
    }
  }

  recordSpeedTrapBeat() {
    this.radarCount++;
    if (this.radarCount >= 3) {
      this.unlock('radar_ace');
    }
  }

  recordRaceWin(position) {
    if (position === 1) {
      this.unlock('first_victory');
    }
  }

  recordPoliceEscape(heat) {
    if (heat >= 2) {
      this.unlock('police_evader');
    }
  }

  recordUpgrade() {
    const ups = this.progression.data.upgrades;
    for (const lvl of Object.values(ups)) {
      if (lvl >= 5) {
        this.unlock('tuning_master');
        break;
      }
    }
  }

  recordPhotoTaken() {
    this.unlock('photo_artist');
  }

  getUnlockedList() {
    return this.progression.data.unlockedAchievements;
  }
}
