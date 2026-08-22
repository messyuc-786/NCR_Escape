import { RACE_STATE } from '/js/racing/raceSystem.js';
import { UPGRADES } from '/js/progression/progression.js';
import { VEHICLE_CATALOGUE, AVAILABLE_PAINTS } from '/js/vehicles/vehicle.js';

// Game UI Controller for NCR ESCAPE (spec §17-18).
// Manages Garage car selection, paint customizer, performance upgrades, event HUD, live position & laps, and results.

const el = (id) => document.getElementById(id);

export class GameUI {
  constructor(progression, onBuyUpgrade, onSelectVehicle, onSelectPaint, onCloseGarage) {
    this.progression = progression;
    this.onBuyUpgrade = onBuyUpgrade;
    this.onSelectVehicle = onSelectVehicle;
    this.onSelectPaint = onSelectPaint;
    this.onCloseGarage = onCloseGarage;

    this.prompt = el('event-prompt');
    this.countdown = el('countdown');
    this.raceHud = el('race-hud');
    this.raceTimer = el('race-timer');
    this.raceCheckpoint = el('race-checkpoint');
    this.racePosition = el('race-position');
    this.results = el('results');
    this.resultsBody = el('results-body');
    this.garage = el('garage');
    this.garageBody = el('garage-body');
    this.walletEl = el('wallet');
    this.driftHud = el('drift-hud');
    this.driftScoreEl = el('drift-score');

    el('results-close').addEventListener('click', () => {
      this.results.classList.add('hidden');
      if (this.onResultsClosed) this.onResultsClosed();
    });

    el('garage-close').addEventListener('click', () => {
      this.garage.classList.add('hidden');
      if (this.onCloseGarage) this.onCloseGarage();
    });

    el('garage-open').addEventListener('click', () => this.openGarage());
  }

  updateWallet() {
    const d = this.progression.data;
    this.walletEl.innerHTML =
      `<span class="w-cash">₹${d.cash.toLocaleString('en-IN')}</span>` +
      `<span class="w-sep">·</span><span class="w-xp">LV ${this.progression.level}</span>` +
      `<span class="w-sep">·</span><span class="w-rep">REP ${d.rep}</span>`;
  }

  updateDrift(driftScore, comboMultiplier, isDrifting) {
    if (!this.driftHud) return;
    if (isDrifting && driftScore > 20) {
      this.driftHud.classList.remove('hidden');
      this.driftScoreEl.innerHTML = `DRIFT <strong>+${Math.floor(driftScore)}</strong> <span class="d-mult">x${comboMultiplier.toFixed(1)}</span>`;
    } else {
      this.driftHud.classList.add('hidden');
    }
  }

  updateRace(race) {
    const s = race.state;

    this.prompt.classList.toggle('hidden', s !== RACE_STATE.PROMPT);
    if (s === RACE_STATE.PROMPT && race.nearbyEvent) {
      el('event-name').textContent = race.nearbyEvent.label;
      el('event-desc').textContent = race.nearbyEvent.description;
    }

    const inCountdown = s === RACE_STATE.COUNTDOWN;
    this.countdown.classList.toggle('hidden', !inCountdown);
    if (inCountdown) {
      const n = Math.ceil(race.countdown);
      this.countdown.textContent = n > 0 ? String(n) : 'GO!';
    }

    const racing = s === RACE_STATE.RACING;
    this.raceHud.classList.toggle('hidden', !racing);
    if (racing && race.activeEvent) {
      this.raceTimer.textContent = race.elapsed.toFixed(2);
      const total = race.activeEvent.checkpoints.length;
      const cpText = `CP ${Math.min(race.checkpointIndex + 1, total)} / ${total}`;
      const lapText = race.totalLaps > 1 ? ` · LAP ${race.currentLap} / ${race.totalLaps}` : '';
      this.raceCheckpoint.textContent = `${cpText}${lapText}`;

      if (this.racePosition) {
        const totalRacers = race.aiOpponents.length + 1;
        this.racePosition.textContent = `POS ${race.playerPosition} / ${totalRacers}`;
      }
    }
  }

  showResults(result) {
    const t = result.time.toFixed(2);
    const posSuffix = result.position === 1 ? '1st' : result.position === 2 ? '2nd' : result.position === 3 ? '3rd' : `${result.position}th`;
    const posBadge = `<div class="res-pos-badge ${result.position === 1 ? 'gold' : result.position <= 3 ? 'podium' : ''}">FINISH: ${posSuffix} of ${result.totalRacers}</div>`;

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
    this.results.classList.remove('hidden');
    this.updateWallet();
  }

  openGarage() {
    this.renderGarage();
    this.garage.classList.remove('hidden');
  }

  renderGarage() {
    const p = this.progression;
    const currentCar = p.getSelectedVehicle();
    const unlocked = p.data.unlockedVehicles || ['vantra-rs'];

    // 1. Vehicle Selection Bar
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
        <div class="car-card ${isSelected ? 'selected' : ''}">
          <div class="car-card-header">
            <strong>${car.name}</strong>
            <span>${car.category}</span>
          </div>
          <div class="car-stats-mini">
            <div><span>SPEED</span> ${(car.topSpeed * 3.6).toFixed(0)} km/h</div>
            <div><span>ACCEL</span> ${car.acceleration} m/s²</div>
            <div><span>GRIP</span> ${(car.grip * 100).toFixed(0)}%</div>
          </div>
          ${btn}
        </div>
      `;
    }).join('');

    // 2. Color Palette Selector
    const paintSwatches = AVAILABLE_PAINTS.map((pt) => {
      const isSelected = (p.data.selectedPaint || currentCar.defaultColor) === pt.hex;
      return `<div class="paint-swatch ${isSelected ? 'active' : ''}" style="background-color: #${pt.hex.toString(16).padStart(6, '0')}" title="${pt.name}" data-color="${pt.hex}"></div>`;
    }).join('');

    // 3. Performance Upgrades Rows
    const rows = Object.entries(UPGRADES).map(([key, def]) => {
      const lvl = p.data.upgrades[key] || 0;
      const cost = p.upgradeCost(key);
      const maxed = cost === null;
      const afford = p.canAfford(key);
      const pips = Array.from({ length: def.max }, (_, i) =>
        `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
      const btn = maxed
        ? `<button class="up-btn" disabled>MAX</button>`
        : `<button class="up-btn" data-key="${key}" ${afford ? '' : 'disabled'}>₹${cost.toLocaleString('en-IN')}</button>`;
      return `<div class="up-row">
          <div class="up-meta"><span class="up-name">${def.label}</span>
          <span class="up-stat">${def.stat}</span></div>
          <div class="up-pips">${pips}</div>${btn}</div>`;
    }).join('');

    this.garageBody.innerHTML = `
      <div class="garage-section-title">VEHICLE LINEUP</div>
      <div class="garage-car-grid">${vehicleCards}</div>

      <div class="garage-section-title">CUSTOM PAINT</div>
      <div class="garage-paint-palette">${paintSwatches}</div>

      <div class="garage-section-title">PERFORMANCE TUNING — ${currentCar.name}</div>
      <div class="garage-upgrade-list">${rows}</div>
    `;

    // Event listeners
    this.garageBody.querySelectorAll('.up-btn[data-key]').forEach((b) => {
      b.addEventListener('click', () => {
        if (this.onBuyUpgrade(b.dataset.key)) {
          this.renderGarage();
          this.updateWallet();
        }
      });
    });

    this.garageBody.querySelectorAll('.car-act-btn[data-select]').forEach((b) => {
      b.addEventListener('click', () => {
        if (this.onSelectVehicle(b.dataset.select)) {
          this.renderGarage();
          this.updateWallet();
        }
      });
    });

    this.garageBody.querySelectorAll('.car-act-btn[data-buy]').forEach((b) => {
      b.addEventListener('click', () => {
        if (p.buyVehicle(b.dataset.buy)) {
          if (this.onSelectVehicle) this.onSelectVehicle(b.dataset.buy);
          this.renderGarage();
          this.updateWallet();
        }
      });
    });

    this.garageBody.querySelectorAll('.paint-swatch[data-color]').forEach((sw) => {
      sw.addEventListener('click', () => {
        const hex = parseInt(sw.dataset.color, 10);
        p.selectPaint(hex);
        if (this.onSelectPaint) this.onSelectPaint(hex);
        this.renderGarage();
      });
    });

    this.updateWallet();
  }
}
