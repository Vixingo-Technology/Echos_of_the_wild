import { PHYSICS } from '@/model/tuning';
import type { World } from '../World';

/**
 * Applies gravity and drag. Movement and resolution happen in CollisionSystem,
 * which runs immediately after, so nothing ever sees a half-integrated state.
 */
export function physicsSystem(world: World, dt: number): void {
  for (const e of world.entities) {
    const { body, velocity } = e;
    if (!body || !velocity || e.dead) continue;
    if (e.health && e.health.hitstop > 0) continue;

    velocity.y += PHYSICS.gravity * body.gravityScale * dt;
    if (velocity.y > PHYSICS.maxFallSpeed) velocity.y = PHYSICS.maxFallSpeed;

    if (body.dropThrough > 0) body.dropThrough -= dt;
  }
}
