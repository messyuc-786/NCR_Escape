# Checklist for Traffic Run & Near-Miss Combo System

- [x] Create `trafficRun.js` class managing game state and calculations
- [x] Incorporate "End Run" and "Quit Run" buttons in HTML/HUD
- [x] Add the Traffic Run results overlay modal in `index.html`
- [x] Style the results card and HUD additions in `style.css`
- [x] Implement upgraded near-miss detection in `boot.js` (with levels, speed scaling, and nitro rewards)
- [x] Wire up "DRIVE", "GARAGE", "MAIN MENU" button actions on the results panel
- [x] Integrate drift multipliers ("Drift Pass" combo)
- [x] Hook up near-miss whooshes and combo chime sounds in `audioEngine.js`
- [x] Write E2E Playwright tests to verify near miss and session flow
- [x] Run `npm test` and verify that all 7 suites pass successfully

## QA & Tuning Pass
- [x] Overhaul traffic spawn safety bounds (ahead-behind dot checks & overlap prevention)
- [x] Adjust target speeds by vehicle types (SLOW, NORMAL, FAST)
- [x] Integrate smooth visual lane-changing AI slides
- [x] Scale camera FOV with forward speed for speed sensation
- [x] Add high-combo glowing tiers (.combo-high-3, 4, 5)
- [x] Add heavy vehicle truck passes with extra points and specialized labels
- [x] Block reversing exploits via forward speed check
- [x] Implement dynamic difficulty density scaling over elapsed run time
- [x] Include first-run visual tutorial banner

## Phase 2: Living NCR Traffic
- [x] Centralize signal state machine timings (GREEN: 22s, YELLOW: 4s, ALL_RED: 1.5s)
- [x] Spatial cascade green wave synchronization
- [x] Yellow choice safe distance choice logic with driver variety
- [x] Wave-like queue release delays on green transition
- [x] Implement type-specific physics (auto-rickshaw, sedan, truck)
- [x] Regional traffic density and type-specific weighting
- [x] Time of Day density/speed modifications (Evening rush, Night speed cruising)
- [x] Monsoon Rain friction, speed limits, and cautious lane checks
- [x] Optimised Night-Only PointLights to preserve WebGL shader budgets
- [x] Verified full player gameplay freedom (ignoring signals for combos)
