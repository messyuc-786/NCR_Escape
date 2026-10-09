const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS = path.join(__dirname, '..', '..', 'screenshots');

/** Polls __DEBUG_RACE until it reports `target`, or times out. */
async function waitForRaceState(page, target, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let rs = await page.evaluate(() => window.__DEBUG_RACE());
  while (rs.state !== target && Date.now() < deadline) {
    await page.waitForTimeout(250);
    rs = await page.evaluate(() => window.__DEBUG_RACE());
  }
  return rs;
}

function findChromium() {
  const c = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  return fs.existsSync(c) ? c : null;
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const pinned = findChromium();
  const opts = { args: ['--no-sandbox'] };
  if (pinned) opts.executablePath = pinned;

  const browser = await chromium.launch(opts);
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  const fails = [];

  try {
    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.click('#start-btn');
    // Dilate sim-time: on a slow/headless/contended host, real-time waits for the
    // countdown and race-finish polling below can otherwise exceed their budgets even
    // though the underlying logic is correct (see __DEBUG_TIME_SCALE in boot.js).
    await page.evaluate(() => { window.__DEBUG_TIME_SCALE = 8; });
    await page.waitForTimeout(1500);

    // --- Traffic alive ---
    const tr = await page.evaluate(() => window.__DEBUG_TRAFFIC());
    if (!(tr.moving > 5)) fails.push(`traffic not moving: ${JSON.stringify(tr)}`);

    // --- Drive to the event marker and trigger it ---
    await page.evaluate(() => window.__DEBUG_TELEPORT(6, -150));
    await page.waitForTimeout(400);
    let rs = await page.evaluate(() => window.__DEBUG_RACE());
    if (rs.state !== 'prompt') fails.push(`expected prompt at marker, got ${rs.state}`);
    await page.screenshot({ path: path.join(SHOTS, '08-event-prompt.png') });

    // Press E to start
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(300);
    rs = await page.evaluate(() => window.__DEBUG_RACE());
    if (rs.state !== 'countdown') fails.push(`expected countdown after E, got ${rs.state}`);
    await page.screenshot({ path: path.join(SHOTS, '09-countdown.png') });

    // The car must be genuinely held at the line during the countdown. A previous version
    // fed brake:1 here, which carPhysics turns into reverse thrust below 0.5 m/s, so the
    // player drifted backwards off the start. Sample a few frames, not just one.
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(250);
      const st = await page.evaluate(() => window.__DEBUG_RACE());
      if (st.state !== 'countdown') break;
      const spd = await page.evaluate(() => window.__DEBUG_SPEED());
      if (spd > 0.5) { fails.push(`car moved during countdown: ${spd} m/s`); break; }
    }

    // Wait out the countdown. NOTE: headless software rendering runs at single-digit FPS and
    // dt is capped per frame, so a 3s in-game countdown can take far longer in wall-clock time
    // here than it does at 60fps. Poll for the state change instead of a fixed sleep.
    rs = await waitForRaceState(page, 'racing', 120000);
    if (rs.state !== 'racing') fails.push(`expected racing after countdown, got ${rs.state}`);

    const cashBefore = await page.evaluate(() => window.__DEBUG_PROGRESSION().cash);

    // Hit each checkpoint in order via teleport (physics driving is proven in drive.smoke.js)
    const cps = [[0,-80],[0,10],[-60,40],[-60,88]];
    for (let i = 0; i < cps.length; i++) {
      const [x, z] = cps[i];
      await page.evaluate(([x,z]) => window.__DEBUG_TELEPORT(x,z), [x,z]);
      await page.waitForTimeout(700);
      // Capture mid-race, while the HUD race panel is live and BEFORE the final checkpoint
      // ends the race — otherwise this shot is just the results overlay again (it was).
      if (i === cps.length - 2) {
        const midState = await page.evaluate(() => window.__DEBUG_RACE());
        if (midState.state !== 'racing') {
          fails.push(`expected still racing at CP${i}, got ${midState.state}`);
        }
        await page.screenshot({ path: path.join(SHOTS, '10-race-running.png') });
      }
    }

    rs = await waitForRaceState(page, 'finished', 60000);
    if (rs.state !== 'finished') fails.push(`expected finished after all CPs, got ${rs.state} cp=${rs.checkpointIndex}`);
    if (!rs.lastResult) fails.push('no race result produced');

    // --- Reward actually credited ---
    const prog = await page.evaluate(() => window.__DEBUG_PROGRESSION());
    if (!(prog.cash > cashBefore)) fails.push(`cash not awarded: ${cashBefore} -> ${prog.cash}`);
    if (!(prog.xp > 0)) fails.push('xp not awarded');
    await page.screenshot({ path: path.join(SHOTS, '11-results.png') });

    // Close results
    await page.click('#results-close');
    await page.waitForTimeout(400);

    // --- Garage: buy an upgrade and prove it changes a real physics stat ---
    const accelBefore = await page.evaluate(() => window.__DEBUG_VEHICLE().acceleration);
    await page.click('#garage-open');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SHOTS, '12-garage.png') });

    const bought = await page.evaluate(() => {
      const btn = document.querySelector('.up-btn[data-key="engine"]:not([disabled])');
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (!bought) fails.push('could not buy engine upgrade (no affordable button)');
    await page.waitForTimeout(400);

    const accelAfter = await page.evaluate(() => window.__DEBUG_VEHICLE().acceleration);
    if (!(accelAfter > accelBefore)) {
      fails.push(`upgrade did not change acceleration: ${accelBefore} -> ${accelAfter}`);
    }
    await page.screenshot({ path: path.join(SHOTS, '13-garage-upgraded.png') });

    // --- Persistence: reload and confirm the save survived ---
    const cashAfterBuy = await page.evaluate(() => window.__DEBUG_PROGRESSION().cash);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(800);
    const reloaded = await page.evaluate(() => window.__DEBUG_PROGRESSION());
    if (reloaded.cash !== cashAfterBuy) {
      fails.push(`save did not persist: ${cashAfterBuy} -> ${reloaded.cash}`);
    }
    if (!(reloaded.upgrades.engine >= 1)) fails.push('upgrade did not persist');

  } catch (e) {
    fails.push('Unhandled: ' + e.message);
  } finally {
    await browser.close();
  }

  console.log('--- NCR ESCAPE full-loop test ---');
  console.log('console errors:', errs.length ? errs : 'none');
  if (fails.length) {
    console.error('FAILURES:'); fails.forEach(f => console.error(' -', f));
    process.exitCode = 1;
  } else console.log('All loop assertions passed.');
})();
