import { parseLevel, type LevelData, type TiledMap } from '@/model/data/levels';
import cave01 from './levels/cave_01.json';

const RAW: Record<string, unknown> = {
  cave_01: cave01,
};

const cache = new Map<string, LevelData>();

export function loadLevel(id: string): LevelData {
  const cached = cache.get(id);
  if (cached) return cached;

  const raw = RAW[id];
  if (!raw) throw new Error(`No level data for "${id}"`);

  const parsed = parseLevel(id, raw as TiledMap);
  cache.set(id, parsed);
  return parsed;
}

export const LEVEL_IDS = Object.keys(RAW);
