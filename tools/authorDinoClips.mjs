/**
 * Dinosaur clips. Same conventions as tools/authorClips.mjs:
 *   legUpper  rest 95   - lower swings the leg forward, higher swings it back
 *   legLower  rest -28  - more negative straightens the digitigrade knee
 *   foot      rest -62  - positive points the toes down
 *   body      rest -8   - positive pitches the chest down, tail up
 *   neck      rest -35  - positive lowers the head toward the ground
 *   head      rest 25   - positive tips the snout down
 *   jaw       rest 6    - positive opens the mouth
 * The tail is simulated by ProceduralMotion, so it has no tracks here.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'src/data/clips';
mkdirSync(OUT, { recursive: true });

const k = (arr) => arr.map(([t, v, ease]) => (ease ? { t, v, ease } : { t, v }));

function clip({ id, duration, loop, tracks, events }) {
  const out = {
    id, rig: 'dino_small', duration, loop,
    tracks: Object.entries(tracks).map(([key, keys]) => {
      const i = key.lastIndexOf('.');
      return { bone: key.slice(0, i), prop: key.slice(i + 1), keys: k(keys) };
    }),
  };
  if (events?.length) out.events = events;
  writeFileSync(join(OUT, `${id}.json`), JSON.stringify(out, null, 2) + '\n');
}

const made = [];

// ---------------------------------------------------------------- idle
made.push(clip({
  id: 'dino_small.idle', duration: 2.0, loop: true,
  tracks: {
    'hip.y':            [[0, -44], [1.0, -42], [2.0, -44]],
    'body.rot':         [[0, -8], [1.0, -5], [2.0, -8]],
    'neck.rot':         [[0, -35], [0.7, -30], [1.4, -38], [2.0, -35]],
    'head.rot':         [[0, 25], [0.7, 20], [1.4, 28], [2.0, 25]],
    'jaw.rot':          [[0, 6], [1.2, 9], [2.0, 6]],
    'legBackUpper.rot': [[0, 95]],
    'legBackLower.rot': [[0, -28]],
    'legFrontUpper.rot':[[0, 95]],
    'legFrontLower.rot':[[0, -28]],
  },
}));

// ---------------------------------------------------------------- walk
made.push(clip({
  id: 'dino_small.walk', duration: 0.7, loop: true,
  tracks: {
    'hip.y':            [[0, -43], [0.175, -45], [0.35, -43], [0.525, -45], [0.7, -43]],
    'body.rot':         [[0, -8], [0.35, -6], [0.7, -8]],
    'neck.rot':         [[0, -33], [0.35, -37], [0.7, -33]],
    'head.rot':         [[0, 24], [0.35, 27], [0.7, 24]],

    'legFrontUpper.rot':[[0, 68], [0.175, 96], [0.35, 122], [0.525, 84], [0.7, 68]],
    'legFrontLower.rot':[[0, -18], [0.175, -34], [0.35, -12], [0.525, -58], [0.7, -18]],
    'footFront.rot':    [[0, -68], [0.175, -62], [0.35, -44], [0.525, -76], [0.7, -68]],

    'legBackUpper.rot': [[0, 122], [0.175, 84], [0.35, 68], [0.525, 96], [0.7, 122]],
    'legBackLower.rot': [[0, -12], [0.175, -58], [0.35, -18], [0.525, -34], [0.7, -12]],
    'footBack.rot':     [[0, -44], [0.175, -76], [0.35, -68], [0.525, -62], [0.7, -44]],

    'armFront.rot':     [[0, 100], [0.35, 108], [0.7, 100]],
    'armBack.rot':      [[0, 106], [0.35, 98], [0.7, 106]],
  },
  events: [{ t: 0, name: 'footstep' }, { t: 0.35, name: 'footstep' }],
}));

// ---------------------------------------------------------------- run
made.push(clip({
  id: 'dino_small.run', duration: 0.42, loop: true,
  tracks: {
    'hip.y':            [[0, -44], [0.105, -40], [0.21, -48], [0.315, -40], [0.42, -44]],
    'body.rot':         [[0, -14]],
    'neck.rot':         [[0, -26], [0.21, -32], [0.42, -26]],
    'head.rot':         [[0, 18], [0.21, 24], [0.42, 18]],
    'jaw.rot':          [[0, 12]],

    'legFrontUpper.rot':[[0, 52], [0.105, 96], [0.21, 138], [0.315, 76], [0.42, 52]],
    'legFrontLower.rot':[[0, -10], [0.105, -40], [0.21, -6], [0.315, -78], [0.42, -10]],
    'footFront.rot':    [[0, -72], [0.105, -58], [0.21, -34], [0.315, -84], [0.42, -72]],

    'legBackUpper.rot': [[0, 138], [0.105, 76], [0.21, 52], [0.315, 96], [0.42, 138]],
    'legBackLower.rot': [[0, -6], [0.105, -78], [0.21, -10], [0.315, -40], [0.42, -6]],
    'footBack.rot':     [[0, -34], [0.105, -84], [0.21, -72], [0.315, -58], [0.42, -34]],

    'armFront.rot':     [[0, 96], [0.21, 112], [0.42, 96]],
    'armBack.rot':      [[0, 112], [0.21, 96], [0.42, 112]],
  },
  events: [{ t: 0, name: 'footstep' }, { t: 0.21, name: 'footstep' }],
}));

// ---------------------------------------------------------------- bite
// Rear back, then lunge. hitboxOn/hitboxOff bracket the lunge exactly.
made.push(clip({
  id: 'dino_small.bite', duration: 0.62, loop: false,
  tracks: {
    'hip.y':            [[0, -44, 'quadOut'], [0.18, -50, 'backOut'], [0.32, -40], [0.62, -44]],
    'body.rot':         [[0, -8, 'quadOut'], [0.18, -22, 'backOut'], [0.32, 6], [0.62, -8]],
    'neck.rot':         [[0, -35, 'quadOut'], [0.18, -58, 'backOut'], [0.32, -8], [0.44, -26], [0.62, -35]],
    'head.rot':         [[0, 25, 'quadOut'], [0.18, 44, 'backOut'], [0.32, 6], [0.62, 25]],
    'jaw.rot':          [[0, 6, 'quadOut'], [0.16, 46], [0.30, 48], [0.36, 4], [0.62, 6]],

    'legFrontUpper.rot':[[0, 95, 'quadOut'], [0.18, 112], [0.32, 74], [0.62, 95]],
    'legFrontLower.rot':[[0, -28], [0.18, -14], [0.32, -44], [0.62, -28]],
    'legBackUpper.rot': [[0, 95, 'quadOut'], [0.18, 118], [0.32, 108], [0.62, 95]],
    'legBackLower.rot': [[0, -28], [0.18, -8], [0.32, -20], [0.62, -28]],
    'armFront.rot':     [[0, 100], [0.18, 78], [0.32, 118], [0.62, 100]],
    'armBack.rot':      [[0, 100], [0.18, 82], [0.32, 120], [0.62, 100]],
  },
  events: [
    { t: 0.14, name: 'sfx:dinoLunge' },
    { t: 0.28, name: 'hitboxOn' },
    { t: 0.38, name: 'hitboxOff' },
  ],
}));

// ---------------------------------------------------------------- hurt
made.push(clip({
  id: 'dino_small.hurt', duration: 0.3, loop: false,
  tracks: {
    'hip.y':            [[0, -44, 'quadOut'], [0.07, -38], [0.3, -44]],
    'body.rot':         [[0, -8, 'quadOut'], [0.07, 14], [0.3, -8]],
    'neck.rot':         [[0, -35, 'quadOut'], [0.07, -8], [0.3, -35]],
    'head.rot':         [[0, 25, 'quadOut'], [0.07, 48], [0.3, 25]],
    'jaw.rot':          [[0, 6, 'quadOut'], [0.07, 34], [0.3, 6]],
    'legFrontUpper.rot':[[0, 95, 'quadOut'], [0.07, 116], [0.3, 95]],
    'legBackUpper.rot': [[0, 95, 'quadOut'], [0.07, 78], [0.3, 95]],
  },
  events: [{ t: 0, name: 'sfx:dinoHurt' }],
}));

// ---------------------------------------------------------------- death
made.push(clip({
  id: 'dino_small.death', duration: 0.8, loop: false,
  tracks: {
    'hip.y':            [[0, -44, 'quadIn'], [0.2, -50], [0.8, -14]],
    'body.rot':         [[0, -8, 'quadOut'], [0.2, -30], [0.8, 12]],
    'neck.rot':         [[0, -35, 'quadOut'], [0.2, -62], [0.8, 22]],
    'head.rot':         [[0, 25], [0.2, 50], [0.8, 62]],
    'jaw.rot':          [[0, 6], [0.2, 40], [0.8, 26]],
    'legFrontUpper.rot':[[0, 95], [0.8, 34]],
    'legFrontLower.rot':[[0, -28], [0.8, -96]],
    'legBackUpper.rot': [[0, 95], [0.8, 26]],
    'legBackLower.rot': [[0, -28], [0.8, -104]],
    'armFront.rot':     [[0, 100], [0.8, 54]],
    'armBack.rot':      [[0, 100], [0.8, 48]],
  },
  events: [{ t: 0, name: 'sfx:dinoDeath' }],
}));

console.log(`wrote ${made.length} dino clips to ${OUT}`);
