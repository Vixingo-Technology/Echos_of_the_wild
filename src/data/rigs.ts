import type { ChainParams, CompiledClip, CompiledRig } from '@/anim';
import { TARO_CHAINS, TARO_CLIPS, TARO_RIG } from './taro';
import { DINO_SMALL_CHAINS, DINO_SMALL_CLIPS, DINO_SMALL_RIG } from './dinoSmall';

export interface RigBundle {
  rig: CompiledRig;
  clips: CompiledClip[];
  chains: ChainParams[];
}

/** Every rig the renderer can instantiate, keyed by rig id. */
export const RIGS: ReadonlyMap<string, RigBundle> = new Map([
  ['taro', { rig: TARO_RIG, clips: TARO_CLIPS, chains: TARO_CHAINS }],
  ['dino_small', { rig: DINO_SMALL_RIG, clips: DINO_SMALL_CLIPS, chains: DINO_SMALL_CHAINS }],
]);

export function rigBundle(id: string): RigBundle {
  const bundle = RIGS.get(id);
  if (!bundle) throw new Error(`No rig registered for "${id}"`);
  return bundle;
}
