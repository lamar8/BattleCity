(function (global) {
  'use strict';

  const BC = (global.BattleCity = global.BattleCity || {});

  // Classic 8x8 Arcade / NES Bitmap Font (each row is 8 bits, MSB on left)
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
    '@': [0x3C, 0x42, 0x5A, 0x56, 0x5C, 0x40, 0x3C, 0x00], // ©-like badge
    '_': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7E, 0x00],
  };

  // Pre-rendered color glyph cache
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

  BC.drawText = function (ctx, text, x, y, color = '#FCFCFC', align = 'left') {
    const str = String(text).toUpperCase();
    let startX = Math.round(x);
    if (align === 'center') {
      startX = Math.round(x - (str.length * 8) / 2);
    } else if (align === 'right') {
      startX = Math.round(x - str.length * 8);
    }
    const drawY = Math.round(y);
    for (let i = 0; i < str.length; i++) {
      const g = getGlyphCanvas(str[i], color);
      ctx.drawImage(g, startX + i * 8, drawY);
    }
  };

  // Giant brick-patterned text renderer for "BATTLE CITY" title & "GAME OVER" banner
  const brickLetterCache = new Map();

  // Compact 5x7 pixel font for crisp monumental brick lettering
  const BIG_LETTERS = {
    B: [
      '11110',
      '10001',
      '10001',
      '11110',
      '10001',
      '10001',
      '11110',
    ],
    A: [
      '01110',
      '10001',
      '10001',
      '11111',
      '10001',
      '10001',
      '10001',
    ],
    T: [
      '11111',
      '00100',
      '00100',
      '00100',
      '00100',
      '00100',
      '00100',
    ],
    L: [
      '10000',
      '10000',
      '10000',
      '10000',
      '10000',
      '10000',
      '11111',
    ],
    E: [
      '11111',
      '10000',
      '10000',
      '11110',
      '10000',
      '10000',
      '11111',
    ],
    C: [
      '01111',
      '10000',
      '10000',
      '10000',
      '10000',
      '10000',
      '01111',
    ],
    I: [
      '11111',
      '00100',
      '00100',
      '00100',
      '00100',
      '00100',
      '11111',
    ],
    Y: [
      '10001',
      '10001',
      '01010',
      '00100',
      '00100',
      '00100',
      '00100',
    ],
    G: [
      '01111',
      '10000',
      '10000',
      '10111',
      '10001',
      '10001',
      '01110',
    ],
    M: [
      '10001',
      '11011',
      '10101',
      '10101',
      '10001',
      '10001',
      '10001',
    ],
    O: [
      '01110',
      '10001',
      '10001',
      '10001',
      '10001',
      '10001',
      '01110',
    ],
    V: [
      '10001',
      '10001',
      '10001',
      '10001',
      '10001',
      '01010',
      '00100',
    ],
    R: [
      '11110',
      '10001',
      '10001',
      '11110',
      '10100',
      '10010',
      '10001',
    ],
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
            // Draw mini staggered NES brick pattern inside each block
            g.fillStyle = palette[0]; // mortar / shadow
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

  BC.drawBrickWord = function (ctx, word, centerX, y, scale = 5, isRed = false) {
    const palette = isRed
      ? ['#580000', '#A81800', '#E44010']
      : ['#682000', '#B03800', '#E86818'];
    const c = getBrickWordCanvas(word.toUpperCase(), scale, palette);
    ctx.drawImage(c, Math.round(centerX - c.width / 2), Math.round(y));
  };
})(window);
