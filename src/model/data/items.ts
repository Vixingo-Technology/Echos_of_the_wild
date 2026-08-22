export type ItemCategory = 'material' | 'consumable' | 'weapon' | 'passive' | 'currency' | 'quest';

export interface WeaponStats {
  /** Replaces the bare-handed punch/kick damage when equipped. */
  punchDamage: number;
  kickDamage: number;
  knockback: number;
  /** Extra reach added to the attack hitbox, in world units. */
  reach: number;
}

export interface PassiveStats {
  /** Multiplier on outgoing damage, e.g. 0.2 = +20%. */
  damageBonus?: number;
  /** Fraction of incoming damage ignored. */
  damageResist?: number;
  /** Extra blood points per kill. */
  bloodBonus?: number;
  /** Multiplier on sprint speed. */
  sprintBonus?: number;
  /** Multiplier on healing from consumables. */
  healBonus?: number;
  doubleJump?: boolean;
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  stackSize: number;
  /** Price in gold bars when sold by the shop NPC. */
  price?: number;
  /** Real-money SKU. Never gameplay-affecting - see EntitlementProvider. */
  premiumSku?: string;
  heal?: number;
  weapon?: WeaponStats;
  passive?: PassiveStats;
}

const defs: ItemDef[] = [
  // -------------------------------------------------------------- materials
  { id: 'dino_bone', name: 'Dinosaur Bone', category: 'material', stackSize: 99, price: 1,
    description: 'Dense, still warm. The obvious thing to hit something with.' },
  { id: 'wood', name: 'Wood', category: 'material', stackSize: 99, price: 1,
    description: 'Splintered branches from a fallen tree.' },
  { id: 'stone', name: 'Stone', category: 'material', stackSize: 99, price: 1,
    description: 'Rough grey rock. Heavier than it looks.' },
  { id: 'iron_ore', name: 'Iron Ore', category: 'material', stackSize: 99, price: 3,
    description: 'Rust-streaked ore. Needs a forge to be useful.' },
  { id: 'gold_nugget', name: 'Gold Nugget', category: 'material', stackSize: 99, price: 2,
    description: 'Soft, bright, and worthless until you smelt three of them.' },
  { id: 'rare_egg', name: 'Speckled Egg', category: 'material', stackSize: 12, price: 15,
    description: 'Warm to the touch. Something in there is still deciding.' },

  // -------------------------------------------------------------- currency
  { id: 'gold_bar', name: 'Gold Bar', category: 'currency', stackSize: 999,
    description: 'The only thing the hooded one seems to want.' },

  // ------------------------------------------------------------ consumables
  { id: 'apple', name: 'Apple', category: 'consumable', stackSize: 20, price: 2, heal: 25,
    description: 'Bruised but edible. Restores a little health.' },

  // ---------------------------------------------------------------- weapons
  { id: 'bone_club', name: 'Bone Club', category: 'weapon', stackSize: 1, price: 12,
    description: 'A femur with the grip wrapped in torn lab coat.',
    weapon: { punchDamage: 18, kickDamage: 22, knockback: 320, reach: 18 } },
  { id: 'stone_axe', name: 'Stone Axe', category: 'weapon', stackSize: 1, price: 26,
    description: 'Crude, heavy, and very good at breaking rock.',
    weapon: { punchDamage: 26, kickDamage: 30, knockback: 380, reach: 24 } },
  { id: 'iron_blade', name: 'Iron Blade', category: 'weapon', stackSize: 1, price: 55,
    description: 'Smelted, folded, and sharpened against a boulder.',
    weapon: { punchDamage: 38, kickDamage: 44, knockback: 400, reach: 30 } },
  { id: 'gold_spear', name: 'Gilded Spear', category: 'weapon', stackSize: 1, price: 110,
    description: 'Absurdly impractical. Hits like a falling tree.',
    weapon: { punchDamage: 52, kickDamage: 60, knockback: 460, reach: 44 } },

  // --------------------------------------------------------------- passives
  { id: 'iron_skin', name: 'Iron Plating', category: 'passive', stackSize: 1, price: 40,
    description: 'Scrap iron lashed over the lab coat. Takes 25% less damage.',
    passive: { damageResist: 0.25 } },
  { id: 'swift_boots', name: 'Bound Boots', category: 'passive', stackSize: 1, price: 30,
    description: 'Rebound with sinew and bark. Sprint 30% faster.',
    passive: { sprintBonus: 1.3 } },
  { id: 'blood_harvest', name: 'Harvest Syringe', category: 'passive', stackSize: 1, price: 45,
    description: 'Draws two extra points of blood from every kill.',
    passive: { bloodBonus: 2 } },
  { id: 'orchard_lore', name: 'Orchard Lore', category: 'passive', stackSize: 1, price: 22,
    description: 'You have learned which apples are worth eating. Heal 60% more.',
    passive: { healBonus: 1.6 } },

  // ------------------------------------------------------------------ quest
  { id: 'relic_shard', name: 'Relic Shard', category: 'quest', stackSize: 9,
    description: 'It hums, and the remote hums back.' },
  { id: 'portal_remote', name: 'Portal Remote', category: 'quest', stackSize: 1,
    description: 'Cracked screen, dead battery, and the only way home.' },
];

export const ITEMS: ReadonlyMap<string, ItemDef> = new Map(defs.map((d) => [d.id, d]));

export function item(id: string): ItemDef {
  const def = ITEMS.get(id);
  if (!def) throw new Error(`Unknown item "${id}"`);
  return def;
}

export const CURRENCY_ITEM = 'gold_bar';
