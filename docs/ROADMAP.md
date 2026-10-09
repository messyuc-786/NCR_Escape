# NCR ESCAPE — Development Roadmap

Independent project. Not affiliated with, forked from, or dependent on any other project or codebase.

Status legend: ✅ Done & Automated-Tested · 🚧 In Progress · ⏳ Planned (Future Phases)

---

## Phase 1 — Foundation ✅
- Express server with static delivery, JSON save/status endpoints, and WebSocket support
- Three.js WebGL engine (local vendored ES module — zero CDN dependency)
- High-framerate game loop (`requestAnimationFrame`) with delta-time clamping
- Dual-platform input system: Keyboard, Gamepad, and Multi-Touch virtual controls for smartphones/tablets
- Third-person dynamic chase camera with spawn snap and high-speed trailing

## Phase 2 — Driving Physics ✅
- Longitudinal acceleration and deceleration curves with top speed clamping
- Speed-sensitive steering assist for arcade stability
- Handbrake-initiated rear traction loss and drift yaw integration
- Nitro Boost system (1.55x acceleration surge, speed cap expansion, cyan exhaust flame cones)
- Braking vs. reverse logic with standstill detection
- Axis-Aligned Bounding Box (AABB) static obstacle and building collision resolution
- Multi-touch responsive phone controls (steer buttons, gas/brake pedals, nitro & drift buttons)

## Phase 3 — Master 4-Region NCR Open World ✅
- Seamless connected route spanning over 2.4 km:
  1. **Region 1: Gurugram** (Cyber District, Corporate Mile, Golf Course Belt, Industrial Edge, Old Market)
  2. **Region 2: Delhi Central** (Central Vista Grand Boulevard, India Gate-inspired Heritage Gateway Arch, Sandstone Pavilions, Ring Road Highway)
  3. **Yamuna River Crossing** (Water channel with reflective surface & elevated Cable-Stayed Expressway Bridge with twin 42m suspension pylons)
  4. **Region 3: Noida** (6-Lane high-speed Expressway, IT SEZ Commercial Parks, Sector 62 Link Road)
  5. **Region 4: Sector 143** (Futuristic Innovation Center with glowing cyber rings & Grand Championship Arena)
- Elevated concrete **NCR Metro Viaduct Line** with twin tracks and viaduct columns
- Iconic Indian green highway signage and streetlight system
- Dynamic **Day / Sunset / Night** lighting controller

## Phase 4 — Traffic Simulation & Indian Vehicles ✅
- AI traffic follows lanes with keep-left conventions, per-road speed limits, speed variance, forward distance keeping, and yielding to the player
- 2-Phase traffic signals (green/yellow/all-red) with physical signal poles
- Seamless road-to-road turning at intersections
- 4 distinct traffic vehicle models including Indian Auto-Rickshaws (3-Wheelers), Sedans, Hatchbacks, and Heavy Goods Trucks
- High-speed Near-Miss detection with instant bonus cash and Nitro refills
- Solid AABB collision geometry for all traffic

## Phase 5 — Racing & AI Rival Opponents ✅
- AI rival opponents (`racing/aiOpponent.js`) that start alongside the player at countdown, navigate checkpoints, and avoid traffic
- Live race position HUD (`POS 1 / 4`) and lap counter (`LAP 1 / 2`)
- Multi-region race events:
  - *Cyber District Sprint*
  - *Corporate Mile Grand Prix*
  - *Industrial Edge Drift Battle*
  - *Old Market Traffic Run*
  - *Yamuna Bridge Midnight Dash*
  - *Sector 143 Innovation Grand Championship*

## Phase 6 — Vehicle Lineup, Garage & Economy ✅
- 6 Original Fictional Vehicles:
  1. **Vantra RS** (Street Hatchback)
  2. **Kaveri GT** (Sport Coupe)
  3. **Garuda RX** (Performance Muscle Sedan)
  4. **Indus Cruiser** (Urban Performance SUV)
  5. **Sherpa 4x4** (Rugged Off-Roader)
  6. **Apex GT Hypercar** (Flagship Expressway Hypercar)
- Garage Showroom with active car switching and 8 custom paint colorways
- 5-Tier Performance Upgrades modifying real vehicle physics stats
- Drift Scoring System with live angle calculation, multiplier bonuses, and bankable cash rewards
- Persistent local progression save (Cash, XP, Reputation, Level)

## Phase 7 — Police Pursuit & Speed Trap Radars ✅
- Dynamic **1–3 Star Heat System** triggered by speed traps and high-speed crashes
- Indian PCR Police Cruiser AI with animated alternating red/blue roof strobe light bar
- Busted fine penalties and Evaded escape cash/reputation rewards
- Highway speed trap radar camera gantries with flash HUD and velocity bonuses

## Phase 8 — Audio Immersion & Radio Stations ✅
- Web Audio API procedural sound synthesizer (engine rumble/RPM harmonics, tire screech, collision thuds, police sirens, countdown beeps, reward chimes)
- In-Game Synthesized Radio Stations: *NCR Synthwave FM 98.4*, *Delhi Desi Bass 104.2*, *Cyber Chillout 91.1*
- Dynamic Weather System (`world/weather.js`): Clear, Monsoon Rain (1,200 particles + wet road friction reduction), and NCR Dust Haze

## Phase 9 — Real-Time Multiplayer Free-Roam ✅
- WebSocket room server broadcasting 20Hz world state updates (`server/index.js`)
- Client-side smooth position lerping and slerp angular interpolation (`multiplayer/multiplayerSystem.js`)
- Dynamic 3D procedural vehicle mesh instantiation with custom paint colorways
- Radar minimap synchronization with cyan online driver blips

## Phase 10 — Blender-Authored Visual Art Layer & Hardening ✅
- Additive, non-invasive glTF visual overlay (`public/assets/world/ncr-world.glb`) authored in Blender directly from the live `roads/network.js` coordinate data, so every road ribbon, flyover pillar, Yamuna bridge pylon/cable, and district building is spatially anchored to exactly where the procedural world already expects them
- `world/assetWorld.js` loads the GLB via a locally vendored `GLTFLoader`/`BufferGeometryUtils` (`public/js/vendor/loaders/`, `public/js/vendor/utils/`) — purely visual, never touches collision/physics/traffic/race logic, and a failed or slow load never blocks game boot
- Fixed a real timing-flakiness class across the e2e suite: on a slow/software-rendered host, simulated game time can lag real wall-clock time by up to ~40x because `boot.js`'s per-frame `dt` is clamped at 0.05s/frame. Added a global `window.__DEBUG_TIME_SCALE` dt multiplier (default `1`, zero effect on real gameplay) so tests can dilate simulated time instead of relying on fixed real-time waits
- Resolved `proxy-addr` (critical) and `qs` (moderate) npm audit vulnerabilities via `npm audit fix`
- New `tests/e2e/asset-world.smoke.js` verifies the GLB loads, produces zero console errors, and gameplay (collision, physics, teleport) remains fully driven by the procedural network — full suite verified at 12/12 passing
