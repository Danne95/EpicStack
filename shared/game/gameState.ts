import type {
  Deck,
  GameState,
  PlayerId,
  Players,
  PlayingGameState,
  RandomSource,
} from '../types/index';
import { PLAYER_COUNT } from './constants';
import { randomIndex } from './deck';
import { assertTurnPhase, getCurrentPlayer, validatePosition } from './gameRules';
import { dealInitialPlayers } from './initialDeal';
import { rollBrick } from './rollBrick';
import { checkWin } from './winCondition';

export interface CreateGameOptions {
  readonly random: RandomSource;
  /** Optional complete 1–100 deck, already ordered for deterministic initial dealing. */
  readonly initialDeck?: Deck;
}

export function createGame({ random, initialDeck }: CreateGameOptions): PlayingGameState {
  const players = dealInitialPlayers(random, initialDeck);
  const playerId = randomIndex(PLAYER_COUNT, random) as PlayerId;
  return {
    players,
    discardedBricks: [],
    status: 'playing',
    winner: null,
    turn: { number: 1, playerId, phase: 'awaiting-draw' },
  };
}

/** Each turn samples a fresh unused number; there is no persistent draw pile. */
export function drawBrick(
  state: GameState,
  playerId: PlayerId,
  random: RandomSource,
): PlayingGameState {
  assertTurnPhase(state, playerId, 'awaiting-draw');
  const occupied = state.players.flatMap((player) => player.tower);
  const drawnBrick = rollBrick(occupied, random);
  return { ...state, turn: { ...state.turn, phase: 'awaiting-placement', drawnBrick } };
}

export function replaceBrick(state: GameState, playerId: PlayerId, position: number): GameState {
  assertTurnPhase(state, playerId, 'awaiting-placement');
  validatePosition(position);

  const currentPlayer = getCurrentPlayer(state);
  const drawnBrick = state.turn.drawnBrick;
  const removedBrick = currentPlayer.tower[position]!;
  const tower = currentPlayer.tower.map((brick, index) =>
    index === position ? drawnBrick : brick,
  );
  const updatedPlayer = { ...currentPlayer, tower };
  const players: Players =
    playerId === 0 ? [updatedPlayer, state.players[1]] : [state.players[0], updatedPlayer];
  const discardedBricks = [...state.discardedBricks, removedBrick];
  const turnInfo = { number: state.turn.number, playerId };

  if (checkWin(tower)) {
    return {
      players,
      discardedBricks,
      status: 'won',
      winner: playerId,
      turn: { ...turnInfo, phase: 'complete' },
    };
  }

  return {
    players,
    discardedBricks,
    status: 'playing',
    winner: null,
    turn: { ...turnInfo, phase: 'awaiting-end' },
  };
}

export function endTurn(state: GameState, playerId: PlayerId): PlayingGameState {
  assertTurnPhase(state, playerId, 'awaiting-end');
  return {
    ...state,
    turn: {
      number: state.turn.number + 1,
      playerId: playerId === 0 ? 1 : 0,
      phase: 'awaiting-draw',
    },
  };
}
