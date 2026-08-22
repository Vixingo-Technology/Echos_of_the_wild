import { COMBAT, FIXED_DT, PLAYER } from '@/model/tuning';
import { enemy } from '@/model/data/enemies';
import { rollLoot, type Rng } from '@/model/data/lootTables';
import { ENEMY_ANIM } from '@/model/data/enemyAnim';
import { spawnDrops, spawnPickup } from '@/model/domain/Loot';
import type { Equipment } from '@/model/domain/Equipment';
import type { HealthPool } from '@/model/domain/HealthPool';
import type { Progression } from '@/model/domain/Progression';
import type { Box, Entity, Hitbox } from '../types';
import type { World } from '../World';
import { colliderOf, overlaps } from './CollisionSystem';

export interface CombatContext {
  world: World;
  blood: HealthPool;
  equipment: Equipment;
  progression: Progression;
  rng: Rng;
  /** Lets the player FSM cancel whatever Taro was doing into a hurt reaction. */
  onPlayerHurt: () => void;
}

/** Hitbox offsets are authored facing right and mirrored for the other side. */
export function hitboxWorld(owner: Entity, hb: Hitbox): Box {
  const facing = owner.transform.facing;
  const centreX = owner.transform.x + hb.offsetX * facing;
  return {
    x: centreX - hb.width / 2,
    y: owner.transform.y + hb.offsetY,
    width: hb.width,
    height: hb.height,
  };
}

/**
 * Resolves active attack volumes against everything damageable.
 *
 * Hitboxes are opened and closed by clip events, never by timers written here,
 * so what you see and what connects are the same data.
 */
export function combatSystem(ctx: CombatContext, dt: number): void {
  const { world } = ctx;

  for (const e of world.entities) {
    if (!e.health) continue;
    if (e.health.hitstop > 0) e.health.hitstop = Math.max(0, e.health.hitstop - dt);
    if (e.health.invulnerable > 0) e.health.invulnerable = Math.max(0, e.health.invulnerable - dt);
  }

  for (const attacker of world.entities) {
    const hb = attacker.hitbox;
    if (!hb || !hb.active || attacker.dead) continue;

    const box = hitboxWorld(attacker, hb);

    for (const target of world.entities) {
      if (target.id === hb.ownerId || target.dead) continue;
      if (!target.health || !target.body) continue;
      if (target.health.current <= 0 || target.health.invulnerable > 0) continue;
      if (hb.hit.has(target.id)) continue;
      // Enemies do not friendly-fire each other.
      if (attacker.kind === target.kind) continue;
      if (!overlaps(box, colliderOf(target))) continue;

      hb.hit.add(target.id);
      applyDamage(ctx, attacker, target, hb);
    }
  }
}

function applyDamage(ctx: CombatContext, attacker: Entity, target: Entity, hb: Hitbox): void {
  const { world } = ctx;
  const health = target.health!;

  let amount = hb.damage;
  if (target.kind === 'player') {
    amount = Math.max(1, Math.round(amount * (1 - ctx.equipment.modifiers.damageResist)));
  }

  health.current = Math.max(0, health.current - amount);
  const killed = health.current <= 0;

  // Hitstop freezes both parties for a few frames. It is the cheapest trick
  // available for making an attack feel like it lands with weight.
  const stop = COMBAT.hitstopFrames * FIXED_DT;
  health.hitstop = stop;
  if (attacker.health) attacker.health.hitstop = stop;

  const dir = Math.sign(target.transform.x - attacker.transform.x) || attacker.transform.facing;
  if (target.velocity && hb.knockback > 0) {
    target.velocity.x = dir * hb.knockback;
    target.velocity.y = -hb.knockback * 0.35;
  }

  world.events.emit({
    type: 'DamageDealt',
    targetId: target.id,
    sourceId: attacker.id,
    amount,
    killed,
    x: target.transform.x,
    y: target.transform.y - (target.body?.height ?? 0) / 2,
  });
  world.events.emit({ type: 'CameraShake', strength: killed ? 9 : 4 });

  if (target.kind === 'player') {
    health.invulnerable = PLAYER.invulnerableTime;
    world.events.emit({ type: 'PlayerHurt', amount, remaining: health.current });
    ctx.onPlayerHurt();
    return;
  }

  if (target.destructible) {
    onDestructibleHit(ctx, target, killed);
    return;
  }

  if (target.kind === 'enemy') {
    if (killed) killEnemy(ctx, target);
    else staggerEnemy(target);
  }
}

function staggerEnemy(target: Entity): void {
  if (!target.ai) return;
  target.ai.mode = 'hurt';
  target.ai.timer = ENEMY_ANIM.mini_dino.hurt.duration;
  delete target.hitbox;
}

function killEnemy(ctx: CombatContext, target: Entity): void {
  const { world, rng, blood, equipment } = ctx;
  const def = enemy(target.enemyType ?? 'mini_dino');

  if (target.ai) {
    target.ai.mode = 'dead';
    target.ai.timer = ENEMY_ANIM.mini_dino.death.duration;
  }
  delete target.hitbox;
  if (target.sourceId) ctx.progression.markConsumed(world.levelId, 'killed', target.sourceId);
  // The corpse stops blocking and stops being hittable, but stays long enough
  // to play its death clip.
  target.health!.invulnerable = Number.POSITIVE_INFINITY;
  target.lifetime = ENEMY_ANIM.mini_dino.death.duration + 1.2;

  const span = def.blood.max - def.blood.min + 1;
  const points = def.blood.min + Math.floor(rng() * span) + equipment.modifiers.bloodBonus;
  blood.gainBlood(points);

  world.events.emit({ type: 'BloodGained', amount: points });
  world.events.emit({
    type: 'EnemyKilled',
    enemyId: target.id,
    enemyType: def.id,
    x: target.transform.x,
    y: target.transform.y,
  });

  spawnDrops(world, rollLoot(def.lootTable, rng), target.transform.x, target.transform.y - 30, rng);
}

function onDestructibleHit(ctx: CombatContext, target: Entity, broken: boolean): void {
  const { world, rng } = ctx;
  const d = target.destructible!;
  d.hits += 1;

  const x = target.transform.x;
  const y = target.transform.y - (target.body?.height ?? 60) * 0.6;

  // Hidden nests roll per hit, and land with their own event so the UI can
  // make a rare find read as rare rather than as noise.
  if (d.secret && rng() < d.secret.chance) {
    spawnPickup(world, d.secret.item, 1, x, y, rng);
    world.events.emit({ type: 'SecretFound', item: d.secret.item, x, y });
    delete d.secret;
  }

  if (broken) {
    if (target.sourceId) ctx.progression.markConsumed(world.levelId, 'destroyed', target.sourceId);
    world.events.emit({ type: 'DestructibleBroken', entityId: target.id, x, y });
    spawnDrops(world, rollLoot(d.lootTable, rng), x, y, rng);
    target.dead = true;
    return;
  }

  world.events.emit({ type: 'DestructibleHit', entityId: target.id, remaining: target.health!.current });

  // Shaking an apple loose is on a cooldown and a cap, so a tree is a source
  // of a few apples rather than an infinite one.
  const drop = d.hitDrop;
  if (drop && d.hitDropCooldown <= 0 && d.hitDropsGiven < drop.maxTotal) {
    d.hitDropCooldown = drop.cooldown;
    d.hitDropsGiven += 1;
    spawnPickup(world, drop.item, drop.qty, x, y, rng);
  }
}
