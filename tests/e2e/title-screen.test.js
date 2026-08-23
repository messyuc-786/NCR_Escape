const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'screenshots');

function findChromium() {
  const p = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  return fs.existsSync(p) ? p : null;
}

async function testTitleScreen() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const pinned = findChromium();
  const launchOpts = { args: ['--no-sandbox', '--use-gl=swiftshader'] };
  if (pinned) launchOpts.executablePath = pinned;

  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // 1. Desktop Test (1920x1080)
  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'title-screen-desktop-1920.png') });
  console.log('Saved title-screen-desktop-1920.png');

  // Verify HUD is hidden
  const hudHidden = await page.evaluate(() => {
    const hud = document.getElementById('hud');
    const topbar = document.getElementById('topbar');
    const minimap = document.getElementById('minimap-container');
    return hud.classList.contains('hidden') && topbar.classList.contains('hidden') && minimap.classList.contains('hidden');
  });
  console.log('HUD, Topbar, Minimap hidden before start:', hudHidden);

  // Click How To Play
  await page.click('#btn-how-to-play');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'how-to-play-modal.png') });
  console.log('Saved how-to-play-modal.png');
  await page.click('#how-to-play-close');
  await page.waitForTimeout(300);

  // Click Settings
  await page.click('#btn-settings-open');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'settings-modal.png') });
  console.log('Saved settings-modal.png');
  await page.click('#settings-close');
  await page.waitForTimeout(300);

  // 2. Mobile Viewport Test (390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'title-screen-mobile-390.png') });
  console.log('Saved title-screen-mobile-390.png');

  // Switch back to desktop and click ENTER WORLD
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.click('#start-btn');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'gameplay-entered.png') });
  console.log('Saved gameplay-entered.png');

  await browser.close();
  console.log('Title screen verification completed successfully.');
}

testTitleScreen().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
