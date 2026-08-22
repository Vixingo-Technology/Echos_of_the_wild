import { lazy, Suspense, useEffect, useState } from 'react';
import { useGameStore } from '@/bridge/gameStore';
import { MainMenu } from './view/react/screens/MainMenu';
import { GameScreen } from './view/react/screens/GameScreen';
import { Cutscene } from './view/react/screens/Cutscene';
// Lazily imported so the dev-only workbench never ships in the production bundle.
const RigEditor = lazy(() =>
  import('./view/react/devtools/RigEditor').then((m) => ({ default: m.RigEditor })),
);

/**
 * Hash routing, deliberately: the game is a single static bundle with no
 * server, so there is nothing to configure for deep links and no router
 * dependency to carry.
 */
function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export function App() {
  const route = useHashRoute();
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const [startMode, setStartMode] = useState<'new' | 'load'>('new');

  if (route === '#/rig' && import.meta.env.DEV) {
    return <Suspense fallback={null}><RigEditor /></Suspense>;
  }

  if (screen === 'cutscene') {
    return <Cutscene id="intro" onFinish={() => setScreen('playing')} />;
  }

  // GameScreen stays mounted across death and victory so the renderer is not
  // torn down and rebuilt every time the player retries.
  if (screen === 'playing' || screen === 'gameover' || screen === 'victory') {
    return <GameScreen startMode={startMode} />;
  }

  return (
    <MainMenu
      onNewGame={() => { setStartMode('new'); setScreen('cutscene'); }}
      onLoadGame={() => { setStartMode('load'); setScreen('playing'); }}
    />
  );
}
