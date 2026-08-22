# NCR ESCAPE — Game Design Document

## 1. Core Fantasy
Drive freely through a fictionalized NCR-inspired open world, discover races and street events, navigate bustling traffic, earn money and reputation, upgrade vehicles in the garage, customize paint, unlock new cars and regions, and master high-speed Indian street racing.

## 2. Core Gameplay Loop
```
HOME
 ↓
GARAGE (Select car, customize paint, buy performance upgrades)
 ↓
WORLD MAP & MINIMAP RADAR
 ↓
FREE DRIVE (Explore open streets, test vehicle handling)
 ↓
TRAFFIC & ROAD CULTURE (Traffic lights, auto-rickshaws, metro viaduct)
 ↓
DISCOVER EVENT (Approach in-world marker, view event brief)
 ↓
RACE (Countdown, checkpoints, traffic weaving, time limits)
 ↓
WIN & REWARDS (Cash, XP, Reputation, target-time bonus)
 ↓
DRIFT SCORING (Cornering angle + speed multiplier bonuses)
 ↓
RETURN TO GARAGE & LEVEL UP
 ↓
UNLOCK NEW CARS & DRIVE AGAIN
```

## 3. Platform Compatibility
- **Desktop (Computer)**: Full Keyboard (WASD, Arrows, Space, E, R, G, M, N) and Gamepad support.
- **Mobile (Phone / Tablet)**: Responsive virtual touch controls with multi-touch capability (simultaneous steering, pedal modulation, and handbrake drifting) plus high-DPI scaling and viewport adaptation.

## 4. Vehicle Lineup & Handling
Original fictional vehicles with distinct physical parameters:
1. **Vantra RS** (Street Hatchback): Light, nimble, sharp low-speed turn-in, perfect starter car.
2. **Kaveri GT** (Sport Coupe): Aerodynamic, low drag, high top speed for expressway runs.
3. **Garuda RX** (Performance Muscle Sedan): High torque, aggressive oversteer, powerful drift initiation.
4. **Indus Cruiser** (Urban Performance SUV): Heavy mass, high stability, rough-surface grip.

## 5. Driving & Drift Physics Model
- **Arcade / Simcade Philosophy**: Immediate, responsive, accessible, yet rewardingly deep.
- **Longitudinal**: Realistic acceleration and braking curves with distinct reverse engagement.
- **Lateral Steering**: Steering sensitivity scaled dynamically with speed to prevent jitter.
- **Drift Mechanic**: Handbrake breaks rear traction, applying yaw moment proportional to steering and speed, feeding into a real-time drift score counter and combo multiplier.
- **Collision Response**: Rigid-body push-out against buildings and AI traffic with momentum dampening and impact audio.

## 6. Traffic & Road Simulation
- **AI Behavior**: Lane following, speed limits with variance, forward car distance keeping, yielding to player, and traffic light obedience.
- **Junctions**: Derived automatically from road geometry with 2-phase signal poles (Green → Yellow → Red clearance) and smooth turning across intersections.
- **Vehicle Types**: Commuter Hatchbacks, City Sedans, Indian Auto-Rickshaws (3-Wheelers), and Goods Transport Trucks.

## 7. Event & Racing System
- **Sprint**: Point A to Point B high-speed route through traffic.
- **Circuit**: Multi-lap closed loop.
- **Time Trial / Highway Run**: Speed test against target completion times.
- **Drift Challenge**: Score-based cornering events.

## 8. Economy & Garage Customization
- **Currency**: Indian Rupees (₹ Cash) and Reputation (REP).
- **Customization**: Paint booth with 7 distinct regional colorways (Cyber Orange, Noida Teal, Delhi Crimson, Gurugram Midnight, etc.).
- **Upgrades**: 5 tiers across Engine, Turbo, Tires, Brakes, and Handling modifying actual physics parameters.

## 9. Audio & Atmosphere
- Synthesized audio engine powering engine rumble, tire screeches, crash thuds, countdown beeps, and win chimes.
- Dynamic Day, Sunset, and Night lighting modes with ambient fog and neon skyscraper accents.
