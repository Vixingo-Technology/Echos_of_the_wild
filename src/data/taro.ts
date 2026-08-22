import { compileClip, compileRig, type ChainParams, type ClipDef, type RigDef } from '@/anim';

import rigDef from './rigs/taro.rig.json';
import idle from './clips/taro.idle.json';
import walk from './clips/taro.walk.json';
import run from './clips/taro.run.json';
import crouch from './clips/taro.crouch.json';
import jumpRise from './clips/taro.jumpRise.json';
import jumpFall from './clips/taro.jumpFall.json';
import land from './clips/taro.land.json';
import punch1 from './clips/taro.punch1.json';
import punch2 from './clips/taro.punch2.json';
import punch3 from './clips/taro.punch3.json';
import kick from './clips/taro.kick.json';
import hurt from './clips/taro.hurt.json';
import inject from './clips/taro.inject.json';
import death from './clips/taro.death.json';

export const TARO_RIG = compileRig(rigDef as unknown as RigDef);

const CLIP_DEFS = [
  idle, walk, run, crouch, jumpRise, jumpFall, land,
  punch1, punch2, punch3, kick, hurt, inject, death,
] as unknown as ClipDef[];

export const TARO_CLIPS = CLIP_DEFS.map((def) => compileClip(def, TARO_RIG));

/**
 * Coat and hair are simulated rather than authored. `restAngle` is measured in
 * the anchor bone's local space, where the anchor's +X axis points along the
 * bone - so 180 on the upward-pointing torso means "hangs straight down".
 */
export const TARO_CHAINS: ChainParams[] = [
  {
    bones: ['coatA', 'coatB', 'coatC'],
    anchor: 'chest',
    segmentLength: 28,
    gravity: 2600,
    damping: 0.02,
    stiffness: 0.12,
    weight: 1,
    restAngle: 180,
    iterations: 3,
  },
  {
    bones: ['hairA', 'hairB'],
    anchor: 'head',
    segmentLength: 14,
    gravity: 1500,
    damping: 0.008,
    stiffness: 0.35,
    weight: 1,
    restAngle: 200,
    iterations: 3,
  },
];

/**
 * Raw (uncompiled) clip definitions, exposed so the rig editor can edit
 * keyframes and re-emit the JSON that lives in `src/data/clips/`.
 */
export const TARO_CLIP_DEFS = CLIP_DEFS;
