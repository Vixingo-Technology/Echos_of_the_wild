import { useEffect, useState } from 'react';
import { useGameStore } from '@/bridge/gameStore';
import { SaveRepository, ALL_SLOTS } from '@/services/SaveRepository';
import { Credits } from './Credits';
import { SettingsPanel } from '../overlays/SettingsPanel';

interface Props {
  onNewGame: () => void;
  onLoadGame: () => void;
}

export function MainMenu({ onNewGame, onLoadGame }: Props) {
  const pushOverlay = useGameStore((s) => s.pushOverlay);
  const overlays = useGameStore((s) => s.overlays);
  const popOverlay = useGameStore((s) => s.popOverlay);
  const [hasSaves, setHasSaves] = useState(false);

  // "Load Game" stays disabled until there is actually something to load,
  // rather than opening an empty list.
  useEffect(() => {
    let alive = true;
    void (async () => {
      for (const slot of ALL_SLOTS) {
        if (await SaveRepository.read(slot)) {
          if (alive) setHasSaves(true);
          return;
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && useGameStore.getState().overlays.length > 0) popOverlay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [popOverlay]);

  return (
    <main className="menu">
      <div className="menu__inner">
        <h1 className="title">
          Dino<span className="title__accent">Punk</span>
        </h1>
        <p className="tagline">Stranded 66 million years from home</p>

        <nav className="menu__options" aria-label="Main menu">
          <button type="button" className="btn" onClick={onNewGame}>New Game</button>
          <button type="button" className="btn" disabled={!hasSaves} onClick={onLoadGame}>
            Load Game
            {!hasSaves && <span className="btn__note">No saved games yet</span>}
          </button>
          <button type="button" className="btn" onClick={() => pushOverlay('settings')}>Settings</button>
          <button type="button" className="btn" onClick={() => pushOverlay('credits')}>Credits</button>
        </nav>
      </div>

      <footer className="menu__footer">
        <span>Phase 1 &middot; vertical slice</span>
        {import.meta.env.DEV && <a href="#/rig">Rig editor &rarr;</a>}
      </footer>

      {overlays[overlays.length - 1] === 'credits' && <Credits onClose={() => popOverlay()} />}
      {overlays[overlays.length - 1] === 'settings' && <SettingsPanel onClose={() => popOverlay()} />}
    </main>
  );
}
