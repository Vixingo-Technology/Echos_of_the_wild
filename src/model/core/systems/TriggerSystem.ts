import type { CraftStation } from '@/model/data/recipes';
import type { Progression } from '@/model/domain/Progression';
import type { PlayerRuntime } from '@/model/domain/PlayerState';
import type { World } from '../World';
import { colliderOf, overlaps } from './CollisionSystem';

/**
 * Level exits, tutorial flags, forges and NPCs.
 *
 * Touch triggers fire on overlap; interact triggers only set `interactTarget`,
 * which is what puts the [E] prompt on screen and lets the controller decide
 * what pressing E means.
 */
export function triggerSystem(
  world: World,
  progression: Progression,
  runtime: PlayerRuntime,
  interactPressed: boolean,
): CraftStation {
  const player = world.player;
  runtime.interactTarget = null;
  if (!player || player.health!.current <= 0) return null;

  let station: CraftStation = null;

  const playerBox = colliderOf(player);
  let nearest: { id: number; distance: number } | null = null;

  for (const e of world.entities) {
    const trigger = e.trigger;
    if (!trigger || e.dead || !e.body) continue;
    if (!overlaps(playerBox, colliderOf(e))) continue;

    if (trigger.kind === 'forge') station = 'forge';

    if (trigger.requiresInteract) {
      const distance = Math.abs(e.transform.x - player.transform.x);
      if (!nearest || distance < nearest.distance) nearest = { id: e.id, distance };
      if (!interactPressed) continue;
    }

    if (trigger.once && (trigger.fired || (e.sourceId && progression.isConsumed(world.levelId, 'triggered', e.sourceId)))) {
      continue;
    }

    fire(world, progression, e.id);
  }

  if (nearest) runtime.interactTarget = nearest.id;
  return station;
}

function fire(world: World, progression: Progression, id: number): void {
  const e = world.get(id);
  const trigger = e?.trigger;
  if (!e || !trigger) return;

  trigger.fired = true;
  if (trigger.once && e.sourceId) progression.markConsumed(world.levelId, 'triggered', e.sourceId);

  switch (trigger.kind) {
    case 'exit':
      world.events.emit({
        type: 'LevelExitReached',
        toLevel: trigger.toLevel ?? '',
        spawn: trigger.spawn ?? 'start',
      });
      break;

    case 'flag':
      if (trigger.flag && progression.setFlag(trigger.flag)) {
        world.events.emit({ type: 'TutorialFlag', flag: trigger.flag });
      }
      break;

    case 'forge':
    case 'npc':
      // Handled by the controller through `interactTarget`; firing here just
      // records that the player has met them.
      if (trigger.flag && progression.setFlag(trigger.flag)) {
        world.events.emit({ type: 'TutorialFlag', flag: trigger.flag });
      }
      break;
  }
}
