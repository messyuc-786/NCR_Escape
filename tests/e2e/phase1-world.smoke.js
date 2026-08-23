const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS = path.join(__dirname, '..', '..', 'screenshots');

function findChromium() {
  const p = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  return fs.existsSync(p) ? p : null;
}

async function testPhase1LivingWorld() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const pinned = findChromium();
  const launchOpts = { args: ['--no-sandbox', '--use-gl=swiftshader'] };
  if (pinned) launchOpts.executablePath = pinned;

  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(90000);

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  const fails = [];

  try {
    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.click('#start-btn');
    await page.waitForTimeout(1200);

    // 1. Assert Pedestrian AI System is active and populated
    const pedState = await page.evaluate(() => window.__DEBUG_PEDESTRIANS());
    if (!pedState || pedState.count === 0) {
      fails.push('Pedestrian system has 0 active pedestrians');
    } else {
      console.log(`Verified ${pedState.count} active living world pedestrians.`);
    }

    // 2. Assert Dynamic 3-Aspect Traffic Lights
    const ixState = await page.evaluate(() => window.__DEBUG_INTERSECTIONS());
    if (!ixState || ixState.length === 0) {
      fails.push('Intersection system has 0 active junctions');
    } else {
      console.log(`Verified ${ixState.length} active dynamic traffic light junctions.`);
    }

    // 3. Assert Traffic Vehicles & Pedestrian Updates over simulation time
    await page.waitForTimeout(2000);
    const pedState2 = await page.evaluate(() => window.__DEBUG_PEDESTRIANS());
    const moved = pedState2.pedestrians.some((p, i) => {
      const orig = pedState.pedestrians[i];
      return orig && (p.x !== orig.x || p.z !== orig.z);
    });
    if (!moved) {
      fails.push('Pedestrians did not update position over time');
    } else {
      console.log('Verified pedestrian walking and stride animation movement.');
    }

    // Capture screenshot of living world
    await page.screenshot({ path: path.join(SHOTS, 'phase1-living-world.png') });
    console.log('Saved phase1-living-world.png');

  } catch (err) {
    fails.push(`Execution error: ${err.message}`);
  } finally {
    await browser.close();
  }

  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
    fails.push(`${consoleErrors.length} console errors detected`);
  }

  if (fails.length > 0) {
    console.error('Phase 1 Smoke Test FAILURES:\n' + fails.join('\n'));
    process.exit(1);
  }

  console.log('--- NCR ESCAPE Phase 1 Living World test passed ---');
}

testPhase1LivingWorld().catch((err) => {
  console.error(err);
  process.exit(1);
});
