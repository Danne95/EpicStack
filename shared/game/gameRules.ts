import type {
  ActiveTurn,
  GameState,
  PlayerId,
  PlayerState,
  PlayingGameState,
} from '../types/index';
import { TOWER_SIZE } from './constants';
import { GameRuleError } from './errors';

export function getCurrentPlayer(state: GameState): PlayerState {
  return state.players[state.turn.playerId];
}

export function assertTurnPhase<Phase extends ActiveTurn['phase']>(
  state: GameState,
  playerId: PlayerId,
  phase: Phase,
): asserts state is PlayingGameState & { readonly turn: Extract<ActiveTurn, { phase: Phase }> } {
  if (state.status !== 'playing') {
    throw new GameRuleError('GAME_OVER', 'No actions are allowed after victory.');
  }
  if (state.turn.playerId !== playerId) {
    throw new GameRuleError('NOT_CURRENT_PLAYER', 'Only the current player can act.');
  }
  if (state.turn.phase !== phase) {
    throw new GameRuleError('INVALID_TURN_PHASE', `This action requires the ${phase} phase.`);
  }
}

export function validatePosition(position: number): void {
  if (!Number.isInteger(position) || position < 0 || position >= TOWER_SIZE) {
    throw new GameRuleError(
      'INVALID_POSITION',
      `Tower positions must be integers from 0 to ${TOWER_SIZE - 1}.`,
    );
  }
}

/** The AI and human controller receive the same legal replacement positions. */
export function getLegalPlacements(state: GameState, playerId: PlayerId): readonly number[] {
  if (
    state.status !== 'playing' ||
    state.turn.playerId !== playerId ||
    state.turn.phase !== 'awaiting-placement'
  ) {
    return [];
  }
  return Array.from({ length: TOWER_SIZE }, (_, position) => position);
}
