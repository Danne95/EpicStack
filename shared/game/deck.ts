import type { Deck, RandomSource } from '../types/index';
import { BRICK_COUNT, MAX_BRICK_VALUE, MIN_BRICK_VALUE } from './constants';
import { GameRuleError } from './errors';

export function createOrderedDeck(): Deck {
  return Array.from({ length: BRICK_COUNT }, (_, index) => MIN_BRICK_VALUE + index);
}

export function validateInitialDeck(deck: Deck): void {
  const containsInvalidValue = [...deck].some(
    (brick) => !Number.isInteger(brick) || brick < MIN_BRICK_VALUE || brick > MAX_BRICK_VALUE,
  );

  if (deck.length !== BRICK_COUNT || new Set(deck).size !== BRICK_COUNT || containsInvalidValue) {
    throw new GameRuleError(
      'INVALID_DECK',
      'The initial deck must contain each integer from 1 to 100 exactly once.',
    );
  }
}

export function randomIndex(length: number, random: RandomSource): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new GameRuleError(
      'INVALID_RANDOM_VALUE',
      'Random sources must return a finite number in [0, 1).',
    );
  }
  return Math.floor(value * length);
}

/** Fisher–Yates shuffle; copies the input and never changes the caller's deck. */
export function shuffleDeck(deck: Deck, random: RandomSource): Deck {
  const shuffled = [...deck];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    // Both indices are inside the array by construction.
    const current = shuffled[index]!;
    shuffled[index] = shuffled[swapIndex]!;
    shuffled[swapIndex] = current;
  }
  return shuffled;
}

export function createDeck(random: RandomSource): Deck {
  return shuffleDeck(createOrderedDeck(), random);
}
