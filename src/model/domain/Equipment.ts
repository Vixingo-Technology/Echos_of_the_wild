import { item, type PassiveStats, type WeaponStats } from '@/model/data/items';

export const MAX_PASSIVES = 2;

/** Bare-handed baseline, used when no weapon is equipped. */
const FISTS: WeaponStats = { punchDamage: 0, kickDamage: 0, knockback: 0, reach: 0 };

/**
 * Exactly one active weapon and at most two passives, as specified. Equipping
 * validates against the item's category so a stack of wood can never end up in
 * the weapon slot.
 */
export class Equipment {
  weapon: string | null = null;
  passives: string[] = [];

  equipWeapon(itemId: string | null): boolean {
    if (itemId === null) {
      this.weapon = null;
      return true;
    }
    if (item(itemId).category !== 'weapon') return false;
    this.weapon = itemId;
    return true;
  }

  hasPassive(itemId: string): boolean {
    return this.passives.includes(itemId);
  }

  /**
   * @param replaceIndex which of the two slots to overwrite when both are full.
   * @returns false when both slots are taken and no index was given.
   */
  equipPassive(itemId: string, replaceIndex?: number): boolean {
    if (item(itemId).category !== 'passive') return false;
    if (this.hasPassive(itemId)) return false;

    if (this.passives.length < MAX_PASSIVES) {
      this.passives.push(itemId);
      return true;
    }
    if (replaceIndex === undefined || replaceIndex < 0 || replaceIndex >= MAX_PASSIVES) {
      return false;
    }
    this.passives[replaceIndex] = itemId;
    return true;
  }

  unequipPassive(itemId: string): boolean {
    const i = this.passives.indexOf(itemId);
    if (i < 0) return false;
    this.passives.splice(i, 1);
    return true;
  }

  get weaponStats(): WeaponStats {
    if (!this.weapon) return FISTS;
    return item(this.weapon).weapon ?? FISTS;
  }

  /** Passive effects summed into one object, so callers never loop. */
  get modifiers(): Required<Omit<PassiveStats, 'doubleJump'>> & { doubleJump: boolean } {
    const total = {
      damageBonus: 0,
      damageResist: 0,
      bloodBonus: 0,
      sprintBonus: 1,
      healBonus: 1,
      doubleJump: false,
    };

    for (const id of this.passives) {
      const p = item(id).passive;
      if (!p) continue;
      total.damageBonus += p.damageBonus ?? 0;
      total.damageResist += p.damageResist ?? 0;
      total.bloodBonus += p.bloodBonus ?? 0;
      if (p.sprintBonus) total.sprintBonus *= p.sprintBonus;
      if (p.healBonus) total.healBonus *= p.healBonus;
      if (p.doubleJump) total.doubleJump = true;
    }

    // Resistance stacks additively but must never reach immunity.
    total.damageResist = Math.min(total.damageResist, 0.8);
    return total;
  }

  toJSON() {
    return { weapon: this.weapon, passives: [...this.passives] };
  }

  load(data: { weapon: string | null; passives: string[] }): void {
    this.weapon = data.weapon;
    this.passives = data.passives.slice(0, MAX_PASSIVES);
  }

  reset(): void {
    this.weapon = null;
    this.passives = [];
  }
}
