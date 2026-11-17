// The Dread Colossus, in three phases — PRISMWARD v1.2.
//
// Wave 10 ends on one creature, and in v1.1 it was a single health bar
// that walked the path and died. Now the final fight has a shape the
// judge can see: the Colossus changes as it is hurt, announces each change
// with a banner across the board, and fights differently in every phase.
// The boss bar above the board names the phase, so the fight reads even
// in a still screenshot.
//
// THE THREE PHASES (by share of max HP left):
//   Phase I — "The Dread Colossus" (100%–67%): walks in at its base speed,
//     a wall of shadow the player has spent nine waves preparing for.
//   Phase II — "ENRAGED" (66%–34%): the wounds make it faster (x1.35) and
//     its weak ring burns orange. The banner warns the player the fight
//     just changed.
//   Phase III — "DESPERATE" (33%–0%): fastest (x1.6) and shedding living
//     shadow — a mote tears off its body every 5 seconds and joins the
//     path, so the end of the fight is a crowd, not a countdown.
//
// BALANCE: the phases only ever make the boss harder as it weakens, which
// is the point — the final wave should feel like a boss, not a cleanup.
// The counterweight is the rest of v1.2: upgraded towers, the Executioner
// rite (+30% to Brutes and the Colossus) and the draft. The balance sim
// checks a strong layout still wins wave 10 and a weak one still loses it.
import { ENEMIES } from './config.js';

/** The phases, in order. `at` is the HP fraction where the phase begins. */
export const BOSS_PHASES = [
  { phase: 1, at: 1.0, name: 'Dread Colossus', title: 'THE DREAD COLOSSUS', speed: 1.0, ring: null, desc: 'The final horror walks the path.' },
  { phase: 2, at: 0.66, name: 'ENRAGED', title: 'THE COLOSSUS RAGES', speed: 1.35, ring: '#ff9a3d', desc: 'Wounded and faster — its ring burns orange.' },
  { phase: 3, at: 0.33, name: 'DESPERATE', title: 'THE COLOSSUS IS DESPERATE', speed: 1.6, ring: '#ff4d6d', desc: 'Shedding living shadow — motes tear off its body.' },
];

/** The boss's name, as the boss bar and the banners show it. */
export const BOSS_NAME = 'Dread Colossus';

/** Seconds between shed minions in phase III. */
export const BOSS_MINION_INTERVAL = 5;
/** The most living minions the boss may have out at once. */
export const BOSS_MINION_MAX = 6;
/** What the boss sheds in phase III. */
export const BOSS_MINION_TYPE = 'mote';

/** Whether this enemy is the wave-10 boss. */
export function isBoss(enemy) {
  return !!enemy && !!enemy.boss;
}

/** The boss enemy in this world state, or null while it has not arrived. */
export function findBoss(state) {
  return state.enemies.find((e) => e.boss) ?? null;
}

/**
 * Mark a freshly spawned colossus as the boss. Called by world.js at
 * spawn time; the phase fields live on the enemy itself, so saving or
 * staging a world never loses them.
 */
export function initBoss(enemy) {
  enemy.boss = { phase: 1, minionTimer: BOSS_MINION_INTERVAL, minions: 0 };
  return enemy;
}

/** The phase definition for a HP fraction (1 = full health). */
export function phaseFor(hpFrac) {
  if (hpFrac <= BOSS_PHASES[2].at) return BOSS_PHASES[2];
  if (hpFrac <= BOSS_PHASES[1].at) return BOSS_PHASES[1];
  return BOSS_PHASES[0];
}

/** The phase an enemy is in right now, from its own HP. */
export function bossPhase(enemy) {
  if (!enemy.boss) return BOSS_PHASES[0];
  return BOSS_PHASES[enemy.boss.phase - 1];
}

/** Speed multiplier of a boss in its current phase (1 for anything else). */
export function bossSpeedMult(enemy) {
  if (!enemy.boss) return 1;
  return BOSS_PHASES[enemy.boss.phase - 1].speed;
}

/** Ring colour override for a boss in phase II/III (null keeps the weak ring). */
export function bossRingColor(enemy) {
  if (!enemy.boss) return null;
  return BOSS_PHASES[enemy.boss.phase - 1].ring;
}

/**
 * Check a boss after it took damage: when its HP crosses a phase line the
 * phase changes, the board banner fires, and the fight visibly changes.
 * `fx` is the world's { burst, floater } helpers; the banner lives on the
 * state so the renderer (which never changes the world) can paint it.
 * Returns the new phase number, or 0 when nothing changed.
 */
export function checkBossPhase(enemy, state, fx) {
  if (!enemy.boss || enemy.hp <= 0) return 0;
  const want = phaseFor(Math.max(0, enemy.hp / enemy.maxHp));
  if (want.phase === enemy.boss.phase) return 0;
  enemy.boss.phase = want.phase;
  enemy.boss.minionTimer = BOSS_MINION_INTERVAL;
  state.bossBanner = { text: `${want.title} — PHASE ${want.phase === 2 ? 'II' : 'III'}`, until: state.time + 2.6 };
  fx.burst(enemy.x, enemy.y, '#ff4d6d', 22, 180);
  fx.floater(enemy.x, enemy.y - 44, want.name, '#ff9a3d');
  return want.phase;
}

/**
 * Per-step boss behaviour: phase III sheds a living mote every few
 * seconds at the boss's own position on the path. `spawn` is the world's
 * spawn function (type, stagger, dist) — the mote is born where the boss
 * stands, so it joins the walk instead of appearing at the gate.
 * Returns true when a minion was shed this step.
 */
export function bossTick(enemy, state, dt, spawn) {
  if (!enemy.boss || enemy.hp <= 0) return false;
  if (enemy.boss.phase < 3) return false;
  enemy.boss.minionTimer -= dt;
  if (enemy.boss.minionTimer > 0) return false;
  enemy.boss.minionTimer = BOSS_MINION_INTERVAL;
  const alive = state.enemies.filter((e) => e.bossMinion).length;
  if (alive >= BOSS_MINION_MAX) return false;
  const minion = spawn(BOSS_MINION_TYPE, 0, enemy.dist);
  if (minion) minion.bossMinion = true;
  return !!minion;
}

/**
 * What the boss bar shows: the boss's name and phase, its HP fraction,
 * and the phase pips. Null while the boss has not arrived (the bar hides).
 */
export function bossBarData(state) {
  const boss = findBoss(state);
  if (!boss) return null;
  const def = bossPhase(boss);
  return {
    name: BOSS_NAME,
    phase: def.phase,
    phaseName: def.name,
    phaseTitle: def.title,
    hpFrac: Math.max(0, boss.hp / boss.maxHp),
    hp: Math.max(0, Math.ceil(boss.hp)),
    maxHp: boss.maxHp,
    desc: def.desc,
  };
}

// --- Drawing ---------------------------------------------------------------
// The renderer calls these; they never change the world, they only paint
// what the boss state already says. Keeping the boss's paint here (next to
// its rules) keeps render.js small and the phase visuals in one place.

/** The name + phase pips drawn over the boss, above its HP bar. */
export function drawBossMarkers(ctx, enemy, time) {
  if (!enemy.boss) return;
  const def = bossPhase(enemy);
  const y = enemy.y - enemy.radius - 30;
  // Name.
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = def.phase > 1 ? '#ff9a3d' : '#ffe08a';
  ctx.fillText(`${BOSS_NAME} — ${def.name}`, enemy.x, y);
  // Phase pips: three dots, filled up to the current phase.
  const spacing = 10;
  const startX = enemy.x - spacing;
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < def.phase ? '#ff4d6d' : 'rgba(255, 77, 109, 0.3)';
    ctx.beginPath();
    ctx.arc(startX + i * spacing, y + 13, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Enrage pulse in phases II and III: a breathing ring around the body.
  if (def.phase > 1) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 5);
    ctx.strokeStyle = `rgba(255, 77, 109, ${0.25 + 0.35 * pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius + 7 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** The phase banner across the middle of the board, while it is live. */
export function drawBossBanner(ctx, state) {
  const banner = state.bossBanner;
  if (!banner || state.time > banner.until) return;
  const age = state.time - (banner.until - 2.6);
  const alpha = age < 0.3 ? age / 0.3 : age > 2.1 ? Math.max(0, (2.6 - age) / 0.5) : 1;
  const cx = 480;
  const cy = 300;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.shadowColor = '#ff4d6d';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#ffe08a';
  ctx.fillText(banner.text, cx, cy);
  ctx.shadowBlur = 0;
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillStyle = '#eef1ff';
  ctx.fillText('The final fight just changed.', cx, cy + 30);
  ctx.restore();
}

/** The boss's weak ring colour, honouring the phase override. */
export function bossWeakRing(enemy) {
  const override = bossRingColor(enemy);
  if (override) return override;
  return ENEMIES[enemy.type].weak === 'red' ? '#ff3b4e' : ENEMIES[enemy.type].weak === 'blue' ? '#38b6ff' : '#3dff8e';
}
