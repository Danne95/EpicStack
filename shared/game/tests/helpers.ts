import type { Brick, Deck, GameState, RandomSource } from '../../types/index';
import { createOrderedDeck } from '../deck';

/** Deterministic test-only generator; constants define a 32-bit linear congruential sequence. */
export function seededRandom(seed: number): RandomSource {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    return value / 2 ** 32;
  };
}

export function deckForTowers(first: readonly Brick[], second: readonly Brick[]): Deck {
  const dealt = first.flatMap((brick, index) => [brick, second[index]!]);
  return [...dealt, ...createOrderedDeck().filter((brick) => !dealt.includes(brick))];
}

export function randomForBrick(state: GameState, brick: Brick): RandomSource {
  const occupied = state.players.flatMap((player) => player.tower);
  const eligible = createOrderedDeck().filter((value) => !occupied.includes(value));
  const index = eligible.indexOf(brick);
  if (index < 0) {
    throw new Error(`Test requested occupied brick ${brick}.`);
  }
  return () => (index + 0.5) / eligible.length;
}

export function freezeGame(state: GameState): GameState {
  for (const player of state.players) {
    Object.freeze(player.tower);
    Object.freeze(player);
  }
  Object.freeze(state.players);
  Object.freeze(state.discardedBricks);
  Object.freeze(state.turn);
  return Object.freeze(state);
}
