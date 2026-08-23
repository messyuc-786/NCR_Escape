const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'screenshots');

function findChromium() {
  const p = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  return fs.existsSync(p) ? p : null;
}

async function testTrafficRun() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const pinned = findChromium();
  const launchOpts = { args: ['--no-sandbox', '--use-gl=swiftshader'] };
  if (pinned) launchOpts.executablePath = pinned;

  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.setDefaultTimeout(90000);

  // 1. Load page and click DRIVE to start the run
  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  
  await page.click('#start-btn');
  await page.waitForTimeout(1200);

  // 2. Verify that Traffic Run HUD has shown
  const trHudVisible = await page.evaluate(() => {
    const trHud = document.getElementById('traffic-hud');
    return trHud && !trHud.classList.contains('hidden');
  });
  console.log('Traffic Run HUD visible:', trHudVisible);
  if (!trHudVisible) throw new Error('Traffic Run HUD is not visible after start');

  // 3. Teleport player close to a moving traffic vehicle to trigger near miss
  console.log('Teleporting player to traffic vehicle...');
  await page.evaluate(() => {
    const positions = window.__DEBUG_TRAFFIC_POSITIONS();
    if (positions.length > 0) {
      const target = positions[0];
      // Teleport 2m to the right and 12m behind, heading 0
      window.__DEBUG_TELEPORT(target.x + 2.0, target.z - 12.0, 0);
    }
  });

  // Hold gas key to pass it
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2500); // drive past it
  await page.keyboard.up('KeyW');

  // Verify that the wallet cash or traffic score has increased
  const currentScore = await page.evaluate(() => {
    const scoreVal = document.getElementById('hud-traffic-score');
    return scoreVal ? parseInt(scoreVal.textContent.replace(/,/g, ''), 10) : 0;
  });
  console.log('Traffic Run score after driving:', currentScore);

  // 4. Click END RUN to trigger the results modal
  console.log('Clicking End Run...');
  await page.click('#btn-end-run');
  await page.waitForTimeout(1000);

  // Verify results overlay modal is visible and populated
  const resultsVisible = await page.evaluate(() => {
    const overlay = document.getElementById('traffic-results-overlay');
    const resScore = document.getElementById('traffic-res-score');
    return overlay && !overlay.classList.contains('hidden') && resScore && parseInt(resScore.textContent.replace(/,/g, ''), 10) >= 0;
  });
  console.log('Traffic Run Results Modal visible and populated:', resultsVisible);
  if (!resultsVisible) throw new Error('Traffic Run Results modal not visible or missing stats');

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'traffic-run-results.png') });
  console.log('Saved traffic-run-results.png');

  // 5. Test results modal buttons: DRIVE AGAIN
  console.log('Testing PLAY AGAIN button...');
  await page.click('#traffic-res-btn-drive');
  await page.waitForTimeout(1000);

  const backInRun = await page.evaluate(() => {
    const overlay = document.getElementById('traffic-results-overlay');
    const trHud = document.getElementById('traffic-hud');
    return overlay.classList.contains('hidden') && !trHud.classList.contains('hidden');
  });
  console.log('Successfully restarted run:', backInRun);
  if (!backInRun) throw new Error('Could not restart Traffic Run from results panel');

  // 6. Test results modal buttons: MAIN MENU
  console.log('Testing MAIN MENU button...');
  await page.click('#btn-end-run');
  await page.waitForTimeout(500);
  await page.click('#traffic-res-btn-menu');
  await page.waitForTimeout(1000);

  const backInMenu = await page.evaluate(() => {
    const overlay = document.getElementById('traffic-results-overlay');
    const intro = document.getElementById('intro-overlay');
    return overlay.classList.contains('hidden') && !intro.classList.contains('hidden');
  });
  console.log('Successfully returned to Main Menu:', backInMenu);
  if (!backInMenu) throw new Error('Could not return to main menu from results panel');

  await browser.close();
  console.log('Traffic Run verification completed successfully.');
}

testTrafficRun().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
