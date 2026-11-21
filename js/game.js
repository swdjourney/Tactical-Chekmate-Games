// js/game.js - Core Game Logic & State Management
// Tactical Checkmate: Operation Defuse

class TacticalGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new GameRenderer(this.canvas);

    this.currentLevelIndex = 0;
    this.currentLevel = null;
    this.state = 'MENU'; // 'MENU', 'PLAYING', 'GAMEOVER', 'VICTORY'

    // Player state
    this.player = {
      gridX: 0,
      gridY: 0,
      visualX: 0,
      visualY: 0,
      dir: 'right'
    };

    // Knight Dash ability
    this.knightModeActive = false;
    this.knightCooldown = 0; // in seconds
    this.knightCooldownMax = 4.0;

    // Defuse state
    this.isDefusing = false;
    this.defuseProgress = 0; // 0 to 100
    this.defuseTickTimer = 0;

    // Time & Score
    this.timeRemaining = 90;
    this.c4TickTimer = 0;
    this.takedowns = 0;

    // Key states
    this.keys = {};
    this.interactHeld = false;

    // Last timestamp
    this.lastTime = 0;

    this.initInput();
    this.initUI();
    this.loadLevel(0);
  }

  // Deep clone level template
  loadLevel(index) {
    this.currentLevelIndex = index;
    const template = LEVELS[index];

    // Deep clone level data so restarts are clean
    this.currentLevel = {
      ...template,
      map: template.map.map(row => row),
      playerStart: { ...template.playerStart },
      bombs: template.bombs.map(b => ({ ...b })),
      keycard: template.keycard ? { ...template.keycard } : null,
      doors: template.doors.map(d => ({ ...d })),
      guards: template.guards.map(g => ({
        ...g,
        waypoints: g.waypoints ? g.waypoints.map(w => ({ ...w })) : null,
        rotationSequence: g.rotationSequence ? [...g.rotationSequence] : null,
        patrolIndex: 0,
        patrolTimer: 0,
        rotateTimer: 0
      })),
      cameras: template.cameras.map(c => ({ ...c }))
    };

    // Reset player
    this.player.gridX = this.currentLevel.playerStart.x;
    this.player.gridY = this.currentLevel.playerStart.y;
    this.player.visualX = this.player.gridX;
    this.player.visualY = this.player.gridY;
    this.player.dir = this.currentLevel.playerStart.dir;

    // Reset abilities
    this.knightModeActive = false;
    this.knightCooldown = 0;
    this.isDefusing = false;
    this.defuseProgress = 0;
    this.timeRemaining = this.currentLevel.timeLimit;
    this.c4TickTimer = 0;
    this.takedowns = 0;
    this.state = 'PLAYING';

    this.updateHUD();
    this.hideModals();
  }

  restartCurrentLevel() {
    this.loadLevel(this.currentLevelIndex);
  }

  nextLevel() {
    if (this.currentLevelIndex < LEVELS.length - 1) {
      this.loadLevel(this.currentLevelIndex + 1);
    } else {
      // Completed all levels! Loop or return to Level 1
      this.loadLevel(0);
    }
  }

  initInput() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      this.keys[e.code] = true;

      // Sound initiation on first interaction
      soundSystem.init();
      soundSystem.startAmbience();

      // Quick restart
      if (e.code === 'KeyR') {
        this.restartCurrentLevel();
        return;
      }

      // Shift toggles Knight Dash targeting
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.toggleKnightMode();
        return;
      }

      // Defuse hold check (Space or KeyE)
      if (e.code === 'Space' || e.code === 'KeyE') {
        this.interactHeld = true;
      }

      // Grid Movement (WASD / Arrows)
      if (this.state === 'PLAYING') {
        let dx = 0;
        let dy = 0;
        let newDir = this.player.dir;

        if (e.code === 'KeyW' || e.code === 'ArrowUp') {
          dy = -1; newDir = 'up';
        } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
          dy = 1; newDir = 'down';
        } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
          dx = -1; newDir = 'left';
        } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
          dx = 1; newDir = 'right';
        }

        if (dx !== 0 || dy !== 0) {
          if (this.knightModeActive && this.knightCooldown <= 0) {
            // If in knight mode, directional key can step towards closest L-move or toggle
            // Or handle direct knight leap
            this.handleKnightDirectionMove(dx, dy);
          } else {
            this.tryMoveRook(dx, dy, newDir);
          }
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space' || e.code === 'KeyE') {
        this.interactHeld = false;
        this.isDefusing = false;
        this.defuseProgress = 0;
      }
    });

  // Mouse move for hover cursor
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      const hoverTileX = Math.floor(mouseX / this.renderer.tileSize);
      const hoverTileY = Math.floor(mouseY / this.renderer.tileSize);

      if (this.knightModeActive && this.knightCooldown <= 0) {
        const validMoves = this.getValidKnightMoves();
        const isHoverValid = validMoves.some(m => m.x === hoverTileX && m.y === hoverTileY);
        this.canvas.style.cursor = isHoverValid ? 'pointer' : 'default';
      } else {
        const dx = Math.abs(hoverTileX - this.player.gridX);
        const dy = Math.abs(hoverTileY - this.player.gridY);
        const isAdjacent = (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
        this.canvas.style.cursor = isAdjacent ? 'pointer' : 'default';
      }
    });
  }

  handleTileClick(tx, ty) {
    if (this.state !== 'PLAYING') return;

    if (this.knightModeActive && this.knightCooldown <= 0) {
      // Check if clicked tile is a valid Knight landing tile
      const validMoves = this.getValidKnightMoves();
      const match = validMoves.find(m => m.x === tx && m.y === ty);
      if (match) {
        this.executeKnightDash(match.x, match.y);
        return;
      }
    }

    // Otherwise, if adjacent tile clicked, treat as Rook step
    const dx = tx - this.player.gridX;
    const dy = ty - this.player.gridY;
    if ((Math.abs(dx) === 1 && dy === 0) || (Math.abs(dy) === 1 && dx === 0)) {
      let dir = this.player.dir;
      if (dx === 1) dir = 'right';
      else if (dx === -1) dir = 'left';
      else if (dy === 1) dir = 'down';
      else if (dy === -1) dir = 'up';
      this.tryMoveRook(dx, dy, dir);
    }
  }

  toggleKnightMode() {
    if (this.knightCooldown > 0) return;
    this.knightModeActive = !this.knightModeActive;
    this.updateHUD();
  }

  // Get all valid L-shaped (2 straight + 1 side) chess knight moves
  getValidKnightMoves() {
    const moves = [];
    const deltas = [
      { dx: 1, dy: -2 }, { dx: 2, dy: -1 },
      { dx: 2, dy: 1 },  { dx: 1, dy: 2 },
      { dx: -1, dy: 2 }, { dx: -2, dy: 1 },
      { dx: -2, dy: -1 },{ dx: -1, dy: -2 }
    ];

    deltas.forEach(d => {
      const tx = this.player.gridX + d.dx;
      const ty = this.player.gridY + d.dy;

      if (this.isWalkableForKnight(tx, ty)) {
        moves.push({ x: tx, y: ty, dx: d.dx, dy: d.dy });
      }
    });

    return moves;
  }

  // Knight can land on empty floor or crate low-cover or enemy tile, but NOT outside or inside a solid concrete wall (#) or locked door
  isWalkableForKnight(x, y) {
    const lvl = this.currentLevel;
    if (x < 0 || x >= lvl.width || y < 0 || y >= lvl.height) return false;
    if (lvl.map[y][x] === '#') return false;

    // Check locked door
    if (lvl.doors) {
      const lockedDoor = lvl.doors.find(d => d.x === x && d.y === y && d.locked);
      if (lockedDoor) return false;
    }

    return true;
  }

  // Handles directional key while Knight Mode is active
  handleKnightDirectionMove(dx, dy) {
    const validMoves = this.getValidKnightMoves();
    // Find moves in that general direction
    const bestMove = validMoves.find(m => {
      if (dx > 0 && m.dx > 0) return true;
      if (dx < 0 && m.dx < 0) return true;
      if (dy > 0 && m.dy > 0) return true;
      if (dy < 0 && m.dy < 0) return true;
      return false;
    });

    if (bestMove) {
      this.executeKnightDash(bestMove.x, bestMove.y);
    } else {
      // Toggle back to rook move if no knight move in that direction
      this.tryMoveRook(dx, dy, this.player.dir);
    }
  }

  executeKnightDash(tx, ty) {
    const prevX = this.player.gridX;
    const prevY = this.player.gridY;

    // Determine facing direction
    if (Math.abs(tx - this.player.gridX) >= Math.abs(ty - this.player.gridY)) {
      this.player.dir = (tx > this.player.gridX) ? 'right' : 'left';
    } else {
      this.player.dir = (ty > this.player.gridY) ? 'down' : 'up';
    }

    // Dash burst effects
    const startPx = this.player.gridX * 64 + 32;
    const startPy = this.player.gridY * 64 + 32;
    const destPx = tx * 64 + 32;
    const destPy = ty * 64 + 32;

    this.renderer.addParticleBurst(startPx, startPy, 14, '#38bdf8');
    this.renderer.addParticleBurst(destPx, destPy, 18, '#06b6d4');

    this.player.gridX = tx;
    this.player.gridY = ty;
    // visualX & visualY will smoothly slide to grid
    this.knightCooldown = this.knightCooldownMax;
    this.knightModeActive = false;

    soundSystem.playDash();
    this.renderer.addFloatingText("KNIGHT DASH!", tx, ty, '#38bdf8');

    this.onPlayerEnterTile(prevX, prevY);
    this.updateHUD();
  }

  // Rook Mode: 1 petak per input
  tryMoveRook(dx, dy, dir) {
    const targetX = this.player.gridX + dx;
    const targetY = this.player.gridY + dy;
    this.player.dir = dir;

    if (!this.isWalkableForRook(targetX, targetY)) {
      return;
    }

    const prevX = this.player.gridX;
    const prevY = this.player.gridY;

    this.player.gridX = targetX;
    this.player.gridY = targetY;
    soundSystem.playStep();

    this.onPlayerEnterTile(prevX, prevY);
  }

  isWalkableForRook(x, y) {
    const lvl = this.currentLevel;
    if (x < 0 || x >= lvl.width || y < 0 || y >= lvl.height) return false;

    // Solid concrete wall blocks Rook
    if (lvl.map[y][x] === '#') return false;

    // Low cover crates block Rook (Must jump with Knight Dash!)
    if (lvl.map[y][x] === 'C') return false;

    // Locked blast doors block Rook
    if (lvl.doors) {
      const lockedDoor = lvl.doors.find(d => d.x === x && d.y === y && d.locked);
      if (lockedDoor) return false;
    }

    return true;
  }

  // Called when player successfully steps into a tile
  onPlayerEnterTile(fromX, fromY) {
    const px = this.player.gridX;
    const py = this.player.gridY;
    const lvl = this.currentLevel;

    // 1. Check Keycard pickup
    if (lvl.keycard && !lvl.keycard.collected && lvl.keycard.x === px && lvl.keycard.y === py) {
      lvl.keycard.collected = true;
      soundSystem.playKeycard();
      this.renderer.addFloatingText("KEYCARD ACQUIRED!", px, py, '#06b6d4');

      // Unlock blast doors
      if (lvl.doors) {
        lvl.doors.forEach(d => {
          d.locked = false;
        });
        soundSystem.playDoorOpen();
        this.renderer.addFloatingText("DOORS UNLOCKED", px, py + 0.5, '#22c55e');
      }
      this.updateHUD();
    }

    // 2. Check Guard Takedown (if stepped on living guard tile)
    const guardOnTile = lvl.guards.find(g => g.alive && g.x === px && g.y === py);
    if (guardOnTile) {
      // Check if guard was facing where player approached from
      const isFacingApproach = this.isGuardFacingTile(guardOnTile, fromX, fromY);
      if (isFacingApproach) {
        // Guard saw player walking into him -> Caught!
        this.triggerGameOver("SPOTTED BY ENEMY GUARD!");
        return;
      } else {
        // Stealth Takedown from blind spot!
        guardOnTile.alive = false;
        this.takedowns++;
        soundSystem.playTakedown();
        this.renderer.addFloatingText("+1 TAKEDOWN", px, py, '#4ade80');
        this.renderer.addParticleBurst(px * 64 + 32, py * 64 + 32, 20, '#facc15');
      }
    }

    // 3. Check C4 Bomb interaction prompt
    const bombOnTile = lvl.bombs.find(b => !b.defused && b.x === px && b.y === py);
    const defusePrompt = document.getElementById('defusePrompt');
    if (bombOnTile) {
      defusePrompt.classList.remove('hidden');
    } else {
      defusePrompt.classList.add('hidden');
    }

    // Immediate check if player stepped into existing sight cone
    this.checkDetection();
  }

  // Checks if guard is facing towards the tile the player approached from
  isGuardFacingTile(guard, fromX, fromY) {
    if (fromX === undefined || fromY === undefined) return false;
    if (guard.dir === 'right' && fromX > guard.x) return true;
    if (guard.dir === 'left'  && fromX < guard.x) return true;
    if (guard.dir === 'down'  && fromY > guard.y) return true;
    if (guard.dir === 'up'    && fromY < guard.y) return true;
    return false;
  }

  // Check Line of Sight (LOS) for all guards & cameras
  checkDetection() {
    if (this.state !== 'PLAYING') return;

    const lvl = this.currentLevel;
    const ts = this.renderer.tileSize;
    const px = this.player.gridX * ts + ts / 2;
    const py = this.player.gridY * ts + ts / 2;

    // Check Guards
    for (const guard of lvl.guards) {
      if (!guard.alive) continue;

      const gx = guard.x * ts + ts / 2;
      const gy = guard.y * ts + ts / 2;
      const dist = Math.hypot(px - gx, py - gy);
      const maxDist = guard.fovDistance * ts;

      if (dist <= maxDist) {
        const guardAngle = this.renderer.directionToAngle(guard.dir);
        const angleToPlayer = Math.atan2(py - gy, px - gx);
        let diff = Math.abs(guardAngle - angleToPlayer);
        // Normalize angle diff between 0 and PI
        while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);

        const halfFov = (guard.fovAngle * Math.PI / 180) / 2;
        if (diff <= halfFov) {
          // Check line of sight occlusion against walls
          if (this.hasClearLineOfSight(gx, gy, px, py)) {
            this.triggerGameOver("SPOTTED BY ENEMY PATROL!");
            return;
          }
        }
      }
    }

    // Check Cameras
    if (lvl.cameras) {
      for (const cam of lvl.cameras) {
        const cx = cam.x * ts;
        const cy = cam.y * ts;
        const dist = Math.hypot(px - cx, py - cy);
        const maxDist = cam.fovDistance * ts;

        if (dist <= maxDist) {
          const angleToPlayer = Math.atan2(py - cy, px - cx);
          let diff = Math.abs(cam.angle - angleToPlayer);
          while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);

          const halfFov = (cam.fovAngle * Math.PI / 180) / 2;
          if (diff <= halfFov) {
            if (this.hasClearLineOfSight(cx, cy, px, py)) {
              this.triggerGameOver("SECURITY CAMERA DETECTED INTRUDER!");
              return;
            }
          }
        }
      }
    }
  }

  // Raycast between (x1, y1) and (x2, y2) to check if blocked by walls or locked doors
  hasClearLineOfSight(x1, y1, x2, y2) {
    const ts = this.renderer.tileSize;
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(dist / 12);
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;

    for (let i = 1; i < steps; i++) {
      const cx = x1 + dx * i;
      const cy = y1 + dy * i;
      const tx = Math.floor(cx / ts);
      const ty = Math.floor(cy / ts);

      if (tx >= 0 && tx < this.currentLevel.width && ty >= 0 && ty < this.currentLevel.height) {
        if (this.currentLevel.map[ty][tx] === '#') {
          return false; // Solid wall blocks sight!
        }
        if (this.currentLevel.doors) {
          const lockedDoor = this.currentLevel.doors.find(d => d.x === tx && d.y === ty && d.locked);
          if (lockedDoor) return false;
        }
      }
    }
    return true;
  }

  triggerGameOver(reason) {
    if (this.state === 'GAMEOVER') return;
    this.state = 'GAMEOVER';
    soundSystem.playAlert();
    soundSystem.playGameOver();

    const modal = document.getElementById('defeatModal');
    const reasonText = document.getElementById('defeatReason');
    reasonText.textContent = reason;
    modal.classList.remove('hidden');
  }

  triggerVictory() {
    if (this.state === 'VICTORY') return;
    this.state = 'VICTORY';
    soundSystem.playVictory();

    const modal = document.getElementById('victoryModal');
    const statsText = document.getElementById('victoryStats');
    const timeSpent = this.currentLevel.timeLimit - Math.max(0, Math.floor(this.timeRemaining));
    statsText.innerHTML = `
      <p>Waktu Tersisa: <strong>${Math.floor(this.timeRemaining)}s</strong> (Selesai dalam ${timeSpent}s)</p>
      <p>Total Takedown Senyap: <strong>${this.takedowns}</strong></p>
      <p>Semua Bom C4 Berhasil Dijinakkan!</p>
    `;
    modal.classList.remove('hidden');
  }

  // Game loop update
  update(dt) {
    if (this.state !== 'PLAYING') return;

    // Smooth visual interpolation for player
    const lerpSpeed = 16 * dt;
    this.player.visualX += (this.player.gridX - this.player.visualX) * Math.min(1.0, lerpSpeed);
    this.player.visualY += (this.player.gridY - this.player.visualY) * Math.min(1.0, lerpSpeed);

    // Update Knight Cooldown
    if (this.knightCooldown > 0) {
      this.knightCooldown = Math.max(0, this.knightCooldown - dt);
      this.updateKnightHUD();
    }

    // Timer Countdown
    this.timeRemaining -= dt;
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.triggerGameOver("WAKTU HABIS! BOM C4 TELAH MELEDAK!");
      return;
    }

    // C4 Beep sound rhythm
    this.c4TickTimer += dt;
    const tickInterval = this.timeRemaining < 15 ? 0.5 : 1.0;
    if (this.c4TickTimer >= tickInterval) {
      this.c4TickTimer = 0;
      soundSystem.playC4Tick(this.timeRemaining < 15);
    }

    // Update Guards (Patrols & Rotations)
    this.updateGuards(dt);

    // Update CCTV Cameras
    this.updateCameras(dt);

    // Update Bomb Defusal
    this.updateDefuse(dt);

    // Check Detection
    this.checkDetection();

    // Update Renderer (particles, texts)
    this.renderer.update(dt);

    // Update Header HUD
    this.updateHUDTimer();
  }

  updateGuards(dt) {
    const lvl = this.currentLevel;
    lvl.guards.forEach(guard => {
      if (!guard.alive) return;

      if (guard.type === 'patrol') {
        guard.patrolTimer = (guard.patrolTimer || 0) + dt;
        if (guard.patrolTimer >= guard.moveInterval) {
          guard.patrolTimer = 0;
          const targetWp = guard.waypoints[guard.patrolIndex];

          // Move step towards target waypoint
          const dx = Math.sign(targetWp.x - guard.x);
          const dy = Math.sign(targetWp.y - guard.y);

          if (dx !== 0 || dy !== 0) {
            guard.x += dx;
            guard.y += dy;
            if (dx === 1) guard.dir = 'right';
            else if (dx === -1) guard.dir = 'left';
            else if (dy === 1) guard.dir = 'down';
            else if (dy === -1) guard.dir = 'up';
          }

          // If reached waypoint, flip target index
          if (guard.x === targetWp.x && guard.y === targetWp.y) {
            guard.dir = targetWp.dir || guard.dir;
            guard.patrolIndex = (guard.patrolIndex + 1) % guard.waypoints.length;
          }
        }
      } else if (guard.type === 'rotate') {
        guard.rotateTimer = (guard.rotateTimer || 0) + dt;
        if (guard.rotateTimer >= guard.rotateInterval) {
          guard.rotateTimer = 0;
          const seq = guard.rotationSequence;
          const currentIdx = seq.indexOf(guard.dir);
          guard.dir = seq[(currentIdx + 1) % seq.length];
        }
      }
    });
  }

  updateCameras(dt) {
    const lvl = this.currentLevel;
    if (!lvl.cameras) return;

    lvl.cameras.forEach(cam => {
      cam.angle = cam.baseAngle + Math.sin(this.renderer.time * cam.sweepSpeed) * (cam.sweepAngle / 2);
    });
  }

  updateDefuse(dt) {
    const lvl = this.currentLevel;
    const bombOnTile = lvl.bombs.find(b => !b.defused && b.x === this.player.gridX && b.y === this.player.gridY);

    if (bombOnTile && this.interactHeld) {
      this.isDefusing = true;
      // Defuse in 3.0 seconds
      this.defuseProgress += (100 / 3.0) * dt;

      this.defuseTickTimer += dt;
      if (this.defuseTickTimer >= 0.25) {
        this.defuseTickTimer = 0;
        soundSystem.playDefuseTick(this.defuseProgress / 100);
      }

      if (this.defuseProgress >= 100) {
        this.defuseProgress = 100;
        bombOnTile.defused = true;
        this.isDefusing = false;
        soundSystem.playDefuseSuccess();
        this.renderer.addFloatingText("BOMB DEFUSED! CHECKMATE!", bombOnTile.x, bombOnTile.y, "#22c55e");
        this.renderer.addParticleBurst(bombOnTile.x * 64 + 32, bombOnTile.y * 64 + 32, 25, '#22c55e');

        // Check if all bombs defused
        const remainingBombs = lvl.bombs.filter(b => !b.defused);
        if (remainingBombs.length === 0) {
          setTimeout(() => this.triggerVictory(), 600);
        } else {
          this.renderer.addFloatingText(`${remainingBombs.length} BOMB REMAINING!`, this.player.gridX, this.player.gridY - 1, "#f59e0b");
        }
      }
    } else {
      this.isDefusing = false;
      this.defuseProgress = 0;
    }
  }

  // HUD & UI Updates
  initUI() {
    // Mode buttons in HUD
    const rookBtn = document.getElementById('rookModeBtn');
    const knightBtn = document.getElementById('knightDashBtn');

    if (rookBtn) {
      rookBtn.addEventListener('click', () => {
        this.knightModeActive = false;
        this.updateHUD();
      });
    }

    if (knightBtn) {
      knightBtn.addEventListener('click', () => {
        this.toggleKnightMode();
      });
    }

    // Modal buttons
    const retryDefeatBtn = document.getElementById('retryDefeatBtn');
    if (retryDefeatBtn) {
      retryDefeatBtn.addEventListener('click', () => this.restartCurrentLevel());
    }

    const nextVictoryBtn = document.getElementById('nextVictoryBtn');
    if (nextVictoryBtn) {
      nextVictoryBtn.addEventListener('click', () => this.nextLevel());
    }

    const restartVictoryBtn = document.getElementById('restartVictoryBtn');
    if (restartVictoryBtn) {
      restartVictoryBtn.addEventListener('click', () => this.restartCurrentLevel());
    }

    // Level selector
    const levelSelect = document.getElementById('levelSelect');
    if (levelSelect) {
      levelSelect.addEventListener('change', (e) => {
        this.loadLevel(parseInt(e.target.value, 10));
      });
    }

    // Mute button
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = soundSystem.toggleMute();
        muteBtn.textContent = isMuted ? '🔇 Audio: OFF' : '🔊 Audio: ON';
      });
    }

    // Restart button in header
    const headerRestartBtn = document.getElementById('headerRestartBtn');
    if (headerRestartBtn) {
      headerRestartBtn.addEventListener('click', () => this.restartCurrentLevel());
    }

    // Touch/Defuse on-screen button
    const touchDefuseBtn = document.getElementById('touchDefuseBtn');
    if (touchDefuseBtn) {
      const startDefuse = (e) => {
        e.preventDefault();
        soundSystem.init();
        this.interactHeld = true;
      };
      const stopDefuse = (e) => {
        e.preventDefault();
        this.interactHeld = false;
        this.isDefusing = false;
        this.defuseProgress = 0;
      };
      touchDefuseBtn.addEventListener('mousedown', startDefuse);
      touchDefuseBtn.addEventListener('mouseup', stopDefuse);
      touchDefuseBtn.addEventListener('touchstart', startDefuse, { passive: false });
      touchDefuseBtn.addEventListener('touchend', stopDefuse, { passive: false });
    }
  }

  updateHUDTimer() {
    const timerElem = document.getElementById('timerDisplay');
    if (timerElem) {
      const minutes = Math.floor(this.timeRemaining / 60);
      const seconds = Math.floor(this.timeRemaining % 60);
      timerElem.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      if (this.timeRemaining <= 15) {
        timerElem.classList.add('urgent');
      } else {
        timerElem.classList.remove('urgent');
      }
    }
  }

  updateHUD() {
    const lvl = this.currentLevel;

    // Mission subtitle
    const missionName = document.getElementById('missionName');
    if (missionName) {
      missionName.textContent = `MISSION: ${lvl.name.toUpperCase()} - DEFUSE THE BOMB`;
    }

    // Level select dropdown sync
    const levelSelect = document.getElementById('levelSelect');
    if (levelSelect) {
      levelSelect.value = this.currentLevelIndex;
    }

    // Keycard status
    const keycardStatus = document.getElementById('keycardStatus');
    if (keycardStatus) {
      if (!lvl.keycard) {
        keycardStatus.innerHTML = `Punya Keycard: <span class="text-gray-400">TIDAK DIBUTUHKAN</span>`;
      } else if (lvl.keycard.collected) {
        keycardStatus.innerHTML = `Punya Keycard: <span class="text-emerald-400 font-bold">YES ✓</span>`;
      } else {
        keycardStatus.innerHTML = `Punya Keycard: <span class="text-rose-400 font-bold">NO ✗</span>`;
      }
    }

    // Mode Buttons Active State
    const rookBtn = document.getElementById('rookModeBtn');
    const knightBtn = document.getElementById('knightDashBtn');

    if (rookBtn && knightBtn) {
      if (this.knightModeActive) {
        rookBtn.classList.remove('active');
        knightBtn.classList.add('active');
      } else {
        rookBtn.classList.add('active');
        knightBtn.classList.remove('active');
      }
    }

    this.updateKnightHUD();
  }

  updateKnightHUD() {
    const knightCooldownLabel = document.getElementById('knightCooldownLabel');
    const knightBtn = document.getElementById('knightDashBtn');

    if (this.knightCooldown > 0) {
      if (knightCooldownLabel) {
        knightCooldownLabel.textContent = `cooldown ${this.knightCooldown.toFixed(1)}s`;
      }
      if (knightBtn) {
        knightBtn.classList.add('cooldown');
      }
    } else {
      if (knightCooldownLabel) {
        knightCooldownLabel.textContent = `cooldown 4s [READY]`;
      }
      if (knightBtn) {
        knightBtn.classList.remove('cooldown');
      }
    }
  }

  hideModals() {
    document.getElementById('defeatModal')?.classList.add('hidden');
    document.getElementById('victoryModal')?.classList.add('hidden');
  }

  // Animation frame loop
  start() {
    const loop = (timestamp) => {
      if (!this.lastTime) this.lastTime = timestamp;
      const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
      this.lastTime = timestamp;

      this.update(dt);
      this.renderer.render(this);

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new TacticalGame();
  window.game.start();
});
