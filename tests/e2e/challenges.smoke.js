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
  page.setDefaultTimeout(90000);

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  let failures = [];

  try {
    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    // 1. Verify challenges engine existence
    const engineExists = await page.evaluate(() => typeof window.challenges !== 'undefined');
    if (!engineExists) {
      failures.push('window.challenges is not defined');
    }

    // 2. Perform actions to increment progress
    await page.evaluate(() => {
      // Clear storage to start fresh
      localStorage.clear();
      window.challenges.progression.reset();
      window.challenges.completedIds = [];
      window.challenges.startRun();
    });

    // Verify initial values
    let xp = await page.evaluate(() => window.challenges.progression.data.xp);
    let cash = await page.evaluate(() => window.challenges.progression.data.cash);
    let level = await page.evaluate(() => window.challenges.progression.level);

    if (xp !== 0 || cash !== 0 || level !== 1) {
      failures.push(`Initial progression values incorrect: XP=${xp}, cash=${cash}, level=${level}`);
    }

    // Trigger near misses to complete FIRST CLOSE CALL (5 near misses, gives ₹500 & 100 XP)
    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) {
        window.challenges.recordNearMiss(false, 0.5);
      }
    });

    // Check if challenge is completed
    const completed = await page.evaluate(() => window.challenges.completedIds);
    if (!completed.includes('near_miss_5')) {
      failures.push('Expected near_miss_5 challenge to be completed');
    }

    // Verify rewards awarded
    xp = await page.evaluate(() => window.challenges.progression.data.xp);
    cash = await page.evaluate(() => window.challenges.progression.data.cash);
    if (xp < 100 || cash < 500) {
      failures.push(`Rewards not correctly awarded: XP=${xp}, cash=${cash}`);
    }

    // 3. Level Progression (Slower progression formula check)
    // Level 2 requires 500 XP
    await page.evaluate(() => {
      window.challenges.progression.data.xp = 500;
      window.challenges.progression.save();
    });

    level = await page.evaluate(() => window.challenges.progression.level);
    if (level !== 2) {
      failures.push(`Expected level 2 at 500 XP, got ${level}`);
    }

    // Level 3 requires 1500 XP
    await page.evaluate(() => {
      window.challenges.progression.data.xp = 1499;
      window.challenges.progression.save();
    });
    level = await page.evaluate(() => window.challenges.progression.level);
    if (level !== 2) {
      failures.push(`Expected level 2 at 1499 XP, got ${level}`);
    }

    await page.evaluate(() => {
      window.challenges.progression.data.xp = 1500;
      window.challenges.progression.save();
    });
    level = await page.evaluate(() => window.challenges.progression.level);
    if (level !== 3) {
      failures.push(`Expected level 3 at 1500 XP, got ${level}`);
    }

    // 4. Reload persistence test
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);

    const reloadedCompleted = await page.evaluate(() => window.challenges.completedIds);
    if (!reloadedCompleted.includes('near_miss_5')) {
      failures.push('Challenge completion was not persisted on page reload');
    }

    const reloadedXP = await page.evaluate(() => window.challenges.progression.data.xp);
    if (reloadedXP !== 1500) {
      failures.push(`XP persistence failed: expected 1500, got ${reloadedXP}`);
    }

    // 5. Garage Integration
    await page.click('#start-btn');
    await page.waitForTimeout(1000);

    // Open Garage and check DOM dashboard content
    await page.click('#garage-open');
    await page.waitForTimeout(500);

    const lvlText = await page.textContent('#garage-player-level');
    const walletText = await page.textContent('#garage-wallet-val');

    if (!lvlText.includes('LEVEL 3')) {
      failures.push(`Garage profile summary level incorrect: ${lvlText}`);
    }
    const cashVal = parseInt(walletText.replace(/[^\d]/g, ''), 10);
    if (isNaN(cashVal) || cashVal < 500) {
      failures.push(`Garage profile summary wallet cash incorrect: ${walletText}`);
    }

    await page.click('#garage-close');
    await page.waitForTimeout(500);

  } catch (err) {
    failures.push(`Execution error: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log(`Console errors captured: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  if (failures.length > 0) {
    console.error('Test FAILED with the following errors:');
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  } else {
    console.log('All challenge assertions passed.');
    process.exit(0);
  }
}

main();
