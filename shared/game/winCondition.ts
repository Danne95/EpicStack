import type { Brick } from '../types/index';
import { MAX_BRICK_VALUE, MIN_BRICK_VALUE, TOWER_SIZE } from './constants';

/** Towers are represented top to bottom. Only ten valid, strictly ascending bricks win. */
export function checkWin(tower: readonly Brick[]): boolean {
  return (
    tower.length === TOWER_SIZE &&
    [...tower].every(
      (brick, index) =>
        Number.isInteger(brick) &&
        brick >= MIN_BRICK_VALUE &&
        brick <= MAX_BRICK_VALUE &&
        (index === 0 || tower[index - 1]! < brick),
    )
  );
}
