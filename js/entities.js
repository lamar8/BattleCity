(function (global) {
  'use strict';

  const BC = (global.BattleCity = global.BattleCity || {});

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // =========================================================================
  // MapGrid (26 x 26 sub-tiles of 8x8 px, with 4x4 brick quadrant masks)
  // =========================================================================
  class MapGrid {
    constructor(initialGrid) {
      this.tiles = [];
      this.brickMasks = [];
      this.eagleAlive = true;
      this.load(initialGrid);
    }

    load(grid) {
      this.tiles = [];
      this.brickMasks = [];
      this.eagleAlive = true;
      for (let y = 0; y < BC.GRID_SUBTILES; y++) {
        const tRow = [];
        const mRow = [];
        for (let x = 0; x < BC.GRID_SUBTILES; x++) {
          const t = (grid[y] && grid[y][x] !== undefined) ? grid[y][x] : BC.TILE.EMPTY;
          tRow.push(t);
          mRow.push(t === BC.TILE.BRICK ? BC.BRICK_FULL : 0);
        }
        this.tiles.push(tRow);
        this.brickMasks.push(mRow);
      }
      this.tiles[24][12] = BC.TILE.EAGLE;
      this.tiles[24][13] = BC.TILE.EAGLE;
      this.tiles[25][12] = BC.TILE.EAGLE;
      this.tiles[25][13] = BC.TILE.EAGLE;
    }

    fortifyBase(tileType, activeTanks = null) {
      const S = BC.SUBTILE_SIZE;
      for (const [bx, by] of BC.BASE_WALL_COORDS) {
        if (activeTanks && activeTanks.length > 0) {
          const wx = bx * S;
          const wy = by * S;
          const blocked = activeTanks.some((t) =>
            t.alive && rectsOverlap(t.x, t.y, t.w, t.h, wx, wy, S, S)
          );
          if (blocked) continue;
        }
        this.tiles[by][bx] = tileType;
        this.brickMasks[by][bx] = tileType === BC.TILE.BRICK ? BC.BRICK_FULL : 0;
      }
    }

    // Check if an axis-aligned box collides with solid terrain
    collidesRect(x, y, w, h, isBullet) {
      const S = BC.SUBTILE_SIZE;
      const minTX = Math.max(0, Math.floor(x / S));
      const maxTX = Math.min(BC.GRID_SUBTILES - 1, Math.floor((x + w - 0.001) / S));
      const minTY = Math.max(0, Math.floor(y / S));
      const maxTY = Math.min(BC.GRID_SUBTILES - 1, Math.floor((y + h - 0.001) / S));

      for (let ty = minTY; ty <= maxTY; ty++) {
        for (let tx = minTX; tx <= maxTX; tx++) {
          const t = this.tiles[ty][tx];
          if (t === BC.TILE.EMPTY || t === BC.TILE.FOREST || t === BC.TILE.ICE) continue;
          if (t === BC.TILE.WATER) {
            if (!isBullet) return true;
            continue;
          }
          if (t === BC.TILE.STEEL || t === BC.TILE.EAGLE) {
            return true;
          }
          if (t === BC.TILE.BRICK) {
            const mask = this.brickMasks[ty][tx];
            if (mask === 0) continue;
            if (mask === BC.BRICK_FULL) return true;
            const px = tx * S;
            const py = ty * S;
            if ((mask & 1) && rectsOverlap(x, y, w, h, px, py, 4, 4)) return true;
            if ((mask & 2) && rectsOverlap(x, y, w, h, px + 4, py, 4, 4)) return true;
            if ((mask & 4) && rectsOverlap(x, y, w, h, px, py + 4, 4, 4)) return true;
            if ((mask & 8) && rectsOverlap(x, y, w, h, px + 4, py + 4, 4, 4)) return true;
          }
        }
      }
      return false;
    }

    isTankOnIce(x, y, w, h) {
      const S = BC.SUBTILE_SIZE;
      const minTX = Math.max(0, Math.floor(x / S));
      const maxTX = Math.min(BC.GRID_SUBTILES - 1, Math.floor((x + w - 0.001) / S));
      const minTY = Math.max(0, Math.floor(y / S));
      const maxTY = Math.min(BC.GRID_SUBTILES - 1, Math.floor((y + h - 0.001) / S));

      for (let ty = minTY; ty <= maxTY; ty++) {
        for (let tx = minTX; tx <= maxTX; tx++) {
          if (this.tiles[ty][tx] === BC.TILE.ICE) {
            return true;
          }
        }
      }
      return false;
    }

    // Apply bullet impact on terrain.
    // Returns null if no solid hit, or { type: 'brick' | 'steel_clang' | 'steel_broken' | 'eagle' }
    hitByBullet(bullet) {
      const S = BC.SUBTILE_SIZE;
      const cx = bullet.x + bullet.w / 2;
      const cy = bullet.y + bullet.h / 2;

      // Brick detection uses a 10px lateral footprint ([cx-5, cx+4]), matching the
      // original NES ROM 4-probe span so shots stay cleanly inside a 2-subtile corridor.
      // Steel and Eagle use exact 4x4 bullet footprint.
      let bx = bullet.x;
      let by = bullet.y;
      let bw = bullet.w;
      let bh = bullet.h;
      if (bullet.dir === BC.DIR.UP || bullet.dir === BC.DIR.DOWN) {
        bx = cx - 5;
        bw = 10;
      } else {
        by = cy - 5;
        bh = 10;
      }

      // Check Eagle first with exact bullet rect
      const eMinTX = Math.max(0, Math.floor(bullet.x / S));
      const eMaxTX = Math.min(BC.GRID_SUBTILES - 1, Math.floor((bullet.x + bullet.w - 0.001) / S));
      const eMinTY = Math.max(0, Math.floor(bullet.y / S));
      const eMaxTY = Math.min(BC.GRID_SUBTILES - 1, Math.floor((bullet.y + bullet.h - 0.001) / S));
      for (let ty = eMinTY; ty <= eMaxTY; ty++) {
        for (let tx = eMinTX; tx <= eMaxTX; tx++) {
          if (this.tiles[ty][tx] === BC.TILE.EAGLE) {
            if (this.eagleAlive) {
              this.eagleAlive = false;
              return { type: 'eagle' };
            }
            return { type: 'steel_clang' };
          }
        }
      }

      const minTX = Math.max(0, Math.floor(bx / S));
      const maxTX = Math.min(BC.GRID_SUBTILES - 1, Math.floor((bx + bw - 0.001) / S));
      const minTY = Math.max(0, Math.floor(by / S));
      const maxTY = Math.min(BC.GRID_SUBTILES - 1, Math.floor((by + bh - 0.001) / S));

      let hitBrick = false;
      let brokeSteel = false;
      let hitSteel = false;

      const hitTiles = [];
      for (let ty = minTY; ty <= maxTY; ty++) {
        for (let tx = minTX; tx <= maxTX; tx++) {
          const t = this.tiles[ty][tx];
          if (t === BC.TILE.STEEL) {
            if (rectsOverlap(bullet.x, bullet.y, bullet.w, bullet.h, tx * S, ty * S, S, S)) {
              hitTiles.push({ tx, ty, t });
            }
          } else if (t === BC.TILE.BRICK) {
            const mask = this.brickMasks[ty][tx];
            if (mask === 0) continue;
            const px = tx * S;
            const py = ty * S;
            if (
              ((mask & 1) && rectsOverlap(bx, by, bw, bh, px, py, 4, 4)) ||
              ((mask & 2) && rectsOverlap(bx, by, bw, bh, px + 4, py, 4, 4)) ||
              ((mask & 4) && rectsOverlap(bx, by, bw, bh, px, py + 4, 4, 4)) ||
              ((mask & 8) && rectsOverlap(bx, by, bw, bh, px + 4, py + 4, 4, 4))
            ) {
              hitTiles.push({ tx, ty, t });
            }
          }
        }
      }

      if (hitTiles.length === 0) return null;

      // Filter to leading depth slice along bullet direction (plus expand lateral brick splash to 14px)
      let frontCoord = null;
      for (const item of hitTiles) {
        const c = (bullet.dir === BC.DIR.UP || bullet.dir === BC.DIR.DOWN) ? item.ty : item.tx;
        if (frontCoord === null) {
          frontCoord = c;
        } else if (bullet.dir === BC.DIR.UP || bullet.dir === BC.DIR.LEFT) {
          if (c > frontCoord) frontCoord = c;
        } else {
          if (c < frontCoord) frontCoord = c;
        }
      }

      for (const item of hitTiles) {
        const c = (bullet.dir === BC.DIR.UP || bullet.dir === BC.DIR.DOWN) ? item.ty : item.tx;
        if (c !== frontCoord) continue;

        if (item.t === BC.TILE.STEEL) {
          hitSteel = true;
          if (bullet.power >= 2) {
            this.tiles[item.ty][item.tx] = BC.TILE.EMPTY;
            brokeSteel = true;
          }
        } else if (item.t === BC.TILE.BRICK) {
          hitBrick = true;
          let mask = this.brickMasks[item.ty][item.tx];
          if (bullet.power >= 2) {
            mask = 0;
          } else {
            if (bullet.dir === BC.DIR.UP) {
              if (mask & 0x0c) mask &= ~0x0c;
              else mask &= ~0x03;
            } else if (bullet.dir === BC.DIR.DOWN) {
              if (mask & 0x03) mask &= ~0x03;
              else mask &= ~0x0c;
            } else if (bullet.dir === BC.DIR.LEFT) {
              if (mask & 0x0a) mask &= ~0x0a;
              else mask &= ~0x05;
            } else if (bullet.dir === BC.DIR.RIGHT) {
              if (mask & 0x05) mask &= ~0x05;
              else mask &= ~0x0a;
            }
          }
          this.brickMasks[item.ty][item.tx] = mask;
          if (mask === 0) {
            this.tiles[item.ty][item.tx] = BC.TILE.EMPTY;
          }
        }
      }

      if (brokeSteel) return { type: 'steel_broken' };
      if (hitSteel && !hitBrick) return { type: 'steel_clang' };
      if (hitBrick) return { type: 'brick' };
      if (hitSteel) return { type: 'steel_clang' };
      return null;
    }

    drawUnderLayer(ctx, waterFrame) {
      const S = BC.SUBTILE_SIZE;
      const ox = BC.BORDER_LEFT;
      const oy = BC.BORDER_TOP;

      for (let ty = 0; ty < BC.GRID_SUBTILES; ty++) {
        for (let tx = 0; tx < BC.GRID_SUBTILES; tx++) {
          const t = this.tiles[ty][tx];
          const px = ox + tx * S;
          const py = oy + ty * S;
          if (t === BC.TILE.BRICK) {
            BC.drawBrickSubtile(ctx, px, py, this.brickMasks[ty][tx]);
          } else if (t === BC.TILE.STEEL) {
            ctx.drawImage(BC.SPRITES.steel, px, py, S, S);
          } else if (t === BC.TILE.WATER) {
            ctx.drawImage(BC.SPRITES.water[waterFrame & 1], px, py, S, S);
          } else if (t === BC.TILE.ICE) {
            ctx.drawImage(BC.SPRITES.ice, px, py, S, S);
          }
        }
      }

      // Eagle Base (16x16 at sub-tile 12, 24)
      const ex = ox + BC.EAGLE_SUBTILE_X * S;
      const ey = oy + BC.EAGLE_SUBTILE_Y * S;
      ctx.drawImage(
        this.eagleAlive ? BC.SPRITES.eagleAlive : BC.SPRITES.eagleDead,
        ex,
        ey,
        16,
        16
      );
    }

    drawOverLayer(ctx) {
      const S = BC.SUBTILE_SIZE;
      const ox = BC.BORDER_LEFT;
      const oy = BC.BORDER_TOP;
      const isHD = BC.getSkin() !== 'classic';
      if (isHD) {
        ctx.save();
        ctx.globalAlpha = BC.getSkin() === 'cyberpunk' ? 0.85 : 0.88;
      }

      for (let ty = 0; ty < BC.GRID_SUBTILES; ty++) {
        for (let tx = 0; tx < BC.GRID_SUBTILES; tx++) {
          if (this.tiles[ty][tx] === BC.TILE.FOREST) {
            ctx.drawImage(BC.SPRITES.forest, ox + tx * S, oy + ty * S, S, S);
          }
        }
      }

      if (isHD) {
        ctx.restore();
      }
    }
  }

  // =========================================================================
  // Tank (Player & Enemy)
  // =========================================================================
  let nextEntityId = 1;

  class Tank {
    constructor(opts) {
      this.id = nextEntityId++;
      this.isPlayer = !!opts.isPlayer;
      this.playerIndex = opts.playerIndex || 0; // 0 = P1, 1 = P2
      this.enemyType = opts.enemyType || 0;     // 0..3
      this.isBonus = !!opts.isBonus;            // Flashing red bonus carrier

      this.x = opts.x;
      this.y = opts.y;
      this.w = BC.TANK_SIZE;
      this.h = BC.TANK_SIZE;
      this.dir = opts.dir !== undefined ? opts.dir : (this.isPlayer ? BC.DIR.UP : BC.DIR.DOWN);

      this.tier = opts.tier || 0;
      this.alive = true;

      if (this.isPlayer) {
        this.hp = 1;
        this.maxHp = 1;
        this.applyTier(this.tier);
      } else {
        const st = BC.ENEMY_STATS[this.enemyType];
        this.hp = st.hp;
        this.maxHp = st.hp;
        this.speed = st.speed;
        this.bulletSpeed = st.bulletSpeed;
        this.maxBullets = 1;
        this.power = 1;
        this.points = st.points;
        this.fireRate = st.fireRate;
      }

      this.shieldTimer = opts.shieldTimer || 0;
      this.stunTimer = 0;
      this.slideTimer = 0;
      this.slideDir = this.dir;
      this.iceTurnDelay = 0;
      this.iceTurnTargetDir = null;

      this.treadFrame = 0;
      this.moveTick = 0;
      this.isMoving = false;
      this.shootCooldown = this.isPlayer ? 0 : 25 + Math.floor(Math.random() * 40);
      this.burstQueue = 0;
      this.burstTimer = 0;
      this.aiTurnCooldown = 0;
      this.flashTick = 0;
    }

    applyTier(tier) {
      this.tier = Math.max(0, Math.min(3, tier));
      const spec = BC.PLAYER_TIERS[this.tier];
      this.speed = spec.speed;
      this.bulletSpeed = spec.bulletSpeed;
      this.maxBullets = spec.maxBullets;
      this.power = spec.power;
    }

    // Attempt movement in direction with authentic 8px corner snapping (supports custom drift speed for ice inertia)
    tryMove(dir, map, allTanks, customSpeed = null) {
      if (!this.alive || this.stunTimer > 0) return false;

      const oldDir = this.dir;
      this.dir = dir;

      // Corner Snap when switching between vertical & horizontal axes
      if ((oldDir & 1) !== (dir & 1)) {
        if (dir === BC.DIR.UP || dir === BC.DIR.DOWN) {
          const snappedX = Math.round(this.x / 8) * 8;
          if (Math.abs(snappedX - this.x) <= 4.1) {
            if (!this._blockedAt(snappedX, this.y, map, allTanks)) {
              this.x = snappedX;
            }
          }
        } else {
          const snappedY = Math.round(this.y / 8) * 8;
          if (Math.abs(snappedY - this.y) <= 4.1) {
            if (!this._blockedAt(this.x, snappedY, map, allTanks)) {
              this.y = snappedY;
            }
          }
        }
      }

      const effectiveSpeed = (customSpeed !== null && customSpeed !== undefined) ? customSpeed : this.speed;
      const vec = BC.DIR_VEC[dir];
      const nx = this.x + vec.x * effectiveSpeed;
      const ny = this.y + vec.y * effectiveSpeed;

      this.isMoving = true;
      this.moveTick++;
      if (this.moveTick % 4 === 0) {
        this.treadFrame ^= 1;
      }

      if (!this._blockedAt(nx, ny, map, allTanks)) {
        this.x = nx;
        this.y = ny;
        return true;
      }

      // Fractional sub-step nudge so tank closes right up to wall cleanly even at speed < 1
      for (const frac of [0.75, 0.5, 0.25]) {
        const tx = this.x + vec.x * effectiveSpeed * frac;
        const ty = this.y + vec.y * effectiveSpeed * frac;
        if (!this._blockedAt(tx, ty, map, allTanks)) {
          this.x = tx;
          this.y = ty;
          return true;
        }
      }

      // Safe integer snap against wall (never advances into blocked space)
      if (vec.x !== 0) {
        const rx = vec.x > 0 ? Math.ceil(this.x) : Math.floor(this.x);
        if (!this._blockedAt(rx, this.y, map, allTanks)) this.x = rx;
      }
      if (vec.y !== 0) {
        const ry = vec.y > 0 ? Math.ceil(this.y) : Math.floor(this.y);
        if (!this._blockedAt(this.x, ry, map, allTanks)) this.y = ry;
      }
      return false;
    }

    _blockedAt(nx, ny, map, allTanks) {
      if (nx < 0 || ny < 0 || nx + this.w > BC.FIELD_SIZE || ny + this.h > BC.FIELD_SIZE) {
        return true;
      }
      if (map.collidesRect(nx, ny, this.w, this.h, false)) {
        return true;
      }
      for (const other of allTanks) {
        if (!other.alive || other.id === this.id) continue;
        if (rectsOverlap(nx, ny, this.w, this.h, other.x, other.y, other.w, other.h)) {
          // If already slightly overlapping (e.g. spawn edge), allow moves that separate centers
          if (rectsOverlap(this.x, this.y, this.w, this.h, other.x, other.y, other.w, other.h)) {
            const curD2 = Math.hypot(this.x - other.x, this.y - other.y);
            const newD2 = Math.hypot(nx - other.x, ny - other.y);
            if (newD2 > curD2) continue;
          }
          return true;
        }
      }
      return false;
    }

    countActiveBullets(activeBullets) {
      let count = 0;
      for (const b of activeBullets) {
        if (b.alive && b.ownerId === this.id) count++;
      }
      return count;
    }

    canFire(activeBullets) {
      if (!this.alive || this.stunTimer > 0 || this.shootCooldown > 0) return false;
      return this.countActiveBullets(activeBullets) < this.maxBullets;
    }

    createBullet() {
      const vec = BC.DIR_VEC[this.dir];
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      const bw = BC.BULLET_SIZE;
      const bx = cx - bw / 2 + vec.x * 6;
      const by = cy - bw / 2 + vec.y * 6;
      this.shootCooldown = this.isPlayer ? 10 : this.fireRate;
      return new Bullet({
        ownerId: this.id,
        isPlayerBullet: this.isPlayer,
        playerIndex: this.playerIndex,
        x: bx,
        y: by,
        dir: this.dir,
        speed: this.bulletSpeed,
        power: this.power,
      });
    }

    draw(ctx, globalFrame) {
      if (!this.alive) return;
      // Stunned teammate blinks rapidly
      if (this.stunTimer > 0 && Math.floor(globalFrame / 4) % 2 === 1) {
        return;
      }

      let designKey;
      let paletteKey;

      if (this.isPlayer) {
        designKey = 'P' + this.tier;
        paletteKey = this.playerIndex === 0 ? 'P1' : 'P2';
      } else {
        designKey = 'E' + this.enemyType;
        if (this.isBonus && Math.floor(globalFrame / 8) % 2 === 0) {
          paletteKey = 'ENEMY_RED';
        } else if (this.enemyType === BC.ENEMY_TYPE.ARMOR) {
          if (this.hp === 4) {
            paletteKey = (Math.floor(globalFrame / 4) % 2 === 0)
              ? (BC.getSkin() !== 'classic' ? 'ENEMY_ELECTRO' : 'ENEMY_GREEN')
              : 'ENEMY_GOLD';
          } else if (this.hp === 3) {
            paletteKey = 'ENEMY_GOLD';
          } else if (this.hp === 2) {
            paletteKey = 'ENEMY_GREEN';
          } else {
            paletteKey = 'ENEMY_BASIC';
          }
        } else {
          paletteKey = 'ENEMY_BASIC';
        }
      }

      const sprite = BC.getTankSprite(designKey, paletteKey, this.dir, this.treadFrame);
      const px = BC.BORDER_LEFT + Math.round(this.x);
      const py = BC.BORDER_TOP + Math.round(this.y);
      ctx.drawImage(sprite, px, py, 16, 16);

      // Shield bubble animation
      if (this.shieldTimer > 0) {
        const sf = Math.floor(globalFrame / 3) % 2;
        ctx.drawImage(BC.SPRITES.shield[sf], px, py, 16, 16);
      }
    }
  }

  // =========================================================================
  // Bullet
  // =========================================================================
  class Bullet {
    constructor(opts) {
      this.id = nextEntityId++;
      this.ownerId = opts.ownerId;
      this.isPlayerBullet = !!opts.isPlayerBullet;
      this.playerIndex = opts.playerIndex || 0;
      this.x = opts.x;
      this.y = opts.y;
      this.w = BC.BULLET_SIZE;
      this.h = BC.BULLET_SIZE;
      this.dir = opts.dir;
      this.speed = opts.speed;
      this.power = opts.power || 1;
      this.alive = true;
    }

    draw(ctx) {
      if (!this.alive) return;
      const sprite = BC.SPRITES.bullets[this.dir];
      ctx.drawImage(
        sprite,
        BC.BORDER_LEFT + Math.round(this.x),
        BC.BORDER_TOP + Math.round(this.y),
        4,
        4
      );
    }
  }

  // =========================================================================
  // PowerUp (16x16 blinking pickup)
  // =========================================================================
  class PowerUp {
    constructor(type, x, y) {
      this.type = type;
      this.x = x;
      this.y = y;
      this.w = 16;
      this.h = 16;
      this.timer = BC.FRAMES.POWERUP_LIFETIME;
      this.alive = true;
    }

    update() {
      this.timer--;
      if (this.timer <= 0) this.alive = false;
    }

    draw(ctx, globalFrame) {
      if (!this.alive) return;
      const period = this.timer < 180 ? 4 : 10;
      if (Math.floor(globalFrame / period) % 2 === 1) return;
      const sprite = BC.SPRITES.powerups[this.type];
      if (sprite) {
        ctx.drawImage(sprite, BC.BORDER_LEFT + this.x, BC.BORDER_TOP + this.y, 16, 16);
      }
    }
  }

  // =========================================================================
  // SpawnStar (4-frame twinkle animation before tank materializes)
  // =========================================================================
  class SpawnStar {
    constructor(opts) {
      this.x = opts.x;
      this.y = opts.y;
      this.isPlayer = !!opts.isPlayer;
      this.playerIndex = opts.playerIndex || 0;
      this.enemyType = opts.enemyType || 0;
      this.isBonus = !!opts.isBonus;
      this.tier = opts.tier || 0;
      this.timer = BC.FRAMES.SPAWN_ANIM;
      this.alive = true;
    }

    update() {
      this.timer--;
      if (this.timer <= 0) {
        this.alive = false;
        return true; // ready to spawn tank
      }
      return false;
    }

    draw(ctx) {
      if (!this.alive) return;
      const frame = Math.floor((BC.FRAMES.SPAWN_ANIM - this.timer) / 4) % 4;
      const sprite = BC.SPRITES.spawnStars[frame];
      ctx.drawImage(sprite, BC.BORDER_LEFT + this.x, BC.BORDER_TOP + this.y, 16, 16);
    }
  }

  // =========================================================================
  // Explosion (Small & Big — ROM 7-phase expand/contract sequence)
  // =========================================================================
  const BIG_FRAME_SEQ = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 6, 6, 6];

  class Explosion {
    constructor(cx, cy, isBig = false, onComplete = null) {
      this.cx = cx;
      this.cy = cy;
      this.isBig = isBig;
      this.onComplete = onComplete;
      this.tick = 0;
      this.maxTicks = isBig ? 24 : 12;
      this.alive = true;
    }

    update() {
      this.tick++;
      if (this.tick >= this.maxTicks) {
        this.alive = false;
        if (typeof this.onComplete === 'function') {
          this.onComplete();
        }
      }
    }

    draw(ctx) {
      if (!this.alive) return;
      const frame = this.isBig
        ? BIG_FRAME_SEQ[Math.min(23, this.tick)]
        : Math.min(2, Math.floor(this.tick / 4));
      BC.drawExplosion(
        ctx,
        BC.BORDER_LEFT + this.cx,
        BC.BORDER_TOP + this.cy,
        frame,
        this.isBig
      );
    }
  }

  // =========================================================================
  // Floating Score Popup (100, 200, 300, 400, 500)
  // =========================================================================
  class FloatingScore {
    constructor(cx, cy, value) {
      this.cx = cx;
      this.cy = cy;
      this.value = String(value);
      this.timer = 45;
      this.alive = true;
    }

    update() {
      this.timer--;
      if (this.timer <= 0) this.alive = false;
    }

    draw(ctx) {
      if (!this.alive) return;
      const px = Math.max(
        BC.BORDER_LEFT + 12,
        Math.min(BC.BORDER_LEFT + BC.FIELD_SIZE - 12, BC.BORDER_LEFT + this.cx)
      );
      const py = Math.max(
        BC.BORDER_TOP + 2,
        Math.min(BC.BORDER_TOP + BC.FIELD_SIZE - 10, BC.BORDER_TOP + this.cy - 4)
      );
      BC.drawText(ctx, this.value, px, py, '#FCFCFC', 'center');
    }
  }

  BC.rectsOverlap = rectsOverlap;
  BC.MapGrid = MapGrid;
  BC.Tank = Tank;
  BC.Bullet = Bullet;
  BC.PowerUp = PowerUp;
  BC.SpawnStar = SpawnStar;
  BC.Explosion = Explosion;
  BC.FloatingScore = FloatingScore;
})(window);
