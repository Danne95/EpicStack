import type { Difficulty } from '../../../shared/ai/difficulty';

const LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Casual',
  hard: 'Hard',
  expert: 'Expert',
};

export function difficultyLabel(value: Difficulty): string {
  return LABELS[value];
}
