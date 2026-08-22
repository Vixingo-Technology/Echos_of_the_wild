import type { World } from '@/model/core/World';
import type { Rng } from '@/model/data/lootTables';

/**
 * Drops arc out of whatever produced them and cannot be picked up for a
 * moment, so a kill reads as the corpse yielding something rather than as an
 * item teleporting into the bag.
 */
export function spawnPickup(world: World, item: string, qty: number, x: number, y: number, rng: Rng): void {
  world.spawn({
    kind: 'pickup',
    transform: { x, y, facing: 1 },
    velocity: { x: (rng() - 0.5) * 260, y: -240 - rng() * 160 },
    body: {
      width: 26, height: 26,
      onGround: false, gravityScale: 1,
      timeOffGround: 0, dropThrough: 0, justLanded: false, landingSpeed: 0,
    },
    pickup: { item, qty, delay: 0.45 },
    lifetime: 45,
  });
}

export function spawnDrops(
  world: World,
  drops: { item: string; qty: number }[],
  x: number,
  y: number,
  rng: Rng,
): void {
  for (const drop of drops) spawnPickup(world, drop.item, drop.qty, x, y, rng);
}
