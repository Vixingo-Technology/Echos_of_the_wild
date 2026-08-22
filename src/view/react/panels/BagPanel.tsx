import { useMemo, useState } from 'react';
import { useGameStore } from '@/bridge/gameStore';
import { item, type ItemDef } from '@/model/data/items';
import { MAX_PASSIVES } from '@/model/domain/Equipment';
import { useGameLoop } from '../GameContext';

type Tab = 'items' | 'crafting';

const FAILURE_TEXT: Record<string, string> = {
  locked: 'Recipe not discovered yet',
  'wrong-station': 'Needs a forge',
  'missing-materials': 'Not enough materials',
  'bag-full': 'Bag is full',
};

export function BagPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('items');

  return (
    <div className="panel-shell" role="dialog" aria-label="Bag">
      <div className="panel">
        <header className="panel__head">
          <h2>Bag</h2>
          <nav className="panel__tabs">
            <button type="button" className="chip" aria-pressed={tab === 'items'} onClick={() => setTab('items')}>
              Items
            </button>
            <button type="button" className="chip" aria-pressed={tab === 'crafting'} onClick={() => setTab('crafting')}>
              Crafting
            </button>
          </nav>
          <button type="button" className="panel__close" onClick={onClose} aria-label="Close">
            Esc
          </button>
        </header>

        {tab === 'items' ? <ItemsTab /> : <CraftingTab />}
      </div>
    </div>
  );
}

function ItemsTab() {
  const loop = useGameLoop();
  const slots = useGameStore((s) => s.slots);
  const weapon = useGameStore((s) => s.weapon);
  const passives = useGameStore((s) => s.passives);
  const [selected, setSelected] = useState<string | null>(null);

  const selectedDef: ItemDef | null = selected ? item(selected) : null;
  const cells = useMemo(() => Array.from({ length: 24 }, (_, i) => slots[i] ?? null), [slots]);

  const act = (fn: () => boolean) => {
    fn();
    loop.adapter.markBagDirty();
  };

  return (
    <div className="bag">
      <div className="bag__grid">
        {cells.map((slot, i) => {
          if (!slot) return <div key={i} className="slot slot--empty" />;
          const def = item(slot.item);
          const equipped = slot.item === weapon || passives.includes(slot.item);
          return (
            <button
              key={i}
              type="button"
              className={`slot slot--${def.category} ${selected === slot.item ? 'is-selected' : ''} ${equipped ? 'is-equipped' : ''}`}
              onClick={() => setSelected(slot.item)}
              title={def.name}
            >
              <span className="slot__name">{def.name}</span>
              {slot.qty > 1 && <span className="slot__qty">{slot.qty}</span>}
              {equipped && <span className="slot__badge">E</span>}
            </button>
          );
        })}
      </div>

      <aside className="bag__detail">
        {!selectedDef && <p className="muted">Select an item.</p>}
        {selectedDef && (
          <>
            <h3>{selectedDef.name}</h3>
            <p className="muted">{selectedDef.description}</p>

            {selectedDef.weapon && (
              <dl className="stats">
                <div><dt>Punch</dt><dd>{selectedDef.weapon.punchDamage}</dd></div>
                <div><dt>Kick</dt><dd>{selectedDef.weapon.kickDamage}</dd></div>
                <div><dt>Reach</dt><dd>+{selectedDef.weapon.reach}</dd></div>
              </dl>
            )}
            {selectedDef.heal && (
              <dl className="stats"><div><dt>Heals</dt><dd>{selectedDef.heal}</dd></div></dl>
            )}

            <div className="bag__actions">
              {selectedDef.category === 'weapon' && (
                weapon === selectedDef.id
                  ? <button type="button" className="btn btn--sm" onClick={() => act(() => loop.game.equipWeapon(null))}>Unequip</button>
                  : <button type="button" className="btn btn--sm" onClick={() => act(() => loop.game.equipWeapon(selectedDef.id))}>Equip</button>
              )}

              {selectedDef.category === 'passive' && (
                passives.includes(selectedDef.id)
                  ? <button type="button" className="btn btn--sm" onClick={() => act(() => loop.game.unequipPassive(selectedDef.id))}>Unequip</button>
                  : passives.length < MAX_PASSIVES
                    ? <button type="button" className="btn btn--sm" onClick={() => act(() => loop.game.equipPassive(selectedDef.id))}>Equip</button>
                    : passives.map((current, i) => (
                        <button key={current} type="button" className="btn btn--sm"
                                onClick={() => act(() => loop.game.equipPassive(selectedDef.id, i))}>
                          Replace {item(current).name}
                        </button>
                      ))
              )}

              {selectedDef.category === 'consumable' && (
                <button type="button" className="btn btn--sm" onClick={() => act(() => loop.game.useItem(selectedDef.id))}>Use</button>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function CraftingTab() {
  const loop = useGameLoop();
  const recipes = useGameStore((s) => s.recipes);
  const station = useGameStore((s) => s.station);

  const visible = recipes.filter((r) => r.unlocked);
  const hidden = recipes.length - visible.length;

  return (
    <div className="crafting">
      <p className="crafting__station">
        {station === 'forge' ? 'At a forge — smelting available' : 'No station nearby'}
      </p>

      {visible.length === 0 && <p className="muted">No recipes discovered yet. Break things.</p>}

      <ul className="recipes">
        {visible.map((status) => (
          <li key={status.recipe.id} className={status.craftable ? 'is-craftable' : ''}>
            <div className="recipes__head">
              <strong>{item(status.recipe.output.item).name}</strong>
              <button
                type="button"
                className="btn btn--sm"
                disabled={!status.craftable}
                onClick={() => { loop.game.craft(status.recipe.id); loop.adapter.markBagDirty(); }}
              >
                Craft
              </button>
            </div>
            <p className="muted">{item(status.recipe.output.item).description}</p>
            <ul className="ingredients">
              {status.ingredients.map((ing) => (
                <li key={ing.item} className={ing.have >= ing.need ? 'is-met' : ''}>
                  {item(ing.item).name} <span>{ing.have}/{ing.need}</span>
                </li>
              ))}
            </ul>
            {status.blockedBy && <p className="recipes__blocked">{FAILURE_TEXT[status.blockedBy]}</p>}
          </li>
        ))}
      </ul>

      {hidden > 0 && <p className="muted">{hidden} more recipe{hidden === 1 ? '' : 's'} undiscovered.</p>}
    </div>
  );
}
