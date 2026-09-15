/** A brick's unique number is also its identity. */
export type Brick = number;

/** Used for the initial deal only; the first brick is at index zero. */
export type Deck = readonly Brick[];

/** Produces a finite value in [0, 1). Supplied by the caller for reproducible play. */
export type RandomSource = () => number;

export type PlayerId = 0 | 1;

export interface PlayerState {
  readonly id: PlayerId;
  /** Ordered top to bottom. */
  readonly tower: readonly Brick[];
}

export type Players = readonly [PlayerState, PlayerState];

export interface TurnInfo {
  /** Starts at one and advances after each completed non-winning move. */
  readonly number: number;
  readonly playerId: PlayerId;
}

export type ActiveTurn = TurnInfo &
  (
    | { readonly phase: 'awaiting-draw' }
    | { readonly phase: 'awaiting-placement'; readonly drawnBrick: Brick }
    | { readonly phase: 'awaiting-end' }
  );

export type CompletedTurn = TurnInfo & { readonly phase: 'complete' };
export type Turn = ActiveTurn | CompletedTurn;

interface GameStateBase {
  readonly players: Players;
  /** Historical removals, not an inventory. Removed values may be rolled again. */
  readonly discardedBricks: readonly Brick[];
}

export interface PlayingGameState extends GameStateBase {
  readonly status: 'playing';
  readonly turn: ActiveTurn;
  readonly winner: null;
}

export interface WonGameState extends GameStateBase {
  readonly status: 'won';
  readonly turn: CompletedTurn;
  readonly winner: PlayerId;
}

export type GameState = PlayingGameState | WonGameState;
export type GameStatus = GameState['status'];
