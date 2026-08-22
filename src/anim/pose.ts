/**
 * Pose buffers are flat Float32Arrays, STRIDE floats per bone, indexed by the
 * bone's compiled index. Flat buffers keep the per-frame sampling path free of
 * allocation, which matters when several rigs are on screen at 60Hz.
 */

export const ROT = 0;
export const X = 1;
export const Y = 2;
export const SX = 3;
export const SY = 4;
export const ALPHA = 5;
export const STRIDE = 6;

export type PoseBuffer = Float32Array;

export function createPoseBuffer(boneCount: number): PoseBuffer {
  return new Float32Array(boneCount * STRIDE);
}

const TWO_PI = Math.PI * 2;

/** Wrap to (-PI, PI]. */
export function wrapAngle(a: number): number {
  let r = a % TWO_PI;
  if (r > Math.PI) r -= TWO_PI;
  else if (r <= -Math.PI) r += TWO_PI;
  return r;
}

/** Interpolate rotations the short way round, so a crossfade never spins. */
export function lerpAngle(a: number, b: number, t: number): number {
  return a + wrapAngle(b - a) * t;
}

/**
 * Blend `from` toward `to` by weight `w` into `out`. Rotation takes the short
 * arc; everything else is a plain lerp.
 */
export function blendPose(from: PoseBuffer, to: PoseBuffer, w: number, out: PoseBuffer): void {
  for (let i = 0; i < out.length; i += STRIDE) {
    out[i + ROT] = lerpAngle(from[i + ROT], to[i + ROT], w);
    out[i + X] = from[i + X] + (to[i + X] - from[i + X]) * w;
    out[i + Y] = from[i + Y] + (to[i + Y] - from[i + Y]) * w;
    out[i + SX] = from[i + SX] + (to[i + SX] - from[i + SX]) * w;
    out[i + SY] = from[i + SY] + (to[i + SY] - from[i + SY]) * w;
    out[i + ALPHA] = from[i + ALPHA] + (to[i + ALPHA] - from[i + ALPHA]) * w;
  }
}
