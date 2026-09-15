import { describe, expect, it } from 'vitest';
import type { GameState } from '../types/index';
import { createGame, drawBrick, endTurn, replaceBrick } from '../game/gameState';
import { getLegalPlacements } from '../game/gameRules';
import { checkWin } from '../game/winCondition';
import { seededRandom } from '../game/tests/helpers';
import { DIFFICULTY_PROFILES } from './difficulty';
import type { Difficulty } from './difficulty';
import { chooseMove } from './evaluator';

function playMatch(names: readonly [Difficulty, Difficulty], seed: number): Difficulty {
  let state: GameState = createGame({ random: seededRandom(seed) });
  // Separate seeded streams for initial deal, each seat's rolls, and each seat's decisions.
  const rolls = [seededRandom(seed + 1000), seededRandom(seed + 2000)] as const;
  const decisions = [seededRandom(seed + 3000), seededRandom(seed + 4000)] as const;
  const maximumFixtureTurns = 600;
  for (let turn = 0; turn < maximumFixtureTurns && state.status === 'playing'; turn += 1) {
    const player = state.turn.playerId;
    state = drawBrick(state, player, rolls[player]);
    const move = chooseMove(state, player, {
      profile: DIFFICULTY_PROFILES[names[player]],
      random: decisions[player],
    });
    expect(move).not.toBeNull();
    expect(getLegalPlacements(state, player)).toContain(move!.position);
    state = replaceBrick(state, player, move!.position);
    expect(new Set(state.players.flatMap((seat) => seat.tower)).size).toBe(20);
    if (state.status === 'playing') state = endTurn(state, player);
  }
  expect(state.status).toBe('won');
  if (state.status !== 'won')
    throw new Error('Seeded comparison did not finish within its test limit.');
  expect(checkWin(state.players[state.winner].tower)).toBe(true);
  return names[state.winner];
}

describe('representative difficulty comparisons', () => {
  it.each([
    ['easy', 'medium'],
    ['medium', 'hard'],
    ['hard', 'expert'],
  ] as const)('%s versus %s, with each profile playing both seats', (weaker, stronger) => {
    const winners: Difficulty[] = [];
    for (let seed = 1; seed <= 8; seed += 1) {
      winners.push(playMatch([weaker, stronger], seed));
      winners.push(playMatch([stronger, weaker], seed));
    }
    // A reproducible regression corpus, not a universal strength or win-rate guarantee.
    expect(winners.filter((winner) => winner === stronger).length).toBeGreaterThan(
      winners.filter((winner) => winner === weaker).length,
    );
  });
});
