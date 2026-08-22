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
│   │   ├── core/                # Game boot, game loop, camera, multi-touch input
│   │   ├── vehicles/            # Vehicle definitions, mesh generators, traffic vehicles
│   │   ├── physics/             # Arcade physics integrator, collisions, drift yaw
│   │   ├── world/               # Cyber district assembly, metro viaduct, signs, lighting
│   │   ├── roads/               # Road network single-source-of-truth data
│   │   ├── traffic/             # AI traffic system, lane sampling, intersection lights
│   │   ├── racing/              # Event definitions, state machine, checkpoint gates
│   │   ├── progression/         # Progression, economy, upgrades, save/load
│   │   ├── audio/               # Web Audio API sound synthesizer
│   │   └── ui/                  # Speedometer HUD, minimap canvas, garage showroom
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
