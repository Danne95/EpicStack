import type { Deck, Players, RandomSource } from '../types/index';
import { MAX_INITIAL_DEAL_ATTEMPTS, PLAYER_COUNT, TOWER_SIZE } from './constants';
import { createDeck, validateInitialDeck } from './deck';
import { GameRuleError } from './errors';
import { checkWin } from './winCondition';

function dealTowers(deck: Deck): Players {
  const dealt = deck.slice(0, PLAYER_COUNT * TOWER_SIZE);
  return [
    { id: 0, tower: dealt.filter((_, index) => index % PLAYER_COUNT === 0) },
    { id: 1, tower: dealt.filter((_, index) => index % PLAYER_COUNT === 1) },
  ];
}

/** Rejects a winning initial deal for either player and redeals both towers. */
export function dealInitialPlayers(random: RandomSource, initialDeck?: Deck): Players {
  if (initialDeck !== undefined) {
    validateInitialDeck(initialDeck);
  }

  for (let attempt = 0; attempt < MAX_INITIAL_DEAL_ATTEMPTS; attempt += 1) {
    const deck = attempt === 0 && initialDeck !== undefined ? initialDeck : createDeck(random);
    const players = dealTowers(deck);
    if (!players.some((player) => checkWin(player.tower))) {
      return players;
    }
  }

  throw new GameRuleError(
    'INITIALIZATION_FAILED',
    `Could not deal non-winning towers in ${MAX_INITIAL_DEAL_ATTEMPTS} attempts. Check the random source.`,
  );
}
