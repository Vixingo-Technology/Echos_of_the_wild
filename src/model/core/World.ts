import type { Entity, EntityId, EntityKind } from './types';
import { EventBus } from './EventBus';

export interface LevelGeometry {
  /** Solid blocking rectangles. */
  solids: { x: number; y: number; width: number; height: number }[];
  /** Platforms you can jump up through and drop down from. */
  oneWay: { x: number; y: number; width: number; height: number }[];
  /** Climbable columns (ladders, vines). */
  ladders: { x: number; y: number; width: number; height: number }[];
  width: number;
  height: number;
}

export const EMPTY_GEOMETRY: LevelGeometry = {
  solids: [], oneWay: [], ladders: [], width: 0, height: 0,
};

/**
 * The simulation's container. Deliberately a plain entity list rather than an
 * archetype ECS: this game has dozens of entities, not tens of thousands, and
 * readable systems are worth far more here than cache locality.
 */
export class World {
  readonly events = new EventBus();

  entities: Entity[] = [];
  geometry: LevelGeometry = EMPTY_GEOMETRY;
  levelId = '';

  /** Elapsed simulated time, seconds. Drives cooldowns and playtime. */
  elapsed = 0;

  private nextId: EntityId = 1;
  private byId = new Map<EntityId, Entity>();
  private playerId: EntityId | null = null;

  spawn(entity: Omit<Entity, 'id'>): Entity {
    const created = { ...entity, id: this.nextId++ } as Entity;
    this.entities.push(created);
    this.byId.set(created.id, created);
    if (created.kind === 'player') this.playerId = created.id;
    return created;
  }

  get(id: EntityId): Entity | undefined {
    return this.byId.get(id);
  }

  get player(): Entity | undefined {
    return this.playerId === null ? undefined : this.byId.get(this.playerId);
  }

  *ofKind(kind: EntityKind): Generator<Entity> {
    for (const e of this.entities) {
      if (e.kind === kind && !e.dead) yield e;
    }
  }

  /** Remove everything marked dead. Called once per tick, never mid-system. */
  reap(): void {
    if (!this.entities.some((e) => e.dead)) return;
    for (const e of this.entities) {
      if (e.dead) {
        this.byId.delete(e.id);
        if (e.id === this.playerId) this.playerId = null;
      }
    }
    this.entities = this.entities.filter((e) => !e.dead);
  }

  /** Drop every entity but keep the id counter, so ids stay unique per session. */
  clearEntities(): void {
    this.entities = [];
    this.byId.clear();
    this.playerId = null;
    this.events.clear();
  }
}
