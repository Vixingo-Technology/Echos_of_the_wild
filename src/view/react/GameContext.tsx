import { createContext, useContext } from 'react';
import type { GameLoop } from '@/controller/GameLoop';

const GameLoopContext = createContext<GameLoop | null>(null);

export const GameLoopProvider = GameLoopContext.Provider;

/** Available to anything rendered inside the game screen. */
export function useGameLoop(): GameLoop {
  const loop = useContext(GameLoopContext);
  if (!loop) throw new Error('useGameLoop must be used inside the game screen');
  return loop;
}
