import type { EaseName } from './types';

export type EaseFn = (t: number) => number;

const PI = Math.PI;

/**
 * Easing applied to the normalized 0..1 progress within a keyframe segment.
 * `hold` is the step function - useful for snapping a part swap (open hand ->
 * fist) at an exact instant rather than sliding it.
 */
export const EASING: Record<EaseName, EaseFn> = {
  linear: (t) => t,

  quadIn: (t) => t * t,
  quadOut: (t) => t * (2 - t),
  quadInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  cubicIn: (t) => t * t * t,
  cubicOut: (t) => 1 - Math.pow(1 - t, 3),
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),

  sineIn: (t) => 1 - Math.cos((t * PI) / 2),
  sineOut: (t) => Math.sin((t * PI) / 2),
  sineInOut: (t) => -(Math.cos(PI * t) - 1) / 2,

  expoOut: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),

  /** Overshoots past the target then settles. The anticipation/snap of a punch. */
  backOut: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  hold: () => 0,
};

export function resolveEase(name: EaseName | undefined): EaseFn {
  if (name === undefined) return EASING.cubicInOut;
  const fn = EASING[name];
  if (!fn) throw new Error(`Unknown easing "${name}"`);
  return fn;
}
