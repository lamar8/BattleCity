(function (global) {
  'use strict';

  const BC = (global.BattleCity = global.BattleCity || {});

  const HI_SCORE_KEY = 'battle_city_hi_score_v1';

  const STATE = {
    TITLE: 'TITLE',
    STAGE_SELECT: 'STAGE_SELECT',
    PLAYING: 'PLAYING',
    STAGE_CLEAR_DELAY: 'STAGE_CLEAR_DELAY',
    GAME_OVER_FALL: 'GAME_OVER_FALL',
    TALLY: 'TALLY',
    GAME_OVER_SCREEN: 'GAME_OVER_SCREEN',
    EDITOR: 'EDITOR',
  };

  class BattleCityGame {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;

      this.state = STATE.TITLE;
      this.globalFrame = 0;
      this.speedScale = 1.0;
      this.starRate = this._loadStarRate();

      // Persistent High Score (NES default starts at 20000)
      this.hiScore = this._loadHiScore();
      this.lastP1Score = 0;

      // Menu / Transition state
      this.menuIndex = 0; // 0 = 1P, 1 = 2P, 2 = CONSTRUCTION
      this.titleSlideY = 240;
      this.isTwoPlayer = false;
      this.stage = 1;
      this.canBrowseStage = false;
      this.curtainProgress = 0; // 0 = open, 120 = closed
      this.curtainPhase = 'closing'; // 'closing' | 'wait' | 'opening'
      this.curtainWaitTimer = 0;

      // Gameplay Entities
      this.map = new BC.MapGrid(BC.getStageGrid(1));
      this.players = []; // metadata: { lives, score, tier, nextLifeScore, kills: [0,0,0,0], tank, respawnTimer }
      this.enemies = [];
      this.bullets = [];
      this.powerUps = [];
      this.spawnStars = [];
      this.explosions = [];
      this.floatingScores = [];

      // Stage runtime counters
      this.enemyQueue = [];
      this.spawnedCount = 0;
      this.spawnTimer = 0;
      this.spawnPosIndex = 0;
      this.freezeTimer = 0;
      this.shovelTimer = 0;
      this.paused = false;
      this.stageClearTimer = 0;
      this.gameOverY = 224;
      this.gameOverHold = 0;
      this.gameOverAfterTally = false;
      this.gameOverScreenTimer = 0;

      // Tally animation state
      this.tallyStep = 0; // 0..3 enemy rows, 4 = done/bonus
      this.tallyCount = 0;
      this.tallyTick = 0;
      this.tallyDoneWait = 0;
      this.tallyBonusAwarded = false;

      // Map Editor
      this.editor = new BC.MapEditor();

      // Input state
      this.keysDown = new Set();
      this.keysPressed = new Set();
      this.touchState = { up: false, down: false, left: false, right: false, fire: false };

      this._bindInputs();
      this._notifyUI();
    }

    _loadStarRate() {
      try {
        const v = parseFloat(global.localStorage.getItem('battle_city_star_rate_v1'));
        if (Number.isFinite(v) && v >= 0 && v <= 1) return v;
      } catch (_) {}
      return 0.25;
    }

    _loadHiScore() {
      try {
        const val = parseInt(global.localStorage.getItem(HI_SCORE_KEY), 10);
        return Number.isFinite(val) && val >= 20000 ? val : 20000;
      } catch (_) {
        return 20000;
      }
    }

    _saveHiScore() {
      try {
        global.localStorage.setItem(HI_SCORE_KEY, String(this.hiScore));
      } catch (_) {}
    }

    _updateHiScore(score) {
      if (score > this.hiScore) {
        this.hiScore = score;
        this._saveHiScore();
      }
    }

    _bindInputs() {
      global.addEventListener('keydown', (e) => {
        BC.Audio.unlock();
        const code = e.code;
        if (
          [
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'Space', 'Enter', 'KeyW', 'KeyA', 'KeyS', 'KeyD',
            'KeyJ', 'KeyK', 'KeyZ', 'KeyP', 'Escape',
            'Slash', 'KeyL', 'KeyC', 'Numpad0', 'Numpad1', 'ShiftRight',
          ].includes(code)
        ) {
          e.preventDefault();
        }
        if (!this.keysDown.has(code)) {
          this.keysPressed.add(code);
        }
        this.keysDown.add(code);
      });

      global.addEventListener('keyup', (e) => {
        this.keysDown.delete(e.code);
      });

      global.addEventListener('blur', () => {
        this.keysDown.clear();
        BC.Audio.updateEngine(false, false);
      });

      // Mouse support for Map Editor (click & continuous drag-paint)
      const getEditorCell = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = BC.SCREEN_WIDTH / rect.width;
        const scaleY = BC.SCREEN_HEIGHT / rect.height;
        const x = (e.clientX - rect.left) * scaleX - BC.BORDER_LEFT;
        const y = (e.clientY - rect.top) * scaleY - BC.BORDER_TOP;
        if (x >= 0 && x < BC.FIELD_SIZE && y >= 0 && y < BC.FIELD_SIZE) {
          return { bx: Math.floor(x / 16), by: Math.floor(y / 16) };
        }
        return null;
      };

      this.canvas.addEventListener('mousedown', (e) => {
        BC.Audio.unlock();
        if (this.state !== STATE.EDITOR) return;
        const cell = getEditorCell(e);
        if (cell) {
          this.editor.setBlockAt(cell.bx, cell.by, e.button === 2);
        }
      });

      this.canvas.addEventListener('mousemove', (e) => {
        if (this.state !== STATE.EDITOR) return;
        if (e.buttons === 1 || e.buttons === 2) {
          const cell = getEditorCell(e);
          if (cell) {
            this.editor.paintBlockAt(cell.bx, cell.by, e.buttons === 2);
          }
        }
      });

      this.canvas.addEventListener('contextmenu', (e) => {
        if (this.state === STATE.EDITOR) e.preventDefault();
      });
    }

    setTouchInput(action, active) {
      BC.Audio.unlock();
      if (active && !this.touchState[action]) {
        if (action === 'up') this.keysPressed.add('ArrowUp');
        if (action === 'down') this.keysPressed.add('ArrowDown');
        if (action === 'left') this.keysPressed.add('ArrowLeft');
        if (action === 'right') this.keysPressed.add('ArrowRight');
        if (action === 'fire') this.keysPressed.add('Space');
      }
      this.touchState[action] = active;
    }

    _justPressed(...codes) {
      return codes.some((c) => this.keysPressed.has(c));
    }

    _isHeld(...codes) {
      return codes.some((c) => this.keysDown.has(c));
    }

    // External UI hook for quick stage jump / reset / pause
    jumpToStage(stageNum, twoPlayer = null) {
      BC.Audio.unlock();
      if (twoPlayer !== null) {
        this.isTwoPlayer = twoPlayer;
      }
      this._initPlayers();
      this.stage = Math.max(1, Math.min(BC.TOTAL_CLASSIC_STAGES + (BC.hasCustomStage() ? 1 : 0), stageNum));
      this._enterStageSelect(false);
    }

    returnToTitle() {
      BC.Audio.updateEngine(false, false);
      this.state = STATE.TITLE;
      this.titleSlideY = 0;
      this.paused = false;
      this._notifyUI();
    }

    togglePause() {
      if (this.state === STATE.PLAYING) {
        this.paused = !this.paused;
        BC.Audio.playPause();
        if (this.paused) BC.Audio.updateEngine(false, false);
        this._notifyUI();
      }
    }

    setSpeedScale(scale) {
      this.speedScale = Math.max(0.5, Math.min(1.5, Number(scale) || 1.0));
    }

    setStarRate(rate) {
      const r = Math.max(0, Math.min(1, Number(rate)));
      this.starRate = Number.isFinite(r) ? r : 0.25;
      try {
        if (global.localStorage) {
          global.localStorage.setItem('battle_city_star_rate_v1', String(this.starRate));
        }
      } catch (_) {}
    }

    setBasicBulletSpeed(speed) {
      BC.setBasicBulletSpeed(speed);
      for (const p of this.players) {
        if (p.tank) p.tank.applyTier(p.tier);
      }
    }

    setSkin(skin) {
      BC.setSkin(skin);
      this._notifyUI();
    }

    _notifyUI() {
      if (typeof this.onStateChange === 'function') {
        this.onStateChange({
          state: this.state,
          stage: this.stage,
          paused: this.paused,
          isTwoPlayer: this.isTwoPlayer,
          hasCustom: BC.hasCustomStage(),
        });
      }
    }

    // =======================================================================
    // Main Fixed-Timestep 60Hz Update
    // =======================================================================
    update() {
      this.globalFrame++;

      switch (this.state) {
        case STATE.TITLE:
          this._updateTitle();
          break;
        case STATE.STAGE_SELECT:
          this._updateStageSelect();
          break;
        case STATE.PLAYING:
          this._updatePlaying();
          break;
        case STATE.STAGE_CLEAR_DELAY:
          this._updateStageClearDelay();
          break;
        case STATE.GAME_OVER_FALL:
          this._updateGameOverFall();
          break;
        case STATE.TALLY:
          this._updateTally();
          break;
        case STATE.GAME_OVER_SCREEN:
          this._updateGameOverScreen();
          break;
        case STATE.EDITOR:
          this._updateEditor();
          break;
      }

      this.keysPressed.clear();
    }

    // =======================================================================
    // TITLE SCREEN
    // =======================================================================
    _updateTitle() {
      BC.Audio.updateEngine(false, false);

      if (this.titleSlideY > 0) {
        if (this._justPressed('Enter', 'Space', 'KeyJ', 'KeyZ')) {
          this.titleSlideY = 0;
          return;
        }
        this.titleSlideY = Math.max(0, this.titleSlideY - 3);
        return;
      }

      if (this._justPressed('ArrowUp', 'KeyW')) {
        this.menuIndex = (this.menuIndex + 2) % 3;
        BC.Audio.playScoreTick();
      } else if (this._justPressed('ArrowDown', 'KeyS')) {
        this.menuIndex = (this.menuIndex + 1) % 3;
        BC.Audio.playScoreTick();
      } else if (this._justPressed('Enter', 'Space', 'KeyJ', 'KeyZ')) {
        if (this.menuIndex === 0 || this.menuIndex === 1) {
          this.isTwoPlayer = this.menuIndex === 1;
          this.stage = 1;
          this._initPlayers();
          this._enterStageSelect(true);
        } else {
          this.editor.reset();
          this.state = STATE.EDITOR;
          this._notifyUI();
        }
      }
    }

    _initPlayers() {
      const count = this.isTwoPlayer ? 2 : 1;
      this.players = [];
      for (let i = 0; i < count; i++) {
        this.players.push({
          index: i,
          lives: 3, // HUD displays lives - 1 = 2 spare tanks
          score: 0,
          tier: 0,
          nextLifeScore: 20000,
          kills: [0, 0, 0, 0],
          tank: null,
          respawnTimer: 0,
          pendingStar: null,
        });
      }
    }

    // =======================================================================
    // STAGE SELECT & CURTAIN
    // =======================================================================
    _enterStageSelect(allowBrowse) {
      this.canBrowseStage = allowBrowse;
      this.state = STATE.STAGE_SELECT;
      this.curtainProgress = 0;
      this.curtainPhase = 'closing';
      this.curtainWaitTimer = allowBrowse ? 0 : 75;
      this.paused = false;
      BC.Audio.updateEngine(false, false);
      this._notifyUI();
    }

    _getMaxSelectableStage() {
      return BC.hasCustomStage() ? BC.TOTAL_CLASSIC_STAGES + 1 : BC.TOTAL_CLASSIC_STAGES;
    }

    _updateStageSelect() {
      if (this.curtainPhase === 'closing') {
        this.curtainProgress = Math.min(120, this.curtainProgress + 6);
        if (this.curtainProgress >= 120) {
          this.curtainPhase = 'wait';
          if (!this.canBrowseStage) {
            this._prepareStageEntities();
            BC.Audio.playIntro();
          }
        }
        return;
      }

      if (this.curtainPhase === 'wait') {
        if (this.canBrowseStage) {
          const maxStage = this._getMaxSelectableStage();
          if (this._justPressed('ArrowUp', 'KeyW', 'ArrowRight', 'KeyD')) {
            this.stage = this.stage >= maxStage ? 1 : this.stage + 1;
            BC.Audio.playScoreTick();
            this._notifyUI();
          } else if (this._justPressed('ArrowDown', 'KeyS', 'ArrowLeft', 'KeyA')) {
            this.stage = this.stage <= 1 ? maxStage : this.stage - 1;
            BC.Audio.playScoreTick();
            this._notifyUI();
          } else if (this._justPressed('Enter', 'Space', 'KeyJ', 'KeyZ')) {
            this.canBrowseStage = false;
            this._prepareStageEntities();
            BC.Audio.playIntro();
            this.curtainPhase = 'opening';
          } else if (this._justPressed('Escape')) {
            this.returnToTitle();
          }
        } else {
          this.curtainWaitTimer--;
          if (this.curtainWaitTimer <= 0) {
            this.curtainPhase = 'opening';
          }
        }
        return;
      }

      if (this.curtainPhase === 'opening') {
        this.curtainProgress = Math.max(0, this.curtainProgress - 6);
        if (this.curtainProgress <= 0) {
          this.state = STATE.PLAYING;
          this._notifyUI();
        }
      }
    }

    _prepareStageEntities() {
      this.map = new BC.MapGrid(BC.getStageGrid(this.stage));
      this.enemies = [];
      this.bullets = [];
      this.powerUps = [];
      this.spawnStars = [];
      this.explosions = [];
      this.floatingScores = [];

      this.enemyQueue = BC.buildWaveQueue(this.stage);
      this.spawnedCount = 0;
      this.spawnTimer = 15;
      this.spawnPosIndex = 0;
      this.freezeTimer = 0;
      this.shovelTimer = 0;
      this.paused = false;
      this.gameOverAfterTally = false;

      // Reset per-stage kills; preserve remaining lives across stages (no reset to 3)
      if (!this.players || this.players.length === 0) {
        this._initPlayers();
      }

      for (const p of this.players) {
        p.kills = [0, 0, 0, 0];
        p.tank = null;
        p.pendingStar = null;
        p.respawnTimer = 0;
        if (p.lives > 0) {
          const sp = BC.PLAYER_SPAWNS[p.index];
          p.tank = new BC.Tank({
            isPlayer: true,
            playerIndex: p.index,
            x: sp.x,
            y: sp.y,
            dir: BC.DIR.UP,
            tier: p.tier,
            shieldTimer: BC.FRAMES.SPAWN_SHIELD_PLAYER,
          });
        }
      }
      this._notifyUI();
    }

    // =======================================================================
    // MAIN GAMEPLAY LOOP
    // =======================================================================
    _updatePlaying() {
      if (this._justPressed('KeyP', 'Escape', 'Enter')) {
        this.togglePause();
        return;
      }
      if (this.paused) return;

      this._stepWorld(true);

      // Victory condition: queue exhausted + no enemy stars + no alive enemies
      const activeEnemyStars = this.spawnStars.some((s) => !s.isPlayer && s.alive);
      if (
        this.enemyQueue.length === 0 &&
        !activeEnemyStars &&
        this.enemies.every((e) => !e.alive)
      ) {
        this.state = STATE.STAGE_CLEAR_DELAY;
        this.stageClearTimer = BC.FRAMES.STAGE_CLEAR_DELAY;
        return;
      }

      // Defeat condition: all players dead with 0 lives
      const anyPlayerAliveOrRespawning = this.players.some(
        (p) => p.lives > 0 || (p.tank && p.tank.alive) || (p.pendingStar && p.pendingStar.alive)
      );
      if (!anyPlayerAliveOrRespawning) {
        this._triggerGameOver();
      }
    }

    _updateStageClearDelay() {
      this._stepWorld(true);
      this.stageClearTimer--;
      if (this.stageClearTimer <= 0) {
        BC.Audio.updateEngine(false, false);
        this._enterTally(false);
      }
    }

    _updateGameOverFall() {
      // Players cannot act during Game Over text rising, enemies keep moving for drama
      this._stepWorld(false);
      if (this.gameOverY > 112) {
        this.gameOverY = Math.max(112, this.gameOverY - 1.5);
      } else {
        this.gameOverHold++;
        if (this.gameOverHold >= 60) {
          BC.Audio.updateEngine(false, false);
          this._enterTally(true);
        }
      }
    }

    _triggerGameOver() {
      if (this.state === STATE.GAME_OVER_FALL) return;
      this.state = STATE.GAME_OVER_FALL;
      this.gameOverY = 224;
      this.gameOverHold = 0;
      this.shovelTimer = 0;
      BC.Audio.updateEngine(false, false);
    }

    _stepWorld(allowPlayerControl) {
      const allTanks = this._getAllAliveTanks();

      // 1. Shovel fortification timer
      if (this.shovelTimer > 0) {
        if (!this.map.eagleAlive) {
          this.shovelTimer = 0;
        } else {
          this.shovelTimer--;
          if (this.shovelTimer === 0) {
            this.map.fortifyBase(BC.TILE.BRICK, allTanks);
          } else if (this.shovelTimer <= BC.FRAMES.SHOVEL_BLINK_START) {
            const useSteel = Math.floor(this.shovelTimer / 10) % 2 === 0;
            this.map.fortifyBase(useSteel ? BC.TILE.STEEL : BC.TILE.BRICK, allTanks);
          }
        }
      }

      // 2. Freeze timer
      if (this.freezeTimer > 0) {
        this.freezeTimer--;
      }

      // 3. Player Respawns & Controls
      if (allowPlayerControl && this.state === STATE.PLAYING && this.isTwoPlayer && this.players.length >= 2) {
        this._checkBorrowLife();
      }

      let anyPlayerActive = false;
      let anyPlayerMoving = false;

      for (const p of this.players) {
        if (!p.tank || !p.tank.alive) {
          if (p.pendingStar && p.pendingStar.alive) {
            if (p.pendingStar.update()) {
              const sp = BC.PLAYER_SPAWNS[p.index];
              p.tank = new BC.Tank({
                isPlayer: true,
                playerIndex: p.index,
                x: sp.x,
                y: sp.y,
                dir: BC.DIR.UP,
                tier: p.tier,
                shieldTimer: BC.FRAMES.SPAWN_SHIELD_PLAYER,
              });
              p.pendingStar = null;
            }
          } else {
            if (p.respawnTimer > 0) {
              p.respawnTimer--;
            }
            if (p.lives > 0 && p.respawnTimer <= 0) {
              const sp = BC.PLAYER_SPAWNS[p.index];
              p.pendingStar = new BC.SpawnStar({
                x: sp.x,
                y: sp.y,
                isPlayer: true,
                playerIndex: p.index,
                tier: p.tier,
              });
              this.spawnStars.push(p.pendingStar);
            }
          }
          continue;
        }

        const t = p.tank;
        anyPlayerActive = true;
        if (t.shieldTimer > 0) t.shieldTimer--;
        if (t.stunTimer > 0) {
          t.stunTimer--;
          t.burstQueue = 0;
          t.burstTimer = 0;
        }
        if (t.shootCooldown > 0) t.shootCooldown--;
        if (t.burstTimer > 0) t.burstTimer--;
        t.isMoving = false;

        if (allowPlayerControl && t.stunTimer <= 0) {
          const ctrl = this._readPlayerControls(p.index);
          if (ctrl.dir !== null) {
            t.tryMove(ctrl.dir, this.map, allTanks);
            anyPlayerMoving = true;
            if (this.map.isTankOnIce(t.x, t.y, t.w, t.h)) {
              t.slideDir = ctrl.dir;
              t.slideTimer = BC.FRAMES.ICE_SLIDE_FRAMES;
            } else {
              t.slideTimer = 0;
            }
          } else if (t.slideTimer > 0) {
            if (this.map.isTankOnIce(t.x, t.y, t.w, t.h)) {
              t.slideTimer--;
              t.tryMove(t.slideDir, this.map, allTanks);
              anyPlayerMoving = true;
            } else {
              t.slideTimer = 0;
            }
          }

          if (ctrl.fire && t.canFire(this.bullets)) {
            const activeBefore = t.countActiveBullets(this.bullets);
            this.bullets.push(t.createBullet());
            BC.Audio.playShoot();
            if (t.maxBullets >= 2 && activeBefore === 0) {
              t.burstQueue = 1;
              t.burstTimer = 6;
            }
          } else if (t.burstQueue > 0 && t.burstTimer <= 0) {
            if (t.countActiveBullets(this.bullets) < t.maxBullets) {
              this.bullets.push(t.createBullet());
              BC.Audio.playShoot();
            }
            t.burstQueue = 0;
          }
        }
      }

      BC.Audio.updateEngine(allowPlayerControl && anyPlayerActive, anyPlayerMoving);

      // 4. Enemy Spawner
      const maxConcurrent = this.isTwoPlayer ? 6 : 4;
      const activeEnemyCount =
        this.enemies.filter((e) => e.alive).length +
        this.spawnStars.filter((s) => !s.isPlayer && s.alive).length;

      if (this.enemyQueue.length > 0 && activeEnemyCount < maxConcurrent) {
        this.spawnTimer--;
        if (this.spawnTimer <= 0) {
          const spot = this._findClearSpawnSpot(allTanks);
          if (spot) {
            const enemyType = this.enemyQueue.shift();
            const isBonus = BC.BONUS_ENEMY_INDICES.has(this.spawnedCount);
            this.spawnedCount++;
            this.spawnStars.push(
              new BC.SpawnStar({
                x: spot.x,
                y: spot.y,
                isPlayer: false,
                enemyType,
                isBonus,
              })
            );
            const romBaseDelay = Math.max(
              50,
              190 - this.stage * 4 - (this.isTwoPlayer ? 20 : 0)
            );
            this.spawnTimer = activeEnemyCount === 0 ? 60 : romBaseDelay;
          } else {
            this.spawnTimer = 25;
          }
        }
      }

      // 5. Update Enemy SpawnStars
      for (const star of this.spawnStars) {
        if (!star.alive || star.isPlayer) continue;
        if (star.update()) {
          const enemy = new BC.Tank({
            isPlayer: false,
            enemyType: star.enemyType,
            isBonus: star.isBonus,
            x: star.x,
            y: star.y,
            dir: BC.DIR.DOWN,
          });
          this.enemies.push(enemy);
          allTanks.push(enemy);
        }
      }
      this.spawnStars = this.spawnStars.filter((s) => s.alive);

      // 6. Enemy AI Movement & Firing
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (this.freezeTimer > 0) continue;
        if (e.shootCooldown > 0) e.shootCooldown--;
        if (e.aiTurnCooldown > 0) e.aiTurnCooldown--;

        const moved = e.tryMove(e.dir, this.map, allTanks);
        if (!moved) {
          e.dir = this._chooseEnemyDirection(e, allTanks);
          e.aiTurnCooldown = 10;
        } else if (
          e.aiTurnCooldown <= 0 &&
          Math.abs(e.x - Math.round(e.x / 16) * 16) < 0.6 &&
          Math.abs(e.y - Math.round(e.y / 16) * 16) < 0.6 &&
          Math.random() < 0.045
        ) {
          e.dir = this._chooseEnemyDirection(e, allTanks);
          e.aiTurnCooldown = 32 + Math.floor(Math.random() * 16);
        }

        // Fire decision
        if (e.canFire(this.bullets)) {
          const chance = e.dir === BC.DIR.DOWN ? 0.025 : 0.014;
          if (!moved || Math.random() < chance) {
            this.bullets.push(e.createBullet());
          }
        }
      }

      // 7. Update Bullets (sub-stepped 1px at a time to prevent tunneling)
      this._updateBullets();

      // 8. Power-ups Pickup & Lifetime
      for (const pu of this.powerUps) {
        if (!pu.alive) continue;
        pu.update();
        if (!pu.alive) continue;
        for (const p of this.players) {
          if (p.tank && p.tank.alive && BC.rectsOverlap(p.tank.x, p.tank.y, 16, 16, pu.x, pu.y, 16, 16)) {
            this._collectPowerUp(p, pu);
            break;
          }
        }
      }
      this.powerUps = this.powerUps.filter((pu) => pu.alive);

      // 9. Explosions & Floating Scores
      for (const ex of this.explosions) ex.update();
      this.explosions = this.explosions.filter((ex) => ex.alive);

      for (const fs of this.floatingScores) fs.update();
      this.floatingScores = this.floatingScores.filter((fs) => fs.alive);

      // Clean up dead enemies
      this.enemies = this.enemies.filter((e) => e.alive);
    }

    _checkBorrowLife() {
      for (const p of this.players) {
        // Can only borrow if completely dead: 0 lives, no active tank, no spawn star, explosion finished
        if (p.lives > 0) continue;
        if (p.tank && p.tank.alive) continue;
        if (p.pendingStar && p.pendingStar.alive) continue;
        if (p.respawnTimer > 0) continue;

        const teammate = this.players[1 - p.index];
        // Teammate must have at least 2 lives (1 active/last life + at least 1 spare to lend)
        if (!teammate || teammate.lives < 2) continue;

        let wantsBorrow = false;
        if (p.index === 0) {
          // 1P borrow input: Fire keys (Space, J, F, G, Z), B key, touch fire, or holding A+B
          const justPressed =
            this._justPressed('Space', 'KeyJ', 'KeyF', 'KeyG', 'KeyZ', 'KeyB') ||
            this.touchState.fire;
          const comboHeld =
            ((this._isHeld('KeyJ') || this._isHeld('Space')) &&
              (this._isHeld('KeyK') || this._isHeld('KeyB') || this._isHeld('KeyZ'))) ||
            (this._isHeld('KeyA') && this._isHeld('KeyB'));
          wantsBorrow = justPressed || comboHeld;
        } else {
          // 2P borrow input: Fire keys (K, L, Numpad0, Numpad1, Slash, ShiftRight, Enter, NumpadEnter), or holding combo
          const justPressed = this._justPressed(
            'KeyK',
            'KeyL',
            'Numpad0',
            'Numpad1',
            'Slash',
            'ShiftRight',
            'Enter',
            'NumpadEnter'
          );
          const comboHeld =
            (this._isHeld('KeyK') || this._isHeld('Numpad0')) &&
            (this._isHeld('KeyL') || this._isHeld('Numpad1') || this._isHeld('Enter'));
          wantsBorrow = justPressed || comboHeld;
        }

        if (wantsBorrow) {
          teammate.lives--;
          p.lives = 1;
          p.tier = 0;
          p.respawnTimer = 0;

          const sp = BC.PLAYER_SPAWNS[p.index];
          p.pendingStar = new BC.SpawnStar({
            x: sp.x,
            y: sp.y,
            isPlayer: true,
            playerIndex: p.index,
            tier: p.tier,
          });
          this.spawnStars.push(p.pendingStar);
          this.floatingScores.push(new BC.FloatingScore(sp.x + 8, sp.y + 8, '1UP'));
          BC.Audio.playLifeUp();
          this._notifyUI();
        }
      }
    }

    _readPlayerControls(playerIndex) {
      let dir = null;
      let fire = false;

      if (playerIndex === 0) {
        if (!this.isTwoPlayer) {
          // 1P mode: both WASD & Arrow keys work seamlessly
          if (this._isHeld('KeyW', 'ArrowUp') || this.touchState.up) dir = BC.DIR.UP;
          else if (this._isHeld('KeyS', 'ArrowDown') || this.touchState.down) dir = BC.DIR.DOWN;
          else if (this._isHeld('KeyA', 'ArrowLeft') || this.touchState.left) dir = BC.DIR.LEFT;
          else if (this._isHeld('KeyD', 'ArrowRight') || this.touchState.right) dir = BC.DIR.RIGHT;

          fire =
            this._justPressed('Space', 'KeyJ', 'KeyZ', 'KeyK') ||
            this._isHeld('Space', 'KeyJ', 'KeyZ', 'KeyK') ||
            this.touchState.fire;
        } else {
          // 2P mode P1: WASD + Space / J / F / G
          if (this._isHeld('KeyW') || this.touchState.up) dir = BC.DIR.UP;
          else if (this._isHeld('KeyS') || this.touchState.down) dir = BC.DIR.DOWN;
          else if (this._isHeld('KeyA') || this.touchState.left) dir = BC.DIR.LEFT;
          else if (this._isHeld('KeyD') || this.touchState.right) dir = BC.DIR.RIGHT;

          fire = this._isHeld('Space', 'KeyJ', 'KeyF', 'KeyG') || this.touchState.fire;
        }
      } else {
        // 2P mode P2: Arrow Keys + Numpad0 / Numpad1 / K / L / Slash / ShiftRight
        if (this._isHeld('ArrowUp')) dir = BC.DIR.UP;
        else if (this._isHeld('ArrowDown')) dir = BC.DIR.DOWN;
        else if (this._isHeld('ArrowLeft')) dir = BC.DIR.LEFT;
        else if (this._isHeld('ArrowRight')) dir = BC.DIR.RIGHT;

        fire = this._isHeld('Numpad0', 'Numpad1', 'KeyK', 'KeyL', 'Slash', 'ShiftRight');
      }

      return { dir, fire };
    }

    _getAllAliveTanks() {
      const list = [];
      for (const p of this.players) {
        if (p.tank && p.tank.alive) list.push(p.tank);
      }
      for (const e of this.enemies) {
        if (e.alive) list.push(e);
      }
      return list;
    }

    _findClearSpawnSpot(allTanks) {
      for (let i = 0; i < 3; i++) {
        const idx = (this.spawnPosIndex + i) % 3;
        const spot = BC.ENEMY_SPAWNS[idx];
        const blockedByTank = allTanks.some((t) =>
          BC.rectsOverlap(t.x, t.y, 16, 16, spot.x, spot.y, 16, 16)
        );
        const blockedByStar = this.spawnStars.some(
          (s) => s.alive && BC.rectsOverlap(s.x, s.y, 16, 16, spot.x, spot.y, 16, 16)
        );
        if (!blockedByTank && !blockedByStar) {
          this.spawnPosIndex = (idx + 1) % 3;
          return spot;
        }
      }
      return null;
    }

    _canEnemyStep(enemy, dir, allTanks) {
      const vec = BC.DIR_VEC[dir];
      const nx = enemy.x + vec.x * 4;
      const ny = enemy.y + vec.y * 4;
      return !enemy._blockedAt(nx, ny, this.map, allTanks);
    }

    _chooseEnemyDirection(enemy, allTanks = null) {
      const otherDirs = [0, 1, 2, 3].filter((d) => d !== enemy.dir);
      const openDirs = allTanks
        ? otherDirs.filter((d) => this._canEnemyStep(enemy, d, allTanks))
        : otherDirs;

      // Tactical bias: steer toward Eagle Base (96, 192) or alive player
      const r = Math.random();
      let targetX = 96;
      let targetY = 192;

      if (r < 0.28) {
        const aliveP = this.players.find((p) => p.tank && p.tank.alive);
        if (aliveP) {
          targetX = aliveP.tank.x;
          targetY = aliveP.tank.y;
        }
      }

      if (r < 0.72) {
        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const candidates = [];
        if (Math.abs(dy) >= Math.abs(dx)) {
          candidates.push(dy >= 0 ? BC.DIR.DOWN : BC.DIR.UP);
          candidates.push(dx >= 0 ? BC.DIR.RIGHT : BC.DIR.LEFT);
        } else {
          candidates.push(dx >= 0 ? BC.DIR.RIGHT : BC.DIR.LEFT);
          candidates.push(dy >= 0 ? BC.DIR.DOWN : BC.DIR.UP);
        }

        // 1st priority: tactical candidate that is unblocked
        for (const d of candidates) {
          if (d !== enemy.dir && openDirs.includes(d)) return d;
        }
      }

      // 2nd priority: any other unblocked direction
      if (openDirs.length > 0) {
        return openDirs[Math.floor(Math.random() * openDirs.length)];
      }

      // Fallback if all 3 alternatives are blocked: reverse or random
      const reverseDir = (enemy.dir + 2) % 4;
      if (allTanks && this._canEnemyStep(enemy, reverseDir, allTanks)) {
        return reverseDir;
      }
      return otherDirs[Math.floor(Math.random() * otherDirs.length)];
    }

    _updateBullets() {
      for (const b of this.bullets) {
        if (!b.alive) continue;
        const vec = BC.DIR_VEC[b.dir];
        const steps = Math.max(1, Math.ceil(b.speed));
        const stepSize = b.speed / steps;

        for (let s = 0; s < steps; s++) {
          if (!b.alive) break;
          b.x += vec.x * stepSize;
          b.y += vec.y * stepSize;

          // 1. Playfield boundary
          if (b.x < 0 || b.y < 0 || b.x + b.w > BC.FIELD_SIZE || b.y + b.h > BC.FIELD_SIZE) {
            b.alive = false;
            const cx = Math.max(2, Math.min(BC.FIELD_SIZE - 2, b.x + b.w / 2));
            const cy = Math.max(2, Math.min(BC.FIELD_SIZE - 2, b.y + b.h / 2));
            this.explosions.push(new BC.Explosion(cx, cy, false));
            if (b.isPlayerBullet) BC.Audio.playHitSteel();
            break;
          }

          // 2. Opposing bullet-vs-bullet
          let hitOtherBullet = false;
          for (const other of this.bullets) {
            if (!other.alive || other.id === b.id) continue;
            if (other.isPlayerBullet === b.isPlayerBullet) continue;
            if (BC.rectsOverlap(b.x, b.y, b.w, b.h, other.x, other.y, other.w, other.h)) {
              b.alive = false;
              other.alive = false;
              hitOtherBullet = true;
              const mx = (b.x + other.x) / 2 + b.w / 2;
              const my = (b.y + other.y) / 2 + b.h / 2;
              this.explosions.push(new BC.Explosion(mx, my, false));
              BC.Audio.playHitSteel();
              break;
            }
          }
          if (hitOtherBullet) break;

          // 3. Terrain collision (Brick / Steel / Eagle)
          const hitTerrain = this.map.hitByBullet(b);
          if (hitTerrain) {
            b.alive = false;
            if (hitTerrain.type === 'eagle') {
              this.explosions.push(new BC.Explosion(104, 200, true));
              BC.Audio.playExplodePlayer();
              this._triggerGameOver();
            } else {
              const ex = Math.max(4, Math.min(BC.FIELD_SIZE - 4, b.x + b.w / 2 + vec.x * 2));
              const ey = Math.max(4, Math.min(BC.FIELD_SIZE - 4, b.y + b.h / 2 + vec.y * 2));
              this.explosions.push(new BC.Explosion(ex, ey, false));
              if (b.isPlayerBullet) {
                if (hitTerrain.type === 'steel_clang') BC.Audio.playHitSteel();
                else BC.Audio.playHitBrick();
              }
            }
            break;
          }

          // 4. Tank collision
          if (b.isPlayerBullet) {
            // Check enemy tanks
            for (const e of this.enemies) {
              if (!e.alive) continue;
              if (BC.rectsOverlap(b.x, b.y, b.w, b.h, e.x, e.y, e.w, e.h)) {
                b.alive = false;
                if (e.isBonus) {
                  e.isBonus = false;
                  this._spawnPowerUp();
                }
                e.hp--;
                if (e.hp > 0) {
                  BC.Audio.playHitArmor();
                } else {
                  e.alive = false;
                  const sx = e.x + 8;
                  const sy = e.y + 8;
                  const pts = e.points;
                  this.explosions.push(
                    new BC.Explosion(sx, sy, true, () => {
                      this.floatingScores.push(new BC.FloatingScore(sx, sy, pts));
                    })
                  );
                  BC.Audio.playExplodeEnemy();
                  const shooter = this.players[b.playerIndex];
                  if (shooter) {
                    shooter.kills[e.enemyType]++;
                    this._awardScore(shooter, e.points);
                  }
                }
                break;
              }
            }
            if (!b.alive) break;

            // Check friendly fire stun in 2P mode
            for (const p of this.players) {
              if (!p.tank || !p.tank.alive || p.index === b.playerIndex) continue;
              if (BC.rectsOverlap(b.x, b.y, b.w, b.h, p.tank.x, p.tank.y, 16, 16)) {
                b.alive = false;
                if (p.tank.shieldTimer <= 0) {
                  p.tank.stunTimer = BC.FRAMES.FRIENDLY_STUN;
                }
                break;
              }
            }
          } else {
            // Enemy bullet vs Player tanks
            for (const p of this.players) {
              if (!p.tank || !p.tank.alive) continue;
              if (BC.rectsOverlap(b.x, b.y, b.w, b.h, p.tank.x, p.tank.y, 16, 16)) {
                b.alive = false;
                if (p.tank.shieldTimer > 0) {
                  this.explosions.push(new BC.Explosion(b.x + 2, b.y + 2, false));
                } else {
                  p.tank.alive = false;
                  this.explosions.push(new BC.Explosion(p.tank.x + 8, p.tank.y + 8, true));
                  BC.Audio.playExplodePlayer();
                  p.lives--;
                  p.tier = 0;
                  p.respawnTimer = 45;
                }
                break;
              }
            }
          }
        }
      }

      this.bullets = this.bullets.filter((b) => b.alive);
    }

    _awardScore(player, pts) {
      player.score += pts;
      this._updateHiScore(player.score);
      if (player.index === 0) this.lastP1Score = player.score;

      while (player.score >= player.nextLifeScore) {
        player.lives++;
        player.nextLifeScore += 20000;
        BC.Audio.playLifeUp();
      }
    }

    _spawnPowerUp() {
      let type;
      if (Math.random() < this.starRate) {
        type = BC.POWERUP.STAR;
      } else {
        // Weighted remaining items (1UP Tank slightly rarer)
        const others = [
          BC.POWERUP.HELMET, BC.POWERUP.HELMET,
          BC.POWERUP.CLOCK, BC.POWERUP.CLOCK,
          BC.POWERUP.SHOVEL, BC.POWERUP.SHOVEL,
          BC.POWERUP.GRENADE, BC.POWERUP.GRENADE,
          BC.POWERUP.TANK,
        ];
        type = others[Math.floor(Math.random() * others.length)];
      }

      // Choose random 8px-aligned coordinate inside playfield avoiding Eagle box
      let px = 96;
      let py = 96;
      for (let tries = 0; tries < 25; tries++) {
        const gx = 1 + Math.floor(Math.random() * 23);
        const gy = 1 + Math.floor(Math.random() * 22);
        const x = gx * 8;
        const y = gy * 8;
        if (x >= 80 && x <= 112 && y >= 176) continue;
        px = x;
        py = y;
        break;
      }

      // Spawning a new bonus replaces any existing uncollected power-up (NES 1:1)
      this.powerUps = [new BC.PowerUp(type, px, py)];
      BC.Audio.playPowerupAppear();
    }

    _collectPowerUp(player, pu) {
      pu.alive = false;
      this._awardScore(player, 500);
      this.floatingScores.push(new BC.FloatingScore(pu.x + 8, pu.y + 8, 500));

      switch (pu.type) {
        case BC.POWERUP.HELMET:
          player.tank.shieldTimer = BC.FRAMES.HELMET_SHIELD;
          BC.Audio.playPowerupPick();
          break;
        case BC.POWERUP.CLOCK:
          this.freezeTimer = BC.FRAMES.FREEZE_ENEMIES;
          BC.Audio.playPowerupPick();
          break;
        case BC.POWERUP.SHOVEL:
          if (this.map.eagleAlive) {
            this.shovelTimer = BC.FRAMES.SHOVEL_STEEL;
            this.map.fortifyBase(BC.TILE.STEEL, this._getAllAliveTanks());
            BC.Audio.playPowerupPick();
          }
          break;
        case BC.POWERUP.STAR:
          player.tier = Math.min(3, player.tier + 1);
          player.tank.applyTier(player.tier);
          BC.Audio.playPowerupPick();
          break;
        case BC.POWERUP.GRENADE:
          BC.Audio.playExplodeEnemy();
          for (const e of this.enemies) {
            if (!e.alive) continue;
            if (e.isBonus) {
              e.isBonus = false;
              this._spawnPowerUp();
            }
            e.alive = false;
            this.explosions.push(new BC.Explosion(e.x + 8, e.y + 8, true));
          }
          break;
        case BC.POWERUP.TANK:
          player.lives++;
          BC.Audio.playLifeUp();
          break;
      }
    }

    // =======================================================================
    // SCORE TALLY SCREEN
    // =======================================================================
    _enterTally(isGameOver) {
      this.state = STATE.TALLY;
      this.gameOverAfterTally = isGameOver;
      this.tallyStep = 0;
      this.tallyCount = 0;
      this.tallyTick = 0;
      this.tallyDoneWait = 0;
      this.tallyBonusAwarded = false;
      this._notifyUI();
    }

    _updateTally() {
      const skip = this._justPressed('Enter', 'Space', 'KeyJ', 'KeyZ');

      if (this.tallyStep < 4) {
        const maxRowCount = Math.max(
          ...this.players.map((p) => p.kills[this.tallyStep])
        );
        if (skip) {
          this.tallyStep = 4;
          return;
        }
        this.tallyTick++;
        if (this.tallyTick % 8 === 0) {
          if (this.tallyCount < maxRowCount) {
            this.tallyCount++;
            BC.Audio.playScoreTick();
          } else {
            this.tallyStep++;
            this.tallyCount = 0;
            this.tallyTick = 0;
          }
        }
      } else {
        // 2P Bonus check (1000 PTS to higher kill count if strictly greater)
        if (this.isTwoPlayer && !this.tallyBonusAwarded) {
          this.tallyBonusAwarded = true;
          const k1 = this.players[0].kills.reduce((a, b) => a + b, 0);
          const k2 = this.players[1].kills.reduce((a, b) => a + b, 0);
          if (k1 > k2) {
            this._awardScore(this.players[0], 1000);
            BC.Audio.playBonus();
          } else if (k2 > k1) {
            this._awardScore(this.players[1], 1000);
            BC.Audio.playBonus();
          }
        }

        this.tallyDoneWait++;
        if ((skip && this.tallyDoneWait > 15) || this.tallyDoneWait >= 130) {
          if (this.gameOverAfterTally) {
            this.state = STATE.GAME_OVER_SCREEN;
            this.gameOverScreenTimer = 175;
            BC.Audio.playGameOver();
            this._notifyUI();
          } else {
            this.stage =
              this.stage >= BC.TOTAL_CLASSIC_STAGES ? 1 : this.stage + 1;
            this._enterStageSelect(false);
          }
        }
      }
    }

    // =======================================================================
    // GAME OVER SCREEN
    // =======================================================================
    _updateGameOverScreen() {
      this.gameOverScreenTimer--;
      if (
        this.gameOverScreenTimer <= 0 ||
        (this.gameOverScreenTimer < 145 && this._justPressed('Enter', 'Space', 'KeyJ', 'KeyZ'))
      ) {
        this.returnToTitle();
      }
    }

    // =======================================================================
    // MAP EDITOR
    // =======================================================================
    _updateEditor() {
      BC.Audio.updateEngine(false, false);
      this.editor.update();

      if (this._justPressed('ArrowUp', 'KeyW')) this.editor.moveCursor(0, -1);
      else if (this._justPressed('ArrowDown', 'KeyS')) this.editor.moveCursor(0, 1);
      else if (this._justPressed('ArrowLeft', 'KeyA')) this.editor.moveCursor(-1, 0);
      else if (this._justPressed('ArrowRight', 'KeyD')) this.editor.moveCursor(1, 0);

      if (this._justPressed('Space', 'KeyJ', 'KeyZ')) {
        this.editor.cycleAtCursor();
      }
      if (this._justPressed('KeyC')) {
        this.editor.clearAll();
        BC.Audio.playPowerupPick();
      }
      if (this._justPressed('Enter')) {
        this.editor.save();
        BC.Audio.playLifeUp();
        this.isTwoPlayer = false;
        this._initPlayers();
        this.stage = BC.TOTAL_CLASSIC_STAGES + 1;
        this._enterStageSelect(false);
      }
      if (this._justPressed('Escape')) {
        this.returnToTitle();
      }
    }

    // =======================================================================
    // RENDERING (Logical 256 x 240 mapped cleanly to 4x HD Canvas)
    // =======================================================================
    render() {
      const ctx = this.ctx;
      const S = BC.RENDER_SCALE || 4;
      ctx.imageSmoothingEnabled = BC.getSkin() !== 'classic';

      ctx.save();
      ctx.scale(S, S);

      if (this.state === STATE.TITLE) {
        this._renderTitle(ctx);
      } else if (this.state === STATE.STAGE_SELECT) {
        this._renderStageSelect(ctx);
      } else if (
        this.state === STATE.PLAYING ||
        this.state === STATE.STAGE_CLEAR_DELAY ||
        this.state === STATE.GAME_OVER_FALL
      ) {
        this._renderPlayfield(ctx);
      } else if (this.state === STATE.TALLY) {
        this._renderTally(ctx);
      } else if (this.state === STATE.GAME_OVER_SCREEN) {
        this._renderGameOverScreen(ctx);
      } else if (this.state === STATE.EDITOR) {
        this.editor.draw(ctx);
      }

      ctx.restore();
    }

    _drawCyberBackdrop(ctx, animated = false) {
      if (typeof ctx.createLinearGradient === 'function') {
        const bg = ctx.createLinearGradient(0, 0, 0, BC.SCREEN_HEIGHT);
        bg.addColorStop(0, '#070913');
        bg.addColorStop(0.55, '#120C28');
        bg.addColorStop(1, '#09111E');
        ctx.fillStyle = bg;
      } else {
        ctx.fillStyle = BC.COLORS.BLACK;
      }
      ctx.fillRect(0, 0, BC.SCREEN_WIDTH, BC.SCREEN_HEIGHT);

      if (animated && typeof ctx.beginPath === 'function') {
        // Subtle cyber perspective grid at bottom + neon rain motes
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.16)';
        ctx.lineWidth = 0.4;
        for (let gy = 175; gy <= 238; gy += 12) {
          ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(BC.SCREEN_WIDTH, gy); ctx.stroke();
        }
        for (let gx = -80; gx <= 336; gx += 28) {
          ctx.beginPath(); ctx.moveTo(128 + (gx - 128) * 0.25, 175); ctx.lineTo(gx, 240); ctx.stroke();
        }
        const motes = [
          [22, 28], [52, 74], [218, 22], [238, 86], [28, 136], [228, 152], [44, 198], [210, 212],
        ];
        for (let i = 0; i < motes.length; i++) {
          const [mx, my] = motes[i];
          const pulse = 0.35 + 0.65 * Math.abs(Math.sin(this.globalFrame * 0.06 + i));
          ctx.fillStyle = i % 2 === 0 ? `rgba(0, 240, 255, ${pulse})` : `rgba(255, 42, 133, ${pulse})`;
          ctx.fillRect(mx, my, 1, 5);
        }
      }
    }

    _drawTeyvatBackdrop(ctx, animatedStars = false) {
      if (typeof ctx.createLinearGradient === 'function') {
        const bg = ctx.createLinearGradient(0, 0, 0, BC.SCREEN_HEIGHT);
        bg.addColorStop(0, '#0F1626');
        bg.addColorStop(0.55, '#17223B');
        bg.addColorStop(1, '#101522');
        ctx.fillStyle = bg;
      } else {
        ctx.fillStyle = BC.COLORS.BLACK;
      }
      ctx.fillRect(0, 0, BC.SCREEN_WIDTH, BC.SCREEN_HEIGHT);

      if (animatedStars && typeof ctx.beginPath === 'function') {
        const stars = [
          [28, 32], [64, 18], [212, 26], [234, 64], [18, 120],
          [240, 146], [34, 196], [220, 206], [128, 22], [96, 172],
        ];
        for (let i = 0; i < stars.length; i++) {
          const [sx, sy] = stars[i];
          const tw = 0.35 + 0.65 * Math.abs(Math.sin(this.globalFrame * 0.04 + i * 1.3));
          ctx.fillStyle = i % 2 === 0 ? `rgba(252, 231, 162, ${tw})` : `rgba(122, 231, 240, ${tw})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    _drawRealisticBackdrop(ctx, skin, animated = false) {
      if (typeof ctx.createLinearGradient === 'function') {
        const bg = ctx.createLinearGradient(0, 0, 0, BC.SCREEN_HEIGHT);
        if (skin === 'wwii') {
          bg.addColorStop(0, '#1C1F18'); bg.addColorStop(0.6, '#262920'); bg.addColorStop(1, '#141611');
        } else if (skin === 'metalslug') {
          bg.addColorStop(0, '#2E1A18'); bg.addColorStop(0.55, '#241D24'); bg.addColorStop(1, '#141115');
        } else if (skin === 'modern') {
          bg.addColorStop(0, '#0C1118'); bg.addColorStop(0.6, '#151E2B'); bg.addColorStop(1, '#0B0E14');
        } else if (skin === 'wartable') {
          bg.addColorStop(0, '#2B1D13'); bg.addColorStop(0.5, '#382619'); bg.addColorStop(1, '#1E130B');
        }
        ctx.fillStyle = bg;
      } else {
        ctx.fillStyle = BC.COLORS.BLACK;
      }
      ctx.fillRect(0, 0, BC.SCREEN_WIDTH, BC.SCREEN_HEIGHT);

      if (animated && skin === 'modern' && typeof ctx.beginPath === 'function') {
        ctx.strokeStyle = 'rgba(106, 212, 255, 0.14)';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(128, 120, 72, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(128, 120, 42, 0, Math.PI * 2); ctx.stroke();
      } else if (skin === 'wartable' && typeof ctx.beginPath === 'function') {
        ctx.strokeStyle = 'rgba(214, 180, 114, 0.22)';
        ctx.lineWidth = 0.6;
        ctx.strokeRect(8, 8, BC.SCREEN_WIDTH - 16, BC.SCREEN_HEIGHT - 16);
      }
    }

    _renderBackdrop(ctx, animated = false) {
      const skin = BC.getSkin();
      if (skin === 'genshin') this._drawTeyvatBackdrop(ctx, animated);
      else if (skin === 'cyberpunk') this._drawCyberBackdrop(ctx, animated);
      else if (skin === 'wwii' || skin === 'metalslug' || skin === 'modern' || skin === 'wartable') {
        this._drawRealisticBackdrop(ctx, skin, animated);
      } else {
        ctx.fillStyle = BC.COLORS.BLACK;
        ctx.fillRect(0, 0, BC.SCREEN_WIDTH, BC.SCREEN_HEIGHT);
      }
    }

    _renderTitle(ctx) {
      const isHD = BC.getSkin() !== 'classic';
      this._renderBackdrop(ctx, true);

      const oy = Math.round(this.titleSlideY);

      // Top Score Banner
      const p1ScoreStr = String(this.lastP1Score).padStart(2, '0');
      const hiScoreStr = String(this.hiScore).padStart(2, '0');
      BC.drawText(ctx, `I- ${p1ScoreStr.padStart(5, ' ')}`, 16, 16 + oy, '#FCFCFC');
      BC.drawText(ctx, `HI- ${hiScoreStr}`, 136, 16 + oy, '#FCFCFC');

      // Monumental Title Logos
      BC.drawBrickWord(ctx, 'BATTLE', 128, 36 + oy, 5, false);
      BC.drawBrickWord(ctx, 'CITY', 128, 80 + oy, 5, false);

      // Menu Choices
      const items = ['1 PLAYER', '2 PLAYERS', 'CONSTRUCTION'];
      for (let i = 0; i < items.length; i++) {
        const col = isHD && i === this.menuIndex && this.titleSlideY === 0 ? '#FCE4A0' : '#FCFCFC';
        BC.drawText(ctx, items[i], 92, 138 + i * 16 + oy, col);
      }

      // Tank Selector Cursor
      if (this.titleSlideY === 0) {
        const tread = Math.floor(this.globalFrame / 4) % 2;
        const cursorTank = BC.getTankSprite('P0', 'P1', BC.DIR.RIGHT, tread);
        ctx.drawImage(cursorTank, 68, 134 + this.menuIndex * 16, 16, 16);
      }

      // Classic Copyright & Credits
      BC.drawText(ctx, 'NAMCOT', 128, 194 + oy, '#D82800', 'center');
      BC.drawText(ctx, '@ 1985 NAMCO LTD.', 128, 208 + oy, '#FCFCFC', 'center');
      BC.drawText(ctx, 'ALL RIGHTS RESERVED', 128, 220 + oy, '#FCFCFC', 'center');
    }

    _renderStageSelect(ctx) {
      const skin = BC.getSkin();
      const isHD = skin !== 'classic';
      if (this.curtainPhase === 'opening') {
        this._renderPlayfield(ctx);
      } else {
        this._renderBackdrop(ctx, false);
      }

      // Top and Bottom Curtains
      ctx.fillStyle = BC.COLORS.HUD_GRAY;
      ctx.fillRect(0, 0, BC.SCREEN_WIDTH, this.curtainProgress);
      ctx.fillRect(
        0,
        BC.SCREEN_HEIGHT - this.curtainProgress,
        BC.SCREEN_WIDTH,
        this.curtainProgress
      );

      if (isHD && this.curtainProgress > 4) {
        ctx.fillStyle = BC.COLORS.GOLD_TRIM;
        ctx.fillRect(0, this.curtainProgress - 1.5, BC.SCREEN_WIDTH, 1);
        ctx.fillRect(0, BC.SCREEN_HEIGHT - this.curtainProgress + 0.5, BC.SCREEN_WIDTH, 1);
      }

      if (this.curtainPhase === 'wait') {
        const label =
          this.stage > BC.TOTAL_CLASSIC_STAGES
            ? 'STAGE CUSTOM'
            : `STAGE ${String(this.stage).padStart(2, ' ')}`;
        BC.drawText(ctx, label, 128, 112, isHD ? '#FCE4A0' : '#000000', 'center', isHD ? 10 : 7.5);
        if (this.canBrowseStage) {
          BC.drawText(ctx, '< SELECT STAGE >', 128, 136, '#3A3A3A', 'center');
          BC.drawText(ctx, 'PRESS START', 128, 152, '#FCFCFC', 'center');
        }
      }
    }

    _renderPlayfield(ctx) {
      const isHD = BC.getSkin() !== 'classic';

      // Outer border & right sidebar
      ctx.fillStyle = BC.COLORS.HUD_GRAY;
      ctx.fillRect(0, 0, BC.SCREEN_WIDTH, BC.SCREEN_HEIGHT);

      // 208x208 Battlefield Ground
      ctx.fillStyle = isHD ? BC.COLORS.FIELD_BG : BC.COLORS.BLACK;
      ctx.fillRect(BC.BORDER_LEFT, BC.BORDER_TOP, BC.FIELD_SIZE, BC.FIELD_SIZE);

      if (isHD) {
        if (BC.getSkin() === 'wartable' && typeof ctx.beginPath === 'function') {
          ctx.strokeStyle = 'rgba(120, 90, 50, 0.16)';
          ctx.lineWidth = 0.6;
          for (const [cx, cy, rx, ry] of [[68, 72, 34, 22], [170, 96, 28, 38], [92, 168, 42, 20]]) {
            ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0.3, 0, Math.PI * 2); ctx.stroke();
          }
        }
        ctx.fillStyle = BC.COLORS.FIELD_GRID;
        for (let i = 1; i < BC.GRID_BLOCKS; i++) {
          ctx.fillRect(BC.BORDER_LEFT + i * 16, BC.BORDER_TOP, 0.5, BC.FIELD_SIZE);
          ctx.fillRect(BC.BORDER_LEFT, BC.BORDER_TOP + i * 16, BC.FIELD_SIZE, 0.5);
        }
        ctx.strokeStyle = BC.COLORS.GOLD_TRIM;
        ctx.lineWidth = 0.75;
        ctx.strokeRect(BC.BORDER_LEFT - 0.5, BC.BORDER_TOP - 0.5, BC.FIELD_SIZE + 1, BC.FIELD_SIZE + 1);
      }

      // Under-layer terrain (Brick, Steel, Water, Ice, Eagle)
      const waterFrame = Math.floor(this.globalFrame / 28) % 2;
      this.map.drawUnderLayer(ctx, waterFrame);

      // Spawn stars
      for (const star of this.spawnStars) {
        star.draw(ctx);
      }

      // Player & Enemy Tanks
      for (const p of this.players) {
        if (p.tank) p.tank.draw(ctx, this.globalFrame);
      }
      for (const e of this.enemies) {
        e.draw(ctx, this.globalFrame);
      }

      // Bullets
      for (const b of this.bullets) {
        b.draw(ctx);
      }

      // Over-layer Forest Canopy (hides tanks & bullets underneath!)
      this.map.drawOverLayer(ctx);

      // Power-ups & Explosions & Score Popups render ON TOP of trees
      for (const pu of this.powerUps) {
        pu.draw(ctx, this.globalFrame);
      }
      for (const ex of this.explosions) {
        ex.draw(ctx);
      }
      for (const fs of this.floatingScores) {
        fs.draw(ctx);
      }

      // Pause Banner
      if (this.paused && Math.floor(this.globalFrame / 18) % 2 === 0) {
        BC.drawText(
          ctx,
          'PAUSE',
          BC.BORDER_LEFT + BC.FIELD_SIZE / 2,
          BC.BORDER_TOP + BC.FIELD_SIZE / 2 - 4,
          '#D82800',
          'center'
        );
      }

      // Rising GAME OVER Banner inside playfield
      if (this.state === STATE.GAME_OVER_FALL) {
        const gx = BC.BORDER_LEFT + BC.FIELD_SIZE / 2;
        const gy = Math.round(this.gameOverY);
        BC.drawText(ctx, 'GAME', gx, gy, '#D82800', 'center');
        BC.drawText(ctx, 'OVER', gx, gy + 9, '#D82800', 'center');
      }

      // Right HUD Sidebar (x: 224..255)
      this._renderHUD(ctx);
    }

    _renderHUD(ctx) {
      const hx = BC.HUD_X + 8; // 232

      // 1. Remaining Enemy Icons (2 columns x 10 rows = up to 20 icons)
      const remaining = this.enemyQueue.length;
      for (let i = 0; i < remaining; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        ctx.drawImage(BC.SPRITES.hudEnemy, hx + col * 8, 24 + row * 8, 8, 8);
      }

      // 2. Player 1 Lives ("IP" + mini tank + spare lives)
      const p1 = this.players[0];
      const p1Spare = Math.max(0, p1 ? p1.lives - 1 : 0);
      const p1CanBorrow = this.isTwoPlayer && p1 && p1.lives <= 0 && this.players[1] && this.players[1].lives >= 2;
      const p1Blink = p1CanBorrow ? Math.floor(this.globalFrame / 15) % 2 === 0 : true;

      BC.drawText(ctx, 'IP', hx, 128, '#000000');
      if (p1Blink) {
        ctx.drawImage(BC.SPRITES.hudLife, hx, 136, 8, 8);
        BC.drawText(ctx, String(p1Spare), hx + 9, 136, '#000000');
      }

      // 3. Player 2 Lives (if 2P)
      if (this.isTwoPlayer && this.players[1]) {
        const p2 = this.players[1];
        const p2Spare = Math.max(0, p2.lives - 1);
        const p2CanBorrow = p2.lives <= 0 && p1 && p1.lives >= 2;
        const p2Blink = p2CanBorrow ? Math.floor(this.globalFrame / 15) % 2 === 0 : true;

        BC.drawText(ctx, 'IIP', hx - 4, 152, '#000000');
        if (p2Blink) {
          ctx.drawImage(BC.SPRITES.hudLife, hx, 160, 8, 8);
          BC.drawText(ctx, String(p2Spare), hx + 9, 160, '#000000');
        }
      }

      // 4. Stage Flag & Stage Number
      ctx.drawImage(BC.SPRITES.flag, hx, 184, 16, 16);
      const stLabel = this.stage > BC.TOTAL_CLASSIC_STAGES ? 'EX' : String(this.stage);
      BC.drawText(ctx, stLabel, hx + 16, 202, '#000000', 'right');
    }

    _renderTally(ctx) {
      this._renderBackdrop(ctx, false);

      BC.drawText(ctx, 'HI-SCORE', 64, 18, '#D82800');
      BC.drawText(ctx, String(this.hiScore), 152, 18, '#FC9838');

      const stageText =
        this.stage > BC.TOTAL_CLASSIC_STAGES ? 'STAGE CUSTOM' : `STAGE ${this.stage}`;
      BC.drawText(ctx, stageText, 128, 36, '#FCFCFC', 'center');

      // Player Headers & Scores
      BC.drawText(ctx, 'I-PLAYER', 24, 54, '#D82800');
      BC.drawText(ctx, String(this.players[0].score), 88, 66, '#FC9838', 'right');

      if (this.isTwoPlayer && this.players[1]) {
        BC.drawText(ctx, 'II-PLAYER', 168, 54, '#D82800');
        BC.drawText(ctx, String(this.players[1].score), 232, 66, '#FC9838', 'right');
      }

      // 4 Enemy Types Tally Rows
      for (let row = 0; row < 4; row++) {
        const y = 86 + row * 24;
        const ptsPer = BC.ENEMY_STATS[row].points;
        const icon = BC.getTankSprite('E' + row, 'ENEMY_BASIC', BC.DIR.UP, 0);
        ctx.drawImage(icon, 120, y - 4, 16, 16);

        if (row <= this.tallyStep) {
          // P1 column
          const k1Raw = this.players[0].kills[row];
          const k1 = row < this.tallyStep ? k1Raw : Math.min(k1Raw, this.tallyCount);
          BC.drawText(ctx, String(k1 * ptsPer), 60, y, '#FCFCFC', 'right');
          BC.drawText(ctx, 'PTS', 64, y, '#FCFCFC');
          BC.drawText(ctx, String(k1), 108, y, '#FCFCFC', 'right');
          BC.drawText(ctx, '<', 110, y, '#FCFCFC');

          // P2 column
          if (this.isTwoPlayer && this.players[1]) {
            const k2Raw = this.players[1].kills[row];
            const k2 = row < this.tallyStep ? k2Raw : Math.min(k2Raw, this.tallyCount);
            BC.drawText(ctx, '>', 138, y, '#FCFCFC');
            BC.drawText(ctx, String(k2), 148, y, '#FCFCFC');
            BC.drawText(ctx, 'PTS', 168, y, '#FCFCFC');
            BC.drawText(ctx, String(k2 * ptsPer), 234, y, '#FCFCFC', 'right');
          }
        }
      }

      // Horizontal Divider & TOTAL
      ctx.fillStyle = BC.getSkin() !== 'classic' ? BC.COLORS.GOLD_TRIM : '#FCFCFC';
      ctx.fillRect(64, 178, 128, 1.5);
      BC.drawText(ctx, 'TOTAL', 52, 188, '#FCFCFC');

      if (this.tallyStep >= 4) {
        const t1 = this.players[0].kills.reduce((a, b) => a + b, 0);
        BC.drawText(ctx, String(t1), 108, 188, '#FCFCFC', 'right');
        if (this.isTwoPlayer && this.players[1]) {
          const t2 = this.players[1].kills.reduce((a, b) => a + b, 0);
          BC.drawText(ctx, String(t2), 148, 188, '#FCFCFC');
          if (t1 !== t2) {
            const winX = t1 > t2 ? 56 : 196;
            BC.drawText(ctx, 'BONUS!', winX, 208, '#D82800', 'center');
            BC.drawText(ctx, '1000 PTS', winX, 218, '#FCFCFC', 'center');
          }
        }
      }
    }

    _renderGameOverScreen(ctx) {
      this._renderBackdrop(ctx, false);
      BC.drawBrickWord(ctx, 'GAME', 128, 68, 6, true);
      BC.drawBrickWord(ctx, 'OVER', 128, 124, 6, true);
    }
  }

  BC.STATE = STATE;
  BC.BattleCityGame = BattleCityGame;

  // Boot entry point when DOM is ready
  BC.init = function () {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return null;

    const game = new BattleCityGame(canvas);

    // Fixed 60Hz NTSC Timestep Loop (scaled by optional speedScale)
    const BASE_STEP_MS = 1000 / 60;
    let lastTime = performance.now();
    let accumulator = 0;
    let audioAccumulator = 0;

    function frame(now) {
      const stepMs = BASE_STEP_MS / (game.speedScale || 1.0);
      const delta = Math.min(100, now - lastTime);
      lastTime = now;
      accumulator += delta;
      audioAccumulator += delta;

      while (accumulator >= stepMs) {
        game.update();
        accumulator -= stepMs;
      }

      while (audioAccumulator >= stepMs) {
        if (typeof BC.Audio.tick === 'function') {
          BC.Audio.tick();
        }
        audioAccumulator -= stepMs;
      }

      game.render();
      global.requestAnimationFrame(frame);
    }

    global.requestAnimationFrame(frame);
    return game;
  };
})(window);
