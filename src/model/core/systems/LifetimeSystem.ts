import type { World } from '../World';

/** Ages out corpses, drops and effects. */
export function lifetimeSystem(world: World, dt: number): void {
  for (const e of world.entities) {
    if (e.lifetime === undefined || e.dead) continue;
    e.lifetime -= dt;
    if (e.lifetime <= 0) e.dead = true;
  }

  for (const e of world.entities) {
    if (e.destructible && e.destructible.hitDropCooldown > 0) {
      e.destructible.hitDropCooldown -= dt;
    }
  }
}
