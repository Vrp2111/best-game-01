// Difficulty — PRISMWARD v1.2.
//
// Three ways to defend the Lantern, picked on the title screen before a
// run starts. The choice is visible (the title screen shows it, the
// results screen records it) and it changes the run in numbers the player
// can feel, not in a hidden toggle: how tough the shadows are, how fast
// they walk, how many lumens the run opens with, and how much punishment
// the Lantern can take.
//
// The default is Normal — exactly the v1.1 game, untouched. Easy is the
// on-ramp for a first run (softer shadows, a fatter purse, a sturdier
// Lantern); Hard is the run for players who already beat Normal (tougher,
// faster shadows, a thinner purse, a frailer Lantern). Nothing else in
// the game reads the difficulty: waves, rites, upgrades and the boss all
// work the same, so one balance sim covers all three — only the inputs
// change.
import { HP_SCALE_PER_WAVE, SPEED_SCALE_PER_WAVE, START_CORE_HP, START_LUMENS } from './config.js';

/** The difficulty key the game starts on when nobody has picked yet. */
export const DEFAULT_DIFFICULTY = 'normal';

/**
 * The three difficulties. Each entry:
 * - key / name / icon / tagline: what the title screen shows.
 * - hpMult: enemy HP multiplier (the wave scale applies on top).
 * - speedMult: enemy speed multiplier (the wave scale applies on top).
 * - lumens: the run's opening purse.
 * - coreHp: the Lantern's starting (and maximum) HP.
 * - desc: the one-line promise on the button.
 */
export const DIFFICULTIES = {
  easy: {
    key: 'easy', name: 'Easy', icon: '🌅', tagline: 'A gentle dawn',
    hpMult: 0.8, speedMult: 0.9, lumens: 170, coreHp: 25,
    desc: 'Softer shadows, a fatter purse, a sturdier Lantern. Learn the light.',
  },
  normal: {
    key: 'normal', name: 'Normal', icon: '🕯️', tagline: 'The intended night',
    hpMult: 1.0, speedMult: 1.0, lumens: START_LUMENS, coreHp: START_CORE_HP,
    desc: 'The game as designed — 140 lumens, 20 Lantern HP, full-strength shadows.',
  },
  hard: {
    key: 'hard', name: 'Hard', icon: '🌑', tagline: 'The long night',
    hpMult: 1.35, speedMult: 1.15, lumens: 110, coreHp: 15,
    desc: 'Tougher, faster shadows, a thinner purse, a frailer Lantern. For veterans.',
  },
};

/** The order the title screen lists the difficulties in. */
export const DIFFICULTY_ORDER = ['easy', 'normal', 'hard'];

/** The difficulty definition for a key ('normal' when the key is unknown). */
export function difficultyDef(key) {
  return DIFFICULTIES[key] ?? DIFFICULTIES[DEFAULT_DIFFICULTY];
}

/** Whether this key names a real difficulty. */
export function isDifficulty(key) {
  return Object.prototype.hasOwnProperty.call(DIFFICULTIES, key);
}

/**
 * Enemy HP scale for a run at this difficulty: the wave scale times the
 * difficulty's own multiplier. world.js multiplies the base HP by this.
 */
export function enemyHpScale(difficultyKey, wave) {
  const def = difficultyDef(difficultyKey);
  return (1 + HP_SCALE_PER_WAVE * (wave - 1)) * def.hpMult;
}

/**
 * Enemy speed scale for a run at this difficulty: the wave scale times
 * the difficulty's own multiplier.
 */
export function enemySpeedScale(difficultyKey, wave) {
  const def = difficultyDef(difficultyKey);
  return (1 + SPEED_SCALE_PER_WAVE * (wave - 1)) * def.speedMult;
}

/** The opening purse for a run at this difficulty. */
export function startLumens(difficultyKey) {
  return difficultyDef(difficultyKey).lumens;
}

/** The Lantern's starting and maximum HP for a run at this difficulty. */
export function startCoreHp(difficultyKey) {
  return difficultyDef(difficultyKey).coreHp;
}

/** One line for the results screen, so a run's difficulty is on the record. */
export function difficultyLine(difficultyKey) {
  const def = difficultyDef(difficultyKey);
  return `${def.icon} ${def.name} — ${def.tagline}`;
}
