/** Per-level record of what the player has already changed, so it persists. */
export interface WorldFlags {
  destroyed: string[];
  killed: string[];
  collected: string[];
  triggered: string[];
}

const emptyFlags = (): WorldFlags => ({ destroyed: [], killed: [], collected: [], triggered: [] });

/**
 * Everything that outlives a single level: tutorial beats, unlocked recipes,
 * relics, and which scenery the player has already flattened.
 */
export class Progression {
  relics = 0;
  flags = new Set<string>();
  unlockedRecipes = new Set<string>();
  unlockedLevels = new Set<string>(['cave_01']);
  private world = new Map<string, WorldFlags>();

  setFlag(flag: string): boolean {
    if (this.flags.has(flag)) return false;
    this.flags.add(flag);
    return true;
  }

  hasFlag(flag: string): boolean {
    return this.flags.has(flag);
  }

  flagsFor(levelId: string): WorldFlags {
    let f = this.world.get(levelId);
    if (!f) {
      f = emptyFlags();
      this.world.set(levelId, f);
    }
    return f;
  }

  /** @param sourceId the Tiled object id, which is stable across level edits. */
  markConsumed(levelId: string, list: keyof WorldFlags, sourceId: string): void {
    const flags = this.flagsFor(levelId);
    if (!flags[list].includes(sourceId)) flags[list].push(sourceId);
  }

  isConsumed(levelId: string, list: keyof WorldFlags, sourceId: string): boolean {
    return this.flagsFor(levelId)[list].includes(sourceId);
  }

  toJSON() {
    return {
      relics: this.relics,
      flags: [...this.flags],
      unlockedRecipes: [...this.unlockedRecipes],
      unlockedLevels: [...this.unlockedLevels],
      world: Object.fromEntries(this.world),
    };
  }

  load(data: ReturnType<Progression['toJSON']>): void {
    this.relics = data.relics;
    this.flags = new Set(data.flags);
    this.unlockedRecipes = new Set(data.unlockedRecipes);
    this.unlockedLevels = new Set(data.unlockedLevels);
    this.world = new Map(Object.entries(data.world ?? {}));
  }

  reset(): void {
    this.relics = 0;
    this.flags.clear();
    this.unlockedRecipes.clear();
    this.unlockedLevels = new Set(['cave_01']);
    this.world.clear();
  }
}
