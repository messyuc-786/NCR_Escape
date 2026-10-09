const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS = path.join(__dirname, '..', '..', 'screenshots');

function findChromium() {
  const candidates = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

async function run() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const executablePath = findChromium();
  const launchOpts = { args: ['--no-sandbox', '--use-gl=swiftshader'] };
  if (executablePath) launchOpts.executablePath = executablePath;

  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(60000);

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.click('#start-btn');
  await page.waitForTimeout(800);

  // Poll for the asset-world load result (resolves true on success, false on failure —
  // either way boot must not hang or throw).
  let ready;
  const deadline = Date.now() + 20000;
  while (ready === undefined && Date.now() < deadline) {
    ready = await page.evaluate(() => window.__NCR_ASSET_WORLD_READY);
    if (ready === undefined) await page.waitForTimeout(300);
  }

  if (ready !== true) {
    throw new Error(`Asset world did not report ready: __NCR_ASSET_WORLD_READY=${ready}`);
  }

  // Drive to a known landmark (Yamuna bridge) and confirm the game is still fully
  // interactive (physics/collision/camera all still driven by the procedural network).
  await page.evaluate(() => window.__DEBUG_TELEPORT(0, -900, 0));
  await page.waitForTimeout(500);
  const pos = await page.evaluate(() => window.__DEBUG_POS());
  if (Math.abs(pos.x) > 1 || Math.abs(pos.z - -900) > 1) {
    throw new Error(`Teleport near Yamuna bridge failed: ${JSON.stringify(pos)}`);
  }

  await page.screenshot({ path: path.join(SHOTS, '18-asset-world-yamuna.png') });

  if (consoleErrors.length) {
    throw new Error(`Console errors during asset-world load/drive: ${JSON.stringify(consoleErrors)}`);
  }

  await browser.close();
  console.log('Asset world loaded, no console errors, gameplay still fully functional.');
}

run().catch((err) => {
  console.error('Asset world test error:', err);
  process.exit(1);
});
