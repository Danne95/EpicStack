import { describe, expect, it } from 'vitest';
import { emptyLocalData, parseLocalData, recordVictory } from '../src/hooks/localData';
import { createLocalStore } from '../src/hooks/localStore';
import type { WonGameState } from '../../../shared/types/index';

const result = (turn: number, winner: 0 | 1): WonGameState => ({
  status: 'won',
  winner,
  turn: { number: turn, playerId: winner, phase: 'complete' },
  players: [
    { id: 0, tower: [] },
    { id: 1, tower: [] },
  ],
  discardedBricks: [],
});
describe('local statistics and preferences', () => {
  it('counts human turns, retains the best win, and isolates difficulties and losses', () => {
    const original = emptyLocalData();
    let data = recordVictory(original, result(21, 0), 'hard');
    data = recordVictory(data, result(14, 0), 'hard');
    data = recordVictory(data, result(8, 1), 'hard');
    expect(data.statistics.hard).toEqual({ wins: 2, losses: 1, winningTurns: 18, bestWin: 7 });
    expect(data.statistics.easy).toEqual(original.statistics.easy);
    expect(original.statistics.hard.wins).toBe(0);
  });
  it('round-trips valid records and rejects corrupt, negative, and unknown records', () => {
    const data = recordVictory({ ...emptyLocalData(), muted: true }, result(10, 0), 'easy');
    expect(parseLocalData(JSON.stringify(data))).toEqual(data);
    for (const raw of [
      '{',
      'null',
      '{"version":9}',
      JSON.stringify({
        ...data,
        statistics: { ...data.statistics, easy: { ...data.statistics.easy, wins: -1 } },
      }),
    ]) {
      expect(parseLocalData(raw)).toEqual(emptyLocalData());
    }
  });
  it('saves changes and restores preferences and statistics in a fresh store', () => {
    let saved: string | null = null;
    const storage = {
      getItem: () => saved,
      setItem: (_key: string, value: string) => {
        saved = value;
      },
    };
    const store = createLocalStore(storage);
    let notifications = 0;
    const unsubscribe = store.subscribe(() => notifications++);
    store.update((data) =>
      recordVictory({ ...data, difficulty: 'expert', muted: true }, result(12, 0), 'expert'),
    );
    expect(notifications).toBe(1);
    expect(createLocalStore(storage).getSnapshot()).toEqual(store.getSnapshot());
    unsubscribe();
  });
  it('keeps play and in-memory updates available if storage access fails', () => {
    const store = createLocalStore({
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
    });
    store.update((data) => ({ ...data, muted: true }));
    expect(store.getSnapshot().storageAvailable).toBe(false);
    expect(store.getSnapshot().data.muted).toBe(true);
  });
});
