import { useGameStore } from '@/bridge/gameStore';

export function GameOver({ onRetry, onMenu }: { onRetry: () => void; onMenu: () => void }) {
  return (
    <main className="menu menu--end">
      <div className="menu__inner">
        <h1 className="title title--fail">You Died</h1>
        <p className="tagline">The Cretaceous does not keep records.</p>
        <nav className="menu__options">
          <button type="button" className="btn" onClick={onRetry}>Try Again</button>
          <button type="button" className="btn" onClick={onMenu}>Exit to Main Menu</button>
        </nav>
      </div>
    </main>
  );
}

export function Victory({ onMenu }: { onMenu: () => void }) {
  const levelName = useGameStore((s) => s.levelName);

  return (
    <main className="menu menu--end">
      <div className="menu__inner">
        <h1 className="title">Out of the <span className="title__accent">Dark</span></h1>
        <p className="tagline">Taro reaches the cave mouth</p>
        <p className="endnote">
          That is the end of the vertical slice: {levelName || 'the cave'} run from menu to daylight.
          The jungle, the shop NPC and the rest of the biomes come next.
        </p>
        <nav className="menu__options">
          <button type="button" className="btn" onClick={onMenu}>Back to Main Menu</button>
        </nav>
      </div>
    </main>
  );
}
