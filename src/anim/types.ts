/**
 * Skeletal rig + clip data types.
 *
 * Everything here is pure data with no runtime dependencies, so both the model
 * (which cares about clip *timing* and *events*) and the view (which cares about
 * the resulting pose) can read it without violating the layer boundary.
 *
 * Authoring convention: all angles in JSON are DEGREES. The compiler converts
 * them to radians once, at load. Hand-editing radians is miserable.
 */

export type EaseName =
  | 'linear'
  | 'quadIn' | 'quadOut' | 'quadInOut'
  | 'cubicIn' | 'cubicOut' | 'cubicInOut'
  | 'sineIn' | 'sineOut' | 'sineInOut'
  | 'expoOut'
  | 'backOut'
  | 'hold';

/** Which channel of a bone's local transform a track drives. */
export type TrackProp = 'rot' | 'x' | 'y' | 'sx' | 'sy' | 'alpha';

/** A placeholder shape, drawn when a bone has no texture bound yet. */
export interface PlaceholderDef {
  /** Width along the bone's local X axis. */
  w: number;
  /** Height along the bone's local Y axis. */
  h: number;
  color: number;
  /** 0..1 within the shape; the pivot the bone rotates around. */
  anchorX: number;
  anchorY: number;
  /** Corner radius, purely cosmetic. */
  radius?: number;
}

export interface SpriteDef {
  texture: string;
  anchorX: number;
  anchorY: number;
}

export interface BoneDef {
  id: string;
  parent: string | null;
  /** Rest offset from the parent's pivot, in the parent's local space. */
  x: number;
  y: number;
  /** Rest rotation, DEGREES. */
  rotation: number;
  /** Bone length; used for IK and debug drawing, not for transforms. */
  length: number;
  /** Draw order within the rig. Higher draws in front. */
  z: number;
  sprite?: SpriteDef;
  placeholder?: PlaceholderDef;
}

export interface RigDef {
  id: string;
  /** Nominal height in world units, used to scale the rig to the character. */
  height: number;
  bones: BoneDef[];
}

export interface KeyframeDef {
  /** Time in seconds from clip start. */
  t: number;
  /** Value. DEGREES for `rot`, world units for x/y, multiplier for sx/sy/alpha. */
  v: number;
  /** Easing applied on the segment that STARTS at this key. Default 'cubicInOut'. */
  ease?: EaseName;
}

export interface TrackDef {
  bone: string;
  prop: TrackProp;
  keys: KeyframeDef[];
}

/**
 * A gameplay signal emitted at a point in the clip. This is how animation
 * drives combat: the punch clip carries `hitboxOn`/`hitboxOff`, so the active
 * frames and the visuals can never drift apart.
 */
export interface ClipEventDef {
  t: number;
  name: string;
}

export interface ClipDef {
  id: string;
  rig: string;
  duration: number;
  loop: boolean;
  tracks: TrackDef[];
  events?: ClipEventDef[];
}
