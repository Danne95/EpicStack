import { describe, expect, it } from 'vitest';
import {
  scoreDeadEndRisk,
  scoreExpectedProgress,
  scoreFutureFlexibility,
  scoreNeighbourFit,
  scoreOrderImprovement,
  scorePositionQuality,
} from './scoring';

const ordered = Object.freeze([5, 15, 25, 35, 45, 55, 65, 75, 85, 95]);

describe('individual AI scores', () => {
  it('counts only existing neighbours, including top and bottom edges', () => {
    expect(scoreNeighbourFit(ordered, 0)).toBe(1);
    expect(scoreNeighbourFit(ordered, 9)).toBe(1);
    expect(scoreNeighbourFit(ordered, 4)).toBe(1);
    expect(scoreNeighbourFit([5, 50, ...ordered.slice(2)], 1)).toBe(0.5);
    expect(scoreNeighbourFit([...ordered].reverse(), 4)).toBe(0);
  });

  it('measures ordering improvement and damage with the correct sign', () => {
    const oneInversion = [5, 15, 25, 35, 55, 45, 65, 75, 85, 95];
    expect(scoreOrderImprovement(oneInversion, ordered)).toBeCloseTo(1 / 9);
    expect(scoreOrderImprovement(ordered, oneInversion)).toBeCloseTo(-1 / 9);
    expect(scoreOrderImprovement(ordered, ordered)).toBe(0);
  });

  it('rewards every brick being near its position band, not just the drawn value', () => {
    expect(scorePositionQuality(ordered)).toBeCloseTo(0.95);
    expect(scorePositionQuality([100, ...ordered.slice(1)])).toBeCloseTo(0.855);
    expect(scorePositionQuality([...ordered].reverse())).toBeLessThan(
      scorePositionQuality(ordered),
    );
  });

  it('counts fitting roll/position pairs without inventing edge neighbours', () => {
    // 1 fits slot 0; 10 fits 0 and 1; 20 fits 1 and 2; 100 fits 9: six fits.
    expect(scoreFutureFlexibility(ordered, [1, 10, 20, 100])).toBeCloseTo(6 / 40);
    expect(scoreFutureFlexibility(ordered, [])).toBe(0);
  });

  it('detects insufficient numeric space beneath high bricks or above low bricks', () => {
    expect(scoreDeadEndRisk(ordered)).toBe(0);
    expect(scoreDeadEndRisk([98, 99, 100, 40, 50, 60, 70, 80, 90, 95])).toBeCloseTo(21 / 90);
    expect(scoreDeadEndRisk([5, 15, 25, 35, 45, 55, 65, 1, 2, 3])).toBeCloseTo(21 / 90);
  });

  it('counts each helpful future value once, even if it improves several positions', () => {
    const descending = [...ordered].reverse();
    // Both extreme values create an ordered pair at an edge; 50 can improve interior pairs.
    expect(scoreExpectedProgress(descending, [1, 50, 100])).toBe(1);
    expect(scoreExpectedProgress(ordered, [1, 10, 20, 100])).toBe(0);
    expect(scoreExpectedProgress(ordered, [])).toBe(0);
  });

  it('reports the exact fraction of useful rolls for a single inversion', () => {
    const tower = [5, 15, 25, 35, 55, 45, 65, 75, 85, 95];
    // 40 repairs slot 4 and 60 repairs slot 5; 1 and 100 cannot increase the pair count.
    expect(scoreExpectedProgress(tower, [1, 40, 60, 100])).toBe(0.5);
  });
});
