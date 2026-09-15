import { TOWER_SIZE } from '../game/constants';
import type { Brick } from '../types/index';
import { retainedBrickCount } from './ranges';

/** Static-opponent one-roll estimate, not a prediction of the actual next turn. */
export function scoreForecast(
  tower: readonly Brick[],
  available: readonly Brick[],
  prefix: readonly number[],
  requestedSamples: number,
): number {
  const samples = Math.min(requestedSamples, available.length);
  if (samples === 0) return 0;
  let total = 0;
  for (let sample = 0; sample < samples; sample += 1) {
    const value = available[Math.floor(((sample + 0.5) * available.length) / samples)]!;
    let best = 0;
    for (let position = 0; position < TOWER_SIZE; position += 1) {
      // Mathematical scoring projection only; never returned or committed as game state.
      const projected = tower.map((brick, index) => (index === position ? value : brick));
      best = Math.max(best, retainedBrickCount(projected, prefix));
    }
    total += best;
  }
  return total / (samples * TOWER_SIZE);
}
