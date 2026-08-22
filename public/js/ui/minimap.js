import { roadSegments } from '/js/roads/network.js';
import { raceEvents } from '/js/racing/events.js';

// Real-time 2D Canvas Radar Minimap for NCR ESCAPE (spec §18).
// Tracks road network, player orientation, AI traffic, AI race opponents, checkpoints, and live district name.

export class Minimap {
  constructor(canvasId = 'minimap-canvas', labelId = 'minimap-label') {
    this.canvas = document.getElementById(canvasId);
    this.labelEl = document.getElementById(labelId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.scale = 0.22; // world meters to canvas pixels
  }

  getDistrictName(x, z) {
    if (x > 140) return 'GOLF COURSE BELT';
    if (x < -140) return 'INDUSTRIAL EDGE';
    if (z > 220) return 'CORPORATE MILE';
    if (z < -220) return 'OLD MARKET';
    return 'CYBER DISTRICT';
  }

  update(playerState, trafficSystem, raceSystem) {
    if (!this.ctx || !this.canvas) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const px = playerState.x;
    const pz = playerState.z;

    // Update district title
    if (this.labelEl) {
      this.labelEl.textContent = this.getDistrictName(px, pz);
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    // Map circular background
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 14, 24, 0.88)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 212, 170, 0.45)';
    ctx.stroke();
    ctx.clip();

    // World transform centered on player
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-playerState.heading);

    // 1. Draw Road Network
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    for (const seg of roadSegments) {
      ctx.beginPath();
      const x1 = (seg.from.x - px) * this.scale;
      const y1 = (seg.from.z - pz) * this.scale;
      const x2 = (seg.to.x - px) * this.scale;
      const y2 = (seg.to.z - pz) * this.scale;

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      if (seg.elevated) {
        ctx.strokeStyle = '#64748b';
      } else if (seg.type === 'highway') {
        ctx.strokeStyle = '#384b66';
      } else if (seg.type === 'industrial') {
        ctx.strokeStyle = '#4a4852';
      } else {
        ctx.strokeStyle = '#2d3e54';
      }
      ctx.stroke();
    }

    // 2. Draw Race Event Markers
    for (const ev of raceEvents) {
      const mx = (ev.marker.x - px) * this.scale;
      const my = (ev.marker.z - pz) * this.scale;
      ctx.beginPath();
      ctx.arc(mx, my, 4.0, 0, Math.PI * 2);
      ctx.fillStyle = '#ff7a18';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 3. Draw Active Race Checkpoints
    if (raceSystem && raceSystem.activeEvent) {
      const cps = raceSystem.activeEvent.checkpoints;
      const activeIdx = raceSystem.checkpointIndex;
      cps.forEach((cp, i) => {
        if (i >= activeIdx) {
          const cpx = (cp.x - px) * this.scale;
          const cpy = (cp.z - pz) * this.scale;
          ctx.beginPath();
          ctx.arc(cpx, cpy, i === cps.length - 1 ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = i === cps.length - 1 ? '#38ef7d' : '#4aa8ff';
          ctx.fill();
        }
      });

      // Draw AI Opponents
      if (raceSystem.aiOpponents) {
        ctx.fillStyle = '#ff2d55';
        for (const ai of raceSystem.aiOpponents) {
          const ax = (ai.x - px) * this.scale;
          const ay = (ai.z - pz) * this.scale;
          if (Math.hypot(ax, ay) < cx) {
            ctx.beginPath();
            ctx.arc(ax, ay, 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
    }

    // 4. Draw Traffic Vehicles
    if (trafficSystem) {
      const positions = trafficSystem.getPositions();
      ctx.fillStyle = '#f5a623';
      for (const t of positions) {
        if (t.x === undefined) continue;
        const tx = (t.x - px) * this.scale;
        const ty = (t.z - pz) * this.scale;
        if (Math.hypot(tx, ty) < cx) {
          ctx.fillRect(tx - 1.5, ty - 1.5, 3, 3);
        }
      }
    }

    ctx.restore(); // restore rotation & translation

    // 5. Draw Player Arrow in Center (facing UP)
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx - 4.5, cy + 5);
    ctx.lineTo(cx, cy + 3);
    ctx.lineTo(cx + 4.5, cy + 5);
    ctx.closePath();
    ctx.fillStyle = '#00d4aa';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore(); // restore clip
  }
}
