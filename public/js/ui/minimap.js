import { roadSegments } from '/js/roads/network.js';
import { raceEvents } from '/js/racing/events.js';

// Real-time 2D Canvas Radar Minimap for NCR ESCAPE (spec §18).

export class Minimap {
  constructor(canvasId = 'minimap-canvas') {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.scale = 0.28; // world meters to canvas pixels
  }

  update(playerState, trafficSystem, raceSystem) {
    if (!this.ctx || !this.canvas) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    // Map circular background
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(12, 17, 26, 0.85)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 212, 170, 0.4)';
    ctx.stroke();
    ctx.clip();

    // World transform centered on player
    ctx.save();
    ctx.translate(cx, cy);
    // Rotate map with player heading so forward is always UP on minimap
    ctx.rotate(-playerState.heading);

    const px = playerState.x;
    const pz = playerState.z;

    // 1. Draw Road Network
    ctx.lineWidth = 5;
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
        ctx.strokeStyle = '#55657e';
      } else if (seg.type === 'highway') {
        ctx.strokeStyle = '#3a4a63';
      } else {
        ctx.strokeStyle = '#2d3a4f';
      }
      ctx.stroke();
    }

    // 2. Draw Race Event Markers
    for (const ev of raceEvents) {
      const mx = (ev.marker.x - px) * this.scale;
      const my = (ev.marker.z - pz) * this.scale;
      ctx.beginPath();
      ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
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
