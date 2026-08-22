/**
 * Every number that decides how the game FEELS, in one file.
 *
 * World units are rig units: Taro stands 174 tall and a tile is 64, so he is
 * a shade under three tiles. Positive Y is down, matching the rig convention.
 */

export const TILE = 64;

export const PHYSICS = {
  gravity: 2400,
  maxFallSpeed: 1500,
  /** Horizontal drag applied when the player gives no input, units/s^2. */
  groundFriction: 3200,
  airFriction: 900,
} as const;

export const PLAYER = {
  /** Collider is a box around the rig, not the rig's full silhouette. */
  width: 46,
  height: 158,

  walkSpeed: 230,
  sprintSpeed: 400,
  groundAccel: 2600,
  airAccel: 1500,

  jumpVelocity: 1000,
  /** Releasing jump early cuts upward speed by this fraction. */
  jumpCutMultiplier: 0.45,
  /** Grace period after walking off a ledge during which jump still works. */
  coyoteTime: 0.1,
  /** Pressing jump this long before landing still triggers a jump. */
  jumpBufferTime: 0.12,

  maxHealth: 100,
  maxBloodVials: 10,
  /** Seconds of holding S to complete an injection. */
  injectDuration: 1.2,
  /** Invulnerability after taking a hit. */
  invulnerableTime: 0.6,

  climbSpeed: 190,
  knockbackX: 260,
  knockbackY: 320,
} as const;

export const COMBAT = {
  /** Frames both entities freeze on a connecting hit - the cheapest way to
   *  make an attack feel like it has weight. */
  hitstopFrames: 4,
  punchDamage: 8,
  kickDamage: 14,
  /** Damage multiplier for the 2nd and 3rd hits of the punch chain. */
  comboMultipliers: [1, 1.15, 1.45],
  /** Window after an attack in which the next punch continues the chain. */
  comboWindow: 0.42,
  /** Kick knocks enemies back this far; punch does a fraction of it. */
  kickKnockback: 340,
  punchKnockback: 120,
} as const;

export const BLOOD = {
  minPerKill: 1,
  maxPerKill: 5,
  /** Seconds per pip while the meter fills, so a kill reads as draining it. */
  fillSecondsPerPoint: 0.4,
} as const;

export const CAMERA = {
  /** Fraction of the viewport the player can move within before the camera
   *  follows. Keeps small hops from swinging the whole screen. */
  deadzoneX: 0.16,
  deadzoneY: 0.22,
  /** How far ahead the camera leads the player's facing, in units. */
  lookahead: 150,
  lookaheadSmoothing: 2.5,
  followSmoothing: 8,
} as const;

export const ENEMY = {
  miniDino: {
    width: 74,
    height: 62,
    maxHealth: 30,
    patrolSpeed: 90,
    chaseSpeed: 185,
    /** Distance at which a patrolling dino notices Taro. */
    aggroRange: 420,
    /** Distance at which it commits to a bite. */
    attackRange: 92,
    attackDamage: 12,
    attackCooldown: 1.1,
    /** How long it keeps chasing after losing sight. */
    loseInterestTime: 2.5,
  },
} as const;

/** Fixed simulation step. The loop never varies this. */
export const FIXED_DT = 1 / 60;
