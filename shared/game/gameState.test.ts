import { describe, expect, it, vi } from 'vitest';
import type { PlayerId } from '../types/index';
import { createOrderedDeck } from './deck';
import { getCurrentPlayer, getLegalPlacements } from './gameRules';
import { createGame, drawBrick, endTurn, replaceBrick } from './gameState';
import { freezeGame, randomForBrick } from './tests/helpers';

function initialGame(playerId: PlayerId = 0) {
  return createGame({
    initialDeck: [...createOrderedDeck()].reverse(),
    random: () => (playerId === 0 ? 0 : 0.999),
  });
}

describe('game state and turn flow', () => {
  it.each([0, 1] as const)(
    'randomly selects player %i and starts with two complete towers',
    (playerId) => {
      const state = initialGame(playerId);
      expect(state.status).toBe('playing');
      expect(state.winner).toBeNull();
      expect(state.players.map((player) => player.tower.length)).toEqual([10, 10]);
      expect(state.discardedBricks).toEqual([]);
      expect(state.turn).toEqual({ number: 1, playerId, phase: 'awaiting-draw' });
      expect(getCurrentPlayer(state)).toBe(state.players[playerId]);
      expect(state).not.toHaveProperty('deck');
    },
  );

  it('validates supplied initial decks before consuming randomness', () => {
    const random = vi.fn(() => 0);
    expect(() => createGame({ initialDeck: [1, 1], random })).toThrow(
      expect.objectContaining({ code: 'INVALID_DECK' }),
    );
    expect(random).not.toHaveBeenCalled();
  });

  it('rolls a brick, replaces the selected position, records removal, and changes turns', () => {
    const before = freezeGame(initialGame());
    const drawn = freezeGame(drawBrick(before, 0, () => 0));
    expect(drawn.turn).toEqual({
      number: 1,
      playerId: 0,
      phase: 'awaiting-placement',
      drawnBrick: 1,
    });
    const replaced = freezeGame(replaceBrick(drawn, 0, 0));
    expect(replaced.players[0].tower).toEqual([1, 98, 96, 94, 92, 90, 88, 86, 84, 82]);
    expect(replaced.players[1]).toEqual(before.players[1]);
    expect(replaced.discardedBricks).toEqual([100]);
    expect(replaced.turn).toEqual({ number: 1, playerId: 0, phase: 'awaiting-end' });
    const next = endTurn(replaced, 0);
    expect(next.turn).toEqual({ number: 2, playerId: 1, phase: 'awaiting-draw' });
    expect(before.players[0].tower[0]).toBe(100);
    expect(before.discardedBricks).toEqual([]);
    expect(before.turn.phase).toBe('awaiting-draw');
  });

  it.each([0, 5, 9])('supports replacement at position %i', (position) => {
    const before = initialGame(1);
    const drawn = drawBrick(before, 1, () => 0);
    const after = replaceBrick(drawn, 1, position);
    expect(after.players[1].tower[position]).toBe(1);
    expect(after.discardedBricks).toEqual([before.players[1].tower[position]]);
    expect(after.players[0]).toEqual(before.players[0]);
    expect(after.players[1].tower).toHaveLength(10);
    expect(endTurn(after, 1).turn.playerId).toBe(0);
  });

  it('makes a removed value eligible for the very next roll', () => {
    const first = drawBrick(initialGame(), 0, () => 0);
    const next = endTurn(replaceBrick(first, 0, 0), 0);
    const rerolled = drawBrick(next, 1, randomForBrick(next, 100));
    expect(rerolled.turn).toMatchObject({ drawnBrick: 100 });
    expect(rerolled.discardedBricks).toEqual([100]);
  });

  it('lists the same ten legal placements only during the acting player’s placement phase', () => {
    const before = initialGame();
    expect(getLegalPlacements(before, 0)).toEqual([]);
    const drawn = drawBrick(before, 0, () => 0);
    expect(getLegalPlacements(drawn, 0)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(getLegalPlacements(drawn, 1)).toEqual([]);
    expect(getLegalPlacements(replaceBrick(drawn, 0, 0), 0)).toEqual([]);
  });
});

describe('invalid actions', () => {
  it('rejects replacing or ending a turn before drawing', () => {
    const state = freezeGame(initialGame());
    expect(() => replaceBrick(state, 0, 0)).toThrow(
      expect.objectContaining({ code: 'INVALID_TURN_PHASE' }),
    );
    expect(() => endTurn(state, 0)).toThrow(
      expect.objectContaining({ code: 'INVALID_TURN_PHASE' }),
    );
  });

  it('rejects a second roll or skipping a required placement', () => {
    const state = freezeGame(drawBrick(initialGame(), 0, () => 0));
    const random = vi.fn(() => 0);
    expect(() => drawBrick(state, 0, random)).toThrow(
      expect.objectContaining({ code: 'INVALID_TURN_PHASE' }),
    );
    expect(() => endTurn(state, 0)).toThrow(
      expect.objectContaining({ code: 'INVALID_TURN_PHASE' }),
    );
    expect(random).not.toHaveBeenCalled();
  });

  it('rejects another replacement or draw before ending a completed turn', () => {
    const state = freezeGame(
      replaceBrick(
        drawBrick(initialGame(), 0, () => 0),
        0,
        0,
      ),
    );
    expect(() => replaceBrick(state, 0, 1)).toThrow(
      expect.objectContaining({ code: 'INVALID_TURN_PHASE' }),
    );
    expect(() => drawBrick(state, 0, () => 0)).toThrow(
      expect.objectContaining({ code: 'INVALID_TURN_PHASE' }),
    );
    const next = endTurn(state, 0);
    expect(() => endTurn(next, 1)).toThrow(expect.objectContaining({ code: 'INVALID_TURN_PHASE' }));
  });

  it('rejects actions by the non-current player at every phase', () => {
    const before = initialGame();
    const random = vi.fn(() => 0);
    expect(() => drawBrick(before, 1, random)).toThrow(
      expect.objectContaining({ code: 'NOT_CURRENT_PLAYER' }),
    );
    expect(random).not.toHaveBeenCalled();
    const drawn = drawBrick(before, 0, () => 0);
    expect(() => replaceBrick(drawn, 1, 0)).toThrow(
      expect.objectContaining({ code: 'NOT_CURRENT_PLAYER' }),
    );
    const replaced = replaceBrick(drawn, 0, 0);
    expect(() => endTurn(replaced, 1)).toThrow(
      expect.objectContaining({ code: 'NOT_CURRENT_PLAYER' }),
    );
  });

  it.each([-1, 10, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid position %s',
    (position) => {
      const state = freezeGame(drawBrick(initialGame(), 0, () => 0));
      expect(() => replaceBrick(state, 0, position)).toThrow(
        expect.objectContaining({ code: 'INVALID_POSITION' }),
      );
      expect(state.discardedBricks).toEqual([]);
      expect(state.players[0].tower[0]).toBe(100);
    },
  );

  it('rejects invalid randomness without advancing the game', () => {
    const state = freezeGame(initialGame());
    expect(() => drawBrick(state, 0, () => Number.NaN)).toThrow(
      expect.objectContaining({ code: 'INVALID_RANDOM_VALUE' }),
    );
    expect(state.turn.phase).toBe('awaiting-draw');
  });
});
