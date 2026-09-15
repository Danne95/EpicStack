import { describe, expect, it } from 'vitest';
import { createDeck, createOrderedDeck, shuffleDeck, validateInitialDeck } from './deck';

describe('deck', () => {
  it('contains each integer from 1 through 100 once', () => {
    const deck = createDeck(() => 0.5);
    expect(deck).toHaveLength(100);
    expect(new Set(deck).size).toBe(100);
    expect([...deck].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1),
    );
  });

  it('shuffles predictably with injected randomness without mutating its input', () => {
    const input = Object.freeze([1, 2, 3, 4]);
    expect(shuffleDeck(input, () => 0)).toEqual([2, 3, 4, 1]);
    expect(shuffleDeck(input, () => 0.999)).toEqual([1, 2, 3, 4]);
    expect(input).toEqual([1, 2, 3, 4]);
    expect(createDeck(() => 0.25)).toEqual(createDeck(() => 0.25));
  });

  it('accepts a complete ordered deck', () => {
    expect(() => validateInitialDeck(createOrderedDeck())).not.toThrow();
  });

  it('rejects sparse initial arrays with a missing brick', () => {
    const deck = [...createOrderedDeck()];
    delete deck[0];
    expect(() => validateInitialDeck(deck)).toThrow(
      expect.objectContaining({ code: 'INVALID_DECK' }),
    );
  });

  it.each(
    [
      [],
      createOrderedDeck().slice(1),
      [...createOrderedDeck(), 101],
      [2, ...createOrderedDeck().slice(1)],
      [0, ...createOrderedDeck().slice(1)],
      [101, ...createOrderedDeck().slice(1)],
      [1.5, ...createOrderedDeck().slice(1)],
      [Number.NaN, ...createOrderedDeck().slice(1)],
      [Number.POSITIVE_INFINITY, ...createOrderedDeck().slice(1)],
    ].map((deck) => ({ deck })),
  )('rejects incomplete, duplicate, or invalid initial decks (%#)', ({ deck }) => {
    expect(() => validateInitialDeck(deck)).toThrow(
      expect.objectContaining({ code: 'INVALID_DECK' }),
    );
  });

  it.each([-0.1, 1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid random values: %s',
    (value) => {
      expect(() => createDeck(() => value)).toThrow(
        expect.objectContaining({ code: 'INVALID_RANDOM_VALUE' }),
      );
    },
  );
});
