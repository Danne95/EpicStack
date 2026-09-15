import { describe, expect, it } from 'vitest';
import { createGame } from '../../../shared/game/gameState';
import { createOrderedDeck } from '../../../shared/game/deck';
import { deckForTowers, randomForBrick } from '../../../shared/game/tests/helpers';
import { EMPTY_SESSION, reduceSession, sessionReducer } from '../src/hooks/gameController';
import type { GameSession } from '../src/hooks/gameController';

function session(computerStarts = false): GameSession {
  return reduceSession(EMPTY_SESSION, {
    type: 'start',
    difficulty: 'expert',
    game: createGame({
      initialDeck: [...createOrderedDeck()].reverse(),
      random: () => (computerStarts ? 0.9 : 0),
    }),
  });
}

describe('web game controller', () => {
  it('draws, selects, confirms, then processes exactly one computer turn', () => {
    const start = session();
    const drawn = reduceSession(start, { type: 'draw', roll: 0 });
    expect(drawn.game?.turn.phase).toBe('awaiting-placement');
    const selected = reduceSession(drawn, { type: 'select', position: 0 });
    expect(selected.game).toBe(drawn.game);
    expect(selected.selectedPosition).toBe(0);
    const placed = reduceSession(selected, { type: 'confirm' });
    expect(placed.game?.turn).toMatchObject({ number: 2, playerId: 1 });
    expect(placed.selectedPosition).toBeNull();
    const action = {
      type: 'computer' as const,
      expectedGame: placed.game!,
      roll: 0.5,
      decision: 0.5,
    };
    const next = reduceSession(placed, action);
    expect(next.game?.turn).toMatchObject({ number: 3, playerId: 0 });
    expect(next.lastComputerMove).toMatch(/^Computer placed \d+ in position \d+\.$/);
    expect(reduceSession(next, action)).toBe(next);
    expect(start.game?.turn.number).toBe(1);
  });

  it('ignores double clicks, premature confirmation, and illegal selection', () => {
    const start = session();
    expect(reduceSession(start, { type: 'confirm' })).toBe(start);
    expect(reduceSession(start, { type: 'select', position: 0 })).toBe(start);
    const drawn = reduceSession(start, { type: 'draw', roll: 0 });
    expect(reduceSession(drawn, { type: 'draw', roll: 0.9 })).toBe(drawn);
    expect(reduceSession(drawn, { type: 'select', position: 10 })).toBe(drawn);
    expect(reduceSession(drawn, { type: 'confirm' })).toBe(drawn);
  });

  it('allows changing the selected slot without prematurely replacing a brick', () => {
    const drawn = reduceSession(session(), { type: 'draw', roll: 0 });
    const first = reduceSession(drawn, { type: 'select', position: 3 });
    const second = reduceSession(first, { type: 'select', position: 9 });
    expect(second.selectedPosition).toBe(9);
    expect(second.game).toBe(drawn.game);
    expect(second.game?.discardedBricks).toEqual([]);
  });

  it('handles a randomly starting computer and rejects human actions during its turn', () => {
    const start = session(true);
    expect(reduceSession(start, { type: 'draw', roll: 0 })).toBe(start);
    expect(reduceSession(start, { type: 'select', position: 0 })).toBe(start);
    expect(reduceSession(start, { type: 'confirm' })).toBe(start);
    const next = reduceSession(start, {
      type: 'computer',
      expectedGame: start.game!,
      roll: 0,
      decision: 0,
    });
    expect(next.game?.turn).toMatchObject({ number: 2, playerId: 0 });
  });

  it('rejects a delayed computer callback from an older game with the same turn number', () => {
    const old = session(true);
    const fresh = session(true);
    expect(
      reduceSession(fresh, { type: 'computer', expectedGame: old.game!, roll: 0, decision: 0 }),
    ).toBe(fresh);
  });

  it.each([0, 1] as const)(
    'finishes a winning turn for player %i without advancing again',
    (winner) => {
      const almost = [1, 10, 20, 30, 40, 99, 60, 70, 80, 90];
      const opponent = [100, 98, 97, 96, 95, 94, 93, 92, 91, 89];
      const game = createGame({
        initialDeck:
          winner === 0 ? deckForTowers(almost, opponent) : deckForTowers(opponent, almost),
        random: () => winner * 0.9,
      });
      let current = reduceSession(EMPTY_SESSION, { type: 'start', game, difficulty: 'easy' });
      const roll = randomForBrick(game, 50)();
      if (winner === 0) {
        current = reduceSession(current, { type: 'draw', roll });
        current = reduceSession(current, { type: 'select', position: 5 });
        current = reduceSession(current, { type: 'confirm' });
      } else
        current = reduceSession(current, {
          type: 'computer',
          expectedGame: game,
          roll,
          decision: 0,
        });
      expect(current.game).toMatchObject({
        status: 'won',
        winner,
        turn: { number: 1, phase: 'complete' },
      });
      expect(reduceSession(current, { type: 'draw', roll: 0 })).toBe(current);
      expect(reduceSession(current, { type: 'confirm' })).toBe(current);
    },
  );

  it('converts engine errors to a recoverable message without losing the existing state', () => {
    const start = session();
    const failed = sessionReducer(start, { type: 'draw', roll: Number.NaN });
    expect(failed.error).toBeTruthy();
    expect(failed.game).toBe(start.game);
    expect(sessionReducer(failed, { type: 'draw', roll: 0 })).toBe(failed);
  });

  it('keeps difficulty fixed for the match and clears old selection when starting', () => {
    const first = session();
    const next = reduceSession(
      { ...first, selectedPosition: 3, lastComputerMove: 'Old move' },
      { type: 'start', game: first.game!, difficulty: 'hard' },
    );
    expect(next.difficulty).toBe('hard');
    expect(next.selectedPosition).toBeNull();
    expect(next.lastComputerMove).toBeNull();
  });
});
