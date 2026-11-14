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

  const BULLET_SPEED_KEY = 'battle_city_bullet_speed_v1';

  BC.setBasicBulletSpeed = function (speed) {
    const spd = Math.max(1.0, Math.min(4.5, Number(speed) || 2.0));
    const fastSpd = Math.round(spd * 1.4 * 10) / 10;
    BC.BASIC_BULLET_SPEED = spd;
    BC.PLAYER_TIERS[0].bulletSpeed = spd;
    BC.PLAYER_TIERS[1].bulletSpeed = fastSpd;
    BC.PLAYER_TIERS[2].bulletSpeed = fastSpd;
    BC.PLAYER_TIERS[3].bulletSpeed = fastSpd;
    try {
      if (global.localStorage) {
        global.localStorage.setItem(BULLET_SPEED_KEY, String(spd));
      }
    } catch (_) {}
  };

  (function loadBulletSpeed() {
    let saved = 2.0;
    try {
      const v = parseFloat(global.localStorage && global.localStorage.getItem(BULLET_SPEED_KEY));
      if (Number.isFinite(v) && v >= 1.0 && v <= 4.5) saved = v;
    } catch (_) {}
    BC.setBasicBulletSpeed(saved);
  })();

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
    ICE_SLIDE_FRAMES: 45,         // ~0.75s inertia slide on ice (stopping inertia)
    ICE_TURN_DELAY: 18,           // ~0.30s steering latency & drift inertia for 90-degree turns (~1 tank length)
    ICE_REVERSE_DELAY: 26,        // ~0.43s skid delay & opposing inertia for 180-degree U-turns (~1.4 tank lengths)
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
    cyberpunk: {
      BLACK: '#070912',
      FIELD_BG: '#090D18',
      FIELD_GRID: '#111C33',
      HUD_GRAY: '#0D1220',
      HUD_DARK: '#060810',
      GOLD_TRIM: '#00F0FF',
      GOLD_BRIGHT: '#FF2A85',
      WHITE: '#E6FAFF',
      TEXT_RED: '#FF2A85',
      TEXT_ORANGE: '#FCEE0A',
      TEXT_YELLOW: '#00F0FF',

      BRICK_DARK: '#4E0A2E',
      BRICK_MID: '#B5175B',
      BRICK_LIGHT: '#FF3E8A',
      BRICK_MORTAR: '#180A1C',

      STEEL_DARK: '#161D2E',
      STEEL_MID: '#2C3A57',
      STEEL_LIGHT: '#FCEE0A',
      STEEL_CORE: '#00F0FF',

      FOREST_DARK: '#06473D',
      FOREST_MID: '#00B884',
      FOREST_LIGHT: '#29FFB8',

      WATER_DARK: '#0A1A52',
      WATER_MID: '#009EFF',
      WATER_LIGHT: '#7CF7FF',

      ICE_DARK: '#176E8C',
      ICE_MID: '#4CE8FF',
      ICE_LIGHT: '#DCFFFF',

      P1: ['#0A3952', '#1783A8', '#70F8FF', '#FCEE0A'],
      P2: ['#094230', '#16A876', '#69FFC6', '#00F0FF'],
      ENEMY_BASIC: ['#273047', '#4E5F85', '#9EB2D8', '#FF2A85'],
      ENEMY_RED: ['#6E0B2C', '#DB1A50', '#FF7AA8', '#FCEE0A'],
      ENEMY_GREEN: ['#084A38', '#15BA88', '#6DFFD0', '#00F0FF'],
      ENEMY_GOLD: ['#6E5406', '#D4A80C', '#FCEE0A', '#FF2A85'],
      ENEMY_ELECTRO: ['#590E4F', '#C41A8E', '#FF70DA', '#00F0FF'],
    },
    wwii: {
      BLACK: '#191B17',
      FIELD_BG: '#2A261F',
      FIELD_GRID: '#352F26',
      HUD_GRAY: '#262922',
      HUD_DARK: '#171914',
      GOLD_TRIM: '#9E936E',
      GOLD_BRIGHT: '#E8DCB5',
      WHITE: '#EFE7D0',
      TEXT_RED: '#E05A47',
      TEXT_ORANGE: '#D9A754',
      TEXT_YELLOW: '#EFE2B0',

      BRICK_DARK: '#5E2B20',
      BRICK_MID: '#8E4332',
      BRICK_LIGHT: '#B8624B',
      BRICK_MORTAR: '#3A231E',

      STEEL_DARK: '#2D3136',
      STEEL_MID: '#50565E',
      STEEL_LIGHT: '#848C96',
      STEEL_CORE: '#C8B878',

      FOREST_DARK: '#1B361C',
      FOREST_MID: '#2F572D',
      FOREST_LIGHT: '#568544',

      WATER_DARK: '#1A3442',
      WATER_MID: '#2D586D',
      WATER_LIGHT: '#6A9CAE',

      ICE_DARK: '#6B7D85',
      ICE_MID: '#A6B9C2',
      ICE_LIGHT: '#DDE8ED',

      P1: ['#3B4B2B', '#586E40', '#7D965E', '#EFE7D0'],      // US Sherman Olive Drab
      P2: ['#274536', '#3C6952', '#5B9474', '#E0C068'],      // Allied Forest Pine
      ENEMY_BASIC: ['#383C42', '#575D66', '#838B96', '#D85A48'], // Panzer Field Gray
      ENEMY_RED: ['#6E2424', '#A83834', '#D66B60', '#F0D078'],   // Red Command Target
      ENEMY_GREEN: ['#324D3A', '#4E7559', '#78A382', '#D8E0A8'], // Camo Heavy
      ENEMY_GOLD: ['#6E5D36', '#9E8750', '#C9B175', '#EFE7D0'],  // Africa Korps Desert Tan
      ENEMY_ELECTRO: ['#4A3D36', '#7A6354', '#AA8E79', '#F09060'], // Heavy Tiger Brown-Steel
    },
    metalslug: {
      BLACK: '#1A161C',
      FIELD_BG: '#262126',
      FIELD_GRID: '#332C32',
      HUD_GRAY: '#2B252B',
      HUD_DARK: '#191519',
      GOLD_TRIM: '#E09A38',
      GOLD_BRIGHT: '#FFE382',
      WHITE: '#FFF6DE',
      TEXT_RED: '#FF5438',
      TEXT_ORANGE: '#FFB83D',
      TEXT_YELLOW: '#FFE875',

      BRICK_DARK: '#6E2B19',
      BRICK_MID: '#B34C27',
      BRICK_LIGHT: '#E87E45',
      BRICK_MORTAR: '#3B1C16',

      STEEL_DARK: '#333B4A',
      STEEL_MID: '#5E6B80',
      STEEL_LIGHT: '#F0B82B',
      STEEL_CORE: '#FFD94A',

      FOREST_DARK: '#184F27',
      FOREST_MID: '#35943A',
      FOREST_LIGHT: '#80D948',

      WATER_DARK: '#13488C',
      WATER_MID: '#238AE0',
      WATER_LIGHT: '#9BE8FF',

      ICE_DARK: '#4C8AB0',
      ICE_MID: '#92D4FA',
      ICE_LIGHT: '#E8FAFF',

      P1: ['#7E6E30', '#C4AE54', '#F5E18E', '#4FF0FF'],      // SV-001 Metal Slug Gold-Olive
      P2: ['#236647', '#3BB075', '#8FF0B8', '#FFE46B'],      // Slug Commando Green
      ENEMY_BASIC: ['#3B4457', '#67748F', '#A3B2CC', '#FF4D38'], // Rebel Iron Gray
      ENEMY_RED: ['#801B1B', '#CC3329', '#FF7C66', '#FFE46B'],   // Rebel Ace Red
      ENEMY_GREEN: ['#215E3E', '#389962', '#7DE09E', '#FFE46B'],
      ENEMY_GOLD: ['#85591B', '#C98A2C', '#FFD06B', '#FFF5CE'],
      ENEMY_ELECTRO: ['#5A2E66', '#944BA6', '#D48CE6', '#FFE46B'],
    },
    modern: {
      BLACK: '#10141A',
      FIELD_BG: '#1B2028',
      FIELD_GRID: '#262E3B',
      HUD_GRAY: '#151A22',
      HUD_DARK: '#0D1016',
      GOLD_TRIM: '#6DA4C4',
      GOLD_BRIGHT: '#BEE6FF',
      WHITE: '#E4EFF7',
      TEXT_RED: '#FF5252',
      TEXT_ORANGE: '#F5B841',
      TEXT_YELLOW: '#6AD4FF',

      BRICK_DARK: '#454346',
      BRICK_MID: '#7A544C',
      BRICK_LIGHT: '#A8796D',
      BRICK_MORTAR: '#2A2C30',

      STEEL_DARK: '#2A303B',
      STEEL_MID: '#4B5566',
      STEEL_LIGHT: '#8CA0B8',
      STEEL_CORE: '#FF5252',

      FOREST_DARK: '#1D3B2B',
      FOREST_MID: '#336B49',
      FOREST_LIGHT: '#5DA673',

      WATER_DARK: '#112E4D',
      WATER_MID: '#1F5C91',
      WATER_LIGHT: '#6BB8E8',

      ICE_DARK: '#4A6E82',
      ICE_MID: '#8BB8CC',
      ICE_LIGHT: '#D7EDF5',

      P1: ['#6E6045', '#A8946D', '#D6C49C', '#4CE8FF'],      // M1A2 Desert Digital Tan
      P2: ['#2B4C54', '#467B87', '#7BB3BF', '#6DFAB8'],      // Modern Urban Tactical Teal
      ENEMY_BASIC: ['#2D333D', '#4B5566', '#7C889C', '#FF5252'], // Stealth Charcoal
      ENEMY_RED: ['#6B1D28', '#B83344', '#EB6E7B', '#F5B841'],   // Priority Hostile Red
      ENEMY_GREEN: ['#2B4D3E', '#487D64', '#7AB397', '#6AD4FF'],
      ENEMY_GOLD: ['#6E5D36', '#A88E54', '#D6BA7C', '#FF5252'],
      ENEMY_ELECTRO: ['#3A3B5E', '#606399', '#999CD4', '#6AD4FF'],
    },
    wartable: {
      BLACK: '#261A11',
      FIELD_BG: '#D9C8A2',
      FIELD_GRID: '#B8A276',
      HUD_GRAY: '#2B1D13',
      HUD_DARK: '#1A110B',
      GOLD_TRIM: '#D6B472',
      GOLD_BRIGHT: '#FFF0C2',
      WHITE: '#F7ECD4',
      TEXT_RED: '#C83228',
      TEXT_ORANGE: '#D98C36',
      TEXT_YELLOW: '#F2CA6B',

      BRICK_DARK: '#6E3522',
      BRICK_MID: '#A65336',
      BRICK_LIGHT: '#D17854',
      BRICK_MORTAR: '#4A2418',

      STEEL_DARK: '#3B424D',
      STEEL_MID: '#687382',
      STEEL_LIGHT: '#A8B3C2',
      STEEL_CORE: '#D6B472',

      FOREST_DARK: '#274F2B',
      FOREST_MID: '#447D44',
      FOREST_LIGHT: '#78AD66',

      WATER_DARK: '#225078',
      WATER_MID: '#3F7BA8',
      WATER_LIGHT: '#8FC2E0',

      ICE_DARK: '#8C9EA6',
      ICE_MID: '#C8D8DE',
      ICE_LIGHT: '#F2FAFC',

      P1: ['#7A531E', '#BD8634', '#EBBE6C', '#FFF4CE'],      // Burnished Brass Token
      P2: ['#254F32', '#3D7D4E', '#6EB57C', '#F2DF99'],      // Painted Olive Enamel Token
      ENEMY_BASIC: ['#2D3036', '#4E545E', '#7F8794', '#D1382E'], // Cast Iron Token
      ENEMY_RED: ['#6B1B1B', '#A62D29', '#D65B51', '#F2CA6B'],   // Crimson Lacquer Token
      ENEMY_GREEN: ['#27543B', '#3E825A', '#6BB587', '#FFF4CE'],
      ENEMY_GOLD: ['#785D22', '#B58D38', '#E0BC67', '#FFF4CE'],
      ENEMY_ELECTRO: ['#472E4A', '#754C78', '#A878AB', '#F2CA6B'],
    },
  };

  const SKINS_LIST = ['genshin', 'cyberpunk', 'wwii', 'metalslug', 'modern', 'wartable', 'classic'];
  BC.SKINS_LIST = SKINS_LIST;
  const VALID_SKINS = new Set(SKINS_LIST);

  function getRandomSkin(excludeSkin) {
    const pool = excludeSkin ? SKINS_LIST.filter((s) => s !== excludeSkin) : SKINS_LIST;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  let currentSkinMode = 'genshin';

  function loadInitialSkin() {
    try {
      const saved = global.localStorage && global.localStorage.getItem(SKIN_STORAGE_KEY);
      if (saved === 'random') {
        currentSkinMode = 'random';
        return getRandomSkin();
      }
      if (VALID_SKINS.has(saved)) {
        currentSkinMode = saved;
        return saved;
      }
    } catch (_) {}
    currentSkinMode = 'genshin';
    return 'genshin';
  }

  BC.SKIN = loadInitialSkin();
  BC.COLORS = BC.THEMES[BC.SKIN];

  BC.getSkin = function () {
    return BC.SKIN;
  };

  BC.getSkinMode = function () {
    return currentSkinMode;
  };

  BC.isRandomSkin = function () {
    return currentSkinMode === 'random';
  };

  BC._applySkin = function (skin) {
    if (!VALID_SKINS.has(skin)) return;
    BC.SKIN = skin;
    BC.COLORS = BC.THEMES[skin];
    if (BC.SKIN_SPRITES && BC.SKIN_SPRITES[skin]) {
      BC.SPRITES = BC.SKIN_SPRITES[skin];
    }
  };

  BC.randomizeSkin = function () {
    const nextSkin = getRandomSkin(BC.SKIN);
    BC._applySkin(nextSkin);
    return nextSkin;
  };

  BC.setSkin = function (skinOrMode) {
    if (skinOrMode === 'random') {
      currentSkinMode = 'random';
      try {
        if (global.localStorage) {
          global.localStorage.setItem(SKIN_STORAGE_KEY, 'random');
        }
      } catch (_) {}
      return BC.randomizeSkin();
    }

    if (!VALID_SKINS.has(skinOrMode)) return;
    currentSkinMode = skinOrMode;
    BC._applySkin(skinOrMode);
    try {
      if (global.localStorage) {
        global.localStorage.setItem(SKIN_STORAGE_KEY, skinOrMode);
      }
    } catch (_) {}
    return skinOrMode;
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
    [1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,3,3,3,3], // Stage 36: 八卦阵 (F*12 P*4 A*4)
    [2,2,2,2,2,2,2,2,1,1,1,1,3,3,3,3,2,2,2,2], // Stage 37: 千岛之湖 (F*4 P*12 A*4)
    [3,3,3,3,2,2,3,3,3,3,1,1,2,2,3,3,3,3,3,3], // Stage 38: 钢铁雄关 (F*2 P*4 A*14)
    [1,1,1,1,3,3,2,2,1,1,1,1,2,2,3,3,1,1,3,3], // Stage 39: 迷雾森林 (F*10 P*4 A*6)
    [2,2,2,2,2,2,2,2,1,1,1,1,3,3,3,3,2,2,2,2], // Stage 40: 双河争渡 (F*4 P*12 A*4)
    [1,1,1,1,1,1,1,1,2,2,2,2,1,1,1,1,3,3,3,3], // Stage 41: 极速冰原 (F*12 P*4 A*4)
    [2,2,2,2,2,2,2,2,1,1,1,1,3,3,3,3,2,2,2,2], // Stage 42: 十字回廊 (F*4 P*12 A*4)
    [3,3,3,3,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2], // Stage 43: 斗兽环场 (F*12 P*4 A*4)
    [2,2,2,2,3,3,3,3,3,1,1,1,1,1,1,1,1,1,1,1], // Stage 44: 战壕雷区 (F*11 P*4 A*5)
    [3,3,3,3,3,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2], // Stage 45: 蜂巢要塞 (F*11 P*4 A*5)
    [1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3], // Stage 46: 曼哈顿街区 (F*10 P*5 A*5)
    [2,2,2,2,2,3,3,3,3,3,1,1,1,1,1,1,1,1,1,1], // Stage 47: 互通立交 (F*10 P*5 A*5)
    [3,3,3,3,3,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2], // Stage 48: 港口集装箱 (F*10 P*5 A*5)
    [1,1,1,1,1,1,1,1,2,2,2,2,1,1,1,1,3,3,3,3], // Stage 49: 机场主跑道 (F*12 P*4 A*4)
    [3,3,3,3,2,2,3,3,3,3,1,1,2,2,3,3,3,3,3,3], // Stage 50: 重防金库 (F*2 P*4 A*14)
    [1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3], // Stage 51: 航天发射场 (F*10 P*5 A*5)
    [2,2,2,2,2,3,3,3,3,3,3,1,1,1,1,1,1,1,1,1], // Stage 52: 运河水闸 (F*9 P*5 A*6)
    [1,1,1,1,3,3,2,2,1,1,1,1,2,2,3,3,1,1,3,3], // Stage 53: 雨林前哨 (F*10 P*4 A*6)
    [2,2,2,2,2,3,3,3,3,3,3,1,1,1,1,1,1,1,1,1], // Stage 54: 废弃船坞 (F*9 P*5 A*6)
    [3,3,3,3,3,3,1,1,1,1,1,1,1,1,1,2,2,2,2,2], // Stage 55: 螺旋立交 (F*9 P*5 A*6)
    [1,1,1,1,1,1,1,1,2,2,2,2,2,2,3,3,3,3,3,3], // Stage 56: 双螺旋 (F*8 P*6 A*6)
    [2,2,2,2,2,2,3,3,3,3,3,3,1,1,1,1,1,1,1,1], // Stage 57: 沙漏咽喉 (F*8 P*6 A*6)
    [3,3,3,3,3,3,1,1,1,1,1,1,1,1,2,2,2,2,2,2], // Stage 58: 玛雅金字塔 (F*8 P*6 A*6)
    [2,2,2,2,2,2,3,3,3,3,3,3,1,1,1,1,1,1,1,1], // Stage 59: 八芒星阵 (F*8 P*6 A*6)
    [3,3,3,3,3,3,3,1,1,1,1,1,1,1,2,2,2,2,2,2], // Stage 60: 麦田怪圈 (F*7 P*6 A*7)
    [1,1,1,1,1,1,1,2,2,2,2,2,2,3,3,3,3,3,3,3], // Stage 61: 无限回环 (F*7 P*6 A*7)
    [2,2,2,2,2,2,3,3,3,3,3,3,3,1,1,1,1,1,1,1], // Stage 62: 国际象棋 (F*7 P*6 A*7)
    [2,2,2,2,2,2,2,2,1,1,1,1,3,3,3,3,2,2,2,2], // Stage 63: 靶心靶场 (F*4 P*12 A*4)
    [2,2,2,2,2,2,3,3,3,3,3,3,3,1,1,1,1,1,1,1], // Stage 64: 机械齿轮 (F*7 P*6 A*7)
    [3,3,3,3,3,3,3,1,1,1,1,1,1,1,2,2,2,2,2,2], // Stage 65: 分形几何 (F*7 P*6 A*7)
    [1,1,1,1,1,1,2,2,2,2,2,2,2,3,3,3,3,3,3,3], // Stage 66: 珊瑚暗礁 (F*6 P*7 A*7)
    [2,2,2,2,2,2,2,3,3,3,3,3,3,3,1,1,1,1,1,1], // Stage 67: 环形火山口 (F*6 P*7 A*7)
    [2,2,2,2,2,2,2,2,1,1,1,1,3,3,3,3,2,2,2,2], // Stage 68: 大峡谷裂隙 (F*4 P*12 A*4)
    [2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,1,1,1,1,1], // Stage 69: 极地苔原 (F*5 P*7 A*8)
    [3,3,3,3,3,3,3,3,1,1,1,1,1,2,2,2,2,2,2,2], // Stage 70: 地底暗河 (F*5 P*7 A*8)
    [1,1,1,1,3,3,2,2,1,1,1,1,2,2,3,3,1,1,3,3], // Stage 71: 芦苇深处 (F*10 P*4 A*6)
    [2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,1,1,1,1,1], // Stage 72: 三重冰川 (F*5 P*7 A*8)
    [1,1,1,1,1,1,1,1,2,2,2,2,1,1,1,1,3,3,3,3], // Stage 73: 灵蛇沙丘 (F*12 P*4 A*4)
    [1,1,1,1,3,3,2,2,1,1,1,1,2,2,3,3,1,1,3,3], // Stage 74: 幽暗沼泽 (F*10 P*4 A*6)
    [3,3,3,3,3,3,3,3,1,1,1,1,1,2,2,2,2,2,2,2], // Stage 75: 风暴海角 (F*5 P*7 A*8)
    [2,2,2,2,2,2,2,2,1,1,1,1,3,3,3,3,2,2,2,2], // Stage 76: 海神三叉戟 (F*4 P*12 A*4)
    [3,3,3,3,2,2,3,3,3,3,1,1,2,2,3,3,3,3,3,3], // Stage 77: 温泉关隘 (F*2 P*4 A*14)
    [3,3,3,3,3,3,3,3,3,1,1,1,2,2,2,2,2,2,2,2], // Stage 78: 四角棱堡 (F*3 P*8 A*9)
    [2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,1,1,1], // Stage 79: 反斜面阵地 (F*3 P*8 A*9)
    [3,3,3,3,3,3,3,3,3,1,1,1,2,2,2,2,2,2,2,2], // Stage 80: 铁翼钳击 (F*3 P*8 A*9)
    [1,1,1,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3], // Stage 81: 中央据点争夺 (F*3 P*8 A*9)
    [1,1,1,1,3,3,2,2,1,1,1,1,2,2,3,3,1,1,3,3], // Stage 82: 诱敌深入 (F*10 P*4 A*6)
    [3,3,3,3,3,3,3,3,3,1,1,1,2,2,2,2,2,2,2,2], // Stage 83: 奇门九宫 (F*3 P*8 A*9)
    [2,2,2,2,2,2,2,2,1,1,1,1,3,3,3,3,2,2,2,2], // Stage 84: 钢铁突击线 (F*4 P*12 A*4)
    [3,3,3,3,2,2,3,3,3,3,1,1,2,2,3,3,3,3,3,3], // Stage 85: 双环锁钥 (F*2 P*4 A*14)
    [1,1,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3], // Stage 86: 像素坦克纪念碑 (F*2 P*8 A*10)
    [2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,1,1], // Stage 87: 经典手柄 (F*2 P*8 A*10)
    [3,3,3,3,3,3,3,3,3,3,1,1,2,2,2,2,2,2,2,2], // Stage 88: 南梦宫之星 (F*2 P*8 A*10)
    [2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,1,1], // Stage 89: 吃豆人迷宫 (F*2 P*8 A*10)
    [3,3,3,3,3,3,3,3,3,3,1,1,2,2,2,2,2,2,2,2], // Stage 90: 太空入侵者 (F*2 P*8 A*10)
    [1,1,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3], // Stage 91: 凤翼天翔 (F*2 P*8 A*10)
    [2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,1,1], // Stage 92: 骷髅海盗湾 (F*2 P*8 A*10)
    [3,3,3,3,2,2,3,3,3,3,1,1,2,2,3,3,3,3,3,3], // Stage 93: 宙斯神盾 (F*2 P*4 A*14)
    [2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,1,1], // Stage 94: 帝王皇冠 (F*2 P*8 A*10)
    [3,3,3,3,3,3,3,3,3,3,1,1,2,2,2,2,2,2,2,2], // Stage 95: 双剑交锋 (F*2 P*8 A*10)
    [1,1,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3], // Stage 96: 深渊迷阵 (F*2 P*8 A*10)
    [1,1,1,1,1,1,1,1,2,2,2,2,1,1,1,1,3,3,3,3], // Stage 97: 闪电风暴 (F*12 P*4 A*4)
    [3,3,3,3,3,3,3,3,3,3,1,1,2,2,2,2,2,2,2,2], // Stage 98: 永冻冰堡 (F*2 P*8 A*10)
    [3,3,3,3,2,2,3,3,3,3,1,1,2,2,3,3,3,3,3,3], // Stage 99: 钢铁苍穹 (F*2 P*4 A*14)
    [3,3,3,3,2,2,2,2,3,3,3,3,1,1,2,2,3,3,3,3], // Stage 100: 百关庆典 (F*2 P*6 A*12)
    [3,3,3,3,2,2,2,2,3,3,3,3,1,1,2,2,3,3,3,3], // Stage 101: 玄武重甲 (F*2 P*6 A*12)
    [3,3,3,3,2,2,2,2,3,3,3,3,1,1,2,2,3,3,3,3], // Stage 102: 白虎穿林 (F*2 P*6 A*12)
    [3,3,3,3,2,2,2,2,3,3,3,3,1,1,2,2,3,3,3,3], // Stage 103: 朱雀炽翼 (F*2 P*6 A*12)
    [3,3,3,3,2,2,2,2,3,3,3,3,1,1,2,2,3,3,3,3], // Stage 104: 青龙潜水 (F*2 P*6 A*12)
    [3,3,3,3,2,2,2,2,3,3,3,3,1,1,2,2,3,3,3,3], // Stage 105: 终焉要塞 (F*2 P*6 A*12)
    [3,3,3,3,2,2,2,2,3,3,3,3,1,1,2,2,3,3,3,3], // Stage 106: 混沌幻境 (F*2 P*6 A*12)
    [3,3,3,3,2,2,2,2,3,3,3,3,1,1,2,2,3,3,3,3], // Stage 107: 诸神之门 (F*2 P*6 A*12)
    [3,3,3,3,2,2,2,2,3,3,3,3,1,1,2,2,3,3,3,3], // Stage 108: 决战紫禁之巅 (F*2 P*6 A*12)
  ];

  // Return exact 20-enemy ROM wave queue for a stage
  BC.buildWaveQueue = function (stageNumber) {
    const idx = ((stageNumber - 1) % BC.ROM_ENEMY_WAVES.length + BC.ROM_ENEMY_WAVES.length) % BC.ROM_ENEMY_WAVES.length;
    return BC.ROM_ENEMY_WAVES[idx].slice();
  };
})(window);
