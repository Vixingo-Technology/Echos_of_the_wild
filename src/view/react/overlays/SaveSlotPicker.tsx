import { useEffect, useState } from 'react';
import { useGameStore } from '@/bridge/gameStore';
import { MANUAL_SLOTS, AUTOSAVE_SLOT } from '@/services/SaveRepository';
import { useGameLoop } from '../GameContext';

const formatTime = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

interface Props {
  /** In-game the picker can both save and load; from the menu it only loads. */
  mode: 'save-load' | 'load';
  onClose: () => void;
}

export function SaveSlotPicker({ mode, onClose }: Props) {
  const loop = useGameLoop();
  const saves = useGameStore((s) => s.saves);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { void loop.refreshSaves(); }, [loop]);

  const slots = mode === 'load' ? [...MANUAL_SLOTS, AUTOSAVE_SLOT] : [...MANUAL_SLOTS];

  const save = async (slot: string) => {
    setBusy(slot);
    await loop.saveToSlot(slot);
    setBusy(null);
  };

  const load = async (slot: string) => {
    setBusy(slot);
    const ok = await loop.loadFromSlot(slot);
    setBusy(null);
    if (ok) onClose();
  };

  return (
    <div className="panel-shell" role="dialog" aria-label="Save slots">
      <div className="panel panel--narrow">
        <header className="panel__head">
          <h2>{mode === 'load' ? 'Load Game' : 'Save / Load'}</h2>
          <button type="button" className="panel__close" onClick={onClose}>Esc</button>
        </header>

        <ul className="slots">
          {slots.map((slot) => {
            const summary = saves[slot];
            const isAuto = slot === AUTOSAVE_SLOT;
            return (
              <li key={slot} className="slots__row">
                <div className="slots__info">
                  <strong>{isAuto ? 'Autosave' : `Slot ${slot.slice(-1)}`}</strong>
                  {summary ? (
                    <span className="muted">
                      {summary.levelName} · {summary.hp}/{summary.maxHp} HP · {formatTime(summary.playtimeMs)}
                      {' · '}{new Date(summary.savedAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="muted">Empty</span>
                  )}
                </div>
                <div className="slots__actions">
                  {mode === 'save-load' && !isAuto && (
                    <button type="button" className="btn btn--sm" disabled={busy === slot} onClick={() => void save(slot)}>
                      Save
                    </button>
                  )}
                  <button type="button" className="btn btn--sm" disabled={!summary || busy === slot} onClick={() => void load(slot)}>
                    Load
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
