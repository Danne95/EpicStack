import type { ScoreComponents } from './types';

/** One baseline, not a difficulty profile. Exact rationale is in docs/AI_DESIGN.md. */
export const BASELINE_WEIGHTS: Readonly<ScoreComponents> = Object.freeze({
  neighbourFit: 1,
  orderImprovement: 3,
  positionQuality: 6,
  futureFlexibility: 0.5,
  deadEndRisk: 2,
  expectedProgress: 0.25,
});

export function combineScores(
  components: ScoreComponents,
  weights: Readonly<ScoreComponents> = BASELINE_WEIGHTS,
): number {
  return (
    components.neighbourFit * weights.neighbourFit +
    components.orderImprovement * weights.orderImprovement +
    components.positionQuality * weights.positionQuality +
    components.futureFlexibility * weights.futureFlexibility -
    components.deadEndRisk * weights.deadEndRisk +
    components.expectedProgress * weights.expectedProgress
  );
}
