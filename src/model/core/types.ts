export type EntityId = number;

export type EntityKind = 'player' | 'enemy' | 'pickup' | 'destructible' | 'trigger' | 'prop';

export type Facing = 1 | -1;

export interface Transform {
  /** Ground contact point: x is the collider's centre, y is its BOTTOM edge,
   *  matching the rig's origin so a pose drops straight onto the world. */
  x: number;
  y: number;
  facing: Facing;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface Body {
  width: number;
  height: number;
  /** Set by CollisionSystem each tick. */
  onGround: boolean;
  /** Solid entities block movement; non-solid ones only report overlaps. */
  gravityScale: number;
  /** Seconds since the entity was last on the ground, for coyote time. */
  timeOffGround: number;
  /** While positive, one-way platforms are ignored so the entity drops through. */
  dropThrough: number;
  /** True on the tick the entity went from airborne to grounded. */
  justLanded: boolean;
  /** Downward speed at the moment of landing, for squash and landing SFX. */
  landingSpeed: number;
}

export interface Health {
  current: number;
  max: number;
  /** Remaining invulnerability, seconds. */
  invulnerable: number;
  /** Remaining hitstop, seconds. Frozen entities skip physics and AI. */
  hitstop: number;
}

/** An axis-aligned box in world space. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * An active attack volume. Offsets are relative to the owner's transform and
 * mirrored by facing, so one definition serves both directions.
 */
export interface Hitbox {
  ownerId: EntityId;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  damage: number;
  knockback: number;
  /** Entities already struck by this swing, so one attack cannot multi-hit. */
  hit: Set<EntityId>;
  /** Set false by the clip's `hitboxOff` event. */
  active: boolean;
}

export type AIMode = 'patrol' | 'chase' | 'attack' | 'hurt' | 'dead';

export interface AIState {
  mode: AIMode;
  /** Patrol bounds in world X, taken from the Tiled object. */
  patrolMinX: number;
  patrolMaxX: number;
  attackCooldown: number;
  /** Counts down while the target is out of sight before giving up. */
  interest: number;
  timer: number;
}

export interface Destructible {
  hits: number;
  maxHits: number;
  /** Item granted on each hit, subject to `hitDropCooldown`. */
  hitDrop?: { item: string; qty: number; cooldown: number; maxTotal: number };
  hitDropCooldown: number;
  hitDropsGiven: number;
  /** Rolled when the object is destroyed. */
  lootTable: string;
  /** Hidden nest, egg vein and similar: rolled per hit. */
  secret?: { item: string; chance: number };
}

export interface Pickup {
  item: string;
  qty: number;
  /** Seconds before the pickup can be collected, so drops arc out first. */
  delay: number;
}

export interface AnimState {
  /** Clip the view should be playing. The model owns this so that animation
   *  and gameplay state can never disagree. */
  clip: string;
  /** Bumped whenever the model wants the clip restarted from t=0. */
  restartToken: number;
  crossfade: number;
  /** Playback rate, so a walk cycle speeds up with actual movement. */
  speed: number;
}

export interface Trigger {
  kind: 'exit' | 'flag' | 'forge' | 'npc';
  /** Fires once ever, tracked in Progression via `sourceId`. */
  once: boolean;
  fired: boolean;
  /** Waits for E rather than firing on touch. */
  requiresInteract: boolean;
  toLevel?: string;
  spawn?: string;
  flag?: string;
  /** Short label shown next to the [E] prompt. */
  prompt?: string;
}

export interface Entity {
  id: EntityId;
  kind: EntityKind;
  /** Stable id from the Tiled object, used for persistent world flags. */
  sourceId?: string;
  transform: Transform;
  velocity?: Velocity;
  body?: Body;
  health?: Health;
  hitbox?: Hitbox;
  ai?: AIState;
  destructible?: Destructible;
  trigger?: Trigger;
  pickup?: Pickup;
  anim?: AnimState;
  /** Seconds until the entity is removed. */
  lifetime?: number;
  /** Marked for removal at the end of the tick. */
  dead?: boolean;
  /** Enemy archetype key, for loot and rendering. */
  enemyType?: string;
}
