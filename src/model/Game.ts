import { PLAYER } from './tuning';
import { World } from './core/World';
import { physicsSystem } from './core/systems/PhysicsSystem';
import { collisionSystem } from './core/systems/CollisionSystem';
import { combatSystem } from './core/systems/CombatSystem';
import { aiSystem } from './core/systems/AISystem';
import { pickupSystem } from './core/systems/PickupSystem';
import { triggerSystem } from './core/systems/TriggerSystem';
import { lifetimeSystem } from './core/systems/LifetimeSystem';

import { createHealth, HealthPool } from './domain/HealthPool';
import { Inventory } from './domain/Inventory';
import { Equipment } from './domain/Equipment';
import { Progression } from './domain/Progression';
import { craft, recipeStatuses, type CraftResult, type RecipeStatus } from './domain/Crafting';
import {
  createPlayerRuntime, enterHurt, NO_INTENT, updatePlayer,
  type PlayerIntent, type PlayerRuntime,
} from './domain/PlayerState';

import { enemy } from './data/enemies';
import { destructible } from './data/destructibles';
import { ENEMY_ANIM } from './data/enemyAnim';
import { LOCOMOTION } from './data/playerAnim';
import { CURRENCY_ITEM, item } from './data/items';
import type { CraftStation } from './data/recipes';
import type { LevelData, LevelEntity } from './data/levels';
import type { Rng } from './data/lootTables';
import type { Body } from './core/types';

const body = (width: number, height: number, gravityScale = 1): Body => ({
  width, height,
  onGround: false,
  gravityScale,
  timeOffGround: 0,
  dropThrough: 0,
  justLanded: false,
  landingSpeed: 0,
});

/**
 * The model's public face: one object the controller drives with intents and
 * the view reads through the bridge. Nothing in here knows what a canvas is.
 */
export class Game {
  readonly world = new World();
  readonly runtime: PlayerRuntime = createPlayerRuntime();
  readonly blood = new HealthPool();
  readonly inventory = new Inventory();
  readonly equipment = new Equipment();
  readonly progression = new Progression();

  /** Crafting station Taro is currently standing at, if any. */
  station: CraftStation = null;
  playtimeMs = 0;
  level: LevelData | null = null;

  constructor(private readonly rng: Rng = Math.random) {}

  // ------------------------------------------------------------- lifecycle

  newGame(): void {
    this.blood.reset();
    this.inventory.clear();
    this.equipment.reset();
    this.progression.reset();
    this.playtimeMs = 0;
    Object.assign(this.runtime, createPlayerRuntime());
    this.inventory.add('portal_remote', 1);
  }

  /**
   * Rebuilds the world from level data. Health carries across levels because
   * the pool keeps its component; only `newGame` resets it.
   */
  loadLevel(level: LevelData, spawnName = 'start'): void {
    const world = this.world;
    world.clearEntities();
    world.geometry = level.geometry;
    world.levelId = level.id;
    this.level = level;
    this.station = null;
    Object.assign(this.runtime, createPlayerRuntime());

    const spawn = level.spawns[spawnName] ?? level.spawns.start ?? { x: 128, y: 256 };

    const health = this.blood.component;
    health.invulnerable = 0;
    health.hitstop = 0;
    if (health.current <= 0) health.current = health.max;

    world.spawn({
      kind: 'player',
      transform: { x: spawn.x, y: spawn.y, facing: 1 },
      velocity: { x: 0, y: 0 },
      body: body(PLAYER.width, PLAYER.height),
      health,
      anim: { clip: LOCOMOTION.idle, restartToken: 0, crossfade: 0.1, speed: 1 },
    });

    for (const entity of level.entities) this.spawnLevelEntity(entity);
  }

  private spawnLevelEntity(spec: LevelEntity): void {
    const { world, progression } = this;
    const levelId = world.levelId;

    switch (spec.kind) {
      case 'enemy': {
        if (progression.isConsumed(levelId, 'killed', spec.sourceId)) return;
        const def = enemy(String(spec.props.enemyType ?? 'mini_dino'));
        world.spawn({
          kind: 'enemy',
          sourceId: spec.sourceId,
          enemyType: def.id,
          transform: { x: spec.x, y: spec.y, facing: -1 },
          velocity: { x: 0, y: 0 },
          body: body(def.width, def.height),
          health: createHealth(def.maxHealth),
          ai: {
            mode: 'patrol',
            patrolMinX: Number(spec.props.patrolMinX ?? spec.x - 200),
            patrolMaxX: Number(spec.props.patrolMaxX ?? spec.x + 200),
            attackCooldown: 0,
            interest: 0,
            timer: 0,
          },
          anim: { clip: ENEMY_ANIM.mini_dino.idle, restartToken: 0, crossfade: 0.12, speed: 1 },
        });
        return;
      }

      case 'destructible': {
        if (progression.isConsumed(levelId, 'destroyed', spec.sourceId)) return;
        const def = destructible(String(spec.props.kind ?? 'stone'));
        world.spawn({
          kind: 'destructible',
          sourceId: spec.sourceId,
          transform: { x: spec.x, y: spec.y, facing: 1 },
          body: body(def.width, def.height, 0),
          health: createHealth(def.maxHealth),
          destructible: {
            hits: 0,
            maxHits: def.maxHealth,
            ...(def.hitDrop ? { hitDrop: def.hitDrop } : {}),
            hitDropCooldown: 0,
            hitDropsGiven: 0,
            lootTable: def.lootTable,
            // The nest only exists where the level says it does, so a hidden
            // find is authored rather than uniformly random.
            ...(def.secret && spec.props.hasNest ? { secret: def.secret } : {}),
          },
          anim: { clip: String(spec.props.kind ?? 'stone'), restartToken: 0, crossfade: 0, speed: 1 },
        });
        return;
      }

      case 'exit':
        world.spawn({
          kind: 'trigger', sourceId: spec.sourceId,
          transform: { x: spec.x, y: spec.y, facing: 1 },
          body: body(spec.width, spec.height, 0),
          trigger: {
            kind: 'exit', once: false, fired: false, requiresInteract: false,
            toLevel: String(spec.props.toLevel ?? ''),
            spawn: String(spec.props.spawn ?? 'start'),
          },
        });
        return;

      case 'trigger':
        world.spawn({
          kind: 'trigger', sourceId: spec.sourceId,
          transform: { x: spec.x, y: spec.y, facing: 1 },
          body: body(spec.width, spec.height, 0),
          trigger: {
            kind: 'flag',
            once: spec.props.once !== false,
            fired: false,
            requiresInteract: false,
            flag: String(spec.props.flag ?? ''),
          },
        });
        return;

      case 'forge':
      case 'npc':
        world.spawn({
          kind: 'trigger', sourceId: spec.sourceId,
          transform: { x: spec.x, y: spec.y, facing: 1 },
          body: body(spec.width, spec.height, 0),
          trigger: {
            kind: spec.kind,
            once: true,
            fired: false,
            requiresInteract: spec.kind === 'npc',
            flag: String(spec.props.flag ?? (spec.kind === 'forge' ? 'found_forge' : '')),
            prompt: spec.kind === 'npc' ? 'Trade' : 'Forge',
          },
        });
        return;
    }
  }

  // ------------------------------------------------------------------ step

  /** One fixed simulation tick. */
  step(dt: number, intent: PlayerIntent = NO_INTENT): void {
    const { world, runtime, blood, equipment, inventory, progression } = this;
    this.playtimeMs += dt * 1000;

    const player = world.player;
    if (player) {
      updatePlayer({ world, entity: player, runtime, health: blood, equipment, intent, dt });
    }

    aiSystem(world, dt);
    physicsSystem(world, dt);
    collisionSystem(world, dt);

    combatSystem(
      {
        world, blood, equipment, progression, rng: this.rng,
        onPlayerHurt: () => {
          const p = world.player;
          if (p) enterHurt({ world, entity: p, runtime });
        },
      },
      dt,
    );

    pickupSystem(world, inventory, dt);
    this.station = triggerSystem(world, progression, runtime, intent.interactPressed);
    lifetimeSystem(world, dt);
    blood.update(dt);

    // Falling out of the level is fatal rather than silently clamped, so a
    // hole in the geometry shows up as a bug instead of as a stuck player.
    if (player && world.geometry.height > 0 && player.transform.y > world.geometry.height + 400) {
      player.health!.current = 0;
    }

    world.reap();
    world.elapsed += dt;
  }

  // ---------------------------------------------------------------- queries

  get gold(): number {
    return this.inventory.count(CURRENCY_ITEM);
  }

  get isDead(): boolean {
    return this.blood.isDead;
  }

  /** True once the death animation has finished, so the UI can take over. */
  get isGameOver(): boolean {
    return this.runtime.action === 'dead' && this.runtime.actionTime >= this.runtime.actionDuration;
  }

  recipes(): RecipeStatus[] {
    return recipeStatuses(this.inventory, this.progression, this.station);
  }

  // ---------------------------------------------------------------- actions

  craft(recipeId: string): CraftResult {
    const result = craft(recipeId, this.inventory, this.progression, this.station);
    if (result.ok) {
      this.world.events.emit({ type: 'ItemCrafted', item: result.item });
      this.world.events.emit({ type: 'Sfx', name: 'craft' });
    }
    return result;
  }

  equipWeapon(itemId: string | null): boolean {
    if (itemId !== null && !this.inventory.has(itemId)) return false;
    const ok = this.equipment.equipWeapon(itemId);
    if (ok) this.world.events.emit({ type: 'ItemEquipped', item: itemId });
    return ok;
  }

  equipPassive(itemId: string, replaceIndex?: number): boolean {
    if (!this.inventory.has(itemId)) return false;
    const ok = this.equipment.equipPassive(itemId, replaceIndex);
    if (ok) this.world.events.emit({ type: 'ItemEquipped', item: itemId });
    return ok;
  }

  unequipPassive(itemId: string): boolean {
    return this.equipment.unequipPassive(itemId);
  }

  /** Eat a consumable. Returns false when it would do nothing. */
  useItem(itemId: string): boolean {
    const def = item(itemId);
    if (def.category !== 'consumable' || !def.heal) return false;
    if (this.blood.isFull) return false;
    if (!this.inventory.remove(itemId, 1)) return false;

    const healed = this.blood.heal(Math.round(def.heal * this.equipment.modifiers.healBonus));
    this.world.events.emit({ type: 'ItemRemoved', item: itemId, qty: 1 });
    this.world.events.emit({ type: 'PlayerHealed', amount: healed });
    this.world.events.emit({ type: 'Sfx', name: 'eat' });
    return true;
  }
}
