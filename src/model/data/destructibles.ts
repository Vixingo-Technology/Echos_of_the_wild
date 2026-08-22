export interface DestructibleDef {
  kind: string;
  name: string;
  maxHealth: number;
  width: number;
  height: number;
  lootTable: string;
  /** Granted on each hit, on a cooldown and a cap - a tree is a source of a
   *  few apples, not an infinite one. */
  hitDrop?: { item: string; qty: number; cooldown: number; maxTotal: number };
  /** Rolled per hit, only when the level marks this object as having one. */
  secret?: { item: string; chance: number };
  /** Progression flag set the first time one is broken, which is what reveals
   *  the recipes that use its output. */
  unlockFlag?: string;
}

const defs: DestructibleDef[] = [
  {
    kind: 'apple_tree',
    name: 'Apple Tree',
    maxHealth: 12,
    width: 104,
    height: 200,
    lootTable: 'apple_tree',
    hitDrop: { item: 'apple', qty: 1, cooldown: 3, maxTotal: 3 },
    secret: { item: 'rare_egg', chance: 0.08 },
    unlockFlag: 'found_wood',
  },
  { kind: 'stone', name: 'Boulder', maxHealth: 8, width: 72, height: 62,
    lootTable: 'stone', unlockFlag: 'found_stone' },
  { kind: 'iron_vein', name: 'Iron Vein', maxHealth: 14, width: 76, height: 68,
    lootTable: 'iron_vein', unlockFlag: 'found_stone' },
  { kind: 'gold_vein', name: 'Gold Vein', maxHealth: 20, width: 78, height: 70,
    lootTable: 'gold_vein', unlockFlag: 'found_stone' },
];

export const DESTRUCTIBLES: ReadonlyMap<string, DestructibleDef> = new Map(defs.map((d) => [d.kind, d]));

export function destructible(kind: string): DestructibleDef {
  const def = DESTRUCTIBLES.get(kind);
  if (!def) throw new Error(`Unknown destructible "${kind}"`);
  return def;
}
