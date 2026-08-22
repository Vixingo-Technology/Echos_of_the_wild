import { COMBAT, PHYSICS, PLAYER } from '@/model/tuning';
import { KICK, LOCOMOTION, PUNCH_CHAIN, REACTION, type AttackClipInfo } from '@/model/data/playerAnim';
import type { Entity, EntityId } from '@/model/core/types';
import type { World } from '@/model/core/World';
import type { Equipment } from './Equipment';
import type { HealthPool } from './HealthPool';

/** The model's entire input contract. Never raw key codes. */
export interface PlayerIntent {
  /** -1, 0 or 1. */
  moveX: number;
  crouch: boolean;
  sprint: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  punchPressed: boolean;
  kickPressed: boolean;
  injectHeld: boolean;
  interactPressed: boolean;
  dropThrough: boolean;
}

export const NO_INTENT: PlayerIntent = {
  moveX: 0, crouch: false, sprint: false,
  jumpPressed: false, jumpHeld: false,
  punchPressed: false, kickPressed: false,
  injectHeld: false, interactPressed: false, dropThrough: false,
};

export type PlayerAction =
  | 'idle' | 'walk' | 'run' | 'crouch'
  | 'jumpRise' | 'jumpFall' | 'land'
  | 'attack' | 'hurt' | 'inject' | 'dead';

/** Actions during which the player cannot move or act freely. */
const LOCKED: ReadonlySet<PlayerAction> = new Set(['attack', 'hurt', 'inject', 'dead']);

export interface PlayerRuntime {
  action: PlayerAction;
  /** Seconds elapsed inside a locked action, used to fire clip events. */
  actionTime: number;
  actionDuration: number;

  attack: AttackClipInfo | null;
  attackKind: 'punch' | 'kick' | null;
  /** Index of the next clip event to fire. */
  eventCursor: number;
  /** True once the clip's `cancelWindow` has passed. */
  canCancel: boolean;
  /** Attack the player asked for during the cancel window. */
  buffered: 'punch' | 'kick' | null;

  comboIndex: number;
  comboTimer: number;

  jumpBuffer: number;
  jumpCut: boolean;
  doubleJumpUsed: boolean;
  landTimer: number;

  /** Interactable currently in range, surfaced to the UI as an [E] prompt. */
  interactTarget: EntityId | null;
}

export function createPlayerRuntime(): PlayerRuntime {
  return {
    action: 'idle',
    actionTime: 0,
    actionDuration: 0,
    attack: null,
    attackKind: null,
    eventCursor: 0,
    canCancel: false,
    buffered: null,
    comboIndex: 0,
    comboTimer: 0,
    jumpBuffer: 0,
    jumpCut: false,
    doubleJumpUsed: false,
    landTimer: 0,
    interactTarget: null,
  };
}

export interface PlayerContext {
  world: World;
  entity: Entity;
  runtime: PlayerRuntime;
  health: HealthPool;
  equipment: Equipment;
  intent: PlayerIntent;
  dt: number;
}

/**
 * Taro's state machine.
 *
 * Attacks are driven by the clip's own event list rather than by hardcoded
 * timings, so the frames on screen and the frames that deal damage are the
 * same data. Retuning a punch in the rig editor moves both together.
 */
export function updatePlayer(ctx: PlayerContext): void {
  const { entity, runtime, health, intent, dt } = ctx;
  const body = entity.body!;
  const velocity = entity.velocity!;

  runtime.comboTimer = Math.max(0, runtime.comboTimer - dt);
  if (runtime.comboTimer === 0 && runtime.action !== 'attack') runtime.comboIndex = 0;

  runtime.jumpBuffer = intent.jumpPressed ? PLAYER.jumpBufferTime : Math.max(0, runtime.jumpBuffer - dt);
  runtime.landTimer = Math.max(0, runtime.landTimer - dt);

  if (health.isDead && runtime.action !== 'dead') enterDeath(ctx);

  if (body.justLanded) {
    runtime.doubleJumpUsed = false;
    if (body.landingSpeed > 620) {
      runtime.landTimer = 0.28;
      ctx.world.events.emit({ type: 'Sfx', name: 'land' });
    }
  }

  if (LOCKED.has(runtime.action)) {
    updateLockedAction(ctx);
  } else {
    updateFreeAction(ctx);
  }

  // Only brake when Taro is not actively driving; the acceleration code
  // already decelerates him toward a lower target speed on its own.
  const braking = LOCKED.has(runtime.action) || intent.moveX === 0;
  applyDrag(entity, dt, braking);
  syncAnim(ctx);
  void velocity;
}

// ---------------------------------------------------------------- locked

function updateLockedAction(ctx: PlayerContext): void {
  const { runtime, intent, dt, entity } = ctx;
  runtime.actionTime += dt;

  if (runtime.action === 'attack' && runtime.attack) {
    fireAttackEvents(ctx, runtime.attack);
    // Attacks are committed: no steering, but keep a touch of momentum.
    if (entity.body!.onGround) entity.velocity!.x *= 0.82;

    if (runtime.canCancel && (intent.punchPressed || intent.kickPressed)) {
      runtime.buffered = intent.kickPressed ? 'kick' : 'punch';
    }
  }

  if (runtime.action === 'inject') {
    // Releasing S or taking a hit cancels without spending a vial: the
    // `consumeVial` event only fires at the very end of the clip.
    if (!intent.injectHeld) {
      ctx.world.events.emit({ type: 'InjectCancelled' });
      toLocomotion(ctx);
      return;
    }
    fireInjectEvents(ctx);
  }

  if (runtime.actionTime >= runtime.actionDuration) {
    if (runtime.action === 'dead') return;
    if (runtime.action === 'attack' && runtime.buffered) {
      const kind = runtime.buffered;
      runtime.buffered = null;
      startAttack(ctx, kind);
      return;
    }
    clearHitbox(ctx);
    toLocomotion(ctx);
  }
}

function fireAttackEvents(ctx: PlayerContext, attack: AttackClipInfo): void {
  const { runtime } = ctx;
  while (runtime.eventCursor < attack.events.length && attack.events[runtime.eventCursor].t <= runtime.actionTime) {
    const event = attack.events[runtime.eventCursor];
    runtime.eventCursor += 1;

    switch (event.name) {
      case 'hitboxOn': openHitbox(ctx, attack); break;
      case 'hitboxOff': clearHitbox(ctx); break;
      case 'cancelWindow': runtime.canCancel = true; break;
      default:
        if (event.name.startsWith('sfx:')) {
          ctx.world.events.emit({ type: 'Sfx', name: event.name.slice(4) });
        }
    }
  }
}

function fireInjectEvents(ctx: PlayerContext): void {
  const { runtime, health, equipment } = ctx;
  const events = REACTION.inject.events;
  while (runtime.eventCursor < events.length && events[runtime.eventCursor].t <= runtime.actionTime) {
    const event = events[runtime.eventCursor];
    runtime.eventCursor += 1;

    if (event.name === 'consumeVial') {
      if (health.consumeVial()) {
        const healed = health.healFull();
        ctx.world.events.emit({ type: 'BloodConsumed' });
        ctx.world.events.emit({ type: 'PlayerHealed', amount: healed });
      }
      void equipment;
    } else if (event.name.startsWith('sfx:')) {
      ctx.world.events.emit({ type: 'Sfx', name: event.name.slice(4) });
    }
  }
}

// ------------------------------------------------------------------ free

function updateFreeAction(ctx: PlayerContext): void {
  const { entity, runtime, intent, health, equipment, dt } = ctx;
  const body = entity.body!;
  const velocity = entity.velocity!;
  const mods = equipment.modifiers;

  if (intent.moveX !== 0) entity.transform.facing = intent.moveX > 0 ? 1 : -1;

  const crouching = intent.crouch && body.onGround;
  const target =
    crouching ? PLAYER.walkSpeed * 0.4
      : intent.sprint ? PLAYER.sprintSpeed * mods.sprintBonus
        : PLAYER.walkSpeed;

  if (intent.moveX !== 0) {
    const accel = (body.onGround ? PLAYER.groundAccel : PLAYER.airAccel) * dt;
    const desired = intent.moveX * target;
    velocity.x += Math.sign(desired - velocity.x) * Math.min(accel, Math.abs(desired - velocity.x));
  }

  if (intent.dropThrough && body.onGround && intent.crouch) {
    body.dropThrough = 0.2;
    body.onGround = false;
  }

  // Jump, with coyote time and input buffering. Together these are what make
  // the difference between controls that feel tight and controls that feel
  // broken, and they cost about twenty lines.
  const canCoyote = body.onGround || body.timeOffGround <= PLAYER.coyoteTime;
  if (runtime.jumpBuffer > 0 && canCoyote) {
    doJump(ctx);
  } else if (runtime.jumpBuffer > 0 && mods.doubleJump && !runtime.doubleJumpUsed && !body.onGround) {
    runtime.doubleJumpUsed = true;
    doJump(ctx);
  }

  // Variable jump height: release early and you rise less.
  if (!intent.jumpHeld && velocity.y < 0 && !runtime.jumpCut) {
    velocity.y *= PLAYER.jumpCutMultiplier;
    runtime.jumpCut = true;
  }

  if (intent.punchPressed) { startAttack(ctx, 'punch'); return; }
  if (intent.kickPressed) { startAttack(ctx, 'kick'); return; }

  if (intent.injectHeld && body.onGround && health.vials > 0 && !health.isFull) {
    enterInject(ctx);
    return;
  }

  if (!body.onGround) {
    runtime.action = velocity.y < 0 ? 'jumpRise' : 'jumpFall';
  } else if (runtime.landTimer > 0 && Math.abs(velocity.x) < 40) {
    runtime.action = 'land';
  } else if (crouching) {
    runtime.action = 'crouch';
  } else if (Math.abs(velocity.x) > 24) {
    runtime.action = Math.abs(velocity.x) > PLAYER.walkSpeed * 1.15 ? 'run' : 'walk';
  } else {
    runtime.action = 'idle';
  }
}

function doJump(ctx: PlayerContext): void {
  const { entity, runtime } = ctx;
  entity.velocity!.y = -PLAYER.jumpVelocity;
  entity.body!.onGround = false;
  entity.body!.timeOffGround = PLAYER.coyoteTime + 1;
  runtime.jumpBuffer = 0;
  runtime.jumpCut = false;
  runtime.action = 'jumpRise';
  ctx.world.events.emit({ type: 'Sfx', name: 'jump' });
}

function applyDrag(entity: Entity, dt: number, braking: boolean): void {
  if (!braking) return;
  const body = entity.body!;
  const velocity = entity.velocity!;
  const friction = (body.onGround ? PHYSICS.groundFriction : PHYSICS.airFriction) * dt;
  if (Math.abs(velocity.x) <= friction) velocity.x = 0;
  else velocity.x -= Math.sign(velocity.x) * friction;
}

// ------------------------------------------------------------ transitions

function startAttack(ctx: PlayerContext, kind: 'punch' | 'kick'): void {
  const { runtime } = ctx;
  const attack = kind === 'kick'
    ? KICK
    : PUNCH_CHAIN[Math.min(runtime.comboIndex, PUNCH_CHAIN.length - 1)];

  runtime.action = 'attack';
  runtime.attack = attack;
  runtime.attackKind = kind;
  runtime.actionTime = 0;
  runtime.actionDuration = attack.duration;
  runtime.eventCursor = 0;
  runtime.canCancel = false;
  runtime.buffered = null;

  if (kind === 'punch') {
    runtime.comboIndex = (runtime.comboIndex + 1) % PUNCH_CHAIN.length;
    runtime.comboTimer = COMBAT.comboWindow;
  } else {
    runtime.comboIndex = 0;
    runtime.comboTimer = 0;
  }
  clearHitbox(ctx);
}

function enterInject(ctx: PlayerContext): void {
  const { runtime } = ctx;
  runtime.action = 'inject';
  runtime.actionTime = 0;
  runtime.actionDuration = REACTION.inject.duration;
  runtime.eventCursor = 0;
  ctx.entity.velocity!.x = 0;
  ctx.world.events.emit({ type: 'InjectStarted' });
}

/** Called by CombatSystem when Taro is struck. Cancels whatever he was doing. */
export function enterHurt(ctx: Pick<PlayerContext, 'world' | 'entity' | 'runtime'>): void {
  const { runtime } = ctx;
  if (runtime.action === 'dead') return;
  runtime.action = 'hurt';
  runtime.actionTime = 0;
  runtime.actionDuration = REACTION.hurt.duration;
  runtime.eventCursor = 0;
  runtime.attack = null;
  runtime.comboIndex = 0;
  delete ctx.entity.hitbox;
}

function enterDeath(ctx: PlayerContext): void {
  const { runtime, entity } = ctx;
  runtime.action = 'dead';
  runtime.actionTime = 0;
  runtime.actionDuration = REACTION.death.duration;
  runtime.attack = null;
  delete entity.hitbox;
  entity.velocity!.x = 0;
  ctx.world.events.emit({ type: 'PlayerDied' });
}

function toLocomotion(ctx: PlayerContext): void {
  const { runtime, entity } = ctx;
  runtime.action = entity.body!.onGround ? 'idle' : 'jumpFall';
  runtime.attack = null;
  runtime.attackKind = null;
  runtime.actionTime = 0;
  runtime.actionDuration = 0;
  runtime.eventCursor = 0;
  runtime.canCancel = false;
}

// ---------------------------------------------------------------- hitbox

function openHitbox(ctx: PlayerContext, attack: AttackClipInfo): void {
  const { entity, equipment, runtime } = ctx;
  const weapon = equipment.weaponStats;
  const mods = equipment.modifiers;

  const base = runtime.attackKind === 'kick'
    ? (weapon.kickDamage || COMBAT.kickDamage)
    : (weapon.punchDamage || COMBAT.punchDamage);
  const multiplier = COMBAT.comboMultipliers[attack.combo] ?? 1;
  const knockback = weapon.knockback ||
    (runtime.attackKind === 'kick' ? COMBAT.kickKnockback : COMBAT.punchKnockback);

  entity.hitbox = {
    ownerId: entity.id,
    offsetX: attack.box.offsetX + weapon.reach / 2,
    offsetY: attack.box.offsetY,
    width: attack.box.width + weapon.reach,
    height: attack.box.height,
    damage: Math.max(1, Math.round(base * multiplier * (1 + mods.damageBonus))),
    knockback,
    hit: new Set(),
    active: true,
  };
}

function clearHitbox(ctx: PlayerContext): void {
  delete ctx.entity.hitbox;
}

// ------------------------------------------------------------------- anim

function syncAnim(ctx: PlayerContext): void {
  const { entity, runtime } = ctx;
  const anim = entity.anim!;
  const next = clipFor(runtime);

  if (anim.clip !== next) {
    anim.clip = next;
    anim.restartToken += 1;
    anim.crossfade = crossfadeFor(runtime.action);
  }

  // Scale the walk and run cycles to actual ground speed so the feet do not
  // skate when Taro accelerates.
  if (runtime.action === 'walk') {
    anim.speed = clamp(Math.abs(entity.velocity!.x) / PLAYER.walkSpeed, 0.55, 1.5);
  } else if (runtime.action === 'run') {
    anim.speed = clamp(Math.abs(entity.velocity!.x) / PLAYER.sprintSpeed, 0.7, 1.4);
  } else {
    anim.speed = 1;
  }
}

function clipFor(runtime: PlayerRuntime): string {
  switch (runtime.action) {
    case 'attack': return runtime.attack?.clip ?? LOCOMOTION.idle;
    case 'hurt': return REACTION.hurt.clip;
    case 'inject': return REACTION.inject.clip;
    case 'dead': return REACTION.death.clip;
    default: return LOCOMOTION[runtime.action];
  }
}

function crossfadeFor(action: PlayerAction): number {
  // Attacks and reactions must read as instant; locomotion should flow.
  if (action === 'attack' || action === 'hurt') return 0.04;
  if (action === 'dead') return 0.08;
  return 0.12;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
