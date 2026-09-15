import { describe, expect, it, vi } from 'vitest';
import type { GameState } from '../types/index';
import { createGame, drawBrick, endTurn, replaceBrick } from '../game/gameState';
import { getLegalPlacements } from '../game/gameRules';
import { checkWin } from '../game/winCondition';
import { freezeGame, seededRandom } from '../game/tests/helpers';
import { chooseMove } from './evaluator';

function play(seed: number): { state: GameState; positions: number[] } {
  const random = vi.fn(seededRandom(seed));
  let state: GameState = createGame({ random });
  const positions: number[] = [];
  // Test safety bound, not a game rule. Both seats use the same baseline computer.
  const maximumTestTurns = 500;
  while (state.status === 'playing' && positions.length < maximumTestTurns) {
    const playerId = state.turn.playerId;
    state = drawBrick(freezeGame(state), playerId, random);
    const callsBeforeThinking = random.mock.calls.length;
    const move = chooseMove(freezeGame(state), playerId);
    expect(random.mock.calls.length).toBe(callsBeforeThinking);
    expect(move).not.toBeNull();
    expect(getLegalPlacements(state, playerId)).toContain(move!.position);
    positions.push(move!.position);
    state = replaceBrick(state, playerId, move!.position);
    expect(state.players.map((player) => player.tower.length)).toEqual([10, 10]);
    expect(new Set(state.players.flatMap((player) => player.tower)).size).toBe(20);
    if (state.status === 'playing') state = endTurn(state, playerId);
  }
  return { state, positions };
}

describe('computer games through the real engine', () => {
  it.each([1, 42, 123])('completes a legal game with seed %i', (seed) => {
    const { state } = play(seed);
    expect(state.status).toBe('won');
    if (state.status !== 'won') throw new Error('Expected the baseline AI to finish the fixture.');
    expect(checkWin(state.players[state.winner].tower)).toBe(true);
    expect(chooseMove(state, state.winner)).toBeNull();
  });

  it('replays identical decisions and game states for identical random inputs', () => {
    expect(play(17)).toEqual(play(17));
  });
});
