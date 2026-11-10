(function (global) {
  'use strict';

  const BC = (global.BattleCity = global.BattleCity || {});
  const gfx = BC._gfx;
  if (!gfx) return;

  const { createCanvas, roundRectPath, octagonPath, drawFourPointStar, buildClassicSprites } = gfx;

  function hasVectorSupport() {
    const probe = createCanvas(4, 4).getContext('2d');
    return typeof probe.beginPath === 'function' && typeof probe.createLinearGradient === 'function';
  }

  // Shared 64x64 brick builder with custom drawBlock callback (retains clean 32x32 quadrants)
  function makeBrick64(mortarCol, drawFn) {
    const c = createCanvas(64, 64);
    const g = c.getContext('2d');
    g.fillStyle = mortarCol;
    g.fillRect(0, 0, 64, 64);
    const rects = [
      [0, 0, 32, 16], [32, 0, 32, 16],
      [0, 16, 16, 16], [16, 16, 32, 16], [48, 16, 16, 16],
      [0, 32, 32, 16], [32, 32, 32, 16],
      [0, 48, 16, 16], [16, 48, 32, 16], [48, 48, 16, 16],
    ];
    for (let i = 0; i < rects.length; i++) {
      const [x, y, w, h] = rects[i];
      drawFn(g, x, y, w, h, i);
    }
    return c;
  }

  // Shared standard bullets, spawn markers, shields, HUD helpers
  function makeRoundBullet(coreCol, glowCol) {
    return [0, 1, 2, 3].map((d) => {
      const c = createCanvas(32, 32);
      const g = c.getContext('2d');
      g.save();
      g.translate(16, 16);
      g.rotate((d * Math.PI) / 2);
      const gr = g.createRadialGradient(0, -1, 1, 0, 0, 13);
      gr.addColorStop(0, '#FFFFFF');
      gr.addColorStop(0.45, coreCol);
      gr.addColorStop(0.85, glowCol);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(0, 0, 13, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#FFFFFF';
      g.beginPath(); g.ellipse(0, -2, 4, 8, 0, 0, Math.PI * 2); g.fill();
      g.restore();
      return c;
    });
  }

  function makeReticleSpawns(colA, colB) {
    return [0.35, 0.65, 0.92, 0.68].map((sc, i) => {
      const c = createCanvas(128, 128);
      const g = c.getContext('2d');
      const r = 46 * sc;
      g.strokeStyle = i % 2 === 0 ? colA : colB;
      g.lineWidth = 4.5;
      g.beginPath(); g.arc(64, 64, r, 0, Math.PI * 2); g.stroke();
      g.beginPath();
      g.moveTo(64 - r - 8, 64); g.lineTo(64 - r + 10, 64);
      g.moveTo(64 + r - 10, 64); g.lineTo(64 + r + 8, 64);
      g.moveTo(64, 64 - r - 8); g.lineTo(64, 64 - r + 10);
      g.moveTo(64, 64 + r - 10); g.lineTo(64, 64 + r + 8);
      g.stroke();
      g.fillStyle = '#FFFFFF';
      drawFourPointStar(g, 64, 64, r * 0.55, r * 0.18);
      g.fill();
      return c;
    });
  }

  function makeCircleShield(colA, colB) {
    return [0, 1].map((f) => {
      const c = createCanvas(128, 128);
      const g = c.getContext('2d');
      g.strokeStyle = f === 0 ? colA : colB;
      g.lineWidth = 4.5;
      g.setLineDash([14, 8]);
      g.lineDashOffset = f * 11;
      g.beginPath(); g.arc(64, 64, 57, 0, Math.PI * 2); g.stroke();
      g.setLineDash([]);
      g.fillStyle = f === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,240,180,0.08)';
      g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fill();
      return c;
    });
  }

  function makePowerUpCards(bgTop, bgBot, borderCol, iconCols, tankFn, miniPal) {
    const out = {};
    for (const type of Object.values(BC.POWERUP)) {
      const pc = createCanvas(128, 128);
      const pg = pc.getContext('2d');
      const col = iconCols[type];

      const cg = pg.createLinearGradient(0, 12, 0, 116);
      cg.addColorStop(0, bgTop);
      cg.addColorStop(1, bgBot);
      pg.fillStyle = cg;
      roundRectPath(pg, 12, 12, 104, 104, 14);
      pg.fill();
      pg.lineWidth = 5;
      pg.strokeStyle = borderCol;
      roundRectPath(pg, 12, 12, 104, 104, 14);
      pg.stroke();

      pg.fillStyle = col;
      pg.strokeStyle = '#181818';
      pg.lineWidth = 3.5;

      if (type === BC.POWERUP.STAR) {
        pg.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? 38 : 16;
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const px = 64 + Math.cos(a) * r;
          const py = 66 + Math.sin(a) * r;
          if (i === 0) pg.moveTo(px, py); else pg.lineTo(px, py);
        }
        pg.closePath();
        pg.fill(); pg.stroke();
      } else if (type === BC.POWERUP.HELMET) {
        pg.beginPath();
        pg.arc(64, 66, 32, Math.PI, 0);
        pg.lineTo(100, 80); pg.lineTo(28, 80);
        pg.closePath();
        pg.fill(); pg.stroke();
      } else if (type === BC.POWERUP.CLOCK) {
        pg.beginPath(); pg.arc(64, 66, 30, 0, Math.PI * 2); pg.fill(); pg.stroke();
        pg.fillStyle = bgBot;
        pg.beginPath(); pg.arc(64, 66, 22, 0, Math.PI * 2); pg.fill();
        pg.strokeStyle = '#FFF4CE'; pg.lineWidth = 4.5;
        pg.beginPath(); pg.moveTo(64, 48); pg.lineTo(64, 66); pg.lineTo(78, 74); pg.stroke();
      } else if (type === BC.POWERUP.SHOVEL) {
        pg.save();
        pg.translate(64, 64); pg.rotate(Math.PI / 4);
        pg.beginPath(); pg.moveTo(0, -38); pg.lineTo(18, -12); pg.lineTo(12, 2); pg.lineTo(-12, 2); pg.lineTo(-18, -12); pg.closePath();
        pg.fill(); pg.stroke();
        roundRectPath(pg, -4, 2, 8, 34, 3); pg.fill(); pg.stroke();
        pg.restore();
      } else if (type === BC.POWERUP.GRENADE) {
        roundRectPath(pg, 42, 42, 44, 52, 16); pg.fill(); pg.stroke();
        pg.strokeStyle = '#181818'; pg.lineWidth = 3;
        pg.beginPath(); pg.moveTo(42, 68); pg.lineTo(86, 68); pg.moveTo(64, 42); pg.lineTo(64, 94); pg.stroke();
        pg.fillStyle = '#D8C890';
        pg.fillRect(54, 28, 20, 14); pg.strokeRect(54, 28, 20, 14);
      } else if (type === BC.POWERUP.TANK) {
        pg.drawImage(tankFn('P2', miniPal, 0, 0), 20, 20, 88, 88);
      }
      out[type] = pc;
    }
    return out;
  }

  // =========================================================================
  // 1. WWII REALISTIC MILITARY SKIN (`wwii`)
  // =========================================================================
  function drawWWIITankHD(designKey, pal, dir, frame) {
    const SZ = 128;
    const c = createCanvas(SZ, SZ);
    const g = c.getContext('2d');
    if (typeof g.beginPath !== 'function') return c;

    const [cDark, cMid, cLight, cMark] = pal;
    const isPlayer = designKey.startsWith('P');
    const tierOrType = parseInt(designKey[1], 10) || 0;

    g.save();
    g.translate(SZ / 2, SZ / 2);
    g.rotate((dir * Math.PI) / 2);
    g.translate(-SZ / 2, -SZ / 2);

    // Ground cast shadow
    g.fillStyle = 'rgba(0, 0, 0, 0.42)';
    roundRectPath(g, 15, 22, 102, 98, 10);
    g.fill();

    // Heavy steel mud-tracked treads
    const treadW = designKey === 'E1' ? 18 : 22;
    const treadXL = designKey === 'E0' ? 16 : 10;
    const treadXR = SZ - treadXL - treadW;
    for (const tx of [treadXL, treadXR]) {
      g.fillStyle = '#242220';
      roundRectPath(g, tx, 16, treadW, 98, 5);
      g.fill();
      const shift = (frame & 1) * 7;
      for (let py = 20 + shift; py < 108; py += 14) {
        g.fillStyle = '#4A463E';
        g.fillRect(tx + 2, py, treadW - 4, 6);
        g.fillStyle = '#181614';
        g.fillRect(tx + 2, py + 5, treadW - 4, 2);
      }
      g.lineWidth = 3;
      g.strokeStyle = '#141310';
      roundRectPath(g, tx, 16, treadW, 98, 5);
      g.stroke();
    }

    // Armored Hull with sloped front glacis & rear engine louver
    const hullX = treadXL + treadW - 3;
    const hullW = SZ - hullX * 2;
    const hullGrad = g.createLinearGradient(hullX, 20, hullX + hullW, 110);
    hullGrad.addColorStop(0, cLight);
    hullGrad.addColorStop(0.5, cMid);
    hullGrad.addColorStop(1, cDark);
    g.fillStyle = hullGrad;
    roundRectPath(g, hullX, 20, hullW, 90, 8);
    g.fill();

    // Side skirts for heavy / upgraded tanks
    if ((isPlayer && tierOrType >= 2) || (!isPlayer && tierOrType === 3)) {
      g.fillStyle = cDark;
      g.fillRect(hullX - 4, 30, 6, 68);
      g.fillRect(hullX + hullW - 2, 30, 6, 68);
    }

    // Sloped front glacis shadow & rear engine vents
    g.fillStyle = 'rgba(255, 255, 255, 0.16)';
    g.fillRect(hullX + 4, 22, hullW - 8, 12);
    g.fillStyle = '#1E1F1B';
    for (let vy = 90; vy <= 102; vy += 6) {
      g.fillRect(hullX + 10, vy, hullW - 20, 3);
    }

    // Weathering rivets
    g.fillStyle = 'rgba(0,0,0,0.45)';
    for (const [rx, ry] of [[hullX + 6, 28], [hullX + hullW - 6, 28], [hullX + 6, 82], [hullX + hullW - 6, 82]]) {
      g.beginPath(); g.arc(rx, ry, 2, 0, Math.PI * 2); g.fill();
    }
    g.lineWidth = 3.5;
    g.strokeStyle = '#161712';
    roundRectPath(g, hullX, 20, hullW, 90, 8);
    g.stroke();

    // Barrel with WWII muzzle brake
    const bw = (isPlayer && tierOrType === 3) || (!isPlayer && tierOrType === 3) ? 11 : 8;
    const bTop = isPlayer && tierOrType >= 1 ? 2 : 8;
    g.fillStyle = cMid;
    g.fillRect(64 - bw / 2, bTop, bw, 58 - bTop);
    g.lineWidth = 3;
    g.strokeStyle = '#161712';
    g.strokeRect(64 - bw / 2, bTop, bw, 58 - bTop);
    if ((isPlayer && tierOrType >= 1) || (!isPlayer && tierOrType >= 2)) {
      g.fillStyle = cDark;
      g.fillRect(64 - bw * 0.85, bTop, bw * 1.7, 9);
      g.strokeRect(64 - bw * 0.85, bTop, bw * 1.7, 9);
    }

    // Turret + Commander Cupola Hatch
    const turR = designKey === 'E3' || (isPlayer && tierOrType === 3) ? 24 : 20;
    const tGrad = g.createRadialGradient(58, 58, 3, 64, 64, turR);
    tGrad.addColorStop(0, cLight);
    tGrad.addColorStop(0.65, cMid);
    tGrad.addColorStop(1, cDark);
    g.fillStyle = tGrad;
    g.beginPath(); g.arc(64, 64, turR, 0, Math.PI * 2); g.fill();
    g.lineWidth = 3.5; g.strokeStyle = '#161712'; g.stroke();

    // Commander hatch circle & insignia star/cross
    g.fillStyle = cDark;
    g.beginPath(); g.arc(56, 66, 7, 0, Math.PI * 2); g.fill();
    g.lineWidth = 2; g.stroke();
    if (isPlayer) {
      g.fillStyle = cMark || '#EFE7D0';
      drawFourPointStar(g, 71, 66, 6, 2.8);
      g.fill();
    } else {
      g.fillStyle = cMark || '#D85A48';
      g.fillRect(68, 63, 6, 6);
    }

    g.restore();
    return c;
  }

  function buildWWIISprites() {
    if (!hasVectorSupport()) return buildClassicSprites();
    const C = BC.THEMES.wwii;
    const cache = {};

    cache.brickFull = makeBrick64(C.BRICK_MORTAR, (g, x, y, w, h, i) => {
      const gr = g.createLinearGradient(x, y, x, y + h);
      gr.addColorStop(0, i % 2 === 0 ? C.BRICK_LIGHT : '#A85742');
      gr.addColorStop(0.6, C.BRICK_MID);
      gr.addColorStop(1, C.BRICK_DARK);
      g.fillStyle = gr;
      g.fillRect(x + 1, y + 1, w - 2, h - 2);
      g.fillStyle = 'rgba(0, 0, 0, 0.25)';
      g.fillRect(x + 1, y + h - 3, w - 2, 2);
    });

    // Riveted dark bunker steel + I-beam cross
    const st = createCanvas(64, 64);
    const sg = st.getContext('2d');
    const sgGrad = sg.createLinearGradient(0, 0, 64, 64);
    sgGrad.addColorStop(0, C.STEEL_LIGHT);
    sgGrad.addColorStop(0.5, C.STEEL_MID);
    sgGrad.addColorStop(1, C.STEEL_DARK);
    sg.fillStyle = sgGrad;
    sg.fillRect(1, 1, 62, 62);
    sg.strokeStyle = '#1E2124'; sg.lineWidth = 3;
    sg.strokeRect(2, 2, 60, 60);
    sg.strokeStyle = 'rgba(20, 22, 24, 0.55)'; sg.lineWidth = 4;
    sg.beginPath(); sg.moveTo(8, 8); sg.lineTo(56, 56); sg.moveTo(56, 8); sg.lineTo(8, 56); sg.stroke();
    sg.fillStyle = C.STEEL_CORE;
    for (const [rx, ry] of [[8, 8], [56, 8], [8, 56], [56, 56]]) {
      sg.beginPath(); sg.arc(rx, ry, 3.5, 0, Math.PI * 2); sg.fill();
    }
    cache.steel = st;

    // Realistic dark pine forest canopy
    const fo = createCanvas(64, 64);
    const fg = fo.getContext('2d');
    for (const [cx, cy, r, col] of [
      [32, 32, 27, C.FOREST_DARK], [16, 18, 19, C.FOREST_DARK], [48, 20, 19, C.FOREST_DARK],
      [18, 48, 19, C.FOREST_DARK], [46, 46, 19, C.FOREST_DARK],
      [22, 22, 15, C.FOREST_MID], [44, 24, 14, C.FOREST_MID], [32, 42, 15, C.FOREST_MID],
      [20, 18, 8, C.FOREST_LIGHT], [42, 20, 7, C.FOREST_LIGHT], [30, 38, 7, C.FOREST_LIGHT],
    ]) {
      fg.fillStyle = col;
      fg.beginPath(); fg.arc(cx, cy, r, 0, Math.PI * 2); fg.fill();
    }
    cache.forest = fo;

    // Muddy realistic river
    cache.water = [0, 1].map((f) => {
      const w = createCanvas(64, 64);
      const wg = w.getContext('2d');
      wg.fillStyle = C.WATER_DARK; wg.fillRect(0, 0, 64, 64);
      const off = f * 16;
      wg.strokeStyle = C.WATER_MID; wg.lineWidth = 3;
      for (const wy of [16, 36, 54]) {
        wg.beginPath();
        wg.moveTo(-16 + off, wy); wg.quadraticCurveTo(8 + off, wy - 4, 32 + off, wy);
        wg.quadraticCurveTo(56 + off, wy + 4, 80 + off, wy);
        wg.stroke();
      }
      wg.strokeStyle = C.WATER_LIGHT; wg.lineWidth = 1.5;
      wg.beginPath(); wg.moveTo(10 + off * 0.5, 22); wg.lineTo(28 + off * 0.5, 22);
      wg.moveTo(30 - off * 0.4, 46); wg.lineTo(50 - off * 0.4, 46); wg.stroke();
      return w;
    });

    // Frozen tundra ice
    const ic = createCanvas(64, 64);
    const ig = ic.getContext('2d');
    const igGrad = ig.createLinearGradient(0, 0, 64, 64);
    igGrad.addColorStop(0, C.ICE_LIGHT); igGrad.addColorStop(0.6, C.ICE_MID); igGrad.addColorStop(1, C.ICE_DARK);
    ig.fillStyle = igGrad; ig.fillRect(0, 0, 64, 64);
    ig.strokeStyle = 'rgba(255,255,255,0.6)'; ig.lineWidth = 1.5;
    ig.beginPath(); ig.moveTo(8, 52); ig.lineTo(28, 30); ig.lineTo(54, 14); ig.stroke();
    cache.ice = ic;

    // Sandbag & Command Star HQ
    const ea = createCanvas(128, 128);
    const eg = ea.getContext('2d');
    eg.fillStyle = '#3B3428';
    roundRectPath(eg, 14, 14, 100, 100, 16); eg.fill();
    eg.strokeStyle = '#1E1B14'; eg.lineWidth = 4; eg.stroke();
    // Sandbags rim
    eg.fillStyle = '#9E8C68';
    for (const [bx, by] of [[24, 18], [52, 18], [80, 18], [24, 94], [52, 94], [80, 94], [18, 42], [18, 68], [94, 42], [94, 68]]) {
      roundRectPath(eg, bx, by, 22, 14, 5); eg.fill(); eg.stroke();
    }
    eg.fillStyle = '#E8DCB5';
    drawFourPointStar(eg, 64, 64, 24, 9); eg.fill(); eg.stroke();
    cache.eagleAlive = ea;

    const ed = createCanvas(128, 128);
    const edg = ed.getContext('2d');
    edg.fillStyle = '#24201A'; roundRectPath(edg, 18, 18, 92, 92, 14); edg.fill();
    edg.fillStyle = '#4A4338';
    for (const [rx, ry] of [[28, 34], [68, 42], [36, 70], [72, 74]]) {
      edg.fillRect(rx, ry, 24, 16);
    }
    edg.fillStyle = '#E05A47';
    edg.beginPath(); edg.arc(60, 62, 7, 0, Math.PI * 2); edg.fill();
    cache.eagleDead = ed;

    cache.bullets = makeRoundBullet('#FFD87A', 'rgba(255, 130, 40, 0.7)');
    cache.spawnStars = makeReticleSpawns('#EFE7D0', '#D9A754');
    cache.shield = makeCircleShield('#EFE7D0', '#D9A754');
    cache.powerups = makePowerUpCards('#363B30', '#1E221A', '#9E936E', {
      [BC.POWERUP.HELMET]: '#A8C49A',
      [BC.POWERUP.CLOCK]: '#DFC98A',
      [BC.POWERUP.SHOVEL]: '#C4B382',
      [BC.POWERUP.STAR]: '#F5D86E',
      [BC.POWERUP.GRENADE]: '#D97254',
      [BC.POWERUP.TANK]: '#E8DCB5',
    }, drawWWIITankHD, C.P1);

    const he = createCanvas(64, 64);
    const heg = he.getContext('2d');
    heg.fillStyle = '#9E936E'; heg.strokeStyle = '#171914'; heg.lineWidth = 4;
    roundRectPath(heg, 12, 16, 40, 34, 6); heg.fill(); heg.stroke();
    heg.fillStyle = '#EFE7D0'; heg.fillRect(28, 8, 8, 14);
    cache.hudEnemy = he;

    const hl = createCanvas(64, 64);
    hl.getContext('2d').drawImage(drawWWIITankHD('P0', C.P1, 0, 0), 4, 4, 56, 56);
    cache.hudLife = hl;

    const fl = createCanvas(128, 128);
    const flg = fl.getContext('2d');
    flg.fillStyle = '#9E936E'; flg.fillRect(20, 16, 8, 96);
    flg.fillStyle = '#C84232'; flg.strokeStyle = '#EFE7D0'; flg.lineWidth = 4;
    flg.beginPath(); flg.moveTo(28, 20); flg.lineTo(106, 44); flg.lineTo(28, 68); flg.closePath(); flg.fill(); flg.stroke();
    cache.flag = fl;

    return cache;
  }

  function drawWWIIExplosion(ctx, cx, cy, frame, isBig) {
    ctx.save();
    if (!isBig) {
      const r = [5, 8.5, 9.5][Math.min(2, frame)];
      const alpha = frame === 2 ? 0.5 : 1.0;
      ctx.fillStyle = `rgba(55, 50, 45, ${0.7 * alpha})`;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      if (frame < 2) {
        ctx.fillStyle = frame === 0 ? '#FFF6D6' : '#F08832';
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      return;
    }
    const r = [7, 13, 17, 20, 16][Math.min(4, frame)];
    const alpha = frame >= 3 ? (frame === 3 ? 0.8 : 0.45) : 1.0;
    // Smoke billow
    ctx.fillStyle = `rgba(42, 38, 34, ${alpha * 0.85})`;
    ctx.beginPath(); ctx.arc(cx - 2, cy - 2, r * 1.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 3, cy + 2, r * 0.85, 0, Math.PI * 2); ctx.fill();
    if (frame <= 3) {
      ctx.fillStyle = `rgba(224, 90, 42, ${alpha})`;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2); ctx.fill();
    }
    if (frame <= 2) {
      ctx.fillStyle = '#FFE488';
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // =========================================================================
  // 2. METAL SLUG HEAVY PAINTED ARCADE SKIN (`metalslug`)
  // =========================================================================
  function drawMetalSlugTankHD(designKey, pal, dir, frame) {
    const SZ = 128;
    const c = createCanvas(SZ, SZ);
    const g = c.getContext('2d');
    if (typeof g.beginPath !== 'function') return c;

    const [cDark, cMid, cLight, cCore] = pal;
    const isPlayer = designKey.startsWith('P');
    const tierOrType = parseInt(designKey[1], 10) || 0;

    g.save();
    g.translate(SZ / 2, SZ / 2);
    g.rotate((dir * Math.PI) / 2);
    g.translate(-SZ / 2, -SZ / 2);

    // Chunky shadow
    g.fillStyle = 'rgba(0,0,0,0.48)';
    roundRectPath(g, 10, 22, 108, 96, 18); g.fill();

    // Thick comic treads with big drive sprockets
    const tw = 24;
    for (const tx of [8, 96]) {
      g.fillStyle = '#2B2B33';
      roundRectPath(g, tx, 16, tw, 96, 10); g.fill();
      const sh = (frame & 1) * 8;
      for (let py = 20 + sh; py < 106; py += 16) {
        g.fillStyle = '#6E7385';
        roundRectPath(g, tx + 3, py, tw - 6, 9, 3); g.fill();
      }
      g.lineWidth = 5; g.strokeStyle = '#121016';
      roundRectPath(g, tx, 16, tw, 96, 10); g.stroke();
    }

    // Twin protruding side exhaust pipes (Metal Slug signature!)
    g.fillStyle = '#7A422B';
    g.strokeStyle = '#121016';
    g.lineWidth = 4;
    roundRectPath(g, 24, 88, 12, 26, 4); g.fill(); g.stroke();
    roundRectPath(g, 92, 88, 12, 26, 4); g.fill(); g.stroke();

    // Rounded bulbous SV-001 hull
    const hg = g.createLinearGradient(28, 22, 100, 108);
    hg.addColorStop(0, cLight); hg.addColorStop(0.5, cMid); hg.addColorStop(1, cDark);
    g.fillStyle = hg;
    roundRectPath(g, 28, 22, 72, 86, 18); g.fill();
    g.lineWidth = 5; g.strokeStyle = '#121016'; g.stroke();

    // Big rivets
    g.fillStyle = '#FFF5D6';
    for (const [rx, ry] of [[36, 30], [92, 30], [36, 98], [92, 98]]) {
      g.beginPath(); g.arc(rx, ry, 3, 0, Math.PI * 2); g.fill();
    }

    // Fat heavy comic cannon barrel
    const bw = (isPlayer && tierOrType >= 2) || (!isPlayer && tierOrType >= 2) ? 16 : 13;
    const bTop = isPlayer && tierOrType >= 1 ? 2 : 7;
    g.fillStyle = cLight;
    roundRectPath(g, 64 - bw / 2, bTop, bw, 56 - bTop, 5); g.fill();
    g.lineWidth = 4.5; g.strokeStyle = '#121016'; g.stroke();
    g.fillStyle = cDark;
    roundRectPath(g, 64 - bw * 0.72, bTop, bw * 1.44, 12, 4); g.fill(); g.stroke();

    // Rounded comic turret dome + glossy reflection spot
    const tr = designKey === 'E3' || (isPlayer && tierOrType === 3) ? 28 : 24;
    const tg = g.createRadialGradient(54, 56, 4, 64, 66, tr);
    tg.addColorStop(0, '#FFFFFF'); tg.addColorStop(0.25, cLight); tg.addColorStop(0.75, cMid); tg.addColorStop(1, cDark);
    g.fillStyle = tg;
    g.beginPath(); g.arc(64, 66, tr, 0, Math.PI * 2); g.fill();
    g.lineWidth = 5; g.strokeStyle = '#121016'; g.stroke();

    // Cupola hatch
    g.fillStyle = cCore || '#FFD94A';
    g.beginPath(); g.arc(64, 66, 9, 0, Math.PI * 2); g.fill();
    g.lineWidth = 3; g.stroke();

    g.restore();
    return c;
  }

  function buildMetalSlugSprites() {
    if (!hasVectorSupport()) return buildClassicSprites();
    const C = BC.THEMES.metalslug;
    const cache = {};

    cache.brickFull = makeBrick64(C.BRICK_MORTAR, (g, x, y, w, h) => {
      const gr = g.createLinearGradient(x, y, x, y + h);
      gr.addColorStop(0, C.BRICK_LIGHT); gr.addColorStop(0.55, C.BRICK_MID); gr.addColorStop(1, C.BRICK_DARK);
      g.fillStyle = gr;
      roundRectPath(g, x + 1, y + 1, w - 2, h - 2, 4); g.fill();
      g.fillStyle = 'rgba(255,240,200,0.4)'; g.fillRect(x + 3, y + 2, w - 6, 3);
      g.lineWidth = 2.5; g.strokeStyle = '#1C1110'; g.stroke();
    });

    // Iconic Hazard-Striped Heavy Steel
    const st = createCanvas(64, 64);
    const sg = st.getContext('2d');
    sg.fillStyle = C.STEEL_MID; roundRectPath(sg, 1, 1, 62, 62, 6); sg.fill();
    sg.save();
    roundRectPath(sg, 4, 4, 56, 56, 4); sg.clip();
    sg.fillStyle = C.STEEL_LIGHT;
    for (let sx = -64; sx < 128; sx += 20) {
      sg.beginPath(); sg.moveTo(sx, 64); sg.lineTo(sx + 10, 64); sg.lineTo(sx + 42, 0); sg.lineTo(sx + 32, 0); sg.closePath(); sg.fill();
    }
    sg.fillStyle = C.STEEL_DARK;
    roundRectPath(sg, 12, 12, 40, 40, 4); sg.fill();
    sg.restore();
    sg.lineWidth = 4; sg.strokeStyle = '#121016';
    roundRectPath(sg, 2, 2, 60, 60, 6); sg.stroke();
    sg.strokeRect(12, 12, 40, 40);
    cache.steel = st;

    // Thick comic jungle foliage
    const fo = createCanvas(64, 64);
    const fg = fo.getContext('2d');
    for (const [cx, cy, r, col] of [
      [32, 32, 26, C.FOREST_DARK], [16, 18, 18, C.FOREST_DARK], [48, 20, 18, C.FOREST_DARK],
      [18, 48, 18, C.FOREST_DARK], [46, 46, 18, C.FOREST_DARK],
      [22, 22, 15, C.FOREST_MID], [42, 22, 14, C.FOREST_MID], [32, 42, 15, C.FOREST_MID],
      [18, 16, 8, C.FOREST_LIGHT], [40, 18, 8, C.FOREST_LIGHT], [30, 36, 8, C.FOREST_LIGHT],
    ]) {
      fg.fillStyle = col; fg.beginPath(); fg.arc(cx, cy, r, 0, Math.PI * 2); fg.fill();
    }
    cache.forest = fo;

    cache.water = [0, 1].map((f) => {
      const w = createCanvas(64, 64);
      const wg = w.getContext('2d');
      wg.fillStyle = C.WATER_DARK; wg.fillRect(0, 0, 64, 64);
      const off = f * 16;
      wg.strokeStyle = C.WATER_MID; wg.lineWidth = 5;
      for (const wy of [16, 36, 54]) {
        wg.beginPath();
        wg.moveTo(-16 + off, wy); wg.quadraticCurveTo(8 + off, wy - 7, 32 + off, wy);
        wg.quadraticCurveTo(56 + off, wy + 7, 80 + off, wy); wg.stroke();
      }
      wg.strokeStyle = C.WATER_LIGHT; wg.lineWidth = 2.5;
      wg.beginPath(); wg.moveTo(8 + off * 0.5, 14); wg.lineTo(26 + off * 0.5, 14); wg.stroke();
      return w;
    });

    const ic = createCanvas(64, 64);
    const ig = ic.getContext('2d');
    const igG = ig.createLinearGradient(0, 0, 64, 64);
    igG.addColorStop(0, C.ICE_LIGHT); igG.addColorStop(0.55, C.ICE_MID); igG.addColorStop(1, C.ICE_DARK);
    ig.fillStyle = igG; ig.fillRect(0, 0, 64, 64);
    ig.fillStyle = 'rgba(255,255,255,0.5)';
    ig.beginPath(); ig.moveTo(0, 24); ig.lineTo(24, 0); ig.lineTo(40, 0); ig.lineTo(0, 40); ig.closePath(); ig.fill();
    ig.strokeStyle = '#1C2E40'; ig.lineWidth = 2; ig.strokeRect(1, 1, 62, 62);
    cache.ice = ic;

    const ea = createCanvas(128, 128);
    const eg = ea.getContext('2d');
    eg.fillStyle = '#474F5E'; eg.strokeStyle = '#121016'; eg.lineWidth = 5;
    roundRectPath(eg, 14, 14, 100, 100, 18); eg.fill(); eg.stroke();
    eg.fillStyle = '#FFD94A';
    drawFourPointStar(eg, 64, 64, 34, 14); eg.fill(); eg.stroke();
    cache.eagleAlive = ea;

    const ed = createCanvas(128, 128);
    const edg = ed.getContext('2d');
    edg.fillStyle = '#2B282E'; edg.strokeStyle = '#121016'; edg.lineWidth = 5;
    roundRectPath(edg, 18, 18, 92, 92, 14); edg.fill(); edg.stroke();
    edg.fillStyle = '#FF5438';
    edg.beginPath(); edg.arc(64, 64, 10, 0, Math.PI * 2); edg.fill();
    cache.eagleDead = ed;

    cache.bullets = makeRoundBullet('#FFE46B', 'rgba(255, 84, 56, 0.75)');
    cache.spawnStars = makeReticleSpawns('#FFE875', '#FF5438');
    cache.shield = makeCircleShield('#FFE875', '#4FF0FF');
    cache.powerups = makePowerUpCards('#3B323D', '#1D1820', '#E09A38', {
      [BC.POWERUP.HELMET]: '#4FF0FF',
      [BC.POWERUP.CLOCK]: '#FFE46B',
      [BC.POWERUP.SHOVEL]: '#E87E45',
      [BC.POWERUP.STAR]: '#FFD94A',
      [BC.POWERUP.GRENADE]: '#FF5438',
      [BC.POWERUP.TANK]: '#F5E18E',
    }, drawMetalSlugTankHD, C.P1);

    const he = createCanvas(64, 64);
    const heg = he.getContext('2d');
    heg.fillStyle = '#E09A38'; heg.strokeStyle = '#121016'; heg.lineWidth = 4.5;
    roundRectPath(heg, 12, 16, 40, 34, 8); heg.fill(); heg.stroke();
    heg.fillStyle = '#FFF6DE'; heg.fillRect(28, 8, 8, 14);
    cache.hudEnemy = he;

    const hl = createCanvas(64, 64);
    hl.getContext('2d').drawImage(drawMetalSlugTankHD('P0', C.P1, 0, 0), 4, 4, 56, 56);
    cache.hudLife = hl;

    const fl = createCanvas(128, 128);
    const flg = fl.getContext('2d');
    flg.fillStyle = '#E09A38'; flg.fillRect(20, 16, 9, 96);
    flg.fillStyle = '#FF5438'; flg.strokeStyle = '#121016'; flg.lineWidth = 5;
    flg.beginPath(); flg.moveTo(29, 20); flg.lineTo(110, 44); flg.lineTo(29, 70); flg.closePath(); flg.fill(); flg.stroke();
    cache.flag = fl;

    return cache;
  }

  function drawMetalSlugExplosion(ctx, cx, cy, frame, isBig) {
    ctx.save();
    if (!isBig) {
      const r = [5.5, 9, 10][Math.min(2, frame)];
      const alpha = frame === 2 ? 0.55 : 1.0;
      ctx.strokeStyle = `rgba(18, 16, 22, ${alpha})`;
      ctx.lineWidth = 1.6;
      ctx.fillStyle = frame === 0 ? `rgba(255, 240, 140, ${alpha})` : `rgba(255, 110, 40, ${alpha})`;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      return;
    }
    const r = [7, 13, 18, 21, 16][Math.min(4, frame)];
    const alpha = frame >= 3 ? (frame === 3 ? 0.85 : 0.45) : 1.0;
    ctx.strokeStyle = `rgba(18, 16, 22, ${alpha})`;
    ctx.lineWidth = 1.8;
    ctx.fillStyle = `rgba(255, 84, 56, ${alpha})`;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (frame <= 3) {
      ctx.fillStyle = `rgba(255, 217, 74, ${alpha})`;
      ctx.beginPath(); ctx.arc(cx - 2, cy - 2, r * 0.65, 0, Math.PI * 2); ctx.fill();
    }
    if (frame <= 1) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // =========================================================================
  // 3. MODERN DIGITAL CAMO WARFARE SKIN (`modern`)
  // =========================================================================
  function drawModernTankHD(designKey, pal, dir, frame) {
    const SZ = 128;
    const c = createCanvas(SZ, SZ);
    const g = c.getContext('2d');
    if (typeof g.beginPath !== 'function') return c;

    const [cDark, cMid, cLight, cOptic] = pal;
    const isPlayer = designKey.startsWith('P');
    const tierOrType = parseInt(designKey[1], 10) || 0;

    g.save();
    g.translate(SZ / 2, SZ / 2);
    g.rotate((dir * Math.PI) / 2);
    g.translate(-SZ / 2, -SZ / 2);

    // Shadow
    g.fillStyle = 'rgba(0,0,0,0.45)';
    roundRectPath(g, 14, 22, 100, 96, 8); g.fill();

    // Composite rubber-pad treads
    const tw = 20;
    for (const tx of [12, 96]) {
      g.fillStyle = '#181C22';
      g.fillRect(tx, 16, tw, 98);
      const sh = (frame & 1) * 7;
      for (let py = 18 + sh; py < 110; py += 14) {
        g.fillStyle = '#333A47';
        g.fillRect(tx + 2, py, tw - 4, 6);
      }
      g.lineWidth = 3; g.strokeStyle = '#0D1014';
      g.strokeRect(tx, 16, tw, 98);
    }

    // Modern rectangular Abrams hull + Digital Camo Pixels
    const hullX = 28;
    const hullW = 72;
    g.fillStyle = cMid;
    octagonPath(g, hullX, 18, hullW, 94, 8); g.fill();

    // Digital pixel camo patches
    g.fillStyle = cDark;
    for (const [cx, cy, cw, ch] of [[34, 26, 16, 12], [68, 32, 18, 10], [42, 78, 22, 14], [72, 86, 16, 12]]) {
      g.fillRect(cx, cy, cw, ch);
    }
    g.fillStyle = cLight;
    for (const [cx, cy, cw, ch] of [[52, 24, 14, 8], [32, 54, 12, 14], [78, 50, 14, 16]]) {
      g.fillRect(cx, cy, cw, ch);
    }

    // ERA reactive armor blocks for upgraded / heavy tanks
    if ((isPlayer && tierOrType >= 2) || (!isPlayer && tierOrType === 3)) {
      g.fillStyle = cLight;
      for (let ey = 28; ey <= 82; ey += 18) {
        g.fillRect(hullX - 4, ey, 6, 12);
        g.fillRect(hullX + hullW - 2, ey, 6, 12);
      }
    }

    g.lineWidth = 3.5; g.strokeStyle = '#0E1218';
    octagonPath(g, hullX, 18, hullW, 94, 8); g.stroke();

    // Long 120mm smoothbore gun + bore evacuator
    const bw = (isPlayer && tierOrType === 3) || (!isPlayer && tierOrType === 3) ? 10 : 8;
    const bTop = isPlayer && tierOrType >= 1 ? 0 : 6;
    g.fillStyle = cMid;
    g.fillRect(64 - bw / 2, bTop, bw, 58 - bTop);
    g.fillStyle = cLight;
    g.fillRect(64 - bw * 0.8, 24, bw * 1.6, 12); // bore evacuator
    g.lineWidth = 3; g.strokeStyle = '#0E1218';
    g.strokeRect(64 - bw / 2, bTop, bw, 58 - bTop);

    // Angular Wedge Composite Turret (Abrams/ZTZ-99 style)
    g.fillStyle = cMid;
    g.beginPath();
    g.moveTo(50, 40); g.lineTo(78, 40);
    g.lineTo(92, 66); g.lineTo(84, 92);
    g.lineTo(44, 92); g.lineTo(36, 66);
    g.closePath();
    g.fill();

    // Turret digital camo accent & top highlight wedge
    g.fillStyle = cLight;
    g.beginPath(); g.moveTo(52, 42); g.lineTo(76, 42); g.lineTo(84, 60); g.lineTo(44, 60); g.closePath(); g.fill();
    g.fillStyle = cDark;
    g.fillRect(48, 72, 16, 14);

    g.lineWidth = 3.5; g.strokeStyle = '#0E1218';
    g.beginPath();
    g.moveTo(50, 40); g.lineTo(78, 40);
    g.lineTo(92, 66); g.lineTo(84, 92);
    g.lineTo(44, 92); g.lineTo(36, 66);
    g.closePath();
    g.stroke();

    // Thermal Laser Sight Optic
    g.fillStyle = cOptic || '#4CE8FF';
    g.fillRect(70, 50, 10, 6);
    g.strokeRect(70, 50, 10, 6);

    g.restore();
    return c;
  }

  function buildModernSprites() {
    if (!hasVectorSupport()) return buildClassicSprites();
    const C = BC.THEMES.modern;
    const cache = {};

    cache.brickFull = makeBrick64(C.BRICK_MORTAR, (g, x, y, w, h) => {
      g.fillStyle = C.BRICK_MID; g.fillRect(x + 1, y + 1, w - 2, h - 2);
      g.fillStyle = C.BRICK_LIGHT; g.fillRect(x + 2, y + 2, w - 4, 3);
      g.fillStyle = C.BRICK_DARK; g.fillRect(x + 4, y + 7, w - 8, 4);
      g.strokeStyle = '#1E2126'; g.lineWidth = 1.5; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    });

    // Reinforced concrete & red beacon blast wall
    const st = createCanvas(64, 64);
    const sg = st.getContext('2d');
    sg.fillStyle = C.STEEL_MID; sg.fillRect(1, 1, 62, 62);
    sg.strokeStyle = C.STEEL_LIGHT; sg.lineWidth = 3; sg.strokeRect(4, 4, 56, 56);
    sg.strokeStyle = C.STEEL_DARK; sg.lineWidth = 3;
    sg.beginPath(); sg.moveTo(8, 32); sg.lineTo(56, 32); sg.moveTo(32, 8); sg.lineTo(32, 56); sg.stroke();
    sg.fillStyle = C.STEEL_CORE;
    sg.beginPath(); sg.arc(32, 32, 6, 0, Math.PI * 2); sg.fill();
    cache.steel = st;

    const fo = createCanvas(64, 64);
    const fg = fo.getContext('2d');
    for (const [cx, cy, r, col] of [
      [32, 32, 26, C.FOREST_DARK], [16, 18, 18, C.FOREST_DARK], [48, 20, 18, C.FOREST_DARK],
      [18, 48, 18, C.FOREST_DARK], [46, 46, 18, C.FOREST_DARK],
      [22, 22, 14, C.FOREST_MID], [42, 24, 14, C.FOREST_MID], [32, 42, 14, C.FOREST_MID],
      [20, 18, 7, C.FOREST_LIGHT], [40, 20, 7, C.FOREST_LIGHT],
    ]) {
      fg.fillStyle = col; fg.beginPath(); fg.arc(cx, cy, r, 0, Math.PI * 2); fg.fill();
    }
    cache.forest = fo;

    cache.water = [0, 1].map((f) => {
      const w = createCanvas(64, 64);
      const wg = w.getContext('2d');
      wg.fillStyle = C.WATER_DARK; wg.fillRect(0, 0, 64, 64);
      const off = f * 16;
      wg.strokeStyle = C.WATER_MID; wg.lineWidth = 3;
      for (const wy of [16, 36, 54]) {
        wg.beginPath(); wg.moveTo(-16 + off, wy); wg.lineTo(16 + off, wy - 4); wg.lineTo(48 + off, wy + 4); wg.lineTo(80 + off, wy); wg.stroke();
      }
      wg.fillStyle = C.WATER_LIGHT;
      wg.fillRect((10 + off) % 52, 18, 10, 2);
      return w;
    });

    const ic = createCanvas(64, 64);
    const ig = ic.getContext('2d');
    ig.fillStyle = C.ICE_MID; ig.fillRect(0, 0, 64, 64);
    ig.fillStyle = C.ICE_LIGHT; ig.fillRect(4, 4, 24, 6); ig.fillRect(34, 44, 22, 6);
    ig.strokeStyle = C.ICE_DARK; ig.lineWidth = 2; ig.strokeRect(1, 1, 62, 62);
    cache.ice = ic;

    // Tactical Radar Command HQ
    const ea = createCanvas(128, 128);
    const eg = ea.getContext('2d');
    eg.fillStyle = '#1B2430'; eg.strokeStyle = '#6DA4C4'; eg.lineWidth = 4;
    octagonPath(eg, 12, 12, 104, 104, 20); eg.fill(); eg.stroke();
    eg.strokeStyle = 'rgba(106, 212, 255, 0.45)'; eg.lineWidth = 2.5;
    eg.beginPath(); eg.arc(64, 64, 34, 0, Math.PI * 2); eg.stroke();
    eg.beginPath(); eg.moveTo(22, 64); eg.lineTo(106, 64); eg.moveTo(64, 22); eg.lineTo(64, 106); eg.stroke();
    eg.fillStyle = '#6AD4FF';
    drawFourPointStar(eg, 64, 64, 18, 6); eg.fill();
    cache.eagleAlive = ea;

    const ed = createCanvas(128, 128);
    const edg = ed.getContext('2d');
    edg.fillStyle = '#181B20'; edg.strokeStyle = '#404854'; edg.lineWidth = 4;
    octagonPath(edg, 16, 16, 96, 96, 18); edg.fill(); edg.stroke();
    edg.fillStyle = '#FF5252';
    edg.beginPath(); edg.arc(64, 64, 8, 0, Math.PI * 2); edg.fill();
    cache.eagleDead = ed;

    cache.bullets = makeRoundBullet('#BEE6FF', 'rgba(106, 212, 255, 0.7)');
    cache.spawnStars = makeReticleSpawns('#6AD4FF', '#F5B841');
    cache.shield = makeCircleShield('#6AD4FF', '#BEE6FF');
    cache.powerups = makePowerUpCards('#1C2430', '#10151D', '#6DA4C4', {
      [BC.POWERUP.HELMET]: '#6AD4FF',
      [BC.POWERUP.CLOCK]: '#BEE6FF',
      [BC.POWERUP.SHOVEL]: '#F5B841',
      [BC.POWERUP.STAR]: '#F5B841',
      [BC.POWERUP.GRENADE]: '#FF5252',
      [BC.POWERUP.TANK]: '#D6C49C',
    }, drawModernTankHD, C.P1);

    const he = createCanvas(64, 64);
    const heg = he.getContext('2d');
    heg.fillStyle = '#6DA4C4'; heg.strokeStyle = '#0D1016'; heg.lineWidth = 4;
    octagonPath(heg, 12, 16, 40, 34, 8); heg.fill(); heg.stroke();
    heg.fillStyle = '#E4EFF7'; heg.fillRect(28, 8, 8, 14);
    cache.hudEnemy = he;

    const hl = createCanvas(64, 64);
    hl.getContext('2d').drawImage(drawModernTankHD('P0', C.P1, 0, 0), 4, 4, 56, 56);
    cache.hudLife = hl;

    const fl = createCanvas(128, 128);
    const flg = fl.getContext('2d');
    flg.fillStyle = '#8CA0B8'; flg.fillRect(20, 16, 8, 96);
    flg.fillStyle = '#FF5252'; flg.strokeStyle = '#E4EFF7'; flg.lineWidth = 3.5;
    flg.beginPath(); flg.moveTo(28, 20); flg.lineTo(106, 44); flg.lineTo(28, 68); flg.closePath(); flg.fill(); flg.stroke();
    cache.flag = fl;

    return cache;
  }

  function drawModernExplosion(ctx, cx, cy, frame, isBig) {
    ctx.save();
    if (!isBig) {
      const r = [5, 9, 10.5][Math.min(2, frame)];
      const alpha = frame === 2 ? 0.5 : 1.0;
      ctx.strokeStyle = `rgba(220, 240, 255, ${alpha * 0.85})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      if (frame < 2) {
        ctx.fillStyle = frame === 0 ? '#FFFFFF' : '#F5B841';
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      return;
    }
    const r = [7, 13, 18, 21, 16][Math.min(4, frame)];
    const alpha = frame >= 3 ? (frame === 3 ? 0.8 : 0.4) : 1.0;
    ctx.strokeStyle = `rgba(220, 235, 245, ${alpha * 0.75})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(255, 110, 60, ${alpha})`;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2); ctx.fill();
    if (frame <= 2) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // =========================================================================
  // 4. VINTAGE TABLETOP WAR MAP / MINIATURE TOKEN SKIN (`wartable`)
  // =========================================================================
  function drawWarTableTankHD(designKey, pal, dir, frame) {
    const SZ = 128;
    const c = createCanvas(SZ, SZ);
    const g = c.getContext('2d');
    if (typeof g.beginPath !== 'function') return c;

    const [cDark, cMid, cLight, cBadge] = pal;
    const isPlayer = designKey.startsWith('P');
    const tierOrType = parseInt(designKey[1], 10) || 0;

    // Long 45-degree cast tabletop drop shadow (unrotated light source top-left!)
    g.fillStyle = 'rgba(42, 26, 12, 0.35)';
    g.beginPath();
    g.ellipse(72, 74, 46, 46, 0, 0, Math.PI * 2);
    g.fill();

    // Circular wooden / brass tabletop miniature pedestal base
    const baseGrad = g.createLinearGradient(16, 16, 112, 112);
    baseGrad.addColorStop(0, isPlayer ? '#E8C988' : '#7A6852');
    baseGrad.addColorStop(1, isPlayer ? '#7D5822' : '#33281D');
    g.fillStyle = baseGrad;
    g.beginPath(); g.arc(64, 64, 48, 0, Math.PI * 2); g.fill();
    g.lineWidth = 3.5; g.strokeStyle = '#24170D'; g.stroke();

    // Miniature sculpted die-cast tank resting on top of token base
    g.save();
    g.translate(SZ / 2, SZ / 2);
    g.rotate((dir * Math.PI) / 2);
    g.translate(-SZ / 2, -SZ / 2);

    const shift = (frame & 1) * 4;
    for (const tx of [22, 88]) {
      g.fillStyle = cDark;
      roundRectPath(g, tx, 28, 18, 74, 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.22)';
      for (let py = 32 + shift; py < 96; py += 12) {
        g.fillRect(tx + 3, py, 12, 4);
      }
      g.lineWidth = 2.5; g.strokeStyle = '#1E140B';
      roundRectPath(g, tx, 28, 18, 74, 4); g.stroke();
    }

    const hg = g.createLinearGradient(34, 30, 94, 98);
    hg.addColorStop(0, cLight); hg.addColorStop(0.55, cMid); hg.addColorStop(1, cDark);
    g.fillStyle = hg;
    roundRectPath(g, 34, 30, 60, 70, 8); g.fill();
    g.lineWidth = 3; g.strokeStyle = '#1E140B'; g.stroke();

    // Cast metal miniature barrel
    const bw = (isPlayer && tierOrType === 3) || (!isPlayer && tierOrType === 3) ? 10 : 8;
    const bTop = isPlayer && tierOrType >= 1 ? 8 : 14;
    g.fillStyle = cLight;
    roundRectPath(g, 64 - bw / 2, bTop, bw, 50 - bTop, 3); g.fill();
    g.lineWidth = 2.5; g.stroke();

    // Sculpted turret
    const tr = designKey === 'E3' || (isPlayer && tierOrType === 3) ? 20 : 17;
    const tg = g.createRadialGradient(58, 58, 2, 64, 64, tr);
    tg.addColorStop(0, '#FFF8DF'); tg.addColorStop(0.3, cLight); tg.addColorStop(0.8, cMid); tg.addColorStop(1, cDark);
    g.fillStyle = tg;
    g.beginPath(); g.arc(64, 64, tr, 0, Math.PI * 2); g.fill();
    g.lineWidth = 3; g.stroke();

    g.fillStyle = cBadge || '#FFF4CE';
    drawFourPointStar(g, 64, 64, 7, 3); g.fill();

    g.restore();
    return c;
  }

  function buildWarTableSprites() {
    if (!hasVectorSupport()) return buildClassicSprites();
    const C = BC.THEMES.wartable;
    const cache = {};

    // Cork / Painted wood blocks with subtle cast shadow
    cache.brickFull = makeBrick64('#7D5836', (g, x, y, w, h) => {
      const gr = g.createLinearGradient(x, y, x, y + h);
      gr.addColorStop(0, C.BRICK_LIGHT); gr.addColorStop(0.6, C.BRICK_MID); gr.addColorStop(1, C.BRICK_DARK);
      g.fillStyle = gr;
      roundRectPath(g, x + 1, y + 1, w - 2, h - 2, 3); g.fill();
      g.lineWidth = 1.5; g.strokeStyle = '#381B10'; g.stroke();
    });

    // Brushed pewter / cast-iron tabletop barrier blocks
    const st = createCanvas(64, 64);
    const sg = st.getContext('2d');
    sg.fillStyle = 'rgba(42, 26, 12, 0.35)'; sg.fillRect(5, 5, 58, 58);
    const sgG = sg.createLinearGradient(0, 0, 60, 60);
    sgG.addColorStop(0, C.STEEL_LIGHT); sgG.addColorStop(0.55, C.STEEL_MID); sgG.addColorStop(1, C.STEEL_DARK);
    sg.fillStyle = sgG; roundRectPath(sg, 2, 2, 56, 56, 6); sg.fill();
    sg.lineWidth = 3; sg.strokeStyle = '#242830'; sg.stroke();
    sg.fillStyle = C.STEEL_CORE;
    sg.beginPath(); sg.arc(30, 30, 6, 0, Math.PI * 2); sg.fill();
    cache.steel = st;

    // Miniature felt tree tokens
    const fo = createCanvas(64, 64);
    const fg = fo.getContext('2d');
    fg.fillStyle = 'rgba(42, 26, 12, 0.25)';
    fg.beginPath(); fg.arc(36, 36, 25, 0, Math.PI * 2); fg.fill();
    for (const [cx, cy, r, col] of [
      [32, 32, 24, C.FOREST_DARK], [20, 22, 14, C.FOREST_MID], [42, 24, 14, C.FOREST_MID],
      [26, 42, 14, C.FOREST_MID], [22, 20, 8, C.FOREST_LIGHT], [40, 22, 7, C.FOREST_LIGHT],
    ]) {
      fg.fillStyle = col; fg.beginPath(); fg.arc(cx, cy, r, 0, Math.PI * 2); fg.fill();
    }
    cache.forest = fo;

    // Prussian blue cartographic ink water
    cache.water = [0, 1].map((f) => {
      const w = createCanvas(64, 64);
      const wg = w.getContext('2d');
      wg.fillStyle = C.WATER_MID; wg.fillRect(0, 0, 64, 64);
      const off = f * 16;
      wg.strokeStyle = C.WATER_LIGHT; wg.lineWidth = 2.5;
      for (const wy of [16, 36, 54]) {
        wg.beginPath();
        wg.moveTo(-16 + off, wy); wg.quadraticCurveTo(8 + off, wy - 5, 32 + off, wy);
        wg.quadraticCurveTo(56 + off, wy + 5, 80 + off, wy); wg.stroke();
      }
      wg.strokeStyle = C.WATER_DARK; wg.lineWidth = 2; wg.strokeRect(0, 0, 64, 64);
      return w;
    });

    const ic = createCanvas(64, 64);
    const ig = ic.getContext('2d');
    ig.fillStyle = C.ICE_MID; ig.fillRect(0, 0, 64, 64);
    ig.fillStyle = C.ICE_LIGHT; ig.fillRect(4, 4, 48, 8);
    ig.strokeStyle = C.ICE_DARK; ig.lineWidth = 2; ig.strokeRect(1, 1, 62, 62);
    cache.ice = ic;

    // Crimson Wax Seal HQ
    const ea = createCanvas(128, 128);
    const eg = ea.getContext('2d');
    eg.fillStyle = 'rgba(42, 26, 12, 0.35)';
    eg.beginPath(); eg.arc(70, 70, 50, 0, Math.PI * 2); eg.fill();
    const waxGrad = eg.createRadialGradient(54, 54, 8, 64, 64, 50);
    waxGrad.addColorStop(0, '#E85A4F'); waxGrad.addColorStop(0.65, '#A62420'); waxGrad.addColorStop(1, '#5C110F');
    eg.fillStyle = waxGrad;
    eg.beginPath(); eg.arc(64, 64, 48, 0, Math.PI * 2); eg.fill();
    eg.lineWidth = 4; eg.strokeStyle = '#380908'; eg.stroke();
    eg.strokeStyle = '#F2CA6B'; eg.lineWidth = 3;
    eg.beginPath(); eg.arc(64, 64, 34, 0, Math.PI * 2); eg.stroke();
    eg.fillStyle = '#F2CA6B';
    drawFourPointStar(eg, 64, 64, 22, 9); eg.fill();
    cache.eagleAlive = ea;

    const ed = createCanvas(128, 128);
    const edg = ed.getContext('2d');
    edg.fillStyle = '#4A2C22'; edg.beginPath(); edg.arc(64, 64, 42, 0, Math.PI * 2); edg.fill();
    edg.strokeStyle = '#24140E'; edg.lineWidth = 4; edg.stroke();
    edg.beginPath(); edg.moveTo(32, 36); edg.lineTo(94, 92); edg.moveTo(92, 34); edg.lineTo(36, 94); edg.stroke();
    cache.eagleDead = ed;

    cache.bullets = makeRoundBullet('#B83A28', 'rgba(180, 60, 40, 0.7)');
    cache.spawnStars = makeReticleSpawns('#7A531E', '#A62D29');
    cache.shield = makeCircleShield('#7A531E', '#D6B472');
    cache.powerups = makePowerUpCards('#F2E4C4', '#D6C094', '#6E4C24', {
      [BC.POWERUP.HELMET]: '#3E6E52',
      [BC.POWERUP.CLOCK]: '#7A531E',
      [BC.POWERUP.SHOVEL]: '#4E545E',
      [BC.POWERUP.STAR]: '#BD8634',
      [BC.POWERUP.GRENADE]: '#A62D29',
      [BC.POWERUP.TANK]: '#BD8634',
    }, drawWarTableTankHD, C.P1);

    const he = createCanvas(64, 64);
    const heg = he.getContext('2d');
    heg.fillStyle = '#D6B472'; heg.strokeStyle = '#1A110B'; heg.lineWidth = 4;
    roundRectPath(heg, 12, 16, 40, 34, 8); heg.fill(); heg.stroke();
    heg.fillStyle = '#FFF0C2'; heg.fillRect(28, 8, 8, 14);
    cache.hudEnemy = he;

    const hl = createCanvas(64, 64);
    hl.getContext('2d').drawImage(drawWarTableTankHD('P0', C.P1, 0, 0), 4, 4, 56, 56);
    cache.hudLife = hl;

    const fl = createCanvas(128, 128);
    const flg = fl.getContext('2d');
    flg.fillStyle = '#D6B472'; flg.fillRect(20, 16, 8, 96);
    flg.fillStyle = '#C83228'; flg.strokeStyle = '#FFF0C2'; flg.lineWidth = 3.5;
    flg.beginPath(); flg.moveTo(28, 20); flg.lineTo(106, 44); flg.lineTo(28, 68); flg.closePath(); flg.fill(); flg.stroke();
    cache.flag = fl;

    return cache;
  }

  function drawWarTableExplosion(ctx, cx, cy, frame, isBig) {
    ctx.save();
    if (!isBig) {
      const r = [5, 8.5, 9.5][Math.min(2, frame)];
      const alpha = frame === 2 ? 0.55 : 1.0;
      ctx.fillStyle = `rgba(56, 36, 18, ${alpha * 0.65})`;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      if (frame < 2) {
        ctx.fillStyle = frame === 0 ? '#FFF2C0' : '#D9542E';
        drawFourPointStar(ctx, cx, cy, r * 0.85, r * 0.35); ctx.fill();
      }
      ctx.restore();
      return;
    }
    const r = [7, 13, 17, 20, 16][Math.min(4, frame)];
    const alpha = frame >= 3 ? (frame === 3 ? 0.8 : 0.45) : 1.0;
    ctx.fillStyle = `rgba(45, 28, 16, ${alpha * 0.72})`;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2); ctx.fill();
    if (frame <= 3) {
      ctx.fillStyle = `rgba(200, 62, 40, ${alpha})`;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2); ctx.fill();
    }
    if (frame <= 1) {
      ctx.fillStyle = '#FFF0B8';
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Register all 4 Realistic Skins!
  BC.registerSkin('wwii', buildWWIISprites(), drawWWIITankHD, drawWWIIExplosion);
  BC.registerSkin('metalslug', buildMetalSlugSprites(), drawMetalSlugTankHD, drawMetalSlugExplosion);
  BC.registerSkin('modern', buildModernSprites(), drawModernTankHD, drawModernExplosion);
  BC.registerSkin('wartable', buildWarTableSprites(), drawWarTableTankHD, drawWarTableExplosion);
})(window);
