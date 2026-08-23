// Traffic Run Mode Manager for NCR ESCAPE (spec §16-17).
// Manages score, combo multiplier, run distance, top speed, and local high score persistence.

export class TrafficRunSystem {
  constructor() {
    this.active = false;
    this.score = 0;
    this.bestScore = this.loadBestScore();
    this.nearMisses = 0;
    this.combo = 1;
    this.bestCombo = 1;
    this.distance = 0; // in meters
    this.topSpeed = 0; // in km/h
    this.lastX = 0;
    this.lastZ = 0;
    this.comboTimer = 0; // combo window is 3.8 seconds
    this.hasCrashedThisRun = false;
  }

  loadBestScore() {
    try {
      const stored = localStorage.getItem('ncr-escape:traffic-run:best-score');
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  }

  saveBestScore() {
    try {
      localStorage.setItem('ncr-escape:traffic-run:best-score', this.bestScore.toString());
    } catch {
      // storage unavailable
    }
  }

  start(playerX, playerZ) {
    this.active = true;
    this.score = 0;
    this.nearMisses = 0;
    this.combo = 1;
    this.bestCombo = 1;
    this.distance = 0;
    this.topSpeed = 0;
    this.lastX = playerX;
    this.lastZ = playerZ;
    this.comboTimer = 0;
    this.hasCrashedThisRun = false;

    // Show traffic run HUD indicator and End Run button
    const trHud = document.getElementById('traffic-hud');
    if (trHud) trHud.classList.remove('hidden');
  }

  update(dt, playerX, playerZ, currentKmh) {
    if (!this.active) return;

    // 1. Update distance
    const distStep = Math.hypot(playerX - this.lastX, playerZ - this.lastZ);
    // Ignore extremely large jumps due to restarts/teleports
    if (distStep < 100) {
      this.distance += distStep;
    }
    this.lastX = playerX;
    this.lastZ = playerZ;

    // 2. Update top speed
    if (currentKmh > this.topSpeed) {
      this.topSpeed = Math.round(currentKmh);
    }

    // 3. Update combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboTimer = 0;
        this.combo = 1;
        this.updateComboHUD();
      }
    }

    // Passive score accumulation just for driving fast (spec §8 speed bonus)
    if (currentKmh > 30) {
      const speedScoreFactor = (currentKmh - 30) * 0.05;
      this.addScore(speedScoreFactor * this.combo * dt * 10);
    }

    this.updateHUD();
  }

  addScore(amount) {
    this.score += amount;
    if (this.score > this.bestScore) {
      this.bestScore = Math.floor(this.score);
    }
  }

  registerNearMiss(levelScore, label) {
    if (!this.active) return;

    this.nearMisses++;
    
    // Increment combo
    if (this.comboTimer > 0) {
      this.combo = Math.min(5, this.combo + 1);
    } else {
      this.combo = 1;
    }
    this.comboTimer = 3.8; // reset combo window timer to 3.8s

    if (this.combo > this.bestCombo) {
      this.bestCombo = this.combo;
    }

    // Award score multiplied by combo
    const finalScore = levelScore * this.combo;
    this.addScore(finalScore);

    this.updateComboHUD();
    return { finalScore, combo: this.combo };
  }

  registerCrash() {
    if (!this.active) return;
    this.combo = 1;
    this.comboTimer = 0;
    this.hasCrashedThisRun = true;
    this.updateComboHUD();
  }

  end() {
    this.active = false;
    if (this.score > this.bestScore) {
      this.bestScore = Math.floor(this.score);
    }
    this.saveBestScore();

    // Hide traffic run HUD indicator
    const trHud = document.getElementById('traffic-hud');
    if (trHud) trHud.classList.add('hidden');

    return {
      score: Math.floor(this.score),
      best: this.bestScore,
      distance: (this.distance / 1000).toFixed(1), // in KM
      topSpeed: this.topSpeed,
      nearMisses: this.nearMisses,
      bestCombo: this.bestCombo,
    };
  }

  updateHUD() {
    const scoreVal = document.getElementById('hud-traffic-score');
    const distVal = document.getElementById('hud-traffic-dist');
    if (scoreVal) scoreVal.textContent = Math.floor(this.score).toLocaleString();
    if (distVal) distVal.textContent = `${(this.distance / 1000).toFixed(1)} KM`;
  }

  updateComboHUD() {
    const nearmissCombo = document.getElementById('nearmiss-combo');
    if (nearmissCombo) {
      if (this.combo >= 2) {
        nearmissCombo.textContent = `COMBO ×${this.combo}`;
        nearmissCombo.classList.remove('hidden');
        
        // Add active pop animation
        nearmissCombo.classList.remove('combo-animate');
        void nearmissCombo.offsetWidth; // trigger reflow
        nearmissCombo.classList.add('combo-animate');

        // Subtle NCR Radio 🔥 HOT RUN indicator when combo hits maximum (5x)
        const radBadge = document.getElementById('ss-track-badge');
        if (this.combo === 5 && radBadge) {
          radBadge.textContent = '🔥 HOT RUN';
          radBadge.style.color = '#ff7a18';
        }
      } else {
        nearmissCombo.classList.add('hidden');
      }
    }
  }
}
