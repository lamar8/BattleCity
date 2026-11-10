(function (global) {
  'use strict';

  const BC = (global.BattleCity = global.BattleCity || {});

  // Exact NES Battle City Native Resolution (256 x 240)
  BC.SCREEN_WIDTH = 256;
  BC.SCREEN_HEIGHT = 240;

  // Battlefield layout inside 256x240:
  // Left border: 16px, Playfield: 208px (13x13 blocks = 26x26 sub-tiles), Right HUD: 32px -> 16+208+32 = 256
  // Top border: 16px, Playfield: 208px, Bottom border: 16px -> 16+208+16 = 240
  BC.BORDER_LEFT = 16;
  BC.BORDER_TOP = 16;
  BC.FIELD_SIZE = 208;
  BC.HUD_X = 224;
  BC.HUD_WIDTH = 32;

  BC.SUBTILE_SIZE = 8;
  BC.BLOCK_SIZE = 16;
  BC.GRID_SUBTILES = 26; // 26 * 8 = 208
  BC.GRID_BLOCKS = 13;   // 13 * 16 = 208
  BC.TANK_SIZE = 16;
  BC.BULLET_SIZE = 4;

  // Directions (0=UP, 1=RIGHT, 2=DOWN, 3=LEFT)
  BC.DIR = {
    UP: 0,
    RIGHT: 1,
    DOWN: 2,
    LEFT: 3,
  };

  BC.DIR_VEC = [
    { x: 0, y: -1 }, // UP
    { x: 1, y: 0 },  // RIGHT
    { x: 0, y: 1 },  // DOWN
    { x: -1, y: 0 }, // LEFT
  ];

  // Tile Types
  BC.TILE = {
    EMPTY: 0,
    BRICK: 1,
    STEEL: 2,
    FOREST: 3,
    WATER: 4,
    ICE: 5,
    EAGLE: 9,
  };

  // Brick 4x4 micro-quadrant bitmask inside each 8x8 sub-tile
  // bit 0 (1): top-left, bit 1 (2): top-right, bit 2 (4): bottom-left, bit 3 (8): bottom-right
  BC.BRICK_FULL = 0x0f;

  // Enemy Types
  BC.ENEMY_TYPE = {
    BASIC: 0, // 100 pts, slow, 1 HP
    FAST: 1,  // 200 pts, fast, 1 HP
    POWER: 2, // 300 pts, normal speed, fast bullets, 1 HP
    ARMOR: 3, // 400 pts, normal speed, 4 HP
  };

  // Authentic NES 60Hz enemy stats (lowered to true 1:1 FC Battle City pacing)
  BC.ENEMY_STATS = {
    0: { name: 'BASIC', speed: 0.55, bulletSpeed: 1.8, hp: 1, points: 100, fireRate: 95 },
    1: { name: 'FAST',  speed: 1.05, bulletSpeed: 2.0, hp: 1, points: 200, fireRate: 85 },
    2: { name: 'POWER', speed: 0.65, bulletSpeed: 2.8, hp: 1, points: 300, fireRate: 68 },
    3: { name: 'ARMOR', speed: 0.55, bulletSpeed: 2.0, hp: 4, points: 400, fireRate: 80 },
  };

  // Player Upgrade Tiers (0..3 stars) - true 1:1 FC speed
  BC.PLAYER_TIERS = [
    { speed: 0.85, bulletSpeed: 2.0, maxBullets: 1, power: 1 }, // 0 stars
    { speed: 0.85, bulletSpeed: 2.8, maxBullets: 1, power: 1 }, // 1 star
    { speed: 0.85, bulletSpeed: 2.8, maxBullets: 2, power: 1 }, // 2 stars
    { speed: 0.85, bulletSpeed: 2.8, maxBullets: 2, power: 2 }, // 3 stars (destroys steel & full 8x8 brick)
  ];

  // Power-Up Types
  BC.POWERUP = {
    HELMET: 0,  // Temporary shield (10s)
    CLOCK: 1,   // Freeze all enemies (10s)
    SHOVEL: 2,  // Fortify Eagle with steel (20s)
    STAR: 3,    // Upgrade player weapon tier
    GRENADE: 4, // Destroy all on-screen enemies
    TANK: 5,    // +1 Extra Life
  };

  // Timings in 60Hz frames
  BC.FRAMES = {
    SPAWN_SHIELD_PLAYER: 180,     // 3s initial shield
    HELMET_SHIELD: 600,           // 10s helmet shield
    FREEZE_ENEMIES: 600,          // 10s clock freeze
    SHOVEL_STEEL: 1200,           // 20s steel base
    SHOVEL_BLINK_START: 240,      // last 4s blink steel/brick
    POWERUP_LIFETIME: 1080,       // 18s before despawn
    FRIENDLY_STUN: 180,           // 3s stun if shot by teammate
    SPAWN_ANIM: 56,               // ~0.93s twinkle before tank spawns
    STAGE_CLEAR_DELAY: 160,       // ~2.6s wait after last enemy dies
    ICE_SLIDE_FRAMES: 34,         // ~0.56s inertia slide on ice
  };

  // Exact Eagle Base coordinates (sub-tile grid 26x26)
  BC.EAGLE_SUBTILE_X = 12;
  BC.EAGLE_SUBTILE_Y = 24;

  // Surrounding 8x8 fortress sub-tiles around Eagle
  BC.BASE_WALL_COORDS = [
    [11, 25], [11, 24], [11, 23],
    [12, 23], [13, 23],
    [14, 23], [14, 24], [14, 25],
  ];

  // Enemy spawn sub-tile positions (16x16 footprint at top edge)
  BC.ENEMY_SPAWNS = [
    { x: 0, y: 0 },
    { x: 96, y: 0 },
    { x: 192, y: 0 },
  ];

  // Player spawn positions (16x16 footprint at bottom edge left/right of base)
  BC.PLAYER_SPAWNS = [
    { x: 64, y: 192 },  // P1: col 8, row 24
    { x: 128, y: 192 }, // P2: col 16, row 24
  ];

  // Bonus tank indices (0-indexed out of 20 enemies per stage: 4th, 11th, 18th)
  BC.BONUS_ENEMY_INDICES = new Set([3, 10, 17]);

  // HD Canvas render scale (logical 256x240 -> 1024x960 HD canvas; classic uses integer 4x nearest-neighbor)
  BC.RENDER_SCALE = 4;

  const SKIN_STORAGE_KEY = 'battle_city_skin_v1';

  BC.THEMES = {
    classic: {
      BLACK: '#000000',
      FIELD_BG: '#000000',
      FIELD_GRID: '#000000',
      HUD_GRAY: '#636363',
      HUD_DARK: '#3A3A3A',
      GOLD_TRIM: '#000000',
      GOLD_BRIGHT: '#FCFCFC',
      WHITE: '#FCFCFC',
      TEXT_RED: '#D82800',
      TEXT_ORANGE: '#FC9838',
      TEXT_YELLOW: '#FCE4A0',

      BRICK_DARK: '#7C2C00',
      BRICK_MID: '#B84000',
      BRICK_LIGHT: '#E07020',
      BRICK_MORTAR: '#636363',

      STEEL_DARK: '#636363',
      STEEL_MID: '#ADADAD',
      STEEL_LIGHT: '#FCFCFC',
      STEEL_CORE: '#FCFCFC',

      FOREST_DARK: '#004800',
      FOREST_MID: '#209800',
      FOREST_LIGHT: '#80D010',

      WATER_DARK: '#0038A8',
      WATER_MID: '#1870E8',
      WATER_LIGHT: '#78C8FC',

      ICE_DARK: '#787878',
      ICE_MID: '#BCBCBC',
      ICE_LIGHT: '#ECECEC',

      P1: ['#945800', '#E49818', '#F8E470'],
      P2: ['#005C00', '#24A820', '#94F878'],
      ENEMY_BASIC: ['#5C5C5C', '#A8A8A8', '#F4F4F4'],
      ENEMY_RED: ['#880000', '#E02820', '#FCA098'],
      ENEMY_GREEN: ['#005000', '#189818', '#78E868'],
      ENEMY_GOLD: ['#885000', '#D89010', '#F8E068'],
      ENEMY_ELECTRO: ['#005000', '#189818', '#78E868'],
    },
    genshin: {
      BLACK: '#121824',
      FIELD_BG: '#161E2B',
      FIELD_GRID: '#1E2838',
      HUD_GRAY: '#1E2534',
      HUD_DARK: '#121722',
      GOLD_TRIM: '#D3BC8E',
      GOLD_BRIGHT: '#F8E3A3',
      WHITE: '#F7F3E9',
      TEXT_RED: '#FF6B5E',
      TEXT_ORANGE: '#F3B86A',
      TEXT_YELLOW: '#FCE7A2',

      BRICK_DARK: '#7D3B28',
      BRICK_MID: '#BF623E',
      BRICK_LIGHT: '#E79162',
      BRICK_MORTAR: '#4A2B26',

      STEEL_DARK: '#3A465C',
      STEEL_MID: '#637696',
      STEEL_LIGHT: '#D3BC8E',
      STEEL_CORE: '#7AE7F0',

      FOREST_DARK: '#1C5E3B',
      FOREST_MID: '#329B56',
      FOREST_LIGHT: '#8CE26F',

      WATER_DARK: '#1B5EA6',
      WATER_MID: '#33A6E3',
      WATER_LIGHT: '#A8F0FF',

      ICE_DARK: '#5C98BA',
      ICE_MID: '#A4DCF4',
      ICE_LIGHT: '#EAFBFF',

      P1: ['#9B6824', '#E5B24C', '#FFF0B8', '#5EE7DF'],
      P2: ['#1D6B4A', '#3BC485', '#B9FFE0', '#9BF6FF'],
      ENEMY_BASIC: ['#495266', '#8391AC', '#CFD9EB', '#FF6B6B'],
      ENEMY_RED: ['#8C2032', '#E04456', '#FFB3BA', '#FFF3B0'],
      ENEMY_GREEN: ['#1C6B4B', '#37B87E', '#A8F5C8', '#7AF5D8'],
      ENEMY_GOLD: ['#9A6118', '#DF992C', '#FFE38A', '#FFF4BD'],
      ENEMY_ELECTRO: ['#4B3278', '#8E63CC', '#D7C2FF', '#F3A8FF'],
    },
  };

  function loadInitialSkin() {
    try {
      const saved = global.localStorage && global.localStorage.getItem(SKIN_STORAGE_KEY);
      if (saved === 'classic' || saved === 'genshin') return saved;
    } catch (_) {}
    return 'genshin';
  }

  BC.SKIN = loadInitialSkin();
  BC.COLORS = BC.THEMES[BC.SKIN];

  BC.getSkin = function () {
    return BC.SKIN;
  };

  BC.setSkin = function (skin) {
    if (skin !== 'classic' && skin !== 'genshin') return;
    BC.SKIN = skin;
    BC.COLORS = BC.THEMES[skin];
    if (BC.SKIN_SPRITES && BC.SKIN_SPRITES[skin]) {
      BC.SPRITES = BC.SKIN_SPRITES[skin];
    }
    try {
      if (global.localStorage) {
        global.localStorage.setItem(SKIN_STORAGE_KEY, skin);
      }
    } catch (_) {}
  };

  // Authentic 1985 Famicom ROM Enemy Spawn Sequences ($E4EC EntityTypeTable + $E578 StageEnemyCountTable)
  // 0 = BASIC, 1 = FAST, 2 = POWER, 3 = ARMOR (exact 20-tank order per stage)
  BC.ROM_ENEMY_WAVES = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1], // Stage 1:  B*18 F*2
    [3,3,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // Stage 2:  A*2 F*4 B*14
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,3,3], // Stage 3:  B*14 F*4 A*2
    [2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,0,0,3,3,3], // Stage 4:  P*10 F*5 B*2 A*3
    [2,2,2,2,2,3,3,0,0,0,0,0,0,0,0,1,1,1,1,1], // Stage 5:  P*5 A*2 B*8 F*5
    [2,2,2,2,2,2,2,1,1,0,0,0,0,0,0,0,0,0,3,3], // Stage 6:  P*7 F*2 B*9 A*2
    [0,0,0,1,1,1,1,2,2,2,2,2,2,0,0,0,0,0,0,0], // Stage 7:  B*3 F*4 P*6 B*7
    [2,2,2,2,2,2,2,3,3,1,1,1,1,0,0,0,0,0,0,0], // Stage 8:  P*7 A*2 F*4 B*7
    [0,0,0,0,0,0,1,1,1,1,2,2,2,2,2,2,2,3,3,3], // Stage 9:  B*6 F*4 P*7 A*3
    [0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,2,2,2,3,3], // Stage 10: B*12 F*2 P*4 A*2
    [1,1,1,1,1,3,3,3,3,3,3,2,2,2,2,1,1,1,1,1], // Stage 11: F*5 A*6 P*4 F*5
    [2,2,2,2,2,2,2,2,1,1,1,1,1,1,3,3,3,3,3,3], // Stage 12: P*8 F*6 A*6
    [2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,3,3,3,3], // Stage 13: P*8 F*8 A*4
    [2,2,2,2,2,2,2,2,2,2,1,1,1,1,3,3,3,3,3,3], // Stage 14: P*10 F*4 A*6
    [0,0,1,1,1,1,1,1,1,1,1,1,3,3,3,3,3,3,3,3], // Stage 15: B*2 F*10 A*8
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,3,3], // Stage 16: B*16 F*2 A*2
    [3,3,1,1,2,2,2,2,2,2,2,2,0,0,0,0,0,0,0,0], // Stage 17: A*2 F*2 P*8 B*8
    [3,3,3,3,0,0,2,2,2,2,2,2,1,1,1,1,1,1,1,1], // Stage 18: A*4 B*2 P*6 F*8
    [1,1,1,1,3,3,3,3,3,3,3,3,0,0,0,0,2,2,2,2], // Stage 19: F*4 A*8 B*4 P*4
    [1,1,1,1,1,1,1,1,0,0,2,2,3,3,3,3,3,3,3,3], // Stage 20: F*8 B*2 P*2 A*8
    [2,2,2,2,2,2,2,2,1,1,0,0,0,0,0,0,3,3,3,3], // Stage 21: P*8 F*2 B*6 A*4
    [1,1,1,1,1,1,1,1,0,0,0,0,0,0,2,2,3,3,3,3], // Stage 22: F*8 B*6 P*2 A*4
    [3,3,3,3,3,3,2,2,2,2,1,1,1,1,1,1,1,1,1,1], // Stage 23: A*6 P*4 F*10
    [2,2,2,2,3,3,1,1,1,1,0,0,0,0,0,0,0,0,0,0], // Stage 24: P*4 A*2 F*4 B*10
    [2,2,1,1,1,1,1,1,1,1,3,3,3,3,3,3,3,3,3,3], // Stage 25: P*2 F*8 A*10
    [1,1,1,1,1,1,3,3,3,3,3,3,0,0,0,0,2,2,2,2], // Stage 26: F*6 A*6 B*4 P*4
    [2,2,3,3,3,3,3,3,3,3,1,1,1,1,1,1,1,1,0,0], // Stage 27: P*2 A*8 F*8 B*2
    [1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2], // Stage 28: F*2 A*1 B*15 P*2
    [2,2,2,2,2,2,2,2,2,2,1,1,1,1,3,3,3,3,3,3], // Stage 29: P*10 F*4 A*6
    [0,0,0,0,1,1,1,1,1,1,1,1,2,2,2,2,3,3,3,3], // Stage 30: B*4 F*8 P*4 A*4
    [2,2,2,1,1,1,1,1,1,1,1,3,3,3,3,3,3,2,2,2], // Stage 31: P*3 F*8 A*6 P*3
    [3,3,3,3,3,3,3,3,0,0,0,0,0,0,2,2,1,1,1,1], // Stage 32: A*8 B*6 P*2 F*4
    [1,1,1,1,3,3,3,3,3,3,3,3,2,2,2,2,1,1,1,1], // Stage 33: F*4 A*8 P*4 F*4
    [2,2,2,2,1,1,1,1,1,1,1,1,1,1,3,3,3,3,3,3], // Stage 34: P*4 F*10 A*6
    [2,2,2,2,1,1,1,1,1,1,3,3,3,3,3,3,3,3,3,3], // Stage 35: P*4 F*6 A*10
  ];

  // Return exact 20-enemy ROM wave queue for a stage
  BC.buildWaveQueue = function (stageNumber) {
    const idx = ((stageNumber - 1) % BC.ROM_ENEMY_WAVES.length + BC.ROM_ENEMY_WAVES.length) % BC.ROM_ENEMY_WAVES.length;
    return BC.ROM_ENEMY_WAVES[idx].slice();
  };
})(window);
