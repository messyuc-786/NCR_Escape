import { RACE_STATE } from '../racing/raceSystem.js';
import { UPGRADES } from '../progression/progression.js';
import { VEHICLE_CATALOGUE, AVAILABLE_PAINTS, AVAILABLE_NEONS } from '../vehicles/vehicle.js';
import { ACHIEVEMENTS } from '../progression/achievementSystem.js';
import { audioEngine } from '../audio/audioEngine.js';

const el = (id) => document.getElementById(id);

export const AVAILABLE_HORNS = [
  { id: 0, name: 'NCR Tri-Tone Melodic', desc: 'Musical Indian pressure horn blast.' },
  { id: 1, name: 'Twin Electric Disc', desc: 'High-pitch piercing double disc.' },
  { id: 2, name: 'Pneumatic Highway Truck', desc: 'Deafening heavy-duty truck sound.' }
];

export function getCarUIStats(car, upgrades = { engine: 0, tires: 0, brakes: 0, nitro: 0 }) {
  let topSpeed = car.topSpeed;
  let accel = car.acceleration;
  let grip = car.grip;
  let braking = car.braking;
  let nitroLvl = upgrades.nitro || 0;

  if (upgrades.engine > 0) {
    accel = accel * (1 + 0.12 * upgrades.engine);
  }
  if (upgrades.tires > 0) {
    grip = Math.min(0.99, grip * (1 + 0.05 * upgrades.tires));
  }
  if (upgrades.brakes > 0) {
    braking = braking * (1 + 0.10 * upgrades.brakes);
  }

  return {
    topSpeed: Math.round((topSpeed / 100) * 100),
    acceleration: Math.round((accel / 50) * 100),
    handling: Math.round((grip / 1.0) * 100),
    braking: Math.round((braking / 50) * 100),
    nitro: Math.round(80 + nitroLvl * 4)
  };
}

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
    this.walletEl = el('wallet');
    this.driftHud = el('drift-hud');
    this.driftScoreEl = el('drift-score');

    this.previewState = {
      carId: 'vantra-rs',
      paint: null,
      neon: null,
      horn: 0
    };

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
        window.garageOpen = false;
        if (window.onCloseGarageShowroom) window.onCloseGarageShowroom();
        if (this.onCloseGarage) this.onCloseGarage();
      });
    }

    this.initGarageTabs();
    this.initGarageActionBtn();
  }

  initGarageTabs() {
    const tabs = document.querySelectorAll('.g-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.dataset.tab;
        const panes = document.querySelectorAll('.g-tab-pane');
        panes.forEach(pane => {
          if (pane.id === `tab-${target}`) {
            pane.classList.add('active');
          } else {
            pane.classList.remove('active');
          }
        });
        this.renderGarage();
      });
    });
  }

  initGarageActionBtn() {
    const actBtn = el('btn-garage-action');
    if (actBtn) {
      actBtn.addEventListener('click', () => {
        const carId = this.previewState.carId;
        const p = this.progression;
        const isOwned = p.data.unlockedVehicles.includes(carId);

        if (isOwned) {
          // Select and drive
          p.selectVehicle(carId);
          p.selectPaint(this.previewState.paint);
          p.selectNeon(this.previewState.neon);
          p.selectHorn(this.previewState.horn);
          if (this.onSelectVehicle) this.onSelectVehicle(carId);
          if (this.onSelectPaint) this.onSelectPaint(this.previewState.paint);
          if (this.onSelectNeon) this.onSelectNeon(this.previewState.neon);

          // Close garage
          if (this.garage) this.garage.classList.add('hidden');
          window.garageOpen = false;
          if (window.onCloseGarageShowroom) window.onCloseGarageShowroom();
          if (this.onCloseGarage) this.onCloseGarage();
        } else {
          // Buy
          if (p.buyVehicle(carId)) {
            // Equip cosmetics previewed
            p.selectPaint(this.previewState.paint);
            p.selectNeon(this.previewState.neon);
            p.selectHorn(this.previewState.horn);
            if (this.onSelectVehicle) this.onSelectVehicle(carId);
            
            this.renderGarage();
            this.updateWallet();
          }
        }
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
    const equipped = this.progression.getSelectedVehicle();
    this.previewState = {
      carId: equipped.id,
      paint: this.progression.data.selectedPaint !== null ? this.progression.data.selectedPaint : equipped.defaultColor,
      neon: this.progression.data.selectedNeon,
      horn: this.progression.data.selectedHorn || 0
    };

    window.garageOpen = true;
    if (window.onOpenGarageShowroom) window.onOpenGarageShowroom(this.previewState);

    this.renderGarage();
    if (this.garage) this.garage.classList.remove('hidden');
  }

  updateGarageShowroomUI(hoverUpgradeKey = null) {
    const p = this.progression;
    const carId = this.previewState.carId;
    const car = VEHICLE_CATALOGUE[carId];
    if (!car) return;

    // Showroom text
    const nameEl = el('showroom-car-name');
    const catEl = el('showroom-car-category');
    const priceEl = el('showroom-car-price');

    if (nameEl) nameEl.textContent = car.name;
    if (catEl) catEl.textContent = car.category;
    if (priceEl) {
      const isOwned = p.data.unlockedVehicles.includes(carId);
      const reqLvl = p.vehicleRequiredLevel(carId);
      priceEl.textContent = isOwned ? 'OWNED' : `₹${car.price.toLocaleString('en-IN')} (REQ. LEVEL ${reqLvl})`;
    }

    // Active car specs & upgrades
    const equippedCar = p.getSelectedVehicle();
    const equippedUpgrades = p.data.upgrades;
    const equippedStats = getCarUIStats(equippedCar, equippedUpgrades);

    // Current preview stats
    const previewUpgrades = carId === equippedCar.id ? p.data.upgrades : { engine: 0, tires: 0, brakes: 0, nitro: 0 };
    const baseStats = getCarUIStats(car, previewUpgrades);

    // If hovering an upgrade, simulate it
    let hoverStats = null;
    if (hoverUpgradeKey && carId === equippedCar.id) {
      const simulatedUpgrades = { ...previewUpgrades };
      simulatedUpgrades[hoverUpgradeKey] = Math.min(5, (simulatedUpgrades[hoverUpgradeKey] || 0) + 1);
      hoverStats = getCarUIStats(car, simulatedUpgrades);
    }

    const statsKeys = ['topSpeed', 'acceleration', 'handling', 'braking', 'nitro'];
    statsKeys.forEach(key => {
      const valEl = el(`stat-val-${key}`);
      const fillEl = el(`stat-fill-${key}`);
      const deltaEl = el(`stat-delta-${key}`);

      let currentVal = baseStats[key];
      let displayValText = String(currentVal);

      // Upgrade Hover Preview Mode
      if (hoverStats) {
        const nextVal = hoverStats[key];
        const diff = nextVal - currentVal;
        if (diff > 0) {
          displayValText = `${currentVal} → ${nextVal}`;
          if (deltaEl) {
            deltaEl.textContent = `+${diff} ▲`;
            deltaEl.className = 'stat-delta up';
          }
        } else {
          if (deltaEl) {
            deltaEl.textContent = '';
            deltaEl.className = 'stat-delta';
          }
        }
        if (fillEl) fillEl.style.width = `${nextVal}%`;
      } else {
        // Normal Compare Mode
        if (fillEl) fillEl.style.width = `${currentVal}%`;
        if (carId !== equippedCar.id) {
          const equippedVal = equippedStats[key];
          const diff = currentVal - equippedVal;
          if (diff > 0) {
            if (deltaEl) {
              deltaEl.textContent = `+${diff} ▲`;
              deltaEl.className = 'stat-delta up';
            }
          } else if (diff < 0) {
            if (deltaEl) {
              deltaEl.textContent = `${diff} ▼`;
              deltaEl.className = 'stat-delta down';
            }
          } else {
            if (deltaEl) {
              deltaEl.textContent = '';
              deltaEl.className = 'stat-delta';
            }
          }
        } else {
          if (deltaEl) {
            deltaEl.textContent = '';
            deltaEl.className = 'stat-delta';
          }
        }
      }

      if (valEl) valEl.textContent = displayValText;
    });

    // Update Action Button
    const actBtn = el('btn-garage-action');
    if (actBtn) {
      const isOwned = p.data.unlockedVehicles.includes(carId);
      const isEquipped = carId === equippedCar.id;

      if (isEquipped) {
        actBtn.textContent = 'CURRENTLY EQUIPPED';
        actBtn.disabled = true;
      } else if (isOwned) {
        actBtn.textContent = 'DRIVE';
        actBtn.disabled = false;
      } else {
        const reqLvl = p.vehicleRequiredLevel(carId);
        const levelMet = p.level >= reqLvl;
        const cashMet = p.data.cash >= car.price;

        if (!levelMet) {
          actBtn.textContent = `LEVEL ${reqLvl} REQUIRED`;
          actBtn.disabled = true;
        } else if (!cashMet) {
          actBtn.textContent = 'INSUFFICIENT ₹ CREDITS';
          actBtn.disabled = true;
        } else {
          actBtn.textContent = `BUY ₹${car.price.toLocaleString('en-IN')}`;
          actBtn.disabled = false;
        }
      }
    }
  }

  renderGarage() {
    const p = this.progression;
    const level = p.level;

    // Header Profile Summary
    const currentLevelCumulativeXP = 250 * level * (level - 1);
    const nextLevelCumulativeXP = 250 * (level + 1) * level;
    const xpNeededForNextLevel = nextLevelCumulativeXP - currentLevelCumulativeXP;
    const xpEarnedInCurrentLevel = p.data.xp - currentLevelCumulativeXP;
    const xpPercent = Math.min(100, Math.max(0, (xpEarnedInCurrentLevel / xpNeededForNextLevel) * 100));

    const lvlEl = el('garage-player-level');
    const xpBarEl = el('garage-xp-progress-bar');
    const xpValEl = el('garage-xp-val');
    const walletValEl = el('garage-wallet-val');

    if (lvlEl) lvlEl.textContent = `LEVEL ${level}`;
    if (xpBarEl) xpBarEl.style.width = `${xpPercent}%`;
    if (xpValEl) xpValEl.textContent = `${xpEarnedInCurrentLevel} / ${xpNeededForNextLevel} XP`;
    if (walletValEl) walletValEl.textContent = `₹${p.data.cash.toLocaleString('en-IN')}`;

    this.renderRoster();
    this.renderUpgrades();
    this.renderAesthetics();
    this.updateGarageShowroomUI();
  }

  renderRoster() {
    const grid = el('vehicle-grid');
    if (!grid) return;

    const p = this.progression;
    const unlocked = p.data.unlockedVehicles || ['vantra-rs'];
    const equipped = p.getSelectedVehicle();

    grid.innerHTML = Object.values(VEHICLE_CATALOGUE).map((car) => {
      const isOwned = unlocked.includes(car.id);
      const isEquipped = car.id === equipped.id;
      const isPreviewed = car.id === this.previewState.carId;

      let status = '';
      if (isEquipped) {
        status = '<span class="car-card-status equipped">EQUIPPED</span>';
      } else if (isOwned) {
        status = '<span class="car-card-status owned">OWNED</span>';
      } else {
        status = '<span class="car-card-status locked">LOCKED</span>';
      }

      return `
        <div class="garage-car-card ${isPreviewed ? 'selected' : ''}" data-car-id="${car.id}">
          <div class="car-card-left">
            <span class="car-card-name">${car.name}</span>
            <span class="car-card-cat">${car.category}</span>
          </div>
          ${status}
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.garage-car-card').forEach(card => {
      card.addEventListener('click', () => {
        const carId = card.dataset.carId;
        this.previewState.carId = carId;

        // Reset aesthetic previews to the vehicle's default if switching cars
        const carDef = VEHICLE_CATALOGUE[carId];
        this.previewState.paint = carDef.defaultColor;
        this.previewState.neon = null;

        if (window.onUpdateGarageShowroom) window.onUpdateGarageShowroom(this.previewState);
        this.renderGarage();
      });
    });
  }

  renderUpgrades() {
    const list = el('upgrade-list');
    if (!list) return;

    const p = this.progression;
    const carId = this.previewState.carId;
    const equipped = p.getSelectedVehicle();
    const isEquipped = carId === equipped.id;

    if (!isEquipped) {
      list.innerHTML = `<div style="text-align: center; color: #8fa3c7; padding: 30px 10px; font-weight: bold;">SELECT AND DRIVE THIS VEHICLE TO ACCESS TUNING UPGRADES</div>`;
      return;
    }

    list.innerHTML = Object.entries(UPGRADES).map(([key, def]) => {
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
            <span class="up-label">${def.label} (LV. ${lvl})</span>
            <div class="up-pips">${pips}</div>
          </div>
          ${btn}
        </div>
      `;
    }).join('');

    // Hover previews
    list.querySelectorAll('.up-btn[data-key]').forEach(b => {
      const key = b.dataset.key;
      b.addEventListener('mouseenter', () => this.updateGarageShowroomUI(key));
      b.addEventListener('mouseleave', () => this.updateGarageShowroomUI());

      b.addEventListener('click', () => {
        if (this.onBuyUpgrade(key)) {
          this.renderGarage();
          this.updateWallet();
        }
      });
    });
  }

  renderAesthetics() {
    const paintGrid = el('paint-grid');
    const neonGrid = el('neon-grid');
    const hornGrid = el('horn-grid');

    // Paints
    if (paintGrid) {
      paintGrid.innerHTML = AVAILABLE_PAINTS.map((paint) => {
        const isCur = this.previewState.paint === paint.hex;
        return `
          <button class="paint-swatch ${isCur ? 'active' : ''}" data-color="${paint.hex}" style="background-color: #${paint.hex.toString(16).padStart(6, '0')}" title="${paint.name}"></button>
        `;
      }).join('');

      paintGrid.querySelectorAll('.paint-swatch').forEach(b => {
        b.addEventListener('click', () => {
          const hex = parseInt(b.dataset.color, 10);
          this.previewState.paint = hex;
          if (window.onUpdateGarageShowroom) window.onUpdateGarageShowroom(this.previewState);
          this.renderGarage();
        });
      });
    }

    // Neons
    if (neonGrid) {
      neonGrid.innerHTML = AVAILABLE_NEONS.map((neon) => {
        const isCur = (this.previewState.neon === neon.hex) || (this.previewState.neon === null && neon.hex === null);
        const bg = neon.hex !== null ? `#${neon.hex.toString(16).padStart(6, '0')}` : '#111827';
        return `
          <button class="paint-swatch neon-swatch ${isCur ? 'active' : ''}" data-neon="${neon.hex !== null ? neon.hex : 'none'}" style="background-color: ${bg}; box-shadow: ${neon.hex !== null ? `0 0 10px ${bg}` : 'none'};" title="${neon.name}">
            ${neon.hex === null ? '✕' : ''}
          </button>
        `;
      }).join('');

      neonGrid.querySelectorAll('.neon-swatch').forEach(b => {
        b.addEventListener('click', () => {
          const raw = b.dataset.neon;
          const hex = raw === 'none' ? null : parseInt(raw, 10);
          this.previewState.neon = hex;
          if (window.onUpdateGarageShowroom) window.onUpdateGarageShowroom(this.previewState);
          this.renderGarage();
        });
      });
    }

    // Horns
    if (hornGrid) {
      hornGrid.innerHTML = AVAILABLE_HORNS.map((horn) => {
        const isCur = this.previewState.horn === horn.id;
        return `
          <div class="horn-row ${isCur ? 'active' : ''}" data-horn-id="${horn.id}">
            <div class="horn-info">
              <span class="horn-name">${horn.name}</span>
              <span class="horn-desc">${horn.desc}</span>
            </div>
            <button class="horn-test-btn" data-test-id="${horn.id}">PREVIEW 📢</button>
          </div>
        `;
      }).join('');

      hornGrid.querySelectorAll('.horn-row').forEach(row => {
        row.addEventListener('click', (e) => {
          if (e.target.classList.contains('horn-test-btn')) return;
          const hornId = parseInt(row.dataset.hornId, 10);
          this.previewState.horn = hornId;
          this.renderGarage();
        });
      });

      hornGrid.querySelectorAll('.horn-test-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const hornId = parseInt(btn.dataset.testId, 10);
          audioEngine.playHorn(hornId);
        });
      });
    }
  }
}
