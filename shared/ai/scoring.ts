import { BRICK_COUNT, MAX_BRICK_VALUE, MIN_BRICK_VALUE, TOWER_SIZE } from '../game/constants';
import type { Brick } from '../types/index';

const ADJACENT_PAIR_COUNT = TOWER_SIZE - 1;
const POSITION_BAND_WIDTH = BRICK_COUNT / TOWER_SIZE;

function fittedNeighbourCount(tower: readonly Brick[], position: number, value: Brick): number {
  return (
    Number(position > 0 && tower[position - 1]! < value) +
    Number(position < tower.length - 1 && value < tower[position + 1]!)
  );
}

function fitsBetweenNeighbours(tower: readonly Brick[], position: number, value: Brick): boolean {
  return (
    (position === 0 || tower[position - 1]! < value) &&
    (position === tower.length - 1 || value < tower[position + 1]!)
  );
}

function orderedPairCount(tower: readonly Brick[]): number {
  return tower.slice(1).filter((brick, index) => tower[index]! < brick).length;
}

/** Fraction of existing neighbours that fit the brick at the selected position. */
export function scoreNeighbourFit(tower: readonly Brick[], position: number): number {
  const neighbourCount = Number(position > 0) + Number(position < tower.length - 1);
  return fittedNeighbourCount(tower, position, tower[position]!) / neighbourCount;
}

/** Change in the fraction of ascending adjacent pairs; negative values mean damage. */
export function scoreOrderImprovement(before: readonly Brick[], after: readonly Brick[]): number {
  return (orderedPairCount(after) - orderedPairCount(before)) / ADJACENT_PAIR_COUNT;
}

/** Average closeness to centres 5.5, 15.5, ..., 95.5; distance ten or more scores zero. */
export function scorePositionQuality(tower: readonly Brick[]): number {
  const total = tower.reduce((sum, brick, position) => {
    const centre = MIN_BRICK_VALUE + (POSITION_BAND_WIDTH - 1) / 2 + position * POSITION_BAND_WIDTH;
    return sum + Math.max(0, 1 - Math.abs(brick - centre) / POSITION_BAND_WIDTH);
  }, 0);
  return total / TOWER_SIZE;
}

/** Mean probability an eligible value fits between each slot's existing neighbours. */
export function scoreFutureFlexibility(
  tower: readonly Brick[],
  available: readonly Brick[],
): number {
  if (available.length === 0) return 0;
  const fittingCount = tower.reduce(
    (sum, _, position) =>
      sum + available.filter((value) => fitsBetweenNeighbours(tower, position, value)).length,
    0,
  );
  return fittingCount / (TOWER_SIZE * available.length);
}

/** Numeric shortages above/below each retained brick, normalized by all required slots. */
export function scoreDeadEndRisk(tower: readonly Brick[]): number {
  const shortage = tower.reduce((sum, brick, position) => {
    const requiredAbove = position;
    const requiredBelow = TOWER_SIZE - position - 1;
    return (
      sum +
      Math.max(0, requiredAbove - (brick - MIN_BRICK_VALUE)) +
      Math.max(0, requiredBelow - (MAX_BRICK_VALUE - brick))
    );
  }, 0);
  return shortage / (TOWER_SIZE * ADJACENT_PAIR_COUNT);
}

/** Probability a hypothetical roll can increase the number of ascending adjacent pairs. */
export function scoreExpectedProgress(
  tower: readonly Brick[],
  available: readonly Brick[],
): number {
  if (available.length === 0) return 0;
  const usefulValues = available.filter((value) =>
    tower.some(
      (brick, position) =>
        fittedNeighbourCount(tower, position, value) > fittedNeighbourCount(tower, position, brick),
    ),
  );
  return usefulValues.length / available.length;
}
