(function (global) {
  'use strict';

  const BC = (global.BattleCity = global.BattleCity || {});

  // Exact NES Construction mode cycle of 16x16 (2x2 sub-tile) patterns:
  // Each pattern is [TL, TR, BL, BR]
  const T = BC.TILE;
  const PATTERNS = [
    { name: 'BRICK FULL',   cells: [T.BRICK, T.BRICK, T.BRICK, T.BRICK] },
    { name: 'BRICK RIGHT',  cells: [T.EMPTY, T.BRICK, T.EMPTY, T.BRICK] },
    { name: 'BRICK BOTTOM', cells: [T.EMPTY, T.EMPTY, T.BRICK, T.BRICK] },
    { name: 'BRICK LEFT',   cells: [T.BRICK, T.EMPTY, T.BRICK, T.EMPTY] },
    { name: 'BRICK TOP',    cells: [T.BRICK, T.BRICK, T.EMPTY, T.EMPTY] },
    { name: 'STEEL FULL',   cells: [T.STEEL, T.STEEL, T.STEEL, T.STEEL] },
    { name: 'STEEL RIGHT',  cells: [T.EMPTY, T.STEEL, T.EMPTY, T.STEEL] },
    { name: 'STEEL BOTTOM', cells: [T.EMPTY, T.EMPTY, T.STEEL, T.STEEL] },
    { name: 'STEEL LEFT',   cells: [T.STEEL, T.EMPTY, T.STEEL, T.EMPTY] },
    { name: 'STEEL TOP',    cells: [T.STEEL, T.STEEL, T.EMPTY, T.EMPTY] },
    { name: 'FOREST',       cells: [T.FOREST, T.FOREST, T.FOREST, T.FOREST] },
    { name: 'WATER',        cells: [T.WATER, T.WATER, T.WATER, T.WATER] },
    { name: 'ICE',          cells: [T.ICE, T.ICE, T.ICE, T.ICE] },
    { name: 'EMPTY',        cells: [T.EMPTY, T.EMPTY, T.EMPTY, T.EMPTY] },
  ];

  class MapEditor {
    constructor() {
      this.cursorX = 0; // 0..12
      this.cursorY = 0; // 0..12
      this.patternIdx = 0;
      this.lastCellKey = '';
      this.grid = [];
      this.mapView = null;
      this.tick = 0;
      this.reset();
    }

    reset() {
      const saved = BC.getCustomStage();
      if (saved) {
        this.grid = saved.map((r) => r.slice());
      } else {
        this.grid = BC.getStageGrid(1);
      }
      this._enforceProtectedZones();
      this.mapView = new BC.MapGrid(this.grid);
      this.cursorX = 6;
      this.cursorY = 6;
      this.patternIdx = 0;
      this.lastCellKey = '';
    }

    clearAll() {
      this.grid = Array.from({ length: BC.GRID_SUBTILES }, () =>
        Array(BC.GRID_SUBTILES).fill(T.EMPTY)
      );
      this._enforceProtectedZones();
      this.mapView.load(this.grid);
    }

    _isProtectedBlock(bx, by) {
      // Eagle block (6, 12), P1 spawn (4, 12), P2 spawn (8, 12), Enemy spawns (0,0), (6,0), (12,0)
      if (by === 0 && (bx === 0 || bx === 6 || bx === 12)) return true;
      if (by === 12 && (bx === 4 || bx === 6 || bx === 8)) return true;
      return false;
    }

    _enforceProtectedZones() {
      const clearBlock = (bx, by) => {
        const sx = bx * 2;
        const sy = by * 2;
        this.grid[sy][sx] = T.EMPTY;
        this.grid[sy][sx + 1] = T.EMPTY;
        this.grid[sy + 1][sx] = T.EMPTY;
        this.grid[sy + 1][sx + 1] = T.EMPTY;
      };
      clearBlock(0, 0);
      clearBlock(6, 0);
      clearBlock(12, 0);
      clearBlock(4, 12);
      clearBlock(8, 12);

      for (const [bx, by] of BC.BASE_WALL_COORDS) {
        if (this.grid[by][bx] === T.EMPTY) {
          this.grid[by][bx] = T.BRICK;
        }
      }
      this.grid[24][12] = T.EAGLE;
      this.grid[24][13] = T.EAGLE;
      this.grid[25][12] = T.EAGLE;
      this.grid[25][13] = T.EAGLE;
    }

    moveCursor(dx, dy) {
      this.cursorX = Math.max(0, Math.min(BC.GRID_BLOCKS - 1, this.cursorX + dx));
      this.cursorY = Math.max(0, Math.min(BC.GRID_BLOCKS - 1, this.cursorY + dy));
      BC.Audio.playScoreTick();
    }

    cycleAtCursor() {
      if (this._isProtectedBlock(this.cursorX, this.cursorY)) {
        BC.Audio.playHitSteel();
        return;
      }
      const key = `${this.cursorX},${this.cursorY}`;
      if (this.lastCellKey === key) {
        this.patternIdx = (this.patternIdx + 1) % PATTERNS.length;
      } else {
        // Detect current cell pattern to start cleanly, or reuse current pattern first
        const cur = this._readBlockPattern(this.cursorX, this.cursorY);
        if (cur === this.patternIdx) {
          this.patternIdx = (this.patternIdx + 1) % PATTERNS.length;
        }
        this.lastCellKey = key;
      }
      this._applyPattern(this.cursorX, this.cursorY, PATTERNS[this.patternIdx].cells);
      BC.Audio.playHitBrick();
    }

    setBlockAt(bx, by, erase = false) {
      if (bx < 0 || bx >= BC.GRID_BLOCKS || by < 0 || by >= BC.GRID_BLOCKS) return;
      const prevX = this.cursorX;
      const prevY = this.cursorY;
      this.cursorX = bx;
      this.cursorY = by;
      if (this._isProtectedBlock(bx, by)) return;
      if (erase) {
        this._applyPattern(bx, by, [T.EMPTY, T.EMPTY, T.EMPTY, T.EMPTY]);
      } else if (prevX === bx && prevY === by) {
        this.cycleAtCursor();
      } else {
        this.paintBlockAt(bx, by, false);
        BC.Audio.playHitBrick();
      }
    }

    paintBlockAt(bx, by, erase = false) {
      if (bx < 0 || bx >= BC.GRID_BLOCKS || by < 0 || by >= BC.GRID_BLOCKS) return;
      this.cursorX = bx;
      this.cursorY = by;
      if (this._isProtectedBlock(bx, by)) return;
      const cells = erase
        ? [T.EMPTY, T.EMPTY, T.EMPTY, T.EMPTY]
        : PATTERNS[this.patternIdx].cells;
      this._applyPattern(bx, by, cells);
    }

    _readBlockPattern(bx, by) {
      const sx = bx * 2;
      const sy = by * 2;
      const cur = [
        this.grid[sy][sx],
        this.grid[sy][sx + 1],
        this.grid[sy + 1][sx],
        this.grid[sy + 1][sx + 1],
      ];
      return PATTERNS.findIndex((p) => p.cells.every((v, i) => v === cur[i]));
    }

    _applyPattern(bx, by, cells) {
      const sx = bx * 2;
      const sy = by * 2;
      this.grid[sy][sx] = cells[0];
      this.grid[sy][sx + 1] = cells[1];
      this.grid[sy + 1][sx] = cells[2];
      this.grid[sy + 1][sx + 1] = cells[3];
      this._enforceProtectedZones();
      this.mapView.load(this.grid);
    }

    save() {
      this._enforceProtectedZones();
      return BC.saveCustomStage(this.grid);
    }

    update() {
      this.tick++;
    }

    draw(ctx) {
      const skin = BC.getSkin();
      const isHD = skin !== 'classic';

      // Outer border
      ctx.fillStyle = BC.COLORS.HUD_GRAY;
      ctx.fillRect(0, 0, BC.SCREEN_WIDTH, BC.SCREEN_HEIGHT);

      // Playfield ground
      ctx.fillStyle = isHD ? BC.COLORS.FIELD_BG : BC.COLORS.BLACK;
      ctx.fillRect(BC.BORDER_LEFT, BC.BORDER_TOP, BC.FIELD_SIZE, BC.FIELD_SIZE);

      // Subtle 16x16 grid guide lines
      ctx.fillStyle = isHD ? BC.COLORS.FIELD_GRID : '#141414';
      for (let i = 1; i < BC.GRID_BLOCKS; i++) {
        ctx.fillRect(BC.BORDER_LEFT + i * 16, BC.BORDER_TOP, 0.5, BC.FIELD_SIZE);
        ctx.fillRect(BC.BORDER_LEFT, BC.BORDER_TOP + i * 16, BC.FIELD_SIZE, 0.5);
      }

      if (isHD) {
        ctx.strokeStyle = BC.COLORS.GOLD_TRIM;
        ctx.lineWidth = 0.75;
        ctx.strokeRect(BC.BORDER_LEFT - 0.5, BC.BORDER_TOP - 0.5, BC.FIELD_SIZE + 1, BC.FIELD_SIZE + 1);
      }

      const waterFrame = Math.floor(this.tick / 24) % 2;
      this.mapView.drawUnderLayer(ctx, waterFrame);
      this.mapView.drawOverLayer(ctx);

      // Blinking tank cursor at (cursorX, cursorY)
      const px = BC.BORDER_LEFT + this.cursorX * 16;
      const py = BC.BORDER_TOP + this.cursorY * 16;
      if (Math.floor(this.tick / 12) % 2 === 0) {
        const tankSprite = BC.getTankSprite('P0', 'P1', BC.DIR.UP, 0);
        ctx.drawImage(tankSprite, px, py, 16, 16);
      }
      ctx.strokeStyle = Math.floor(this.tick / 12) % 2 === 0 ? '#FCFCFC' : '#FC9838';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, 15, 15);

      // Right HUD labels for Editor
      BC.drawText(ctx, 'EDIT', BC.HUD_X + 16, 24, '#000000', 'center');
      BC.drawText(ctx, `${this.cursorX + 1},${this.cursorY + 1}`, BC.HUD_X + 16, 40, '#FCFCFC', 'center');
      BC.drawText(ctx, 'OK:', BC.HUD_X + 16, 176, '#000000', 'center');
      BC.drawText(ctx, 'ENT', BC.HUD_X + 16, 186, '#FCE4A0', 'center');
      BC.drawText(ctx, 'CLR', BC.HUD_X + 16, 204, '#000000', 'center');
      BC.drawText(ctx, ' C ', BC.HUD_X + 16, 214, '#FCFCFC', 'center');

      // Bottom border hint
      BC.drawText(
        ctx,
        PATTERNS[this.patternIdx].name,
        BC.BORDER_LEFT + BC.FIELD_SIZE / 2,
        BC.BORDER_TOP + BC.FIELD_SIZE + 4,
        '#000000',
        'center'
      );
    }
  }

  BC.MapEditor = MapEditor;
})(window);
