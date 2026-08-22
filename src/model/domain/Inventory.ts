import { item } from '@/model/data/items';

export interface Slot {
  item: string;
  qty: number;
}

/**
 * Stack-based bag. Slots are kept in insertion order so the grid does not
 * reshuffle under the player's cursor when something is picked up.
 */
export class Inventory {
  private slots: Slot[] = [];

  constructor(private readonly capacity = 40) {}

  get all(): readonly Slot[] {
    return this.slots;
  }

  count(itemId: string): number {
    let total = 0;
    for (const s of this.slots) if (s.item === itemId) total += s.qty;
    return total;
  }

  has(itemId: string, qty = 1): boolean {
    return this.count(itemId) >= qty;
  }

  /** @returns how many were actually added; short of `qty` when the bag is full. */
  add(itemId: string, qty: number): number {
    const def = item(itemId);
    let remaining = qty;

    for (const slot of this.slots) {
      if (remaining <= 0) break;
      if (slot.item !== itemId || slot.qty >= def.stackSize) continue;
      const room = def.stackSize - slot.qty;
      const moved = Math.min(room, remaining);
      slot.qty += moved;
      remaining -= moved;
    }

    while (remaining > 0 && this.slots.length < this.capacity) {
      const moved = Math.min(def.stackSize, remaining);
      this.slots.push({ item: itemId, qty: moved });
      remaining -= moved;
    }

    return qty - remaining;
  }

  /** @returns true only if the full quantity was removed; otherwise a no-op. */
  remove(itemId: string, qty: number): boolean {
    if (!this.has(itemId, qty)) return false;

    let remaining = qty;
    for (let i = this.slots.length - 1; i >= 0 && remaining > 0; i--) {
      const slot = this.slots[i];
      if (slot.item !== itemId) continue;
      const taken = Math.min(slot.qty, remaining);
      slot.qty -= taken;
      remaining -= taken;
      if (slot.qty === 0) this.slots.splice(i, 1);
    }
    return true;
  }

  get isFull(): boolean {
    return this.slots.length >= this.capacity;
  }

  toJSON(): Slot[] {
    return this.slots.map((s) => ({ ...s }));
  }

  load(slots: Slot[]): void {
    this.slots = slots.filter((s) => s.qty > 0).map((s) => ({ ...s }));
  }

  clear(): void {
    this.slots = [];
  }
}
