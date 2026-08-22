import { useGameStore } from '@/bridge/gameStore';
import { useGameLoop } from '../GameContext';

export function PauseMenu() {
  const loop = useGameLoop();
  const popOverlay = useGameStore((s) => s.popOverlay);
  const pushOverlay = useGameStore((s) => s.pushOverlay);

  return (
    <div className="panel-shell" role="dialog" aria-label="Paused">
      <div className="panel panel--narrow">
        <header className="panel__head"><h2>Paused</h2></header>
        <nav className="menu__options">
          <button type="button" className="btn" onClick={() => popOverlay()}>Resume</button>
          <button type="button" className="btn" onClick={() => { void loop.refreshSaves(); pushOverlay('saves'); }}>
            Save / Load
          </button>
          <button type="button" className="btn" onClick={() => pushOverlay('settings')}>Settings</button>
          <button type="button" className="btn" onClick={() => loop.exitToMenu()}>Exit to Main Menu</button>
        </nav>
      </div>
    </div>
  );
}
