# NCR ESCAPE — Development Roadmap

Independent project. Not affiliated with, forked from, or dependent on any other project or codebase.

Status legend: ✅ Done & Automated-Tested · 🚧 In Progress · ⏳ Planned (Future Phases)

---

## Phase 1 — Foundation ✅
- Project boot (Express server with static delivery and stub save API)
- Three.js WebGL engine (local vendored ES module — zero CDN dependency)
- High-framerate game loop (`requestAnimationFrame`) with delta-time clamping
- Dual-platform input system: Keyboard, Gamepad, and Multi-Touch virtual controls for smartphones/tablets
- Third-person dynamic chase camera with spawn snap and high-speed trailing
- Low-poly original vehicle mesh generation and transform integration

## Phase 2 — Driving Physics ✅
- Longitudinal acceleration and deceleration curves with top speed clamping
- Speed-sensitive steering assist for arcade stability
- Handbrake-initiated rear traction loss and drift yaw integration
- Braking vs. reverse logic with standstill detection
- Axis-Aligned Bounding Box (AABB) static obstacle and building collision resolution
- Multi-touch responsive phone controls (steer buttons, gas/brake pedals, drift button)

## Phase 3 — First NCR World Slice ✅
- Fictional **Cyber District** (Gurugram-inspired):
  - **Main Boulevard**: 4-lane divided central artery
  - **Corporate Loop**: East-west connector with tighter cornering
  - **Service Lane**: Narrow urban shortcut behind corporate blocks
  - **The Flyover**: Elevated multi-lane ramp with concrete support pillars
  - **Elevated NCR Metro Viaduct Line**: Track deck, twin rails, and viaduct pillars running parallel to the highway corridor
  - **Overhead Highway Signboards**: Iconic Indian highway green signage ("CYBER CITY", "NOIDA EXPWY / SECTOR 143")
  - **Streetlight System**: Lamp posts with illumination along key corridors
  - **Dynamic Lighting**: Day, Sunset, and Night atmospheric modes with neon building highlights

## Phase 4 — Traffic System ✅
- Shared road network data driving both asphalt rendering and AI pathing
- Lane following with keep-left convention and lane offset calculations
- Speed limits, per-car speed variance, and density-weighted road spawning
- Forward collision avoidance (slows for cars ahead and yields to the player)
- Solid collision boundaries (player cannot pass through traffic vehicles)
- Derivation of physical intersections using parametric line-segment crossing
- Two-phase traffic signal controllers cycling green/yellow/all-red clearance
- Segment turning AI: vehicles turn smoothly onto intersecting roads
- Iconic Indian vehicle types: Hatchback, Sedan, Auto-Rickshaw (3-Wheeler), and Heavy Goods Truck

## Phase 5 — Racing & Event Discovery ✅
- Data-driven event architecture (`racing/events.js`) running any event definition
- In-world interactive event markers with distance-fading beacons
- Event discovery prompt with keyboard & touch triggers
- Race countdown state holding car in place with procedural audio cues
- Ordered checkpoint gates with radius triggers and dynamic visibility
- Live race timer and checkpoint progression HUD
- Multiple discoverable races across the district (Cyber District Sprint, Corporate Loop Dash, Noida Expressway Run)
- Results modal calculating target-time bonuses, Cash, XP, and Reputation awards

## Phase 6 — Progression, Economy & Garage Showroom ✅
- Persistent local progression save (Cash, XP, Reputation, Player Level)
- Garage Showroom with multi-car lineup:
  1. **Vantra RS** (Street Hatchback — Agile starter)
  2. **Kaveri GT** (Sport Coupe — Aerodynamic speedster)
  3. **Garuda RX** (Performance Muscle Sedan — High-torque drift machine)
  4. **Indus Cruiser** (Urban SUV — High stability & mass)
- Vehicle acquisition & active car selection
- Custom Paint Palette (Cyber Orange, Noida Teal, Delhi Crimson, Gurugram Midnight, Aravalli Gold, Silver Frost, Stealth Black)
- 5 Performance Upgrade categories (Engine Tune, Turbo, Street Tires, Sport Brakes, Suspension) modifying real vehicle physics stats
- Drift Scoring System: Live drift angle and speed calculation with multiplier bonuses and bankable cash rewards

## Phase 7 — Audio & Immersion ✅
- Web Audio API procedural sound synthesizer (zero external sound file downloads)
- Dynamic engine roar and harmonics scaling with RPM & speed
- Bandpass-filtered tire screech noise on drifts and hard braking
- Collision impact thud synthesis
- Countdown beeps and victory reward chimes

## Phase 8 — Multi-Platform HUD & UI ✅
- Real-time 2D Canvas Radar Minimap with road lines, player heading cone, traffic blips, event markers, and checkpoints
- High-contrast Speedometer, Gear indicator (D/R/N), and dynamic RPM bar
- Floating Drift Score counter and multiplier HUD
- Mobile on-screen touch controls with multi-touch support
- Quick toggles: Day/Night lighting, Sound Mute, Touch controls toggle

---

## Future Phases (Planned)
- ⏳ Full Region 1 (Gurugram): Corporate Mile, Old Market, Golf Belt, Industrial Edge
- ⏳ Region 2 (Delhi): Central District, Old City, Ring Road, Riverfront
- ⏳ Region 3 (Noida): Sector Grid, Metro Corridor, Tech Park
- ⏳ Region 4 (Sector 143): Technology Valley destination
- ⏳ Weather effects (Rain, Wet road reflections, Haze)
- ⏳ AI rival racing opponents
- ⏳ Multiplayer rooms & position synchronization
