import { describe, expect, it, vi } from 'vitest';
import { getLegalPlacements } from './gameRules';
import { createGame, drawBrick, endTurn, replaceBrick } from './gameState';
import { deckForTowers, freezeGame, randomForBrick } from './tests/helpers';

describe('victory lifecycle', () => {
  it.each([0, 1] as const)(
    'awards player %i victory immediately after the winning replacement',
    (playerId) => {
      const nearlySorted = [1, 10, 20, 30, 40, 99, 60, 70, 80, 90];
      const opponent = [100, 98, 97, 96, 95, 94, 93, 92, 91, 89];
      const initialDeck =
        playerId === 0
          ? deckForTowers(nearlySorted, opponent)
          : deckForTowers(opponent, nearlySorted);
      const initial = createGame({ initialDeck, random: () => playerId * 0.9 });
      const drawn = freezeGame(drawBrick(initial, playerId, randomForBrick(initial, 50)));
      const won = freezeGame(replaceBrick(drawn, playerId, 5));

      expect(won.status).toBe('won');
      expect(won.winner).toBe(playerId);
      expect(won.turn).toEqual({ phase: 'complete', number: 1, playerId });
      expect(won.players[playerId].tower).toEqual([1, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
      expect(won.discardedBricks).toEqual([99]);
      expect(won.turn).not.toHaveProperty('drawnBrick');
      expect(getLegalPlacements(won, playerId)).toEqual([]);

      const random = vi.fn(() => 0);
      for (const actor of [0, 1] as const) {
        expect(() => drawBrick(won, actor, random)).toThrow(
          expect.objectContaining({ code: 'GAME_OVER' }),
        );
        expect(() => replaceBrick(won, actor, 0)).toThrow(
          expect.objectContaining({ code: 'GAME_OVER' }),
        );
        expect(() => endTurn(won, actor)).toThrow(expect.objectContaining({ code: 'GAME_OVER' }));
      }
      expect(random).not.toHaveBeenCalled();
      expect(drawn.status).toBe('playing');
      expect(drawn.players[playerId].tower[5]).toBe(99);
    },
  );
});
