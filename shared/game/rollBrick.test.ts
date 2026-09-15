import { describe, expect, it, vi } from 'vitest';
import { createOrderedDeck } from './deck';
import { rollBrick } from './rollBrick';

describe('rollBrick', () => {
  const occupied = [1, 3, 8, 12, 17, 21, 26, 30, 35, 44, 50, 56, 61, 67, 73, 78, 84, 91, 99, 100];

  it('maps equal random intervals to every eligible number exactly once', () => {
    const eligible = createOrderedDeck().filter((brick) => !occupied.includes(brick));
    const rolls = eligible.map((_, index) =>
      rollBrick(occupied, () => (index + 0.5) / eligible.length),
    );
    expect(rolls).toEqual(eligible);
    expect(rolls).toHaveLength(80);
  });

  it('excludes both ends of the range when occupied', () => {
    expect(rollBrick(occupied, () => 0)).toBe(2);
    expect(rollBrick(occupied, () => 0.999)).toBe(98);
  });

  it('uses one random value and does not mutate the occupied bricks', () => {
    const random = vi.fn(() => 0.5);
    expect(rollBrick(Object.freeze([...occupied]), random)).toBe(52);
    expect(random).toHaveBeenCalledTimes(1);
  });

  it('fails explicitly when every value is occupied', () => {
    const random = vi.fn(() => 0);
    expect(() => rollBrick(createOrderedDeck(), random)).toThrow(
      expect.objectContaining({ code: 'NO_AVAILABLE_BRICKS' }),
    );
    expect(random).not.toHaveBeenCalled();
  });
});
