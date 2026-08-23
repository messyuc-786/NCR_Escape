// In-Game HUD for NCR ESCAPE (spec §18).
// Speedometer, Gear indicator, RPM gauge bar, and Nitro gauge bar.

const speedEl = document.getElementById('speed-value');
const gearEl = document.getElementById('hud-gear');
const rpmBarEl = document.getElementById('rpm-bar-fill');
const nitroBarEl = document.getElementById('nitro-bar-fill');

export function updateHUD(carState, vehicle) {
  const kmh = Math.abs(carState.speed) * 3.6;
  if (speedEl) speedEl.textContent = Math.round(kmh);
  if (gearEl) gearEl.textContent = carState.speed < -0.2 ? 'R' : carState.speed > 0.2 ? 'D' : 'N';

  if (rpmBarEl && vehicle) {
    const maxKmh = vehicle.topSpeed * 3.6;
    const rpmPercent = Math.min(100, Math.max(8, (kmh / maxKmh) * 100));
    rpmBarEl.style.width = `${rpmPercent}%`;
  }

  if (nitroBarEl) {
    const nitroVal = carState.nitro !== undefined ? carState.nitro : 100;
    nitroBarEl.style.width = `${nitroVal}%`;
  }
}
