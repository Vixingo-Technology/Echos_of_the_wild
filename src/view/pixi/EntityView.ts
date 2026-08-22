import { Container, Graphics } from 'pixi.js';
import {
  ProceduralMotion, SkeletalAnimator, createPoseBuffer, type PoseBuffer,
} from '@/anim';
import { rigBundle } from '@/data/rigs';
import { destructible } from '@/model/data/destructibles';
import { item } from '@/model/data/items';
import type { Entity } from '@/model/core/types';
import { RigView } from './RigView';

export interface EntityView {
  readonly container: Container;
  /** Record where the entity is BEFORE a simulation tick. Called by the loop,
   *  once per tick, which is what makes interpolation correct even when several
   *  ticks are caught up inside one rendered frame. */
  snapshot(entity: Entity): void;
  /** @param alpha 0..1 progress from the last tick toward the next one. */
  update(entity: Entity, dt: number, alpha: number): void;
  destroy(): void;
}

/**
 * Smooths the gap between a fixed 60Hz simulation and a display that may be
 * refreshing at some other rate.
 *
 * `prev` is captured by the loop before each tick rather than on each rendered
 * frame - doing it per frame means that whenever the number of ticks and the
 * number of frames disagree, the sprite is interpolating between two positions
 * that are not adjacent in time, and it visibly lags behind.
 */
class Interpolator {
  private prevX = NaN;
  private prevY = NaN;

  capture(entity: Entity): void {
    this.prevX = entity.transform.x;
    this.prevY = entity.transform.y;
  }

  place(container: Container, entity: Entity, alpha: number): void {
    const { x, y } = entity.transform;
    if (Number.isNaN(this.prevX)) {
      container.position.set(x, y);
      return;
    }
    container.position.set(
      this.prevX + (x - this.prevX) * alpha,
      this.prevY + (y - this.prevY) * alpha,
    );
  }
}

/**
 * A skeletal character. The model owns which clip should be playing; this only
 * plays it, simulates the cloth, and reports back the purely visual events
 * (footsteps) that the model has no reason to know about.
 */
export class RiggedEntityView implements EntityView {
  readonly container = new Container();

  private readonly animator: SkeletalAnimator;
  private readonly motion: ProceduralMotion;
  private readonly rigView: RigView;
  private readonly world: PoseBuffer;
  private readonly interp = new Interpolator();
  private lastToken = -1;

  snapshot(entity: Entity): void {
    this.interp.capture(entity);
  }

  constructor(rigId: string, private readonly onFootstep?: (x: number, y: number) => void) {
    const bundle = rigBundle(rigId);
    this.animator = new SkeletalAnimator(bundle.rig, bundle.clips);
    this.motion = new ProceduralMotion(bundle.rig, bundle.chains);
    this.world = createPoseBuffer(bundle.rig.bones.length);
    this.rigView = new RigView(bundle.rig);
    this.container.addChild(this.rigView.container);
  }

  update(entity: Entity, dt: number, alpha: number): void {
    const anim = entity.anim;
    if (anim) {
      const restarted = anim.restartToken !== this.lastToken;
      if (restarted) {
        this.lastToken = anim.restartToken;
        if (this.animator.hasClip(anim.clip)) {
          this.animator.play(anim.clip, { crossfade: anim.crossfade, restart: true });
        }
      } else if (this.animator.currentClipId !== anim.clip && this.animator.hasClip(anim.clip)) {
        this.animator.play(anim.clip, { crossfade: anim.crossfade });
      }
    }

    // Hitstop freezes the pose, which is what sells the impact.
    const frozen = (entity.health?.hitstop ?? 0) > 0;
    const rate = frozen ? 0 : (anim?.speed ?? 1);
    const events = this.animator.update(dt * rate);

    for (const event of events) {
      // Everything else on the timeline belongs to the model; the renderer
      // only handles what is purely cosmetic.
      if (event.name === 'footstep') {
        this.onFootstep?.(entity.transform.x, entity.transform.y);
      }
    }

    const carry = entity.velocity?.x ?? 0;
    this.motion.apply(Math.max(dt, 1 / 240), this.animator.pose, this.world, carry, entity.velocity?.y ?? 0);
    this.rigView.update(this.world);

    this.interp.place(this.container, entity, alpha);
    this.container.scale.x = entity.transform.facing;

    // Flash while invulnerable so a hit reads even when Taro is mid-run.
    const invuln = entity.health?.invulnerable ?? 0;
    this.container.alpha = invuln > 0 && Math.floor(invuln * 20) % 2 === 0 ? 0.45 : 1;
  }

  setDebugBones(visible: boolean): void {
    this.rigView.setDebugBones(visible);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

/** Rocks, trees, drops: a shape until the generated art replaces it. */
export class PropEntityView implements EntityView {
  readonly container = new Container();
  private readonly graphic = new Graphics();
  private readonly interp = new Interpolator();
  private bob = Math.random() * Math.PI * 2;
  private readonly isPickup: boolean;

  snapshot(entity: Entity): void {
    this.interp.capture(entity);
  }

  constructor(entity: Entity) {
    this.container.addChild(this.graphic);
    this.isPickup = entity.kind === 'pickup';
    this.draw(entity);
  }

  private draw(entity: Entity): void {
    const g = this.graphic;
    g.clear();

    if (entity.pickup) {
      const def = item(entity.pickup.item);
      const colour = PICKUP_COLOURS[def.category] ?? 0xd6c39a;
      g.roundRect(-13, -26, 26, 26, 6).fill({ color: colour }).stroke({ color: 0x14110f, width: 2.5 });
      return;
    }

    if (entity.destructible) {
      const kind = entity.anim?.clip ?? 'stone';
      const def = destructible(kind);
      const colour = DESTRUCTIBLE_COLOURS[kind] ?? 0x6b6b63;
      g.roundRect(-def.width / 2, -def.height, def.width, def.height, kind === 'apple_tree' ? 22 : 14)
        .fill({ color: colour })
        .stroke({ color: 0x14110f, width: 3 });

      if (kind === 'apple_tree') {
        // A couple of apples, so the tree reads as a tree rather than a slab.
        g.circle(-def.width * 0.22, -def.height * 0.72, 9).fill({ color: 0xd23b3b });
        g.circle(def.width * 0.26, -def.height * 0.58, 8).fill({ color: 0xd23b3b });
      }
      return;
    }

    const w = entity.body?.width ?? 32;
    const h = entity.body?.height ?? 32;
    g.roundRect(-w / 2, -h, w, h, 6).fill({ color: 0x22d3ee, alpha: 0.14 })
      .stroke({ color: 0x22d3ee, width: 2, alpha: 0.5 });
  }

  update(entity: Entity, dt: number, alpha: number): void {
    this.interp.place(this.container, entity, alpha);

    if (this.isPickup) {
      this.bob += dt * 5;
      this.graphic.y = Math.sin(this.bob) * 4;
      this.graphic.rotation = Math.sin(this.bob * 0.6) * 0.16;
    }

    const health = entity.health;
    if (health && health.hitstop > 0) {
      this.container.x += (Math.random() - 0.5) * 5;
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

const PICKUP_COLOURS: Record<string, number> = {
  material: 0xd6c39a,
  consumable: 0xd23b3b,
  currency: 0xf2a71b,
  weapon: 0x9fb3c8,
  passive: 0x8f7fe0,
  quest: 0x22d3ee,
};

const DESTRUCTIBLE_COLOURS: Record<string, number> = {
  apple_tree: 0x3f6b3a,
  stone: 0x6b6b63,
  iron_vein: 0x7a6a5e,
  gold_vein: 0x8a7a3e,
};
