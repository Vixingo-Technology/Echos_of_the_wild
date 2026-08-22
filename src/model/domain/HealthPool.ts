import { BLOOD, PLAYER } from '@/model/tuning';
import type { Health } from '@/model/core/types';

export function createHealth(max: number): Health {
  return { current: max, max, invulnerable: 0, hitstop: 0 };
}

/**
 * Taro's two resources.
 *
 * Health lives in the entity's `Health` component, exactly like every other
 * damageable thing, so CombatSystem needs no special case for the player. This
 * class binds to that component and adds the blood on top.
 *
 * Blood is the game's signature mechanic: a kill yields 1-5 points which fill
 * the meter GRADUALLY, so the gain reads as draining the corpse rather than as
 * a number popping up. Holding S spends one point for a full heal.
 */
export class HealthPool {
  /** Points banked and spendable. */
  vials = 0;
  /** Points still flowing in, drained into `vials` over time. */
  private pending = 0;
  private fillTimer = 0;
  private health: Health = createHealth(PLAYER.maxHealth);

  /** Point the pool at the live player entity's health component. */
  bind(health: Health): void {
    this.health = health;
  }

  get component(): Health {
    return this.health;
  }

  get current(): number { return this.health.current; }
  get max(): number { return this.health.max; }
  get isFull(): boolean { return this.health.current >= this.health.max; }
  get isDead(): boolean { return this.health.current <= 0; }
  get ratio(): number { return this.health.max > 0 ? Math.max(0, this.health.current / this.health.max) : 0; }

  /** Still-arriving points, for the HUD's ghost pip. */
  get incoming(): number { return this.pending; }

  heal(amount: number): number {
    const healed = Math.min(amount, this.health.max - this.health.current);
    this.health.current += healed;
    return healed;
  }

  healFull(): number {
    return this.heal(this.health.max);
  }

  /** Queue blood from a kill. It arrives over the next few tenths of a second. */
  gainBlood(points: number): void {
    const room = PLAYER.maxBloodVials - this.vials - this.pending;
    this.pending += Math.max(0, Math.min(points, room));
  }

  /** @returns true if a vial was available and spent. */
  consumeVial(): boolean {
    if (this.vials <= 0) return false;
    this.vials -= 1;
    return true;
  }

  /** @returns points that landed this tick, so the HUD can tick a pip sound. */
  update(dt: number): number {
    if (this.health.invulnerable > 0) this.health.invulnerable = Math.max(0, this.health.invulnerable - dt);
    if (this.pending <= 0) return 0;

    this.fillTimer += dt;
    let landed = 0;
    while (this.fillTimer >= BLOOD.fillSecondsPerPoint && this.pending > 0) {
      this.fillTimer -= BLOOD.fillSecondsPerPoint;
      this.pending -= 1;
      this.vials += 1;
      landed += 1;
    }
    if (this.pending <= 0) this.fillTimer = 0;
    return landed;
  }

  reset(): void {
    this.vials = 0;
    this.pending = 0;
    this.fillTimer = 0;
    this.health = createHealth(PLAYER.maxHealth);
  }
}
