import { item } from '@/model/data/items';
import type { Inventory } from '@/model/domain/Inventory';
import type { World } from '../World';
import { colliderOf, overlaps } from './CollisionSystem';

/** Distance at which a drop starts homing toward Taro. */
const MAGNET_RANGE = 150;
const MAGNET_SPEED = 560;
/** Homing responsiveness. Steering the velocity rather than adding force is
 *  what keeps a drop from overshooting and flinging itself off a ledge. */
const MAGNET_TRACKING = 14;
/** Collected on proximity rather than collider overlap, so a drop never sits
 *  vibrating against Taro's feet. */
const COLLECT_RADIUS = 40;

/**
 * Collects drops, with a short delay and a magnet so items feel like they are
 * pulled in rather than stepped on.
 */
export function pickupSystem(world: World, inventory: Inventory, dt: number): void {
  const player = world.player;
  if (!player) return;

  const playerBox = colliderOf(player);
  const targetX = player.transform.x;
  const targetY = player.transform.y - 60;

  for (const e of world.ofKind('pickup')) {
    const p = e.pickup!;
    if (p.delay > 0) {
      p.delay -= dt;
      continue;
    }

    const dx = targetX - e.transform.x;
    const dy = targetY - e.transform.y;
    const distance = Math.hypot(dx, dy);

    if (distance < MAGNET_RANGE && e.velocity) {
      const speed = MAGNET_SPEED * (1 - distance / MAGNET_RANGE);
      const nx = dx / (distance || 1);
      const ny = dy / (distance || 1);
      const k = Math.min(1, dt * MAGNET_TRACKING);
      e.velocity.x += (nx * speed - e.velocity.x) * k;
      e.velocity.y += (ny * speed - e.velocity.y) * k;
      e.body!.gravityScale = 0;
    } else if (e.body) {
      e.body.gravityScale = 1;
    }

    if (distance > COLLECT_RADIUS && !overlaps(playerBox, colliderOf(e))) continue;

    const added = inventory.add(p.item, p.qty);
    if (added === 0) continue; // Bag full: leave it on the ground.

    if (added < p.qty) {
      p.qty -= added;
    } else {
      e.dead = true;
    }

    world.events.emit({ type: 'ItemAdded', item: p.item, qty: added });
    world.events.emit({ type: 'Sfx', name: item(p.item).category === 'material' ? 'pickup' : 'pickupRare' });
  }
}
