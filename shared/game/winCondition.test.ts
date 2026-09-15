import { describe, expect, it } from 'vitest';
import { checkWin } from './winCondition';

describe('checkWin', () => {
  it('accepts strictly ascending towers with gaps and boundary values', () => {
    expect(checkWin([1, 4, 12, 23, 37, 41, 69, 75, 86, 100])).toBe(true);
  });

  it('does not treat empty array slots as ordered bricks', () => {
    const tower = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    delete tower[4];
    expect(checkWin(tower)).toBe(false);
  });

  it.each(
    [
      [1, 2, 3, 4, 5, 6, 7, 8, 10, 9],
      [2, 1, 3, 4, 5, 6, 7, 8, 9, 10],
      [1, 2, 3, 4, 6, 5, 7, 8, 9, 10],
      [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 9],
      [],
      [1],
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      [0, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 101],
      [1, 2, 3, 4, 5.5, 6, 7, 8, 9, 10],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, Number.NaN],
    ].map((tower) => ({ tower })),
  )('rejects unsorted or invalid towers (%#)', ({ tower }) => {
    expect(checkWin(tower)).toBe(false);
  });
});
