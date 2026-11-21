// js/renderer.js - Tactical Canvas Renderer & Visual FX
// Tactical Checkmate: Operation Defuse

class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tileSize = 64;
    this.particles = [];
    this.floatingTexts = [];
    this.time = 0;
  }

  // Add floating combat text (+1 TAKEDOWN, etc.)
  addFloatingText(text, x, y, color = '#22d3ee') {
    this.floatingTexts.push({
      text,
      x: x * this.tileSize + this.tileSize / 2,
      y: y * this.tileSize,
      color,
      alpha: 1.0,
      life: 1.2
    });
  }

  // Add visual particle burst
  addParticleBurst(px, py, count = 12, color = '#38bdf8') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        color,
        size: 3 + Math.random() * 4
      });
    }
  }

  update(dt) {
    this.time += dt;

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 25 * dt;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life / 1.2);
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  render(game) {
    const ctx = this.ctx;
    const ts = this.tileSize;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const level = game.currentLevel;
    if (!level) return;

    // 1. Draw Checkered Tactical Floor
    this.drawFloor(level);

    // 2. Draw Environmental details (Computer terminals, desks, hazard markings)
    this.drawEnvironmentDecor(level);

    // 3. Draw C4 Bombs & Bombsites
    this.drawBombs(level, game);

    // 4. Draw Keycard & Doors
    this.drawKeycardAndDoors(level);

    // 5. Draw Crates & Solid Walls
    this.drawObstacles(level);

    // 6. Draw CCTV Cameras (mounts)
    this.drawCameras(level);

    // 7. Draw Line of Sight Cones (Guards & Cameras) - Cast with wall occlusion
    this.drawVisionCones(level, game);

    // 8. Draw Knight Dash Guidance Paths (if Knight mode active)
    if (game.knightModeActive && game.knightCooldown <= 0) {
      this.drawKnightPaths(game);
    }

    // 9. Draw Guards
    this.drawGuards(level);

    // 10. Draw Player (Agent White Pawn)
    this.drawPlayer(game);

    // 11. Draw Particles & FX
    this.drawParticles();

    // 12. Draw Floating Texts
    this.drawFloatingTexts();

    // 13. Draw In-World Defuse Progress Meter (if defusing)
    if (game.isDefusing) {
      this.drawDefuseProgress(game);
    }
  }

  // 1. Checkered tactical floor
  drawFloor(level) {
    const ctx = this.ctx;
    const ts = this.tileSize;

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const isEven = (x + y) % 2 === 0;
        // High-tech modern chess floor (charcoal & dark slate)
        ctx.fillStyle = isEven ? '#1e2430' : '#283040';
        ctx.fillRect(x * ts, y * ts, ts, ts);

        // Subtle tile seam border
        ctx.strokeStyle = '#141822';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * ts, y * ts, ts, ts);

        // Center dot on tiles for tactical grid feel
        ctx.fillStyle = '#333e52';
        ctx.fillRect(x * ts + ts / 2 - 1, y * ts + ts / 2 - 1, 2, 2);
      }
    }

    // CT-Spawn Marker Ring
    const sp = level.playerStart;
    if (sp) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sp.x * ts + ts / 2, sp.y * ts + ts / 2, ts * 0.42, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CT-SPAWN', sp.x * ts + ts / 2, sp.y * ts + ts - 8);
      ctx.restore();
    }
  }

  // 2. Wall decors, computer desks & servers
  drawEnvironmentDecor(level) {
    const ctx = this.ctx;
    const ts = this.tileSize;

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        // Place computer terminals next to top walls if free
        if (y === 1 && (x === 2 || x === 3 || x === 11 || x === 12) && level.map[y][x] === '.') {
          // Computer terminal desk
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x * ts + 8, y * ts + 4, ts - 16, 20);

          // Glowing cyan monitors
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(x * ts + 14, y * ts + 6, 14, 10);
          ctx.fillRect(x * ts + 34, y * ts + 6, 14, 10);

          // Scanlines
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillRect(x * ts + 16, y * ts + 8, 10, 2);
          ctx.fillRect(x * ts + 36, y * ts + 8, 10, 2);
        }
      }
    }
  }

  // 3. C4 Bombs and Bombsites
  drawBombs(level, game) {
    const ctx = this.ctx;
    const ts = this.tileSize;

    level.bombs.forEach(bomb => {
      const bx = bomb.x * ts;
      const by = bomb.y * ts;

      // Bombsite Hazard Floor Zone
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.fillRect(bx - 4, by - 4, ts + 8, ts + 8);

      // Yellow/Black Hazard Border
      ctx.strokeStyle = bomb.defused ? '#22c55e' : '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 4, by + 4, ts - 8, ts - 8);

      // Label above site
      ctx.fillStyle = bomb.defused ? '#4ade80' : '#ef4444';
      ctx.font = 'bold 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bomb.name, bx + ts / 2, by - 8);

      // Draw C4 Object
      const cx = bx + ts / 2;
      const cy = by + ts / 2;

      if (!bomb.defused) {
        // C4 Clay bricks (Military tan/brown)
        ctx.fillStyle = '#785536';
        ctx.fillRect(cx - 16, cy - 10, 32, 20);
        ctx.strokeStyle = '#3e2a18';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 16, cy - 10, 32, 20);

        // Tape / Straps
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx - 12, cy - 10, 5, 20);
        ctx.fillRect(cx + 7, cy - 10, 5, 20);

        // Detonator Pack with Circuit Board
        ctx.fillStyle = '#166534';
        ctx.fillRect(cx - 6, cy - 6, 12, 12);

        // Blinking Red LED / Timer
        const blink = Math.floor(this.time * 3) % 2 === 0;
        ctx.fillStyle = blink ? '#ff2222' : '#550000';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        if (blink) {
          ctx.strokeStyle = 'rgba(255, 34, 34, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          ctx.stroke();
        }

        // "C4" text stencil
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('C4', cx, cy + 16);
      } else {
        // Defused indicator (Wires cut, green light)
        ctx.fillStyle = '#475569';
        ctx.fillRect(cx - 16, cy - 10, 32, 20);
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('DEFUSED', cx, cy + 3);
      }
      ctx.restore();
    });
  }

  // 4. Keycard & Blast Doors
  drawKeycardAndDoors(level) {
    const ctx = this.ctx;
    const ts = this.tileSize;

    // Keycard
    if (level.keycard && !level.keycard.collected) {
      const kx = level.keycard.x * ts + ts / 2;
      const ky = level.keycard.y * ts + ts / 2;
      const pulse = Math.sin(this.time * 5) * 2;

      ctx.save();
      // Glow circle
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.beginPath();
      ctx.arc(kx, ky, 18 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Card Body
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1.5;
      ctx.fillRect(kx - 10, ky - 7, 20, 14);
      ctx.strokeRect(kx - 10, ky - 7, 20, 14);

      // Gold Chip
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(kx - 6, ky - 3, 6, 6);

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KEY', kx + 3, ky + 2);
      ctx.restore();
    }

    // Blast Doors
    if (level.doors) {
      level.doors.forEach(door => {
        const dx = door.x * ts;
        const dy = door.y * ts;

        ctx.save();
        if (door.locked) {
          // Heavy closed blast door
          ctx.fillStyle = '#334155';
          ctx.fillRect(dx + 4, dy + 4, ts - 8, ts - 8);

          // Diagonal security stripes
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(dx + 12, dy + 8);
          ctx.lineTo(dx + 24, dy + ts - 8);
          ctx.moveTo(dx + 28, dy + 8);
          ctx.lineTo(dx + 40, dy + ts - 8);
          ctx.moveTo(dx + 44, dy + 8);
          ctx.lineTo(dx + 56, dy + ts - 8);
          ctx.stroke();

          // Red Electronic Lock Light
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(dx + ts / 2, dy + ts / 2, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('LOCKED', dx + ts / 2, dy + ts - 8);
        } else {
          // Open sliding blast door (recessed into frame)
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(dx + 2, dy + 2, ts - 4, ts - 4);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.strokeRect(dx + 6, dy + 6, ts - 12, ts - 12);

          // Green open indicator
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(dx + ts / 2, dy + ts / 2, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('OPEN', dx + ts / 2, dy + ts / 2 + 12);
        }
        ctx.restore();
      });
    }
  }

  // 5. Walls and Crates
  drawObstacles(level) {
    const ctx = this.ctx;
    const ts = this.tileSize;

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const char = level.map[y][x];
        const px = x * ts;
        const py = y * ts;

        if (char === '#') {
          // Solid Concrete Wall
          ctx.save();
          // Wall 3D top face
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px, py, ts, ts);

          // Beveled border
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(px + 3, py + 3, ts - 6, ts - 6);

          // Inner bevel highlight
          ctx.fillStyle = '#334155';
          ctx.fillRect(px + 4, py + 4, ts - 8, 6);

          // Corner rivet dots
          ctx.fillStyle = '#64748b';
          ctx.fillRect(px + 6, py + 6, 2, 2);
          ctx.fillRect(px + ts - 8, py + 6, 2, 2);
          ctx.fillRect(px + 6, py + ts - 8, 2, 2);
          ctx.fillRect(px + ts - 8, py + ts - 8, 2, 2);
          ctx.restore();
        } else if (char === 'C') {
          // Low Cover Crate (Jumpable by Knight Dash)
          ctx.save();
          // Olive-drab military crate
          ctx.fillStyle = '#3f4e3c';
          ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);

          // Steel frame rim
          ctx.strokeStyle = '#273425';
          ctx.lineWidth = 3;
          ctx.strokeRect(px + 6, py + 6, ts - 12, ts - 12);

          // X Cross braces
          ctx.strokeStyle = '#4e624b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px + 8, py + 8);
          ctx.lineTo(px + ts - 8, py + ts - 8);
          ctx.moveTo(px + ts - 8, py + 8);
          ctx.lineTo(px + 8, py + ts - 8);
          ctx.stroke();

          // Yellow caution corner tags
          ctx.fillStyle = '#eab308';
          ctx.fillRect(px + 6, py + 6, 6, 6);
          ctx.fillRect(px + ts - 12, py + ts - 12, 6, 6);

          // Stencil text
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.font = 'bold 7px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('LOW COVER', px + ts / 2, py + ts / 2 + 3);
          ctx.restore();
        }
      }
    }
  }

  // 6. CCTV Cameras
  drawCameras(level) {
    const ctx = this.ctx;
    const ts = this.tileSize;

    if (!level.cameras) return;

    level.cameras.forEach(cam => {
      const cx = cam.x * ts;
      const cy = cam.y * ts;

      ctx.save();
      // Camera wall mounting base
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Camera lens body directed at cam.angle
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(cam.angle);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, -6, 18, 12);

      // Front lens
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(18, -4, 4, 8);

      // Blinking red recording LED
      const blink = Math.floor(this.time * 4) % 2 === 0;
      ctx.fillStyle = blink ? '#ef4444' : '#7f1d1d';
      ctx.beginPath();
      ctx.arc(6, -8, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.restore();
    });
  }

  // 7. Dynamic Line of Sight Vision Cones with Wall Raycasting Occlusion
  drawVisionCones(level, game) {
    const ctx = this.ctx;
    const ts = this.tileSize;

    // A. Guards vision cones
    level.guards.forEach(guard => {
      if (!guard.alive) return;

      const gx = guard.x * ts + ts / 2;
      const gy = guard.y * ts + ts / 2;
      const dirAngle = this.directionToAngle(guard.dir);
      const halfFov = (guard.fovAngle * Math.PI / 180) / 2;
      const maxDist = guard.fovDistance * ts;

      this.renderRaycastedCone(gx, gy, dirAngle, halfFov, maxDist, level);
    });

    // B. CCTV cameras vision cones
    if (level.cameras) {
      level.cameras.forEach(cam => {
        const cx = cam.x * ts;
        const cy = cam.y * ts;
        const halfFov = (cam.fovAngle * Math.PI / 180) / 2;
        const maxDist = cam.fovDistance * ts;

        this.renderRaycastedCone(cx, cy, cam.angle, halfFov, maxDist, level);
      });
    }
  }

  // Raycasts vision cone against level walls & solid doors
  renderRaycastedCone(originX, originY, centerAngle, halfFov, maxDist, level) {
    const ctx = this.ctx;
    const numRays = 32;
    const stepAngle = (halfFov * 2) / numRays;
    const points = [{ x: originX, y: originY }];

    for (let i = 0; i <= numRays; i++) {
      const angle = centerAngle - halfFov + i * stepAngle;
      const endPt = this.castRay(originX, originY, angle, maxDist, level);
      points.push(endPt);
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();

    // Red translucent cone
    const pulse = 0.28 + Math.sin(this.time * 4) * 0.05;
    ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
    ctx.fill();

    // Glowing border outline
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // Casts a single ray against the tilemap
  castRay(ox, oy, angle, maxDist, level) {
    const ts = this.tileSize;
    const step = 8;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let d = step; d <= maxDist; d += step) {
      const rx = ox + cos * d;
      const ry = oy + sin * d;
      const tx = Math.floor(rx / ts);
      const ty = Math.floor(ry / ts);

      if (tx < 0 || tx >= level.width || ty < 0 || ty >= level.height) {
        return { x: rx, y: ry };
      }

      const cell = level.map[ty][tx];
      // Walls block line of sight completely
      if (cell === '#') {
        return { x: rx, y: ry };
      }

      // Locked blast doors block LOS
      if (level.doors) {
        const door = level.doors.find(d => d.x === tx && d.y === ty && d.locked);
        if (door) return { x: rx, y: ry };
      }
    }

    return {
      x: ox + Math.cos(angle) * maxDist,
      y: oy + Math.sin(angle) * maxDist
    };
  }

  directionToAngle(dir) {
    switch (dir) {
      case 'right': return 0;
      case 'down':  return Math.PI / 2;
      case 'left':  return Math.PI;
      case 'up':    return -Math.PI / 2;
      default:      return 0;
    }
  }

  // 8. Knight Dash Glowing Paths (Pola Huruf "L")
  drawKnightPaths(game) {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const validMoves = game.getValidKnightMoves();

    const px = game.player.visualX * ts + ts / 2;
    const py = game.player.visualY * ts + ts / 2;

    ctx.save();
    validMoves.forEach(m => {
      const tx = m.x * ts + ts / 2;
      const ty = m.y * ts + ts / 2;

      // Draw L-shaped bend connector
      // 2 straight + 1 side
      const dx = m.x - game.player.gridX;
      const dy = m.y - game.player.gridY;

      let bendX, bendY;
      if (Math.abs(dx) === 2) {
        // Bend is at (player.x + dx, player.y)
        bendX = (game.player.gridX + dx) * ts + ts / 2;
        bendY = py;
      } else {
        // Bend is at (player.x, player.y + dy)
        bendX = px;
        bendY = (game.player.gridY + dy) * ts + ts / 2;
      }

      // Glowing blue tactical route
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(bendX, bendY);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Inner bright core line
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(bendX, bendY);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Destination Target Box (Cyan Reticle)
      const bx = m.x * ts + 6;
      const by = m.y * ts + 6;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.fillRect(bx, by, ts - 12, ts - 12);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(bx, by, ts - 12, ts - 12);

      // Chess Knight Icon watermark
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px serif';
      ctx.textAlign = 'center';
      ctx.fillText('♞', tx, ty + 7);
    });
    ctx.restore();
  }

  // 9. Guards
  drawGuards(level) {
    const ctx = this.ctx;
    const ts = this.tileSize;

    level.guards.forEach(guard => {
      const gx = guard.x * ts + ts / 2;
      const gy = guard.y * ts + ts / 2;
      const angle = this.directionToAngle(guard.dir);

      ctx.save();
      ctx.translate(gx, gy);

      if (!guard.alive) {
        // Knocked out / eliminated guard lying on the floor
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(-14, -8, 28, 16);
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        // KO stars or text
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ZZZ', 0, -12);
        ctx.restore();
        return;
      }

      ctx.rotate(angle);

      // Guard Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 16, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Assault rifle held forward
      ctx.fillStyle = '#09090b';
      ctx.fillRect(10, 4, 18, 5); // Gun barrel
      ctx.fillStyle = '#27272a';
      ctx.fillRect(14, 2, 8, 4);

      // Tactical Body (Black King Syndicate)
      ctx.fillStyle = '#18181b'; // Dark tactical black
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Kevlar Vest Armor
      ctx.fillStyle = '#27272a';
      ctx.fillRect(-8, -9, 16, 18);

      // Red syndicate shoulder accents
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-6, -11, 4, 3);
      ctx.fillRect(-6, 8, 4, 3);

      // Black Tactical Helmet
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();

      // Red Night Vision Goggles / Visor
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(4, -5, 4, 10);

      ctx.restore();

      // Exclamation alert mark above guard
      const alertPulse = Math.sin(this.time * 6);
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', gx, gy - 20 + alertPulse);
      ctx.restore();
    });
  }

  // 10. Player (Agent White Pawn)
  drawPlayer(game) {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const px = game.player.visualX * ts + ts / 2;
    const py = game.player.visualY * ts + ts / 2;
    const angle = this.directionToAngle(game.player.dir);

    ctx.save();
    ctx.translate(px, py);

    // Player Selection/Ring Glow
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.strokeStyle = game.knightModeActive ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = game.knightModeActive ? 2.5 : 1.5;
    ctx.stroke();

    ctx.rotate(angle);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Silenced Submachine Gun
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(8, 4, 16, 4);
    // Suppressor
    ctx.fillStyle = '#475569';
    ctx.fillRect(20, 3, 7, 6);

    // Blue Tactical CT Uniform (Counter-Terrorist operative)
    ctx.fillStyle = '#1e3a8a'; // Navy Blue
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tactical Vest & Pouches
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(-7, -8, 14, 16);

    // Radio antenna on left shoulder
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-6, -11, 2, 4);

    // Blue Tactical Helmet
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    // Tactical Goggles / Visor (Cyan Glow)
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(4, -5, 4, 10);

    ctx.restore();

    // Chess Pawn symbol above player head
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center';
    ctx.fillText('♟', px, py - 20);
    ctx.restore();
  }

  // 11. Defuse Progress In-World Meter
  drawDefuseProgress(game) {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const px = game.player.visualX * ts + ts / 2;
    const py = game.player.visualY * ts - 26;

    ctx.save();
    // Background bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(px - 36, py - 6, 72, 14);
    ctx.strokeRect(px - 36, py - 6, 72, 14);

    // Fill bar
    const ratio = Math.min(1.0, game.defuseProgress / 100);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(px - 34, py - 4, 68 * ratio, 10);

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`DEFUSING: ${Math.floor(game.defuseProgress)}%`, px, py + 4);
    ctx.restore();
  }

  // 12. Particles
  drawParticles() {
    const ctx = this.ctx;
    this.particles.forEach(p => {
      ctx.save();
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // 13. Floating combat texts
  drawFloatingTexts() {
    const ctx = this.ctx;
    this.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }
}

window.GameRenderer = GameRenderer;
