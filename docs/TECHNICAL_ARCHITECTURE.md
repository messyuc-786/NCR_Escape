# NCR ESCAPE — Technical Architecture

## 1. Technology Stack
- **Engine & Renderer**: Three.js (r160), locally vendored at `public/js/vendor/three.module.js` — zero CDN latency, works completely offline.
- **Client Architecture**: Native ES Modules (`public/js/`), lightweight, modular, no complex transpilation step required for development.
- **Server**: Express.js (`server/index.js`) providing static file serving and JSON status/save endpoints.
- **Audio Engine**: Native Web Audio API procedural sound synthesizer (`public/js/audio/audioEngine.js`) for engine RPM harmonics, tire screeching, collision thuds, and UI chimes with zero external audio assets.
- **Multi-Platform Input**: Unified keyboard, gamepad, and multi-touch virtual on-screen controls (`public/js/core/input.js`).
- **Testing**: Automated end-to-end headless browser testing suite (`tests/e2e/`) powered by Playwright with visual screenshot capture and physics/telemetry assertion.

---

## 2. Directory Layout
```
NCR Escape/
├── server/
│   └── index.js                 # Express server + API status endpoint
├── public/
│   ├── index.html               # Main application container + UI overlays
│   ├── favicon.ico
│   ├── css/
│   │   └── style.css            # Cyber-racing theme, HUD, and mobile touch styles
│   ├── js/
│   │   ├── vendor/              # Vendored Three.js r160 ES module
│   │   │   ├── loaders/          # Vendored GLTFLoader (three@0.160, zero CDN)
│   │   │   └── utils/            # Vendored BufferGeometryUtils (GLTFLoader dependency)
│   │   ├── core/                # Game boot, game loop, camera, multi-touch input
│   │   ├── vehicles/            # Vehicle definitions, mesh generators, traffic vehicles
│   │   ├── physics/             # Arcade physics integrator, collisions, drift yaw
│   │   ├── world/               # Cyber district assembly, metro viaduct, signs, lighting,
│   │   │                        #  assetWorld.js (additive Blender GLB visual overlay)
│   │   ├── roads/               # Road network single-source-of-truth data
│   │   ├── traffic/             # AI traffic system, lane sampling, intersection lights
│   │   ├── racing/              # Event definitions, state machine, checkpoint gates
│   │   ├── progression/         # Progression, economy, upgrades, save/load
│   │   ├── audio/               # Web Audio API sound synthesizer
│   │   └── ui/                  # Speedometer HUD, minimap canvas, garage showroom
│   ├── assets/
│   │   └── world/
│   │       └── ncr-world.glb    # Blender-authored visual overlay, built from roads/network.js
│   ├── models/ textures/ audio/ maps/
├── docs/
│   ├── ROADMAP.md
│   ├── GAME_DESIGN.md
│   ├── TECHNICAL_ARCHITECTURE.md
│   ├── MAP_SPECIFICATION.md
│   └── DEVELOPMENT_PHASES.md
├── src/                         # Long-term module skeleton
├── tests/
│   ├── e2e/                     # drive, traffic, intersections, and loop smoke tests
│   ├── run-all.js               # Autonomous test harness
│   └── playwright.config.js
├── screenshots/                 # Captured test run artifacts
├── package.json
└── README.md
```

---

## 3. Core Subsystems

### Physics & Vehicle Controller (`physics/carPhysics.js`, `vehicles/vehicle.js`)
- **Longitudinal**: Throttle applies forward acceleration; brake decelerates to standstill, then transitions smoothly to reverse.
- **Lateral & Drift**: Steering angle is damped at high velocities for arcade responsiveness. Handbrake triggers rear traction loss, driving `driftYaw` integration.
- **Collision Resolution**: Static world geometry and dynamic AI vehicles are tested as AABBs, with minimum penetration push-out response and velocity dampening.

### Road Network as Data (`roads/network.js`)
- Roads are defined once as mathematical line segments with widths, lane counts, speed limits, and traffic density parameters.
- Road meshes, curb collisions, AI traffic lane sampling (`sampleLane()`), and intersection calculations (`getIntersections()`) all read from the exact same data source.

### Intersection & Traffic AI (`traffic/intersections.js`, `traffic/trafficSystem.js`)
- Intersections are calculated generically via 2D line-segment intersection algorithm.
- Signals run a strict 2-phase cycle (Axis X vs Axis Z) with Green → Yellow → All-Red clearance.
- AI vehicles stop at red signals, maintain safe following distance from vehicles ahead, yield to the player, and smoothly turn onto intersecting roads.

### Web Audio Synthesizer (`audio/audioEngine.js`)
- Dual-oscillator engine tone with low-pass filter frequency modulating with speed and throttle.
- Real-time noise buffer generator with bandpass filter for tire skid sounds.
- Dynamic impact synthesizer for crash feedback.

### Real-Time Radar Minimap (`ui/minimap.js`)
- Circular HUD canvas drawing road segments, traffic vehicles, event markers, checkpoints, and player orientation in real time.

### Blender Visual Art Layer (`world/assetWorld.js`)
- `loadAssetWorld(scene)` loads `public/assets/world/ncr-world.glb` — a Blender-authored glTF built directly from `roads/network.js`'s own coordinates, so every road ribbon, flyover pillar, Yamuna bridge pylon/cable, and district building is spatially anchored to exactly where the procedural world already expects them.
- Imported via a locally vendored `GLTFLoader` + `BufferGeometryUtils` (copied from the project's own `three@0.160` dependency, zero CDN reliance, matching the project's offline-reliability policy).
- Purely additive and visual: loaded meshes are flagged `userData.isAssetWorldVisual = true` and never participate in collision, physics, traffic, or race logic, which continue to run exclusively against the procedural colliders from `world/district.js`. The load is fire-and-forget — a failed or slow fetch degrades gracefully and never blocks game boot.

### Test-Time Simulation Dilation (`core/boot.js`)
- `window.__DEBUG_TIME_SCALE` (default `1`) multiplies the per-frame `dt` in the main loop. On a slow or software-rendered host, real frame rate can fall far enough below 60fps that simulated game time lags real wall-clock time by a large factor; e2e tests set this to `8` right after boot to dilate simulated time so fixed real-time waits reliably cover the needed simulated duration, with zero effect on normal gameplay.
