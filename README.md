# NCR ESCAPE — Open-World Indian Street Racing Game

An original open-world Indian street-driving and racing experience inspired by the National Capital Region (NCR — Gurugram → Delhi → Noida → Sector 143).

This is a **completely independent project** built from the ground up with zero dependencies, assets, or code from any other project.

---

## Highlights & Features

- **Multi-Platform Ready**: Fully playable on **Desktop (Computer)** with keyboard/gamepad and on **Mobile (Phones & Tablets)** with responsive virtual on-screen multi-touch controls.
- **Living Open-World World Slice (Cyber District)**: 4-lane Main Boulevard, Corporate Loop, Service Lane shortcut, elevated Flyover overpass, elevated NCR Metro Viaduct line with columns and tracks, Indian green highway gantries ("CYBER CITY / NH-48", "NOIDA EXPWY / SECTOR 143"), and streetlights.
- **Dynamic Day / Sunset / Night Lighting**: Real-time atmospheric lighting and neon high-rise highlights.
- **Full AI Traffic Simulation**: Lane following, speed limits, forward obstacle avoidance, yielding to player, solid collisions, and 2-phase traffic lights with auto-rickshaws (3-wheelers), sedans, hatchbacks, and transport trucks.
- **Original Vehicle Lineup & Customization**:
  - **Vantra RS** (Street Hatchback — Agile starter)
  - **Kaveri GT** (Sport Coupe — Aerodynamic speedster)
  - **Garuda RX** (Performance Muscle Sedan — High-torque drift machine)
  - **Indus Cruiser** (Urban SUV — Heavy, high stability)
  - Custom Paint Palette (Cyber Orange, Noida Teal, Delhi Crimson, Gurugram Midnight Blue, etc.)
  - 5-Tier Performance Upgrades modifying real vehicle physics stats (Engine, Turbo, Tires, Brakes, Handling).
- **Drift Scoring & Combo System**: Live drift angle and speed calculation with dynamic multiplier bonuses and bankable cash rewards.
- **Real-Time 2D Radar Minimap**: Renders road network, player orientation, traffic blips, event markers, and checkpoints in real-time.
- **Web Audio API Procedural Sound Synthesizer**: Native engine rumble/pitch modulation, tire drift screech, crash impact thuds, countdown beeps, and victory chimes without external audio file dependencies.
- **Full Career Loop**: Free Drive → Discover Events → Countdown → Race Through Traffic → Cash/XP/Rep Rewards → Garage Showroom → Upgrade Stats → Drive Again (persisted locally).

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the local game server
npm start
```

Open **http://localhost:3000** in any modern desktop or mobile browser.

---

## Controls

### Desktop (Computer)
| Key | Action |
| :--- | :--- |
| `W` / `↑` | Accelerate / Gas |
| `S` / `↓` | Brake / Reverse |
| `A` / `←` | Steer Left |
| `D` / `→` | Steer Right |
| `SPACE` | Handbrake / Drift |
| `E` | Discover / Start Event |
| `R` | Reset Car Position |
| `G` | Toggle Garage Showroom |
| `M` | Toggle Audio Mute |
| `N` | Toggle Day / Sunset / Night Mode |

### Mobile (Phone / Tablet)
- **Steering Buttons**: Left (◀) / Right (▶)
- **Pedals**: Green Gas Pedal (Accelerate) / Red Brake Pedal (Brake / Reverse)
- **Drift Button**: Orange Handbrake for power-slides
- **Top Actions**: Event trigger, Car Reset, Day/Night toggle, Sound toggle, and Garage Showroom

---

## Automated Test Suite

All gameplay systems are validated with automated headless browser tests:

```bash
npm test
```

Test Suites:
1. `drive.smoke.js`: Forward acceleration, steering heading change, drift yaw, braking, reverse, solid collisions, zero console errors.
2. `traffic.smoke.js`: Traffic spawning, lane boundaries, continuous movement, solid player collision, zero console errors.
3. `intersections.smoke.js`: Derived line-segment junctions, non-overlapping traffic light phases, road-to-road turning, zero console errors.
4. `loop.smoke.js`: Complete end-to-end game loop from start line -> event discovery -> countdown freeze -> checkpoint progression -> race finish -> cash/XP/rep rewards -> garage upgrade purchase -> physics stat modification -> reload persistence.

---

## Project Documentation

Comprehensive architectural and design documents are located in `docs/`:
- [`ROADMAP.md`](docs/ROADMAP.md): Project roadmap, completed milestones, and future phases.
- [`GAME_DESIGN.md`](docs/GAME_DESIGN.md): Detailed game design, driving physics, vehicle roster, and economy.
- [`TECHNICAL_ARCHITECTURE.md`](docs/TECHNICAL_ARCHITECTURE.md): System architecture, stack details, data flow, and directory layout.
- [`MAP_SPECIFICATION.md`](docs/MAP_SPECIFICATION.md): World structure, road hierarchy, props, and NCR expansion plan.
- [`DEVELOPMENT_PHASES.md`](docs/DEVELOPMENT_PHASES.md): Phase criteria, validation procedures, and test results.
