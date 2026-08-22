export type CraftStation = null | 'forge';

export interface Recipe {
  id: string;
  /** Item produced. Also the recipe's display name and icon. */
  output: { item: string; qty: number };
  ingredients: { item: string; qty: number }[];
  /** null crafts anywhere; 'forge' needs Taro to be standing at one. */
  station: CraftStation;
  /** Progression flag that reveals the recipe. null means known from the start. */
  unlockedBy: string | null;
}

const defs: Recipe[] = [
  {
    id: 'bone_club',
    output: { item: 'bone_club', qty: 1 },
    ingredients: [{ item: 'dino_bone', qty: 3 }, { item: 'wood', qty: 2 }],
    station: null,
    unlockedBy: null,
  },
  {
    id: 'stone_axe',
    output: { item: 'stone_axe', qty: 1 },
    ingredients: [{ item: 'stone', qty: 4 }, { item: 'wood', qty: 3 }],
    station: null,
    unlockedBy: 'found_stone',
  },
  {
    id: 'swift_boots',
    output: { item: 'swift_boots', qty: 1 },
    ingredients: [{ item: 'wood', qty: 4 }, { item: 'dino_bone', qty: 2 }],
    station: null,
    unlockedBy: 'found_wood',
  },
  // Smelting is what ties mining to the shop: nuggets are not money, bars are.
  {
    id: 'gold_bar',
    output: { item: 'gold_bar', qty: 1 },
    ingredients: [{ item: 'gold_nugget', qty: 3 }],
    station: 'forge',
    unlockedBy: 'found_forge',
  },
  {
    id: 'iron_blade',
    output: { item: 'iron_blade', qty: 1 },
    ingredients: [{ item: 'iron_ore', qty: 4 }, { item: 'wood', qty: 2 }, { item: 'gold_bar', qty: 1 }],
    station: 'forge',
    unlockedBy: 'found_forge',
  },
  {
    id: 'iron_skin',
    output: { item: 'iron_skin', qty: 1 },
    ingredients: [{ item: 'iron_ore', qty: 5 }, { item: 'dino_bone', qty: 2 }],
    station: 'forge',
    unlockedBy: 'found_forge',
  },
  {
    id: 'gold_spear',
    output: { item: 'gold_spear', qty: 1 },
    ingredients: [{ item: 'gold_bar', qty: 3 }, { item: 'iron_ore', qty: 2 }, { item: 'wood', qty: 2 }],
    station: 'forge',
    unlockedBy: 'found_forge',
  },
  {
    id: 'blood_harvest',
    output: { item: 'blood_harvest', qty: 1 },
    ingredients: [{ item: 'rare_egg', qty: 1 }, { item: 'dino_bone', qty: 3 }],
    station: 'forge',
    unlockedBy: 'found_egg',
  },
];

export const RECIPES: readonly Recipe[] = defs;
export const RECIPE_BY_ID: ReadonlyMap<string, Recipe> = new Map(defs.map((r) => [r.id, r]));
