# NCR ESCAPE — System Design & Architecture

Independent, original open-world driving and street-racing game for desktop and mobile browsers.

---

## 1. High-Level Architecture Overview

```
                          ┌────────────────────────┐
                          │    Browser Client      │
                          │ (Desktop & Smartphone) │
                          └───────────┬────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
           ▼                          ▼                          ▼
 ┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
 │   Input Layer     │      │   Physics & World │      │   Traffic & AI    │
 │ Keyboard, Gamepad │      │ carPhysics, World │      │ TrafficSystem,    │
 │ Multi-Touch Mobile│      │ District, Weather │      │ AIOpponent Racer, │
 └─────────┬─────────┘      └─────────┬─────────┘      │ PoliceSystem (PCR)│
           │                          │                └─────────┬─────────┘
           └──────────────────────────┼──────────────────────────┘
                                      ▼
                        ┌──────────────────────────┐
                        │       Core Engine        │
                        │ boot.js Game Loop (60fps)│
                        └─────────────┬────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
           ▼                          ▼                          ▼
 ┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
 │ Rendering & Audio │      │  Progression & UI │      │  World Systems    │
 │ Three.js WebGL    │      │ GameUI, Minimap,  │      │ SpeedTrapSystem,  │
 │ AudioEngine Synth │      │ Garage, Economy   │      │ WeatherSystem     │
 └───────────────────┘      └───────────────────┘      └───────────────────┘
```

---

## 2. Key Modules & Subsystems

| Module | Location | Purpose |
| :--- | :--- | :--- |
| **Physics Engine** | `public/js/physics/carPhysics.js` | Longitudinal acceleration, top speed clamping, speed-sensitive steering, drift yaw, reverse logic, and AABB building/traffic collision resolution. |
| **Vehicle Catalogue** | `public/js/vehicles/vehicle.js` | 6 original vehicles (Vantra RS, Kaveri GT, Garuda RX, Indus Cruiser, Sherpa 4x4, Apex GT) and procedural 3D meshes. |
| **World & Districts** | `public/js/world/district.js` | 4-region open world: Gurugram, Delhi Central Vista, Yamuna Cable-Stayed Bridge, Noida Expressway, Sector 143 Tech Valley, elevated Metro line, lighting modes. |
| **Speed Traps** | `public/js/world/speedTraps.js` | Highway radar camera gantries, speed detection, flash HUD animation, and cash rewards. |
| **Police Pursuit** | `public/js/traffic/policeSystem.js` | 1–3 Star Heat system, PCR patrol car AI with strobe lights, busted countdown timer, and escape cooldown rewards. |
| **AI Opponents** | `public/js/racing/aiOpponent.js` | Grid-spawned rival racers navigating sequential checkpoint gates with cornering deceleration and traffic avoidance. |
| **Dynamic Weather** | `public/js/world/weather.js` | Clear, Monsoon rain (1,200 particle rain system + reduced road grip), and NCR dust haze. |
| **Web Audio Synthesizer** | `public/js/audio/audioEngine.js` | Dual-oscillator engine rumble, tire screech white noise, police siren wail, camera shutter click, collision impacts, countdown beeps, and win chimes. |
| **Radar Minimap** | `public/js/ui/minimap.js` | Real-time 2D Canvas radar displaying 4-region road network, active district name, traffic blips, AI rivals, and player heading. |
| **Multi-Touch Controls** | `public/js/core/input.js` | On-screen virtual buttons (steer left/right, gas pedal, brake/reverse pedal, drift handbrake) with multi-touch pointer tracking. |
| **Progression & Economy** | `public/js/progression/progression.js` | Cash, XP, Reputation, Level, Garage car purchases, 8 custom paints, 5-tier performance upgrades, drift bank, and local save persistence. |
| **Blender Visual Art Layer** | `public/js/world/assetWorld.js` | Additive glTF overlay (`public/assets/world/ncr-world.glb`), Blender-authored directly from `roads/network.js` coordinates. Purely visual — collision/physics/traffic/race logic untouched; a failed load never blocks boot. |

---

## 3. Zero External Dependencies for Offline Reliability
- **Three.js r160**: Local vendored ES module (`public/js/vendor/three.module.js`) with zero CDN reliance.
- **Synthesized Audio**: Pure Web Audio API oscillators with zero external `.mp3` or `.wav` dependencies.
- **Procedural 3D Models**: All vehicles, Indian auto-rickshaws, metro trains, and landmarks are generated programmatically using standard Three.js primitives.
