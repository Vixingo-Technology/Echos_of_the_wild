import type { Game } from '../Game';
import { SAVE_VERSION, type SaveData } from './SaveSchema';
import { migrate } from './Migrations';

export function serialize(game: Game, slotName: string): SaveData {
  const player = game.world.player;
  const health = game.blood.component;

  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    playtimeMs: Math.round(game.playtimeMs),
    slotName,
    player: {
      levelId: game.world.levelId,
      x: player?.transform.x ?? 0,
      y: player?.transform.y ?? 0,
      facing: player?.transform.facing ?? 1,
      hp: health.current,
      maxHp: health.max,
      bloodVials: game.blood.vials,
    },
    inventory: { slots: game.inventory.toJSON() },
    equipment: game.equipment.toJSON(),
    progression: game.progression.toJSON(),
  };
}

/**
 * Restores a game in place.
 *
 * The caller supplies `loadLevel` so the model never has to know how levels are
 * fetched. Position is applied AFTER the level loads, because loading spawns
 * Taro at the level's spawn point first.
 */
export function deserialize(
  game: Game,
  raw: unknown,
  loadLevel: (id: string) => void,
): SaveData {
  const data = migrate(raw);

  game.newGame();
  game.inventory.clear();
  game.inventory.load(data.inventory.slots);
  game.equipment.load(data.equipment);
  game.progression.load(data.progression);
  game.playtimeMs = data.playtimeMs;

  loadLevel(data.player.levelId);

  const player = game.world.player;
  if (player) {
    player.transform.x = data.player.x;
    player.transform.y = data.player.y;
    player.transform.facing = data.player.facing;
  }

  const health = game.blood.component;
  health.max = data.player.maxHp;
  health.current = data.player.hp;
  health.invulnerable = 0;
  health.hitstop = 0;
  game.blood.vials = data.player.bloodVials;

  return data;
}
