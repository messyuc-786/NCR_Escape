// Boots the game server, runs every smoke suite against it, then shuts the server down.
// This exists because these suites are standalone Node scripts driving Playwright directly,
// not `playwright test` spec files — `npm test` previously pointed at the wrong runner.

const { spawn, spawnSync } = require('child_process');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;
const SUITES = ['title-screen.test.js', 'traffic-run.smoke.js', 'radio.smoke.js', 'challenges.smoke.js', 'garage.smoke.js', 'phase1-world.smoke.js', 'drive.smoke.js', 'traffic.smoke.js', 'intersections.smoke.js', 'loop.smoke.js'];

function waitForServer(timeoutMs = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function poll() {
      http
        .get(`http://localhost:${PORT}/api/status`, (res) => {
          res.resume();
          resolve();
        })
        .on('error', () => {
          if (Date.now() - start > timeoutMs) return reject(new Error('server did not start'));
          setTimeout(poll, 250);
        });
    })();
  });
}

(async () => {
  const server = spawn('node', [path.join(ROOT, 'server', 'index.js')], {
    stdio: 'ignore',
    env: { ...process.env, PORT },
  });

  let failed = 0;
  try {
    await waitForServer();

    for (const suite of SUITES) {
      console.log(`\n===== ${suite} =====`);
      const r = spawnSync('node', [path.join(__dirname, 'e2e', suite)], {
        stdio: 'inherit',
        env: { ...process.env, BASE_URL: `http://localhost:${PORT}` },
      });
      if (r.status !== 0) failed++;
    }
  } catch (err) {
    console.error('Harness error:', err.message);
    failed++;
  } finally {
    server.kill();
  }

  console.log(
    failed === 0
      ? `\nAll ${SUITES.length} suites passed.`
      : `\n${failed} of ${SUITES.length} suites FAILED.`
  );
  process.exit(failed === 0 ? 0 : 1);
})();
