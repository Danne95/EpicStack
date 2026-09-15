import { describe, expect, it } from 'vitest';
import type { GameState } from '../types/index';
import { createOrderedDeck } from './deck';
import { createGame, drawBrick, endTurn, replaceBrick } from './gameState';
import { freezeGame, seededRandom } from './tests/helpers';

describe('engine without a UI', () => {
  it('creates identical shuffled games from identical random seeds', () => {
    expect(createGame({ random: seededRandom(42) })).toEqual(
      createGame({ random: seededRandom(42) }),
    );
    expect(createGame({ random: seededRandom(42) })).not.toEqual(
      createGame({ random: seededRandom(43) }),
    );
  });

  function play(seed: number): GameState {
    const random = seededRandom(seed);
    let state: GameState = createGame({ initialDeck: [...createOrderedDeck()].reverse(), random });

    // Replacing only the top brick preserves a descending tail, so no accidental win ends this run.
    for (let completedTurns = 0; completedTurns < 200; completedTurns += 1) {
      const playerId = state.turn.playerId;
      state = drawBrick(freezeGame(state), playerId, random);
      expect(state.turn.phase).toBe('awaiting-placement');
      if (state.turn.phase !== 'awaiting-placement') throw new Error('Expected a drawn brick.');
      const activeBricks = [
        ...state.players.flatMap((player) => player.tower),
        state.turn.drawnBrick,
      ];
      expect(new Set(activeBricks).size).toBe(21);
      expect(
        activeBricks.every((brick) => Number.isInteger(brick) && brick >= 1 && brick <= 100),
      ).toBe(true);

      state = replaceBrick(freezeGame(state), playerId, 0);
      expect(state.players.map((player) => player.tower.length)).toEqual([10, 10]);
      expect(new Set(state.players.flatMap((player) => player.tower)).size).toBe(20);
      expect(state.discardedBricks).toHaveLength(completedTurns + 1);
      state = endTurn(freezeGame(state), playerId);
      expect(state.turn.number).toBe(completedTurns + 2);
      expect(state.turn.playerId).not.toBe(playerId);
    }
    return state;
  }

  it('preserves invariants and deterministic decisions beyond the former 80-draw limit', () => {
    const first = play(123);
    expect(first.status).toBe('playing');
    expect(first.turn.number).toBe(201);
    expect(play(123)).toEqual(first);
  });
});
