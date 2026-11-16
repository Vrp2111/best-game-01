// PRISMWARD — a light tower defense: mirrors & prisms.
// Every tuning number, colour and wave in one place. The playfield is a fixed
// 960x640 logical area (12 x 8 cells of 80 px); the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { cols: 12, rows: 8, cell: 80, width: 960, height: 640 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Directions, as unit steps on the grid. */
export const DIR = {
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
  N: { dx: 0, dy: -1 },
};
export const DIR_ORDER = ['E', 'S', 'W', 'N'];
/** Turn left / right relative to a direction (used by prisms). */
export const TURN = {
  E: { left: 'N', right: 'S' },
  S: { left: 'E', right: 'W' },
  W: { left: 'S', right: 'N' },
  N: { left: 'W', right: 'E' },
};
/** Mirror reflections: '/' maps N<->E and S<->W; '\\' maps N<->W and S<->E. */
export const MIRROR_REFLECT = {
  '/': { N: 'E', E: 'N', S: 'W', W: 'S' },
  '\\': { N: 'W', W: 'N', S: 'E', E: 'S' },
};

/**
 * The enemy path, as grid cells, from the shadow gate (left edge) to the
 * Lantern core (bottom right). A serpentine that crosses every row of the
 * board, so a well-routed beam can meet the horde again and again.
 */
export const PATH = [
  [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1],
  [10, 2], [10, 3],
  [9, 3], [8, 3], [7, 3], [6, 3], [5, 3], [4, 3], [3, 3], [2, 3], [1, 3],
  [1, 4], [1, 5],
  [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5],
  [10, 6], [10, 7], [11, 7],
];
export const CORE_CELL = { col: 11, row: 7 };
export const SPAWN_CELL = { col: 0, row: 1 };

/** Beam colours. White is the raw emitter beam; a prism splits it into the three. */
export const COLORS = {
  white: { name: 'white', css: '#f5f7ff', glow: '#cdd7ff', damage: 1.0, desc: 'Raw light' },
  red: { name: 'red', css: '#ff3b4e', glow: '#ff8a7a', damage: 2.0, desc: 'Heavy damage (2x)' },
  blue: { name: 'blue', css: '#38b6ff', glow: '#8ad8ff', damage: 1.0, desc: 'Slows enemies 50%' },
  green: { name: 'green', css: '#3dff8e', glow: '#8affc0', damage: 1.0, desc: 'Kills heal the Lantern +1' },
};
/** A prism splits an incoming beam into three: straight = red, left = blue, right = green. */
export const PRISM_SPLIT = { straight: 'red', left: 'blue', right: 'green' };

/** Towers the player can build. */
export const TOWERS = {
  emitter: {
    key: 'emitter', name: 'Emitter', hotkey: '1', cost: 50,
    desc: 'Light source. Fires a white beam in the direction it faces. Rotate with R.',
    rotatable: true,
  },
  mirror: {
    key: 'mirror', name: 'Mirror', hotkey: '2', cost: 20,
    desc: 'Reflects a beam 90 degrees. R toggles / and \\.',
    rotatable: true,
  },
  prism: {
    key: 'prism', name: 'Prism', hotkey: '3', cost: 60,
    desc: 'Splits one beam into three: red (2x damage) straight, blue (slow) left, green (heal) right.',
    rotatable: false,
  },
  lens: {
    key: 'lens', name: 'Lens', hotkey: '4', cost: 80,
    desc: 'Focuses any beam passing through it: damage x2, narrower and brighter.',
    rotatable: false,
  },
};
export const TOWER_ORDER = ['emitter', 'mirror', 'prism', 'lens'];
export const SELL_REFUND = 0.7;
export const MAX_BEAMS = 128;
export const MAX_BEAM_SEGMENTS = 40;
export const BEAM_BASE_DPS = 40;
export const LENS_MULTIPLIER = 2;
export const SLOW_FACTOR = 0.5;
export const SLOW_DURATION = 1.5;

/** Enemy types. weak = the beam colour that deals double damage (shown as the
 *  glowing ring around the creature); resist = the colour that deals half. */
export const ENEMIES = {
  mote: {
    key: 'mote', name: 'Shade Mote', hp: 30, speed: 72, radius: 13, reward: 5, leak: 1,
    weak: 'blue', resist: 'green', tint: '#b9a7ff', eye: '#d9ccff',
    desc: 'Small and quick. Weak to blue.',
  },
  imp: {
    key: 'imp', name: 'Ember Imp', hp: 65, speed: 56, radius: 16, reward: 7, leak: 1,
    weak: 'blue', resist: 'red', tint: '#ff9a5c', eye: '#ffd2a8',
    desc: 'Ember imp. Weak to blue, resists red.',
  },
  sprout: {
    key: 'sprout', name: 'Thorn Sprout', hp: 95, speed: 46, radius: 17, reward: 9, leak: 2,
    weak: 'red', resist: 'green', tint: '#7ee081', eye: '#c9f7c5',
    desc: 'Thorny and stubborn. Weak to red.',
  },
  wisp: {
    key: 'wisp', name: 'Frost Wisp', hp: 55, speed: 88, radius: 14, reward: 8, leak: 1,
    weak: 'green', resist: 'blue', tint: '#7fd4ff', eye: '#d6f2ff',
    desc: 'Fast wisp. Weak to green, resists blue.',
  },
  bat: {
    key: 'bat', name: 'Umbral Bat', hp: 28, speed: 112, radius: 12, reward: 6, leak: 1,
    weak: 'blue', resist: 'red', tint: '#c77dff', eye: '#e8ccff',
    desc: 'Very fast, fragile. Weak to blue.',
  },
  brute: {
    key: 'brute', name: 'Shade Brute', hp: 230, speed: 33, radius: 22, reward: 15, leak: 3,
    weak: 'red', resist: 'blue', tint: '#ff6b81', eye: '#ffc2cc',
    desc: 'Slow and huge. Weak to red, resists blue.',
  },
  colossus: {
    key: 'colossus', name: 'Dread Colossus', hp: 950, speed: 27, radius: 30, reward: 100, leak: 10,
    weak: 'red', resist: 'green', tint: '#ff2e63', eye: '#ffe08a',
    desc: 'The final horror. Weak to red.',
  },
};

/**
 * The 10 waves. Each entry is a list of spawn groups: { type, count, gap }
 * (gap = seconds between spawns in that group). HP grows 22% per wave and
 * speed 3% per wave, on top of the base stats above.
 */
export const WAVES = [
  [{ type: 'mote', count: 8, gap: 0.9 }],
  [{ type: 'mote', count: 10, gap: 0.7 }, { type: 'imp', count: 4, gap: 1.1 }],
  [{ type: 'imp', count: 8, gap: 0.8 }, { type: 'sprout', count: 5, gap: 1.2 }, { type: 'brute', count: 1, gap: 2.0 }],
  [{ type: 'mote', count: 12, gap: 0.5 }, { type: 'wisp', count: 6, gap: 0.9 }, { type: 'imp', count: 6, gap: 0.8 }],
  [{ type: 'bat', count: 10, gap: 0.55 }, { type: 'sprout', count: 6, gap: 1.0 }, { type: 'brute', count: 2, gap: 2.5 }],
  [{ type: 'wisp', count: 10, gap: 0.6 }, { type: 'imp', count: 10, gap: 0.6 }, { type: 'brute', count: 2, gap: 2.0 }],
  [{ type: 'bat', count: 14, gap: 0.45 }, { type: 'sprout', count: 8, gap: 0.9 }, { type: 'brute', count: 3, gap: 2.2 }],
  [{ type: 'mote', count: 16, gap: 0.4 }, { type: 'wisp', count: 12, gap: 0.55 }, { type: 'brute', count: 3, gap: 2.0 }],
  [{ type: 'bat', count: 16, gap: 0.4 }, { type: 'imp', count: 12, gap: 0.5 }, { type: 'sprout', count: 10, gap: 0.8 }, { type: 'brute', count: 4, gap: 1.8 }],
  [{ type: 'colossus', count: 1, gap: 1.0 }, { type: 'bat', count: 12, gap: 0.5 }, { type: 'wisp', count: 10, gap: 0.6 }, { type: 'brute', count: 4, gap: 1.5 }, { type: 'imp', count: 10, gap: 0.6 }],
];
export const TOTAL_WAVES = WAVES.length;
export const HP_SCALE_PER_WAVE = 0.22;
export const SPEED_SCALE_PER_WAVE = 0.03;

export const START_LUMENS = 140;
export const START_CORE_HP = 20;
export const MAX_CORE_HP = 20;
export const GREEN_HEAL_ON_KILL = 1;
export const WAVE_CLEAR_BONUS = (wave) => 25 + 5 * wave;

export const PALETTE = {
  backdrop: '#05060d',
  backdrop2: '#0a0d1f',
  grid: 'rgba(120, 140, 255, 0.07)',
  gridLine: 'rgba(120, 140, 255, 0.12)',
  path: '#141830',
  pathEdge: 'rgba(150, 170, 255, 0.25)',
  pathGlow: 'rgba(90, 110, 255, 0.10)',
  panel: '#12162b',
  panelEdge: '#2a3160',
  text: '#eef1ff',
  muted: '#9aa3c7',
  gold: '#ffd166',
  core: '#ffe9a8',
  danger: '#ff4d6d',
  towerBase: '#1c2242',
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'prismward.best';
