import type { CompiledClip, CompiledRig, CompiledTrack } from './compile';
import { ALPHA, ROT, STRIDE, SX, SY, X, Y, type PoseBuffer } from './pose';

/** Value of a single track at time `t`, with the segment's easing applied. */
export function sampleTrack(track: CompiledTrack, t: number): number {
  const { times, values, eases } = track;
  const n = times.length;

  if (t <= times[0]) return values[0];
  if (t >= times[n - 1]) return values[n - 1];

  // Largest index with times[i] <= t.
  let lo = 0;
  let hi = n - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid;
    else hi = mid;
  }

  const span = times[lo + 1] - times[lo];
  const u = span > 0 ? (t - times[lo]) / span : 0;
  const e = eases[lo](u);
  return values[lo] + (values[lo + 1] - values[lo]) * e;
}

/**
 * Sample a clip into `out`. Bones the clip does not animate keep their rest
 * value, which is what lets a clip touch only the bones it cares about.
 */
export function samplePose(clip: CompiledClip, time: number, rig: CompiledRig, out: PoseBuffer): void {
  out.set(rig.restPose);
  for (const track of clip.tracks) {
    out[track.boneIndex * STRIDE + track.offset] = sampleTrack(track, time);
  }
}

/**
 * Compose local transforms down the hierarchy into world transforms. Because
 * `rig.bones` is topologically sorted, this is a single forward pass.
 *
 * Assumes no shear, which holds for translate/rotate/scale bone transforms.
 */
export function solveWorld(rig: CompiledRig, local: PoseBuffer, out: PoseBuffer): void {
  const bones = rig.bones;
  for (let i = 0; i < bones.length; i++) {
    const o = i * STRIDE;
    const p = bones[i].parentIndex;

    if (p < 0) {
      out[o + ROT] = local[o + ROT];
      out[o + X] = local[o + X];
      out[o + Y] = local[o + Y];
      out[o + SX] = local[o + SX];
      out[o + SY] = local[o + SY];
      out[o + ALPHA] = local[o + ALPHA];
      continue;
    }

    const po = p * STRIDE;
    const pr = out[po + ROT];
    const psx = out[po + SX];
    const psy = out[po + SY];
    const cos = Math.cos(pr);
    const sin = Math.sin(pr);

    const lx = local[o + X] * psx;
    const ly = local[o + Y] * psy;

    out[o + X] = out[po + X] + lx * cos - ly * sin;
    out[o + Y] = out[po + Y] + lx * sin + ly * cos;
    out[o + ROT] = pr + local[o + ROT];
    out[o + SX] = psx * local[o + SX];
    out[o + SY] = psy * local[o + SY];
    out[o + ALPHA] = out[po + ALPHA] * local[o + ALPHA];
  }
}
