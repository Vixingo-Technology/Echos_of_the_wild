import type { BoneDef, ClipDef, ClipEventDef, RigDef, TrackProp } from './types';
import { resolveEase, type EaseFn } from './easing';
import { ALPHA, createPoseBuffer, ROT, STRIDE, SX, SY, X, Y, type PoseBuffer } from './pose';

const DEG = Math.PI / 180;

export interface CompiledBone extends BoneDef {
  index: number;
  parentIndex: number;
  /** Rest rotation in radians. */
  restRotation: number;
}

export interface CompiledRig {
  id: string;
  height: number;
  /** Topologically sorted: a bone's parent always precedes it. */
  bones: CompiledBone[];
  indexOf: Map<string, number>;
  /** Draw order: bone indices sorted ascending by `z`. */
  drawOrder: Int32Array;
  restPose: PoseBuffer;
}

export interface CompiledTrack {
  boneIndex: number;
  /** Offset into the pose buffer stride for this track's channel. */
  offset: number;
  times: Float32Array;
  values: Float32Array;
  eases: EaseFn[];
}

export interface CompiledClip {
  id: string;
  rig: string;
  duration: number;
  loop: boolean;
  tracks: CompiledTrack[];
  events: ClipEventDef[];
}

const PROP_OFFSET: Record<TrackProp, number> = {
  rot: ROT, x: X, y: Y, sx: SX, sy: SY, alpha: ALPHA,
};

/**
 * Validate, topologically sort, and convert to radians. Sorting parents ahead
 * of children lets the world-transform solver run as a single forward pass
 * with no recursion.
 */
export function compileRig(def: RigDef): CompiledRig {
  const byId = new Map<string, BoneDef>();
  for (const b of def.bones) {
    if (byId.has(b.id)) throw new Error(`Rig "${def.id}": duplicate bone "${b.id}"`);
    byId.set(b.id, b);
  }

  const sorted: BoneDef[] = [];
  const state = new Map<string, 'visiting' | 'done'>();

  const visit = (bone: BoneDef, trail: string[]): void => {
    const s = state.get(bone.id);
    if (s === 'done') return;
    if (s === 'visiting') {
      throw new Error(`Rig "${def.id}": bone cycle ${[...trail, bone.id].join(' -> ')}`);
    }
    state.set(bone.id, 'visiting');
    if (bone.parent !== null) {
      const parent = byId.get(bone.parent);
      if (!parent) throw new Error(`Rig "${def.id}": bone "${bone.id}" has unknown parent "${bone.parent}"`);
      visit(parent, [...trail, bone.id]);
    }
    state.set(bone.id, 'done');
    sorted.push(bone);
  };
  for (const b of def.bones) visit(b, []);

  const indexOf = new Map<string, number>();
  sorted.forEach((b, i) => indexOf.set(b.id, i));

  const bones: CompiledBone[] = sorted.map((b, i) => ({
    ...b,
    index: i,
    parentIndex: b.parent === null ? -1 : (indexOf.get(b.parent) as number),
    restRotation: b.rotation * DEG,
  }));

  const restPose = createPoseBuffer(bones.length);
  for (const b of bones) {
    const o = b.index * STRIDE;
    restPose[o + ROT] = b.restRotation;
    restPose[o + X] = b.x;
    restPose[o + Y] = b.y;
    restPose[o + SX] = 1;
    restPose[o + SY] = 1;
    restPose[o + ALPHA] = 1;
  }

  const drawOrder = Int32Array.from(
    bones.map((b) => b.index).sort((a, b) => bones[a].z - bones[b].z),
  );

  return { id: def.id, height: def.height, bones, indexOf, drawOrder, restPose };
}

export function compileClip(def: ClipDef, rig: CompiledRig): CompiledClip {
  const tracks: CompiledTrack[] = def.tracks.map((t) => {
    const boneIndex = rig.indexOf.get(t.bone);
    if (boneIndex === undefined) {
      throw new Error(`Clip "${def.id}": unknown bone "${t.bone}"`);
    }
    if (t.keys.length === 0) {
      throw new Error(`Clip "${def.id}": track ${t.bone}.${t.prop} has no keys`);
    }

    const keys = [...t.keys].sort((a, b) => a.t - b.t);
    const scale = t.prop === 'rot' ? DEG : 1;

    for (const k of keys) {
      if (k.t < 0 || k.t > def.duration) {
        throw new Error(
          `Clip "${def.id}": key at t=${k.t} on ${t.bone}.${t.prop} is outside duration ${def.duration}`,
        );
      }
    }

    return {
      boneIndex,
      offset: PROP_OFFSET[t.prop],
      times: Float32Array.from(keys, (k) => k.t),
      values: Float32Array.from(keys, (k) => k.v * scale),
      eases: keys.map((k) => resolveEase(k.ease)),
    };
  });

  const events = [...(def.events ?? [])].sort((a, b) => a.t - b.t);
  for (const e of events) {
    if (e.t < 0 || e.t > def.duration) {
      throw new Error(`Clip "${def.id}": event "${e.name}" at t=${e.t} is outside duration ${def.duration}`);
    }
  }

  return { id: def.id, rig: def.rig, duration: def.duration, loop: def.loop, tracks, events };
}
