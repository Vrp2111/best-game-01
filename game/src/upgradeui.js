// The v1.2 DOM: the upgrade panel, the boss bar and the difficulty pick.
//
// This module owns the three pieces of interface the new systems need and
// nothing else. It never touches the world directly except through the
// helpers it is handed: main.js passes the world and the actions, and this
// module renders. Keeping the DOM here (instead of scattered through
// main.js) keeps the wiring in main.js to a few calls — and keeps every
// new line in a file this session wrote from scratch.
import { TOWERS } from './config.js';
import { bossBarData } from './boss.js';
import { DIFFICULTY_ORDER, difficultyDef } from './difficulty.js';
import { canUpgrade, levelLabel, nextUpgrade, sellValue, towerLevel } from './upgrades.js';
import { sellRate } from './rites.js';

/**
 * Render the selected-tower panel for the tower at `cell` ({ col, row }),
 * or hide the panel when there is no tower there. `actions` is
 * { rotate, sell, upgrade } — each takes (col, row) and returns true when
 * it did something; after any action main.js re-renders the panel, so a
 * buy is visible at once (level, cost and refund all move together).
 */
export function renderSelectedPanel(selectedEl, world, cell, actions) {
  if (!cell) {
    selectedEl.hidden = true;
    selectedEl.innerHTML = '';
    return;
  }
  const { col, row } = cell;
  const tower = world.towerAt(col, row);
  if (!tower) {
    selectedEl.hidden = true;
    selectedEl.innerHTML = '';
    return;
  }
  const def = TOWERS[tower.type];
  const level = towerLevel(tower);
  const refund = sellValue(tower, sellRate(world.state));
  const next = nextUpgrade(tower);
  const afford = next ? world.state.lumens >= next.cost : false;
  const extra = tower.type === 'emitter'
    ? `Faces <b>${tower.dir}</b>. Beam 40 damage/s × ${[1, 1.5, 2][level - 1]} at this level.`
    : tower.type === 'mirror'
      ? `Reflects ${tower.mirror === '/' ? 'N↔E, S↔W' : 'N↔W, S↔E'}. Beams leaving hit ×${[1, 1.25, 1.5][level - 1]}.`
      : tower.type === 'prism'
        ? `Splits one beam into red / blue / green. Split beams hit ×${[1, 1.25, 1.5][level - 1]}.`
        : `Doubles any beam passing through — ×${[2, 2.5, 3][level - 1]} at this level.`;
  const upgradeButton = next
    ? `<button type="button" id="btnUpgrade" ${afford ? '' : 'disabled'}>⬆ Upgrade to Lv ${next.level} — ◈ ${next.cost}</button>`
    : `<button type="button" disabled>★ MAX LEVEL</button>`;
  selectedEl.hidden = false;
  selectedEl.innerHTML = `<div class="row1"><span>${def.name} <span style="color:#ffd166">Lv ${level}</span></span><span class="cost" style="color:#ffd166">◈ ${def.cost}</span></div>`
    + `<div>${extra}</div>`
    + `<div style="color:#ffd166;font-size:12px">${levelLabel(tower)}</div>`
    + `<div style="color:#9aa3c7;font-size:12px">Tile ${col + 1}×${row + 1} · R rotates · sell refunds ◈ ${refund} (build + upgrades)</div>`
    + `<button type="button" id="btnRotate">⟳ Rotate (R)</button>`
    + upgradeButton
    + `<button type="button" id="btnSell">Sell +◈ ${refund}</button>`;
  const rotateBtn = selectedEl.querySelector('#btnRotate');
  if (rotateBtn) rotateBtn.addEventListener('click', () => { if (actions.rotate(col, row)) renderSelectedPanel(selectedEl, world, cell, actions); });
  const upgradeBtn = selectedEl.querySelector('#btnUpgrade');
  if (upgradeBtn) upgradeBtn.addEventListener('click', () => { if (actions.upgrade(col, row)) renderSelectedPanel(selectedEl, world, cell, actions); });
  const sellBtn = selectedEl.querySelector('#btnSell');
  if (sellBtn) sellBtn.addEventListener('click', () => { if (actions.sell(col, row)) renderSelectedPanel(selectedEl, world, null, actions); });
}

/**
 * The boss bar above the board: name, phase and a health bar. Hidden
 * while the boss has not arrived; once it has, it updates every frame
 * from the world's own boss state. Returns true while the boss is live.
 */
export function refreshBossBar(bossBarEl, state) {
  const data = bossBarData(state);
  if (!data) {
    bossBarEl.hidden = true;
    return false;
  }
  bossBarEl.hidden = false;
  const nameEl = bossBarEl.querySelector('#bossName');
  const fillEl = bossBarEl.querySelector('#bossFill');
  const phaseEl = bossBarEl.querySelector('#bossPhase');
  if (nameEl) nameEl.textContent = `${data.name} — PHASE ${['I', 'II', 'III'][data.phase - 1]}: ${data.phaseName}`;
  if (fillEl) fillEl.style.width = `${data.hpFrac * 100}%`;
  if (phaseEl) {
    phaseEl.textContent = `●`.repeat(data.phase) + `○`.repeat(3 - data.phase);
    phaseEl.style.color = data.phase > 1 ? '#ff9a3d' : '#ffe08a';
  }
  return true;
}

/**
 * Wire the three difficulty buttons on the title screen. `onPick` runs
 * with the chosen key whenever the player picks; the selected button
 * keeps its highlight so the choice is visible before START is pressed.
 * Returns a function that reads the current pick.
 */
export function bindDifficulty(containerEl, onPick) {
  let picked = 'normal';
  const buttons = [];
  for (const key of DIFFICULTY_ORDER) {
    const def = difficultyDef(key);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'diff-btn';
    btn.dataset.diff = key;
    btn.innerHTML = `<span class="diff-icon">${def.icon}</span><span class="diff-name">${def.name}</span><span class="diff-tag">${def.tagline}</span><span class="diff-desc">${def.desc}</span>`;
    btn.addEventListener('click', () => {
      picked = key;
      for (const b of buttons) b.classList.toggle('selected', b === btn);
      if (onPick) onPick(key);
    });
    containerEl.appendChild(btn);
    buttons.push(btn);
  }
  // Normal starts selected, matching the game's default.
  const normalBtn = buttons.find((b) => b.dataset.diff === 'normal');
  if (normalBtn) normalBtn.classList.add('selected');
  return () => picked;
}

/** Whether the run's selected tower can still be upgraded (panel helper). */
export function upgradeAvailable(tower) {
  return canUpgrade(tower);
}
