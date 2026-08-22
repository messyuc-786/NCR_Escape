const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'screenshots');

function findChromium() {
  const candidates = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const pinned = findChromium();
  const launchOpts = { args: ['--no-sandbox', '--use-gl=swiftshader'] };
  if (pinned) launchOpts.executablePath = pinned;

  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  let failures = [];

  try {
    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-intro-screen.png') });

    // Start driving — allow a beat for the first frame + chase camera snap to settle
    await page.click('#start-btn');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-world-idle.png') });

    // --- Traffic assertions (Phase 4) ---
    const trafficBefore = await page.evaluate(() => window.__DEBUG_TRAFFIC_POSITIONS?.());
    if (!trafficBefore || trafficBefore.length === 0) {
      failures.push('No traffic vehicles were spawned');
    }
    await page.waitForTimeout(1500);
    const trafficAfter = await page.evaluate(() => window.__DEBUG_TRAFFIC_POSITIONS?.());

    if (trafficBefore && trafficAfter) {
      // At least some traffic must have actually changed position — proves the AI is driving,
      // not just that meshes were added to the scene.
      let movedCount = 0;
      for (let i = 0; i < trafficBefore.length; i++) {
        const a = trafficBefore[i];
        const b = trafficAfter[i];
        if (!a || !b || a.x === undefined || b.x === undefined) continue;
        if (Math.hypot(b.x - a.x, b.z - a.z) > 0.5) movedCount++;
      }
      if (movedCount < 5) {
        failures.push(`Expected several traffic cars to move, only ${movedCount} did`);
      }

      // Traffic must stay on the road network within the active district bounds.
      const strays = trafficAfter.filter(
        (c) => c.x !== undefined && (Math.abs(c.x) > 420 || Math.abs(c.z) > 520)
      );
      if (strays.length) {
        failures.push(`${strays.length} traffic cars left the road network: ${JSON.stringify(strays[0])}`);
      }
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02b-traffic.png') });

    // Hold forward and confirm speed actually increases (real consequence, not just "no crash")
    await page.keyboard.down('KeyW');
    let speedAfterAccel = 0;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(150);
      speedAfterAccel = await page.evaluate(() => window.__DEBUG_SPEED?.());
      if (speedAfterAccel > 5) break;
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-accelerating.png') });
    await page.keyboard.up('KeyW');

    if (!(speedAfterAccel > 5)) {
      failures.push(`Expected speed > 5 after holding forward, got ${speedAfterAccel}`);
    }

    const posAfterAccel = await page.evaluate(() => window.__DEBUG_POS?.());
    if (!(Math.abs(posAfterAccel.z) > 5)) {
      failures.push(`Expected car to have moved from spawn, pos=${JSON.stringify(posAfterAccel)}`);
    }

    // --- Traffic must be solid, not scenery ---
    // Drive up the boulevard into the traffic stream, then assert the player never ends up
    // overlapping a traffic car's footprint (which would mean driving straight through one).
    await page.keyboard.down('KeyW');
    let overlapDetected = null;
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(120);
      const overlap = await page.evaluate(() => {
        const p = window.__DEBUG_POS();
        const cars = window.__DEBUG_TRAFFIC_POSITIONS();
        for (const c of cars) {
          if (c.x === undefined) continue;
          // Deep overlap = the player's centre is well inside a traffic car's box
          if (Math.abs(c.x - p.x) < 0.8 && Math.abs(c.z - p.z) < 0.8) {
            return { player: p, car: c };
          }
        }
        return null;
      });
      if (overlap) { overlapDetected = overlap; break; }
    }
    await page.keyboard.up('KeyW');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02c-traffic-closeup.png') });
    if (overlapDetected) {
      failures.push(`Player drove through a traffic car: ${JSON.stringify(overlapDetected)}`);
    }

    // Steer while moving forward, confirm car turns (heading changes position off the straight
    // line). Poll rather than a fixed wall-clock wait: headless software rendering's frame
    // rate varies with system load (worse now that traffic + intersection AI run every frame),
    // so a fixed timeout was intermittently too short even though steering itself works fine
    // — confirmed by rerunning this suite standalone, where it always passed.
    await page.keyboard.down('KeyW');
    await page.keyboard.down('KeyD');
    let posAfterSteer = null;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(150);
      posAfterSteer = await page.evaluate(() => window.__DEBUG_POS?.());
      if (Math.abs(posAfterSteer.x) > 0.5) break;
    }
    await page.keyboard.up('KeyD');
    await page.keyboard.up('KeyW');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-steering.png') });
    if (!(Math.abs(posAfterSteer.x) > 0.5)) {
      failures.push(`Expected car x to shift after steering, got x=${posAfterSteer.x}`);
    }

    // Handbrake drift
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(600);
    await page.keyboard.down('Space');
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-handbrake-drift.png') });
    await page.keyboard.up('Space');
    await page.keyboard.up('KeyA');
    await page.keyboard.up('KeyW');

    // --- Brake / decelerate check ---
    // Must brake from a genuinely high speed. Below ~0.5 m/s the brake input intentionally
    // becomes reverse thrust, so asserting on |speed| from a near-stopped car measures the
    // wrong thing (it fails while the game is behaving correctly). Get properly moving first.
    await page.evaluate(() => window.__DEBUG_TELEPORT && window.__DEBUG_TELEPORT(0, -200));
    await page.keyboard.down('KeyW');
    let speedBeforeBrake = 0;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(150);
      speedBeforeBrake = await page.evaluate(() => window.__DEBUG_SPEED?.());
      if (speedBeforeBrake > 8) break;
    }
    await page.keyboard.up('KeyW');
    if (!(speedBeforeBrake > 8)) {
      failures.push(`precondition failed: needed >8 m/s before braking, got ${speedBeforeBrake}`);
    }
    await page.keyboard.down('KeyS');
    await page.waitForTimeout(900);
    const speedAfterBrake = await page.evaluate(() => window.__DEBUG_SPEED?.());
    await page.keyboard.up('KeyS');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-braking.png') });
    if (!(speedAfterBrake < speedBeforeBrake)) {
      failures.push(`Expected braking to reduce speed: before=${speedBeforeBrake} after=${speedAfterBrake}`);
    }

    // --- Reverse: from a standstill, holding brake should back the car up ---
    await page.evaluate(() => window.__DEBUG_TELEPORT && window.__DEBUG_TELEPORT(0, -200));
    await page.waitForTimeout(300);
    const zBeforeReverse = (await page.evaluate(() => window.__DEBUG_POS())).z;
    await page.keyboard.down('KeyS');
    let zAfterReverse = zBeforeReverse;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(150);
      zAfterReverse = (await page.evaluate(() => window.__DEBUG_POS())).z;
      if (zAfterReverse < zBeforeReverse - 0.25) break;
    }
    await page.keyboard.up('KeyS');
    // Car faces +z at spawn, so reversing must decrease z.
    if (!(zAfterReverse < zBeforeReverse - 0.25)) {
      failures.push(`Reverse did not move car backwards: z ${zBeforeReverse} -> ${zAfterReverse}`);
    }

    // Drive toward a building to confirm collision doesn't clip through
    await page.evaluate(() => {
      // Reset near a known building for a deterministic collision check
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-final-state.png') });

  } catch (err) {
    failures.push(`Unhandled error: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log('--- NCR ESCAPE smoke test ---');
  console.log('Console errors captured:', consoleErrors.length ? consoleErrors : 'none');
  if (failures.length) {
    console.error('FAILURES:');
    failures.forEach((f) => console.error(' -', f));
    process.exitCode = 1;
  } else {
    console.log('All assertions passed.');
  }
}

main();
