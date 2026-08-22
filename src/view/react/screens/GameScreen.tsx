import { useEffect, useRef, useState } from 'react';
import { GameLoop } from '@/controller/GameLoop';
import { useGameStore } from '@/bridge/gameStore';
import { GameLoopProvider, useGameLoop } from '../GameContext';
import { Hud } from '../hud/Hud';
import { BagPanel } from '../panels/BagPanel';
import { PauseMenu } from '../overlays/PauseMenu';
import { SaveSlotPicker } from '../overlays/SaveSlotPicker';
import { SettingsPanel } from '../overlays/SettingsPanel';
import { GameOver, Victory } from './EndScreens';

/**
 * Hosts the canvas and the UI that sits on top of it.
 *
 * The loop is created once and torn down on unmount; React never touches the
 * simulation directly, only the store the loop publishes to.
 */
export function GameScreen({ startMode }: { startMode: 'new' | 'load' }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [loop, setLoop] = useState<GameLoop | null>(null);
  const startModeRef = useRef(startMode);

  useEffect(() => {
    const parent = stageRef.current;
    if (!parent) return;

    const instance = new GameLoop();
    let cancelled = false;

    void instance.attach(parent).then(() => {
      if (cancelled) return;
      // Loading still needs a world to render behind the slot picker, so both
      // paths start a game and the load path immediately offers to replace it.
      instance.newGame();
      instance.start();
      setLoop(instance);
      // Dev-only handle so the running simulation can be inspected from the
      // console (and by the browser tooling) without wiring debug UI.
      if (import.meta.env.DEV) {
        (window as unknown as { dinopunk?: GameLoop }).dinopunk = instance;
      }
      if (startModeRef.current === 'load') {
        void instance.refreshSaves();
        useGameStore.getState().pushOverlay('saves');
      }
    });

    return () => {
      cancelled = true;
      setLoop(null);
      const w = window as unknown as { dinopunk?: GameLoop };
      if (w.dinopunk === instance) delete w.dinopunk;
      instance.destroy();
    };
  }, []);

  return (
    <div className="game">
      <div className="game__stage" ref={stageRef} />
      {loop ? (
        <GameLoopProvider value={loop}>
          <Hud />
          <Overlays />
          <EndState />
        </GameLoopProvider>
      ) : (
        <div className="game__loading">Waking up&hellip;</div>
      )}
    </div>
  );
}

function EndState() {
  const loop = useGameLoop();
  const screen = useGameStore((s) => s.screen);

  if (screen === 'gameover') {
    return <GameOver onRetry={() => loop.newGame()} onMenu={() => loop.exitToMenu()} />;
  }
  if (screen === 'victory') {
    return <Victory onMenu={() => loop.exitToMenu()} />;
  }
  return null;
}

function Overlays() {
  const overlays = useGameStore((s) => s.overlays);
  const popOverlay = useGameStore((s) => s.popOverlay);
  const top = overlays[overlays.length - 1];

  switch (top) {
    case 'bag': return <BagPanel onClose={() => popOverlay()} />;
    case 'pause': return <PauseMenu />;
    case 'saves': return <SaveSlotPicker mode="save-load" onClose={() => popOverlay()} />;
    case 'settings': return <SettingsPanel onClose={() => popOverlay()} />;
    default: return null;
  }
}
