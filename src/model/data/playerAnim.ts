import punch1 from '@/data/clips/taro.punch1.json';
import punch2 from '@/data/clips/taro.punch2.json';
import punch3 from '@/data/clips/taro.punch3.json';
import kick from '@/data/clips/taro.kick.json';
import hurt from '@/data/clips/taro.hurt.json';
import inject from '@/data/clips/taro.inject.json';
import death from '@/data/clips/taro.death.json';

export interface AttackClipInfo {
  clip: string;
  duration: number;
  /** Index into COMBAT.comboMultipliers. */
  combo: number;
  /** Base hitbox, before the equipped weapon's reach is added. Offsets are
   *  relative to the player's ground contact point and mirrored by facing. */
  box: { offsetX: number; offsetY: number; width: number; height: number };
  /** Read straight from the clip. `hitboxOn`/`hitboxOff` bracket the active
   *  frames, so the visuals and the damage window are the same data. */
  events: { t: number; name: string }[];
}

/**
 * Durations come straight from the clip JSON rather than being restated here,
 * so retuning a punch in the rig editor cannot desynchronise the state machine
 * from the animation.
 */
export const PUNCH_CHAIN: AttackClipInfo[] = [
  { clip: punch1.id, duration: punch1.duration, combo: 0, events: punch1.events,
    box: { offsetX: 42, offsetY: -134, width: 68, height: 106 } },
  { clip: punch2.id, duration: punch2.duration, combo: 1, events: punch2.events,
    box: { offsetX: 44, offsetY: -134, width: 70, height: 108 } },
  { clip: punch3.id, duration: punch3.duration, combo: 2, events: punch3.events,
    box: { offsetX: 50, offsetY: -144, width: 86, height: 126 } },
];

export const KICK: AttackClipInfo = {
  clip: kick.id,
  duration: kick.duration,
  combo: 0,
  events: kick.events,
  // The kick sweeps low, so it reaches ground-level targets a punch misses.
  box: { offsetX: 52, offsetY: -100, width: 82, height: 96 },
};

export const REACTION = {
  hurt: { clip: hurt.id, duration: hurt.duration },
  inject: { clip: inject.id, duration: inject.duration, events: inject.events },
  death: { clip: death.id, duration: death.duration },
} as const;

export const LOCOMOTION = {
  idle: 'taro.idle',
  walk: 'taro.walk',
  run: 'taro.run',
  crouch: 'taro.crouch',
  jumpRise: 'taro.jumpRise',
  jumpFall: 'taro.jumpFall',
  land: 'taro.land',
} as const;
