# NCR ESCAPE — Open-World Indian Street Racing Game

An original open-world Indian street-driving and racing experience inspired by the National Capital Region (NCR — **Gurugram → Delhi Central → Yamuna River Crossing → Noida Expressway → Sector 143**).

This is a **completely independent project** built from the ground up with zero dependencies, assets, or code from any other project.

---

## 🌟 Highlights & Key Features

- **Multi-Platform Ready**: Fully playable on **Desktop (Computer)** with keyboard/gamepad and on **Mobile (Phones & Tablets)** with responsive virtual on-screen multi-touch controls.
- **Master 4-Region NCR Open World**:
  - **Gurugram (Region 1)**: Cyber District high-rises, Corporate Mile, Golf Course Belt, Industrial Edge, and Old Market.
  - **Delhi Central (Region 2)**: Central Vista Grand Boulevard, India Gate-inspired Heritage Gateway Arch, Sandstone Pavilions, and Ring Road.
  - **Yamuna River Crossing**: Water channel with elevated **Cable-Stayed Expressway Bridge** with twin 42m suspension towers and stay cables.
  - **Noida (Region 3)**: 6-Lane high-speed Expressway, IT SEZ Commercial Parks, and Sector 62 Link Road.
  - **Sector 143 (Region 4)**: Futuristic Innovation Center with glowing cyber rings and Grand Championship Arena.
  - Elevated concrete **NCR Metro Viaduct Line** with twin tracks and viaduct columns.
- **6 Original Fictional Vehicles**:
  1. **Vantra RS** (Street Hatchback — Agile starter)
  2. **Kaveri GT** (Sport Coupe — Aerodynamic speedster)
  3. **Garuda RX** (Performance Muscle Sedan — High-torque drift machine)
  4. **Indus Cruiser** (Urban Performance SUV — Heavy, high stability)
  5. **Sherpa 4x4** (Rugged Off-Roader — High clearance & suspension)
  6. **Apex GT Hypercar** (Flagship Expressway Hypercar — 330+ km/h)
- **Real-Time WebSocket Multiplayer Free-Roam**:
  - Low-latency 20Hz world synchronization tick.
  - Seamless remote player vehicle interpolation, custom paint models, and real-time minimap radar blips.
- **Nitro Boost & Near-Miss Combos**:
  - 1.55x acceleration surge with expanding top-speed cap, cyan exhaust flames, and high-speed camera FOV push (60° → 67°).
  - High-speed traffic near-miss proximity detection with instant cash bonuses and Nitro refills.
- **Police Pursuit & Heat System**:
  - 1–3 Star Heat Level with pursuit AI, PCR Police Cruiser 3D models with animated red/blue roof strobe light bars, procedural police sirens, and Busted vs. Escaped dynamics.
- **Speed Trap Radar Mini-Game**:
  - Overhead radar gantries along expressways with camera shutter audio, HUD flash animation, and velocity bonuses.
- **90s / 2000s Bollywood & Punjabi Radio Experience**:
  - Live deck streaming multiple retro/remix channels (Punjabi Power, Desi Bass, Bollywood Beats, Lofi Midnight) and a custom AUX mode for local files.
  - Interactive compact LCD widget displaying frequency visualizer bars and playlist updates, responsive to driving combos and near-miss state pulses.
- **Atmospheric District-Specific Styling & Landmarks**:
  - **Gurugram**: Twin glass skyscrapers (Cyber Spire Plaza) with a horizontal neon skybridge and digital billboards.
  - **Noida**: Stepped terraced corporate spire with high-intensity orange crown beacons and overhead exit signs.
  - **Delhi**: A sandstone Central Vista arch and a dense market bazaar along Old Market Cross featuring canvas-awned kiosks, parked scooters, autoshaws, and tea stalls.
  - **Yamuna Crossing**: A large cable-stayed suspension bridge with stay lines and optimized specular river reflections.
- **Dynamic Monsoon Wet Weather**:
  - Rain dynamically darkens the asphalt material, increasing reflectivity (roughness: 0.15, metalness: 0.55) to simulate slick wet surfaces.
- **Lightweight Challenge & Level Progression Engine**:
  - Data-driven challenge templates (Traffic, Speed, Combo, Driving, District, and Special categories) with active HUD progress updates.
  - Slower Level scaling formula (`XP = 250 * L * (L - 1)`) and a Garage Profile Dashboard showing Level, XP progress bar, and wallet NCR Credits.
  - Automatic local-date based **Daily Challenges** reset.
- **Interactive Photo Mode & Filters**:
  - Orbit camera, FOV & Dutch angle tilt sliders, time-of-day toggle, 5 cinematic color filters, and instant PNG screenshot downloads.
- **Achievements & Milestones**:
  - 9 driver milestone challenges with animated gold HUD toasts and Garage achievements showcase.
- **Multi-Camera Perspectives**:
  - Chase Far (Default), Chase Close (Action), and Hood / Bonnet Cam (First-Person simulation).
- **Progressive Web App (PWA)**:
  - Installable home-screen application for Android & iOS with offline service worker caching.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the game server
npm start
```

Open **http://localhost:3000** in any modern desktop or mobile browser.

---

## 🎮 Controls

### Desktop (Computer)
| Key | Action |
| :--- | :--- |
| `W` / `↑` | Accelerate / Gas |
| `S` / `↓` | Brake / Reverse |
| `A` / `←` | Steer Left |
| `D` / `→` | Steer Right |
| `SPACE` | Handbrake / Power Slide |
| `SHIFT` / `N` | Nitro Boost |
| `C` | Cycle Camera (Chase Far / Close / Hood) |
| `P` | Open Photo Mode |
| `M` | Cycle Radio Station |
| `E` | Discover / Start Event |
| `R` | Reset Car Position |
| `G` | Toggle Garage Showroom |

### Mobile (Phone / Tablet)
- **Steering Buttons**: Left (◀) / Right (▶)
- **Pedals**: Green Gas Pedal (Accelerate) / Red Brake Pedal (Brake / Reverse)
- **Nitro Button**: `🚀 NITRO` Boost
- **Drift Button**: Orange Handbrake for power-slides
- **Top Actions**: Radio, Day/Sunset/Night lighting, Weather (Clear/Rain/Haze), Camera view, Photo Mode, and Garage Showroom

---

## 🧪 Automated Test Suite

All gameplay systems are tested and validated with Playwright:

```bash
npm test
```

Test Suites:
1. `title-screen.test.js`: Validates desktop and mobile layout rules, visibility of interactive panels, settings inputs, and start buttons.
2. `traffic-run.smoke.js`: Verifies the score loop, restart triggers, play again routes, and results screen population.
3. `radio.smoke.js`: Verifies station deck selections, volume ramping, media streams routing, and local persistence.
4. `challenges.smoke.js`: Verifies challenge engine completions, leveling formula thresholds, wallet updates, and garage dashboard rendering.
5. `phase1-world.smoke.js`: Validates pedestrian movement, stride animations, and traffic light cycle phases.
6. `drive.smoke.js`: Forward acceleration, steering heading change, drift yaw, braking, reverse, nitro, collisions, zero console errors.
7. `traffic.smoke.js`: Traffic spawning, lane boundaries, continuous movement, solid player collision, zero console errors.
8. `intersections.smoke.js`: Derived line-segment junctions, non-overlapping traffic light phases, road-to-road turning, zero console errors.
9. `loop.smoke.js`: Complete end-to-end game loop from start line -> event discovery -> countdown freeze -> checkpoint progression -> race finish -> cash/XP/rep rewards -> garage upgrade purchase -> physics stat modification -> reload persistence.

---

## 📚 Project Documentation

Comprehensive architectural and design documents are located in `docs/`:
- [`ROADMAP.md`](docs/ROADMAP.md): Project roadmap, completed milestones, and development phases.
- [`GAME_DESIGN.md`](docs/GAME_DESIGN.md): Detailed game design, vehicle roster, driving physics, and progression economy.
- [`TECHNICAL_ARCHITECTURE.md`](docs/TECHNICAL_ARCHITECTURE.md): System architecture, stack details, data flow, and directory layout.
- [`MAP_SPECIFICATION.md`](docs/MAP_SPECIFICATION.md): World structure, road hierarchy, props, and NCR expansion plan.
- [`DEVELOPMENT_PHASES.md`](docs/DEVELOPMENT_PHASES.md): Phase criteria, validation procedures, and test results.
