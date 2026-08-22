import type { EntityId } from './types';

/**
 * Everything the outside world is allowed to learn about the simulation.
 *
 * The renderer, the audio service and the React store all react to these
 * rather than reading model internals, which is what keeps the model free to
 * change shape without breaking three other layers.
 */
export type GameEvent =
  | { type: 'DamageDealt'; targetId: EntityId; sourceId: EntityId; amount: number; killed: boolean; x: number; y: number }
  | { type: 'PlayerHurt'; amount: number; remaining: number }
  | { type: 'PlayerDied' }
  | { type: 'PlayerHealed'; amount: number }
  | { type: 'EnemyKilled'; enemyId: EntityId; enemyType: string; x: number; y: number }
  | { type: 'BloodGained'; amount: number }
  | { type: 'BloodConsumed' }
  | { type: 'InjectStarted' }
  | { type: 'InjectCancelled' }
  | { type: 'ItemAdded'; item: string; qty: number }
  | { type: 'ItemRemoved'; item: string; qty: number }
  | { type: 'ItemCrafted'; item: string }
  | { type: 'ItemEquipped'; item: string | null }
  | { type: 'DestructibleHit'; entityId: EntityId; remaining: number }
  | { type: 'DestructibleBroken'; entityId: EntityId; x: number; y: number }
  | { type: 'SecretFound'; item: string; x: number; y: number }
  | { type: 'LevelExitReached'; toLevel: string; spawn: string }
  | { type: 'TutorialFlag'; flag: string }
  | { type: 'Sfx'; name: string }
  | { type: 'CameraShake'; strength: number };

export type GameEventType = GameEvent['type'];

/**
 * A queue, not a dispatcher: handlers run when the frame drains it, never
 * re-entrantly in the middle of a system. That keeps a hit that spawns loot
 * that fires a pickup from mutating the entity list mid-iteration.
 */
export class EventBus {
  private queue: GameEvent[] = [];

  emit(event: GameEvent): void {
    this.queue.push(event);
  }

  /** Take everything queued and clear the buffer. */
  drain(): GameEvent[] {
    if (this.queue.length === 0) return [];
    const events = this.queue;
    this.queue = [];
    return events;
  }

  get pending(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue.length = 0;
  }
}
