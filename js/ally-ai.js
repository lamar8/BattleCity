(function (global) {
  'use strict';

  const BC = (global.BattleCity = global.BattleCity || {});

  const CELL = BC.BLOCK_SIZE;
  const GRID = BC.GRID_BLOCKS;
  const DIRS = Object.freeze([BC.DIR.UP, BC.DIR.RIGHT, BC.DIR.DOWN, BC.DIR.LEFT]);
  const AIM_HOLD_FRAMES = 10;
  const GUARD_SPOTS = Object.freeze([
    Object.freeze({ x: 128, y: 176 }),
    Object.freeze({ x: 64, y: 176 }),
    Object.freeze({ x: 128, y: 160 }),
    Object.freeze({ x: 64, y: 160 }),
  ]);

  function clampCell(value) {
    return Math.max(0, Math.min(GRID - 1, value));
  }

  function cellIndex(x, y) {
    return y * GRID + x;
  }

  // Defensive teammate AI. It deliberately stays near the eagle unless an
  // enemy is becoming a real base threat, then uses weighted A* to intercept.
  class AllyAI {
    reset(tank) {
      if (tank) tank.allyBrain = null;
    }

    _getBrain(tank) {
      if (!tank.allyBrain) {
        tank.allyBrain = {
          path: [],
          pathIndex: 0,
          pathTarget: '',
          repathTimer: 0,
          dodgeDir: null,
          dodgeFrames: 0,
          aimTargetId: null,
          aimDir: tank.dir,
          aimHoldFrames: 0,
          lastX: tank.x,
          lastY: tank.y,
          stuckFrames: 0,
        };
      }
      return tank.allyBrain;
    }

    getControls(tank, game, allTanks) {
      const brain = this._getBrain(tank);
      if (brain.repathTimer > 0) brain.repathTimer--;
      if (brain.dodgeFrames > 0) brain.dodgeFrames--;
      if (brain.aimHoldFrames > 0) brain.aimHoldFrames--;

      // Do not stand in a firing lane. Close-range shells are dodged; shells
      // farther away can be shot down when doing so cannot hurt the base/team.
      const incoming = this._findIncomingBullet(tank, game.bullets);
      if (incoming) {
        const interceptDir = (incoming.bullet.dir + 2) % 4;
        if (
          incoming.distance >= 13 &&
          tank.canFire(game.bullets) &&
          this._isDirectionShotSafe(tank, interceptDir, game, allTanks)
        ) {
          return { dir: null, faceDir: interceptDir, fire: true };
        }

        const dodgeDir = this._chooseDodgeDirection(tank, incoming.bullet, game, allTanks, brain);
        if (dodgeDir !== null) {
          brain.dodgeDir = dodgeDir;
          brain.dodgeFrames = 8;
          brain.repathTimer = 0;
          return { dir: dodgeDir, faceDir: null, fire: false };
        }
      }

      // Finish a short sidestep instead of immediately walking back into the
      // same bullet lane on the next decision frame.
      if (brain.dodgeFrames > 0 && brain.dodgeDir !== null) {
        const obs = tank.getObstacleInDirection(brain.dodgeDir, game.map, allTanks, 4);
        if (obs === 'NONE') {
          return { dir: brain.dodgeDir, faceDir: null, fire: false };
        }
        brain.dodgeFrames = 0;
        brain.dodgeDir = null;
      }

      // Hold a useful firing lane instead of wandering while a shell reloads.
      // Prefer the current target for a few frames so two enemies entering
      // different alignment tolerances cannot make the tank twitch each frame.
      const preferredTargetId = brain.aimHoldFrames > 0 ? brain.aimTargetId : null;
      const shot = this._findAlignedEnemy(tank, game, allTanks, preferredTargetId);
      if (shot && (preferredTargetId === null || shot.enemy.id === preferredTargetId)) {
        brain.aimTargetId = shot.enemy.id;
        brain.aimDir = shot.dir;
        brain.aimHoldFrames = AIM_HOLD_FRAMES;
        return { dir: null, faceDir: shot.dir, fire: true };
      }
      if (preferredTargetId !== null) {
        // The old target has briefly left the lane (or another target now has a
        // higher score). Keep the turret steady for the remainder of the hold
        // instead of immediately snapping to a different firing direction.
        return { dir: null, faceDir: brain.aimDir, fire: false };
      }
      brain.aimTargetId = null;

      const enemyTarget = this._selectBaseThreat(tank, game.enemies);
      let target;
      let targetKey;
      if (enemyTarget) {
        target = {
          x: clampCell(Math.round(enemyTarget.x / CELL)) * CELL,
          y: clampCell(Math.round(enemyTarget.y / CELL)) * CELL,
        };
        targetKey = `E${enemyTarget.id}:${target.x},${target.y}`;
      } else {
        // A nearby pickup is worthwhile only while no enemy is pressing home.
        const pickup = this._findSafePickup(tank, game.powerUps);
        if (pickup) {
          target = {
            x: clampCell(Math.round(pickup.x / CELL)) * CELL,
            y: clampCell(Math.round(pickup.y / CELL)) * CELL,
          };
          targetKey = `P:${target.x},${target.y}`;
        } else {
          target = this._chooseGuardSpot(tank, game);
          targetKey = `G:${target.x},${target.y}`;
        }
      }

      if (
        brain.pathTarget !== targetKey ||
        brain.repathTimer <= 0 ||
        (brain.path.length > 0 && brain.pathIndex >= brain.path.length)
      ) {
        brain.path = this._findPath(tank, target, game, allTanks);
        brain.pathIndex = 0;
        brain.pathTarget = targetKey;
        brain.repathTimer = 15;
      }

      let moveDir = this._directionFromPath(tank, brain);
      const atTarget = Math.abs(target.x - tank.x) <= 4 && Math.abs(target.y - tank.y) <= 4;
      if (moveDir === null && (enemyTarget || (!atTarget && brain.stuckFrames >= 10))) {
        moveDir = this._fallbackDirection(tank, target, game, allTanks);
      }

      const movedSinceLastFrame = Math.abs(tank.x - brain.lastX) + Math.abs(tank.y - brain.lastY) > 0.05;
      brain.stuckFrames = movedSinceLastFrame ? 0 : brain.stuckFrames + 1;
      brain.lastX = tank.x;
      brain.lastY = tank.y;

      if (moveDir === null) {
        // A stationary tank should keep covering its last lane. Forcing UP here
        // fought with horizontal/vertical aiming and caused visible twitching.
        return { dir: null, faceDir: null, fire: false };
      }

      const obstacle = tank.getObstacleInDirection(moveDir, game.map, allTanks, 4);
      if (obstacle === 'BRICK') {
        // A* assigns bricks a higher cost, so reaching one means it is part of
        // the best route. Breach it, but never shoot through a friend/eagle.
        if (this._isDirectionShotSafe(tank, moveDir, game, allTanks)) {
          return { dir: null, faceDir: moveDir, fire: true };
        }
        brain.repathTimer = 0;
        return { dir: null, faceDir: moveDir, fire: false };
      }

      if (obstacle !== 'NONE' && obstacle !== 'TANK') {
        brain.repathTimer = 0;
        const alternate = this._fallbackDirection(tank, target, game, allTanks, moveDir);
        if (alternate !== null) return { dir: alternate, faceDir: null, fire: false };
      }

      if (obstacle === 'TANK' && brain.stuckFrames >= 6) {
        brain.repathTimer = 0;
        const alternate = this._fallbackDirection(tank, target, game, allTanks, moveDir);
        if (alternate !== null) return { dir: alternate, faceDir: null, fire: false };
      }

      return { dir: moveDir, faceDir: null, fire: false };
    }

    _enemyThreat(tank, enemy) {
      const ex = enemy.x + 8;
      const ey = enemy.y + 8;
      const baseDistance = Math.hypot(ex - 104, ey - 200);
      const aiDistance = Math.hypot(ex - (tank.x + 8), ey - (tank.y + 8));
      let score = (220 - baseDistance) * 2 + enemy.y * 0.65 - aiDistance * 0.15;
      if (enemy.dir === BC.DIR.DOWN) score += 38;
      if (Math.abs(ex - 104) <= 24) score += 46;
      if (enemy.y >= 160) score += 85;
      if (enemy.enemyType === BC.ENEMY_TYPE.FAST) score += 12;
      return score;
    }

    _selectBaseThreat(tank, enemies) {
      let best = null;
      let bestScore = -Infinity;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const baseDistance = Math.hypot(enemy.x + 8 - 104, enemy.y + 8 - 200);
        // Let the player handle distant spawns. Once an enemy enters the base
        // defensive zone, keep the interception locked until it is dead instead of
        // repeatedly engaging/disengaging at an arbitrary leash boundary.
        if (enemy.y < 120 && baseDistance > 120) continue;
        const score = this._enemyThreat(tank, enemy);
        if (score > bestScore) {
          best = enemy;
          bestScore = score;
        }
      }
      return best;
    }

    _findSafePickup(tank, powerUps) {
      let best = null;
      let bestDistance = 72;
      for (const pu of powerUps) {
        if (!pu.alive) continue;
        if (Math.hypot(pu.x + 8 - 104, pu.y + 8 - 200) > 96) continue;
        const distance = Math.hypot(pu.x - tank.x, pu.y - tank.y);
        if (distance < bestDistance) {
          best = pu;
          bestDistance = distance;
        }
      }
      return best;
    }

    _chooseGuardSpot(tank, game) {
      let best = GUARD_SPOTS[0];
      let bestScore = Infinity;
      const human = game.players[0] && game.players[0].tank;
      for (const spot of GUARD_SPOTS) {
        let score = Math.hypot(spot.x - tank.x, spot.y - tank.y) * 0.08;
        score += Math.hypot(spot.x - 128, spot.y - 176) * 0.03;
        if (game.map.probeRect(spot.x, spot.y, 16, 16) !== 'NONE') score += 500;
        if (human && human.alive) {
          const humanDistance = Math.hypot(spot.x - human.x, spot.y - human.y);
          if (humanDistance < 28) score += 100;
        }
        if (score < bestScore) {
          best = spot;
          bestScore = score;
        }
      }
      return best;
    }

    _findAlignedEnemy(tank, game, allTanks, preferredTargetId = null) {
      const cx = tank.x + 8;
      const cy = tank.y + 8;
      let best = null;
      let bestScore = -Infinity;

      for (const enemy of game.enemies) {
        if (!enemy.alive) continue;
        const ex = enemy.x + 8;
        const ey = enemy.y + 8;
        const dx = ex - cx;
        const dy = ey - cy;
        let dir = null;
        if (Math.abs(dx) <= 8 && Math.abs(dy) > 4) {
          dir = dy > 0 ? BC.DIR.DOWN : BC.DIR.UP;
        } else if (Math.abs(dy) <= 8 && Math.abs(dx) > 4) {
          dir = dx > 0 ? BC.DIR.RIGHT : BC.DIR.LEFT;
        }
        if (dir === null) continue;
        if (!this._isShotSafeAtTarget(tank, dir, enemy, game, allTanks)) continue;

        const distance = Math.abs(dx) + Math.abs(dy);
        const aimHoldBonus = enemy.id === preferredTargetId ? 1000 : 0;
        const score = this._enemyThreat(tank, enemy) - distance * 0.12 + aimHoldBonus;
        if (score > bestScore) {
          best = { enemy, dir };
          bestScore = score;
        }
      }
      return best;
    }

    _friendlyBlocksPoint(tank, x, y, game) {
      for (const player of game.players) {
        const other = player.tank;
        if (!other || !other.alive || other.id === tank.id) continue;
        if (BC.rectsOverlap(x, y, 4, 4, other.x, other.y, other.w, other.h)) {
          return true;
        }
      }
      return false;
    }

    _isShotSafeAtTarget(tank, dir, target, game, allTanks) {
      const vec = BC.DIR_VEC[dir];
      const cx = tank.x + 8;
      const cy = tank.y + 8;
      const tx = target.x + 8;
      const ty = target.y + 8;
      const distance = Math.max(0, (tx - cx) * vec.x + (ty - cy) * vec.y);
      if (distance <= 0) return false;

      for (let travel = 10; travel <= distance + 2; travel += 3) {
        const bx = cx + vec.x * travel - 2;
        const by = cy + vec.y * travel - 2;
        if (this._friendlyBlocksPoint(tank, bx, by, game)) return false;
        const terrain = game.map.probeRect(bx, by, 4, 4);
        if (terrain === 'STEEL' || terrain === 'EAGLE') return false;
      }
      return true;
    }

    _isDirectionShotSafe(tank, dir, game, allTanks) {
      const vec = BC.DIR_VEC[dir];
      const cx = tank.x + 8;
      const cy = tank.y + 8;
      let foundBrick = false;
      for (let travel = 10; travel <= BC.FIELD_SIZE + 8; travel += 3) {
        const bx = cx + vec.x * travel - 2;
        const by = cy + vec.y * travel - 2;
        if (bx < 0 || by < 0 || bx + 4 > BC.FIELD_SIZE || by + 4 > BC.FIELD_SIZE) return true;
        if (this._friendlyBlocksPoint(tank, bx, by, game)) return false;
        const terrain = game.map.probeRect(bx, by, 4, 4);
        if (terrain === 'BRICK') {
          foundBrick = true;
          continue;
        }
        if (terrain === 'EAGLE') return false;
        if (terrain === 'STEEL') return foundBrick;
      }
      return true;
    }

    _findIncomingBullet(tank, bullets) {
      const cx = tank.x + 8;
      const cy = tank.y + 8;
      let best = null;
      for (const bullet of bullets) {
        if (!bullet.alive || bullet.isPlayerBullet) continue;
        const vec = BC.DIR_VEC[bullet.dir];
        const dx = cx - (bullet.x + 2);
        const dy = cy - (bullet.y + 2);
        const forward = dx * vec.x + dy * vec.y;
        const lateral = Math.abs(dx * vec.y - dy * vec.x);
        if (forward <= 0 || forward > 64 || lateral > 7) continue;
        if (!best || forward < best.distance) {
          best = { bullet, distance: forward };
        }
      }
      return best;
    }

    _chooseDodgeDirection(tank, bullet, game, allTanks, brain) {
      const sideDirs = bullet.dir === BC.DIR.UP || bullet.dir === BC.DIR.DOWN
        ? [BC.DIR.LEFT, BC.DIR.RIGHT]
        : [BC.DIR.UP, BC.DIR.DOWN];
      if (brain.dodgeDir !== null && sideDirs.includes(brain.dodgeDir)) {
        sideDirs.splice(sideDirs.indexOf(brain.dodgeDir), 1);
        sideDirs.unshift(brain.dodgeDir);
      }

      for (const dir of sideDirs) {
        if (tank.getObstacleInDirection(dir, game.map, allTanks, 7) === 'NONE') {
          return dir;
        }
      }
      return null;
    }

    _cellCost(x, y, tank, game, allTanks) {
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) return Infinity;
      const px = x * CELL;
      const py = y * CELL;
      const terrain = game.map.probeRect(px, py, CELL, CELL);
      let cost;
      if (terrain === 'NONE') cost = 1;
      else if (terrain === 'BRICK') cost = tank.power >= 2 ? 3 : 6;
      else return Infinity;

      // Other tanks move, so treat them as congestion rather than a hard wall.
      for (const other of allTanks) {
        if (!other.alive || other.id === tank.id) continue;
        if (BC.rectsOverlap(px, py, CELL, CELL, other.x, other.y, other.w, other.h)) {
          cost += other.isPlayer ? 9 : 4;
        }
      }
      return cost;
    }

    _findPath(tank, target, game, allTanks) {
      const sx = clampCell(Math.round(tank.x / CELL));
      const sy = clampCell(Math.round(tank.y / CELL));
      const gx = clampCell(Math.round(target.x / CELL));
      const gy = clampCell(Math.round(target.y / CELL));
      const start = cellIndex(sx, sy);
      const goal = cellIndex(gx, gy);
      if (start === goal) return [];

      const count = GRID * GRID;
      const gScore = new Float64Array(count);
      gScore.fill(Infinity);
      const cameFrom = new Int16Array(count);
      cameFrom.fill(-1);
      const closed = new Uint8Array(count);
      const open = [start];
      gScore[start] = 0;

      while (open.length > 0) {
        let bestOpen = 0;
        let bestF = Infinity;
        for (let i = 0; i < open.length; i++) {
          const idx = open[i];
          const x = idx % GRID;
          const y = Math.floor(idx / GRID);
          const f = gScore[idx] + Math.abs(gx - x) + Math.abs(gy - y);
          if (f < bestF) {
            bestF = f;
            bestOpen = i;
          }
        }

        const current = open.splice(bestOpen, 1)[0];
        if (current === goal) {
          const path = [];
          let cursor = goal;
          while (cursor !== start && cursor >= 0) {
            path.push({ x: (cursor % GRID) * CELL, y: Math.floor(cursor / GRID) * CELL });
            cursor = cameFrom[cursor];
          }
          path.reverse();
          return path;
        }
        closed[current] = 1;

        const cx = current % GRID;
        const cy = Math.floor(current / GRID);
        for (const dir of DIRS) {
          const vec = BC.DIR_VEC[dir];
          const nx = cx + vec.x;
          const ny = cy + vec.y;
          if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
          const next = cellIndex(nx, ny);
          if (closed[next]) continue;
          const cost = this._cellCost(nx, ny, tank, game, allTanks);
          if (!Number.isFinite(cost)) continue;
          const tentative = gScore[current] + cost;
          if (tentative >= gScore[next]) continue;
          cameFrom[next] = current;
          gScore[next] = tentative;
          if (!open.includes(next)) open.push(next);
        }
      }
      return [];
    }

    _directionFromPath(tank, brain) {
      while (brain.pathIndex < brain.path.length) {
        const node = brain.path[brain.pathIndex];
        const dx = node.x - tank.x;
        const dy = node.y - tank.y;
        if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2) {
          brain.pathIndex++;
          continue;
        }
        if (Math.abs(dx) <= 4 && Math.abs(dy) > 2) {
          return dy > 0 ? BC.DIR.DOWN : BC.DIR.UP;
        }
        if (Math.abs(dy) <= 4 && Math.abs(dx) > 2) {
          return dx > 0 ? BC.DIR.RIGHT : BC.DIR.LEFT;
        }
        if (Math.abs(dx) > Math.abs(dy)) {
          return dx > 0 ? BC.DIR.RIGHT : BC.DIR.LEFT;
        }
        return dy > 0 ? BC.DIR.DOWN : BC.DIR.UP;
      }
      return null;
    }

    _fallbackDirection(tank, target, game, allTanks, excludedDir = null) {
      const candidates = [];
      for (const dir of DIRS) {
        if (dir === excludedDir) continue;
        if (tank.getObstacleInDirection(dir, game.map, allTanks, 5) !== 'NONE') continue;
        const vec = BC.DIR_VEC[dir];
        const distance = Math.hypot(target.x - (tank.x + vec.x * CELL), target.y - (tank.y + vec.y * CELL));
        const reversePenalty = (dir ^ tank.dir) === 2 ? 8 : 0;
        candidates.push({ dir, score: distance + reversePenalty });
      }
      candidates.sort((a, b) => a.score - b.score);
      return candidates.length > 0 ? candidates[0].dir : null;
    }
  }

  BC.AllyAI = AllyAI;
})(window);
