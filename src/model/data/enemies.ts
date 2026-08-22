import { ENEMY } from '@/model/tuning';

export interface EnemyDef {
  id: string;
  name: string;
  width: number;
  height: number;
  maxHealth: number;
  patrolSpeed: number;
  chaseSpeed: number;
  aggroRange: number;
  attackRange: number;
  attackDamage: number;
  attackCooldown: number;
  loseInterestTime: number;
  lootTable: string;
  /** Rig used to draw it. */
  rig: string;
  /** Blood yield range, before passive bonuses. */
  blood: { min: number; max: number };
}

const defs: EnemyDef[] = [
  {
    id: 'mini_dino',
    name: 'Compy',
    ...ENEMY.miniDino,
    lootTable: 'mini_dino',
    rig: 'dino_small',
    blood: { min: 1, max: 5 },
  },
];

export const ENEMIES: ReadonlyMap<string, EnemyDef> = new Map(defs.map((d) => [d.id, d]));

export function enemy(id: string): EnemyDef {
  const def = ENEMIES.get(id);
  if (!def) throw new Error(`Unknown enemy "${id}"`);
  return def;
}
