import { chooseMove } from '../../../../shared/ai/evaluator';
import { DIFFICULTY_PROFILES } from '../../../../shared/ai/difficulty';
import type { Difficulty } from '../../../../shared/ai/difficulty';
import { drawBrick, endTurn, replaceBrick } from '../../../../shared/game/gameState';
import { getLegalPlacements } from '../../../../shared/game/gameRules';
import type { GameState } from '../../../../shared/types/index';

export const HUMAN_PLAYER = 0;
export const COMPUTER_PLAYER = 1;

export interface GameSession {
  readonly game: GameState | null;
  readonly difficulty: Difficulty;
  readonly selectedPosition: number | null;
  readonly lastComputerMove: string | null;
  readonly error: string | null;
}

export const EMPTY_SESSION: GameSession = {
  game: null,
  difficulty: 'medium',
  selectedPosition: null,
  lastComputerMove: null,
  error: null,
};

export type SessionAction =
  | { type: 'start'; game: GameState; difficulty: Difficulty }
  | { type: 'select'; position: number }
  | { type: 'draw'; roll: number }
  | { type: 'confirm' }
  | { type: 'computer'; expectedGame: GameState; roll: number; decision: number }
  | { type: 'error'; message: string };

/** Pure controller: inputs contain sampled randomness so React can safely replay the reducer. */
export function reduceSession(session: GameSession, action: SessionAction): GameSession {
  if (action.type === 'start')
    return { ...EMPTY_SESSION, game: action.game, difficulty: action.difficulty };
  if (action.type === 'error') return { ...session, error: action.message };
  const game = session.game;
  if (game === null || game.status !== 'playing' || session.error !== null) return session;

  if (action.type === 'computer') {
    if (game !== action.expectedGame || game.turn.playerId !== COMPUTER_PLAYER) return session;
    const drawn = drawBrick(game, COMPUTER_PLAYER, () => action.roll);
    const move = chooseMove(drawn, COMPUTER_PLAYER, {
      profile: DIFFICULTY_PROFILES[session.difficulty],
      random: () => action.decision,
    });
    if (move === null || drawn.turn.phase !== 'awaiting-placement')
      throw new Error('Computer could not choose a legal move.');
    const placed = replaceBrick(drawn, COMPUTER_PLAYER, move.position);
    return {
      ...session,
      game: placed.status === 'won' ? placed : endTurn(placed, COMPUTER_PLAYER),
      lastComputerMove: `Computer placed ${drawn.turn.drawnBrick} in position ${move.position + 1}.`,
    };
  }

  if (game.turn.playerId !== HUMAN_PLAYER) return session;
  if (action.type === 'draw' && game.turn.phase === 'awaiting-draw') {
    return {
      ...session,
      game: drawBrick(game, HUMAN_PLAYER, () => action.roll),
      selectedPosition: null,
    };
  }
  if (
    action.type === 'select' &&
    getLegalPlacements(game, HUMAN_PLAYER).includes(action.position)
  ) {
    return { ...session, selectedPosition: action.position };
  }
  if (
    action.type === 'confirm' &&
    session.selectedPosition !== null &&
    game.turn.phase === 'awaiting-placement'
  ) {
    const placed = replaceBrick(game, HUMAN_PLAYER, session.selectedPosition);
    return {
      ...session,
      game: placed.status === 'won' ? placed : endTurn(placed, HUMAN_PLAYER),
      selectedPosition: null,
    };
  }
  return session;
}

export function sessionReducer(session: GameSession, action: SessionAction): GameSession {
  try {
    return reduceSession(session, action);
  } catch {
    return {
      ...session,
      error: 'This turn could not be completed. Return to the menu to start a fresh game.',
    };
  }
}
