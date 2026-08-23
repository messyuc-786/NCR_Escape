const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'screenshots');

async function testTitleScreen() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader'] });

  // 1. Desktop Test (1920x1080)
  const desktopPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await desktopPage.goto(BASE_URL, { waitUntil: 'load' });
  await desktopPage.waitForTimeout(1000);
  await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'title-screen-desktop-1920.png') });
  console.log('Saved title-screen-desktop-1920.png');

  // Verify HUD is hidden
  const hudHidden = await desktopPage.evaluate(() => {
    const hud = document.getElementById('hud');
    const topbar = document.getElementById('topbar');
    const minimap = document.getElementById('minimap-container');
    return hud.classList.contains('hidden') && topbar.classList.contains('hidden') && minimap.classList.contains('hidden');
  });
  console.log('HUD, Topbar, Minimap hidden before start:', hudHidden);

  // Click How To Play
  await desktopPage.click('#btn-how-to-play');
  await desktopPage.waitForTimeout(500);
  await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'how-to-play-modal.png') });
  console.log('Saved how-to-play-modal.png');
  await desktopPage.click('#how-to-play-close');
  await desktopPage.waitForTimeout(300);

  // Click Settings
  await desktopPage.click('#btn-settings-open');
  await desktopPage.waitForTimeout(500);
  await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'settings-modal.png') });
  console.log('Saved settings-modal.png');
  await desktopPage.click('#settings-close');
  await desktopPage.waitForTimeout(300);

  // Click ENTER WORLD
  await desktopPage.click('#start-btn');
  await desktopPage.waitForTimeout(1200);
  await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'gameplay-entered.png') });
  console.log('Saved gameplay-entered.png');

  // 2. Mobile Viewport Test (390x844 iPhone 12/13/14)
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobilePage.goto(BASE_URL, { waitUntil: 'load' });
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'title-screen-mobile-390.png') });
  console.log('Saved title-screen-mobile-390.png');

  await browser.close();
  console.log('Title screen verification completed successfully.');
}

testTitleScreen().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
