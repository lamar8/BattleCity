(function (global) {
  'use strict';

  const BC = (global.BattleCity = global.BattleCity || {});

  // =========================================================================
  // 1. CLASSIC NES 8x8 BITMAP FONT & BRICK TITLES
  // =========================================================================
  const GLYPHS = {
    ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    '0': [0x3C, 0x66, 0x6E, 0x76, 0x66, 0x66, 0x3C, 0x00],
    '1': [0x18, 0x38, 0x18, 0x18, 0x18, 0x18, 0x7E, 0x00],
    '2': [0x3C, 0x66, 0x06, 0x1C, 0x30, 0x60, 0x7E, 0x00],
    '3': [0x3C, 0x66, 0x06, 0x1C, 0x06, 0x66, 0x3C, 0x00],
    '4': [0x0C, 0x1C, 0x3C, 0x6C, 0x7E, 0x0C, 0x0C, 0x00],
    '5': [0x7E, 0x60, 0x7C, 0x06, 0x06, 0x66, 0x3C, 0x00],
    '6': [0x3C, 0x60, 0x7C, 0x66, 0x66, 0x66, 0x3C, 0x00],
    '7': [0x7E, 0x66, 0x0C, 0x18, 0x18, 0x18, 0x18, 0x00],
    '8': [0x3C, 0x66, 0x66, 0x3C, 0x66, 0x66, 0x3C, 0x00],
    '9': [0x3C, 0x66, 0x66, 0x3E, 0x06, 0x66, 0x3C, 0x00],
    'A': [0x18, 0x3C, 0x66, 0x7E, 0x66, 0x66, 0x66, 0x00],
    'B': [0x7C, 0x66, 0x66, 0x7C, 0x66, 0x66, 0x7C, 0x00],
    'C': [0x3C, 0x66, 0x60, 0x60, 0x60, 0x66, 0x3C, 0x00],
    'D': [0x78, 0x6C, 0x66, 0x66, 0x66, 0x6C, 0x78, 0x00],
    'E': [0x7E, 0x60, 0x60, 0x78, 0x60, 0x60, 0x7E, 0x00],
    'F': [0x7E, 0x60, 0x60, 0x78, 0x60, 0x60, 0x60, 0x00],
    'G': [0x3C, 0x66, 0x60, 0x6E, 0x66, 0x66, 0x3E, 0x00],
    'H': [0x66, 0x66, 0x66, 0x7E, 0x66, 0x66, 0x66, 0x00],
    'I': [0x3C, 0x18, 0x18, 0x18, 0x18, 0x18, 0x3C, 0x00],
    'J': [0x1E, 0x0C, 0x0C, 0x0C, 0x6C, 0x6C, 0x38, 0x00],
    'K': [0x66, 0x6C, 0x78, 0x70, 0x78, 0x6C, 0x66, 0x00],
    'L': [0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x7E, 0x00],
    'M': [0x63, 0x77, 0x7F, 0x6B, 0x63, 0x63, 0x63, 0x00],
    'N': [0x66, 0x76, 0x7E, 0x7E, 0x6E, 0x66, 0x66, 0x00],
    'O': [0x3C, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x00],
    'P': [0x7C, 0x66, 0x66, 0x7C, 0x60, 0x60, 0x60, 0x00],
    'Q': [0x3C, 0x66, 0x66, 0x66, 0x6A, 0x6C, 0x36, 0x00],
    'R': [0x7C, 0x66, 0x66, 0x7C, 0x6C, 0x66, 0x66, 0x00],
    'S': [0x3C, 0x66, 0x60, 0x3C, 0x06, 0x66, 0x3C, 0x00],
    'T': [0x7E, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00],
    'U': [0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x00],
    'V': [0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x18, 0x00],
    'W': [0x63, 0x63, 0x63, 0x6B, 0x7F, 0x77, 0x63, 0x00],
    'X': [0x66, 0x66, 0x3C, 0x18, 0x3C, 0x66, 0x66, 0x00],
    'Y': [0x66, 0x66, 0x66, 0x3C, 0x18, 0x18, 0x18, 0x00],
    'Z': [0x7E, 0x06, 0x0C, 0x18, 0x30, 0x60, 0x7E, 0x00],
    '-': [0x00, 0x00, 0x00, 0x7E, 0x00, 0x00, 0x00, 0x00],
    '+': [0x00, 0x18, 0x18, 0x7E, 0x18, 0x18, 0x00, 0x00],
    '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x18, 0x00],
    ',': [0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x18, 0x30],
    ':': [0x00, 0x18, 0x18, 0x00, 0x18, 0x18, 0x00, 0x00],
    '!': [0x18, 0x18, 0x18, 0x18, 0x18, 0x00, 0x18, 0x00],
    '/': [0x02, 0x06, 0x0C, 0x18, 0x30, 0x60, 0x40, 0x00],
    '(': [0x0C, 0x18, 0x30, 0x30, 0x30, 0x18, 0x0C, 0x00],
    ')': [0x30, 0x18, 0x0C, 0x0C, 0x0C, 0x18, 0x30, 0x00],
    '<': [0x0C, 0x18, 0x30, 0x60, 0x30, 0x18, 0x0C, 0x00],
    '>': [0x30, 0x18, 0x0C, 0x06, 0x0C, 0x18, 0x30, 0x00],
    '@': [0x3C, 0x42, 0x5A, 0x56, 0x5C, 0x40, 0x3C, 0x00],
    '_': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7E, 0x00],
  };

  const glyphCache = new Map();

  function getGlyphCanvas(ch, color) {
    const key = ch + '|' + color;
    let c = glyphCache.get(key);
    if (c) return c;

    const rows = GLYPHS[ch] || GLYPHS[' '];
    c = document.createElement('canvas');
    c.width = 8;
    c.height = 8;
    const g = c.getContext('2d');
    g.fillStyle = color;
    for (let y = 0; y < 8; y++) {
      const bits = rows[y];
      for (let x = 0; x < 8; x++) {
        if (bits & (0x80 >> x)) {
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    glyphCache.set(key, c);
    return c;
  }

  const brickLetterCache = new Map();
  const BIG_LETTERS = {
    B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
    I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
    Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
    G: ['01111', '10000', '10000', '10111', '10001', '10001', '01110'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  };

  function getBrickWordCanvas(word, scale, palette) {
    const key = word + '|' + scale + '|' + palette.join(',');
    const cached = brickLetterCache.get(key);
    if (cached) return cached;

    const chars = word.split('');
    const charW = 5 * scale;
    const charH = 7 * scale;
    const gap = scale;
    const width = chars.length * charW + Math.max(0, chars.length - 1) * gap;
    const height = charH;

    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const g = c.getContext('2d');

    for (let ci = 0; ci < chars.length; ci++) {
      const ch = chars[ci];
      const pattern = BIG_LETTERS[ch];
      if (!pattern) continue;
      const ox = ci * (charW + gap);
      for (let py = 0; py < 7; py++) {
        for (let px = 0; px < 5; px++) {
          if (pattern[py][px] === '1') {
            const bx = ox + px * scale;
            const by = py * scale;
            g.fillStyle = palette[0];
            g.fillRect(bx, by, scale, scale);
            for (let sy = 0; sy < scale; sy += 2) {
              const offset = ((sy >> 1) & 1) === 0 ? 0 : 2;
              g.fillStyle = palette[1];
              g.fillRect(bx, by + sy, scale, 1);
              g.fillStyle = palette[2];
              for (let sx = 0; sx < scale; sx++) {
                if ((sx + offset) % 4 !== 3) {
                  g.fillRect(bx + sx, by + sy, 1, 1);
                } else {
                  g.fillStyle = palette[0];
                  g.fillRect(bx + sx, by + sy, 1, 1);
                  g.fillStyle = palette[2];
                }
              }
            }
          }
        }
      }
    }

    brickLetterCache.set(key, c);
    return c;
  }

  // =========================================================================
  // 2. GENSHIN-INSPIRED HD 2D TYPOGRAPHY & TITLES
  // =========================================================================
  function remapGenshinColor(color) {
    if (!color) return '#F7F3E9';
    const up = color.toUpperCase();
    if (up === '#000000') return '#D3BC8E';
    if (up === '#3A3A3A') return '#9DB2CE';
    if (up === '#FCFCFC') return '#F7F3E9';
    if (up === '#D82800') return '#FF6B5E';
    if (up === '#FC9838') return '#F5C469';
    if (up === '#FCE4A0') return '#FFF0B8';
    return color;
  }

  function remapCyberColor(color) {
    if (!color) return '#E6FAFF';
    const up = color.toUpperCase();
    if (up === '#000000') return '#00F0FF';
    if (up === '#3A3A3A') return '#7A92B8';
    if (up === '#FCFCFC') return '#E6FAFF';
    if (up === '#D82800') return '#FF2A85';
    if (up === '#FC9838') return '#FCEE0A';
    if (up === '#FCE4A0') return '#00F0FF';
    return color;
  }

  // =========================================================================
  // UNIFIED SKIN-AWARE EXPORTS
  // =========================================================================
  BC.drawText = function (ctx, text, x, y, color = '#FCFCFC', align = 'left', sizeLogical = 7.5) {
    const skin = BC.getSkin();
    if (skin === 'classic') {
      const str = String(text).toUpperCase();
      let startX = Math.round(x);
      if (align === 'center') startX = Math.round(x - (str.length * 8) / 2);
      else if (align === 'right') startX = Math.round(x - str.length * 8);
      const drawY = Math.round(y);
      for (let i = 0; i < str.length; i++) {
        const g = getGlyphCanvas(str[i], color);
        ctx.drawImage(g, startX + i * 8, drawY, 8, 8);
      }
      return;
    }

    if (!ctx.fillText) return;
    const S = BC.RENDER_SCALE || 4;
    const str = String(text);
    const isCyber = skin === 'cyberpunk';
    const fillCol = isCyber ? remapCyberColor(color) : remapGenshinColor(color);

    ctx.save();
    ctx.scale(1 / S, 1 / S);

    const pxSize = Math.round(sizeLogical * S);
    ctx.font = isCyber
      ? `800 ${pxSize}px "Orbitron", "Consolas", "Bahnschrift", "Microsoft YaHei", sans-serif`
      : `700 ${pxSize}px "Georgia", "Noto Serif SC", "Songti SC", "Microsoft YaHei", serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';

    const drawX = Math.round(x * S);
    const drawY = Math.round(y * S);

    if (isCyber) {
      ctx.shadowColor = fillCol;
      ctx.shadowBlur = 8;
    }
    ctx.lineWidth = Math.max(2, S * 0.85);
    ctx.strokeStyle = isCyber ? 'rgba(6, 10, 22, 0.95)' : 'rgba(10, 14, 24, 0.9)';
    ctx.strokeText(str, drawX, drawY);

    ctx.fillStyle = fillCol;
    ctx.fillText(str, drawX, drawY);
    ctx.restore();
  };

  BC.drawBrickWord = function (ctx, word, centerX, y, scale = 5, isRed = false) {
    const skin = BC.getSkin();
    if (skin === 'classic') {
      const palette = isRed
        ? ['#580000', '#A81800', '#E44010']
        : ['#682000', '#B03800', '#E86818'];
      const c = getBrickWordCanvas(word.toUpperCase(), scale, palette);
      ctx.drawImage(c, Math.round(centerX - c.width / 2), Math.round(y), c.width, c.height);
      return;
    }

    if (!ctx.fillText || !ctx.createLinearGradient) return;
    const S = BC.RENDER_SCALE || 4;
    const str = String(word).toUpperCase();
    const isCyber = skin === 'cyberpunk';

    ctx.save();
    ctx.scale(1 / S, 1 / S);

    const cx = Math.round(centerX * S);
    const fontPx = Math.round(scale * 6.8 * S);
    const topY = Math.round(y * S);

    ctx.font = isCyber
      ? `900 italic ${fontPx}px "Orbitron", "Bahnschrift", "Impact", sans-serif`
      : `900 ${fontPx}px "Cinzel", "Georgia", "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (isCyber) {
      // Chromatic cyber aberration offset layer
      ctx.fillStyle = isRed ? 'rgba(0, 240, 255, 0.55)' : 'rgba(255, 42, 133, 0.65)';
      ctx.fillText(str, cx + 5, topY + 3);
    }

    ctx.save();
    ctx.shadowColor = isCyber
      ? (isRed ? 'rgba(255, 42, 133, 0.85)' : 'rgba(0, 240, 255, 0.78)')
      : (isRed ? 'rgba(255, 78, 80, 0.65)' : 'rgba(245, 200, 105, 0.55)');
    ctx.shadowBlur = isCyber ? 22 : 18;
    ctx.lineWidth = Math.round(S * 2.2);
    ctx.strokeStyle = isCyber ? '#070B1A' : (isRed ? '#380D14' : '#1E1810');
    ctx.strokeText(str, cx, topY);
    ctx.restore();

    const grad = ctx.createLinearGradient(0, topY, 0, topY + fontPx);
    if (isCyber) {
      if (isRed) {
        grad.addColorStop(0.0, '#FFE0F0');
        grad.addColorStop(0.45, '#FF2A85');
        grad.addColorStop(0.85, '#B00054');
        grad.addColorStop(1.0, '#4F0028');
      } else {
        grad.addColorStop(0.0, '#FFFFFF');
        grad.addColorStop(0.42, '#00F0FF');
        grad.addColorStop(0.75, '#0088E8');
        grad.addColorStop(1.0, '#FCEE0A');
      }
    } else if (isRed) {
      grad.addColorStop(0.0, '#FFD4CC');
      grad.addColorStop(0.42, '#FF685C');
      grad.addColorStop(0.75, '#D12E3C');
      grad.addColorStop(1.0, '#781523');
    } else {
      grad.addColorStop(0.0, '#FFFDF2');
      grad.addColorStop(0.38, '#F6DA92');
      grad.addColorStop(0.72, '#CFA04E');
      grad.addColorStop(1.0, '#855A1D');
    }

    ctx.fillStyle = grad;
    ctx.fillText(str, cx, topY);

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isCyber
      ? 'rgba(255, 255, 255, 0.7)'
      : (isRed ? 'rgba(255,215,210,0.45)' : 'rgba(255,252,235,0.55)');
    ctx.strokeText(str, cx, topY);

    if (ctx.beginPath) {
      const lineW = Math.min(ctx.measureText(str).width * 0.76, 168 * S);
      const lineY = topY + fontPx + Math.round(S * 1.2);
      ctx.strokeStyle = isCyber
        ? (isRed ? 'rgba(255, 42, 133, 0.8)' : 'rgba(0, 240, 255, 0.8)')
        : (isRed ? 'rgba(255, 110, 100, 0.55)' : 'rgba(211, 188, 142, 0.6)');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - lineW / 2, lineY);
      ctx.lineTo(cx - 10, lineY);
      ctx.moveTo(cx + 10, lineY);
      ctx.lineTo(cx + lineW / 2, lineY);
      ctx.stroke();

      ctx.fillStyle = isCyber ? '#FCEE0A' : (isRed ? '#FF948A' : '#FCE7A2');
      ctx.beginPath();
      ctx.moveTo(cx, lineY - 6);
      ctx.lineTo(cx + 6, lineY);
      ctx.lineTo(cx, lineY + 6);
      ctx.lineTo(cx - 6, lineY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };
})(window);
