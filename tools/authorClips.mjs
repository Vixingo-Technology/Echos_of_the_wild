/**
 * Authoring helper: expands a terse keyframe spec into the clip JSON that the
 * runtime and the rig editor both read. Run with `node tools/authorClips.mjs`.
 *
 * Track values are ABSOLUTE local rotations in degrees, so they read against
 * the rig's rest pose:
 *   thigh   rest 180  - lower swings the leg FORWARD, higher swings it BACK
 *   shin    rest 0    - positive bends the knee (backward, as knees do)
 *   armUp   rest 180  - lower swings the arm FORWARD
 *   armLow  rest 0    - NEGATIVE flexes the elbow forward
 *   foot    rest -90  - positive points the toe down
 *   torso   rest 0    - positive leans forward
 *   head    rest 0    - positive looks down
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'src/data/clips';
mkdirSync(OUT, { recursive: true });

/** `[t, v]` or `[t, v, ease]` */
const k = (arr) => arr.map(([t, v, ease]) => (ease ? { t, v, ease } : { t, v }));

function clip({ id, duration, loop, tracks, events }) {
  const out = {
    id,
    rig: 'taro',
    duration,
    loop,
    tracks: Object.entries(tracks).map(([key, keys]) => {
      const i = key.lastIndexOf('.');
      return { bone: key.slice(0, i), prop: key.slice(i + 1), keys: k(keys) };
    }),
  };
  if (events?.length) out.events = events;
  writeFileSync(join(OUT, `taro.${id.split('.').pop()}.json`), JSON.stringify(out, null, 2) + '\n');
  return out.tracks.length;
}

const clips = [];

// ---------------------------------------------------------------- idle
clips.push(clip({
  id: 'taro.idle', duration: 2.4, loop: true,
  tracks: {
    'torso.rot':          [[0, 2], [1.2, 3.5], [2.4, 2]],
    'chest.rot':          [[0, 0], [1.2, -2.5], [2.4, 0]],
    'chest.sy':           [[0, 1], [1.2, 1.04], [2.4, 1]],
    'head.rot':           [[0, 1], [1.1, 3], [2.4, 1]],
    'pelvis.y':           [[0, -90], [1.2, -88.5], [2.4, -90]],
    'armUpperFront.rot':  [[0, 181], [1.3, 184], [2.4, 181]],
    'armLowerFront.rot':  [[0, -9], [1.3, -14], [2.4, -9]],
    'armUpperBack.rot':   [[0, 179], [1.0, 176], [2.4, 179]],
    'armLowerBack.rot':   [[0, -7], [1.0, -4], [2.4, -7]],
    'thighFront.rot':     [[0, 178]],
    'shinFront.rot':      [[0, 3]],
    'thighBack.rot':      [[0, 184]],
    'shinBack.rot':       [[0, 5]],
    'footBack.rot':       [[0, -87]],
  },
}));

// ---------------------------------------------------------------- walk
clips.push(clip({
  id: 'taro.walk', duration: 0.9, loop: true,
  tracks: {
    'torso.rot':          [[0, 4]],
    'head.rot':           [[0, 1], [0.225, -1], [0.45, 1], [0.675, -1], [0.9, 1]],
    'pelvis.y':           [[0, -88], [0.225, -91], [0.45, -88], [0.675, -91], [0.9, -88]],

    'thighFront.rot':     [[0, 152], [0.225, 185], [0.45, 208], [0.675, 172], [0.9, 152]],
    'shinFront.rot':      [[0, 8], [0.225, 5], [0.45, 22], [0.675, 62], [0.9, 8]],
    'footFront.rot':      [[0, -96], [0.225, -90], [0.45, -68], [0.675, -100], [0.9, -96]],

    'thighBack.rot':      [[0, 208], [0.225, 172], [0.45, 152], [0.675, 185], [0.9, 208]],
    'shinBack.rot':       [[0, 22], [0.225, 62], [0.45, 8], [0.675, 5], [0.9, 22]],
    'footBack.rot':       [[0, -68], [0.225, -100], [0.45, -96], [0.675, -90], [0.9, -68]],

    'armUpperFront.rot':  [[0, 205], [0.225, 180], [0.45, 155], [0.675, 180], [0.9, 205]],
    'armLowerFront.rot':  [[0, -12], [0.225, -20], [0.45, -32], [0.675, -18], [0.9, -12]],
    'armUpperBack.rot':   [[0, 155], [0.225, 180], [0.45, 205], [0.675, 180], [0.9, 155]],
    'armLowerBack.rot':   [[0, -32], [0.225, -18], [0.45, -12], [0.675, -20], [0.9, -32]],
  },
  events: [{ t: 0, name: 'footstep' }, { t: 0.45, name: 'footstep' }],
}));

// ---------------------------------------------------------------- run
clips.push(clip({
  id: 'taro.run', duration: 0.55, loop: true,
  tracks: {
    'torso.rot':          [[0, 12]],
    'chest.rot':          [[0, 4]],
    'head.rot':           [[0, -6]],
    'pelvis.y':           [[0, -88], [0.0825, -84], [0.1875, -95], [0.275, -88], [0.3575, -84], [0.4625, -95], [0.55, -88]],

    'thighFront.rot':     [[0, 132], [0.1375, 175], [0.275, 222], [0.4125, 160], [0.55, 132]],
    'shinFront.rot':      [[0, 30], [0.1375, 6], [0.275, 45], [0.4125, 95], [0.55, 30]],
    'footFront.rot':      [[0, -98], [0.1375, -84], [0.275, -55], [0.4125, -105], [0.55, -98]],

    'thighBack.rot':      [[0, 222], [0.1375, 160], [0.275, 132], [0.4125, 175], [0.55, 222]],
    'shinBack.rot':       [[0, 45], [0.1375, 95], [0.275, 30], [0.4125, 6], [0.55, 45]],
    'footBack.rot':       [[0, -55], [0.1375, -105], [0.275, -98], [0.4125, -84], [0.55, -55]],

    'armUpperFront.rot':  [[0, 218], [0.275, 145], [0.55, 218]],
    'armLowerFront.rot':  [[0, -70], [0.1375, -95], [0.275, -78], [0.4125, -60], [0.55, -70]],
    'armUpperBack.rot':   [[0, 145], [0.275, 218], [0.55, 145]],
    'armLowerBack.rot':   [[0, -78], [0.1375, -60], [0.275, -70], [0.4125, -95], [0.55, -78]],
  },
  events: [{ t: 0, name: 'footstep' }, { t: 0.275, name: 'footstep' }],
}));

// ---------------------------------------------------------------- jumpRise
clips.push(clip({
  id: 'taro.jumpRise', duration: 0.35, loop: false,
  tracks: {
    'torso.rot':          [[0, 8, 'quadOut'], [0.35, 2]],
    'head.rot':           [[0, -5], [0.35, -8]],
    'pelvis.y':           [[0, -86, 'quadOut'], [0.35, -92]],

    'thighFront.rot':     [[0, 210, 'quadOut'], [0.12, 150], [0.35, 140]],
    'shinFront.rot':      [[0, 15, 'quadOut'], [0.12, 70], [0.35, 55]],
    'footFront.rot':      [[0, -60], [0.35, -105]],
    'thighBack.rot':      [[0, 215], [0.35, 195]],
    'shinBack.rot':       [[0, 10], [0.35, 40]],
    'footBack.rot':       [[0, -62], [0.35, -95]],

    'armUpperFront.rot':  [[0, 140, 'quadOut'], [0.35, 125]],
    'armLowerFront.rot':  [[0, -40], [0.35, -25]],
    'armUpperBack.rot':   [[0, 215], [0.35, 228]],
    'armLowerBack.rot':   [[0, -20], [0.35, -10]],
  },
  events: [{ t: 0, name: 'sfx:jump' }],
}));

// ---------------------------------------------------------------- jumpFall
clips.push(clip({
  id: 'taro.jumpFall', duration: 0.5, loop: true,
  tracks: {
    'torso.rot':          [[0, 4], [0.25, 6], [0.5, 4]],
    'head.rot':           [[0, 4]],
    'pelvis.y':           [[0, -91]],

    'thighFront.rot':     [[0, 158], [0.25, 165], [0.5, 158]],
    'shinFront.rot':      [[0, 45], [0.25, 38], [0.5, 45]],
    'footFront.rot':      [[0, -100]],
    'thighBack.rot':      [[0, 198], [0.25, 205], [0.5, 198]],
    'shinBack.rot':       [[0, 25], [0.25, 32], [0.5, 25]],
    'footBack.rot':       [[0, -88]],

    'armUpperFront.rot':  [[0, 132], [0.25, 126], [0.5, 132]],
    'armLowerFront.rot':  [[0, -35], [0.25, -42], [0.5, -35]],
    'armUpperBack.rot':   [[0, 225], [0.25, 231], [0.5, 225]],
    'armLowerBack.rot':   [[0, -15], [0.25, -10], [0.5, -15]],
  },
}));

// ---------------------------------------------------------------- land
clips.push(clip({
  id: 'taro.land', duration: 0.28, loop: false,
  tracks: {
    'torso.rot':          [[0, 6, 'quadOut'], [0.08, 18, 'backOut'], [0.28, 0]],
    'head.rot':           [[0, 0, 'quadOut'], [0.08, 8], [0.28, 0]],
    'pelvis.y':           [[0, -90, 'quadOut'], [0.08, -74, 'backOut'], [0.28, -90]],

    'thighFront.rot':     [[0, 150, 'quadOut'], [0.08, 138, 'backOut'], [0.28, 180]],
    'shinFront.rot':      [[0, 40, 'quadOut'], [0.08, 72, 'backOut'], [0.28, 3]],
    'footFront.rot':      [[0, -100], [0.08, -88], [0.28, -90]],
    'thighBack.rot':      [[0, 200, 'quadOut'], [0.08, 214, 'backOut'], [0.28, 180]],
    'shinBack.rot':       [[0, 25, 'quadOut'], [0.08, 70, 'backOut'], [0.28, 3]],
    'footBack.rot':       [[0, -92], [0.08, -86], [0.28, -90]],

    'armUpperFront.rot':  [[0, 130, 'quadOut'], [0.08, 155], [0.28, 180]],
    'armLowerFront.rot':  [[0, -30, 'quadOut'], [0.08, -55], [0.28, -10]],
    'armUpperBack.rot':   [[0, 228, 'quadOut'], [0.08, 205], [0.28, 180]],
    'armLowerBack.rot':   [[0, -12, 'quadOut'], [0.08, -50], [0.28, -10]],
  },
  events: [{ t: 0, name: 'sfx:land' }, { t: 0, name: 'footstep' }],
}));

// ---------------------------------------------------------------- crouch
clips.push(clip({
  id: 'taro.crouch', duration: 1.6, loop: true,
  tracks: {
    'pelvis.y':           [[0, -62], [0.8, -60], [1.6, -62]],
    'torso.rot':          [[0, 20]],
    'chest.rot':          [[0, 6]],
    'head.rot':           [[0, -12]],
    'thighFront.rot':     [[0, 130]],
    'shinFront.rot':      [[0, 95]],
    'footFront.rot':      [[0, -80]],
    'thighBack.rot':      [[0, 150]],
    'shinBack.rot':       [[0, 105]],
    'footBack.rot':       [[0, -70]],
    'armUpperFront.rot':  [[0, 155]],
    'armLowerFront.rot':  [[0, -48]],
    'armUpperBack.rot':   [[0, 168]],
    'armLowerBack.rot':   [[0, -40]],
  },
}));

// ------------------------------------------------------- punch chain (Z)
// Anticipation, strike, recovery. `hitboxOn`/`hitboxOff` bracket the active
// frames; `cancelWindow` is the earliest the next punch may chain.
clips.push(clip({
  id: 'taro.punch1', duration: 0.32, loop: false,
  tracks: {
    'torso.rot':          [[0, 2, 'quadOut'], [0.05, -4], [0.11, 12, 'quadOut'], [0.32, 2]],
    'chest.rot':          [[0, 0], [0.11, 5], [0.32, 0]],
    'head.rot':           [[0, 0], [0.11, 5], [0.32, 0]],
    'pelvis.y':           [[0, -90], [0.11, -87], [0.32, -90]],
    'armUpperFront.rot':  [[0, 180, 'quadOut'], [0.05, 212, 'backOut'], [0.11, 118], [0.20, 150], [0.32, 180]],
    'armLowerFront.rot':  [[0, -10, 'quadOut'], [0.05, -70, 'backOut'], [0.11, -2], [0.20, -35], [0.32, -10]],
    'armUpperBack.rot':   [[0, 180], [0.11, 216], [0.32, 180]],
    'armLowerBack.rot':   [[0, -10], [0.11, -58], [0.32, -10]],
    'thighFront.rot':     [[0, 172], [0.11, 162], [0.32, 178]],
    'thighBack.rot':      [[0, 188], [0.11, 196], [0.32, 184]],
    'shinBack.rot':       [[0, 8], [0.11, 14], [0.32, 5]],
  },
  events: [
    { t: 0.03, name: 'sfx:swing' },
    { t: 0.10, name: 'hitboxOn' },
    { t: 0.17, name: 'hitboxOff' },
    { t: 0.19, name: 'cancelWindow' },
  ],
}));

clips.push(clip({
  id: 'taro.punch2', duration: 0.34, loop: false,
  tracks: {
    'torso.rot':          [[0, 2, 'quadOut'], [0.05, 10], [0.12, -8, 'quadOut'], [0.34, 2]],
    'chest.rot':          [[0, 0], [0.12, -5], [0.34, 0]],
    'head.rot':           [[0, 0], [0.12, 6], [0.34, 0]],
    'pelvis.y':           [[0, -90], [0.12, -86], [0.34, -90]],
    'armUpperBack.rot':   [[0, 180, 'quadOut'], [0.05, 214, 'backOut'], [0.12, 112], [0.22, 148], [0.34, 180]],
    'armLowerBack.rot':   [[0, -10, 'quadOut'], [0.05, -74, 'backOut'], [0.12, -2], [0.22, -38], [0.34, -10]],
    'armUpperFront.rot':  [[0, 180], [0.12, 218], [0.34, 180]],
    'armLowerFront.rot':  [[0, -10], [0.12, -62], [0.34, -10]],
    'thighFront.rot':     [[0, 176], [0.12, 186], [0.34, 178]],
    'thighBack.rot':      [[0, 186], [0.12, 172], [0.34, 184]],
  },
  events: [
    { t: 0.04, name: 'sfx:swing' },
    { t: 0.11, name: 'hitboxOn' },
    { t: 0.18, name: 'hitboxOff' },
    { t: 0.21, name: 'cancelWindow' },
  ],
}));

// The finisher: longer wind-up, bigger commitment, no cancel out of it.
clips.push(clip({
  id: 'taro.punch3', duration: 0.5, loop: false,
  tracks: {
    'torso.rot':          [[0, 2, 'quadOut'], [0.12, -16, 'backOut'], [0.24, 26, 'quadOut'], [0.5, 2]],
    'chest.rot':          [[0, 0], [0.12, -8], [0.24, 10], [0.5, 0]],
    'head.rot':           [[0, 0], [0.12, -8], [0.24, 12], [0.5, 0]],
    'pelvis.y':           [[0, -90], [0.12, -93], [0.24, -82], [0.5, -90]],
    'armUpperFront.rot':  [[0, 180, 'quadOut'], [0.12, 246, 'backOut'], [0.24, 96], [0.34, 140], [0.5, 180]],
    'armLowerFront.rot':  [[0, -10, 'quadOut'], [0.12, -96, 'backOut'], [0.24, -4], [0.34, -40], [0.5, -10]],
    'armUpperBack.rot':   [[0, 180], [0.12, 150], [0.24, 226], [0.5, 180]],
    'armLowerBack.rot':   [[0, -10], [0.12, -30], [0.24, -66], [0.5, -10]],
    'thighFront.rot':     [[0, 178], [0.12, 192], [0.24, 150], [0.5, 178]],
    'shinFront.rot':      [[0, 3], [0.24, 16], [0.5, 3]],
    'thighBack.rot':      [[0, 184], [0.12, 174], [0.24, 206], [0.5, 184]],
    'shinBack.rot':       [[0, 5], [0.24, 22], [0.5, 5]],
  },
  events: [
    { t: 0.10, name: 'sfx:swing' },
    { t: 0.22, name: 'hitboxOn' },
    { t: 0.32, name: 'hitboxOff' },
  ],
}));

// ---------------------------------------------------------------- kick (X)
clips.push(clip({
  id: 'taro.kick', duration: 0.45, loop: false,
  tracks: {
    'pelvis.y':           [[0, -90, 'quadOut'], [0.10, -84], [0.20, -96, 'quadOut'], [0.45, -90]],
    'torso.rot':          [[0, 2, 'quadOut'], [0.10, -8, 'backOut'], [0.22, 16], [0.45, 2]],
    'head.rot':           [[0, 0], [0.10, -6], [0.22, 8], [0.45, 0]],
    'thighFront.rot':     [[0, 178, 'quadOut'], [0.10, 208, 'backOut'], [0.21, 104], [0.32, 142], [0.45, 178]],
    'shinFront.rot':      [[0, 3, 'quadOut'], [0.10, 48, 'backOut'], [0.21, 2], [0.32, 26], [0.45, 3]],
    'footFront.rot':      [[0, -90], [0.10, -104], [0.21, -52], [0.45, -90]],
    'thighBack.rot':      [[0, 184], [0.10, 178], [0.21, 198], [0.45, 184]],
    'shinBack.rot':       [[0, 5], [0.10, 12], [0.21, 20], [0.45, 5]],
    'armUpperFront.rot':  [[0, 180], [0.10, 206], [0.21, 226], [0.45, 180]],
    'armLowerFront.rot':  [[0, -10], [0.21, -44], [0.45, -10]],
    'armUpperBack.rot':   [[0, 180], [0.10, 156], [0.21, 138], [0.45, 180]],
    'armLowerBack.rot':   [[0, -10], [0.21, -52], [0.45, -10]],
  },
  events: [
    { t: 0.06, name: 'sfx:swing' },
    { t: 0.16, name: 'hitboxOn' },
    { t: 0.26, name: 'hitboxOff' },
  ],
}));

// ---------------------------------------------------------------- hurt
clips.push(clip({
  id: 'taro.hurt', duration: 0.32, loop: false,
  tracks: {
    'torso.rot':          [[0, 2, 'quadOut'], [0.07, -20, 'backOut'], [0.32, 2]],
    'chest.rot':          [[0, 0, 'quadOut'], [0.07, -10], [0.32, 0]],
    'head.rot':           [[0, 0, 'quadOut'], [0.07, -16], [0.32, 0]],
    'pelvis.y':           [[0, -90, 'quadOut'], [0.07, -85], [0.32, -90]],
    'armUpperFront.rot':  [[0, 180, 'quadOut'], [0.07, 224], [0.32, 180]],
    'armLowerFront.rot':  [[0, -10, 'quadOut'], [0.07, -46], [0.32, -10]],
    'armUpperBack.rot':   [[0, 180, 'quadOut'], [0.07, 232], [0.32, 180]],
    'armLowerBack.rot':   [[0, -10, 'quadOut'], [0.07, -38], [0.32, -10]],
    'thighFront.rot':     [[0, 178, 'quadOut'], [0.07, 196], [0.32, 178]],
    'thighBack.rot':      [[0, 184, 'quadOut'], [0.07, 168], [0.32, 184]],
    'shinBack.rot':       [[0, 5], [0.07, 26], [0.32, 5]],
  },
  events: [{ t: 0, name: 'sfx:hurt' }],
}));

// ------------------------------------------------------- inject (hold S)
// Duration must match PLAYER.injectDuration; `consumeVial` fires only at the
// very end, so releasing early costs nothing.
clips.push(clip({
  id: 'taro.inject', duration: 1.2, loop: false,
  tracks: {
    'torso.rot':          [[0, 2], [0.3, -5], [0.95, -5], [1.2, 2]],
    'head.rot':           [[0, 0], [0.3, -10], [0.95, -10], [1.2, 0]],
    'pelvis.y':           [[0, -90], [0.3, -87], [0.6, -88], [0.95, -87], [1.2, -90]],
    'armUpperFront.rot':  [[0, 180, 'quadOut'], [0.3, 128], [0.95, 124], [1.2, 180]],
    'armLowerFront.rot':  [[0, -10, 'quadOut'], [0.3, -112], [0.6, -118], [0.95, -110], [1.2, -10]],
    'armUpperBack.rot':   [[0, 180], [0.3, 192], [1.2, 180]],
    'armLowerBack.rot':   [[0, -10], [0.3, -22], [1.2, -10]],
    'thighFront.rot':     [[0, 178], [0.3, 172], [1.2, 178]],
    'thighBack.rot':      [[0, 184], [0.3, 190], [1.2, 184]],
  },
  events: [
    { t: 0.30, name: 'sfx:inject' },
    { t: 1.15, name: 'consumeVial' },
  ],
}));

// ---------------------------------------------------------------- death
clips.push(clip({
  id: 'taro.death', duration: 0.9, loop: false,
  tracks: {
    'pelvis.y':           [[0, -90, 'quadIn'], [0.25, -78], [0.9, -24]],
    'torso.rot':          [[0, 2, 'quadOut'], [0.2, -14], [0.9, 62]],
    'chest.rot':          [[0, 0], [0.9, 20]],
    'head.rot':           [[0, 0, 'quadOut'], [0.2, -18], [0.9, 34]],
    'thighFront.rot':     [[0, 178], [0.9, 118]],
    'shinFront.rot':      [[0, 3], [0.9, 112]],
    'footFront.rot':      [[0, -90], [0.9, -66]],
    'thighBack.rot':      [[0, 184], [0.9, 138]],
    'shinBack.rot':       [[0, 5], [0.9, 96]],
    'armUpperFront.rot':  [[0, 180, 'quadOut'], [0.2, 214], [0.9, 156]],
    'armLowerFront.rot':  [[0, -10], [0.9, -26]],
    'armUpperBack.rot':   [[0, 180, 'quadOut'], [0.2, 220], [0.9, 200]],
    'armLowerBack.rot':   [[0, -10], [0.9, -20]],
  },
  events: [{ t: 0, name: 'sfx:death' }],
}));

console.log(`wrote ${clips.length} clips to ${OUT}`);
