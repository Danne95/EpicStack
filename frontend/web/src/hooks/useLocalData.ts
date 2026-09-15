import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { GameSession } from './gameController';
import type { GameState } from '../../../../shared/types/index';
import { recordVictory } from './localData';
import { createLocalStore } from './localStore';

export function useLocalData(session: GameSession) {
  const [store] = useState(() =>
    createLocalStore({
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
    }),
  );
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const recorded = useRef(new WeakSet<GameState>());
  useEffect(() => {
    const game = session.game;
    if (game?.status !== 'won' || recorded.current.has(game)) return;
    recorded.current.add(game);
    store.update((previous) => recordVictory(previous, game, session.difficulty));
  }, [session.game, session.difficulty, store]);
  return { ...snapshot, setData: store.update };
}
