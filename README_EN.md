# Battle City 1985 — 1:1 Famicom/NES Authentic Remake & Modern Enhancement

[简体中文](./README.md) | **English**

[![HTML5 Canvas](https://img.shields.io/badge/Render-HTML5%20Canvas%20(4x%20HD)-E34F26?style=flat-square&logo=html5&logoColor=white)](#)
[![Web Audio API](https://img.shields.io/badge/Audio-2A03%20APU%20Synthesizer-4B8BBE?style=flat-square)](#)
[![Pure Vanilla JS](https://img.shields.io/badge/Dependencies-Zero%20(No%20Frameworks)-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](#)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#)

A browser-based, pure vanilla JavaScript (ES6+), HTML5 Canvas, and Web Audio API recreation of the legendary 1985 Famicom / NES title **Battle City (坦克大战)**.

This project requires **zero external build tools, zero package dependencies, and zero audio asset files**. It faithfully replicates the authentic physics, stage data, and hardware-level APU sound synthesis of the original ROM, while enhancing the experience with **7 HD vector/pixel themes**, a **drag-and-drop map editor**, **virtual mobile gamepads**, and **flexible gameplay parameter tuners**.

---

## 🌟 Key Features

### 1. 1:1 ROM-Accurate Gameplay & Mechanics
- **Native NES Aspect & Coordinate System**: Built on the native 256×240 resolution layout (208×208 playfield, 13×13 blocks / 26×26 8px sub-tiles, 32px HUD sidebar).
- **Expanded 108 Diverse Stages & Tailored Waves**: Fully preserves the authentic 35 Famicom ROM stages and dramatically expands the repertoire to **108 unique battlefields**! From Bagua Labyrinths, Archipelago Rivers, and Iron Citadels to Space Invaders and Imperial Apex Fortresses, every stage boasts its own topological theme and tailored 20-tank wave composition (Basic, Fast, Power, and Armor tanks).
- **Signature Physics & Controls**:
  - **8px Corner Snapping**: Faithful corner alignment when turning at intersections for smooth corridor navigation without getting stuck.
  - **Quadrant-Level Brick Destruction**: 4-bit sub-tile masks (TL/TR/BL/BR) with 10px bullet lateral footprint for authentic dual-brick breaching, and 3-star steel penetration.
  - **Multi-Point Ice Sliding**: Realistic inertia sliding across ice patches with multi-contact boundary sampling for smooth deceleration when exiting ice.
  - **Bullet-vs-Bullet Collisions**: Head-on opposing bullet collisions cancel each other out with micro-explosion animations and metallic clangs.
  - **Complete 6 Power-Up Types**: Helmet shield, Clock enemy freeze, Shovel eagle fortress (with anti-entrapment checks), Star weapon upgrades, Grenade screen bomb (with bonus tank prize protection), and Tank extra life.
  - **Authentic 2P Mechanics & Borrowing Lives**: Friendly fire stunning (3s duration), end-of-stage Tally Score breakdown, 1,000 PTS bonus, and classic life-borrowing from teammate when eliminated.
  - **Stage-to-Stage Life Continuity**: Remaining lives and tank upgrade tiers now carry over across stages rather than resetting to 3 each round.
  - **Teammate Life Borrowing**: In 2P mode, if a player is eliminated with 0 lives, they can borrow a spare life from their teammate (if teammate total lives ≥ 2) by pressing their fire key or A+B.

### 2. Hardware-Accurate NES 2A03 APU Synthesizer
- **Zero External Audio Assets**: All music, sound effects, and ambient noises are dynamically synthesized via the Web Audio API—no `.mp3` or `.wav` files required.
- **4 Synthesized Channels**: Pulse 1, Pulse 2, Triangle, and 15-bit LFSR pseudo-random Noise.
- **Register-Level Sequence Replay**: Hardware envelope decays, pitch sweeps, and sequence tables ($ED36–$EF62) reproducing the iconic intro fanfare, player shoot sweep, armor clangs, brick thuds, base alarm, and tank engine loops—all speed-synchronized with gameplay tempo.

### 3. 7 High-Definition & Pixel Art Theme Pipelines
Switch instantly between 7 visual aesthetics with 4x supersampled vector graphics or nearest-neighbor pixel rendering:
1. **Teyvat 2D (Genshin-Inspired)**: Cel-shaded anime mecha tanks, winged shrine base, hydro/anemo/electro particle blooms.
2. **Cyberpunk 2D**: Neon Night City glow, hovering plasma treads, circuit-board hull traces, and holographic shields.
3. **WWII Military**: US Sherman Olive Drab vs. Panzer Field Gray, realistic sandbag fortifications, and warzone palette.
4. **Metal Slug Heavy**: Arcade SV-001 tank silhouettes, heavy industrial armor, and chunky blast effects.
5. **Modern Tactical**: M1A2 Desert digital camouflage, urban tactical teal, and tactical radar command center.
6. **War Table (Miniature Board Game)**: Burnished brass & cast-iron token figurines, wooden pedestals, and parchment tabletop contours.
7. **Classic FC 1985**: Pixel-perfect 8-bit sprites, authentic NES palette, and integer-ratio nearest-neighbor scaling.

### 4. Interactive Visual Map Editor (CONSTRUCTION Mode)
- **Classic 16×16 Pattern Cycles**: Full palette of brick halves/fulls, steel barriers, forests, water hazards, and ice tracks.
- **Keyboard Navigation**: Arrow keys/WASD cursor movement, `Space` pattern cycling, `C` to clear, `Enter` to save and playtest.
- **Continuous Mouse Painting & Erasing**: **Click and drag the left mouse button to paint walls continuously like a brush**; drag the right mouse button to erase seamlessly.
- **Persistent Storage**: Maps are automatically saved to `localStorage` and accessible as Stage 36 in the stage select dropdown.

### 5. Modern Usability & Quality of Life
- **Retro CRT Shader**: Toggleable scanline emulation and vignette screen curvature.
- **Game Speed Scaling**: Play at 0.75x (slow-motion training), 1.0x (authentic speed), or 1.2x (fast-paced arcade challenge) with matched audio tempo.
- **Drop Rate & Bullet Speed Customization**: Fine-tune the Star power-up spawn probability (10% to 100%) and basic bullet velocity.
- **Dual-Device Layout**: Desktop keyboard shortcuts with default-prevention and responsive mobile touch D-Pad / fire controls.

---

## 🎮 Controls & Keybindings

### 1. Gameplay Controls

#### Single Player (1P)
| Action | Keyboard | Touch / Mouse |
| :--- | :--- | :--- |
| **Move** | `W` `A` `S` `D` or `↑` `↓` `←` `→` Arrow Keys | D-Pad buttons (▲ ◀ ▶ ▼) |
| **Fire** | `Space` / `J` / `Z` / `K` | Fire button |
| **Pause / Resume** | `P` / `Enter` / Top bar button | Top bar Pause button |
| **Return to Menu** | `Escape` / Top bar Menu button | Top bar Menu button |

#### Two Players (2P)
| Player | Movement | Fire Key | Borrow Life Key (When Teammate Lives ≥ 2) |
| :--- | :--- | :--- | :--- |
| **1P (Gold / Green)** | `W` `A` `S` `D` | `Space` / `J` / `F` / `G` | `J` / `Space` / `B` / `A+B` |
| **2P (Forest Green)** | `↑` `↓` `←` `→` Arrow Keys | `K` / `L` / Numpad `0` `1` / `Slash` (`/`) / `ShiftRight` | `K` / Numpad `0` / `Enter` / `A+B` |

> 💡 **Borrowing Rules**: In 2P mode, if one player is destroyed and out of lives (0 lives), as long as the teammate has spare lives (total lives ≥ 2, spare counter ≥ 1), pressing their action/fire key will borrow 1 life from the teammate and instantly respawn at their spawn point with a shield! The teammate's spare lives decrease by 1. A player cannot borrow if the teammate is down to their last tank (lives = 1).

#### Map Editor (CONSTRUCTION)
| Action | Method |
| :--- | :--- |
| **Move Cursor** | Arrow Keys / `WASD` / Left Click |
| **Cycle Block Type** | `Space` on current block or repeatedly click the same cell |
| **Paint Wall (Brush)** | **Hold Left Click & drag across the battlefield** |
| **Erase Wall** | **Hold Right Click & drag across the battlefield** |
| **Clear Map** | `C` key |
| **Save & Playtest** | `Enter` key |
| **Exit Editor** | `Escape` key |

---

## 📂 Project Structure

```text
├── index.html              # Main cabinet shell, header bar, touch controller & UI mount
├── style.css               # Arcade bezel, CRT scanline overlay, responsive wrap & theme styling
├── README.md               # Documentation in Simplified Chinese (Default)
├── README_EN.md            # Documentation in English
└── js/
    ├── constants.js        # Physical constants, palettes, upgrade specs & ROM spawn tables
    ├── font.js             # NES 8x8 bitmap glyph renderer & HD antialiased vector typography
    ├── sprites.js          # Core sprite library (Classic pixel art, Genshin, Cyberpunk & explosions)
    ├── skins-realistic.js  # WWII, Metal Slug, Modern, and War Table theme assets
    ├── levels.js           # 108-stage map layouts parser, subtile bitmasks & custom stage IO
    ├── audio.js            # Web Audio NES 2A03 APU 4-channel hardware synthesizer
    ├── entities.js         # MapGrid, Tank, Bullet, PowerUp, SpawnStar, and Explosion classes
    ├── editor.js           # Construction mode state machine & brush painting logic
    └── game.js             # 60Hz fixed-timestep game loop, input routing, physics & collision
```

---

## 🚀 Getting Started

Because this project is built with 100% pure vanilla web standards, **no build step, Node.js, or package manager is required**.

### Option 1: Direct Run
Double-click `index.html` to run the game in any modern browser (Chrome, Edge, Firefox, Safari).

### Option 2: Local Static Server (Recommended)
To run within a local server environment:

```bash
# Python 3
python -m http.server 8080

# Or Node.js npx serve
npx serve .
```

Open `http://localhost:8080` in your browser to start playing.

---

## 🛠️ Technical Highlights

1. **Fixed 60Hz Timestep Loop**:
   Decoupled physics updates using an accumulator clock (16.666ms per step), guaranteeing uniform tank speed and bullet trajectories regardless of monitor refresh rates (60Hz, 120Hz, 144Hz, etc.).
2. **Sub-Stepping Collision Detection**:
   Bullet velocities are integrated in fractional sub-steps to eliminate tunneling through thin walls or fast-moving targets.
3. **Anti-Entrapment Physical Boundaries**:
   - Spawning overlapping tanks gracefully separate by allowing distance-increasing displacements.
   - Base fortification routines check for tank occupancy before solidifying brick or steel tiles, avoiding trapped units.
4. **Oscillation-Free Tactical AI**:
   Enemies dynamically steer toward high-value targets (the Eagle base or players) while probing surrounding tiles before choosing turn vectors, eliminating the classic two-direction deadlock in dead-ends.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE). The original game copyright belongs to NAMCO / BANDAI NAMCO Entertainment. This implementation is created strictly for retro gaming preservation, computer graphics, and educational research purposes.
