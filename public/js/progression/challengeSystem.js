import { ALL_CHALLENGES } from './challengeTemplates.js';

export class ChallengeSystem {
  constructor(progression) {
    this.progression = progression;

    this.STORAGE_KEY_COMPLETED = 'ncr-escape:completed-challenges:v1';
    this.STORAGE_KEY_DAILY = 'ncr-escape:daily-challenges:v1';
    this.STORAGE_KEY_DAILY_DATE = 'ncr-escape:daily-date:v1';
    this.STORAGE_KEY_PROGRESS = 'ncr-escape:challenge-progress:v1';

    this.completedIds = this.loadCompleted();
    this.permanentProgress = this.loadPermanentProgress();

    this.activeRunStats = this.getResetRunStats();
    this.completedThisRun = [];

    this.dailyChallenges = [];
    this.checkDailyReset();

    this.activeHUDChallenge = null;
    this.hudElement = null;
    this.hudTitleEl = null;
    this.hudProgressEl = null;
    this.hudIconEl = null;

    this.toastElement = null;
    this.toastTitleEl = null;
    this.toastRewardEl = null;
    this.toastTimeout = null;

    this.initDOM();
    this.selectTrackedChallenge();
  }

  loadCompleted() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_COMPLETED);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveCompleted() {
    try {
      localStorage.setItem(this.STORAGE_KEY_COMPLETED, JSON.stringify(this.completedIds));
    } catch {}
  }

  loadPermanentProgress() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_PROGRESS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  savePermanentProgress() {
    try {
      localStorage.setItem(this.STORAGE_KEY_PROGRESS, JSON.stringify(this.permanentProgress));
    } catch {}
  }

  getResetRunStats() {
    return {
      nearMisses: 0,
      combo: 1,
      topSpeed: 0,
      distance: 0, // meters
      timeWithoutCrash: 0, // seconds
      crashed: false,
      nitroUsedInCombo: false,
      truckOvertakes: 0,
      crossedYamuna: false,
      visitedDistricts: new Set(),
      expresswaySpeedReached: false,
      consecutiveNearMisses: 0
    };
  }

  initDOM() {
    this.hudElement = document.getElementById('challenge-hud');
    this.hudTitleEl = document.getElementById('challenge-hud-title');
    this.hudProgressEl = document.getElementById('challenge-hud-progress');
    this.hudIconEl = document.getElementById('challenge-hud-icon');

    // Create toast notification DOM elements if missing
    this.toastElement = document.getElementById('challenge-complete-toast');
    if (!this.toastElement) {
      this.toastElement = document.createElement('div');
      this.toastElement.id = 'challenge-complete-toast';
      this.toastElement.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #1e293b, #0f172a);
        border: 2px solid #ff7a18;
        border-radius: 12px;
        padding: 16px 24px;
        color: #fff;
        font-family: 'Rajdhani', sans-serif;
        box-shadow: 0 10px 25px rgba(0,0,0,0.6), 0 0 15px rgba(255,122,24,0.3);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 4px;
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s;
        transform: translateY(-50px) scale(0.9);
        opacity: 0;
        pointer-events: none;
      `;
      
      this.toastTitleEl = document.createElement('div');
      this.toastTitleEl.style.cssText = 'font-weight: 900; font-size: 16px; color: #ff7a18; letter-spacing: 0.5px;';
      this.toastElement.appendChild(this.toastTitleEl);

      const desc = document.createElement('div');
      desc.textContent = 'CHALLENGE COMPLETED';
      desc.style.cssText = 'font-size: 10px; font-weight: 800; color: #ffd166; letter-spacing: 2px;';
      this.toastElement.insertBefore(desc, this.toastTitleEl);

      this.toastRewardEl = document.createElement('div');
      this.toastRewardEl.style.cssText = 'font-size: 13px; font-weight: 700; color: #38ef7d;';
      this.toastElement.appendChild(this.toastRewardEl);

      document.body.appendChild(this.toastElement);
    } else {
      this.toastTitleEl = this.toastElement.querySelector('.toast-title');
      this.toastRewardEl = this.toastElement.querySelector('.toast-rewards');
    }
  }

  checkDailyReset() {
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem(this.STORAGE_KEY_DAILY_DATE);
    
    if (lastDate !== today) {
      // Pick 3 new random challenges for the day
      const nonDaily = ALL_CHALLENGES.filter(c => c.scope !== 'run');
      const shuffled = [...nonDaily].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3).map(c => ({
        ...c,
        id: `daily_${c.id}`,
        isDaily: true,
        dailyDate: today
      }));
      
      localStorage.setItem(this.STORAGE_KEY_DAILY, JSON.stringify(selected));
      localStorage.setItem(this.STORAGE_KEY_DAILY_DATE, today);
      this.dailyChallenges = selected;
    } else {
      try {
        this.dailyChallenges = JSON.parse(localStorage.getItem(this.STORAGE_KEY_DAILY)) || [];
      } catch {
        this.dailyChallenges = [];
      }
    }
  }

  getActiveChallengesList() {
    return [...ALL_CHALLENGES, ...this.dailyChallenges];
  }

  getChallengeProgress(c) {
    if (this.completedIds.includes(c.id)) {
      return c.target;
    }
    if (c.scope === 'run') {
      if (c.id.includes('near_miss_10')) return this.activeRunStats.nearMisses;
      if (c.id.includes('clean_5k')) return this.activeRunStats.crashed ? 0 : Math.round(this.activeRunStats.distance);
      if (c.id.includes('survivor_5m')) return Math.round(this.activeRunStats.timeWithoutCrash);
      if (c.id.includes('run_gurugram')) return this.activeRunStats.visitedDistricts.has('Gurugram') || this.activeRunStats.visitedDistricts.has('Cyber District') || this.activeRunStats.visitedDistricts.has('Corporate Mile') ? 1 : 0;
      if (c.id.includes('run_delhi')) return this.activeRunStats.visitedDistricts.has('Delhi') || this.activeRunStats.visitedDistricts.has('Delhi Central') ? 1 : 0;
      if (c.id.includes('run_noida')) return this.activeRunStats.visitedDistricts.has('Noida') || this.activeRunStats.visitedDistricts.has('Noida Expressway') ? 1 : 0;
      if (c.id.includes('run_yamuna')) return this.activeRunStats.crossedYamuna ? 1 : 0;
      if (c.id.includes('nitro_in_combo')) return this.activeRunStats.nitroUsedInCombo ? 1 : 0;
      if (c.id.includes('slalom_8_run')) return this.activeRunStats.consecutiveNearMisses;
      if (c.id.includes('night_rider')) return this.activeRunStats.visitedDistricts.size > 0 && window.getCurrentDistrictLightingMode?.() === 'night' ? 1 : 0;
      if (c.id.includes('monsoon_driver')) return this.activeRunStats.visitedDistricts.size > 0 && window.weather?.currentWeather === 'rain' ? 1 : 0;
      return 0;
    }
    // Permanent scope
    if (c.id.includes('near_miss_5') || c.id.includes('near_miss_25') || c.id.includes('near_miss_50')) {
      return this.permanentProgress.totalNearMisses || 0;
    }
    if (c.id.includes('speed_')) {
      return this.permanentProgress.topSpeed || 0;
    }
    if (c.id.includes('combo_')) {
      return this.permanentProgress.topCombo || 0;
    }
    if (c.id.includes('dist_')) {
      return Math.round(this.permanentProgress.totalDistance || 0);
    }
    if (c.id.includes('expressway_speed')) {
      return this.permanentProgress.expresswayTopSpeed || 0;
    }
    if (c.id.includes('heavy_overtake')) {
      return this.permanentProgress.totalHeavyOvertakes || 0;
    }
    return 0;
  }

  selectTrackedChallenge() {
    const active = this.getActiveChallengesList();
    const nextTrack = active.find(c => !this.completedIds.includes(c.id));
    this.activeHUDChallenge = nextTrack || null;
    this.updateHUDDisplay();
  }

  updateHUDDisplay() {
    if (!this.hudElement) return;

    if (!this.activeHUDChallenge) {
      this.hudElement.classList.add('hidden');
      return;
    }

    this.hudElement.classList.remove('hidden');
    const progress = this.getChallengeProgress(this.activeHUDChallenge);
    const target = this.activeHUDChallenge.target;

    let displayProgress = progress;
    let displayTarget = target;
    if (this.activeHUDChallenge.id.includes('dist_') || this.activeHUDChallenge.id.includes('clean_5k')) {
      // Display meters to km
      displayProgress = (progress / 1000).toFixed(1);
      displayTarget = (target / 1000).toFixed(1);
    }

    if (this.hudTitleEl) this.hudTitleEl.textContent = this.activeHUDChallenge.title;
    if (this.hudProgressEl) this.hudProgressEl.textContent = `${displayProgress} / ${displayTarget} ${this.activeHUDChallenge.id.includes('speed_') || this.activeHUDChallenge.id.includes('expressway_') ? 'KM/H' : this.activeHUDChallenge.id.includes('dist_') || this.activeHUDChallenge.id.includes('clean_') ? 'KM' : ''}`;
    
    // Bounce animation
    this.hudElement.style.transform = 'translateX(-50%) scale(1.08)';
    setTimeout(() => {
      this.hudElement.style.transform = 'translateX(-50%) scale(1)';
    }, 150);
  }

  checkCompletions() {
    const list = this.getActiveChallengesList();
    list.forEach(c => {
      if (this.completedIds.includes(c.id)) return;

      const progress = this.getChallengeProgress(c);
      if (progress >= c.target) {
        this.completeChallenge(c);
      }
    });
  }

  completeChallenge(c) {
    this.completedIds.push(c.id);
    this.saveCompleted();

    this.completedThisRun.push(c);

    // Award Rewards
    this.progression.data.xp += c.xp;
    this.progression.data.cash += c.credits;
    this.progression.save();

    // Show completion toast
    this.showToast(c);

    // Audio chime cue
    if (window.audioEngine?.playChime) {
      window.audioEngine.playChime();
    }

    // Refresh active HUD challenge
    this.selectTrackedChallenge();
  }

  showToast(c) {
    if (!this.toastElement) return;

    if (this.toastTitleEl) this.toastTitleEl.textContent = `🎯 ${c.title}`;
    if (this.toastRewardEl) this.toastRewardEl.textContent = `+${c.xp} XP · +₹${c.credits.toLocaleString('en-IN')}`;

    this.toastElement.style.transform = 'translateY(0) scale(1)';
    this.toastElement.style.opacity = '1';

    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastElement.style.transform = 'translateY(-50px) scale(0.9)';
      this.toastElement.style.opacity = '0';
    }, 3200);
  }

  // --- Game Event Entry Hooks (Update values and check achievements) ---
  recordNearMiss(isHeavy = false, targetCloseness = 0.5) {
    this.activeRunStats.nearMisses++;
    this.activeRunStats.consecutiveNearMisses++;

    this.permanentProgress.totalNearMisses = (this.permanentProgress.totalNearMisses || 0) + 1;

    if (isHeavy) {
      this.activeRunStats.truckOvertakes++;
      this.permanentProgress.totalHeavyOvertakes = (this.permanentProgress.totalHeavyOvertakes || 0) + 1;
    }

    this.savePermanentProgress();
    this.checkCompletions();
    this.updateHUDDisplay();
  }

  recordSpeed(kmh, districtName = '') {
    const speed = Math.round(kmh);
    if (speed > this.activeRunStats.topSpeed) {
      this.activeRunStats.topSpeed = speed;
    }

    if (speed > (this.permanentProgress.topSpeed || 0)) {
      this.permanentProgress.topSpeed = speed;
      this.savePermanentProgress();
    }

    // Noida expressway speedcheck
    if ((districtName === 'Noida Expressway' || districtName === 'Noida') && speed >= 150) {
      this.permanentProgress.expresswayTopSpeed = Math.max(this.permanentProgress.expresswayTopSpeed || 0, speed);
      this.savePermanentProgress();
    }

    this.checkCompletions();
    this.updateHUDDisplay();
  }

  recordCombo(mult) {
    const rounded = Math.floor(mult);
    if (rounded > this.activeRunStats.combo) {
      this.activeRunStats.combo = rounded;
    }

    if (rounded > (this.permanentProgress.topCombo || 0)) {
      this.permanentProgress.topCombo = rounded;
      this.savePermanentProgress();
    }

    if (rounded > 1 && window.input?.isNitroActive && window.input.isNitroActive()) {
      this.activeRunStats.nitroUsedInCombo = true;
    }

    this.checkCompletions();
    this.updateHUDDisplay();
  }

  recordDistance(meters) {
    const dist = Math.max(0, meters);
    this.activeRunStats.distance += dist;

    this.permanentProgress.totalDistance = (this.permanentProgress.totalDistance || 0) + dist;
    this.savePermanentProgress();

    this.checkCompletions();
    this.updateHUDDisplay();
  }

  recordTimeStep(dt) {
    if (!this.activeRunStats.crashed) {
      this.activeRunStats.timeWithoutCrash += dt;
      this.checkCompletions();
      this.updateHUDDisplay();
    }
  }

  recordDistrict(name) {
    if (name) {
      this.activeRunStats.visitedDistricts.add(name);
      if (name === 'Yamuna Crossing' || name === 'Yamuna River Crossing') {
        this.activeRunStats.crossedYamuna = true;
      }
      this.checkCompletions();
      this.updateHUDDisplay();
    }
  }

  recordCrash() {
    this.activeRunStats.crashed = true;
    this.activeRunStats.consecutiveNearMisses = 0;
    this.updateHUDDisplay();
  }

  // --- Reset/Start/End Runs ---
  startRun() {
    this.activeRunStats = this.getResetRunStats();
    this.completedThisRun = [];
    this.selectTrackedChallenge();
  }

  endRun() {
    const list = this.getActiveChallengesList();
    
    // Check one last time for run-end milestones (Gurugram run complete, etc.)
    this.checkCompletions();
    
    // Return summary of run rewards
    const xpRewards = this.completedThisRun.reduce((acc, c) => acc + c.xp, 0);
    const creditRewards = this.completedThisRun.reduce((acc, c) => acc + c.credits, 0);

    return {
      xp: xpRewards,
      credits: creditRewards,
      completedCount: this.completedThisRun.length,
      completedChallenges: this.completedThisRun
    };
  }
}
