(function (global) {
  'use strict';

  const BC = (global.BattleCity = global.BattleCity || {});

  function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  // =========================================================================
  // PALETTE RESOLUTION (Accepts key string like 'P1' or raw palette array)
  // =========================================================================
  function resolvePalette(paletteOrKey, skin) {
    if (Array.isArray(paletteOrKey)) return paletteOrKey;
    const theme = BC.THEMES[skin || BC.getSkin()];
    return (theme && theme[paletteOrKey]) || (theme && theme.ENEMY_BASIC) || ['#5C5C5C', '#A8A8A8', '#F4F4F4'];
  }

  // =========================================================================
  // 1. CLASSIC 1985 FC PIXEL-ART SPRITES
  // =========================================================================
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
        if (rotateDir === 1) {
          dx = h - 1 - y;
          dy = x;
        } else if (rotateDir === 2) {
          dx = w - 1 - x;
          dy = h - 1 - y;
        } else if (rotateDir === 3) {
          dx = y;
          dy = w - 1 - x;
        }
        ctx.fillStyle = col;
        ctx.fillRect(dx, dy, 1, 1);
      }
    }
    return c;
  }

  function applyTreads(baseRows, frame, treadColorTop = '2', treadColorDark = '1') {
    return baseRows.map((row, y) => {
      const arr = row.split('');
      for (let x = 0; x < arr.length; x++) {
        if (arr[x] === 'T') {
          arr[x] = ((y + frame) % 2 === 0) ? treadColorTop : treadColorDark;
        }
      }
      return arr.join('');
    });
  }

  const TANK_DESIGNS = {
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

  function normalizeDesign(rows) {
    return rows.map((r) => (r + '................').slice(0, 16));
  }

  function buildClassicSprites() {
    const C = BC.THEMES.classic;
    const cache = {};

    const brickFull = createCanvas(8, 8);
    const bg = brickFull.getContext('2d');
    bg.fillStyle = C.BRICK_MORTAR;
    bg.fillRect(0, 0, 8, 8);
    bg.fillStyle = C.BRICK_LIGHT;
    bg.fillRect(0, 0, 3, 1); bg.fillRect(4, 0, 4, 1);
    bg.fillStyle = C.BRICK_MID;
    bg.fillRect(0, 1, 3, 2); bg.fillRect(4, 1, 4, 2);
    bg.fillStyle = C.BRICK_DARK;
    bg.fillRect(2, 1, 1, 2); bg.fillRect(7, 1, 1, 2);
    bg.fillStyle = C.BRICK_LIGHT;
    bg.fillRect(0, 4, 1, 1); bg.fillRect(2, 4, 4, 1); bg.fillRect(7, 4, 1, 1);
    bg.fillStyle = C.BRICK_MID;
    bg.fillRect(0, 5, 1, 2); bg.fillRect(2, 5, 4, 2); bg.fillRect(7, 5, 1, 2);
    bg.fillStyle = C.BRICK_DARK;
    bg.fillRect(0, 5, 1, 2); bg.fillRect(5, 5, 1, 2);
    cache.brickFull = brickFull;

    const steel = createCanvas(8, 8);
    const sg = steel.getContext('2d');
    sg.fillStyle = C.STEEL_MID; sg.fillRect(0, 0, 8, 8);
    sg.fillStyle = C.STEEL_LIGHT; sg.fillRect(0, 0, 8, 1); sg.fillRect(0, 0, 1, 8);
    sg.fillStyle = C.STEEL_DARK; sg.fillRect(0, 7, 8, 1); sg.fillRect(7, 0, 1, 8);
    sg.fillStyle = C.STEEL_LIGHT; sg.fillRect(2, 2, 4, 4);
    sg.fillStyle = C.STEEL_MID; sg.fillRect(3, 3, 2, 2);
    cache.steel = steel;

    const forest = createCanvas(8, 8);
    const fg = forest.getContext('2d');
    const forestMap = [
      '.12321..', '1233221.', '23221232', '121.2332',
      '.2321221', '1332212.', '221.1232', '.1...121',
    ];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const ch = forestMap[y][x];
        if (ch === '.') continue;
        fg.fillStyle = ch === '1' ? C.FOREST_DARK : ch === '2' ? C.FOREST_MID : C.FOREST_LIGHT;
        fg.fillRect(x, y, 1, 1);
      }
    }
    cache.forest = forest;

    cache.water = [0, 1].map((frame) => {
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

    const ice = createCanvas(8, 8);
    const ig = ice.getContext('2d');
    ig.fillStyle = C.ICE_MID; ig.fillRect(0, 0, 8, 8);
    ig.fillStyle = C.ICE_LIGHT; ig.fillRect(0, 0, 8, 1); ig.fillRect(0, 0, 1, 8);
    for (let i = 0; i < 8; i++) {
      ig.fillRect(i, 7 - i, 1, 1);
      if (i < 5) ig.fillRect(i, 4 - i, 1, 1);
    }
    ig.fillStyle = C.ICE_DARK; ig.fillRect(0, 7, 8, 1); ig.fillRect(7, 0, 1, 8);
    cache.ice = ice;

    const eagleAlive = [
      '......333.......', '.....33233......', '...11.333.11....', '..12213231221...',
      '.1233223223321..', '123322333223321.', '123212313212321.', '1221.23332.1221.',
      '121..12321..121.', '.1...12221...1..', '.....12321......', '....1122211.....',
      '...122111221....', '...11..1..11....', '................', '................',
    ];
    cache.eagleAlive = renderBitmap(eagleAlive, ['#7C7C7C', '#FC9838', '#FCFCFC'], 0);

    const eagleDead = [
      '................', '................', '....1.....1.....', '...121...12.....',
      '....1.1.1.......', '..1..111..1.....', '...1221221......', '.1.1211121.1....',
      '..112111211.....', '..121111121.....', '.11212121211....', '.12111211121....',
      '1112111112111...', '.11111111111....', '................', '................',
    ];
    cache.eagleDead = renderBitmap(eagleDead, ['#505050', '#A8A8A8', '#FCFCFC'], 0);

    const bulletUp = ['.33.', '3223', '3223', '.11.'];
    cache.bullets = [0, 1, 2, 3].map((d) => renderBitmap(bulletUp, ['#808080', '#D8D8D8', '#FCFCFC'], d));

    // Authentic 1985 FC 16x16 3-frame bullet impact starburst (EXPL_SMALL -> EXPL_MEDIUM -> EXPL_LARGE)
    // Colors: '1'=#D82800 (crimson), '2'=#FC9838 (orange), '3'=#FCFCFC (white hot core)
    const bulletExpFrames = [
      [
        '................',
        '................',
        '................',
        '......2..2......',
        '....2..33..2....',
        '.....233332.....',
        '...2333333332...',
        '....33333333....',
        '....33333333....',
        '...2333333332...',
        '.....233332.....',
        '....2..33..2....',
        '......2..2......',
        '................',
        '................',
        '................',
      ],
      [
        '.......11.......',
        '....1..22..1....',
        '..1..223322..1..',
        '...1223333221...',
        '.1.2333223332.1.',
        '..233221122332..',
        '.12321.33.12321.',
        '12332.3333.23321',
        '12332.3333.23321',
        '.12321.33.12321.',
        '..233221122332..',
        '.1.2333223332.1.',
        '...1223333221...',
        '..1..223322..1..',
        '....1..22..1....',
        '.......11.......',
      ],
      [
        '..1....11....1..',
        '....1.2..2.1....',
        '.1..22....22..1.',
        '..12..1..1..21..',
        '1.2..1....1..2.1',
        '..2.1......1.2..',
        '12............21',
        '12............21',
        '12............21',
        '12............21',
        '..2.1......1.2..',
        '1.2..1....1..2.1',
        '..12..1..1..21..',
        '.1..22....22..1.',
        '....1.2..2.1....',
        '..1....11....1..',
      ],
    ];
    cache.bulletExp = bulletExpFrames.map((f) => renderBitmap(f, ['#D82800', '#FC9838', '#FCFCFC'], 0));

    const spawnFrames = [
      [
        '................','................','................','................',
        '................','.......3........','......323.......','.....32323......',
        '......323.......','.......3........','................','................',
        '................','................','................','................',
      ],
      [
        '................','................','.......3........','.......3........',
        '......323.......','....3.232.3.....','...322333223....','..33333333333...',
        '...322333223....','....3.232.3.....','......323.......','.......3........',
        '.......3........','................','................','................',
      ],
      [
        '.......3........','.......3........','......323.......','......232.......',
        '....3.232.3.....','...323333323....','..32333333323...','333333333333333.',
        '..32333333323...','...323333323....','....3.232.3.....','......232.......',
        '......323.......','.......3........','.......3........','................',
      ],
      [
        '................','.......3........','......323.......','....2.232.2.....',
        '...322333223....','....2333332.....','..32333333323...','.3333333333333..',
        '..32333333323...','....2333332.....','...322333223....','....2.232.2.....',
        '......323.......','.......3........','................','................',
      ],
    ];
    cache.spawnStars = spawnFrames.map((f) => renderBitmap(f, ['#707070', '#BCBCBC', '#FCFCFC'], 0));

    cache.shield = [0, 1].map((f) => {
      const c = createCanvas(16, 16);
      const g = c.getContext('2d');
      g.fillStyle = '#FCFCFC';
      for (let i = 0; i < 16; i++) {
        if ((i + f) % 2 === 0) {
          g.fillRect(i, 0, 1, 1); g.fillRect(i, 15, 1, 1);
          g.fillRect(0, i, 1, 1); g.fillRect(15, i, 1, 1);
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

    const powerupArt = {
      [BC.POWERUP.HELMET]: [
        '.....333333.....', '...3322222233...', '..322222222223..', '..322233332223..',
        '.32223222232223.', '.32222222222223.', '.31111111111113.', '..111111111111..',
        '..112222222211..', '...1111111111...',
      ],
      [BC.POWERUP.CLOCK]: [
        '.....33333......', '.......2........', '...333333333....', '..32222322223...',
        '.3222223222223..', '.3222223332223..', '.3222222222223..', '..32222222223...',
        '...333333333....', '................',
      ],
      [BC.POWERUP.SHOVEL]: [
        '.......3333.....', '......322233....', '.....3222223....', '.....322223.....',
        '......3113......', '......111.......', '.....111........', '....111.........',
        '...331..........', '..333...........',
      ],
      [BC.POWERUP.STAR]: [
        '.......3........', '......323.......', '......323.......', '.3333322233333..',
        '..32222222223...', '...322222223....', '....3222223.....', '...3223.3223....',
        '..323.....323...', '..3.........3...',
      ],
      [BC.POWERUP.GRENADE]: [
        '......3333......', '.......22.......', '....3333333.....', '...322121223....',
        '..32121212123...', '..32212121223...', '..32121212123...', '...322121223....',
        '....3333333.....', '................',
      ],
      [BC.POWERUP.TANK]: [
        '.......3........', '...33..3..33....', '...33.323.33....', '...332232233....',
        '...332333233....', '...332232233....', '...331222133....', '...331111133....',
        '...33.....33....', '................',
      ],
    };

    cache.powerups = {};
    for (const [ptype, art] of Object.entries(powerupArt)) {
      const badge = createCanvas(16, 16);
      const pg = badge.getContext('2d');
      pg.fillStyle = '#FCFCFC'; pg.fillRect(0, 0, 16, 16);
      pg.fillStyle = '#585858'; pg.fillRect(1, 1, 15, 15);
      pg.fillStyle = '#2038EC'; pg.fillRect(1, 1, 14, 14);
      pg.fillStyle = '#000000'; pg.fillRect(2, 2, 12, 12);
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
      cache.powerups[ptype] = badge;
    }

    const hudEnemy = [
      '.11..11.', '.121121.', '.122221.', '.112211.',
      '.122221.', '.11..11.', '........', '........',
    ];
    cache.hudEnemy = renderBitmap(hudEnemy, ['#000000', '#E05000', '#FC9838'], 0);

    const hudLife = [
      '...2....', '.2.2.2..', '.22222..', '.23232..',
      '.22222..', '.2...2..', '........', '........',
    ];
    cache.hudLife = renderBitmap(hudLife, ['#8C5800', '#E49818', '#F8E470'], 0);

    const flag = [
      '..1.............', '..122222222222..', '..123333333332..', '..12333222332...',
      '..123322222.....', '..123322........', '..1222..........', '..1.............',
      '..1.............', '..1.............', '..1.............', '..1.............',
      '..1.............', '.111............', '11111...........', '................',
    ];
    cache.flag = renderBitmap(flag, ['#000000', '#D82800', '#FC9838'], 0);

    return cache;
  }

  // =========================================================================
  // 2. GENSHIN-INSPIRED HIGH-DEFINITION 2D CEL-SHADED ARTWORK
  //    (Supersampled 128x128 for 16x16 entities, 64x64 for 8x8 tiles)
  // =========================================================================
  function roundRectPath(g, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + rad, y);
    g.lineTo(x + w - rad, y);
    g.quadraticCurveTo(x + w, y, x + w, y + rad);
    g.lineTo(x + w, y + h - rad);
    g.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    g.lineTo(x + rad, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - rad);
    g.lineTo(x, y + rad);
    g.quadraticCurveTo(x, y, x + rad, y);
    g.closePath();
  }

  function drawFourPointStar(g, cx, cy, outerR, innerR) {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
  }

  function drawGenshinTankHD(designKey, pal, dir, frame) {
    const SZ = 128; // 8x supersampled over logical 16px -> razor-sharp 2x SSAA on 64px target!
    const c = createCanvas(SZ, SZ);
    const g = c.getContext('2d');
    if (typeof g.beginPath !== 'function') return c;

    const [cDark, cMid, cLight, cCoreRaw] = pal;
    const cCore = cCoreRaw || '#7AF0F8';
    const isPlayer = designKey.startsWith('P');
    const tierOrType = parseInt(designKey[1], 10) || 0;

    g.save();
    g.translate(SZ / 2, SZ / 2);
    g.rotate((dir * Math.PI) / 2);
    g.translate(-SZ / 2, -SZ / 2);

    // Subtle ground drop shadow
    g.fillStyle = 'rgba(8, 12, 22, 0.45)';
    roundRectPath(g, 14, 22, 100, 96, 16);
    g.fill();

    // 1. Articulated Treads (left & right)
    const treadW = designKey === 'E1' ? 18 : 22;
    const treadXLeft = designKey === 'E0' ? 16 : 10;
    const treadXRight = SZ - treadXLeft - treadW;
    const treadY = 18;
    const treadH = 96;

    for (const tx of [treadXLeft, treadXRight]) {
      // Tread dark metal base
      g.fillStyle = '#252B3B';
      roundRectPath(g, tx, treadY, treadW, treadH, 8);
      g.fill();

      // Animated cel-shaded tread pads
      const shift = (frame & 1) * 8;
      for (let py = treadY + 4 + shift; py < treadY + treadH - 6; py += 16) {
        g.fillStyle = cDark;
        roundRectPath(g, tx + 2, py, treadW - 4, 8, 3);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.fillRect(tx + 4, py + 1, treadW - 8, 2);
      }

      // Gold/steel trim edge for player / heavy armor
      g.lineWidth = 4;
      g.strokeStyle = '#151822';
      roundRectPath(g, tx, treadY, treadW, treadH, 8);
      g.stroke();

      if (isPlayer || tierOrType >= 2) {
        g.fillStyle = isPlayer ? '#D3BC8E' : cMid;
        g.fillRect(tx + (tx < 64 ? treadW - 4 : 0), treadY + 12, 4, treadH - 24);
      }
    }

    // 2. Main Hull (Cel-shaded anime mecha chassis)
    const hullX = treadXLeft + treadW - 4;
    const hullW = SZ - hullX * 2;
    const hullY = designKey === 'E1' ? 28 : 24;
    const hullH = designKey === 'E1' ? 84 : 88;

    const hullGrad = g.createLinearGradient(hullX, hullY, hullX + hullW, hullY + hullH);
    hullGrad.addColorStop(0, cLight);
    hullGrad.addColorStop(0.45, cMid);
    hullGrad.addColorStop(1, cDark);
    g.fillStyle = hullGrad;
    roundRectPath(g, hullX, hullY, hullW, hullH, 14);
    g.fill();

    // Cel highlight band on top-left shoulder
    g.fillStyle = 'rgba(255, 255, 255, 0.28)';
    roundRectPath(g, hullX + 6, hullY + 6, hullW - 18, 20, 8);
    g.fill();

    // Shoulder wing / armor plates on higher tiers
    if ((isPlayer && tierOrType >= 2) || (!isPlayer && tierOrType === 3)) {
      g.fillStyle = isPlayer ? '#F5E2AC' : cLight;
      roundRectPath(g, hullX - 4, hullY + 26, 12, 40, 4);
      g.fill();
      roundRectPath(g, hullX + hullW - 8, hullY + 26, 12, 40, 4);
      g.fill();
    }

    // Clean dark anime hull ink outline
    g.lineWidth = 4.5;
    g.strokeStyle = '#151822';
    roundRectPath(g, hullX, hullY, hullW, hullH, 14);
    g.stroke();

    // Decorative Ruin/Favonius chevron trim on rear deck
    g.strokeStyle = isPlayer ? '#FFF4CE' : 'rgba(255,255,255,0.35)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(46, hullY + hullH - 18);
    g.lineTo(64, hullY + hullH - 10);
    g.lineTo(82, hullY + hullH - 18);
    g.stroke();

    // 3. Cannon Barrel (distinct by tier / enemy archetype)
    const barrelW =
      (isPlayer && tierOrType === 3) || (!isPlayer && tierOrType === 3) ? 14 :
      (isPlayer && tierOrType >= 1) || (!isPlayer && tierOrType === 2) ? 11 : 9;
    const barrelTop = isPlayer && tierOrType >= 1 ? 2 : 6;
    const barrelLen = 58 - barrelTop;

    const bGrad = g.createLinearGradient(64 - barrelW / 2, 0, 64 + barrelW / 2, 0);
    bGrad.addColorStop(0, cLight);
    bGrad.addColorStop(0.55, cMid);
    bGrad.addColorStop(1, cDark);
    g.fillStyle = bGrad;
    roundRectPath(g, 64 - barrelW / 2, barrelTop, barrelW, barrelLen, 4);
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#151822';
    roundRectPath(g, 64 - barrelW / 2, barrelTop, barrelW, barrelLen, 4);
    g.stroke();

    // Muzzle brake / glowing elemental tip for upgraded & power tanks
    if ((isPlayer && tierOrType >= 1) || (!isPlayer && tierOrType >= 2)) {
      g.fillStyle = cCore;
      roundRectPath(g, 64 - barrelW * 0.72, barrelTop, barrelW * 1.44, 10, 4);
      g.fill();
      g.lineWidth = 3.5;
      g.strokeStyle = '#151822';
      roundRectPath(g, 64 - barrelW * 0.72, barrelTop, barrelW * 1.44, 10, 4);
      g.stroke();
    }

    // 4. Turret Dome (rounded cel-shaded dome with glowing elemental Vision core)
    const turR = designKey === 'E3' || (isPlayer && tierOrType === 3) ? 26 : 22;
    const turCY = 66;
    const turGrad = g.createRadialGradient(56, turCY - 8, 4, 64, turCY, turR);
    turGrad.addColorStop(0, '#FFFFFF');
    turGrad.addColorStop(0.25, cLight);
    turGrad.addColorStop(0.75, cMid);
    turGrad.addColorStop(1, cDark);

    g.fillStyle = turGrad;
    g.beginPath();
    g.arc(64, turCY, turR, 0, Math.PI * 2);
    g.fill();

    // Gold/metal ring around turret
    g.lineWidth = 4.5;
    g.strokeStyle = '#151822';
    g.beginPath();
    g.arc(64, turCY, turR, 0, Math.PI * 2);
    g.stroke();

    if (isPlayer && tierOrType >= 2) {
      g.lineWidth = 2.5;
      g.strokeStyle = '#FFF5D0';
      g.beginPath();
      g.arc(64, turCY, turR - 4, -Math.PI * 0.85, -Math.PI * 0.15);
      g.stroke();
    }

    // Glowing Elemental Vision Core Gem at center of turret
    const coreGrad = g.createRadialGradient(64, turCY - 2, 1, 64, turCY, 10);
    coreGrad.addColorStop(0, '#FFFFFF');
    coreGrad.addColorStop(0.45, cCore);
    coreGrad.addColorStop(1, cDark);
    g.fillStyle = coreGrad;
    drawFourPointStar(g, 64, turCY, isPlayer ? 10 : 9, 4.5);
    g.fill();
    g.lineWidth = 2.5;
    g.strokeStyle = '#151822';
    g.stroke();

    g.restore();
    return c;
  }

  function buildGenshinSprites() {
    const C = BC.THEMES.genshin;
    const cache = {};

    // Check if headless Node mock (no vector canvas APIs) -> fallback gracefully
    const probe = createCanvas(4, 4).getContext('2d');
    if (typeof probe.beginPath !== 'function' || typeof probe.createLinearGradient !== 'function') {
      return buildClassicSprites();
    }

    // 1. Brick 64x64 (Mondstadt / Liyue seamless warm stone masonry, 4 quadrants of 32x32)
    const brick = createCanvas(64, 64);
    const bg = brick.getContext('2d');
    bg.fillStyle = '#572C24';
    bg.fillRect(0, 0, 64, 64);
    const drawBrickBlock = (x, y, w, h) => {
      const gr = bg.createLinearGradient(x, y, x, y + h);
      gr.addColorStop(0, '#ED996B');
      gr.addColorStop(0.55, C.BRICK_MID);
      gr.addColorStop(1, '#8C432D');
      bg.fillStyle = gr;
      roundRectPath(bg, x + 0.8, y + 0.8, w - 1.6, h - 1.6, 3);
      bg.fill();
      bg.fillStyle = 'rgba(255, 240, 212, 0.34)';
      bg.fillRect(x + 2, y + 1.5, w - 4, 2.5);
      bg.lineWidth = 1.4;
      bg.strokeStyle = 'rgba(48, 22, 18, 0.72)';
      roundRectPath(bg, x + 0.8, y + 0.8, w - 1.6, h - 1.6, 3);
      bg.stroke();
    };
    drawBrickBlock(0, 0, 32, 16);
    drawBrickBlock(32, 0, 32, 16);
    drawBrickBlock(0, 16, 16, 16);
    drawBrickBlock(16, 16, 32, 16);
    drawBrickBlock(48, 16, 16, 16);
    drawBrickBlock(0, 32, 32, 16);
    drawBrickBlock(32, 32, 32, 16);
    drawBrickBlock(0, 48, 16, 16);
    drawBrickBlock(16, 48, 32, 16);
    drawBrickBlock(48, 48, 16, 16);
    cache.brickFull = brick;

    // 2. Steel 64x64 (Khaenri'ah / Ruin Guard Gold-Trimmed Slate Armor)
    const steel = createCanvas(64, 64);
    const sg = steel.getContext('2d');
    const stGrad = sg.createLinearGradient(0, 0, 64, 64);
    stGrad.addColorStop(0, '#8197B8');
    stGrad.addColorStop(0.5, C.STEEL_MID);
    stGrad.addColorStop(1, C.STEEL_DARK);
    sg.fillStyle = stGrad;
    roundRectPath(sg, 1, 1, 62, 62, 6);
    sg.fill();
    // Champagne gold chamfered inner border
    sg.lineWidth = 4;
    sg.strokeStyle = C.STEEL_LIGHT;
    roundRectPath(sg, 6, 6, 52, 52, 4);
    sg.stroke();
    // Diagonal anime metal specular slash
    sg.fillStyle = 'rgba(255, 255, 255, 0.25)';
    sg.beginPath();
    sg.moveTo(10, 10); sg.lineTo(34, 10); sg.lineTo(10, 34); sg.closePath(); sg.fill();
    // Center glowing cyan rune diamond
    sg.fillStyle = C.STEEL_CORE;
    drawFourPointStar(sg, 32, 32, 11, 5);
    sg.fill();
    sg.lineWidth = 3;
    sg.strokeStyle = '#182030';
    sg.stroke();
    // Outer ink frame
    sg.lineWidth = 3;
    sg.strokeStyle = '#141923';
    roundRectPath(sg, 1, 1, 62, 62, 6);
    sg.stroke();
    cache.steel = steel;

    // 3. Forest 64x64 (Seamless lush Teyvat emerald canopy)
    const forest = createCanvas(64, 64);
    const fg = forest.getContext('2d');
    const blobs = [
      // Seamless base canopy filling inner gaps cleanly while keeping soft rounded corners
      [32, 32, 28, C.FOREST_DARK],
      [0, 16, 22, C.FOREST_DARK], [64, 16, 22, C.FOREST_DARK],
      [0, 48, 22, C.FOREST_DARK], [64, 48, 22, C.FOREST_DARK],
      [16, 0, 22, C.FOREST_DARK], [48, 0, 22, C.FOREST_DARK],
      [16, 64, 22, C.FOREST_DARK], [48, 64, 22, C.FOREST_DARK],
      [20, 20, 24, C.FOREST_DARK], [44, 22, 24, C.FOREST_DARK],
      [22, 44, 24, C.FOREST_DARK], [46, 46, 23, C.FOREST_DARK],
      // Emerald mid-tone foliage clusters
      [16, 18, 18, C.FOREST_MID],  [46, 18, 18, C.FOREST_MID],
      [18, 46, 18, C.FOREST_MID],  [46, 46, 17, C.FOREST_MID],
      [32, 32, 18, C.FOREST_MID],
      // Sunlit lime leaf highlights
      [15, 13, 10, C.FOREST_LIGHT], [45, 14, 11, C.FOREST_LIGHT],
      [30, 28, 11, C.FOREST_LIGHT], [17, 42, 10, C.FOREST_LIGHT],
      [46, 42, 9, C.FOREST_LIGHT],
    ];
    for (const [bx, by, br, col] of blobs) {
      fg.fillStyle = col;
      fg.beginPath();
      fg.arc(bx, by, br, 0, Math.PI * 2);
      fg.fill();
    }
    fg.fillStyle = '#F2FFC4';
    drawFourPointStar(fg, 32, 24, 4.5, 1.5); fg.fill();
    drawFourPointStar(fg, 50, 48, 3.5, 1.2); fg.fill();
    cache.forest = forest;

    // 4. Water 64x64 (2 luminous Hydro frames)
    cache.water = [0, 1].map((frame) => {
      const w = createCanvas(64, 64);
      const wg = w.getContext('2d');
      const wGrad = wg.createLinearGradient(0, 0, 0, 64);
      wGrad.addColorStop(0, C.WATER_DARK);
      wGrad.addColorStop(0.5, '#2075C4');
      wGrad.addColorStop(1, C.WATER_DARK);
      wg.fillStyle = wGrad;
      wg.fillRect(0, 0, 64, 64);

      const off = frame * 16;
      wg.strokeStyle = C.WATER_MID;
      wg.lineWidth = 4;
      wg.lineCap = 'round';
      for (const wy of [16, 36, 54]) {
        wg.beginPath();
        wg.moveTo(-16 + off, wy);
        wg.quadraticCurveTo(0 + off, wy - 6, 16 + off, wy);
        wg.quadraticCurveTo(32 + off, wy + 6, 48 + off, wy);
        wg.quadraticCurveTo(64 + off, wy - 6, 80 + off, wy);
        wg.stroke();
      }
      wg.strokeStyle = C.WATER_LIGHT;
      wg.lineWidth = 2;
      wg.beginPath();
      wg.moveTo(6 + off * 0.5, 14);
      wg.quadraticCurveTo(18 + off * 0.5, 10, 30 + off * 0.5, 14);
      wg.moveTo(28 - off * 0.4, 44);
      wg.quadraticCurveTo(40 - off * 0.4, 40, 52 - off * 0.4, 44);
      wg.stroke();
      return w;
    });

    // 5. Ice 64x64 (Dragonspine Cryo Crystal)
    const ice = createCanvas(64, 64);
    const ig = ice.getContext('2d');
    const iGrad = ig.createLinearGradient(0, 0, 64, 64);
    iGrad.addColorStop(0, C.ICE_LIGHT);
    iGrad.addColorStop(0.5, C.ICE_MID);
    iGrad.addColorStop(1, C.ICE_DARK);
    ig.fillStyle = iGrad;
    ig.fillRect(0, 0, 64, 64);
    ig.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ig.beginPath();
    ig.moveTo(0, 20); ig.lineTo(20, 0); ig.lineTo(36, 0); ig.lineTo(0, 36); ig.closePath(); ig.fill();
    ig.beginPath();
    ig.moveTo(28, 64); ig.lineTo(64, 28); ig.lineTo(64, 44); ig.lineTo(44, 64); ig.closePath(); ig.fill();
    ig.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ig.lineWidth = 2;
    ig.strokeRect(1, 1, 62, 62);
    ig.fillStyle = '#FFFFFF';
    drawFourPointStar(ig, 46, 18, 5, 1.8); ig.fill();
    cache.ice = ice;

    // 6. Eagle Base 128x128 (Celestia / Knights of Favonius Golden Winged Shrine)
    const ea = createCanvas(128, 128);
    const eg = ea.getContext('2d');
    // Circular gold rune altar
    const altarGrad = eg.createRadialGradient(64, 64, 8, 64, 64, 58);
    altarGrad.addColorStop(0, 'rgba(94, 231, 223, 0.4)');
    altarGrad.addColorStop(0.7, 'rgba(211, 188, 142, 0.25)');
    altarGrad.addColorStop(1, 'rgba(20, 26, 40, 0)');
    eg.fillStyle = altarGrad;
    eg.beginPath(); eg.arc(64, 64, 58, 0, Math.PI * 2); eg.fill();

    eg.strokeStyle = '#D3BC8E';
    eg.lineWidth = 4;
    eg.beginPath(); eg.arc(64, 64, 48, 0, Math.PI * 2); eg.stroke();

    // Stylized Golden Eagle Wings
    const wingGrad = eg.createLinearGradient(0, 24, 0, 108);
    wingGrad.addColorStop(0, '#FFF8D6');
    wingGrad.addColorStop(0.5, '#F2C96B');
    wingGrad.addColorStop(1, '#A66F24');
    eg.fillStyle = wingGrad;
    eg.strokeStyle = '#1B1D29';
    eg.lineWidth = 4;

    // Left & Right feathered wings
    for (const s of [-1, 1]) {
      eg.beginPath();
      eg.moveTo(64 + s * 10, 56);
      eg.lineTo(64 + s * 54, 28);
      eg.lineTo(64 + s * 46, 52);
      eg.lineTo(64 + s * 52, 60);
      eg.lineTo(64 + s * 36, 72);
      eg.lineTo(64 + s * 42, 80);
      eg.lineTo(64 + s * 14, 84);
      eg.closePath();
      eg.fill();
      eg.stroke();
    }

    // Central Shield Crest + Head
    eg.fillStyle = wingGrad;
    eg.beginPath();
    eg.moveTo(64, 18);
    eg.lineTo(74, 34);
    eg.lineTo(80, 74);
    eg.lineTo(64, 108);
    eg.lineTo(48, 74);
    eg.lineTo(54, 34);
    eg.closePath();
    eg.fill();
    eg.stroke();

    // Radiant Aqua Core Gem
    const gemGrad = eg.createRadialGradient(64, 62, 2, 64, 62, 15);
    gemGrad.addColorStop(0, '#FFFFFF');
    gemGrad.addColorStop(0.5, '#5EE7DF');
    gemGrad.addColorStop(1, '#1A7885');
    eg.fillStyle = gemGrad;
    drawFourPointStar(eg, 64, 62, 16, 7);
    eg.fill();
    eg.lineWidth = 3;
    eg.strokeStyle = '#182030';
    eg.stroke();
    cache.eagleAlive = ea;

    // Destroyed Shrine
    const ed = createCanvas(128, 128);
    const edg = ed.getContext('2d');
    edg.strokeStyle = '#505666';
    edg.lineWidth = 4;
    edg.beginPath(); edg.arc(64, 64, 46, 0.3, 5.7); edg.stroke();
    edg.fillStyle = '#3C4252';
    edg.strokeStyle = '#141720';
    edg.lineWidth = 4;
    for (const [rx, ry, rw, rh] of [[24, 58, 28, 22], [58, 74, 34, 24], [40, 42, 26, 20], [74, 48, 24, 26]]) {
      roundRectPath(edg, rx, ry, rw, rh, 5);
      edg.fill();
      edg.stroke();
    }
    // Faint glowing red embers
    edg.fillStyle = '#FF584C';
    edg.beginPath(); edg.arc(54, 66, 5, 0, Math.PI * 2); edg.fill();
    edg.beginPath(); edg.arc(72, 58, 4, 0, Math.PI * 2); edg.fill();
    cache.eagleDead = ed;

    // 7. Bullets 32x32 (4 directions)
    cache.bullets = [0, 1, 2, 3].map((d) => {
      const bc = createCanvas(32, 32);
      const bg2 = bc.getContext('2d');
      bg2.save();
      bg2.translate(16, 16);
      bg2.rotate((d * Math.PI) / 2);
      const bGlow = bg2.createRadialGradient(0, -2, 2, 0, 0, 14);
      bGlow.addColorStop(0, '#FFFFFF');
      bGlow.addColorStop(0.45, '#FFE885');
      bGlow.addColorStop(0.85, 'rgba(255, 145, 50, 0.7)');
      bGlow.addColorStop(1, 'rgba(255, 100, 30, 0)');
      bg2.fillStyle = bGlow;
      bg2.beginPath();
      bg2.arc(0, 0, 14, 0, Math.PI * 2);
      bg2.fill();

      bg2.fillStyle = '#FFFFFF';
      bg2.beginPath();
      bg2.ellipse(0, -1, 5, 9, 0, 0, Math.PI * 2);
      bg2.fill();
      bg2.restore();
      return bc;
    });

    // 8. Spawn Wish Stars 128x128 (4 frames)
    cache.spawnStars = [0.35, 0.6, 0.92, 0.68].map((scale, idx) => {
      const sc = createCanvas(128, 128);
      const sg2 = sc.getContext('2d');
      const r = 52 * scale;
      const halo = sg2.createRadialGradient(64, 64, 2, 64, 64, r);
      halo.addColorStop(0, '#FFFFFF');
      halo.addColorStop(0.35, idx % 2 === 0 ? '#FFE894' : '#8CF5FF');
      halo.addColorStop(1, 'rgba(140, 245, 255, 0)');
      sg2.fillStyle = halo;
      sg2.beginPath(); sg2.arc(64, 64, r, 0, Math.PI * 2); sg2.fill();

      sg2.fillStyle = '#FFFFFF';
      drawFourPointStar(sg2, 64, 64, r, r * 0.28);
      sg2.fill();
      return sc;
    });

    // 9. Elemental Geo/Anemo Shield 128x128 (2 alternating phases)
    cache.shield = [0, 1].map((f) => {
      const sh = createCanvas(128, 128);
      const sg2 = sh.getContext('2d');
      const grad = sg2.createRadialGradient(64, 64, 42, 64, 64, 62);
      grad.addColorStop(0, 'rgba(94, 231, 223, 0)');
      grad.addColorStop(0.7, 'rgba(255, 232, 130, 0.35)');
      grad.addColorStop(1, 'rgba(94, 231, 223, 0)');
      sg2.fillStyle = grad;
      sg2.beginPath(); sg2.arc(64, 64, 62, 0, Math.PI * 2); sg2.fill();

      sg2.strokeStyle = f === 0 ? '#FFE885' : '#7BF0E8';
      sg2.lineWidth = 4;
      sg2.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + f * 0.25;
        const px = 64 + Math.cos(a) * 56;
        const py = 64 + Math.sin(a) * 56;
        if (i === 0) sg2.moveTo(px, py);
        else sg2.lineTo(px, py);
      }
      sg2.closePath();
      sg2.stroke();
      return sh;
    });

    // 10. 6 Power-Ups 128x128 (Genshin Talisman Badges)
    cache.powerups = {};
    const puColors = {
      [BC.POWERUP.HELMET]: '#5EE7DF',
      [BC.POWERUP.CLOCK]: '#A6C8FF',
      [BC.POWERUP.SHOVEL]: '#F5B849',
      [BC.POWERUP.STAR]: '#8AE8FF',
      [BC.POWERUP.GRENADE]: '#FF6E5A',
      [BC.POWERUP.TANK]: '#FFE074',
    };
    for (const type of Object.values(BC.POWERUP)) {
      const pc = createCanvas(128, 128);
      const pg = pc.getContext('2d');
      const glowCol = puColors[type];

      // Dark slate rounded octagonal frame + champagne gold rim
      const cardGrad = pg.createLinearGradient(0, 12, 0, 116);
      cardGrad.addColorStop(0, '#2B354D');
      cardGrad.addColorStop(1, '#141926');
      pg.fillStyle = cardGrad;
      roundRectPath(pg, 12, 12, 104, 104, 20);
      pg.fill();

      const innerGlow = pg.createRadialGradient(64, 64, 6, 64, 64, 48);
      innerGlow.addColorStop(0, glowCol + '55');
      innerGlow.addColorStop(1, 'rgba(0,0,0,0)');
      pg.fillStyle = innerGlow;
      pg.fillRect(14, 14, 100, 100);

      pg.lineWidth = 6;
      pg.strokeStyle = '#D3BC8E';
      roundRectPath(pg, 12, 12, 104, 104, 20);
      pg.stroke();

      pg.fillStyle = glowCol;
      pg.strokeStyle = '#111622';
      pg.lineWidth = 4;

      if (type === BC.POWERUP.STAR) {
        // Primogem / Wish Star!
        const pGrad = pg.createRadialGradient(64, 64, 4, 64, 64, 42);
        pGrad.addColorStop(0, '#FFFFFF');
        pGrad.addColorStop(0.5, '#9AF2FF');
        pGrad.addColorStop(1, '#589BFF');
        pg.fillStyle = pGrad;
        drawFourPointStar(pg, 64, 64, 40, 15);
        pg.fill();
        pg.stroke();
      } else if (type === BC.POWERUP.HELMET) {
        // Aegis Shield
        pg.beginPath();
        pg.moveTo(64, 26); pg.lineTo(96, 40); pg.lineTo(90, 78); pg.lineTo(64, 102); pg.lineTo(38, 78); pg.lineTo(32, 40);
        pg.closePath();
        pg.fill(); pg.stroke();
        pg.fillStyle = '#FFFFFF';
        drawFourPointStar(pg, 64, 62, 14, 5); pg.fill();
      } else if (type === BC.POWERUP.CLOCK) {
        // Pocket Chrono Watch
        pg.beginPath(); pg.arc(64, 66, 32, 0, Math.PI * 2); pg.fill(); pg.stroke();
        pg.fillStyle = '#182032';
        pg.beginPath(); pg.arc(64, 66, 23, 0, Math.PI * 2); pg.fill();
        pg.strokeStyle = '#FFF3C4';
        pg.lineWidth = 5;
        pg.beginPath(); pg.moveTo(64, 48); pg.lineTo(64, 66); pg.lineTo(78, 74); pg.stroke();
      } else if (type === BC.POWERUP.SHOVEL) {
        // Golden Geo Shovel
        pg.save();
        pg.translate(64, 64); pg.rotate(Math.PI / 4);
        pg.fillStyle = '#FFE28A';
        pg.beginPath(); pg.moveTo(0, -40); pg.lineTo(20, -14); pg.lineTo(14, 0); pg.lineTo(-14, 0); pg.lineTo(-20, -14); pg.closePath();
        pg.fill(); pg.stroke();
        pg.fillStyle = '#A66E2E';
        roundRectPath(pg, -5, 0, 10, 36, 4); pg.fill(); pg.stroke();
        pg.restore();
      } else if (type === BC.POWERUP.GRENADE) {
        // Pyro Elemental Burst Orb
        pg.beginPath(); pg.arc(64, 70, 28, 0, Math.PI * 2); pg.fill(); pg.stroke();
        pg.fillStyle = '#FFE47A';
        drawFourPointStar(pg, 64, 70, 18, 7); pg.fill();
        pg.fillStyle = '#D3BC8E';
        roundRectPath(pg, 54, 30, 20, 12, 4); pg.fill(); pg.stroke();
      } else if (type === BC.POWERUP.TANK) {
        // Mini 1UP Gold Tank
        const mini = drawGenshinTankHD('P2', C.P1, 0, 0);
        pg.drawImage(mini, 20, 20, 88, 88);
      }

      cache.powerups[type] = pc;
    }

    // 11. HUD Icons (64x64)
    const he = createCanvas(64, 64);
    const heg = he.getContext('2d');
    heg.fillStyle = '#E89B48';
    heg.strokeStyle = '#121722';
    heg.lineWidth = 4;
    roundRectPath(heg, 12, 16, 40, 34, 8); heg.fill(); heg.stroke();
    heg.fillStyle = '#FFF2C2';
    heg.fillRect(28, 8, 8, 16);
    drawFourPointStar(heg, 32, 34, 8, 3.5); heg.fill();
    cache.hudEnemy = he;

    const hl = createCanvas(64, 64);
    const hlg = hl.getContext('2d');
    hlg.drawImage(drawGenshinTankHD('P0', C.P1, 0, 0), 4, 4, 56, 56);
    cache.hudLife = hl;

    const fl = createCanvas(128, 128);
    const flg = fl.getContext('2d');
    flg.fillStyle = '#D3BC8E';
    roundRectPath(flg, 20, 16, 10, 96, 4); flg.fill();
    const flagGrad = flg.createLinearGradient(30, 20, 108, 68);
    flagGrad.addColorStop(0, '#FF6B5E');
    flagGrad.addColorStop(1, '#D82C3C');
    flg.fillStyle = flagGrad;
    flg.beginPath();
    flg.moveTo(30, 20); flg.lineTo(110, 44); flg.lineTo(30, 72); flg.closePath();
    flg.fill();
    flg.lineWidth = 4; flg.strokeStyle = '#FCE7A2'; flg.stroke();
    cache.flag = fl;

    return cache;
  }

  // =========================================================================
  // 3. CYBERPUNK 2D HIGH-DEFINITION ARTWORK (Neon Night City & Mecha Drones)
  // =========================================================================
  function octagonPath(g, x, y, w, h, cut) {
    g.beginPath();
    g.moveTo(x + cut, y);
    g.lineTo(x + w - cut, y);
    g.lineTo(x + w, y + cut);
    g.lineTo(x + w, y + h - cut);
    g.lineTo(x + w - cut, y + h);
    g.lineTo(x + cut, y + h);
    g.lineTo(x, y + h - cut);
    g.lineTo(x, y + cut);
    g.closePath();
  }

  function drawCyberTankHD(designKey, pal, dir, frame) {
    const SZ = 128;
    const c = createCanvas(SZ, SZ);
    const g = c.getContext('2d');
    if (typeof g.beginPath !== 'function') return c;

    const [cDark, cMid, cLight, cNeonRaw] = pal;
    const cNeon = cNeonRaw || '#00F0FF';
    const isPlayer = designKey.startsWith('P');
    const tierOrType = parseInt(designKey[1], 10) || 0;

    g.save();
    g.translate(SZ / 2, SZ / 2);
    g.rotate((dir * Math.PI) / 2);
    g.translate(-SZ / 2, -SZ / 2);

    // Subtle neon underglow
    const under = g.createRadialGradient(64, 68, 12, 64, 68, 56);
    under.addColorStop(0, cLight + '44');
    under.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = under;
    g.beginPath(); g.arc(64, 68, 56, 0, Math.PI * 2); g.fill();

    // 1. Cyber Hover-Treads with illuminated pulse links
    const treadW = designKey === 'E1' ? 18 : 22;
    const treadXLeft = designKey === 'E0' ? 16 : 10;
    const treadXRight = SZ - treadXLeft - treadW;
    const treadY = 18;
    const treadH = 96;

    for (const tx of [treadXLeft, treadXRight]) {
      g.fillStyle = '#0D121F';
      octagonPath(g, tx, treadY, treadW, treadH, 5);
      g.fill();

      const shift = (frame & 1) * 8;
      for (let py = treadY + 6 + shift; py < treadY + treadH - 8; py += 16) {
        g.fillStyle = (py % 32 === 0) ? cNeon : cMid;
        g.fillRect(tx + 3, py, treadW - 6, 6);
      }

      g.lineWidth = 3.5;
      g.strokeStyle = cLight;
      octagonPath(g, tx, treadY, treadW, treadH, 5);
      g.stroke();
    }

    // 2. Angular Faceted Cyber Chassis
    const hullX = treadXLeft + treadW - 4;
    const hullW = SZ - hullX * 2;
    const hullY = designKey === 'E1' ? 28 : 22;
    const hullH = designKey === 'E1' ? 84 : 90;

    const hullGrad = g.createLinearGradient(hullX, hullY, hullX + hullW, hullY + hullH);
    hullGrad.addColorStop(0, cMid);
    hullGrad.addColorStop(0.55, cDark);
    hullGrad.addColorStop(1, '#090D18');
    g.fillStyle = hullGrad;
    octagonPath(g, hullX, hullY, hullW, hullH, designKey === 'E1' ? 18 : 12);
    g.fill();

    // Neon edge circuit strips
    g.lineWidth = 4;
    g.strokeStyle = cLight;
    octagonPath(g, hullX, hullY, hullW, hullH, designKey === 'E1' ? 18 : 12);
    g.stroke();

    // Reactive side fins for upgraded players / heavy cyber armor
    if ((isPlayer && tierOrType >= 2) || (!isPlayer && tierOrType === 3)) {
      g.fillStyle = cNeon;
      g.fillRect(hullX - 5, hullY + 24, 6, 42);
      g.fillRect(hullX + hullW - 1, hullY + 24, 6, 42);
    }

    // Rear cyber vent glow
    g.fillStyle = cNeon;
    g.fillRect(48, hullY + hullH - 12, 32, 4);

    // 3. Railgun / Plasma Cannon Barrel
    const barrelW =
      (isPlayer && tierOrType === 3) || (!isPlayer && tierOrType === 3) ? 14 :
      (isPlayer && tierOrType >= 1) || (!isPlayer && tierOrType === 2) ? 11 : 8;
    const barrelTop = isPlayer && tierOrType >= 1 ? 2 : 6;
    const barrelLen = 58 - barrelTop;

    // Twin rail slits for Tier 2+ / Power+
    if ((isPlayer && tierOrType >= 2) || (!isPlayer && tierOrType >= 2)) {
      g.fillStyle = '#0B1020';
      g.fillRect(64 - barrelW * 0.85, barrelTop + 4, barrelW * 1.7, barrelLen - 14);
      g.fillStyle = cNeon;
      g.fillRect(64 - 2, barrelTop + 2, 4, barrelLen - 10);
    }

    g.fillStyle = cDark;
    g.fillRect(64 - barrelW / 2, barrelTop, barrelW, barrelLen);
    g.lineWidth = 3;
    g.strokeStyle = cLight;
    g.strokeRect(64 - barrelW / 2, barrelTop, barrelW, barrelLen);

    // Glowing muzzle plasma emitter
    g.fillStyle = (isPlayer && tierOrType >= 1) || (!isPlayer && tierOrType >= 2) ? cNeon : cLight;
    g.fillRect(64 - barrelW * 0.75, barrelTop, barrelW * 1.5, 9);

    // 4. Angular Octagonal Cyber Turret + Laser Visor Core
    const turSize = designKey === 'E3' || (isPlayer && tierOrType === 3) ? 50 : 42;
    const turX = 64 - turSize / 2;
    const turY = 68 - turSize / 2;
    const turGrad = g.createLinearGradient(turX, turY, turX + turSize, turY + turSize);
    turGrad.addColorStop(0, cMid);
    turGrad.addColorStop(1, '#0C1222');
    g.fillStyle = turGrad;
    octagonPath(g, turX, turY, turSize, turSize, 10);
    g.fill();

    g.lineWidth = 3.5;
    g.strokeStyle = cLight;
    octagonPath(g, turX, turY, turSize, turSize, 10);
    g.stroke();

    // Glowing Cyber Visor / Core Capacitor
    g.fillStyle = cNeon;
    octagonPath(g, 52, 60, 24, 14, 4);
    g.fill();
    g.fillStyle = '#FFFFFF';
    g.fillRect(58, 64, 12, 5);

    g.restore();
    return c;
  }

  function buildCyberpunkSprites() {
    const C = BC.THEMES.cyberpunk;
    const cache = {};

    const probe = createCanvas(4, 4).getContext('2d');
    if (typeof probe.beginPath !== 'function' || typeof probe.createLinearGradient !== 'function') {
      return buildClassicSprites();
    }

    // 1. Cyber Brick 64x64 (Dark polymer blocks with glowing Neon Magenta strips)
    const brick = createCanvas(64, 64);
    const bg = brick.getContext('2d');
    bg.fillStyle = C.BRICK_MORTAR;
    bg.fillRect(0, 0, 64, 64);
    const drawCyberBrick = (x, y, w, h) => {
      const gr = bg.createLinearGradient(x, y, x, y + h);
      gr.addColorStop(0, '#441236');
      gr.addColorStop(0.5, '#270B22');
      gr.addColorStop(1, '#180716');
      bg.fillStyle = gr;
      bg.fillRect(x + 1, y + 1, w - 2, h - 2);
      // Glowing hot magenta top neon bar
      bg.fillStyle = C.BRICK_LIGHT;
      bg.fillRect(x + 2, y + 2, w - 4, 3);
      bg.lineWidth = 1.5;
      bg.strokeStyle = C.BRICK_MID;
      bg.strokeRect(x + 1, y + 1, w - 2, h - 2);
    };
    drawCyberBrick(0, 0, 32, 16);
    drawCyberBrick(32, 0, 32, 16);
    drawCyberBrick(0, 16, 16, 16);
    drawCyberBrick(16, 16, 32, 16);
    drawCyberBrick(48, 16, 16, 16);
    drawCyberBrick(0, 32, 32, 16);
    drawCyberBrick(32, 32, 32, 16);
    drawCyberBrick(0, 48, 16, 16);
    drawCyberBrick(16, 48, 32, 16);
    drawCyberBrick(48, 48, 16, 16);
    cache.brickFull = brick;

    // 2. Cyber Steel 64x64 (Gunmetal Titanium + Hazard Yellow frame + Neon Cyan Core)
    const steel = createCanvas(64, 64);
    const sg = steel.getContext('2d');
    const stGrad = sg.createLinearGradient(0, 0, 64, 64);
    stGrad.addColorStop(0, '#364666');
    stGrad.addColorStop(0.5, C.STEEL_MID);
    stGrad.addColorStop(1, C.STEEL_DARK);
    sg.fillStyle = stGrad;
    octagonPath(sg, 2, 2, 60, 60, 8);
    sg.fill();
    sg.lineWidth = 4;
    sg.strokeStyle = C.STEEL_LIGHT;
    octagonPath(sg, 6, 6, 52, 52, 6);
    sg.stroke();
    // Glowing cyan circuit cross
    sg.strokeStyle = C.STEEL_CORE;
    sg.lineWidth = 3;
    sg.beginPath();
    sg.moveTo(16, 32); sg.lineTo(48, 32);
    sg.moveTo(32, 16); sg.lineTo(32, 48);
    sg.stroke();
    sg.fillStyle = '#FFFFFF';
    octagonPath(sg, 24, 24, 16, 16, 4);
    sg.fill();
    cache.steel = steel;

    // 3. Cyber Forest 64x64 (Digital Stealth Holo-Matrix Canopy)
    const forest = createCanvas(64, 64);
    const fg = forest.getContext('2d');
    fg.fillStyle = 'rgba(6, 71, 61, 0.72)';
    fg.fillRect(0, 0, 64, 64);
    // Digital pixel-hex holo foliage
    fg.strokeStyle = C.FOREST_MID;
    fg.lineWidth = 2;
    for (let y = 8; y < 64; y += 16) {
      fg.beginPath(); fg.moveTo(0, y); fg.lineTo(64, y); fg.stroke();
    }
    for (let x = 8; x < 64; x += 16) {
      fg.beginPath(); fg.moveTo(x, 0); fg.lineTo(x, 64); fg.stroke();
    }
    const holoNodes = [
      [16, 16, 11], [48, 18, 12], [32, 32, 14], [18, 48, 11], [48, 48, 10],
    ];
    for (const [hx, hy, hr] of holoNodes) {
      fg.fillStyle = C.FOREST_MID;
      octagonPath(fg, hx - hr, hy - hr, hr * 2, hr * 2, 5);
      fg.fill();
      fg.fillStyle = C.FOREST_LIGHT;
      fg.fillRect(hx - 4, hy - 4, 8, 8);
    }
    cache.forest = forest;

    // 4. Cyber Water 64x64 (2 electric cyan data-river frames)
    cache.water = [0, 1].map((frame) => {
      const w = createCanvas(64, 64);
      const wg = w.getContext('2d');
      wg.fillStyle = C.WATER_DARK;
      wg.fillRect(0, 0, 64, 64);
      const off = frame * 16;
      wg.strokeStyle = C.WATER_MID;
      wg.lineWidth = 3;
      for (const wy of [14, 34, 52]) {
        wg.beginPath();
        wg.moveTo(-16 + off, wy);
        wg.lineTo(0 + off, wy - 6);
        wg.lineTo(16 + off, wy);
        wg.lineTo(32 + off, wy + 6);
        wg.lineTo(48 + off, wy);
        wg.lineTo(64 + off, wy - 6);
        wg.stroke();
      }
      wg.fillStyle = C.WATER_LIGHT;
      wg.fillRect((8 + off) % 52, 11, 12, 3);
      wg.fillRect((36 - off + 64) % 52, 42, 14, 3);
      return w;
    });

    // 5. Cyber Ice 64x64 (Cryogenic Superconductor Floor)
    const ice = createCanvas(64, 64);
    const ig = ice.getContext('2d');
    const iGrad = ig.createLinearGradient(0, 0, 64, 64);
    iGrad.addColorStop(0, C.ICE_LIGHT);
    iGrad.addColorStop(0.5, C.ICE_MID);
    iGrad.addColorStop(1, C.ICE_DARK);
    ig.fillStyle = iGrad;
    ig.fillRect(0, 0, 64, 64);
    ig.strokeStyle = '#FFFFFF';
    ig.lineWidth = 2;
    octagonPath(ig, 8, 8, 48, 48, 12);
    ig.stroke();
    ig.fillStyle = 'rgba(255,255,255,0.5)';
    ig.fillRect(26, 26, 12, 12);
    cache.ice = ice;

    // 6. Cyber Mainframe / Phoenix Core Base 128x128
    const ea = createCanvas(128, 128);
    const eg = ea.getContext('2d');
    const halo = eg.createRadialGradient(64, 64, 8, 64, 64, 60);
    halo.addColorStop(0, 'rgba(0, 240, 255, 0.5)');
    halo.addColorStop(0.6, 'rgba(255, 42, 133, 0.28)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    eg.fillStyle = halo;
    eg.beginPath(); eg.arc(64, 64, 60, 0, Math.PI * 2); eg.fill();

    eg.strokeStyle = '#00F0FF';
    eg.lineWidth = 4;
    octagonPath(eg, 12, 12, 104, 104, 24);
    eg.stroke();

    // Cyber Phoenix Wings
    eg.fillStyle = '#0D172B';
    eg.strokeStyle = '#FF2A85';
    eg.lineWidth = 4;
    for (const s of [-1, 1]) {
      eg.beginPath();
      eg.moveTo(64 + s * 10, 56);
      eg.lineTo(64 + s * 54, 24);
      eg.lineTo(64 + s * 44, 54);
      eg.lineTo(64 + s * 52, 64);
      eg.lineTo(64 + s * 34, 82);
      eg.lineTo(64 + s * 14, 86);
      eg.closePath();
      eg.fill();
      eg.stroke();
    }
    // Central Neon AI Prism
    eg.fillStyle = '#00F0FF';
    eg.strokeStyle = '#FFFFFF';
    eg.lineWidth = 3;
    octagonPath(eg, 46, 30, 36, 68, 12);
    eg.fill();
    eg.stroke();
    eg.fillStyle = '#FCEE0A';
    drawFourPointStar(eg, 64, 64, 14, 6);
    eg.fill();
    cache.eagleAlive = ea;

    // Destroyed Mainframe
    const ed = createCanvas(128, 128);
    const edg = ed.getContext('2d');
    edg.strokeStyle = '#334155';
    edg.lineWidth = 4;
    octagonPath(edg, 16, 16, 96, 96, 20);
    edg.stroke();
    edg.fillStyle = '#1E293B';
    edg.strokeStyle = '#090D16';
    for (const [rx, ry, rw, rh] of [[26, 56, 30, 22], [60, 72, 36, 24], [42, 40, 26, 20]]) {
      edg.fillRect(rx, ry, rw, rh);
      edg.strokeRect(rx, ry, rw, rh);
    }
    edg.strokeStyle = '#FF2A85';
    edg.lineWidth = 3;
    edg.beginPath();
    edg.moveTo(36, 48); edg.lineTo(54, 66); edg.lineTo(44, 78);
    edg.moveTo(84, 44); edg.lineTo(68, 60); edg.lineTo(82, 70);
    edg.stroke();
    cache.eagleDead = ed;

    // 7. Plasma Laser Bullets 32x32
    cache.bullets = [0, 1, 2, 3].map((d) => {
      const bc = createCanvas(32, 32);
      const bg2 = bc.getContext('2d');
      bg2.save();
      bg2.translate(16, 16);
      bg2.rotate((d * Math.PI) / 2);
      const bGlow = bg2.createRadialGradient(0, 0, 2, 0, 0, 14);
      bGlow.addColorStop(0, '#FFFFFF');
      bGlow.addColorStop(0.4, '#00F0FF');
      bGlow.addColorStop(0.85, 'rgba(255, 42, 133, 0.7)');
      bGlow.addColorStop(1, 'rgba(0,0,0,0)');
      bg2.fillStyle = bGlow;
      bg2.beginPath(); bg2.arc(0, 0, 14, 0, Math.PI * 2); bg2.fill();
      bg2.fillStyle = '#FFFFFF';
      bg2.fillRect(-3, -11, 6, 20);
      bg2.restore();
      return bc;
    });

    // 8. Target-Lock Spawn Reticle 128x128 (4 frames)
    cache.spawnStars = [0.35, 0.65, 0.95, 0.7].map((scale, idx) => {
      const sc = createCanvas(128, 128);
      const sg2 = sc.getContext('2d');
      const r = 48 * scale;
      sg2.strokeStyle = idx % 2 === 0 ? '#00F0FF' : '#FF2A85';
      sg2.lineWidth = 5;
      octagonPath(sg2, 64 - r, 64 - r, r * 2, r * 2, r * 0.45);
      sg2.stroke();
      sg2.fillStyle = '#FFFFFF';
      drawFourPointStar(sg2, 64, 64, r * 0.7, r * 0.2);
      sg2.fill();
      return sc;
    });

    // 9. Holographic Forcefield Shield 128x128
    cache.shield = [0, 1].map((f) => {
      const sh = createCanvas(128, 128);
      const sg2 = sh.getContext('2d');
      sg2.strokeStyle = f === 0 ? '#00F0FF' : '#FF2A85';
      sg2.lineWidth = 5;
      octagonPath(sg2, 8, 8, 112, 112, 26);
      sg2.stroke();
      sg2.strokeStyle = 'rgba(252, 238, 10, 0.6)';
      sg2.lineWidth = 2.5;
      octagonPath(sg2, 16, 16, 96, 96, 20);
      sg2.stroke();
      return sh;
    });

    // 10. 6 Cyber-Chip Power-Ups 128x128
    cache.powerups = {};
    const puColors = {
      [BC.POWERUP.HELMET]: '#00F0FF',
      [BC.POWERUP.CLOCK]: '#A855F7',
      [BC.POWERUP.SHOVEL]: '#FCEE0A',
      [BC.POWERUP.STAR]: '#00FFA3',
      [BC.POWERUP.GRENADE]: '#FF2A85',
      [BC.POWERUP.TANK]: '#00F0FF',
    };
    for (const type of Object.values(BC.POWERUP)) {
      const pc = createCanvas(128, 128);
      const pg = pc.getContext('2d');
      const glowCol = puColors[type];

      pg.fillStyle = '#090D1A';
      octagonPath(pg, 12, 12, 104, 104, 18);
      pg.fill();

      const inner = pg.createRadialGradient(64, 64, 6, 64, 64, 48);
      inner.addColorStop(0, glowCol + '66');
      inner.addColorStop(1, 'rgba(0,0,0,0)');
      pg.fillStyle = inner;
      pg.fillRect(14, 14, 100, 100);

      pg.lineWidth = 6;
      pg.strokeStyle = glowCol;
      octagonPath(pg, 12, 12, 104, 104, 18);
      pg.stroke();

      pg.fillStyle = glowCol;
      pg.strokeStyle = '#FFFFFF';
      pg.lineWidth = 3;

      if (type === BC.POWERUP.STAR) {
        drawFourPointStar(pg, 64, 64, 38, 14);
        pg.fill(); pg.stroke();
      } else if (type === BC.POWERUP.HELMET) {
        octagonPath(pg, 34, 30, 60, 68, 16);
        pg.fill(); pg.stroke();
        pg.fillStyle = '#090D1A';
        octagonPath(pg, 46, 42, 36, 44, 8);
        pg.fill();
      } else if (type === BC.POWERUP.CLOCK) {
        pg.beginPath(); pg.arc(64, 64, 30, 0, Math.PI * 2); pg.fill(); pg.stroke();
        pg.fillStyle = '#090D1A';
        pg.beginPath(); pg.arc(64, 64, 21, 0, Math.PI * 2); pg.fill();
        pg.strokeStyle = '#FCEE0A';
        pg.lineWidth = 5;
        pg.beginPath(); pg.moveTo(64, 48); pg.lineTo(64, 64); pg.lineTo(78, 72); pg.stroke();
      } else if (type === BC.POWERUP.SHOVEL) {
        pg.save();
        pg.translate(64, 64); pg.rotate(Math.PI / 4);
        pg.fillRect(-16, -34, 32, 26);
        pg.strokeRect(-16, -34, 32, 26);
        pg.fillRect(-5, -8, 10, 42);
        pg.restore();
      } else if (type === BC.POWERUP.GRENADE) {
        pg.beginPath(); pg.arc(64, 68, 26, 0, Math.PI * 2); pg.fill(); pg.stroke();
        pg.fillStyle = '#FCEE0A';
        drawFourPointStar(pg, 64, 68, 16, 6); pg.fill();
        pg.fillStyle = '#00F0FF';
        pg.fillRect(54, 28, 20, 12);
      } else if (type === BC.POWERUP.TANK) {
        const mini = drawCyberTankHD('P2', C.P1, 0, 0);
        pg.drawImage(mini, 20, 20, 88, 88);
      }
      cache.powerups[type] = pc;
    }

    // 11. Cyber HUD Icons
    const he = createCanvas(64, 64);
    const heg = he.getContext('2d');
    heg.fillStyle = '#FF2A85';
    heg.strokeStyle = '#00F0FF';
    heg.lineWidth = 3;
    octagonPath(heg, 12, 16, 40, 34, 8);
    heg.fill(); heg.stroke();
    heg.fillStyle = '#FCEE0A';
    heg.fillRect(28, 8, 8, 14);
    cache.hudEnemy = he;

    const hl = createCanvas(64, 64);
    const hlg = hl.getContext('2d');
    hlg.drawImage(drawCyberTankHD('P0', C.P1, 0, 0), 4, 4, 56, 56);
    cache.hudLife = hl;

    const fl = createCanvas(128, 128);
    const flg = fl.getContext('2d');
    flg.fillStyle = '#00F0FF';
    flg.fillRect(20, 16, 9, 96);
    flg.fillStyle = '#FF2A85';
    flg.strokeStyle = '#00F0FF';
    flg.lineWidth = 4;
    flg.beginPath();
    flg.moveTo(29, 20); flg.lineTo(108, 44); flg.lineTo(29, 70); flg.closePath();
    flg.fill(); flg.stroke();
    cache.flag = fl;

    return cache;
  }

  // Build core sprite libraries once
  const classicSprites = buildClassicSprites();
  const genshinSprites = buildGenshinSprites();
  const cyberpunkSprites = buildCyberpunkSprites();

  BC.SKIN_SPRITES = {
    classic: classicSprites,
    genshin: genshinSprites,
    cyberpunk: cyberpunkSprites,
  };
  BC._tankRenderers = {
    cyberpunk: drawCyberTankHD,
    genshin: drawGenshinTankHD,
  };
  BC._explosionRenderers = {};
  BC._gfx = {
    createCanvas,
    roundRectPath,
    octagonPath,
    drawFourPointStar,
    buildClassicSprites,
  };

  BC.registerSkin = function (name, spriteSet, tankFn, explosionFn) {
    BC.SKIN_SPRITES[name] = spriteSet;
    if (tankFn) BC._tankRenderers[name] = tankFn;
    if (explosionFn) BC._explosionRenderers[name] = explosionFn;
    if (BC.getSkin() === name) {
      BC.SPRITES = spriteSet;
    }
  };

  BC.SPRITES = BC.SKIN_SPRITES[BC.getSkin()] || classicSprites;

  const tankCache = new Map();

  BC.getTankSprite = function (designKey, paletteOrKey, dir, frame) {
    const skin = BC.getSkin();
    const palette = resolvePalette(paletteOrKey, skin);
    const key = skin + '|' + designKey + '|' + palette.join(',') + '|' + dir + '|' + (frame & 1);
    let cached = tankCache.get(key);
    if (cached) return cached;

    if (skin === 'classic') {
      const base = normalizeDesign(TANK_DESIGNS[designKey]);
      const withTreads = applyTreads(base, frame & 1, '3', '1');
      cached = renderBitmap(withTreads, palette, dir);
    } else if (BC._tankRenderers[skin]) {
      cached = BC._tankRenderers[skin](designKey, palette, dir, frame);
    } else {
      cached = drawGenshinTankHD(designKey, palette, dir, frame);
    }

    tankCache.set(key, cached);
    return cached;
  };

  // Draw an 8x8 brick sub-tile with 4-bit quadrant mask (TL=1, TR=2, BL=4, BR=8)
  BC.drawBrickSubtile = function (ctx, px, py, mask) {
    if (mask === 0) return;
    const brickSrc = BC.SPRITES.brickFull;
    const sw = brickSrc.width / 2;
    const sh = brickSrc.height / 2;

    if (mask === 0x0f) {
      ctx.drawImage(brickSrc, px, py, 8, 8);
      return;
    }
    if (mask & 1) ctx.drawImage(brickSrc, 0, 0, sw, sh, px, py, 4, 4);
    if (mask & 2) ctx.drawImage(brickSrc, sw, 0, sw, sh, px + 4, py, 4, 4);
    if (mask & 4) ctx.drawImage(brickSrc, 0, sh, sw, sh, px, py + 4, 4, 4);
    if (mask & 8) ctx.drawImage(brickSrc, sw, sh, sw, sh, px + 4, py + 4, 4, 4);
  };

  // Skin-aware Explosions (Classic NES pixel burst / Genshin anime blast / Cyberpunk EMP Plasma)
  BC.drawExplosion = function (ctx, cx, cy, frame, isBig) {
    const skin = BC.getSkin();
    if (skin === 'classic') {
      const x = Math.round(cx);
      const y = Math.round(cy);

      if (!isBig) {
        const expSprite = BC.SKIN_SPRITES.classic.bulletExp[Math.min(2, frame)];
        if (expSprite) {
          ctx.drawImage(expSprite, x - 8, y - 8, 16, 16);
        }
        return;
      }

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
      return;
    }

    if (typeof ctx.beginPath !== 'function') return;

    if (BC._explosionRenderers[skin]) {
      BC._explosionRenderers[skin](ctx, cx, cy, frame, isBig);
      return;
    }

    ctx.save();

    if (skin === 'cyberpunk') {
      if (!isBig) {
        const r = [5.5, 9, 10][Math.min(2, frame)];
        const alpha = frame === 2 ? 0.55 : 1.0;
        ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        if (frame < 2) {
          ctx.fillStyle = frame === 0 ? '#FFFFFF' : '#FF2A85';
          drawFourPointStar(ctx, cx, cy, r * 0.9, r * 0.35);
          ctx.fill();
        } else {
          ctx.fillStyle = '#FCEE0A';
          for (const [dx, dy] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
            ctx.fillRect(cx + dx - 0.8, cy + dy - 0.8, 1.6, 1.6);
          }
        }
        ctx.restore();
        return;
      }

      const radii = [7, 13, 17, 20, 16];
      const r = radii[Math.min(4, frame)];
      const alpha = frame >= 3 ? (frame === 3 ? 0.85 : 0.45) : 1.0;

      // Dual neon EMP shockwave rings
      ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = `rgba(255, 42, 133, ${alpha * 0.85})`;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2); ctx.fill();

      if (frame <= 3) {
        ctx.fillStyle = `rgba(252, 238, 10, ${alpha})`;
        drawFourPointStar(ctx, cx, cy, r * 0.8, r * 0.28);
        ctx.fill();
      }
      if (frame <= 1) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      return;
    }

    // Genshin Modern 2D Cel-Shaded Elemental Blast
    if (!isBig) {
      const r = [5.5, 9, 10][Math.min(2, frame)];
      const alpha = frame === 2 ? 0.5 : 1.0;
      ctx.strokeStyle = `rgba(255, 224, 128, ${alpha})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      if (frame < 2) {
        ctx.fillStyle = `rgba(255, 110, 50, ${0.75 * alpha})`;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = frame === 0 ? '#FFFFFF' : '#FFE38A';
        drawFourPointStar(ctx, cx, cy, r * 0.88, r * 0.36);
        ctx.fill();
      } else {
        ctx.fillStyle = '#FFE38A';
        for (const [dx, dy] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
          ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 1.1, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
      return;
    }

    const radii = [7, 13, 17, 19, 15];
    const r = radii[Math.min(4, frame)];
    const alpha = frame >= 3 ? (frame === 3 ? 0.85 : 0.45) : 1.0;

    // Expanding golden shockwave ring
    ctx.strokeStyle = `rgba(255, 224, 128, ${alpha * 0.9})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
    ctx.stroke();

    // Layered anime pyro cloud
    ctx.fillStyle = `rgba(218, 56, 50, ${alpha})`;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2); ctx.fill();

    if (frame <= 3) {
      ctx.fillStyle = `rgba(255, 168, 70, ${alpha})`;
      ctx.beginPath(); ctx.arc(cx - 1.5, cy - 1.5, r * 0.65, 0, Math.PI * 2); ctx.fill();
    }
    if (frame <= 2) {
      ctx.fillStyle = '#FFFCE6';
      drawFourPointStar(ctx, cx, cy, r * 0.72, r * 0.25);
      ctx.fill();
    }
    ctx.restore();
  };
})(window);
