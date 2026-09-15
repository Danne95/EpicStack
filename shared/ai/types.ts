export interface ScoreComponents {
  readonly neighbourFit: number;
  readonly orderImprovement: number;
  readonly positionQuality: number;
  readonly futureFlexibility: number;
  readonly deadEndRisk: number;
  readonly expectedProgress: number;
}

export interface MoveEvaluation {
  readonly position: number;
  readonly wins: boolean;
  readonly score: number;
  readonly components: ScoreComponents;
}
