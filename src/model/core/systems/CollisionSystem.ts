import type { Box, Entity } from '../types';
import type { LevelGeometry, World } from '../World';

/** Colliders are anchored at the ground contact point: x centre, y bottom. */
export function colliderOf(e: Entity): Box {
  const b = e.body!;
  return {
    x: e.transform.x - b.width / 2,
    y: e.transform.y - b.height,
    width: b.width,
    height: b.height,
  };
}

export function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Small overlap allowance so resting on a surface does not jitter. */
const SKIN = 0.5;

/**
 * Moves every body and resolves it against the level, one axis at a time.
 *
 * Axis separation is what makes a platformer feel right: running into a wall
 * must not also stop your fall, and landing must not also stop your run.
 */
export function collisionSystem(world: World, dt: number): void {
  const geo = world.geometry;

  for (const e of world.entities) {
    const { body, velocity } = e;
    if (!body || !velocity || e.dead) continue;
    if (e.health && e.health.hitstop > 0) continue;

    const wasOnGround = body.onGround;
    body.onGround = false;
    body.justLanded = false;

    // ---- X -----------------------------------------------------------
    e.transform.x += velocity.x * dt;
    if (velocity.x !== 0) {
      const box = colliderOf(e);
      for (const solid of geo.solids) {
        if (!overlaps(box, solid)) continue;
        if (velocity.x > 0) e.transform.x = solid.x - body.width / 2;
        else e.transform.x = solid.x + solid.width + body.width / 2;
        velocity.x = 0;
        break;
      }
    }

    // ---- Y -----------------------------------------------------------
    const previousBottom = e.transform.y;
    e.transform.y += velocity.y * dt;
    const box = colliderOf(e);

    for (const solid of geo.solids) {
      if (!overlaps(box, solid)) continue;
      if (velocity.y >= 0) {
        e.transform.y = solid.y;
        land(e, wasOnGround);
      } else {
        e.transform.y = solid.y + solid.height + body.height;
        velocity.y = 0;
      }
      break;
    }

    // One-way platforms catch you only on the way down, and only if you were
    // already above them - otherwise jumping up through one would snag.
    if (!body.onGround && velocity.y >= 0 && body.dropThrough <= 0) {
      for (const platform of geo.oneWay) {
        const overlapping =
          e.transform.x + body.width / 2 > platform.x &&
          e.transform.x - body.width / 2 < platform.x + platform.width;
        if (!overlapping) continue;
        if (previousBottom > platform.y + SKIN) continue;
        if (e.transform.y < platform.y) continue;

        e.transform.y = platform.y;
        land(e, wasOnGround);
        break;
      }
    }

    if (body.onGround) body.timeOffGround = 0;
    else body.timeOffGround += dt;

    // Keep bodies inside the level horizontally; falling out the bottom is
    // handled by gameplay, not silently clamped.
    const half = body.width / 2;
    if (e.transform.x < half) {
      e.transform.x = half;
      if (velocity.x < 0) velocity.x = 0;
    } else if (geo.width > 0 && e.transform.x > geo.width - half) {
      e.transform.x = geo.width - half;
      if (velocity.x > 0) velocity.x = 0;
    }
  }
}

function land(e: Entity, wasOnGround: boolean): void {
  const body = e.body!;
  body.landingSpeed = e.velocity!.y;
  e.velocity!.y = 0;
  body.onGround = true;
  body.justLanded = !wasOnGround;
}

/** Is any part of the entity inside a ladder volume? */
export function onLadder(e: Entity, geo: LevelGeometry): boolean {
  if (!e.body) return false;
  const box = colliderOf(e);
  return geo.ladders.some((l) => overlaps(box, l));
}
