import type { Difficulty } from '../../../../shared/ai/difficulty';
import type { WonGameState } from '../../../../shared/types/index';
import { HUMAN_PLAYER } from './gameController';

export const STORAGE_KEY = 'epicstack.local.v1';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
export interface Statistics {
  wins: number;
  losses: number;
  winningTurns: number;
  bestWin: number | null;
}
export interface LocalData {
  version: 1;
  difficulty: Difficulty;
  muted: boolean;
  statistics: Record<Difficulty, Statistics>;
}
export function emptyLocalData(): LocalData {
  const empty = (): Statistics => ({ wins: 0, losses: 0, winningTurns: 0, bestWin: null });
  return {
    version: 1,
    difficulty: 'medium',
    muted: false,
    statistics: { easy: empty(), medium: empty(), hard: empty(), expert: empty() },
  };
}
function validStatistics(value: unknown): value is Statistics {
  if (!value || typeof value !== 'object') return false;
  const s = value as Statistics;
  const integer = (n: number): boolean => Number.isSafeInteger(n) && n >= 0;
  return (
    integer(s.wins) &&
    integer(s.losses) &&
    integer(s.winningTurns) &&
    (s.wins === 0
      ? s.bestWin === null && s.winningTurns === 0
      : typeof s.bestWin === 'number' &&
        integer(s.bestWin) &&
        s.bestWin > 0 &&
        s.winningTurns >= s.wins &&
        s.bestWin <= s.winningTurns / s.wins)
  );
}
/** Treat browser storage as untrusted input; malformed/old records use safe defaults. */
export function parseLocalData(raw: string | null): LocalData {
  try {
    const data = JSON.parse(raw ?? 'null') as LocalData | null;
    if (
      data?.version === 1 &&
      DIFFICULTIES.includes(data.difficulty) &&
      typeof data.muted === 'boolean' &&
      data.statistics &&
      DIFFICULTIES.every((level) => validStatistics(data.statistics[level]))
    )
      return data;
  } catch {
    /* A damaged record must not prevent play. */
  }
  return emptyLocalData();
}
export function recordVictory(
  data: LocalData,
  game: WonGameState,
  difficulty: Difficulty,
): LocalData {
  const previous = data.statistics[difficulty];
  const won = game.winner === HUMAN_PLAYER;
  // The winning player's turns are ceil(global turn / 2), whichever player started.
  const turns = Math.ceil(game.turn.number / 2);
  return {
    ...data,
    statistics: {
      ...data.statistics,
      [difficulty]: {
        wins: previous.wins + Number(won),
        losses: previous.losses + Number(!won),
        winningTurns: previous.winningTurns + (won ? turns : 0),
        bestWin: won ? Math.min(previous.bestWin ?? turns, turns) : previous.bestWin,
      },
    },
  };
}
