# NCR ESCAPE — Map Specification

Fictional open driving world inspired by the road culture, architecture, and geography of the Indian National Capital Region (NCR).

---

## 1. Regional Master Plan (Spec §3–5)

```
GURUGRAM-INSPIRED REGION (Cyber City, Corporate Mile, Golf Course Belt)
      ↓
DELHI-INSPIRED REGION (Central Core, Old Market, Ring Road, Riverfront)
      ↓
NOIDA-INSPIRED REGION (Sector Grid, Expressway, Tech Park)
      ↓
SECTOR 143 TECHNOLOGY VALLEY (First Major Career Destination)
      ↓
FUTURE EXPANSIONS (Greater Noida, Faridabad, Ghaziabad)
```

---

## 2. Playable Slice: Cyber District (Region 1)

### Road Hierarchy
| Road Segment | Type | Lanes | Speed Limit | Gameplay Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Main Boulevard** | Highway | 4 (2 per dir) | 94 km/h | High-speed drag runs, long-distance corridor |
| **Corporate Loop** | Urban | 2 (1 per dir) | 54 km/h | Technical 90-degree cornering, traffic navigation |
| **Service Lane** | Service | 1 lane | 32 km/h | Urban shortcut avoiding the central intersection |
| **The Flyover** | Elevated Highway | 2 lanes | 108 km/h | Overpass speed challenge with vertical clearance |
| **Central Junction** | Intersection | 4-Way | Signal Controlled | Decision point for sprints and race routes |

### NCR Visual Identity & Roadside Props
- **Elevated Metro Viaduct Line**: Elevated concrete track structure with twin rails and viaduct columns running alongside Main Boulevard.
- **Overhead Highway Gantries**: Iconic Indian green highway signs with route markings ("CYBER CITY / NH-48", "NOIDA EXPWY / SECTOR 143").
- **Streetlight Illumination**: Highway and urban lamp posts with real-time illumination.
- **Corporate High-Rises**: Architectural towers featuring glowing neon crown trims for night racing.

### Race Routes & Event Discovery Points
1. **Cyber District Sprint** (Marker at x: 6, z: -150) — Point-to-point blast up Main Boulevard through the Corporate Loop to the Service Lane.
2. **Corporate Loop Dash** (Marker at x: -140, z: 40) — Technical sprint across the Corporate Loop into the central junction.
3. **Noida Expressway Run** (Marker at x: -6, z: 180) — High-speed run down the southern highway artery.

---

## 3. Data-Driven Expansion Strategy
All roads, junctions, exit points, and event markers are stored in structured data (`roads/network.js`, `racing/events.js`). Adding Delhi, Noida, and Sector 143 districts simply requires adding new segment records with interconnected coordinate endpoints (`exits: []`), requiring zero modifications to the rendering engine or traffic AI.
