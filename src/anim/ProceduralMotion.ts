import type { CompiledRig } from './compile';
import { ROT, STRIDE, X, Y, type PoseBuffer } from './pose';
import { solveWorld } from './sampler';

/**
 * Secondary motion that is simulated rather than authored: Taro's coat and
 * hair, a dinosaur's tail. Costs nothing to author and does most of the work
 * of making a cut-out rig read as alive rather than as a puppet.
 *
 * Convention: rig space has +X right, +Y DOWN, origin at the character's
 * ground contact point. Gravity is therefore a positive Y value.
 */

export interface ChainParams {
  /** Bones driven by the chain, ordered from the anchor outward. */
  bones: string[];
  /** Bone whose world transform pins the chain's head. */
  anchor: string;
  /** Rest length of each segment, in rig units. */
  segmentLength: number;
  /** Rig-space units/s^2. Positive pulls the chain down. */
  gravity: number;
  /** Per-second velocity retention. 0.9 is floaty cloth, 0.5 is stiff. */
  damping: number;
  /** How strongly the chain resists leaving its rest direction, 0..1. */
  stiffness: number;
  /** Blend against the authored pose. 1 is fully procedural. */
  weight: number;
  /** Rest direction in the anchor's local space, DEGREES. */
  restAngle: number;
  /** Constraint solver iterations. 2-4 is plenty. */
  iterations?: number;
}

interface Point {
  x: number;
  y: number;
  px: number;
  py: number;
}

const DEG = Math.PI / 180;

class VerletChain {
  readonly params: ChainParams;
  readonly boneIndices: number[];
  readonly anchorIndex: number;
  private readonly points: Point[];
  private initialised = false;

  constructor(rig: CompiledRig, params: ChainParams) {
    this.params = params;

    const anchorIndex = rig.indexOf.get(params.anchor);
    if (anchorIndex === undefined) {
      throw new Error(`Chain anchor "${params.anchor}" is not a bone of rig "${rig.id}"`);
    }
    this.anchorIndex = anchorIndex;

    this.boneIndices = params.bones.map((id) => {
      const i = rig.indexOf.get(id);
      if (i === undefined) throw new Error(`Chain bone "${id}" is not a bone of rig "${rig.id}"`);
      return i;
    });

    // One point per bone, plus the pinned head at the anchor.
    this.points = Array.from({ length: this.boneIndices.length + 1 }, () => ({ x: 0, y: 0, px: 0, py: 0 }));
  }

  /**
   * @param carryX  Rig-space velocity of the character, so the chain trails
   *                behind movement instead of hanging straight down.
   */
  update(dt: number, world: PoseBuffer, carryX: number, carryY: number): void {
    const p = this.params;
    const ao = this.anchorIndex * STRIDE;
    const ax = world[ao + X];
    const ay = world[ao + Y];
    const arot = world[ao + ROT];

    const restDir = arot + p.restAngle * DEG;
    const rdx = Math.cos(restDir);
    const rdy = Math.sin(restDir);

    if (!this.initialised) {
      for (let i = 0; i < this.points.length; i++) {
        const pt = this.points[i];
        pt.x = pt.px = ax + rdx * p.segmentLength * i;
        pt.y = pt.py = ay + rdy * p.segmentLength * i;
      }
      this.initialised = true;
    }

    // Head is pinned to the anchor bone.
    const head = this.points[0];
    head.px = head.x;
    head.py = head.y;
    head.x = ax;
    head.y = ay;

    // Verlet integration. `damping` is expressed per second so the motion does
    // not change character when the frame rate does.
    const retain = Math.pow(p.damping, dt);
    const gy = p.gravity * dt * dt;

    for (let i = 1; i < this.points.length; i++) {
      const pt = this.points[i];
      const vx = (pt.x - pt.px) * retain;
      const vy = (pt.y - pt.py) * retain;
      pt.px = pt.x;
      pt.py = pt.y;
      pt.x += vx + carryX * dt * dt;
      pt.y += vy + gy + carryY * dt * dt;
    }

    // Distance constraints, plus a pull back toward the rest direction so the
    // coat does not end up wrapped around Taro's ankles.
    const iterations = p.iterations ?? 3;
    for (let it = 0; it < iterations; it++) {
      for (let i = 1; i < this.points.length; i++) {
        const prev = this.points[i - 1];
        const pt = this.points[i];

        if (p.stiffness > 0) {
          const restX = prev.x + rdx * p.segmentLength;
          const restY = prev.y + rdy * p.segmentLength;
          pt.x += (restX - pt.x) * p.stiffness * 0.5;
          pt.y += (restY - pt.y) * p.stiffness * 0.5;
        }

        let dx = pt.x - prev.x;
        let dy = pt.y - prev.y;
        const dist = Math.hypot(dx, dy) || 1e-6;
        const correction = (dist - p.segmentLength) / dist;
        dx *= correction;
        dy *= correction;

        // The head never moves; the outer point absorbs the whole correction.
        if (i === 1) {
          pt.x -= dx;
          pt.y -= dy;
        } else {
          prev.x += dx * 0.5;
          prev.y += dy * 0.5;
          pt.x -= dx * 0.5;
          pt.y -= dy * 0.5;
        }
      }
    }
  }

  /** Write the simulated angles back into the local pose as bone rotations. */
  applyToPose(rig: CompiledRig, local: PoseBuffer, world: PoseBuffer): void {
    const w = this.params.weight;
    for (let i = 0; i < this.boneIndices.length; i++) {
      const boneIndex = this.boneIndices[i];
      const a = this.points[i];
      const b = this.points[i + 1];
      const worldAngle = Math.atan2(b.y - a.y, b.x - a.x);

      const parent = rig.bones[boneIndex].parentIndex;
      const parentRot = parent >= 0 ? world[parent * STRIDE + ROT] : 0;
      const target = worldAngle - parentRot;

      const o = boneIndex * STRIDE + ROT;
      local[o] = local[o] + (target - local[o]) * w;
    }
  }
}

/**
 * Runs every chain on a rig. Because chains need world positions but produce
 * local rotations, the caller solves the world pose, runs this, and solves
 * again - two linear passes over ~20 bones, which is free at this scale.
 */
export class ProceduralMotion {
  private readonly rig: CompiledRig;
  private readonly chains: VerletChain[] = [];

  constructor(rig: CompiledRig, params: ChainParams[] = []) {
    this.rig = rig;
    for (const p of params) this.addChain(p);
  }

  addChain(params: ChainParams): void {
    this.chains.push(new VerletChain(this.rig, params));
  }

  get isEmpty(): boolean {
    return this.chains.length === 0;
  }

  /**
   * Mutates `local` in place and leaves `world` holding the final solved pose.
   * @param carryX/carryY Character velocity in rig units per second.
   */
  apply(dt: number, local: PoseBuffer, world: PoseBuffer, carryX = 0, carryY = 0): void {
    if (this.chains.length === 0) {
      solveWorld(this.rig, local, world);
      return;
    }

    solveWorld(this.rig, local, world);
    // Inertia opposes motion: moving right sweeps the coat left.
    const dragX = -carryX;
    const dragY = -carryY;
    for (const chain of this.chains) {
      chain.update(dt, world, dragX, dragY);
      chain.applyToPose(this.rig, local, world);
    }
    solveWorld(this.rig, local, world);
  }
}

/**
 * Critically-damped-ish spring, for the backpack bob and squash/stretch. Cheap
 * and stable at variable frame rates.
 */
export class Spring1D {
  value: number;
  private velocity = 0;

  constructor(
    initial: number,
    private readonly stiffness = 180,
    private readonly damping = 18,
  ) {
    this.value = initial;
  }

  update(dt: number, target: number): number {
    const accel = (target - this.value) * this.stiffness - this.velocity * this.damping;
    this.velocity += accel * dt;
    this.value += this.velocity * dt;
    return this.value;
  }

  reset(value: number): void {
    this.value = value;
    this.velocity = 0;
  }
}
