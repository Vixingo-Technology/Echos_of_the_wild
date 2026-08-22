import { RECIPES, type CraftStation, type Recipe } from '@/model/data/recipes';
import type { Inventory } from './Inventory';
import type { Progression } from './Progression';

export type CraftFailure = 'locked' | 'wrong-station' | 'missing-materials' | 'bag-full';

export interface RecipeStatus {
  recipe: Recipe;
  unlocked: boolean;
  craftable: boolean;
  /** Per-ingredient have/need, for the UI's counts. */
  ingredients: { item: string; have: number; need: number }[];
  blockedBy: CraftFailure | null;
}

export function isUnlocked(recipe: Recipe, progression: Progression): boolean {
  if (recipe.unlockedBy === null) return true;
  return progression.hasFlag(recipe.unlockedBy) || progression.unlockedRecipes.has(recipe.id);
}

/** Everything the crafting tab needs, computed in one pass. */
export function recipeStatuses(
  inventory: Inventory,
  progression: Progression,
  station: CraftStation,
): RecipeStatus[] {
  return RECIPES.map((recipe) => {
    const unlocked = isUnlocked(recipe, progression);
    const ingredients = recipe.ingredients.map((i) => ({
      item: i.item,
      have: inventory.count(i.item),
      need: i.qty,
    }));
    const hasMaterials = ingredients.every((i) => i.have >= i.need);
    const rightStation = recipe.station === null || recipe.station === station;

    let blockedBy: CraftFailure | null = null;
    if (!unlocked) blockedBy = 'locked';
    else if (!rightStation) blockedBy = 'wrong-station';
    else if (!hasMaterials) blockedBy = 'missing-materials';

    return { recipe, unlocked, craftable: blockedBy === null, ingredients, blockedBy };
  });
}

export type CraftResult = { ok: true; item: string; qty: number } | { ok: false; reason: CraftFailure };

/**
 * Consumes ingredients and grants the output. Validates first and mutates
 * second, so a failed craft can never eat half the materials.
 */
export function craft(
  recipeId: string,
  inventory: Inventory,
  progression: Progression,
  station: CraftStation,
): CraftResult {
  const status = recipeStatuses(inventory, progression, station).find((s) => s.recipe.id === recipeId);
  if (!status) return { ok: false, reason: 'locked' };
  if (status.blockedBy) return { ok: false, reason: status.blockedBy };

  const { recipe } = status;
  if (inventory.isFull && inventory.count(recipe.output.item) === 0) {
    return { ok: false, reason: 'bag-full' };
  }

  for (const ing of recipe.ingredients) inventory.remove(ing.item, ing.qty);
  const added = inventory.add(recipe.output.item, recipe.output.qty);
  if (added === 0) {
    // Bag filled up between the check and the add: put the materials back.
    for (const ing of recipe.ingredients) inventory.add(ing.item, ing.qty);
    return { ok: false, reason: 'bag-full' };
  }

  return { ok: true, item: recipe.output.item, qty: added };
}
