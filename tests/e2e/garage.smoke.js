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

    // Verify title screen play button
    const playVisible = await page.isVisible('#start-btn');
    if (!playVisible) {
      failures.push('Play button on title screen is not visible');
    }

    // Click play
    await page.click('#start-btn');
    await page.waitForTimeout(500);

    // Open Garage
    const garageBtnVisible = await page.isVisible('#garage-open');
    if (!garageBtnVisible) {
      failures.push('Garage button is not visible');
    }
    await page.click('#garage-open');
    await page.waitForTimeout(600);

    // Check if garage overlay is visible
    const garageVisible = await page.isVisible('#garage-overlay');
    if (!garageVisible) {
      failures.push('Garage overlay is not visible');
    }

    // Take screenshot of Garage
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'garage-showroom-desktop.png') });

    // 1. Verify Left Pane Showroom Details
    const nameVisible = await page.isVisible('#showroom-car-name');
    const catVisible = await page.isVisible('#showroom-car-category');
    const priceVisible = await page.isVisible('#showroom-car-price');
    if (!nameVisible || !catVisible || !priceVisible) {
      failures.push('Showroom text elements are missing');
    }

    // Verify Stats Bars
    const speedVisible = await page.isVisible('#stat-val-topSpeed');
    const accelVisible = await page.isVisible('#stat-val-acceleration');
    if (!speedVisible || !accelVisible) {
      failures.push('Showroom stats bar values are missing');
    }

    // 2. Verify Right Pane Tabs and profile
    const levelVisible = await page.isVisible('#garage-player-level');
    const walletVisible = await page.isVisible('#garage-wallet-val');
    if (!levelVisible || !walletVisible) {
      failures.push('Garage header profile widgets are missing');
    }

    // 3. Test Tab Switching to Aesthetics
    await page.click('.g-tab[data-tab="paint"]');
    await page.waitForTimeout(200);

    const paintVisible = await page.isVisible('#paint-grid');
    const neonVisible = await page.isVisible('#neon-grid');
    const hornVisible = await page.isVisible('#horn-grid');
    if (!paintVisible || !neonVisible || !hornVisible) {
      failures.push('Aesthetics tab grids are missing');
    }

    // Test Horn preview
    const hornPreviewClicked = await page.evaluate(() => {
      const btn = document.querySelector('.horn-test-btn');
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (!hornPreviewClicked) {
      failures.push('Horn preview button could not be clicked');
    }

    // Switch back to Roster
    await page.click('.g-tab[data-tab="cars"]');
    await page.waitForTimeout(200);

    // 4. Test Car Selection & Stats Comparison
    // Click Kaveri GT
    await page.click('.garage-car-card[data-car-id="kaveri-gt"]');
    await page.waitForTimeout(300);

    const previewName = await page.textContent('#showroom-car-name');
    if (!previewName.includes('Kaveri GT')) {
      failures.push(`Showroom name did not update to Kaveri GT, got: ${previewName}`);
    }

    // Check if comparison delta arrow has appeared
    const deltaSpeed = await page.textContent('#stat-delta-topSpeed');
    if (!deltaSpeed || deltaSpeed === '') {
      failures.push('Stats comparison delta marker did not display');
    }

    const actBtnText = await page.textContent('#btn-garage-action');
    if (!actBtnText.includes('BUY') && !actBtnText.includes('REQUIRED')) {
      failures.push(`Action button did not change to BUY or REQUIRED for locked vehicle, got: ${actBtnText}`);
    }

    // Switch back to Vantra RS
    await page.click('.garage-car-card[data-car-id="vantra-rs"]');
    await page.waitForTimeout(300);

    // 5. Test Upgrades Hover Preview
    await page.click('.g-tab[data-tab="upgrades"]');
    await page.waitForTimeout(200);

    // Hover over Engine upgrade button
    await page.hover('.up-btn[data-key="engine"]');
    await page.waitForTimeout(200);

    const previewAccel = await page.textContent('#stat-val-acceleration');
    if (!previewAccel.includes('→')) {
      failures.push(`Hovering engine upgrade button did not trigger before/after arrow: ${previewAccel}`);
    }

    // Close garage
    await page.click('#garage-close');
    await page.waitForTimeout(400);

    const garageHidden = !(await page.isVisible('#garage-overlay'));
    if (!garageHidden) {
      failures.push('Garage overlay did not close');
    }

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
    console.log('All garage assertions passed successfully.');
    process.exit(0);
  }
}

main();
