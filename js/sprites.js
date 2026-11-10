(function (global) {
  'use strict';

  const BC = (global.BattleCity = global.BattleCity || {});

  function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  // Render a 16x16 or NxN character grid ('0'=transparent, '1'=dark, '2'=mid, '3'=light, '4'=extra)
  function renderBitmap(rows, colors, rotateDir = 0) {
    const h = rows.length;
    const w = rows[0].length;
    const c = createCanvas(w, h);
    const ctx = c.getContext('2d');

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === '.' || ch === '0' || ch === ' ') continue;
        const idx = parseInt(ch, 10) - 1;
        const col = colors[idx];
        if (!col) continue;

        let dx = x;
        let dy = y;
        if (rotateDir === 1) { // RIGHT (90 deg CW)
          dx = h - 1 - y;
          dy = x;
        } else if (rotateDir === 2) { // DOWN (180 deg)
          dx = w - 1 - x;
          dy = h - 1 - y;
        } else if (rotateDir === 3) { // LEFT (270 deg CW)
          dx = y;
          dy = w - 1 - x;
        }
        ctx.fillStyle = col;
        ctx.fillRect(dx, dy, 1, 1);
      }
    }
    return c;
  }

  // Apply alternating tread teeth pattern on columns 1..3 and 12..14 for frame 0 vs frame 1
  function applyTreads(baseRows, frame, treadColorTop = '2', treadColorDark = '1') {
    return baseRows.map((row, y) => {
      let arr = row.split('');
      for (let x = 0; x < arr.length; x++) {
        if (arr[x] === 'T') {
          arr[x] = ((y + frame) % 2 === 0) ? treadColorTop : treadColorDark;
        }
      }
      return arr.join('');
    });
  }

  // 16x16 Pixel Art Definitions (facing UP, 'T' = animated tread teeth)
  const TANK_DESIGNS = {
    // Player Tier 0: Compact classic starter tank
    P0: [
      '.......3........',
      '.......3........',
      '.TTT...3...TTT..',
      '.TTT..323..TTT..',
      '.TTT.32223.TTT..',
      '.TTT.22322.TTT..',
      '.TTT2233322TTT..',
      '.TTT2232322TTT..',
      '.TTT2233322TTT..',
      '.TTT2122212TTT..',
      '.TTT1122211TTT..',
      '.TTT1111111TTT..',
      '.TTT1112111TTT..',
      '.TTT.......TTT..',
      '................',
      '................',
    ],
    // Player Tier 1: Longer high-velocity barrel + sleek hull
    P1: [
      '.......3........',
      '......333.......',
      '.TTT...3...TTT..',
      '.TTT..323..TTT..',
      '.TTT.32223.TTT..',
      '.TTT2233322TTT..',
      '.TTT2232322TTT..',
      '.TTT2233322TTT..',
      '.TTT2132312TTT..',
      '.TTT2122212TTT..',
      '.TTT1123211TTT..',
      '.TTT1122211TTT..',
      '.TTT1111111TTT..',
      '.TTT.......TTT..',
      '................',
      '................',
    ],
    // Player Tier 2: Dual-shot reinforced chassis & wider turret
    P2: [
      '......3.3.......',
      '.......3........',
      '.TTT..333..TTT..',
      '.TTT.32223.TTT..',
      '.TTT3233323TTT..',
      '.TTT2232322TTT..',
      '.TTT2233322TTT..',
      '.TTT2133312TTT..',
      '.TTT2123212TTT..',
      '.TTT1122211TTT..',
      '.TTT1223221TTT..',
      '.TTT1122211TTT..',
      '.TTT1111111TTT..',
      '.TTT..111..TTT..',
      '................',
      '................',
    ],
    // Player Tier 3: Heavy Steel-Breaker Tank!
    P3: [
      '......333.......',
      '......323.......',
      '.TTT..333..TTT..',
      '.TTT3322233TTT..',
      '.TTT3233323TTT..',
      '.TTT2232322TTT..',
      '.TTT2233322TTT..',
      '.TTT2133312TTT..',
      '.TTT2123212TTT..',
      '.TTT1223221TTT..',
      '.TTT1233321TTT..',
      '.TTT1122211TTT..',
      '.TTT1111111TTT..',
      '.TTT11.1.11TTT..',
      '................',
      '................',
    ],

    // Enemy 0: Basic Tank
    E0: [
      '.......3........',
      '.......3........',
      '..TT...3...TT...',
      '..TT..323..TT...',
      '..TT.22322.TT...',
      '..TT2233322TT...',
      '..TT2232322TT...',
      '..TT2133312TT...',
      '..TT2122212TT...',
      '..TT1122211TT...',
      '..TT1121211TT...',
      '..TT1111111TT...',
      '..TT.......TT...',
      '................',
      '................',
      '................',
    ],
    // Enemy 1: Fast Armored Scout Car
    E1: [
      '.......3........',
      '.......3........',
      '.TT...323...TT..',
      '.TT..32223..TT..',
      '.TT..22322..TT..',
      '.TT.2233322.TT..',
      '.TT.2232322.TT..',
      '..T.2133312.T...',
      '.TT.2122212.TT..',
      '.TT.1122211.TT..',
      '.TT..12221..TT..',
      '.TT..11111..TT..',
      '.TT.........TT..',
      '................',
      '................',
      '................',
    ],
    // Enemy 2: Power / Rapid-Fire Tank
    E2: [
      '......3.3.......',
      '.......3........',
      '.TTT..333..TTT..',
      '.TTT..323..TTT..',
      '.TTT.22322.TTT..',
      '.TTT2233322TTT..',
      '.TTT2232322TTT..',
      '.TTT2133312TTT..',
      '.TTT2123212TTT..',
      '.TTT1122211TTT..',
      '.TTT1112111TTT..',
      '.TTT1111111TTT..',
      '.TTT.......TTT..',
      '................',
      '................',
      '................',
    ],
    // Enemy 3: Heavy Armor Tank (4 HP)
    E3: [
      '......333.......',
      '.......3........',
      '.TTT..333..TTT..',
      '.TTT3322233TTT..',
      '.TTT3233323TTT..',
      '.TTT2232322TTT..',
      '.TTT2233322TTT..',
      '.TTT2133312TTT..',
      '.TTT2123212TTT..',
      '.TTT1123211TTT..',
      '.TTT1222221TTT..',
      '.TTT1122211TTT..',
      '.TTT1111111TTT..',
      '.TTT1111111TTT..',
      '................',
      '................',
    ],
  };

  // Make tank 16x16 rows consistently 16 chars wide
  function normalizeDesign(rows) {
    return rows.map((r) => (r + '................').slice(0, 16));
  }

  const tankCache = new Map();

  BC.getTankSprite = function (designKey, palette, dir, frame) {
    const key = designKey + '|' + palette.join(',') + '|' + dir + '|' + frame;
    let cached = tankCache.get(key);
    if (cached) return cached;

    const base = normalizeDesign(TANK_DESIGNS[designKey]);
    const withTreads = applyTreads(base, frame & 1, '3', '1');
    cached = renderBitmap(withTreads, palette, dir);
    tankCache.set(key, cached);
    return cached;
  };

  // Terrain Sprites
  const tileCache = {};

  function buildTerrainSprites() {
    const C = BC.COLORS;

    // Brick 4x4 micro-quadrant variations or full 8x8 brick offscreen
    // Each 8x8 brick sub-tile is drawn by checking 4x4 mask (TL=1, TR=2, BL=4, BR=8)
    const brickFull = createCanvas(8, 8);
    const bg = brickFull.getContext('2d');
    bg.fillStyle = C.BRICK_MORTAR;
    bg.fillRect(0, 0, 8, 8);
    // Row 0..3 (mortar at y=3)
    bg.fillStyle = C.BRICK_LIGHT;
    bg.fillRect(0, 0, 3, 1);
    bg.fillRect(4, 0, 4, 1);
    bg.fillStyle = C.BRICK_MID;
    bg.fillRect(0, 1, 3, 2);
    bg.fillRect(4, 1, 4, 2);
    // Dark seam
    bg.fillStyle = C.BRICK_DARK;
    bg.fillRect(2, 1, 1, 2);
    bg.fillRect(7, 1, 1, 2);
    // Row 4..7 (staggered brick, mortar at y=7)
    bg.fillStyle = C.BRICK_LIGHT;
    bg.fillRect(0, 4, 1, 1);
    bg.fillRect(2, 4, 4, 1);
    bg.fillRect(7, 4, 1, 1);
    bg.fillStyle = C.BRICK_MID;
    bg.fillRect(0, 5, 1, 2);
    bg.fillRect(2, 5, 4, 2);
    bg.fillRect(7, 5, 1, 2);
    bg.fillStyle = C.BRICK_DARK;
    bg.fillRect(0, 5, 1, 2);
    bg.fillRect(5, 5, 1, 2);
    tileCache.brickFull = brickFull;

    // Steel 8x8
    const steel = createCanvas(8, 8);
    const sg = steel.getContext('2d');
    sg.fillStyle = C.STEEL_MID;
    sg.fillRect(0, 0, 8, 8);
    sg.fillStyle = C.STEEL_LIGHT;
    sg.fillRect(0, 0, 8, 1);
    sg.fillRect(0, 0, 1, 8);
    sg.fillStyle = C.STEEL_DARK;
    sg.fillRect(0, 7, 8, 1);
    sg.fillRect(7, 0, 1, 8);
    sg.fillStyle = C.STEEL_LIGHT;
    sg.fillRect(2, 2, 4, 4);
    sg.fillStyle = C.STEEL_MID;
    sg.fillRect(3, 3, 2, 2);
    tileCache.steel = steel;

    // Forest 8x8 (transparent black voids so tanks peek slightly through leaf gaps!)
    const forest = createCanvas(8, 8);
    const fg = forest.getContext('2d');
    const forestMap = [
      '.12321..',
      '1233221.',
      '23221232',
      '121.2332',
      '.2321221',
      '1332212.',
      '221.1232',
      '.1...121',
    ];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const ch = forestMap[y][x];
        if (ch === '.') continue;
        fg.fillStyle = ch === '1' ? C.FOREST_DARK : ch === '2' ? C.FOREST_MID : C.FOREST_LIGHT;
        fg.fillRect(x, y, 1, 1);
      }
    }
    tileCache.forest = forest;

    // Water 8x8 (2 frames)
    tileCache.water = [0, 1].map((frame) => {
      const w = createCanvas(8, 8);
      const wg = w.getContext('2d');
      wg.fillStyle = C.WATER_DARK;
      wg.fillRect(0, 0, 8, 8);
      const shift = frame * 3;
      wg.fillStyle = C.WATER_MID;
      wg.fillRect((1 + shift) % 8, 1, 3, 1);
      wg.fillRect((5 + shift) % 8, 4, 3, 1);
      wg.fillRect((2 + shift) % 8, 6, 3, 1);
      wg.fillStyle = C.WATER_LIGHT;
      wg.fillRect((2 + shift) % 8, 1, 1, 1);
      wg.fillRect((6 + shift) % 8, 4, 1, 1);
      wg.fillRect((3 + shift) % 8, 6, 1, 1);
      return w;
    });

    // Ice 8x8
    const ice = createCanvas(8, 8);
    const ig = ice.getContext('2d');
    ig.fillStyle = C.ICE_MID;
    ig.fillRect(0, 0, 8, 8);
    ig.fillStyle = C.ICE_LIGHT;
    ig.fillRect(0, 0, 8, 1);
    ig.fillRect(0, 0, 1, 8);
    for (let i = 0; i < 8; i++) {
      ig.fillRect(i, (7 - i), 1, 1);
      if (i < 5) ig.fillRect(i, (4 - i), 1, 1);
    }
    ig.fillStyle = C.ICE_DARK;
    ig.fillRect(0, 7, 8, 1);
    ig.fillRect(7, 0, 1, 8);
    tileCache.ice = ice;

    // Eagle Base 16x16 (Alive)
    const eagleAlive = [
      '......333.......',
      '.....33233......',
      '...11.333.11....',
      '..12213231221...',
      '.1233223223321..',
      '123322333223321.',
      '123212313212321.',
      '1221.23332.1221.',
      '121..12321..121.',
      '.1...12221...1..',
      '.....12321......',
      '....1122211.....',
      '...122111221....',
      '...11..1..11....',
      '................',
      '................',
    ];
    tileCache.eagleAlive = renderBitmap(eagleAlive, ['#7C7C7C', '#FC9838', '#FCFCFC'], 0);

    // Eagle Base 16x16 (Destroyed)
    const eagleDead = [
      '................',
      '................',
      '....1.....1.....',
      '...121...12.....',
      '....1.1.1.......',
      '..1..111..1.....',
      '...1221221......',
      '.1.1211121.1....',
      '..112111211.....',
      '..121111121.....',
      '.11212121211....',
      '.12111211121....',
      '1112111112111...',
      '.11111111111....',
      '................',
      '................',
    ];
    tileCache.eagleDead = renderBitmap(eagleDead, ['#505050', '#A8A8A8', '#FCFCFC'], 0);

    // Bullet 4x4 (0..3 directions)
    const bulletUp = [
      '.33.',
      '3223',
      '3223',
      '.11.',
    ];
    tileCache.bullets = [0, 1, 2, 3].map((d) =>
      renderBitmap(bulletUp, ['#808080', '#D8D8D8', '#FCFCFC'], d)
    );

    // Spawn Star 16x16 (4 frames)
    const spawnFrames = [
      [
        '................',
        '................',
        '................',
        '................',
        '................',
        '.......3........',
        '......323.......',
        '.....32323......',
        '......323.......',
        '.......3........',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
      ],
      [
        '................',
        '................',
        '.......3........',
        '.......3........',
        '......323.......',
        '....3.232.3.....',
        '...322333223....',
        '..33333333333...',
        '...322333223....',
        '....3.232.3.....',
        '......323.......',
        '.......3........',
        '.......3........',
        '................',
        '................',
        '................',
      ],
      [
        '.......3........',
        '.......3........',
        '......323.......',
        '......232.......',
        '....3.232.3.....',
        '...323333323....',
        '..32333333323...',
        '333333333333333.',
        '..32333333323...',
        '...323333323....',
        '....3.232.3.....',
        '......232.......',
        '......323.......',
        '.......3........',
        '.......3........',
        '................',
      ],
      [
        '................',
        '.......3........',
        '......323.......',
        '....2.232.2.....',
        '...322333223....',
        '....2333332.....',
        '..32333333323...',
        '.3333333333333..',
        '..32333333323...',
        '....2333332.....',
        '...322333223....',
        '....2.232.2.....',
        '......323.......',
        '.......3........',
        '................',
        '................',
      ],
    ];
    tileCache.spawnStars = spawnFrames.map((f) =>
      renderBitmap(f, ['#707070', '#BCBCBC', '#FCFCFC'], 0)
    );

    // Shield 16x16 (2 alternating shimmer frames)
    tileCache.shield = [0, 1].map((f) => {
      const c = createCanvas(16, 16);
      const g = c.getContext('2d');
      g.fillStyle = '#FCFCFC';
      for (let i = 0; i < 16; i++) {
        if ((i + f) % 2 === 0) {
          g.fillRect(i, 0, 1, 1);
          g.fillRect(i, 15, 1, 1);
          g.fillRect(0, i, 1, 1);
          g.fillRect(15, i, 1, 1);
        }
      }
      g.fillStyle = '#A8A8A8';
      if (f === 0) {
        g.fillRect(1, 1, 2, 1); g.fillRect(13, 1, 2, 1);
        g.fillRect(1, 14, 2, 1); g.fillRect(13, 14, 2, 1);
      } else {
        g.fillRect(1, 2, 1, 2); g.fillRect(14, 2, 1, 2);
        g.fillRect(1, 12, 1, 2); g.fillRect(14, 12, 1, 2);
      }
      return c;
    });

    // Power-Up Icons (16x16)
    const powerupArt = {
      [BC.POWERUP.HELMET]: [
        '.....333333.....',
        '...3322222233...',
        '..322222222223..',
        '..322233332223..',
        '.32223222232223.',
        '.32222222222223.',
        '.31111111111113.',
        '..111111111111..',
        '..112222222211..',
        '...1111111111...',
      ],
      [BC.POWERUP.CLOCK]: [
        '.....33333......',
        '.......2........',
        '...333333333....',
        '..32222322223...',
        '.3222223222223..',
        '.3222223332223..',
        '.3222222222223..',
        '..32222222223...',
        '...333333333....',
        '................',
      ],
      [BC.POWERUP.SHOVEL]: [
        '.......3333.....',
        '......322233....',
        '.....3222223....',
        '.....322223.....',
        '......3113......',
        '......111.......',
        '.....111........',
        '....111.........',
        '...331..........',
        '..333...........',
      ],
      [BC.POWERUP.STAR]: [
        '.......3........',
        '......323.......',
        '......323.......',
        '.3333322233333..',
        '..32222222223...',
        '...322222223....',
        '....3222223.....',
        '...3223.3223....',
        '..323.....323...',
        '..3.........3...',
      ],
      [BC.POWERUP.GRENADE]: [
        '......3333......',
        '.......22.......',
        '....3333333.....',
        '...322121223....',
        '..32121212123...',
        '..32212121223...',
        '..32121212123...',
        '...322121223....',
        '....3333333.....',
        '................',
      ],
      [BC.POWERUP.TANK]: [
        '.......3........',
        '...33..3..33....',
        '...33.323.33....',
        '...332232233....',
        '...332333233....',
        '...332232233....',
        '...331222133....',
        '...331111133....',
        '...33.....33....',
        '................',
      ],
    };

    tileCache.powerups = {};
    for (const [ptype, art] of Object.entries(powerupArt)) {
      const badge = createCanvas(16, 16);
      const pg = badge.getContext('2d');
      // Outer metallic 3D beveled badge frame
      pg.fillStyle = '#FCFCFC';
      pg.fillRect(0, 0, 16, 16);
      pg.fillStyle = '#585858';
      pg.fillRect(1, 1, 15, 15);
      pg.fillStyle = '#2038EC';
      pg.fillRect(1, 1, 14, 14);
      pg.fillStyle = '#000000';
      pg.fillRect(2, 2, 12, 12);

      // Inner icon centered at (0, 3)
      const iconColors =
        Number(ptype) === BC.POWERUP.STAR || Number(ptype) === BC.POWERUP.TANK
          ? ['#945800', '#E49818', '#F8E470']
          : ['#585858', '#ADADAD', '#FCFCFC'];
      const iconCanvas = renderBitmap(
        art.map((r) => (r + '................').slice(0, 16)),
        iconColors,
        0
      );
      pg.drawImage(iconCanvas, 0, 3);
      tileCache.powerups[ptype] = badge;
    }

    // HUD Enemy remaining icon (8x8)
    const hudEnemy = [
      '.11..11.',
      '.121121.',
      '.122221.',
      '.112211.',
      '.122221.',
      '.11..11.',
      '........',
      '........',
    ];
    tileCache.hudEnemy = renderBitmap(hudEnemy, ['#000000', '#E05000', '#FC9838'], 0);

    // HUD Player Life icon (8x8)
    const hudLife = [
      '...2....',
      '.2.2.2..',
      '.22222..',
      '.23232..',
      '.22222..',
      '.2...2..',
      '........',
      '........',
    ];
    tileCache.hudLife = renderBitmap(hudLife, ['#8C5800', '#E49818', '#F8E470'], 0);

    // HUD Stage Flag (16x16)
    const flag = [
      '..1.............',
      '..122222222222..',
      '..123333333332..',
      '..12333222332...',
      '..123322222.....',
      '..123322........',
      '..1222..........',
      '..1.............',
      '..1.............',
      '..1.............',
      '..1.............',
      '..1.............',
      '..1.............',
      '.111............',
      '11111...........',
      '................',
    ];
    tileCache.flag = renderBitmap(flag, ['#000000', '#D82800', '#FC9838'], 0);
  }

  buildTerrainSprites();

  BC.SPRITES = tileCache;

  // Draw an 8x8 brick tile with 4-bit quadrant mask (TL=1, TR=2, BL=4, BR=8)
  BC.drawBrickSubtile = function (ctx, px, py, mask) {
    if (mask === 0) return;
    if (mask === 0x0f) {
      ctx.drawImage(tileCache.brickFull, px, py);
      return;
    }
    if (mask & 1) ctx.drawImage(tileCache.brickFull, 0, 0, 4, 4, px, py, 4, 4);
    if (mask & 2) ctx.drawImage(tileCache.brickFull, 4, 0, 4, 4, px + 4, py, 4, 4);
    if (mask & 4) ctx.drawImage(tileCache.brickFull, 0, 4, 4, 4, px, py + 4, 4, 4);
    if (mask & 8) ctx.drawImage(tileCache.brickFull, 4, 4, 4, 4, px + 4, py + 4, 4, 4);
  };

  // Draw classic NES explosion bursts directly onto canvas
  BC.drawExplosion = function (ctx, cx, cy, frame, isBig) {
    const x = Math.round(cx);
    const y = Math.round(cy);

    if (!isBig) {
      // Small bullet impact explosion (3 frames: 0..2)
      const radii = [4, 7, 5];
      const r = radii[Math.min(2, frame)];
      ctx.fillStyle = frame === 0 ? '#FCFCFC' : '#FC9838';
      ctx.fillRect(x - r, y - 2, r * 2, 4);
      ctx.fillRect(x - 2, y - r, 4, r * 2);
      ctx.fillStyle = '#D82800';
      ctx.fillRect(x - Math.floor(r * 0.7), y - Math.floor(r * 0.7), Math.floor(r * 1.4), Math.floor(r * 1.4));
      if (frame < 2) {
        ctx.fillStyle = '#FCFCFC';
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
      return;
    }

    // Big tank/base explosion (5 frames: 0..4, up to ~32x32)
    const sizes = [6, 11, 15, 16, 12];
    const r = sizes[Math.min(4, frame)];
    if (frame <= 2) {
      ctx.fillStyle = '#D82800';
      ctx.fillRect(x - r, y - Math.floor(r * 0.6), r * 2, Math.floor(r * 1.2));
      ctx.fillRect(x - Math.floor(r * 0.6), y - r, Math.floor(r * 1.2), r * 2);
      ctx.fillStyle = '#FC9838';
      const r2 = Math.floor(r * 0.75);
      ctx.fillRect(x - r2, y - r2, r2 * 2, r2 * 2);
      ctx.fillStyle = '#FCE4A0';
      const r3 = Math.floor(r * 0.4);
      ctx.fillRect(x - r3, y - r3, r3 * 2, r3 * 2);
      ctx.fillStyle = '#FCFCFC';
      ctx.fillRect(x - 3, y - 3, 6, 6);
    } else {
      // Shrapnel outer ring dissipating
      ctx.fillStyle = frame === 3 ? '#FC9838' : '#D82800';
      const d = r - 2;
      ctx.fillRect(x - d, y - d, 4, 4);
      ctx.fillRect(x + d - 4, y - d, 4, 4);
      ctx.fillRect(x - d, y + d - 4, 4, 4);
      ctx.fillRect(x + d - 4, y + d - 4, 4, 4);
      ctx.fillRect(x - 2, y - r, 4, 5);
      ctx.fillRect(x - 2, y + r - 5, 4, 5);
      ctx.fillRect(x - r, y - 2, 5, 4);
      ctx.fillRect(x + r - 5, y - 2, 5, 4);
      if (frame === 3) {
        ctx.fillStyle = '#FCE4A0';
        ctx.fillRect(x - 4, y - 4, 8, 8);
      }
    }
  };
})(window);
