import type { Slot } from '../domain/Inventory';

/** Bump on every shape change and add a migration. You will change this. */
export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  savedAt: number;
  playtimeMs: number;
  slotName: string;

  player: {
    levelId: string;
    x: number;
    y: number;
    facing: 1 | -1;
    hp: number;
    maxHp: number;
    bloodVials: number;
  };

  inventory: { slots: Slot[] };
  equipment: { weapon: string | null; passives: string[] };

  progression: {
    relics: number;
    flags: string[];
    unlockedRecipes: string[];
    unlockedLevels: string[];
    world: Record<string, { destroyed: string[]; killed: string[]; collected: string[]; triggered: string[] }>;
  };
}

/** Enough to render a slot in the load menu without deserialising the world. */
export interface SaveSummary {
  slot: string;
  savedAt: number;
  playtimeMs: number;
  levelId: string;
  levelName: string;
  hp: number;
  maxHp: number;
  relics: number;
}
