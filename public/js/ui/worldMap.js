import { roadSegments } from '../roads/network.js';
import { raceEvents } from '../racing/events.js';
import { SPEED_TRAPS } from '../world/speedTraps.js';

// Full-Screen GPS Interactive World Map for NCR ESCAPE (spec §18, §22).
// Renders all 4 NCR regions, district boundaries, speed traps, race events, and player teleport/GPS.

const DISTRICTS = [
  { name: 'Cyber District', x: 0, z: 0 },
  { name: 'Corporate Mile', x: 0, z: 280 },
  { name: 'Golf Course Belt', x: 220, z: 80 },
  { name: 'Industrial Edge', x: -220, z: 80 },
  { name: 'Old Market', x: 0, z: -320 },
  { name: 'Delhi Central', x: 0, z: -600 },
  { name: 'Yamuna Crossing', x: 0, z: -900 },
  { name: 'Noida Expressway', x: 0, z: -1240 },
  { name: 'Sector 143 Tech', x: 0, z: -1540 },
];

export class WorldMap {
  constructor(onTeleport, onClose) {
    this.onTeleport = onTeleport;
    this.onClose = onClose;
    this.active = false;

    this.overlay = document.getElementById('world-map-overlay');
    this.canvas = document.getElementById('world-map-canvas');
    this.closeBtn = document.getElementById('world-map-close');
    this.infoEl = document.getElementById('map-event-info');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.canvas) {
      this.canvas.addEventListener('click', (e) => this.handleMapClick(e));
    }
  }

  open(carState) {
    this.active = true;
    this.lastCarState = carState;
    if (this.overlay) this.overlay.classList.remove('hidden');
    this.render(carState);
  }

  close() {
    this.active = false;
    if (this.overlay) this.overlay.classList.add('hidden');
    if (this.onClose) this.onClose();
  }

  toggle(carState) {
    if (this.active) {
      this.close();
    } else {
      this.open(carState);
    }
  }

  // World coordinates (x: -300 to +300, z: -1700 to +350) -> Canvas (w: 800, h: 540)
  worldToCanvas(wx, wz) {
    const minX = -320;
    const maxX = 320;
    const minZ = -1750;
    const maxZ = 350;

    const w = this.canvas.width;
    const h = this.canvas.height;

    const cx = ((wx - minX) / (maxX - minX)) * (w - 80) + 40;
    const cy = ((wz - minZ) / (maxZ - minZ)) * (h - 80) + 40;
    return { x: cx, y: cy };
  }

  canvasToWorld(cx, cy) {
    const minX = -320;
    const maxX = 320;
    const minZ = -1750;
    const maxZ = 350;

    const w = this.canvas.width;
    const h = this.canvas.height;

    const wx = minX + ((cx - 40) / (w - 80)) * (maxX - minX);
    const wz = minZ + ((cy - 40) / (h - 80)) * (maxZ - minZ);
    return { x: wx, z: wz };
  }

  render(carState) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#090e1a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 1. Draw River Yamuna Water Channel
    const p1 = this.worldToCanvas(-320, -760);
    const p2 = this.worldToCanvas(320, -1060);
    ctx.fillStyle = 'rgba(10, 80, 160, 0.35)';
    ctx.fillRect(0, p1.y, w, Math.max(20, p2.y - p1.y));

    ctx.fillStyle = 'rgba(100, 180, 255, 0.6)';
    ctx.font = 'bold 11px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RIVER YAMUNA CROSSING', w / 2, (p1.y + p2.y) / 2);

    // 2. Draw Road Segments
    for (const r of roadSegments) {
      const sp = this.worldToCanvas(r.from.x, r.from.z);
      const ep = this.worldToCanvas(r.to.x, r.to.z);

      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(ep.x, ep.y);

      if (r.width >= 30) {
        ctx.strokeStyle = '#ff7a18';
        ctx.lineWidth = 5;
      } else if (r.width >= 16) {
        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 3.5;
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
      }
      ctx.stroke();
    }

    // 3. Draw District Region Labels
    for (const d of DISTRICTS) {
      const p = this.worldToCanvas(d.x, d.z);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 11px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.name.toUpperCase(), p.x, p.y);
    }

    // 4. Draw Speed Trap Radars
    for (const st of SPEED_TRAPS) {
      const p = this.worldToCanvas(st.x, st.z);
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 5. Draw Race Event Markers
    for (const ev of raceEvents) {
      const p = this.worldToCanvas(ev.marker.x, ev.marker.z);
      ctx.fillStyle = '#38ef7d';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = '900 9px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏁', p.x, p.y + 3);
    }

    // 6. Draw Player Marker
    if (carState) {
      const p = this.worldToCanvas(carState.x, carState.z);

      // Pulse ring
      ctx.strokeStyle = 'rgba(255, 122, 24, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
      ctx.stroke();

      // Heading arrow
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(carState.heading);

      ctx.fillStyle = '#ff7a18';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }
  }

  handleMapClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * this.canvas.height;

    // 1. Check if clicked near an event marker
    for (const ev of raceEvents) {
      const p = this.worldToCanvas(ev.marker.x, ev.marker.z);
      const dist = Math.hypot(cx - p.x, cy - p.y);
      if (dist < 18) {
        if (this.infoEl) {
          this.infoEl.innerHTML = `
            <div class="map-info-card">
              <div class="map-info-title">🏁 ${ev.label.toUpperCase()}</div>
              <div class="map-info-desc">${ev.description}</div>
              <div class="map-info-payout">REWARD: ₹${ev.reward.cash.toLocaleString('en-IN')} · +${ev.reward.rep} REP</div>
              <button class="map-tp-btn" data-x="${ev.marker.x}" data-z="${ev.marker.z}">FAST TRAVEL HERE</button>
            </div>
          `;

          const tpBtn = this.infoEl.querySelector('.map-tp-btn');
          if (tpBtn) {
            tpBtn.addEventListener('click', () => {
              const tx = parseFloat(tpBtn.dataset.x);
              const tz = parseFloat(tpBtn.dataset.z);
              if (this.onTeleport) this.onTeleport(tx, tz);
              this.close();
            });
          }
        }
        return;
      }
    }

    // 2. Check if clicked near a district region label
    for (const d of DISTRICTS) {
      const p = this.worldToCanvas(d.x, d.z);
      const dist = Math.hypot(cx - p.x, cy - p.y);
      if (dist < 32) {
        if (this.infoEl) {
          const descriptions = {
            'Cyber District': 'GURUGRAM - CYBER DISTRICT: Fictionalised corporate hub featuring vertical glass facades, flyovers, and elevated transit structures.',
            'Corporate Mile': 'GURUGRAM - CORPORATE MILE: High-density night-drive district surrounded by illuminated office towers and corporate Plazas.',
            'Golf Course Belt': 'GURUGRAM - GOLF BELT: High-end luxury residential towers bordering the green golf courses.',
            'Industrial Edge': 'GURUGRAM - INDUSTRIAL REGION: Heavy industrial silos, factories, and warehouses.',
            'Old Market': 'DELHI - OLD BAZAAR: High density street market featuring small shops, colorful awnings, parked scooters, and tea stalls.',
            'Delhi Central': 'DELHI - CENTRAL VISTA: Sandstone heritage avenues centering around the grand India Gate-inspired arch landmark.',
            'Yamuna Crossing': 'YAMUNA CROSSING: Cable-stayed bridge spanning the Yamuna River with beautiful water reflections.',
            'Noida Expressway': 'NOIDA EXPRESSWAY: Broad 6-lane high-speed expressway, perfect for nitro runs and near-miss streaks.',
            'Sector 143 Tech': 'NOIDA - SECTOR 143: Modern planned tech park zone with the futuristic Innovation Center Dome.'
          };
          const desc = descriptions[d.name] || 'NCR Region';
          this.infoEl.innerHTML = `
            <div class="map-info-card">
              <div class="map-info-title">📍 ${d.name.toUpperCase()}</div>
              <div class="map-info-desc">${desc}</div>
              <button class="map-tp-btn" data-x="${d.x}" data-z="${d.z}">FAST TRAVEL TO DISTRICT</button>
            </div>
          `;

          const tpBtn = this.infoEl.querySelector('.map-tp-btn');
          if (tpBtn) {
            tpBtn.addEventListener('click', () => {
              const tx = parseFloat(tpBtn.dataset.x);
              const tz = parseFloat(tpBtn.dataset.z);
              if (this.onTeleport) this.onTeleport(tx, tz);
              this.close();
            });
          }
        }
        return;
      }
    }

    // 3. Otherwise show fast travel option to clicked coordinate
    const worldCoord = this.canvasToWorld(cx, cy);
    if (this.infoEl) {
      this.infoEl.innerHTML = `
        <div class="map-info-card">
          <div class="map-info-title">📍 WAYPOINT COORDINATES</div>
          <div class="map-info-desc">Position (X: ${Math.round(worldCoord.x)}, Z: ${Math.round(worldCoord.z)})</div>
          <button class="map-tp-btn" data-x="${worldCoord.x.toFixed(1)}" data-z="${worldCoord.z.toFixed(1)}">FAST TRAVEL HERE</button>
        </div>
      `;
      const tpBtn = this.infoEl.querySelector('.map-tp-btn');
      if (tpBtn) {
        tpBtn.addEventListener('click', () => {
          const tx = parseFloat(tpBtn.dataset.x);
          const tz = parseFloat(tpBtn.dataset.z);
          if (this.onTeleport) this.onTeleport(tx, tz);
          this.close();
        });
      }
    }
  }
}
