import { describe, expect, it } from 'vitest';
import { availablePrefix, retainedBrickCount, scoreRangeFlexibility } from './ranges';
import { scoreForecast } from './forecast';

describe('range-aware scoring', () => {
  const ordered = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];

  it('retains a winning tower and counts an impossible anchor as a required replacement', () => {
    const prefix = availablePrefix([2, 12, 22, 32, 42, 52, 62, 72, 82, 92]);
    expect(retainedBrickCount(ordered, prefix)).toBe(10);
    expect(retainedBrickCount([5, 15, 25, 35, 99, 55, 65, 75, 85, 95], prefix)).toBe(9);
  });

  it('rejects apparently ascending anchors when too few values exist between their positions', () => {
    // The misplaced 3 and 2 cannot stay at indices 1 and 2 in any ascending completion.
    expect(retainedBrickCount([1, 3, 2, 4, 5, 6, 7, 8, 9, 10], availablePrefix([]))).toBe(8);
  });

  it('accounts for values held by the opponent, but not values that our discarded bricks may free', () => {
    const tower = [1, 99, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(retainedBrickCount(tower, availablePrefix([]))).toBe(9);
    expect(retainedBrickCount(tower, availablePrefix([2]))).toBeLessThan(9);
  });

  it('prefers room around sensibly positioned anchors to 98/99/100 near the top', () => {
    const prefix = availablePrefix([]);
    const cramped = [98, 99, 100, 35, 45, 55, 65, 75, 85, 95];
    expect(retainedBrickCount(cramped, prefix)).toBe(7);
    expect(scoreRangeFlexibility(cramped, prefix)).toBeLessThan(
      scoreRangeFlexibility(ordered, prefix),
    );
  });

  it('forecasts exact hand-calculated outcomes over the supplied uniform roll pool', () => {
    const tower = [1, 10, 20, 30, 40, 99, 60, 70, 80, 90];
    const prefix = availablePrefix([]);
    // 50 completes the tower (ten retained); 100 can keep nine, but cannot repair the hole.
    expect(scoreForecast(tower, [50, 100], prefix, 2)).toBe(0.95);
    expect(scoreForecast(tower, [50, 100], prefix, 1)).toBe(0.9);
    expect(scoreForecast(tower, [], prefix, 0)).toBe(0);
  });
});
