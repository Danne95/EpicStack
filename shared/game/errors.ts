export type GameRuleErrorCode =
  | 'INVALID_DECK'
  | 'INVALID_RANDOM_VALUE'
  | 'NO_AVAILABLE_BRICKS'
  | 'INITIALIZATION_FAILED'
  | 'GAME_OVER'
  | 'NOT_CURRENT_PLAYER'
  | 'INVALID_TURN_PHASE'
  | 'INVALID_POSITION';

/** Stable error codes let controllers handle invalid actions without parsing messages. */
export class GameRuleError extends Error {
  constructor(
    public readonly code: GameRuleErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GameRuleError';
  }
}
