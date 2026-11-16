// PRISMWARD's rules and state, with no drawing and no browser in it: the grid,
// the towers, the light beams, the shadow creatures, the waves and the
// economy. step() advances one fixed step and returns what happened as flags,
// so the caller can react (sounds, announcements) without the world knowing
// about screens or sound. Nothing here allocates after createWorld returns
// except short-lived beam lists, which are rebuilt every step anyway.
//
// THE ONE MECHANIC: an Emitter fires a white beam. A Mirror turns it 90
// degrees. A Prism splits it into three coloured beams — red straight (2x
// damage), blue left (slows), green right (kills heal the Lantern +1). A Lens
// doubles a beam's damage. Every shadow creature is WEAK to one colour (2x
// damage, shown as its glowing ring) and RESISTS another (0.5x). Winning is
// routing light so the right colour meets the right creature.
import {
  BEAM_BASE_DPS, COLORS, CORE_CELL, DIR, DIR_ORDER, FIELD, GREEN_HEAL_ON_KILL,
  HP_SCALE_PER_WAVE, LENS_MULTIPLIER, MAX_BEAM_SEGMENTS, MAX_BEAMS, MAX_CORE_HP,
  MIRROR_REFLECT, PATH, PRISM_SPLIT, SELL_REFUND, SLOW_DURATION, SLOW_FACTOR,
  SPEED_SCALE_PER_WAVE, START_CORE_HP, START_LUMENS, TOTAL_WAVES, TOWERS,
  TURN, WAVES, WAVE_CLEAR_BONUS, ENEMIES, SPAWN_CELL,
} from './config.js';

export const EVENT_KILL = 1;
export const EVENT_LEAK = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_WIN = 8;
export const EVENT_LOSE = 16;
export const EVENT_HEAL = 32;

const PATH_SET = new Set(PATH.map(([c, r]) => `${c},${r}`));
const PATH_POINTS = PATH.map(([c, r]) => ({ x: (c + 0.5) * FIELD.cell, y: (r + 0.5) * FIELD.cell }));
const PATH_LENGTHS = [];
let PATH_TOTAL = 0;
for (let i = 0; i < PATH_POINTS.length - 1; i += 1) {
  const dx = PATH_POINTS[i + 1].x - PATH_POINTS[i].x;
  const dy = PATH_POINTS[i + 1].y - PATH_POINTS[i].y;
  const len = Math.hypot(dx, dy);
  PATH_LENGTHS.push(len);
  PATH_TOTAL += len;
}

function cellCenter(col, row) {
  return { x: (col + 0.5) * FIELD.cell, y: (row + 0.5) * FIELD.cell };
}

function pointOnPath(dist) {
  let d = dist;
  for (let i = 0; i < PATH_LENGTHS.length; i += 1) {
    if (d <= PATH_LENGTHS[i]) {
      const t = PATH_LENGTHS[i] === 0 ? 0 : d / PATH_LENGTHS[i];
      return {
        x: PATH_POINTS[i].x + (PATH_POINTS[i + 1].x - PATH_POINTS[i].x) * t,
        y: PATH_POINTS[i].y + (PATH_POINTS[i + 1].y - PATH_POINTS[i].y) * t,
      };
    }
    d -= PATH_LENGTHS[i];
  }
  return { x: PATH_POINTS[PATH_POINTS.length - 1].x, y: PATH_POINTS[PATH_POINTS.length - 1].y };
}

function distPointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + dx * t;
  const cy = y1 + dy * t;
  return Math.hypot(px - cx, py - cy);
}

export function isPathCell(col, row) {
  return PATH_SET.has(`${col},${row}`);
}
export function isCoreCell(col, row) {
  return col === CORE_CELL.col && row === CORE_CELL.row;
}

export function createWorld(random) {
  const state = {
    lumens: START_LUMENS,
    score: 0,
    coreHp: START_CORE_HP,
    wave: 1,
    waveActive: false,
    kills: 0,
    leaked: 0,
    time: 0,
    shake: 0,
    enemies: [],
    particles: [],
    floaters: [],
    beams: [],
    spawnQueue: [],
    spawnTimer: 0,
    spawnTotal: 0,
    spawnLeft: 0,
    attract: false,
    attractTimer: 0,
    over: false,
    won: false,
  };
  // grid[row][col] = null or { type, dir, mirror }
  let grid = [];

  function resetGrid() {
    grid = [];
    for (let r = 0; r < FIELD.rows; r += 1) {
      grid.push(new Array(FIELD.cols).fill(null));
    }
  }

  function reset() {
    resetGrid();
    state.lumens = START_LUMENS;
    state.score = 0;
    state.coreHp = START_CORE_HP;
    state.wave = 1;
    state.waveActive = false;
    state.kills = 0;
    state.leaked = 0;
    state.time = 0;
    state.shake = 0;
    state.enemies = [];
    state.particles = [];
    state.floaters = [];
    state.beams = [];
    state.spawnQueue = [];
    state.spawnTimer = 0;
    state.spawnTotal = 0;
    state.spawnLeft = 0;
    state.attract = false;
    state.attractTimer = 0;
    state.over = false;
    state.won = false;
  }

  function inBounds(col, row) {
    return col >= 0 && col < FIELD.cols && row >= 0 && row < FIELD.rows;
  }

  function towerAt(col, row) {
    return inBounds(col, row) ? grid[row][col] : null;
  }

  function canPlace(col, row) {
    return inBounds(col, row) && !isPathCell(col, row) && !isCoreCell(col, row) && !grid[row][col];
  }

  function placeTower(col, row, type, dir = 'E') {
    const def = TOWERS[type];
    if (!def || !canPlace(col, row) || state.lumens < def.cost) return false;
    state.lumens -= def.cost;
    grid[row][col] = { type, dir, mirror: '/' };
    return true;
  }

  function removeTower(col, row) {
    const tower = towerAt(col, row);
    if (!tower) return false;
    state.lumens += Math.floor(TOWERS[tower.type].cost * SELL_REFUND);
    grid[row][col] = null;
    return true;
  }

  function rotateTower(col, row) {
    const tower = towerAt(col, row);
    if (!tower) return false;
    if (tower.type === 'emitter') {
      const idx = DIR_ORDER.indexOf(tower.dir);
      tower.dir = DIR_ORDER[(idx + 1) % DIR_ORDER.length];
    } else if (tower.type === 'mirror') {
      tower.mirror = tower.mirror === '/' ? '\\' : '/';
    } else {
      return false;
    }
    return true;
  }

  function burst(x, y, color, count, speed = 120) {
    for (let i = 0; i < count; i += 1) {
      const a = random() * Math.PI * 2;
      const v = speed * (0.4 + random() * 0.8);
      state.particles.push({
        x, y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0.45 + random() * 0.4, maxLife: 0.85,
        color, size: 2 + random() * 3.5,
      });
    }
  }

  function floater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, life: 1.1 });
  }

  // --- Beams ---------------------------------------------------------------
  // A beam is traced cell by cell from its origin. It ends at the board edge,
  // when it is absorbed by an emitter, or when it revisits a cell in the same
  // direction (a loop). Mirrors turn it, prisms split it into three coloured
  // beams, lenses double its damage. Returns the beam's segments.
  function traceBeam(queue, origin, dir, color, dps, width, beams) {
    let { x, y } = origin;
    let col = Math.floor(x / FIELD.cell);
    let row = Math.floor(y / FIELD.cell);
    let d = dir;
    let c = color;
    let damage = dps;
    let w = width;
    let segStart = { x, y };
    const visited = new Set();
    let segments = 0;
    for (;;) {
      if (segments >= MAX_BEAM_SEGMENTS) break;
      const key = `${col},${row},${d}`;
      if (visited.has(key)) break;
      visited.add(key);
      const step = DIR[d];
      const nc = col + step.dx;
      const nr = row + step.dy;
      if (!inBounds(nc, nr)) {
        // Out of the board: the beam dies at the edge.
        const edge = { x: d === 'E' ? FIELD.width : d === 'W' ? 0 : x, y: d === 'S' ? FIELD.height : d === 'N' ? 0 : y };
        beams.push({ x1: segStart.x, y1: segStart.y, x2: edge.x, y2: edge.y, color: c, dps: damage, width: w });
        segments += 1;
        break;
      }
      const tower = grid[nr][nc];
      const centre = cellCenter(nc, nr);
      if (!tower || isCoreCell(nc, nr)) {
        col = nc;
        row = nr;
        x = centre.x;
        y = centre.y;
        continue;
      }
      // The beam reaches a tower: flush the segment up to its centre.
      beams.push({ x1: segStart.x, y1: segStart.y, x2: centre.x, y2: centre.y, color: c, dps: damage, width: w });
      segments += 1;
      if (tower.type === 'mirror') {
        d = MIRROR_REFLECT[tower.mirror][d];
        col = nc;
        row = nr;
        x = centre.x;
        y = centre.y;
        segStart = { x, y };
        continue;
      }
      if (tower.type === 'lens') {
        damage *= LENS_MULTIPLIER;
        w *= 0.6;
        col = nc;
        row = nr;
        x = centre.x;
        y = centre.y;
        segStart = { x, y };
        continue;
      }
      if (tower.type === 'prism') {
        // Split: red goes straight, blue turns left, green turns right.
        queue.push({ origin: centre, dir: d, color: PRISM_SPLIT.straight, dps: damage, width: w });
        queue.push({ origin: centre, dir: TURN[d].left, color: PRISM_SPLIT.left, dps: damage, width: w });
        queue.push({ origin: centre, dir: TURN[d].right, color: PRISM_SPLIT.right, dps: damage, width: w });
        break;
      }
      // Any other tower (an emitter) absorbs the beam.
      break;
    }
  }

  function computeBeams() {
    const beams = [];
    const queue = [];
    for (let r = 0; r < FIELD.rows; r += 1) {
      for (let c = 0; c < FIELD.cols; c += 1) {
        const tower = grid[r][c];
        if (tower && tower.type === 'emitter') {
          queue.push({ origin: cellCenter(c, r), dir: tower.dir, color: 'white', dps: BEAM_BASE_DPS, width: 10 });
        }
      }
    }
    while (queue.length > 0 && beams.length < MAX_BEAMS) {
      const beam = queue.shift();
      traceBeam(queue, beam.origin, beam.dir, beam.color, beam.dps, beam.width, beams);
    }
    state.beams = beams;
    return beams;
  }

  /** The segments all live beams would take with a tower placed here (for the
   *  placement ghost): the tower is placed temporarily, the beams recomputed,
   *  and the board restored. */
  function previewBeam(col, row, type, dir = 'E') {
    if (!canPlace(col, row)) return [];
    grid[row][col] = { type, dir, mirror: '/' };
    const beams = computeBeams();
    grid[row][col] = null;
    state.beams = computeBeams();
    return beams;
  }

  // --- Enemies -------------------------------------------------------------
  function spawnEnemy(type) {
    const def = ENEMIES[type];
    const hpScale = 1 + HP_SCALE_PER_WAVE * (state.wave - 1);
    const speedScale = 1 + SPEED_SCALE_PER_WAVE * (state.wave - 1);
    const pos = pointOnPath(0);
    state.enemies.push({
      type, def,
      hp: Math.round(def.hp * hpScale),
      maxHp: Math.round(def.hp * hpScale),
      speed: def.speed * speedScale,
      radius: def.radius,
      dist: 0,
      x: pos.x, y: pos.y,
      slowUntil: 0,
      greenHit: false,
      wobble: random() * Math.PI * 2,
    });
  }

  function buildSpawnQueue(wave) {
    const queue = [];
    let t = 0.5;
    for (const group of WAVES[wave - 1]) {
      for (let i = 0; i < group.count; i += 1) {
        queue.push({ type: group.type, at: t });
        t += group.gap;
      }
      t += 0.8;
    }
    return queue;
  }

  function startWave() {
    if (state.waveActive || state.over || state.wave > TOTAL_WAVES) return false;
    state.spawnQueue = buildSpawnQueue(state.wave);
    state.spawnTotal = state.spawnQueue.length;
    state.spawnLeft = state.spawnQueue.length;
    state.spawnTimer = 0;
    state.waveActive = true;
    return true;
  }

  function wavePreview(wave) {
    if (wave < 1 || wave > TOTAL_WAVES) return [];
    const counts = {};
    for (const group of WAVES[wave - 1]) counts[group.type] = (counts[group.type] || 0) + group.count;
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }

  // --- Step ----------------------------------------------------------------
  function step(dt) {
    if (state.over) return 0;
    state.time += dt;
    let events = 0;
    state.shake = Math.max(0, state.shake - dt * 22);

    // Attract mode (title screen): a demo board with wandering shadows.
    if (state.attract) {
      state.attractTimer -= dt;
      if (state.attractTimer <= 0) {
        state.attractTimer = 1.1;
        const types = ['mote', 'imp', 'wisp', 'sprout'];
        spawnEnemy(types[Math.floor(random() * types.length)]);
      }
    } else if (state.waveActive) {
      state.spawnTimer += dt;
      while (state.spawnQueue.length > 0 && state.spawnQueue[0].at <= state.spawnTimer) {
        spawnEnemy(state.spawnQueue.shift().type);
        state.spawnLeft -= 1;
      }
    }

    computeBeams();

    // Move enemies along the path.
    for (const enemy of state.enemies) {
      const slowed = state.time < enemy.slowUntil;
      const speed = enemy.speed * (slowed ? SLOW_FACTOR : 1);
      enemy.dist += speed * dt;
      const pos = pointOnPath(enemy.dist);
      enemy.x = pos.x;
      enemy.y = pos.y + Math.sin(state.time * 6 + enemy.wobble) * 2;
    }

    // Beam damage: every segment against every enemy.
    for (const seg of state.beams) {
      const halfW = seg.width / 2;
      const colour = COLORS[seg.color];
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        const d = distPointToSegment(enemy.x, enemy.y, seg.x1, seg.y1, seg.x2, seg.y2);
        if (d > halfW + enemy.radius) continue;
        let mult = 1;
        if (seg.color === enemy.def.weak) mult = 2;
        else if (seg.color === enemy.def.resist) mult = 0.5;
        enemy.hp -= seg.dps * colour.damage * mult * dt;
        if (seg.color === 'blue' && state.time >= enemy.slowUntil) enemy.slowUntil = state.time + SLOW_DURATION;
        if (seg.color === 'green') enemy.greenHit = true;
      }
    }

    // Deaths: rewards, particles, green heals.
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      if (enemy.hp > 0) continue;
      state.enemies.splice(i, 1);
      state.kills += 1;
      state.lumens += enemy.def.reward;
      state.score += enemy.def.reward * 10;
      burst(enemy.x, enemy.y, COLORS[enemy.def.weak].css, 14, 130);
      burst(enemy.x, enemy.y, '#ffffff', 5, 80);
      floater(enemy.x, enemy.y - 18, `+${enemy.def.reward}`, '#ffd166');
      events |= EVENT_KILL;
      if (enemy.greenHit && state.coreHp < MAX_CORE_HP) {
        state.coreHp = Math.min(MAX_CORE_HP, state.coreHp + GREEN_HEAL_ON_KILL);
        const core = cellCenter(CORE_CELL.col, CORE_CELL.row);
        burst(core.x, core.y, COLORS.green.css, 8, 70);
        floater(core.x, core.y - 30, '+1', COLORS.green.css);
        events |= EVENT_HEAL;
      }
    }

    // Leaks: enemies that reach the Lantern.
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      if (enemy.dist < PATH_TOTAL) continue;
      state.enemies.splice(i, 1);
      if (state.attract) continue; // the title demo never hurts the Lantern
      state.leaked += 1;
      state.coreHp -= enemy.def.leak;
      const core = cellCenter(CORE_CELL.col, CORE_CELL.row);
      burst(core.x, core.y, '#ff4d6d', 16, 150);
      floater(core.x, core.y - 30, `-${enemy.def.leak}`, '#ff4d6d');
      state.shake = 9;
      events |= EVENT_LEAK;
      if (state.coreHp <= 0) {
        state.coreHp = 0;
        state.over = true;
        state.won = false;
        events |= EVENT_LOSE;
        return events;
      }
    }

    // Wave clear.
    if (!state.attract && state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0) {
      state.waveActive = false;
      const bonus = WAVE_CLEAR_BONUS(state.wave);
      state.lumens += bonus;
      state.score += 100 * state.wave;
      floater(FIELD.width / 2, FIELD.height / 2 - 40, `WAVE ${state.wave} CLEAR  +${bonus}`, '#ffd166');
      events |= EVENT_WAVE_CLEAR;
      if (state.wave >= TOTAL_WAVES) {
        state.over = true;
        state.won = true;
        events |= EVENT_WIN;
        return events;
      }
      state.wave += 1;
    }

    // Particles and floaters.
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) { state.particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
    for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
      const f = state.floaters[i];
      f.life -= dt;
      f.y -= 28 * dt;
      if (f.life <= 0) state.floaters.splice(i, 1);
    }
    return events;
  }

  function setAttract(on) {
    state.attract = on;
    if (on) {
      // A demo board: an emitter, a mirror and a prism already routing light.
      reset();
      state.attract = true;
      placeTowerFree(3, 0, 'emitter', 'S');
      placeTowerFree(3, 2, 'mirror', 'E');
      placeTowerFree(5, 2, 'prism', 'E');
      placeTowerFree(8, 4, 'emitter', 'W');
      placeTowerFree(8, 6, 'mirror', 'E');
      state.lumens = START_LUMENS;
    }
  }

  function placeTowerFree(col, row, type, dir = 'E') {
    if (!canPlace(col, row)) return false;
    grid[row][col] = { type, dir, mirror: '/' };
    return true;
  }

  function debugSetup({ lumens = null, wave = null } = {}) {
    if (lumens !== null) state.lumens = lumens;
    if (wave !== null && wave >= 1 && wave <= TOTAL_WAVES) state.wave = wave;
  }

  function forceWin() {
    state.over = true;
    state.won = true;
    state.waveActive = false;
    state.enemies = [];
  }

  function forceLose() {
    state.coreHp = 0;
    state.over = true;
    state.won = false;
  }

  reset();
  return {
    state,
    get grid() { return grid; },
    reset, step, startWave, wavePreview,
    placeTower, removeTower, rotateTower, canPlace, towerAt,
    computeBeams, previewBeam, setAttract, debugSetup, forceWin, forceLose,
    placeTowerFree,
  };
}
