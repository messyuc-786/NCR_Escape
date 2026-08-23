import { RACE_STATE } from '../racing/raceSystem.js';
import { UPGRADES } from '../progression/progression.js';
import { VEHICLE_CATALOGUE, AVAILABLE_PAINTS, AVAILABLE_NEONS } from '../vehicles/vehicle.js';
import { ACHIEVEMENTS } from '../progression/achievementSystem.js';

// Game UI Controller for NCR ESCAPE (spec §17-18).
// Manages Garage car selection, paint customizer, underglow neons, performance upgrades, achievements, and results.

const el = (id) => document.getElementById(id);

export class GameUI {
  constructor(progression, onBuyUpgrade, onSelectVehicle, onSelectPaint, onSelectNeon, onCloseGarage) {
    this.progression = progression;
    this.onBuyUpgrade = onBuyUpgrade;
    this.onSelectVehicle = onSelectVehicle;
    this.onSelectPaint = onSelectPaint;
    this.onSelectNeon = typeof onSelectNeon === 'function' ? onSelectNeon : null;
    this.onCloseGarage = typeof onSelectNeon === 'function' ? onCloseGarage : onSelectNeon;

    this.prompt = el('event-prompt');
    this.countdown = el('countdown');
    this.raceHud = el('race-hud');
    this.raceTimer = el('race-timer');
    this.raceCheckpoint = el('race-checkpoint');
    this.racePosition = el('race-position');
    this.results = el('results-overlay') || el('results');
    this.resultsBody = el('results-rewards') || el('results-body');
    this.garage = el('garage-overlay') || el('garage');
    this.garageBody = el('tab-cars') || el('garage-body');
    this.walletEl = el('wallet');
    this.driftHud = el('drift-hud');
    this.driftScoreEl = el('drift-score');

    const resultsCloseBtn = el('results-dismiss') || el('results-close');
    if (resultsCloseBtn) {
      resultsCloseBtn.addEventListener('click', () => {
        if (this.results) this.results.classList.add('hidden');
        if (this.onResultsClosed) this.onResultsClosed();
      });
    }

    const garageCloseBtn = el('garage-close');
    if (garageCloseBtn) {
      garageCloseBtn.addEventListener('click', () => {
        if (this.garage) this.garage.classList.add('hidden');
        if (this.onCloseGarage) this.onCloseGarage();
      });
    }
  }

  updateWallet() {
    if (!this.walletEl) return;
    const d = this.progression.data;
    this.walletEl.innerHTML =
      `<span class="w-cash">₹${d.cash.toLocaleString('en-IN')}</span>` +
      `<span class="w-sep">·</span><span class="w-xp">LV ${this.progression.level}</span>` +
      `<span class="w-sep">·</span><span class="w-rep">REP ${d.rep}</span>`;
  }

  updateDrift(driftScore, comboMultiplier, isDrifting) {
    if (!this.driftHud || !this.driftScoreEl) return;
    if (isDrifting && driftScore > 20) {
      this.driftHud.classList.remove('hidden');
      this.driftScoreEl.innerHTML = `DRIFT <strong>+${Math.floor(driftScore)}</strong> <span class="d-mult">x${comboMultiplier.toFixed(1)}</span>`;
    } else {
      this.driftHud.classList.add('hidden');
    }
  }

  updateRace(race) {
    const s = race.state;

    if (this.prompt) {
      this.prompt.classList.toggle('hidden', s !== RACE_STATE.PROMPT);
      if (s === RACE_STATE.PROMPT && race.nearbyEvent) {
        const nameEl = el('event-name');
        const descEl = el('event-desc');
        if (nameEl) nameEl.textContent = race.nearbyEvent.label;
        if (descEl) descEl.textContent = race.nearbyEvent.description;
      }
    }

    const inCountdown = s === RACE_STATE.COUNTDOWN;
    if (this.countdown) {
      this.countdown.classList.toggle('hidden', !inCountdown);
      if (inCountdown) {
        const n = Math.ceil(race.countdown);
        this.countdown.textContent = n > 0 ? String(n) : 'GO!';
      }
    }

    const racing = s === RACE_STATE.RACING;
    if (this.raceHud) {
      this.raceHud.classList.toggle('hidden', !racing);
      if (racing && race.activeEvent) {
        if (this.raceTimer) this.raceTimer.textContent = race.elapsed.toFixed(2);
        const total = race.activeEvent.checkpoints.length;
        const cpText = `CP ${Math.min(race.checkpointIndex + 1, total)} / ${total}`;
        const lapText = race.totalLaps > 1 ? ` · LAP ${race.currentLap} / ${race.totalLaps}` : '';
        if (this.raceCheckpoint) this.raceCheckpoint.textContent = `${cpText}${lapText}`;

        if (this.racePosition) {
          const totalRacers = race.aiOpponents.length + 1;
          this.racePosition.textContent = `POS ${race.playerPosition} / ${totalRacers}`;
        }
      }
    }
  }

  showResults(result) {
    const t = result.time.toFixed(2);
    const posSuffix = result.position === 1 ? '1st' : result.position === 2 ? '2nd' : result.position === 3 ? '3rd' : `${result.position}th`;
    const posBadge = `<div class="res-pos-badge ${result.position === 1 ? 'gold' : result.position <= 3 ? 'podium' : ''}">FINISH: ${posSuffix} of ${result.totalRacers}</div>`;

    if (this.resultsBody) {
      this.resultsBody.innerHTML = `
        <div class="res-event">${result.eventLabel}</div>
        ${posBadge}
        <div class="res-time">${t}<span>s</span></div>
        <div class="res-target">${result.beatTarget
          ? `Beat target of ${result.targetTime}s — bonus awarded`
          : `Target was ${result.targetTime}s — no bonus`}</div>
        <div class="res-rewards">
          <div><span>CASH</span><strong>+₹${result.cash.toLocaleString('en-IN')}</strong></div>
          <div><span>XP</span><strong>+${result.xp}</strong></div>
          <div><span>REP</span><strong>+${result.rep}</strong></div>
        </div>`;
    }
    if (this.results) this.results.classList.remove('hidden');
    this.updateWallet();
  }

  openGarage() {
    this.renderGarage();
    if (this.garage) this.garage.classList.remove('hidden');
  }

  renderGarage() {
    const p = this.progression;
    const currentCar = p.getSelectedVehicle();
    const unlocked = p.data.unlockedVehicles || ['vantra-rs'];
    const unlockedAchs = p.data.unlockedAchievements || [];

    // Update garage dashboard header values (Step 6 / Step 10)
    const level = p.level;
    const currentLevelCumulativeXP = 250 * level * (level - 1);
    const nextLevelCumulativeXP = 250 * (level + 1) * level;
    const xpNeededForNextLevel = nextLevelCumulativeXP - currentLevelCumulativeXP;
    const xpEarnedInCurrentLevel = p.data.xp - currentLevelCumulativeXP;
    const xpPercent = Math.min(100, Math.max(0, (xpEarnedInCurrentLevel / xpNeededForNextLevel) * 100));

    const lvlEl = document.getElementById('garage-player-level');
    const xpBarEl = document.getElementById('garage-xp-progress-bar');
    const xpValEl = document.getElementById('garage-xp-val');
    const walletValEl = document.getElementById('garage-wallet-val');

    if (lvlEl) lvlEl.textContent = `LEVEL ${level}`;
    if (xpBarEl) xpBarEl.style.width = `${xpPercent}%`;
    if (xpValEl) xpValEl.textContent = `${xpEarnedInCurrentLevel} / ${xpNeededForNextLevel} XP`;
    if (walletValEl) walletValEl.textContent = `₹${p.data.cash.toLocaleString('en-IN')}`;

    // 1. Vehicle Selection Grid
    const vehicleCards = Object.values(VEHICLE_CATALOGUE).map((car) => {
      const isOwned = unlocked.includes(car.id);
      const isSelected = car.id === currentCar.id;
      const canBuy = p.data.cash >= car.price;

      let btn = '';
      if (isSelected) {
        btn = `<button class="car-act-btn active" disabled>SELECTED</button>`;
      } else if (isOwned) {
        btn = `<button class="car-act-btn select" data-select="${car.id}">DRIVE</button>`;
      } else {
        btn = `<button class="car-act-btn buy" data-buy="${car.id}" ${canBuy ? '' : 'disabled'}>BUY ₹${car.price.toLocaleString('en-IN')}</button>`;
      }

      return `
        <div class="garage-car-card ${isSelected ? 'selected' : ''}">
          <div class="car-cat">${car.category}</div>
          <div class="car-name">${car.name}</div>
          <div class="car-desc">${car.description}</div>
          <div class="car-specs">
            <div><span>TOP SPEED</span><strong>${Math.round(car.topSpeed * 3.6)} km/h</strong></div>
            <div><span>ACCEL</span><strong>${car.acceleration} m/s²</strong></div>
            <div><span>GRIP</span><strong>${Math.round(car.grip * 100)}%</strong></div>
          </div>
          ${btn}
        </div>
      `;
    }).join('');

    // 2. Custom Paint Palette
    const paintSwatches = AVAILABLE_PAINTS.map((paint) => {
      const isCur = (p.data.selectedPaint === paint.hex) || (!p.data.selectedPaint && paint.hex === currentCar.defaultColor);
      return `
        <button class="paint-swatch ${isCur ? 'active' : ''}" data-color="${paint.hex}" style="background-color: #${paint.hex.toString(16).padStart(6, '0')}" title="${paint.name}"></button>
      `;
    }).join('');

    // 2b. Underglow Ground Neons Palette
    const currentNeon = p.data.selectedNeon;
    const neonSwatches = AVAILABLE_NEONS.map((neon) => {
      const isCur = (currentNeon === neon.hex) || (currentNeon === null && neon.hex === null);
      const bg = neon.hex !== null ? `#${neon.hex.toString(16).padStart(6, '0')}` : '#1e293b';
      return `
        <button class="paint-swatch neon-swatch ${isCur ? 'active' : ''}" data-neon="${neon.hex !== null ? neon.hex : 'none'}" style="background-color: ${bg}; box-shadow: ${neon.hex !== null ? `0 0 10px ${bg}` : 'none'};" title="${neon.name}">
          ${neon.hex === null ? '✕' : ''}
        </button>
      `;
    }).join('');

    // 3. Performance Upgrades List
    const rows = Object.entries(UPGRADES).map(([key, def]) => {
      const lvl = p.data.upgrades[key] || 0;
      const cost = p.upgradeCost(key);
      const isMax = lvl >= def.max;
      const canBuy = p.canAfford(key);

      const pips = Array.from({ length: def.max }, (_, i) => `<span class="pip ${i < lvl ? 'on' : ''}"></span>`).join('');
      const btn = isMax
        ? `<button class="up-btn maxed" disabled>MAX</button>`
        : `<button class="up-btn" data-key="${key}" ${canBuy ? '' : 'disabled'}>UPGRADE ₹${cost.toLocaleString('en-IN')}</button>`;

      return `
        <div class="up-row">
          <div class="up-info">
            <span class="up-label">${def.label}</span>
            <div class="up-pips">${pips}</div>
          </div>
          ${btn}
        </div>
      `;
    }).join('');

    // 4. Achievements & Milestones List
    const achCards = ACHIEVEMENTS.map((ach) => {
      const isUnlocked = unlockedAchs.includes(ach.id);
      return `
        <div class="garage-ach-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="ach-icon">${ach.icon}</div>
          <div class="ach-info">
            <div class="ach-card-title">${ach.title} ${isUnlocked ? '✓' : ''}</div>
            <div class="ach-card-desc">${ach.desc}</div>
            <div class="ach-card-reward">+₹${ach.rewardCash.toLocaleString('en-IN')} · +${ach.rewardRep} REP</div>
          </div>
        </div>
      `;
    }).join('');

    const targetEl = el('garage-body') || this.garageBody;
    if (targetEl) {
      targetEl.innerHTML = `
        <div class="garage-section-title">VEHICLE LINEUP</div>
        <div class="garage-car-grid">${vehicleCards}</div>

        <div class="garage-section-title">CUSTOM BODY PAINT</div>
        <div class="garage-paint-palette">${paintSwatches}</div>

        <div class="garage-section-title">UNDERGLOW GROUND NEONS</div>
        <div class="garage-paint-palette">${neonSwatches}</div>

        <div class="garage-section-title">PERFORMANCE TUNING — ${currentCar.name}</div>
        <div class="garage-upgrade-list">${rows}</div>

        <div class="garage-section-title">ACHIEVEMENTS & MILESTONES (${unlockedAchs.length} / ${ACHIEVEMENTS.length})</div>
        <div class="garage-ach-grid">${achCards}</div>
      `;

      // Event listeners
      targetEl.querySelectorAll('.up-btn[data-key]').forEach((b) => {
        b.addEventListener('click', () => {
          if (this.onBuyUpgrade(b.dataset.key)) {
            this.renderGarage();
            this.updateWallet();
          }
        });
      });

      targetEl.querySelectorAll('.car-act-btn[data-select]').forEach((b) => {
        b.addEventListener('click', () => {
          if (this.onSelectVehicle(b.dataset.select)) {
            this.renderGarage();
            this.updateWallet();
          }
        });
      });

      targetEl.querySelectorAll('.car-act-btn[data-buy]').forEach((b) => {
        b.addEventListener('click', () => {
          if (p.buyVehicle(b.dataset.buy)) {
            if (this.onSelectVehicle) this.onSelectVehicle(b.dataset.buy);
            this.renderGarage();
            this.updateWallet();
          }
        });
      });

      targetEl.querySelectorAll('.paint-swatch[data-color]').forEach((sw) => {
        sw.addEventListener('click', () => {
          const hex = parseInt(sw.dataset.color, 10);
          p.selectPaint(hex);
          if (this.onSelectPaint) this.onSelectPaint(hex);
          this.renderGarage();
        });
      });

      targetEl.querySelectorAll('.paint-swatch[data-neon]').forEach((sw) => {
        sw.addEventListener('click', () => {
          const raw = sw.dataset.neon;
          const hex = raw === 'none' ? null : parseInt(raw, 10);
          p.selectNeon(hex);
          if (this.onSelectNeon) this.onSelectNeon(hex);
          this.renderGarage();
        });
      });
    }

    this.updateWallet();
  }
}
