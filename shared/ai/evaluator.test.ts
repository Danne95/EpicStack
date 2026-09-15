import { describe, expect, it } from 'vitest';
import { createGame, drawBrick, endTurn, replaceBrick } from '../game/gameState';
import { getLegalPlacements } from '../game/gameRules';
import { createOrderedDeck } from '../game/deck';
import { getAvailableBricks } from '../game/rollBrick';
import { deckForTowers, freezeGame, randomForBrick } from '../game/tests/helpers';
import { chooseMove, evaluateMoves, selectBestMove } from './evaluator';
import type { MoveEvaluation, ScoreComponents } from './types';
import { combineScores } from './weights';
import { scoreExpectedProgress, scoreFutureFlexibility } from './scoring';

const zeroScores: ScoreComponents = {
  neighbourFit: 0,
  orderImprovement: 0,
  positionQuality: 0,
  futureFlexibility: 0,
  deadEndRisk: 0,
  expectedProgress: 0,
};

function choice(position: number, score: number, wins = false): MoveEvaluation {
  return { position, score, wins, components: zeroScores };
}

function initialGame() {
  return createGame({ initialDeck: [...createOrderedDeck()].reverse(), random: () => 0 });
}

describe('move evaluation', () => {
  it('evaluates exactly the legal moves without changing frozen input or consuming randomness', () => {
    const state = freezeGame(drawBrick(initialGame(), 0, () => 0));
    const snapshot = JSON.stringify(state);
    const moves = evaluateMoves(state, 0);
    expect(moves.map((move) => move.position)).toEqual(getLegalPlacements(state, 0));
    for (const move of moves) {
      expect(Number.isFinite(move.score)).toBe(true);
      expect(move.score).toBe(combineScores(move.components));
      for (const [name, score] of Object.entries(move.components)) {
        expect(score).toBeGreaterThanOrEqual(name === 'orderImprovement' ? -1 : 0);
        expect(score).toBeLessThanOrEqual(1);
      }
    }
    expect(chooseMove(state, 0)).toEqual(chooseMove(state, 0));
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('uses the post-replacement eligible pool and ignores discard history', () => {
    const state = drawBrick(initialGame(), 0, () => 0);
    const candidate = replaceBrick(state, 0, 0);
    const available = getAvailableBricks(candidate.players.flatMap((player) => player.tower));
    expect(available).toContain(100); // Removed on this move, immediately eligible again.
    expect(available).not.toContain(1); // Drawn value is now occupied.
    expect(available).toHaveLength(80);
    const evaluation = evaluateMoves(state, 0)[0]!;
    expect(evaluation.components.futureFlexibility).toBe(
      scoreFutureFlexibility(candidate.players[0].tower, available),
    );
    expect(evaluation.components.expectedProgress).toBe(
      scoreExpectedProgress(candidate.players[0].tower, available),
    );
    expect(evaluateMoves({ ...state, discardedBricks: [1, 100, 100, 50] }, 0)).toEqual(
      evaluateMoves(state, 0),
    );
  });

  it.each([0, 1] as const)('selects and executes an immediate win for player %i', (playerId) => {
    const almost = [1, 10, 20, 30, 40, 99, 60, 70, 80, 90];
    const opponent = [100, 98, 97, 96, 95, 94, 93, 92, 91, 89];
    const initialDeck =
      playerId === 0 ? deckForTowers(almost, opponent) : deckForTowers(opponent, almost);
    const initial = createGame({ initialDeck, random: () => playerId * 0.9 });
    const state = freezeGame(drawBrick(initial, playerId, randomForBrick(initial, 50)));
    const move = chooseMove(state, playerId);
    expect(move).toMatchObject({ position: 5, wins: true });
    expect(replaceBrick(state, playerId, move!.position)).toMatchObject({
      status: 'won',
      winner: playerId,
    });
  });

  it('returns no choice before a draw, after replacement, on the wrong turn, or after victory', () => {
    const initial = initialGame();
    expect(chooseMove(initial, 0)).toBeNull();
    const drawn = drawBrick(initial, 0, () => 0);
    expect(evaluateMoves(drawn, 1)).toEqual([]);
    expect(chooseMove(drawn, 1)).toBeNull();
    const replaced = replaceBrick(drawn, 0, 0);
    expect(chooseMove(replaced, 0)).toBeNull();
    expect(chooseMove(endTurn(replaced, 0), 1)).toBeNull();
    const initialWin = createGame({
      initialDeck: deckForTowers(
        [1, 10, 20, 30, 40, 99, 60, 70, 80, 90],
        [100, 98, 97, 96, 95, 94, 93, 92, 91, 89],
      ),
      random: () => 0,
    });
    const won = replaceBrick(drawBrick(initialWin, 0, randomForBrick(initialWin, 50)), 0, 5);
    expect(chooseMove(won, 0)).toBeNull();
    expect(chooseMove(won, 1)).toBeNull();
  });
});

describe('ranking and baseline weights', () => {
  it('always ranks a win above a higher heuristic score', () => {
    expect(selectBestMove([choice(0, 100), choice(8, -100, true)])?.position).toBe(8);
  });

  it('ranks by score then breaks exact ties toward the top, independent of enumeration order', () => {
    const moves = Object.freeze([choice(9, 5), choice(3, 5), choice(0, 4)]);
    expect(selectBestMove(moves)?.position).toBe(3);
    expect(selectBestMove([...moves].reverse())?.position).toBe(3);
    expect(selectBestMove([])).toBeNull();
  });

  it('applies the documented baseline and subtracts dead-end risk', () => {
    expect(combineScores({ ...zeroScores, neighbourFit: 1 })).toBe(1);
    expect(combineScores({ ...zeroScores, orderImprovement: -1 })).toBe(-3);
    expect(combineScores({ ...zeroScores, positionQuality: 1 })).toBe(6);
    expect(combineScores({ ...zeroScores, futureFlexibility: 1 })).toBe(0.5);
    expect(combineScores({ ...zeroScores, deadEndRisk: 1 })).toBe(-2);
    expect(combineScores({ ...zeroScores, expectedProgress: 1 })).toBe(0.25);
  });
});
