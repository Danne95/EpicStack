import { describe, expect, it, vi } from 'vitest';
import { createOrderedDeck } from './deck';
import { dealInitialPlayers } from './initialDeal';
import { seededRandom } from './tests/helpers';
import { checkWin } from './winCondition';

describe('initial deal', () => {
  it('deals alternately from the front and fills both towers top to bottom', () => {
    const deck = Object.freeze([...createOrderedDeck()].reverse());
    const random = vi.fn(() => 0.5);
    const players = dealInitialPlayers(random, deck);
    expect(players[0]).toEqual({ id: 0, tower: [100, 98, 96, 94, 92, 90, 88, 86, 84, 82] });
    expect(players[1]).toEqual({ id: 1, tower: [99, 97, 95, 93, 91, 89, 87, 85, 83, 81] });
    expect(new Set(players.flatMap((player) => player.tower)).size).toBe(20);
    expect(random).not.toHaveBeenCalled();
  });

  it.each(['both', 'first', 'second'] as const)(
    'redeals both towers when %s initially wins',
    (winningPlayer) => {
      const deck = [...createOrderedDeck()];
      if (winningPlayer === 'first') {
        [deck[1], deck[3]] = [deck[3]!, deck[1]!];
      } else if (winningPlayer === 'second') {
        [deck[0], deck[2]] = [deck[2]!, deck[0]!];
      }
      const random = vi.fn(seededRandom(42));
      const players = dealInitialPlayers(random, deck);
      expect(random).toHaveBeenCalled();
      expect(players.every((player) => !checkWin(player.tower))).toBe(true);
      expect(players[0].tower).not.toEqual(deck.slice(0, 20).filter((_, index) => index % 2 === 0));
      expect(players[1].tower).not.toEqual(deck.slice(0, 20).filter((_, index) => index % 2 === 1));
    },
  );

  it('reports an initialization error rather than looping forever with pathological randomness', () => {
    expect(() => dealInitialPlayers(() => 0.999)).toThrow(
      expect.objectContaining({ code: 'INITIALIZATION_FAILED' }),
    );
  });
});
