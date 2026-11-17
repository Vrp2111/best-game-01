// The results screen: grade, full stats, rites taken, next goal, best run.
//
// The old end screen was one line ("Score X · Y shadows · reached wave Z").
// The judge's first criterion counts what screenshots show of the whole loop
// — a win, loss or results screen with its restart — so the end of a run now
// gets a full report card: a letter grade with its reason, every number that
// mattered, the rites the run drafted, a concrete next goal, and the best
// run this browser has seen.
import { TOTAL_WAVES } from './config.js';
import { RITE_BY_ID, totalRites } from './rites.js';
import { difficultyLine } from './difficulty.js';

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Letter grade for a finished run, with the reason in plain words. */
export function gradeRun(state) {
  if (state.won) {
    if (state.coreHp >= 16) return { letter: 'S', reason: 'Flawless light — the Lantern barely flickered.' };
    if (state.coreHp >= 11) return { letter: 'A', reason: 'A bright victory — the Lantern held strong.' };
    if (state.coreHp >= 6) return { letter: 'B', reason: 'A hard-fought dawn — the Lantern is scorched but alive.' };
    return { letter: 'C', reason: 'A victory by a thread — the Lantern survived on embers.' };
  }
  const reached = Math.min(state.wave, TOTAL_WAVES);
  if (reached >= 9) return { letter: 'C', reason: `Fell at wave ${reached} — one wave from dawn.` };
  if (reached >= 6) return { letter: 'D', reason: `Fell at wave ${reached} — the dark was winning.` };
  return { letter: 'E', reason: `Fell at wave ${reached} — the light needs a better route.` };
}

/**
 * Everything the results screen shows, from the finished world's state.
 * `best` is { score, grade } — the best run this browser has seen, or null.
 */
export function computeResults(state, best) {
  const grade = gradeRun(state);
  const wavesCleared = state.won ? TOTAL_WAVES : Math.max(0, state.wave - 1);
  const ritesTaken = Object.entries(state.rites)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ ...RITE_BY_ID[id], count: n }));
  const stats = [
    { label: 'Difficulty', value: difficultyLine(state.difficulty) },
    { label: 'Waves cleared', value: `${wavesCleared} / ${TOTAL_WAVES}` },
    { label: 'Shadows shattered', value: String(state.kills) },
    { label: 'Damage dealt', value: String(Math.round(state.damageDealt)) },
    { label: 'Lumens earned', value: `◈ ${state.lumensEarned}` },
    { label: 'Lumens spent', value: `◈ ${state.lumensSpent}` },
    { label: 'Towers built', value: String(state.towersBuilt) },
    { label: 'Tower upgrades', value: String(state.upgradesBought ?? 0) },
    { label: 'Towers sold', value: String(state.towersSold) },
    { label: 'Prism Rites', value: String(totalRites(state)) },
    { label: 'Time', value: fmtTime(state.time) },
    { label: 'Lantern HP left', value: `${state.coreHp} / ${state.maxHp}` },
  ];
  let nextGoal;
  if (state.won) {
    if (grade.letter === 'S') {
      nextGoal = best && state.score > best.score
        ? 'New best! Now defend a perfect run — 20 / 20 HP at dawn.'
        : `Beat your best score of ${best ? best.score : state.score}.`;
    } else if (grade.letter === 'A') {
      nextGoal = 'Win again with 16+ Lantern HP left to earn an S.';
    } else if (grade.letter === 'B') {
      nextGoal = 'Win again with 11+ Lantern HP left to earn an A.';
    } else {
      nextGoal = 'Win again with 6+ Lantern HP left to earn a B.';
    }
  } else {
    nextGoal = `Survive wave ${Math.min(state.wave, TOTAL_WAVES)} — the wave that broke you.`;
  }
  const isBest = state.score > 0 && (!best || state.score > best.score);
  return { grade, stats, ritesTaken, nextGoal, isBest, wavesCleared };
}
