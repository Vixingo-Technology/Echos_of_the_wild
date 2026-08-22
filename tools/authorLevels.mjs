/**
 * Emits Tiled-compatible .tmj files. The output opens in Tiled for visual
 * editing; this script exists so the first levels can be laid out precisely
 * (and re-derived) before anyone opens the editor.
 *
 * Grid: 64px tiles, column/row indices, row 0 at the top.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'src/data/levels';
const TILE = 64;
mkdirSync(OUT, { recursive: true });

let nextId = 1;

const rect = (type, col, row, w, h, extra = {}) => ({
  id: nextId++,
  name: extra.name ?? '',
  type,
  x: col * TILE,
  y: row * TILE,
  width: w * TILE,
  height: h * TILE,
  rotation: 0,
  visible: true,
  ...(extra.properties ? { properties: extra.properties } : {}),
});

const prop = (name, value) => ({
  name,
  type: typeof value === 'number' ? 'float' : typeof value === 'boolean' ? 'bool' : 'string',
  value,
});

function write(id, { cols, rows, biome, displayName, collision, entities }) {
  const map = {
    compressionlevel: -1,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.0',
    type: 'map',
    version: '1.10',
    width: cols,
    height: rows,
    tilewidth: TILE,
    tileheight: TILE,
    nextlayerid: 3,
    nextobjectid: nextId,
    tilesets: [],
    properties: [prop('biome', biome), prop('displayName', displayName)],
    layers: [
      { id: 1, name: 'collision', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: collision },
      { id: 2, name: 'entities', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: entities },
    ],
  };
  writeFileSync(join(OUT, `${id}.json`), JSON.stringify(map, null, 2) + '\n');
  return map;
}

// ---------------------------------------------------------------- cave_01
// Taro wakes at the bottom left. The route up is a staircase of ledges, each
// within one jump of the last (jump clears ~3 tiles up and ~5 across), ending
// at a surface shelf with the first dinosaur, a tree, a rock, and the exit.
const cols = 46;
const rows = 20;

const collision = [
  rect('solid', 0, 18, cols, 2, { name: 'floor' }),
  rect('solid', 0, 0, 1, rows, { name: 'wall-left' }),
  rect('solid', cols - 1, 0, 1, rows, { name: 'wall-right' }),
  rect('solid', 0, 0, cols, 1, { name: 'ceiling' }),

  // A staircase of ledges, each within one jump of the last. Taro clears about
  // 3 tiles up and 3 across, so every rise is 1-2 tiles and every gap is 2.
  // The first stretch of floor is left clear: he is 2.5 tiles tall and cannot
  // walk under a ledge, so crowding the spawn would wall him in.
  rect('solid', 8, 15, 3, 1, { name: 'ledge-a' }),
  rect('solid', 13, 13, 3, 1, { name: 'ledge-b' }),
  rect('solid', 18, 11, 3, 1, { name: 'ledge-c' }),
  rect('solid', 23, 9, 4, 1, { name: 'ledge-d' }),
  rect('solid', 28, 8, 3, 1, { name: 'ledge-e' }),
  rect('solid', 33, 7, 4, 1, { name: 'ledge-f' }),
  rect('solid', 38, 6, 7, 1, { name: 'shelf' }),

  // A shortcut back down: jump up through it, hold down + jump to drop.
  rect('oneway', 23, 12, 3, 1, { name: 'oneway-mid' }),
  rect('oneway', 30, 13, 3, 1, { name: 'oneway-low' }),
];

const entities = [
  rect('spawn', 2, 17, 1, 1, { name: 'start' }),

  rect('enemy', 34, 6, 1, 1, {
    name: 'compy-1',
    properties: [prop('enemyType', 'mini_dino'), prop('patrolMinX', 2160), prop('patrolMaxX', 2340)],
  }),

  rect('destructible', 39, 4, 2, 2, {
    name: 'apple-tree',
    properties: [prop('kind', 'apple_tree'), prop('hasNest', true)],
  }),
  rect('destructible', 42, 5, 1, 1, {
    name: 'rock-1',
    properties: [prop('kind', 'stone')],
  }),

  rect('trigger', 33, 6, 4, 1, {
    name: 'tutorial-combat',
    properties: [prop('flag', 'saw_first_dino'), prop('once', true)],
  }),

  rect('exit', 43, 4, 2, 2, {
    name: 'cave-mouth',
    properties: [prop('toLevel', 'jungle_01'), prop('spawn', 'from_cave')],
  }),
];

write('cave_01', {
  cols, rows,
  biome: 'cave',
  displayName: 'The Waking Cave',
  collision,
  entities,
});

console.log(`wrote cave_01.json (${cols}x${rows} tiles) to ${OUT}`);
