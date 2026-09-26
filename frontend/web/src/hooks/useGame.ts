import { useEffect, useReducer, useRef } from 'react';
import type { Difficulty } from '../../../../shared/ai/difficulty';
import { createGame } from '../../../../shared/game/gameState';
import type { GameState } from '../../../../shared/types/index';
import { COMPUTER_PLAYER, EMPTY_SESSION, HUMAN_PLAYER, sessionReducer } from './gameController';

/** Independent browser samples: AI decisions cannot advance a seeded game-roll generator. */
function browserRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
}

// Gives the thinking indicator time to be perceived; never waits for an animation event.
const COMPUTER_THINKING_MS = 550;

export function useGame(active: boolean) {
  const opening = useRef<{ game: GameState; difficulty: Difficulty } | null>(null);
  const [session, dispatch] = useReducer(sessionReducer, EMPTY_SESSION);
  const game = session.game;
  useEffect(() => {
    if (
      !active ||
      session.error !== null ||
      game?.status !== 'playing' ||
      game.turn.playerId !== HUMAN_PLAYER ||
      game.turn.phase !== 'awaiting-draw'
    )
      return;
    dispatch({ type: 'draw', roll: browserRandom() });
  }, [active, game, session.error]);
  useEffect(() => {
    if (
      !active ||
      session.error !== null ||
      game?.status !== 'playing' ||
      game.turn.playerId !== COMPUTER_PLAYER
    )
      return;
    // Cleanup and expected-state validation prevent stale moves after restart or navigation.
    const timer = window.setTimeout(() => {
      dispatch({
        type: 'computer',
        expectedGame: game,
        roll: browserRandom(),
        decision: browserRandom(),
      });
    }, COMPUTER_THINKING_MS);
    return () => window.clearTimeout(timer);
  }, [active, game, session.error]);

  function start(difficulty: Difficulty): void {
    try {
      const game = createGame({ random: browserRandom });
      opening.current = { game, difficulty };
      dispatch({ type: 'start', game, difficulty });
    } catch {
      dispatch({ type: 'error', message: 'The game could not start. Please try again.' });
    }
  }
  return {
    session,
    start,
    restart: () => {
      if (opening.current) dispatch({ type: 'start', ...opening.current });
    },
    select: (position: number) => dispatch({ type: 'select', position }),
    confirm: () => dispatch({ type: 'confirm' }),
  };
}
