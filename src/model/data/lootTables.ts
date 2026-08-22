export interface LootEntry {
  item: string;
  min: number;
  max: number;
  /** 0..1 chance this entry rolls at all. */
  chance: number;
}

/**
 * Weighted drops, rolled per entry rather than picking one. A rock that yields
 * both stone and an occasional nugget is two entries, not a weighted table.
 */
export const LOOT_TABLES: Record<string, LootEntry[]> = {
  mini_dino: [
    { item: 'dino_bone', min: 1, max: 2, chance: 1 },
  ],
  apple_tree: [
    { item: 'wood', min: 4, max: 6, chance: 1 },
  ],
  stone: [
    { item: 'stone', min: 2, max: 4, chance: 1 },
    { item: 'gold_nugget', min: 1, max: 1, chance: 0.15 },
  ],
  iron_vein: [
    { item: 'iron_ore', min: 1, max: 3, chance: 1 },
    { item: 'stone', min: 1, max: 2, chance: 1 },
  ],
  gold_vein: [
    { item: 'gold_nugget', min: 2, max: 4, chance: 1 },
    { item: 'stone', min: 1, max: 2, chance: 0.6 },
  ],
};

export type Rng = () => number;

export function rollLoot(tableId: string, rng: Rng): { item: string; qty: number }[] {
  const table = LOOT_TABLES[tableId];
  if (!table) return [];

  const drops: { item: string; qty: number }[] = [];
  for (const entry of table) {
    if (rng() > entry.chance) continue;
    const qty = entry.min + Math.floor(rng() * (entry.max - entry.min + 1));
    if (qty > 0) drops.push({ item: entry.item, qty });
  }
  return drops;
}
