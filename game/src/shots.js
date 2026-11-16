// The screenshot scenes behind ?shot=title|mid|late|victory. Each one plays
// the real rules forward from a fresh world, steered by a fixed tower layout,
// so the frame is what a real game looks like and the same seed always gives
// the same frame. The title scene is the attract mode (a demo board routing
// light while shadows wander); mid is a wave-3 fight with a prism splitting;
// late is a wave-9 fight with a full optical circuit; victory is the win
// screen over a finished board.
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
    world.startWave();
    runSteps(world, 22);
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
