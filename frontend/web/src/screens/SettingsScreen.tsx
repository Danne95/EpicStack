import type { Difficulty } from '../../../../shared/ai/difficulty';
import { StatisticsPanel } from '../components/StatisticsPanel';
import type { LocalData } from '../hooks/localData';
import { DifficultyPicker } from '../components/DifficultyPicker';
import { difficultyLabel } from '../difficultyLabels';

export function SettingsScreen({
  difficulty,
  onDifficulty,
  muted,
  onMute,
  statistics,
}: {
  muted: boolean;
  onMute: () => void;
  statistics: LocalData['statistics'];
  difficulty: Difficulty;
  onDifficulty: (value: Difficulty) => void;
}) {
  return (
    <main id="main" className="reading-screen">
      <h1 tabIndex={-1}>Settings</h1>
      <DifficultyPicker value={difficulty} onChange={onDifficulty} />
      <p className="settings-note" role="status">
        Selected: <strong>{difficultyLabel(difficulty)}</strong>. Applies to your next game.
      </p>
      <div className="sound-setting">
        <div>
          <h2>Sound effects</h2>
        </div>
        <button className="button secondary" aria-pressed={muted} onClick={onMute}>
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      </div>
      <StatisticsPanel statistics={statistics} />
      <a href="#/" className="button secondary">
        Back to menu
      </a>
    </main>
  );
}
