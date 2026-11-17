// The screenshot scenes behind ?shot=title|mid|late|boss|draft|victory.
// Each one plays the real rules forward from a fresh world, steered by a
// fixed tower layout, so the frame is what a real game looks like and the
// same seed always gives the same frame. The title scene is the attract
// mode (a demo board routing light while shadows wander); mid is a wave-3
// fight with a prism splitting; late is a wave-9 fight with a full optical
// circuit and upgraded towers; boss is the wave-10 Dread Colossus mid-fight
// in phase II (ENRAGED); victory is the win screen over a finished board.
import { STEP } from './config.js';

const MID_LAYOUT = [
  ['emitter', 5, 0, 'S'],
  ['prism', 5, 2, 'E'],
  ['emitter', 11, 0, 'S'],
  ['prism', 11, 1, 'E'],
  ['emitter', 1, 7, 'N'],
  ['mirror', 3, 6, 'E'],
  ['emitter', 8, 6, 'N'],
];

const LATE_LAYOUT = [
  ['emitter', 11, 0, 'S'],
  ['prism', 11, 1, 'E'],
  ['emitter', 0, 2, 'S'],
  ['prism', 0, 3, 'E'],
  ['emitter', 11, 4, 'S'],
  ['prism', 11, 5, 'E'],
  ['emitter', 0, 6, 'S'],
  ['prism', 0, 7, 'E'],
  ['emitter', 5, 0, 'S'],
  ['lens', 5, 2, 'E'],
  ['emitter', 8, 6, 'N'],
  ['prism', 8, 4, 'E'],
  ['emitter', 3, 7, 'N'],
  ['mirror', 3, 6, 'E'],
  ['emitter', 10, 0, 'S'],
];

function placeLayout(world, layout) {
  for (const [type, col, row, dir] of layout) world.placeTowerFree(col, row, type, dir);
}

/** Upgrade the towers on these tiles twice each (level 3), for staged scenes. */
function upgradeLayout(world, cells) {
  for (const [col, row] of cells) {
    world.upgradeTowerAt(col, row);
    world.upgradeTowerAt(col, row);
  }
}

function runSteps(world, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) world.step(STEP);
}

/**
 * Set `world` to the named scene and return the screen to draw over it:
 * 'title' (attract mode), 'play' (mid or late fight), 'draft' (the Prism
 * Rites draft after a wave clear), or 'win' (victory).
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'mid') {
    world.debugSetup({ lumens: 999, wave: 3 });
    placeLayout(world, MID_LAYOUT);
    world.startWave();
    runSteps(world, 16);
    return { screen: 'play' };
  }
  if (name === 'late') {
    world.debugSetup({ lumens: 999, wave: 9 });
    placeLayout(world, LATE_LAYOUT);
    // The cover shows the v1.2 upgrade system at work: level-3 emitters
    // with gold pips, a level-2 prism and a level-3 lens on the circuit.
    upgradeLayout(world, [[11, 0], [11, 4], [5, 0]]);
    world.upgradeTowerAt(11, 1);
    world.upgradeTowerAt(5, 2);
    world.upgradeTowerAt(5, 2);
    world.startWave();
    runSteps(world, 22);
    return { screen: 'play' };
  }
  if (name === 'boss') {
    // Wave 10, mid-boss-fight: the Dread Colossus has dropped into phase
    // II — ENRAGED — with its orange ring, phase pips and the banner
    // across the board. Stepped forward until the phase flips (or 45 s
    // of fight, whichever comes first), so the frame is deterministic.
    world.debugSetup({ lumens: 999, wave: 10 });
    placeLayout(world, LATE_LAYOUT);
    upgradeLayout(world, [[11, 0], [11, 4], [5, 0], [0, 2]]);
    world.upgradeTowerAt(11, 1);
    world.upgradeTowerAt(5, 2);
    world.upgradeTowerAt(5, 2);
    world.startWave();
    let bossPhase = 1;
    const maxSteps = Math.floor(45 / STEP);
    for (let i = 0; i < maxSteps; i += 1) {
      world.step(STEP);
      const boss = world.state.enemies.find((e) => e.boss);
      if (boss) {
        bossPhase = boss.boss.phase;
        if (bossPhase >= 2) break;
      }
      if (world.state.over) break;
    }
    void bossPhase;
    // Half a second more so the phase banner fades in fully: its alpha
    // runs on world time, and the frame is painted after staging stops
    // stepping — without this the banner would still be transparent.
    runSteps(world, 0.5);
    return { screen: 'play' };
  }
  if (name === 'draft') {
    // Wave 3 just cleared: a full board, two rites already taken, and the
    // draft offer drawn from the seeded stream (same three every time).
    world.debugSetup({ lumens: 1240, wave: 4 });
    placeLayout(world, MID_LAYOUT);
    world.applyRite('overcharge');
    world.applyRite('richvein');
    world.state.score = 1240;
    world.state.kills = 41;
    world.state.damageDealt = 18320;
    world.state.lumensEarned = 410;
    world.state.lumensSpent = 260;
    world.state.towersBuilt = 7;
    world.state.towersSold = 1;
    world.state.time = 152;
    runSteps(world, 0.5);
    return { screen: 'draft', offer: world.drawOffer() };
  }
  if (name === 'victory') {
    world.debugSetup({ lumens: 999, wave: 10 });
    placeLayout(world, LATE_LAYOUT);
    // The winning board shows its upgrades too: level-3 emitters, a
    // level-2 prism, a level-3 lens — the build that held the dawn.
    upgradeLayout(world, [[11, 0], [11, 4]]);
    world.upgradeTowerAt(11, 1);
    world.upgradeTowerAt(5, 2);
    world.upgradeTowerAt(5, 2);
    world.applyRite('overcharge');
    world.applyRite('quadprism');
    world.applyRite('richvein');
    world.applyRite('vitality');
    world.state.score = 2840;
    world.state.kills = 96;
    world.state.damageDealt = 48210;
    world.state.lumensEarned = 1180;
    world.state.lumensSpent = 940;
    world.state.towersBuilt = 15;
    world.state.towersSold = 2;
    world.state.time = 486;
    world.state.coreHp = 17;
    world.forceWin();
    runSteps(world, 0.5);
    return { screen: 'win' };
  }
  // Any other name is the title scene.
  world.setAttract(true);
  runSteps(world, 6);
  return { screen: 'title' };
}
