const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function findChromium() {
  const candidates = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

async function testPoliceSystem() {
  const executablePath = findChromium();
  const launchOpts = { args: ['--no-sandbox', '--use-gl=swiftshader'] };
  if (executablePath) launchOpts.executablePath = executablePath;

  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(90000);

  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-btn');
  await page.waitForTimeout(1200);

  const initial = await page.evaluate(() => window.__DEBUG_POLICE());
  if (initial.heat !== 0 || initial.state !== 'IDLE') {
    throw new Error(`Police should start idle: ${JSON.stringify(initial)}`);
  }

  // Debug trigger intentionally exists alongside the project's other Playwright hooks.
  await page.evaluate(() => window.__DEBUG_POLICE_ADD_HEAT(1));
  await page.waitForTimeout(900);
  const heat1 = await page.evaluate(() => window.__DEBUG_POLICE());
  if (heat1.heat !== 1 || heat1.state !== 'PURSUIT' || heat1.activeUnits !== 1) {
    throw new Error(`Heat 1 pursuit failed: ${JSON.stringify(heat1)}`);
  }

  await page.evaluate(() => window.__DEBUG_POLICE_ADD_HEAT(2));
  await page.waitForTimeout(900);
  const heat3 = await page.evaluate(() => window.__DEBUG_POLICE());
  if (heat3.heat !== 3 || heat3.activeUnits !== 3) {
    throw new Error(`Heat 3 escalation failed: ${JSON.stringify(heat3)}`);
  }

  const startPos = await page.evaluate(() => window.__DEBUG_POS());
  await page.evaluate(({ x, z }) => window.__DEBUG_TELEPORT(x + 300, z + 300, 0), startPos);
  await page.waitForTimeout(6200);
  const escaped = await page.evaluate(() => window.__DEBUG_POLICE());
  if (escaped.heat !== 0 || escaped.state !== 'IDLE' || escaped.activeUnits !== 0) {
    throw new Error(`Police did not clear after escape: ${JSON.stringify(escaped)}`);
  }

  await browser.close();
  console.log('Police pursuit verification passed.');
}

testPoliceSystem().catch((err) => {
  console.error('Police test error:', err);
  process.exit(1);
});
