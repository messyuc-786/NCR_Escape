// Phase 4 traffic depth test. loop.smoke.js proves traffic *exists and moves*; this proves the
// two things that counter can't see: cars stay on the actual road network, and they're solid
// to the player rather than scenery you drive through.

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS = path.join(__dirname, '..', '..', 'screenshots');

function findChromium() {
  const c = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  return fs.existsSync(c) ? c : null;
}

// Road corridors from roads/network.js, padded by lane half-width + a small tolerance.
function onRoadNetwork(c) {
  const northSouthSpine = Math.abs(c.x) <= 16 && c.z >= -1720 && c.z <= 500;
  const centralBelt = Math.abs(c.z - 40) <= 12 && c.x >= -380 && c.x <= 400;
  const golfNorth = Math.abs(c.x - 380) <= 12 && c.z >= 30 && c.z <= 360;
  const corpConnector = Math.abs(c.z - 340) <= 12 && c.x >= -10 && c.x <= 400;
  const indHaul = Math.abs(c.x + 360) <= 12 && c.z >= 30 && c.z <= 300;
  const indNorth = Math.abs(c.z - 280) <= 12 && c.x >= -380 && c.x <= 10;
  const oldMarketCross = Math.abs(c.z + 350) <= 12 && c.x >= -200 && c.x <= 200;
  const delhiRingRoad = Math.abs(c.z + 480) <= 14 && c.x >= -340 && c.x <= 340;
  const delhiPlaza = Math.abs(c.z + 760) <= 14 && c.x >= -260 && c.x <= 260;
  const noidaSectorLink = Math.abs(c.z + 1240) <= 14 && c.x >= -300 && c.x <= 300;
  const sector143Loop = Math.abs(c.z + 1700) <= 14 && c.x >= -260 && c.x <= 260;
  const service = Math.abs(c.x + 60) <= 8 && c.z >= -25 && c.z <= 105;
  return northSouthSpine || centralBelt || golfNorth || corpConnector || indHaul || indNorth || oldMarketCross || delhiRingRoad || delhiPlaza || noidaSectorLink || sector143Loop || service;
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const pinned = findChromium();
  const opts = { args: ['--no-sandbox', '--use-gl=swiftshader'] };
  if (pinned) opts.executablePath = pinned;

  const browser = await chromium.launch(opts);
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  const fails = [];

  try {
    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.click('#start-btn');
    await page.waitForTimeout(1500);

    // --- 1. Per-car movement (not just an aggregate "moving" counter) ---
    const a = await page.evaluate(() => window.__DEBUG_TRAFFIC_POSITIONS());
    if (!(a.length > 5)) fails.push(`too few traffic cars: ${a.length}`);
    await page.waitForTimeout(2500);
    const b = await page.evaluate(() => window.__DEBUG_TRAFFIC_POSITIONS());

    const n = Math.min(a.length, b.length);
    let moved = 0;
    for (let i = 0; i < n; i++) {
      if (Math.hypot(b[i].x - a[i].x, b[i].z - a[i].z) > 1) moved++;
    }
    if (!(moved > n * 0.5)) fails.push(`only ${moved}/${n} traffic cars moved over 2.5s`);

    // --- 2. Cars stay on the road network, sampled over time ---
    const offenders = [];
    for (let sample = 0; sample < 4; sample++) {
      const cars = await page.evaluate(() => window.__DEBUG_TRAFFIC_POSITIONS());
      cars.forEach((c) => { if (!onRoadNetwork(c)) offenders.push(c); });
      await page.waitForTimeout(700);
    }
    if (offenders.length) {
      fails.push(`${offenders.length} traffic sightings off the road network, e.g. ${JSON.stringify(offenders[0])}`);
    }
    await page.screenshot({ path: path.join(SHOTS, '14-traffic-on-road.png') });

    // --- 3. Traffic is solid: drive into a car ahead, confirm we don't pass through ---
    const setup = await page.evaluate(() => {
      const cars = window.__DEBUG_TRAFFIC_POSITIONS();
      // A car on Main Boulevard ahead of a clear stretch
      const t = cars.find((c) => Math.abs(c.x) < 12 && c.z > -150 && c.z < 100);
      if (!t) return null;
      window.__DEBUG_TELEPORT(t.x, t.z - 16);
      return { x: t.x, z: t.z };
    });

    if (!setup) {
      fails.push('no suitable traffic car found on Main Boulevard for the solidity test');
    } else {
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(2500);
      await page.keyboard.up('KeyW');
      const p = await page.evaluate(() => window.__DEBUG_POS());
      // With a solid car ahead the player is blocked/slowed. Without collision the player
      // would rocket well past. Generous bound so a slow-moving target car doesn't false-fail.
      if (p.z > setup.z + 60) {
        fails.push(`player likely drove through traffic: target z=${setup.z.toFixed(1)}, player z=${p.z.toFixed(1)}`);
      }
      await page.screenshot({ path: path.join(SHOTS, '15-traffic-solid.png') });
    }
  } catch (e) {
    fails.push('Unhandled: ' + e.message);
  } finally {
    await browser.close();
  }

  console.log('--- NCR ESCAPE traffic depth test ---');
  console.log('console errors:', errs.length ? errs : 'none');
  if (errs.length) process.exitCode = 1;
  if (fails.length) {
    console.error('FAILURES:'); fails.forEach((f) => console.error(' -', f));
    process.exitCode = 1;
  } else console.log('All traffic assertions passed.');
})();
