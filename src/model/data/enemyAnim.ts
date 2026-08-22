import bite from '@/data/clips/dino_small.bite.json';
import hurt from '@/data/clips/dino_small.hurt.json';
import death from '@/data/clips/dino_small.death.json';

export interface EnemyAttackInfo {
  clip: string;
  duration: number;
  events: { t: number; name: string }[];
  box: { offsetX: number; offsetY: number; width: number; height: number };
}

/** Same principle as the player: the clip owns the active frames. */
export const ENEMY_ANIM = {
  mini_dino: {
    idle: 'dino_small.idle',
    walk: 'dino_small.walk',
    run: 'dino_small.run',
    hurt: { clip: hurt.id, duration: hurt.duration },
    death: { clip: death.id, duration: death.duration },
    attack: {
      clip: bite.id,
      duration: bite.duration,
      events: bite.events,
      box: { offsetX: 58, offsetY: -70, width: 62, height: 44 },
    } satisfies EnemyAttackInfo,
  },
} as const;
