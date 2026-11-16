// Prism Rites — the draft between waves.
//
// After every wave the player clears (waves 1-9), the game pauses and offers
// a choice of three permanent blessings. The player picks ONE; it lasts the
// whole run and is listed in the sidebar, so every run grows a different
// build. This is the game's second system on top of the beam routing: the
// choice that matters between rounds.
//
// BALANCE: every rite is a straight, visible bonus — no downside picks, no
// trap cards — but none of them wins the game alone. A run that drafts well
// clears waves with more Lantern HP left; a run that drafts badly (or never
// drafts, in the old build) still has to win on routing alone. The numbers
// were tuned against the balance sim in tools/bg01/sim.mjs: a strong layout
// wins with or without rites, a weak layout still loses even with rites.
import { TOWERS } from './config.js';

/**
 * The rite pool. Each entry:
 * - id: the key stored in world.state.rites (id -> times taken).
 * - icon / name / desc: what the draft card shows.
 * - once: if true, the rite is never offered again once taken (Lantern's
 *   Grace is a one-time save, so a second copy would be dead weight).
 */
export const RITES = [
  { id: 'overcharge', icon: '⚡', name: 'Overcharge', desc: 'Beams deal +25% damage, forever.', once: false },
  { id: 'widebeam', icon: '🌊', name: 'Wide Beam', desc: 'Beams are 30% wider — they catch more shadows.', once: false },
  { id: 'richvein', icon: '💰', name: 'Rich Vein', desc: '+3 lumens for every shadow shattered.', once: false },
  { id: 'deeppockets', icon: '🎒', name: 'Deep Pockets', desc: '+15 lumens bonus every time you clear a wave.', once: false },
  { id: 'frostbite', icon: '❄️', name: 'Frostbite', desc: 'Blue beams slow shadows 65% instead of 50%.', once: false },
  { id: 'vitality', icon: '💚', name: 'Vitality', desc: 'Lantern max HP +2, and restore 2 HP right now.', once: false },
  { id: 'quadprism', icon: '🔷', name: 'Quad Prism', desc: 'Prisms split into FOUR beams — a white beam joins the three colours.', once: false },
  { id: 'magnifier', icon: '🔍', name: 'Magnifier', desc: 'Lenses triple beam damage instead of doubling it.', once: false },
  { id: 'bargain', icon: '🏷️', name: 'Bargain', desc: 'Every tower costs 15% fewer lumens.', once: false },
  { id: 'salvage', icon: '🔧', name: 'Salvage', desc: 'Selling a tower refunds 90% instead of 70%.', once: false },
  { id: 'executioner', icon: '⚔️', name: 'Executioner', desc: '+30% damage to Brutes and the Dread Colossus.', once: false },
  { id: 'grace', icon: '🕯️', name: "Lantern's Grace", desc: 'Once per run: a lethal leak leaves the Lantern at 1 HP instead of dying.', once: true },
];

export const RITE_BY_ID = Object.fromEntries(RITES.map((r) => [r.id, r]));

/** How many times the run has taken a rite (0 when never taken). */
export function riteCount(state, id) {
  return state.rites[id] ?? 0;
}

/** Total rites taken this run (all copies). */
export function totalRites(state) {
  return Object.values(state.rites).reduce((a, b) => a + b, 0);
}

/**
 * Draw an offer of three distinct rites for the draft screen. Uses the
 * world's seeded random stream, so a staged scene always offers the same
 * three. One-time rites already taken are never offered again.
 */
export function offerRites(random, state) {
  const available = RITES.filter((r) => !r.once || riteCount(state, r.id) === 0);
  const pool = [...available];
  const offer = [];
  while (offer.length < 3 && pool.length > 0) {
    const i = Math.floor(random() * pool.length);
    offer.push(pool.splice(i, 1)[0]);
  }
  return offer;
}

// --- The numbers behind each rite (single source of truth) -----------------
// world.js reads these through the helpers below, so a tuning change here
// moves the whole game at once.

/** Beam damage multiplier from Overcharge. */
export function damageMultiplier(state) {
  return 1 + 0.25 * riteCount(state, 'overcharge');
}

/** Beam width multiplier from Wide Beam. */
export function widthMultiplier(state) {
  return 1 + 0.3 * riteCount(state, 'widebeam');
}

/** Extra lumens per kill from Rich Vein. */
export function killBonus(state) {
  return 3 * riteCount(state, 'richvein');
}

/** Extra lumens on wave clear from Deep Pockets. */
export function clearBonus(state) {
  return 15 * riteCount(state, 'deeppockets');
}

/** Speed factor while slowed (0.5 base; Frostbite makes the slow stronger). */
export function slowFactor(state) {
  return Math.max(0.2, 0.5 - 0.15 * riteCount(state, 'frostbite'));
}

/** Lens damage multiplier (2 base; Magnifier adds +1 per copy). */
export function lensMultiplier(state) {
  return 2 + riteCount(state, 'magnifier');
}

/** What a tower costs after Bargain (never below 5 lumens). */
export function towerCost(state, type) {
  const base = TOWERS[type].cost;
  const discounted = Math.round(base * 0.85 ** riteCount(state, 'bargain'));
  return Math.max(5, discounted);
}

/** Sell refund rate (0.70 base; Salvage lifts it to 0.90). */
export function sellRate(state) {
  return Math.min(0.95, 0.7 + 0.2 * riteCount(state, 'salvage'));
}

/** Damage multiplier against Brutes and the Colossus (Executioner). */
export function toughMultiplier(state, enemyType) {
  if ((enemyType === 'brute' || enemyType === 'colossus') && riteCount(state, 'executioner') > 0) {
    return 1.3 ** riteCount(state, 'executioner');
  }
  return 1;
}

/** Whether the prism splits into four beams this run (Quad Prism). */
export function quadSplit(state) {
  return riteCount(state, 'quadprism') > 0;
}

/** Whether Lantern's Grace is armed (taken and not yet spent). */
export function graceArmed(state) {
  return riteCount(state, 'grace') > 0 && !state.graceUsed;
}
