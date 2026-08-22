import { enemy } from '@/model/data/enemies';
import { ENEMY_ANIM } from '@/model/data/enemyAnim';
import { PHYSICS } from '@/model/tuning';
import type { Entity } from '../types';
import type { World } from '../World';

/**
 * Mini-dinosaur behaviour: patrol a stretch, notice Taro, close, bite.
 *
 * The bite's damage window comes from the clip's events, exactly as the
 * player's attacks do - an enemy telegraph you can read and dodge is the whole
 * point, so the wind-up frames and the dangerous frames must stay locked
 * together.
 */
export function aiSystem(world: World, dt: number): void {
  const player = world.player;

  for (const e of world.ofKind('enemy')) {
    const ai = e.ai;
    if (!ai || !e.body || !e.velocity) continue;
    if (e.health && e.health.hitstop > 0) continue;

    ai.attackCooldown = Math.max(0, ai.attackCooldown - dt);
    ai.timer = Math.max(0, ai.timer - dt);

    switch (ai.mode) {
      case 'dead':
        e.velocity.x = 0;
        setClip(e, ENEMY_ANIM.mini_dino.death.clip, 0.06);
        continue;

      case 'hurt':
        e.velocity.x *= 0.86;
        setClip(e, ENEMY_ANIM.mini_dino.hurt.clip, 0.04);
        if (ai.timer <= 0) ai.mode = player ? 'chase' : 'patrol';
        continue;

      case 'attack':
        updateAttack(world, e, dt);
        continue;

      case 'patrol':
        updatePatrol(world, e, player);
        continue;

      case 'chase':
        updateChase(e, player, dt);
        continue;
    }
  }
}

function def(e: Entity) {
  return enemy(e.enemyType ?? 'mini_dino');
}

function updatePatrol(world: World, e: Entity, player: Entity | undefined): void {
  const d = def(e);
  const ai = e.ai!;

  if (player && canSee(e, player, d.aggroRange)) {
    ai.mode = 'chase';
    ai.interest = d.loseInterestTime;
    world.events.emit({ type: 'Sfx', name: 'dinoAlert' });
    return;
  }

  // Turn at the patrol bounds, and also when walled in, so a dino dropped into
  // a corridor never grinds against the wall.
  if (e.transform.x <= ai.patrolMinX) e.transform.facing = 1;
  else if (e.transform.x >= ai.patrolMaxX) e.transform.facing = -1;
  else if (e.velocity!.x === 0 && e.body!.onGround) e.transform.facing = (e.transform.facing * -1) as 1 | -1;

  e.velocity!.x = e.transform.facing * d.patrolSpeed;
  setClip(e, ENEMY_ANIM.mini_dino.walk, 0.12);
}

function updateChase(e: Entity, player: Entity | undefined, dt: number): void {
  const d = def(e);
  const ai = e.ai!;

  if (!player || player.health!.current <= 0) {
    ai.mode = 'patrol';
    return;
  }

  const dx = player.transform.x - e.transform.x;
  const distance = Math.abs(dx);

  if (canSee(e, player, d.aggroRange * 1.3)) ai.interest = d.loseInterestTime;
  else ai.interest -= dt;

  if (ai.interest <= 0) {
    ai.mode = 'patrol';
    return;
  }

  e.transform.facing = dx >= 0 ? 1 : -1;

  if (distance <= d.attackRange && ai.attackCooldown <= 0 && e.body!.onGround) {
    startBite(e);
    return;
  }

  // Hold at bite range rather than shoving into Taro's collider.
  if (distance > d.attackRange * 0.8) {
    e.velocity!.x = e.transform.facing * d.chaseSpeed;
    setClip(e, ENEMY_ANIM.mini_dino.run, 0.12);
  } else {
    e.velocity!.x *= 0.8;
    setClip(e, ENEMY_ANIM.mini_dino.idle, 0.12);
  }
}

function startBite(e: Entity): void {
  const attack = ENEMY_ANIM.mini_dino.attack;
  const ai = e.ai!;
  ai.mode = 'attack';
  ai.timer = attack.duration;
  ai.attackCooldown = def(e).attackCooldown + attack.duration;
  e.velocity!.x = 0;
  delete e.hitbox;
  setClip(e, attack.clip, 0.05, true);
}

function updateAttack(world: World, e: Entity, dt: number): void {
  const attack = ENEMY_ANIM.mini_dino.attack;
  const ai = e.ai!;
  const elapsed = attack.duration - ai.timer;

  e.velocity!.x *= 1 - Math.min(1, PHYSICS.groundFriction * dt * 0.0004);

  for (const event of attack.events) {
    // Fire once, on the tick the playhead crosses the event.
    if (event.t > elapsed || event.t <= elapsed - dt) continue;

    if (event.name === 'hitboxOn') {
      e.hitbox = {
        ownerId: e.id,
        offsetX: attack.box.offsetX,
        offsetY: attack.box.offsetY,
        width: attack.box.width,
        height: attack.box.height,
        damage: def(e).attackDamage,
        knockback: 300,
        hit: new Set(),
        active: true,
      };
    } else if (event.name === 'hitboxOff') {
      delete e.hitbox;
    } else if (event.name.startsWith('sfx:')) {
      world.events.emit({ type: 'Sfx', name: event.name.slice(4) });
    }
  }

  if (ai.timer <= 0) {
    delete e.hitbox;
    ai.mode = 'chase';
  }
}

/** Line of sight is range plus a vertical band, so dinos ignore other floors. */
function canSee(e: Entity, player: Entity, range: number): boolean {
  if (player.health!.current <= 0) return false;
  const dx = Math.abs(player.transform.x - e.transform.x);
  const dy = Math.abs(player.transform.y - e.transform.y);
  return dx <= range && dy <= 160;
}

function setClip(e: Entity, clip: string, crossfade: number, restart = false): void {
  const anim = e.anim;
  if (!anim) return;
  if (anim.clip === clip && !restart) return;
  anim.clip = clip;
  anim.crossfade = crossfade;
  anim.restartToken += 1;
}
