import { compileClip, compileRig, type ChainParams, type ClipDef, type RigDef } from '@/anim';

import rigDef from './rigs/dino_small.rig.json';
import idle from './clips/dino_small.idle.json';
import walk from './clips/dino_small.walk.json';
import run from './clips/dino_small.run.json';
import bite from './clips/dino_small.bite.json';
import hurt from './clips/dino_small.hurt.json';
import death from './clips/dino_small.death.json';

export const DINO_SMALL_RIG = compileRig(rigDef as unknown as RigDef);

const CLIP_DEFS = [idle, walk, run, bite, hurt, death] as unknown as ClipDef[];

export const DINO_SMALL_CLIPS = CLIP_DEFS.map((def) => compileClip(def, DINO_SMALL_RIG));
export const DINO_SMALL_CLIP_DEFS = CLIP_DEFS;

/**
 * The tail simulates itself, which is most of why a dinosaur rig is cheap to
 * build: authoring the body is enough, and the tail does the work that sells it.
 */
export const DINO_SMALL_CHAINS: ChainParams[] = [
  {
    bones: ['tailA', 'tailB', 'tailC'],
    anchor: 'hip',
    segmentLength: 20,
    gravity: 900,
    damping: 0.015,
    stiffness: 0.42,
    weight: 1,
    restAngle: 190,
    iterations: 3,
  },
];
