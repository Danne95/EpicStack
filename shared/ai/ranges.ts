import { BRICK_COUNT, MAX_BRICK_VALUE, MIN_BRICK_VALUE, TOWER_SIZE } from '../game/constants';
import type { Brick } from '../types/index';

/** Counts values <= each index that are not held by the opponent. */
export function availablePrefix(opponent: readonly Brick[]): readonly number[] {
  const blocked = new Set(opponent);
  const prefix = [0];
  for (let value = MIN_BRICK_VALUE; value <= MAX_BRICK_VALUE; value += 1) {
    prefix.push(prefix[value - 1]! + Number(!blocked.has(value)));
  }
  return prefix;
}

function countBetween(prefix: readonly number[], lower: number, upper: number): number {
  return upper > lower ? prefix[upper - 1]! - prefix[lower]! : 0;
}

/** Largest set of bricks that can stay in place in some ascending completion. */
export function retainedBrickCount(tower: readonly Brick[], prefix: readonly number[]): number {
  const anchors = [MIN_BRICK_VALUE - 1, ...tower, MAX_BRICK_VALUE + 1];
  const longest = Array<number>(anchors.length).fill(Number.NEGATIVE_INFINITY);
  longest[0] = 0;
  for (let right = 1; right < anchors.length; right += 1) {
    for (let left = 0; left < right; left += 1) {
      const gaps = right - left - 1;
      if (
        anchors[left]! < anchors[right]! &&
        countBetween(prefix, anchors[left]!, anchors[right]!) >= gaps
      ) {
        const realAnchor = right === anchors.length - 1 ? 0 : 1;
        longest[right] = Math.max(longest[right]!, longest[left]! + realAnchor);
      }
    }
  }
  return longest[anchors.length - 1]!;
}

/** Room on both sides of every anchor, relative to ten possible values per required slot. */
export function scoreRangeFlexibility(tower: readonly Brick[], prefix: readonly number[]): number {
  const valuesPerSlot = BRICK_COUNT / TOWER_SIZE;
  let total = 0;
  let sides = 0;
  tower.forEach((brick, position) => {
    if (position > 0) {
      total += Math.min(1, countBetween(prefix, 0, brick) / (position * valuesPerSlot));
      sides += 1;
    }
    const below = TOWER_SIZE - position - 1;
    if (below > 0) {
      total += Math.min(
        1,
        countBetween(prefix, brick, MAX_BRICK_VALUE + 1) / (below * valuesPerSlot),
      );
      sides += 1;
    }
  });
  return total / sides;
}
