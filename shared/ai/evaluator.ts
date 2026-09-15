import { getLegalPlacements } from '../game/gameRules';
import { replaceBrick } from '../game/gameState';
import { getAvailableBricks } from '../game/rollBrick';
import type { GameState, PlayerId, RandomSource } from '../types/index';
import { TOWER_SIZE } from '../game/constants';
import { randomIndex } from '../game/deck';
import { DIFFICULTY_PROFILES, validateDifficulty } from './difficulty';
import type { DifficultyProfile } from './difficulty';
import { availablePrefix, retainedBrickCount, scoreRangeFlexibility } from './ranges';
import { scoreForecast } from './forecast';
import {
  scoreDeadEndRisk,
  scoreExpectedProgress,
  scoreFutureFlexibility,
  scoreNeighbourFit,
  scoreOrderImprovement,
  scorePositionQuality,
} from './scoring';
import type { MoveEvaluation, ScoreComponents } from './types';
import { combineScores } from './weights';

/** Inspect every legal move. Evaluation neither commits an action nor consumes randomness. */
export function evaluateMoves(
  state: GameState,
  playerId: PlayerId,
  profile: DifficultyProfile = DIFFICULTY_PROFILES.medium,
): readonly MoveEvaluation[] {
  validateDifficulty(profile);
  const prefix = availablePrefix(state.players[playerId === 0 ? 1 : 0].tower);
  return getLegalPlacements(state, playerId).map((position) => {
    const candidate = replaceBrick(state, playerId, position);
    const tower = candidate.players[playerId].tower;
    const available = getAvailableBricks(candidate.players.flatMap((player) => player.tower));
    const local: ScoreComponents = {
      neighbourFit: scoreNeighbourFit(tower, position),
      orderImprovement: scoreOrderImprovement(state.players[playerId].tower, tower),
      positionQuality: scorePositionQuality(tower),
      futureFlexibility: scoreFutureFlexibility(tower, available),
      deadEndRisk: scoreDeadEndRisk(tower),
      expectedProgress: scoreExpectedProgress(tower, available),
    };
    const awareness = profile.rangeAwareness;
    const components: ScoreComponents = {
      ...local,
      futureFlexibility:
        awareness === 0
          ? local.futureFlexibility
          : (1 - awareness) * local.futureFlexibility +
            awareness * scoreRangeFlexibility(tower, prefix),
      deadEndRisk:
        awareness === 0
          ? local.deadEndRisk
          : (1 - awareness) * local.deadEndRisk +
            awareness * (1 - retainedBrickCount(tower, prefix) / TOWER_SIZE),
      expectedProgress:
        profile.forecastRollCount === 0
          ? local.expectedProgress
          : scoreForecast(tower, available, prefix, profile.forecastRollCount),
    };
    return {
      position,
      wins: candidate.status === 'won' && candidate.winner === playerId,
      score: combineScores(components, profile.weights),
      components,
    };
  });
}

/** Wins take priority, then score, then the smallest (topmost) position for an exact tie. */
export function selectBestMove(moves: readonly MoveEvaluation[]): MoveEvaluation | null {
  let best: MoveEvaluation | null = null;
  for (const move of moves) {
    if (
      best === null ||
      (move.wins && !best.wins) ||
      (move.wins === best.wins &&
        (move.score > best.score || (move.score === best.score && move.position < best.position)))
    ) {
      best = move;
    }
  }
  return best;
}

export interface ChooseMoveOptions {
  readonly profile?: DifficultyProfile;
  /** A decision-only random stream, separate from the random stream passed to drawBrick. */
  readonly random?: RandomSource;
}

/** Null means the actor has no legal placement in the current state. */
export function chooseMove(
  state: GameState,
  playerId: PlayerId,
  options: ChooseMoveOptions = {},
): MoveEvaluation | null {
  const profile = options.profile ?? DIFFICULTY_PROFILES.medium;
  const moves = evaluateMoves(state, playerId, profile);
  const best = selectBestMove(moves);
  if (best === null || best.wins || profile.decisionSpread === 0) return best;
  const alternatives = moves.filter((move) => best.score - move.score <= profile.decisionSpread);
  if (alternatives.length === 1) return best;
  if (options.random === undefined)
    throw new TypeError('This AI profile requires a separate decision random source.');
  return alternatives[randomIndex(alternatives.length, options.random)]!;
}
