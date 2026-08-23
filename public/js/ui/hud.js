// In-Game HUD for NCR ESCAPE (spec §18).
// Speedometer, 6-Speed Gear indicator, Dynamic RPM gauge bar with redline shift flash, and Nitro gauge bar.

const speedEl = document.getElementById('speed-value');
const gearEl = document.getElementById('hud-gear');
const rpmBarEl = document.getElementById('rpm-bar-fill');
const nitroBarEl = document.getElementById('nitro-bar-fill');

export function updateHUD(carState, vehicle) {
  const kmh = Math.abs(carState.speed) * 3.6;
  if (speedEl) speedEl.textContent = Math.round(kmh);

  // Realistic 6-speed sport transmission calculation
  let gear = 'N';
  if (carState.speed < -0.2) {
    gear = 'R';
  } else if (kmh < 1.2) {
    gear = 'N';
  } else if (kmh < 38) {
    gear = '1';
  } else if (kmh < 75) {
    gear = '2';
  } else if (kmh < 120) {
    gear = '3';
  } else if (kmh < 170) {
    gear = '4';
  } else if (kmh < 225) {
    gear = '5';
  } else {
    gear = '6';
  }

  if (gearEl) gearEl.textContent = gear;

  if (rpmBarEl && vehicle) {
    // Dynamic engine RPM simulation per gear with redline shift flash
    let gearProgress = 0.15;
    if (gear === '1') gearProgress = kmh / 38;
    else if (gear === '2') gearProgress = (kmh - 32) / 43;
    else if (gear === '3') gearProgress = (kmh - 70) / 50;
    else if (gear === '4') gearProgress = (kmh - 115) / 55;
    else if (gear === '5') gearProgress = (kmh - 165) / 60;
    else if (gear === '6') gearProgress = (kmh - 220) / 80;
    else if (gear === 'R') gearProgress = kmh / 25;

    const rpmPercent = Math.min(100, Math.max(12, Math.min(1.0, Math.max(0.12, gearProgress)) * 100));
    rpmBarEl.style.width = `${rpmPercent}%`;

    // Redline shift flash
    if (rpmPercent > 88) {
      rpmBarEl.style.background = 'linear-gradient(90deg, #ff3b30, #ffffff)';
    } else {
      rpmBarEl.style.background = 'linear-gradient(90deg, #00d4aa, #ffaa00, #ff3b30)';
    }
  }

  if (nitroBarEl) {
    const nitroVal = carState.nitro !== undefined ? carState.nitro : 100;
    nitroBarEl.style.width = `${nitroVal}%`;
  }
}
