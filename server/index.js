const http = require('http');
const express = require('express');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

let wss = null;
const players = new Map();

app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    game: 'NCR ESCAPE',
    status: 'online',
    onlinePlayers: wss ? wss.clients.size : 0,
  });
});

const server = http.createServer(app);

try {
  wss = new WebSocketServer({ server });

  const CALLSIGNS = [
    'Cyber Ghost', 'Delhi Phantom', 'Noida Apex', 'Yamuna Viper',
    'Aravalli Drift', 'Gurugram Turbo', 'Sector 143 Volt', 'Ring Road Ace',
    'Highway Hawk', 'Neon Cyclone', 'Indus Shadow', 'Speed Titan'
  ];

  let nextId = 1;

  wss.on('connection', (ws) => {
    const playerId = `p_${nextId++}`;
    const callsign = `${CALLSIGNS[Math.floor(Math.random() * CALLSIGNS.length)]} #${Math.floor(100 + Math.random() * 900)}`;

    players.set(playerId, {
      id: playerId,
      name: callsign,
      x: 0,
      z: 0,
      heading: 0,
      speed: 0,
      vehicleId: 'vantra-rs',
      paintHex: 0xff7a18,
      isBoosting: false,
      driftYaw: 0,
      lastSeen: Date.now(),
    });

    ws.send(JSON.stringify({
      type: 'init',
      id: playerId,
      name: callsign,
    }));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'update') {
          const p = players.get(playerId);
          if (p) {
            p.x = msg.x;
            p.z = msg.z;
            p.heading = msg.heading;
            p.speed = msg.speed;
            p.vehicleId = msg.vehicleId || p.vehicleId;
            p.paintHex = msg.paintHex || p.paintHex;
            p.isBoosting = Boolean(msg.isBoosting);
            p.driftYaw = msg.driftYaw || 0;
            p.lastSeen = Date.now();
          }
        }
      } catch {}
    });

    ws.on('error', () => {});

    ws.on('close', () => {
      players.delete(playerId);
      broadcast({ type: 'player_left', id: playerId });
    });
  });

  function broadcast(msg) {
    if (!wss) return;
    const payload = JSON.stringify(msg);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch {}
      }
    }
  }

  // 20Hz World Sync Broadcast Tick
  setInterval(() => {
    if (players.size === 0 || !wss) return;
    const list = Array.from(players.values());
    broadcast({
      type: 'world_sync',
      count: players.size,
      players: list,
    });
  }, 50);
} catch (e) {
  console.warn('WebSocket server failed to initialize:', e.message);
}

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`NCR ESCAPE server running at http://localhost:${PORT}`);
  });
}

process.on('uncaughtException', (err) => {
  console.error('Server uncaughtException:', err.message);
});

module.exports = server;
