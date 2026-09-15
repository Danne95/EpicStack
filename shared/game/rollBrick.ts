import type { Brick, RandomSource } from '../types/index';
import { createOrderedDeck, randomIndex } from './deck';
import { GameRuleError } from './errors';

/** The same eligible pool is used by rolling and AI probability estimates. */
export function getAvailableBricks(occupiedBricks: readonly Brick[]): readonly Brick[] {
  const occupied = new Set(occupiedBricks);
  return createOrderedDeck().filter((brick) => !occupied.has(brick));
}

/** Rolls uniformly from values not currently present in either tower. */
export function rollBrick(occupiedBricks: readonly Brick[], random: RandomSource): Brick {
  const available = getAvailableBricks(occupiedBricks);
  if (available.length === 0) {
    throw new GameRuleError('NO_AVAILABLE_BRICKS', 'There are no unoccupied brick values to roll.');
  }
  // A bounded index samples the eligible values directly, without reroll loops.
  return available[randomIndex(available.length, random)]!;
}
