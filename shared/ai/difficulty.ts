import type { ScoreComponents } from './types';
import { BASELINE_WEIGHTS } from './weights';
import { BRICK_COUNT, PLAYER_COUNT, TOWER_SIZE } from '../game/constants';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface DifficultyProfile {
  readonly weights: Readonly<ScoreComponents>;
  /** Blend between local scoring (0) and range-aware scoring (1). */
  readonly rangeAwareness: number;
  /** Score distance from the best move within which a random alternative can be selected. */
  readonly decisionSpread: number;
  /** Deterministic quantile samples of the eligible future pool; 0 disables forecasting. */
  readonly forecastRollCount: number;
}

// The current game has eighty possible rolls. This also bounds custom profile work.
export const MAX_FORECAST_ROLLS = BRICK_COUNT - PLAYER_COUNT * TOWER_SIZE;

function profile(value: DifficultyProfile): DifficultyProfile {
  return Object.freeze({ ...value, weights: Object.freeze({ ...value.weights }) });
}

export const DIFFICULTY_PROFILES: Readonly<Record<Difficulty, DifficultyProfile>> = Object.freeze({
  easy: profile({
    weights: {
      neighbourFit: 2,
      orderImprovement: 3,
      positionQuality: 2,
      futureFlexibility: 0,
      deadEndRisk: 0,
      expectedProgress: 0,
    },
    rangeAwareness: 0,
    decisionSpread: 0.3,
    forecastRollCount: 0,
  }),
  medium: profile({
    weights: BASELINE_WEIGHTS,
    rangeAwareness: 0,
    decisionSpread: 0,
    forecastRollCount: 0,
  }),
  hard: profile({
    weights: {
      neighbourFit: 0.5,
      orderImprovement: 3,
      positionQuality: 5,
      futureFlexibility: 1,
      deadEndRisk: 5,
      expectedProgress: 0.25,
    },
    rangeAwareness: 1,
    decisionSpread: 0,
    forecastRollCount: 0,
  }),
  expert: profile({
    weights: {
      neighbourFit: 0.5,
      orderImprovement: 3,
      positionQuality: 5,
      futureFlexibility: 1,
      deadEndRisk: 5,
      expectedProgress: 2,
    },
    rangeAwareness: 1,
    decisionSpread: 0,
    forecastRollCount: MAX_FORECAST_ROLLS,
  }),
});

export function validateDifficulty(profile: DifficultyProfile): void {
  let totalWeight = 0;
  for (const key of Object.keys(BASELINE_WEIGHTS) as (keyof ScoreComponents)[]) {
    if (!Number.isFinite(profile.weights[key]) || profile.weights[key] < 0) {
      throw new RangeError(`AI weight ${key} must be finite and non-negative.`);
    }
    totalWeight += profile.weights[key];
  }
  if (!Number.isFinite(totalWeight)) {
    throw new RangeError('The sum of AI weights must remain finite.');
  }
  if (
    !Number.isFinite(profile.rangeAwareness) ||
    profile.rangeAwareness < 0 ||
    profile.rangeAwareness > 1
  ) {
    throw new RangeError('AI range awareness must be in [0, 1].');
  }
  if (!Number.isFinite(profile.decisionSpread) || profile.decisionSpread < 0) {
    throw new RangeError('AI decision spread must be finite and non-negative.');
  }
  if (
    !Number.isInteger(profile.forecastRollCount) ||
    profile.forecastRollCount < 0 ||
    profile.forecastRollCount > MAX_FORECAST_ROLLS
  ) {
    throw new RangeError(
      `AI forecast roll count must be an integer in [0, ${MAX_FORECAST_ROLLS}].`,
    );
  }
}
