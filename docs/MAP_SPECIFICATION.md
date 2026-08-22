# NCR ESCAPE — Master Map Specification

Fictional open driving world inspired by the road culture, architecture, and geography of the Indian National Capital Region (NCR).

---

## 1. Master Highway Route (Spec §3–6)

```
REGION 1: GURUGRAM
  - Cyber District (Main Boulevard, Flyover, Metro Viaduct)
  - Corporate Mile (North Highway Corridor, Tech Skyscraper District)
  - Golf Course Belt (East Scenic Parkway, Green Belts, Tree-Lined Avenues)
  - Industrial Edge (West Freight Logistics, Warehouses, Silos)
  - Old Market (Dense Urban Bazaar, Transition to Delhi Gate)
      ↓
REGION 2: DELHI CENTRAL
  - Delhi Central Vista Grand Boulevard
  - India Gate-inspired Heritage Gateway Arch & Red Sandstone Pavilions
  - Ring Road Highway Orbital Artery
      ↓
YAMUNA RIVER CROSSING
  - Reflective River Yamuna Water Channel
  - Elevated Cable-Stayed Expressway Bridge with twin 42m suspension pylons
      ↓
REGION 3: NOIDA
  - 6-Lane Noida-Greater Noida Expressway (Speed-run corridor)
  - Sector Grid & IT SEZ Tech Parks (Sectors 62-142)
      ↓
REGION 4: SECTOR 143 TECHNOLOGY VALLEY
  - Futuristic Sector 143 Innovation Center with glowing cyber rings
  - Elite Street Racing Championship Finale Arena
```

---

## 2. Road Network Hierarchy

| Road ID | District | Lanes | Speed Limit | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `main-boulevard` | Cyber District | 4 (2 per dir) | 94 km/h | Central highway artery |
| `corporate-loop` | Cyber District | 2 (1 per dir) | 58 km/h | Technical urban connector |
| `service-lane` | Cyber District | 1 lane | 36 km/h | Narrow alley shortcut |
| `flyover-ramp` | Cyber District | 2 lanes (elevated) | 115 km/h | High-speed overpass |
| `corporate-mile` | Corporate Mile | 4 (2 per dir) | 100 km/h | High-speed skyscraper corridor |
| `golf-belt-east/north`| Golf Course Belt | 2 (1 per dir) | 80 km/h | Smooth sweeping turns |
| `industrial-haul-road`| Industrial Edge | 2 (1 per dir) | 58 km/h | Drifting freight route |
| `old-market-avenue` | Old Market | 4 (2 per dir) | 65 km/h | Heavy bazaar traffic weaving |
| `delhi-ring-road` | Delhi Central | 4 (2 per dir) | 108 km/h | Fast orbital highway |
| `delhi-central-vista` | Delhi Central | 6 (3 per dir) | 100 km/h | Grand ceremonial boulevard |
| `yamuna-bridge` | Yamuna River | 6 (3 per dir, elevated) | 126 km/h | Cable-stayed river drag strip |
| `noida-expressway-main`| Noida Expressway | 6 (3 per dir) | 130 km/h | 6-Lane maximum speed highway |
| `sector-143-boulevard` | Sector 143 | 6 (3 per dir) | 122 km/h | High-tech destination boulevard |

---

## 3. Dynamic Radar Minimap Integration
The radar minimap (`public/js/ui/minimap.js`) continually monitors player coordinates, updates road geometry in real-time, displays traffic blips and race checkpoints, and identifies the active district dynamically.
