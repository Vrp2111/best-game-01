// PRISMWARD — a light tower defense: mirrors & prisms.
//
// THE GAME IN ONE PARAGRAPH: shadows crawl out of a dark gate on the left
// and snake along a stone path toward the Lantern on the right. The player's
// only weapon is LIGHT. An Emitter fires a white beam; a Mirror bends it
// 90 degrees; a Prism splits it into three coloured beams — red straight
// (2x damage), blue left (slows shadows 50%), green right (kills heal the
// Lantern +1); a Lens doubles a beam's damage. Every shadow wears a glowing
// ring in the colour it is WEAK to (2x damage) and resists another (0.5x),
// so the game is routing the right colour to the right shadow. Lumens earned
// from kills buy more optics. Survive all 10 waves to win; if the Lantern's
// 20 HP reaches 0, the light dies.
//
// WHY IT IS DIFFERENT: most tower defences shoot projectiles from fixed
// towers. Here the towers are OPTICS — the weapon is a beam you route across
// the board, and one prism turns one beam into three different weapons. The
// colour-affinity system (weak ring vs. beam colour) makes every placement a
// small puzzle: a red beam down a column, a prism at the end of a row that
// sweeps it in blue, a lens that doubles the ray that guards the Lantern.
//
// STRUCTURE: config.js holds every number; world.js holds the rules (beams,
// enemies, waves, economy) with no drawing and no browser; render.js paints
// the field; audio.js synthesizes every sound with WebAudio; shots.js stages
// the four screenshot scenes from the real rules; this file boots the loop,
// the screens (title / play / paused / win / lose), the mouse and keyboard
// input, and the DOM HUD. The game runs offline from static files, makes no
// network request, and needs no build step.
//
// ?seed=N fixes the random stream. ?shot=title|mid|late|victory (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_GRADE_KEY, BEST_KEY, ENEMIES, FIELD, STEP, TOTAL_WAVES, TOWER_ORDER, TOWERS } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HEAL, EVENT_KILL, EVENT_LEAK, EVENT_LOSE, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { RITE_BY_ID, totalRites } from './rites.js';
import { computeResults } from './results.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

const $ = (id) => document.getElementById(id);
const ui = {
  screen: 'title', // title | play | paused | draft | win | lose
  placing: null, // tower type being placed, or null
  placingDir: 'E',
  placingMirror: '/',
  hover: null, // { col, row } under the mouse, or null
  previewBeams: [],
  placingValid: false,
  selectedCell: null, // { col, row } of a placed tower, or null
  speed: 1,
  best: 0,
  bestGrade: '',
  draft: null, // the current draft offer (array of rite defs) or null
};

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function readBestGrade() {
  try {
    return window.localStorage.getItem(BEST_GRADE_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveBestGrade(value) {
  try {
    window.localStorage.setItem(BEST_GRADE_KEY, value);
  } catch {
    // Same as saveBest: best grade is a nice-to-have, not a must.
  }
}

function bestLine() {
  if (ui.best <= 0) return '';
  return ui.bestGrade ? `Best score: ${ui.best} · Grade ${ui.bestGrade}` : `Best score: ${ui.best}`;
}

function announce(message) {
  status.textContent = message;
}

// --- Palette ---------------------------------------------------------------
const paletteEl = $('palette');
const cardEls = {};
for (const key of TOWER_ORDER) {
  const def = TOWERS[key];
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'tower-card';
  card.dataset.tower = key;
  card.innerHTML = `<span class="row1"><span><span class="key">${def.hotkey}</span>${def.name}</span><span class="cost">◈ ${def.cost}</span></span><span class="desc">${def.desc}</span>`;
  card.addEventListener('click', () => {
    audio.unlock();
    selectPlacing(ui.placing === key ? null : key);
    audio.select();
  });
  paletteEl.appendChild(card);
  cardEls[key] = card;
}

function selectPlacing(type) {
  ui.placing = type;
  ui.placingDir = 'E';
  ui.placingMirror = '/';
  ui.selectedCell = null;
  for (const key of TOWER_ORDER) cardEls[key].classList.toggle('selected', key === type);
  refreshSelectedPanel();
  updatePreview();
}

// --- Selected tower panel --------------------------------------------------
const selectedEl = $('selected');
function refreshSelectedPanel() {
  if (!ui.selectedCell) {
    selectedEl.hidden = true;
    selectedEl.innerHTML = '';
    return;
  }
  const { col, row } = ui.selectedCell;
  const tower = world.towerAt(col, row);
  if (!tower) {
    ui.selectedCell = null;
    selectedEl.hidden = true;
    return;
  }
  const def = TOWERS[tower.type];
  const refund = Math.floor(def.cost * 0.7);
  const extra = tower.type === 'emitter' ? `Faces <b>${tower.dir}</b>. Beam 40 damage/s.`
    : tower.type === 'mirror' ? `Reflects ${tower.mirror === '/' ? 'N↔E, S↔W' : 'N↔W, S↔E'}.`
    : tower.type === 'prism' ? 'Splits one beam into red / blue / green.'
    : 'Doubles any beam passing through.';
  selectedEl.hidden = false;
  selectedEl.innerHTML = `<div class="row1"><span>${def.name}</span><span class="cost" style="color:#ffd166">◈ ${def.cost}</span></div>`
    + `<div>${extra}</div>`
    + `<div style="color:#9aa3c7;font-size:12px">Tile ${col + 1}×${row + 1} · R rotates · sell refunds ◈ ${refund}</div>`
    + `<button type="button" id="btnRotate">⟳ Rotate (R)</button><button type="button" id="btnSell">Sell +◈ ${refund}</button>`;
  $('btnRotate').addEventListener('click', () => {
    if (world.rotateTower(col, row)) { audio.rotate(); refreshSelectedPanel(); }
  });
  $('btnSell').addEventListener('click', () => {
    if (world.removeTower(col, row)) {
      audio.sell();
      ui.selectedCell = null;
      refreshSelectedPanel();
    }
  });
}

// --- HUD -------------------------------------------------------------------
const hudCache = {};
function setText(id, value) {
  if (hudCache[id] !== value) {
    hudCache[id] = value;
    $(id).textContent = value;
  }
}
function updateHUD() {
  const s = world.state;
  setText('statWave', `${Math.min(s.wave, TOTAL_WAVES)} / ${TOTAL_WAVES}`);
  setText('statLumens', `◈ ${s.lumens}`);
  setText('coreText', `${s.coreHp} / ${s.maxHp}`);
  $('coreFill').style.width = `${(s.coreHp / s.maxHp) * 100}%`;
  setText('statScore', String(s.score));
  const shadows = s.enemies.length + (s.waveActive ? s.spawnLeft : 0);
  setText('statEnemies', String(shadows));
  // Prism Rites taken this run (cached: only rebuilt when the count changes).
  const ritesTaken = totalRites(s);
  if (hudCache.rites !== ritesTaken) {
    hudCache.rites = ritesTaken;
    refreshRitesList();
  }
  // Wave button.
  const btn = $('btnWave');
  if (s.over) {
    btn.disabled = true;
    btn.textContent = '—';
  } else if (s.waveActive) {
    btn.disabled = true;
    btn.textContent = `Wave ${s.wave} running…`;
  } else {
    btn.disabled = false;
    btn.textContent = `▶ Start Wave ${s.wave}`;
  }
  // Palette affordability.
  for (const key of TOWER_ORDER) {
    cardEls[key].classList.toggle('cant', s.lumens < TOWERS[key].cost);
  }
  // Next-wave preview.
  const preview = world.wavePreview(Math.min(s.wave, TOTAL_WAVES));
  const parts = preview.map(({ type, count }) => `${count}× ${ENEMIES[type].name}`);
  const nextEl = $('nextWave');
  const nextText = s.wave > TOTAL_WAVES ? 'All waves cleared.'
    : s.waveActive ? `Wave ${s.wave} in progress — ${s.spawnLeft + s.enemies.length} shadows left.`
    : `Wave ${s.wave}: ${parts.join(', ')}.`;
  if (hudCache.nextWave !== nextText) {
    hudCache.nextWave = nextText;
    nextEl.textContent = nextText;
  }
  $('btnSpeed').textContent = `${ui.speed}×`;
  $('btnMute').textContent = audio.isMuted() ? '🔇 Muted' : '🔊 Sound';
  $('btnPause').textContent = ui.screen === 'paused' ? '▶ Resume' : '⏸ Pause';
}

// --- Placement preview -----------------------------------------------------
function updatePreview() {
  if (!ui.placing || !ui.hover) {
    ui.previewBeams = [];
    ui.placingValid = false;
    return;
  }
  const { col, row } = ui.hover;
  ui.placingValid = world.canPlace(col, row) && world.state.lumens >= TOWERS[ui.placing].cost;
  ui.previewBeams = world.previewBeam(col, row, ui.placing, ui.placingDir);
}

// --- Canvas input ----------------------------------------------------------
function canvasCell(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (FIELD.width / rect.width);
  const y = (event.clientY - rect.top) * (FIELD.height / rect.height);
  const col = Math.floor(x / FIELD.cell);
  const row = Math.floor(y / FIELD.cell);
  if (col < 0 || col >= FIELD.cols || row < 0 || row >= FIELD.rows) return null;
  return { col, row };
}

canvas.addEventListener('mousemove', (event) => {
  ui.hover = canvasCell(event);
  updatePreview();
});
canvas.addEventListener('mouseleave', () => {
  ui.hover = null;
  ui.previewBeams = [];
});
canvas.addEventListener('click', (event) => {
  audio.unlock();
  if (ui.screen !== 'play') return;
  const cell = canvasCell(event);
  if (!cell) return;
  if (ui.placing) {
    const tower = world.towerAt(cell.col, cell.row);
    if (tower) {
      // Clicking a placed tower while placing selects it instead.
      selectPlacing(null);
      ui.selectedCell = cell;
      refreshSelectedPanel();
      audio.select();
      return;
    }
    if (world.placeTower(cell.col, cell.row, ui.placing, ui.placingDir)) {
      audio.place();
      // A mirror keeps its orientation for the next placement.
      updatePreview();
      refreshSelectedPanel();
    } else {
      audio.error();
    }
    return;
  }
  const tower = world.towerAt(cell.col, cell.row);
  if (tower) {
    ui.selectedCell = cell;
    refreshSelectedPanel();
    audio.select();
  } else {
    ui.selectedCell = null;
    refreshSelectedPanel();
  }
});
canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  if (ui.screen !== 'play') return;
  if (ui.placing) {
    rotatePlacing();
    return;
  }
  if (ui.selectedCell && world.rotateTower(ui.selectedCell.col, ui.selectedCell.row)) {
    audio.rotate();
    refreshSelectedPanel();
  }
});

function rotatePlacing() {
  if (!ui.placing) return;
  if (ui.placing === 'emitter') {
    const order = ['E', 'S', 'W', 'N'];
    ui.placingDir = order[(order.indexOf(ui.placingDir) + 1) % order.length];
  } else if (ui.placing === 'mirror') {
    ui.placingMirror = ui.placingMirror === '/' ? '\\' : '/';
  } else {
    return;
  }
  audio.rotate();
  updatePreview();
}

// --- Prism Rites draft -----------------------------------------------------
// After a wave clears, the game pauses on the draft screen: three permanent
// blessings, pick one (click or keys 1/2/3). The pick lasts the whole run
// and is listed in the sidebar, so every run grows a different build.
function refreshRitesList() {
  const el = $('ritesList');
  const entries = Object.entries(world.state.rites).filter(([, n]) => n > 0);
  if (entries.length === 0) {
    el.textContent = 'No rites yet — clear a wave to draft one.';
    return;
  }
  el.innerHTML = entries.map(([id, n]) => {
    const rite = RITE_BY_ID[id];
    return `<div>${rite.icon} ${rite.name}${n > 1 ? ` ×${n}` : ''}</div>`;
  }).join('');
}

function openDraft(offer) {
  ui.draft = offer;
  ui.screen = 'draft';
  $('draftWave').textContent = `Wave ${Math.min(world.state.wave - 1, TOTAL_WAVES)} clear — choose one blessing. It lasts the whole run.`;
  offer.forEach((rite, i) => {
    const card = $(`rite${i}`);
    card.innerHTML = `<span class="rite-icon">${rite.icon}</span><span class="rite-name">${rite.name}</span><span class="rite-desc">${rite.desc}</span><span class="rite-key">Press ${i + 1}</span>`;
  });
  showOverlay('draftOverlay');
  announce('Draft: choose one Prism Rite.');
}

function pickRite(index) {
  if (ui.screen !== 'draft' || !ui.draft || !ui.draft[index]) return;
  const rite = ui.draft[index];
  world.applyRite(rite.id);
  audio.select();
  ui.draft = null;
  ui.screen = 'play';
  showOverlay(null);
  refreshRitesList();
  announce(`${rite.name} taken.`);
}

// --- Keyboard --------------------------------------------------------------
window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  const code = event.code;
  if (code === 'Space' || code === 'Enter') {
    event.preventDefault();
    audio.unlock();
    if (ui.screen === 'title') startGame();
    else if (ui.screen === 'win' || ui.screen === 'lose') startGame();
    else if (ui.screen === 'play') startWave();
    else if (ui.screen === 'paused') togglePause();
    return;
  }
  if (code === 'KeyP') {
    if (ui.screen === 'play' || ui.screen === 'paused') togglePause();
    return;
  }
  if (code === 'Escape') {
    if (ui.placing) selectPlacing(null);
    else if (ui.selectedCell) { ui.selectedCell = null; refreshSelectedPanel(); }
    else if (ui.screen === 'play' || ui.screen === 'paused') togglePause();
    return;
  }
  if (ui.screen === 'draft') {
    const pick = { Digit1: 0, Digit2: 1, Digit3: 2 }[code];
    if (pick !== undefined) {
      event.preventDefault();
      pickRite(pick);
    }
    return;
  }
  if (ui.screen !== 'play') return;
  if (code === 'KeyR') {
    if (ui.placing) rotatePlacing();
    else if (ui.selectedCell && world.rotateTower(ui.selectedCell.col, ui.selectedCell.row)) {
      audio.rotate();
      refreshSelectedPanel();
    }
    return;
  }
  const hotkey = { Digit1: 'emitter', Digit2: 'mirror', Digit3: 'prism', Digit4: 'lens' }[code];
  if (hotkey) {
    audio.unlock();
    selectPlacing(ui.placing === hotkey ? null : hotkey);
    audio.select();
  }
});

// --- Screens ---------------------------------------------------------------
function showOverlay(id) {
  for (const overlay of ['titleOverlay', 'winOverlay', 'loseOverlay', 'pauseOverlay', 'draftOverlay']) {
    $(overlay).hidden = overlay !== id;
  }
}

function startGame() {
  audio.unlock();
  world.reset();
  world.setAttract(false);
  ui.screen = 'play';
  ui.placing = null;
  ui.selectedCell = null;
  ui.draft = null;
  ui.speed = 1;
  selectPlacing(null);
  refreshRitesList();
  showOverlay(null);
  announce('Playing. Defend the Lantern. Place towers, then start wave 1.');
}

function startWave() {
  if (ui.screen !== 'play') return;
  if (world.startWave()) {
    audio.waveStart();
    selectPlacing(null);
    announce(`Wave ${world.state.wave} started.`);
  }
}

function togglePause() {
  if (ui.screen === 'play') {
    ui.screen = 'paused';
    showOverlay('pauseOverlay');
    announce('Paused.');
  } else if (ui.screen === 'paused') {
    ui.screen = 'play';
    showOverlay(null);
    announce('Playing.');
  }
}

function endGame(won) {
  const s = world.state;
  ui.screen = won ? 'win' : 'lose';
  const results = computeResults(s, ui.best > 0 ? { score: ui.best, grade: ui.bestGrade } : null);
  if (results.isBest) {
    ui.best = s.score;
    ui.bestGrade = results.grade.letter;
    saveBest(ui.best);
    saveBestGrade(ui.bestGrade);
  }
  fillResults(won ? 'win' : 'lose', results);
  showOverlay(won ? 'winOverlay' : 'loseOverlay');
  if (won) {
    audio.victory();
    announce(`Victory. Grade ${results.grade.letter}. ${results.grade.reason}`);
  } else {
    audio.defeat();
    announce(`Defeat. Grade ${results.grade.letter}. ${results.grade.reason}`);
  }
}

/** Fill a win/lose panel with the full report card (R3). */
function fillResults(prefix, results) {
  $(`${prefix}Grade`).textContent = results.grade.letter;
  $(`${prefix}GradeReason`).textContent = results.grade.reason;
  $(`${prefix}Stats`).innerHTML = results.stats
    .map(({ label, value }) => `<div class="stat-cell"><span>${label}</span><b>${value}</b></div>`)
    .join('');
  $(`${prefix}Rites`).innerHTML = results.ritesTaken.length === 0
    ? 'No rites drafted this run.'
    : results.ritesTaken
      .map(({ icon, name, count }) => `<span class="rite-chip">${icon} ${name}${count > 1 ? ` ×${count}` : ''}</span>`)
      .join('');
  $(`${prefix}Goal`).textContent = `Next goal: ${results.nextGoal}`;
  $(`${prefix}Best`).textContent = bestLine();
}

$('btnStart').addEventListener('click', startGame);
$('btnWinAgain').addEventListener('click', startGame);
$('btnLoseAgain').addEventListener('click', startGame);
$('btnResume').addEventListener('click', togglePause);
for (let i = 0; i < 3; i += 1) {
  $(`rite${i}`).addEventListener('click', () => pickRite(i));
}
$('btnWave').addEventListener('click', startWave);
$('btnPause').addEventListener('click', () => {
  if (ui.screen === 'play' || ui.screen === 'paused') togglePause();
});
$('btnSpeed').addEventListener('click', () => {
  ui.speed = ui.speed === 1 ? 2 : 1;
  audio.select();
});
$('btnMute').addEventListener('click', () => {
  audio.unlock();
  audio.setMuted(!audio.isMuted());
});
$('btnRestart').addEventListener('click', startGame);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && ui.screen === 'play') togglePause();
});

// --- Main loop -------------------------------------------------------------
function handleEvents(events) {
  if (events & EVENT_KILL) audio.death();
  if (events & EVENT_LEAK) audio.leak();
  if (events & EVENT_HEAL) audio.heal();
  if (events & EVENT_WIN) endGame(true);
  else if (events & EVENT_LOSE) endGame(false);
  else if (events & EVENT_WAVE_CLEAR) {
    audio.waveClear();
    announce(`Wave ${world.state.wave - 1} clear.`);
    // The draft (R1): pause on the Prism Rites screen before the next wave.
    openDraft(world.drawOffer());
  }
}

function runGame() {
  ui.best = readBest();
  ui.bestGrade = readBestGrade();
  $('titleBest').textContent = bestLine();
  world.setAttract(true);
  showOverlay('titleOverlay');
  announce('PRISMWARD. Press Space or click Start to play.');
  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const stepping = ui.screen === 'title' || ui.screen === 'play';
    if (stepping) {
      const speed = ui.screen === 'title' ? 1 : ui.speed;
      while (accumulator >= STEP) {
        for (let s = 0; s < speed; s += 1) {
          const events = world.step(STEP);
          if (ui.screen === 'play') handleEvents(events);
          if (world.state.over) break;
        }
        accumulator -= STEP;
        if (world.state.over) break;
      }
      if (ui.screen === 'title') accumulator = 0;
    } else {
      accumulator = 0;
    }
    renderer.draw(world, ui);
    audio.setBeamLevel(world.state.beams.length);
    updateHUD();
  }
  requestAnimationFrame(frame);
}

// --- Screenshot staging ----------------------------------------------------
function runShot(name) {
  const staged = stageShot(name, world);
  ui.screen = staged.screen;
  if (staged.screen === 'title') {
    showOverlay('titleOverlay');
  } else if (staged.screen === 'win') {
    fillResults('win', computeResults(world.state, null));
    showOverlay('winOverlay');
  } else if (staged.screen === 'draft') {
    openDraft(staged.offer);
  } else {
    showOverlay(null);
  }
  let painted = 0;
  function paint() {
    renderer.draw(world, ui);
    updateHUD();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

// --- Debug hook (used by the screenshot and playtest scripts) --------------
window.__prismward = {
  world,
  version: '1.1.0',
  get state() { return world.state; },
  get screen() { return ui.screen; },
  get draft() { return ui.draft; },
  start: startGame,
  startWave,
  pickRite,
  openDraft: () => { if (ui.screen === 'play') openDraft(world.drawOffer()); },
  place: (type, col, row, dir = 'E') => world.placeTowerFree(col, row, type, dir),
  setLumens: (n) => world.debugSetup({ lumens: n }),
  setWave: (n) => world.debugSetup({ wave: n }),
  win: () => { world.forceWin(); endGame(true); },
  lose: () => { world.forceLose(); endGame(false); },
};

if (shot) runShot(shot);
else runGame();
