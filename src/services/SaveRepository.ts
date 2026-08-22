import { del, get, keys, set } from 'idb-keyval';
import type { SaveData, SaveSummary } from '@/model/save/SaveSchema';

const PREFIX = 'dinopunk:save:';
export const MANUAL_SLOTS = ['slot-1', 'slot-2', 'slot-3'] as const;
export const AUTOSAVE_SLOT = 'autosave';
export const ALL_SLOTS = [...MANUAL_SLOTS, AUTOSAVE_SLOT];

const keyFor = (slot: string) => `${PREFIX}${slot}`;

/**
 * IndexedDB rather than localStorage: saves carry the whole world-flag map and
 * will outgrow the 5MB string quota once there are a dozen levels.
 */
export const SaveRepository = {
  async write(slot: string, data: SaveData): Promise<void> {
    await set(keyFor(slot), data);
  },

  async read(slot: string): Promise<SaveData | null> {
    const data = await get<SaveData>(keyFor(slot));
    return data ?? null;
  },

  async remove(slot: string): Promise<void> {
    await del(keyFor(slot));
  },

  async list(levelName: (id: string) => string): Promise<Record<string, SaveSummary | null>> {
    const present = new Set((await keys()).map(String).filter((k) => k.startsWith(PREFIX)));
    const out: Record<string, SaveSummary | null> = {};

    for (const slot of ALL_SLOTS) {
      if (!present.has(keyFor(slot))) {
        out[slot] = null;
        continue;
      }
      const data = await get<SaveData>(keyFor(slot));
      out[slot] = data
        ? {
            slot,
            savedAt: data.savedAt,
            playtimeMs: data.playtimeMs,
            levelId: data.player.levelId,
            levelName: levelName(data.player.levelId),
            hp: data.player.hp,
            maxHp: data.player.maxHp,
            relics: data.progression.relics,
          }
        : null;
    }
    return out;
  },
};
