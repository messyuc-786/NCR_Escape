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

    // 1. Verify soundSystem object existence on window
    const soundSystemExists = await page.evaluate(() => typeof window.soundSystem !== 'undefined');
    if (!soundSystemExists) {
      failures.push('window.soundSystem is not defined');
    }

    // 2. Play/Pause
    await page.evaluate(() => window.soundSystem.play());
    let isPlayingAfterPlay = await page.evaluate(() => window.soundSystem.isPlaying);
    if (!isPlayingAfterPlay) {
      failures.push('SoundSystem did not start playing after play()');
    }

    await page.evaluate(() => window.soundSystem.pause());
    let isPlayingAfterPause = await page.evaluate(() => window.soundSystem.isPlaying);
    if (isPlayingAfterPause) {
      failures.push('SoundSystem did not pause after pause()');
    }

    // 3. Station Switching
    await page.evaluate(() => window.soundSystem.selectPlaylist('punjabi-power'));
    const currentPlId = await page.evaluate(() => window.soundSystem.getCurrentPlaylist().id);
    if (currentPlId !== 'punjabi-power') {
      failures.push(`Expected playlist id punjabi-power, got ${currentPlId}`);
    }

    // 4. Persistence of volume and station
    await page.evaluate(() => {
      window.soundSystem.volume = 0.45;
      window.soundSystem.selectPlaylist('midnight-lofi');
    });
    
    // Reload page
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);

    const reloadedVolume = await page.evaluate(() => window.soundSystem.volume);
    const reloadedPlId = await page.evaluate(() => window.soundSystem.getCurrentPlaylist().id);
    
    if (Math.abs(reloadedVolume - 0.45) > 0.01) {
      failures.push(`Volume persistence failed: expected 0.45, got ${reloadedVolume}`);
    }
    if (reloadedPlId !== 'midnight-lofi') {
      failures.push(`Station persistence failed: expected midnight-lofi, got ${reloadedPlId}`);
    }

    // 5. Keyboard shortcuts (tested during gameplay)
    await page.click('#start-btn');
    await page.waitForTimeout(1000);

    // Press B to toggle radio panel open
    await page.keyboard.press('KeyB');
    await page.waitForTimeout(500);
    const uiActive = await page.evaluate(() => window.soundUI.active);
    if (!uiActive) {
      failures.push('Radio panel did not open on pressing KeyB');
    }

    // Press Escape to close radio panel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const uiActiveAfterClose = await page.evaluate(() => window.soundUI.active);
    if (uiActiveAfterClose) {
      failures.push('Radio panel did not close on pressing Escape');
    }

  } catch (err) {
    failures.push(`Unhandled error: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log('--- NCR ESCAPE radio system smoke test ---');
  console.log('Console errors captured:', consoleErrors.length ? consoleErrors : 'none');
  if (failures.length) {
    console.error('FAILURES:');
    failures.forEach((f) => console.error(' -', f));
    process.exitCode = 1;
  } else {
    console.log('All radio assertions passed.');
  }
}

main();
