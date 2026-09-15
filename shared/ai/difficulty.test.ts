import { describe, expect, it, vi } from 'vitest';
import { createOrderedDeck } from '../game/deck';
import { createGame, drawBrick, replaceBrick } from '../game/gameState';
import { deckForTowers, freezeGame, randomForBrick, seededRandom } from '../game/tests/helpers';
import { DIFFICULTY_PROFILES, validateDifficulty } from './difficulty';
import { chooseMove, evaluateMoves, selectBestMove } from './evaluator';
import * as ranges from './ranges';

describe('difficulty profiles', () => {
  it('rejects individually finite weights whose combined score can overflow', () => {
    const base = DIFFICULTY_PROFILES.medium;
    expect(() =>
      validateDifficulty({
        ...base,
        weights: {
          ...base.weights,
          neighbourFit: Number.MAX_VALUE,
          positionQuality: Number.MAX_VALUE,
        },
      }),
    ).toThrow(RangeError);
  });

  it('bounds Expert evaluation to eighty future rolls and ten positions per candidate', () => {
    const initial = createGame({ random: seededRandom(42) });
    const state = freezeGame(drawBrick(initial, initial.turn.playerId, seededRandom(17)));
    const retention = vi.spyOn(ranges, 'retainedBrickCount');
    const first = evaluateMoves(state, state.turn.playerId, DIFFICULTY_PROFILES.expert);
    expect(retention).toHaveBeenCalledTimes(10 * (1 + 80 * 10));
    retention.mockRestore();
    expect(evaluateMoves(state, state.turn.playerId, DIFFICULTY_PROFILES.expert)).toEqual(first);
  });

  it.each(Object.entries(DIFFICULTY_PROFILES))(
    '%s has a valid immutable configuration',
    (_, profile) => {
      expect(() => validateDifficulty(profile)).not.toThrow();
      expect(Object.isFrozen(profile)).toBe(true);
      expect(Object.isFrozen(profile.weights)).toBe(true);
    },
  );

  it.each([
    { rangeAwareness: -0.1 },
    { rangeAwareness: 1.1 },
    { rangeAwareness: Number.NaN },
    { decisionSpread: -1 },
    { decisionSpread: Number.POSITIVE_INFINITY },
    { forecastRollCount: -1 },
    { forecastRollCount: 81 },
    { forecastRollCount: 1.5 },
    { forecastRollCount: Number.NaN },
  ])('rejects invalid evaluation controls: %j', (override) => {
    expect(() => validateDifficulty({ ...DIFFICULTY_PROFILES.medium, ...override })).toThrow(
      RangeError,
    );
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid weight %s', (value) => {
    const base = DIFFICULTY_PROFILES.medium;
    expect(() =>
      validateDifficulty({ ...base, weights: { ...base.weights, deadEndRisk: value } }),
    ).toThrow(RangeError);
  });

  it('keeps Medium identical to the original baseline', () => {
    const initial = createGame({ random: seededRandom(42) });
    const state = drawBrick(initial, initial.turn.playerId, seededRandom(17));
    expect(chooseMove(state, state.turn.playerId)).toEqual(
      chooseMove(state, state.turn.playerId, { profile: DIFFICULTY_PROFILES.medium }),
    );
  });

  it('uses configuration values, without depending on a named difficulty identity', () => {
    const initial = createGame({ random: seededRandom(42) });
    const state = drawBrick(initial, initial.turn.playerId, seededRandom(17));
    const copied = {
      ...DIFFICULTY_PROFILES.hard,
      weights: { ...DIFFICULTY_PROFILES.hard.weights },
    };
    expect(evaluateMoves(state, state.turn.playerId, copied)).toEqual(
      evaluateMoves(state, state.turn.playerId, DIFFICULTY_PROFILES.hard),
    );
  });

  it('avoids the attractive but cramped 98/99/100 placement at higher difficulty', () => {
    const initial = createGame({
      initialDeck: deckForTowers(
        [98, 5, 100, 35, 45, 55, 65, 75, 85, 95],
        [92, 82, 72, 62, 52, 42, 32, 22, 12, 2],
      ),
      random: () => 0,
    });
    const state = freezeGame(drawBrick(initial, 0, randomForBrick(initial, 99)));
    const easyBest = selectBestMove(evaluateMoves(state, 0, DIFFICULTY_PROFILES.easy));
    expect(easyBest?.position).toBe(1);
    for (const profile of [DIFFICULTY_PROFILES.hard, DIFFICULTY_PROFILES.expert]) {
      const move = chooseMove(state, 0, { profile });
      expect(move?.position).not.toBe(1);
      expect(move?.position).toBe(9);
    }
  });

  it.each(Object.entries(DIFFICULTY_PROFILES))(
    '%s never throws away an immediate victory',
    (_, profile) => {
      const initial = createGame({
        initialDeck: deckForTowers(
          [1, 10, 20, 30, 40, 99, 60, 70, 80, 90],
          [100, 98, 97, 96, 95, 94, 93, 92, 91, 89],
        ),
        random: () => 0,
      });
      const state = freezeGame(drawBrick(initial, 0, randomForBrick(initial, 50)));
      const random = vi.fn(() => 0.999);
      const move = chooseMove(state, 0, { profile, random });
      expect(move).toMatchObject({ position: 5, wins: true });
      expect(random).not.toHaveBeenCalled();
      expect(replaceBrick(state, 0, move!.position).status).toBe('won');
    },
  );

  it('selects only alternatives within the spread and uses a separate reproducible random input', () => {
    const initial = createGame({
      initialDeck: [...createOrderedDeck()].reverse(),
      random: () => 0,
    });
    const state = freezeGame(drawBrick(initial, 0, () => 0));
    const profile = { ...DIFFICULTY_PROFILES.easy, decisionSpread: 100 };
    const snapshot = JSON.stringify(state);
    expect(chooseMove(state, 0, { profile, random: () => 0 })?.position).toBe(0);
    expect(chooseMove(state, 0, { profile, random: () => 0.999 })?.position).toBe(9);
    expect(() => chooseMove(state, 0, { profile })).toThrow(TypeError);
    expect(() => chooseMove(state, 0, { profile, random: () => 1 })).toThrow();
    expect(chooseMove(state, 0, { profile, random: seededRandom(4) })).toEqual(
      chooseMove(state, 0, { profile, random: seededRandom(4) }),
    );
    const easy = DIFFICULTY_PROFILES.easy;
    const best = selectBestMove(evaluateMoves(state, 0, easy))!;
    for (const value of [0, 0.25, 0.5, 0.999]) {
      const move = chooseMove(state, 0, { profile: easy, random: () => value })!;
      expect(best.score - move.score).toBeLessThanOrEqual(easy.decisionSpread);
    }
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it.each(Object.entries(DIFFICULTY_PROFILES))(
    '%s returns no action before drawing and does not consume decision randomness',
    (_, profile) => {
      const state = createGame({ random: seededRandom(42) });
      const random = vi.fn(() => 0.5);
      expect(chooseMove(state, state.turn.playerId, { profile, random })).toBeNull();
      expect(random).not.toHaveBeenCalled();
    },
  );
});
