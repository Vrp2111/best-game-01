// The canvas renderer: the dark board, the glowing beams, the shadow
// creatures, the towers and the particles. It only paints; it never changes
// the world. Beams are drawn additively ('lighter') with a wide soft glow, a
// bright mid and a white-hot core, plus pulses of light that travel along
// them, so the light is the visual star of the game.
import {
  COLORS, CORE_CELL, DIR, FIELD, PALETTE, PATH,
} from './config.js';
import { drawTowerLevel } from './upgrades.js';
import { bossWeakRing, drawBossBanner, drawBossMarkers } from './boss.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = FIELD.width * dpr;
  canvas.height = FIELD.height * dpr;
  ctx.scale(dpr, dpr);

  function cellXY(col, row) {
    return { x: (col + 0.5) * FIELD.cell, y: (row + 0.5) * FIELD.cell };
  }

  function drawBackground(time) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, PALETTE.backdrop2);
    g.addColorStop(1, PALETTE.backdrop);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Faint stars / dust.
    ctx.fillStyle = 'rgba(180, 200, 255, 0.25)';
    for (let i = 0; i < 40; i += 1) {
      const x = (i * 173.3) % FIELD.width;
      const y = (i * 97.7) % FIELD.height;
      const tw = 0.5 + 0.5 * Math.sin(time * 0.7 + i);
      ctx.globalAlpha = 0.12 + 0.18 * tw;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
    // Grid.
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= FIELD.cols; c += 1) {
      ctx.moveTo(c * FIELD.cell, 0);
      ctx.lineTo(c * FIELD.cell, FIELD.height);
    }
    for (let r = 0; r <= FIELD.rows; r += 1) {
      ctx.moveTo(0, r * FIELD.cell);
      ctx.lineTo(FIELD.width, r * FIELD.cell);
    }
    ctx.stroke();
  }

  function drawPath(time) {
    for (const [c, r] of PATH) {
      const x = c * FIELD.cell;
      const y = r * FIELD.cell;
      ctx.fillStyle = PALETTE.path;
      ctx.fillRect(x + 1, y + 1, FIELD.cell - 2, FIELD.cell - 2);
      ctx.strokeStyle = PALETTE.pathEdge;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1.5, y + 1.5, FIELD.cell - 3, FIELD.cell - 3);
    }
    // A soft glow running along the path, like moonlight on stone.
    ctx.fillStyle = PALETTE.pathGlow;
    for (const [c, r] of PATH) {
      ctx.fillRect(c * FIELD.cell + 6, r * FIELD.cell + 6, FIELD.cell - 12, FIELD.cell - 12);
    }
    // The shadow gate where enemies enter.
    const gate = cellXY(0, 1);
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createRadialGradient(gate.x, gate.y, 4, gate.x, gate.y, 46);
    gg.addColorStop(0, `rgba(150, 80, 255, ${0.35 + 0.25 * pulse})`);
    gg.addColorStop(1, 'rgba(150, 80, 255, 0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(gate.x, gate.y, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#1a0b2e';
    ctx.beginPath();
    ctx.arc(gate.x, gate.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a86bff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawCore(state, time) {
    const { x, y } = cellXY(CORE_CELL.col, CORE_CELL.row);
    const hpFrac = state.coreHp / state.maxHp;
    const pulse = 0.75 + 0.25 * Math.sin(time * 2.6);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(x, y, 6, x, y, 90);
    glow.addColorStop(0, `rgba(255, 220, 130, ${0.5 * pulse * (0.35 + 0.65 * hpFrac)})`);
    glow.addColorStop(1, 'rgba(255, 220, 130, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // The lantern itself.
    ctx.fillStyle = '#2a1f0d';
    ctx.strokeStyle = PALETTE.core;
    ctx.lineWidth = 2;
    const w = 30;
    const h = 38;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 233, 168, ${0.35 + 0.65 * hpFrac})`;
    ctx.beginPath();
    ctx.roundRect(x - w / 2 + 5, y - h / 2 + 5, w - 10, h - 10, 4);
    ctx.fill();
    ctx.strokeStyle = PALETTE.core;
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2 - 8);
    ctx.lineTo(x, y - h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - h / 2 - 8, 4, 0, Math.PI * 2);
    ctx.stroke();
    // Core HP ring.
    ctx.strokeStyle = 'rgba(255, 233, 168, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpFrac);
    ctx.stroke();
  }

  function drawTower(tower, col, row, time) {
    const { x, y } = cellXY(col, row);
    // Base.
    ctx.fillStyle = PALETTE.towerBase;
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - 30, y - 30, 60, 60, 8);
    ctx.fill();
    ctx.stroke();
    if (tower.type === 'emitter') {
      const d = DIR[tower.dir];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 2, x, y, 26);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.4, 'rgba(200,215,255,0.45)');
      g.addColorStop(1, 'rgba(200,215,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      // Direction arrow.
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + d.dx * 12, y + d.dy * 12);
      ctx.lineTo(x + d.dx * 26, y + d.dy * 26);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + d.dx * 26, y + d.dy * 26, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (tower.type === 'mirror') {
      ctx.strokeStyle = '#8be9ff';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#38b6ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      if (tower.mirror === '/') {
        ctx.moveTo(x + 20, y - 20);
        ctx.lineTo(x - 20, y + 20);
      } else {
        ctx.moveTo(x - 20, y - 20);
        ctx.lineTo(x + 20, y + 20);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#8be9ff';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tower.mirror, x, y - 24);
    } else if (tower.type === 'prism') {
      const shimmer = 0.6 + 0.4 * Math.sin(time * 3 + col + row);
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(220, 235, 255, 0.25)';
      ctx.strokeStyle = `rgba(255, 255, 255, ${shimmer})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - 22);
      ctx.lineTo(x + 22, y + 16);
      ctx.lineTo(x - 22, y + 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      // The three split colours at the prism's outputs.
      ctx.fillStyle = COLORS.red.css;
      ctx.beginPath();
      ctx.arc(x, y - 24, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.blue.css;
      ctx.beginPath();
      ctx.arc(x - 24, y + 14, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.green.css;
      ctx.beginPath();
      ctx.arc(x + 24, y + 14, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (tower.type === 'lens') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 2, x, y, 24);
      g.addColorStop(0, 'rgba(255,255,255,0.85)');
      g.addColorStop(0.5, 'rgba(160,200,255,0.35)');
      g.addColorStop(1, 'rgba(160,200,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#cfe4ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y, 16, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Upgrade level (v1.2): gold pips under the base, a gold ring at max.
    drawTowerLevel(ctx, tower, x, y);
  }

  function drawBeams(state, time) {
    const beams = state.beams;
    if (beams.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const seg of beams) {
      const colour = COLORS[seg.color];
      // Outer glow.
      ctx.strokeStyle = colour.glow;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = seg.width * 2.4;
      ctx.shadowColor = colour.css;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
      // Mid.
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = seg.width * 1.1;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
      // White-hot core.
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = Math.max(2, seg.width * 0.42);
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // Pulses of light travelling along each beam.
    ctx.globalAlpha = 0.9;
    for (const seg of beams) {
      const colour = COLORS[seg.color];
      const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
      if (len < 10) continue;
      const speed = 0.35;
      for (let k = 0; k < 2; k += 1) {
        const t = (time * speed + k * 0.5 + (seg.x1 + seg.y1) * 0.001) % 1;
        const px = seg.x1 + (seg.x2 - seg.x1) * t;
        const py = seg.y1 + (seg.y2 - seg.y1) * t;
        ctx.fillStyle = colour.css;
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawEnemies(state, time) {
    for (const enemy of state.enemies) {
      const def = enemy.def;
      const slowed = time < enemy.slowUntil;
      // Shadow body.
      const body = ctx.createRadialGradient(enemy.x - 4, enemy.y - 5, 2, enemy.x, enemy.y, enemy.radius + 4);
      body.addColorStop(0, '#2a2340');
      body.addColorStop(0.7, '#120e22');
      body.addColorStop(1, 'rgba(10, 8, 20, 0.9)');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      // Weakness ring: the colour that hurts it most. A boss in phase II
      // or III burns its phase colour instead.
      const ringColor = enemy.boss ? bossWeakRing(enemy) : COLORS[def.weak].css;
      ctx.strokeStyle = ringColor;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      // Eyes.
      ctx.fillStyle = def.eye;
      const ex = enemy.radius * 0.38;
      const ey = -enemy.radius * 0.15;
      ctx.beginPath();
      ctx.arc(enemy.x - ex, enemy.y + ey, 2.6, 0, Math.PI * 2);
      ctx.arc(enemy.x + ex, enemy.y + ey, 2.6, 0, Math.PI * 2);
      ctx.fill();
      // Slow tint.
      if (slowed) {
        ctx.fillStyle = 'rgba(56, 182, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      // HP bar.
      const frac = Math.max(0, enemy.hp / enemy.maxHp);
      const bw = enemy.radius * 2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(enemy.x - bw / 2, enemy.y - enemy.radius - 10, bw, 4);
      ctx.fillStyle = frac > 0.5 ? '#3dff8e' : frac > 0.25 ? '#ffd166' : '#ff4d6d';
      ctx.fillRect(enemy.x - bw / 2, enemy.y - enemy.radius - 10, bw * frac, 4);
      // Boss (v1.2): name, phase pips and the enrage pulse above the bar.
      drawBossMarkers(ctx, enemy, time);
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(state) {
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of state.floaters) {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawGhost(ui, state) {
    if (!ui.placing || !ui.hover) return;
    const { col, row } = ui.hover;
    const valid = ui.placingValid;
    // Preview beams, faint.
    if (ui.previewBeams && ui.previewBeams.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      ctx.lineCap = 'round';
      for (const seg of ui.previewBeams) {
        ctx.strokeStyle = COLORS[seg.color].css;
        ctx.lineWidth = seg.width;
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    // Ghost cell.
    ctx.fillStyle = valid ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 77, 109, 0.25)';
    ctx.fillRect(col * FIELD.cell + 2, row * FIELD.cell + 2, FIELD.cell - 4, FIELD.cell - 4);
    ctx.strokeStyle = valid ? '#ffffff' : '#ff4d6d';
    ctx.lineWidth = 2;
    ctx.strokeRect(col * FIELD.cell + 3, row * FIELD.cell + 3, FIELD.cell - 6, FIELD.cell - 6);
    // Ghost tower icon.
    ctx.globalAlpha = 0.75;
    drawTower({ type: ui.placing, dir: ui.placingDir, mirror: '/' }, col, row, state.time);
    ctx.globalAlpha = 1;
  }

  function drawSelection(ui, state) {
    if (!ui.selectedCell) return;
    const { col, row } = ui.selectedCell;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 5]);
    ctx.strokeRect(col * FIELD.cell + 2, row * FIELD.cell + 2, FIELD.cell - 4, FIELD.cell - 4);
    ctx.setLineDash([]);
    void state;
  }

  /** Paint the whole field. `ui` carries hover/selection/placement state. */
  function draw(world, ui) {
    const state = world.state;
    const time = state.time;
    ctx.save();
    if (state.shake > 0.3) {
      const s = state.shake;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    drawBackground(time);
    drawPath(time);
    drawCore(state, time);
    // Towers first, then beams over them so the light sits on top.
    const grid = world.grid;
    for (let r = 0; r < FIELD.rows; r += 1) {
      for (let c = 0; c < FIELD.cols; c += 1) {
        const tower = grid[r][c];
        if (tower) drawTower(tower, c, r, time);
      }
    }
    drawBeams(state, time);
    drawEnemies(state, time);
    drawParticles(state);
    drawFloaters(state);
    // Boss phase banner (v1.2): across the board while a transition is fresh.
    drawBossBanner(ctx, state);
    drawGhost(ui, state);
    drawSelection(ui, state);
    ctx.restore();
  }

  return { draw, cellXY };
}
