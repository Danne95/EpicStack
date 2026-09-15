import type { Difficulty } from '../../../../shared/ai/difficulty';
import { StatisticsPanel } from '../components/StatisticsPanel';
import type { LocalData } from '../hooks/localData';
import { DifficultyPicker } from '../components/DifficultyPicker';

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
      <p className="eyebrow accent">Make it your game</p>
      <h1 tabIndex={-1}>Settings</h1>
      <p className="lead">A gentle introduction or a worthy opponent. You choose.</p>
      <DifficultyPicker value={difficulty} onChange={onDifficulty} />
      <p className="settings-note" role="status">
        Selected: <strong className="capitalize">{difficulty}</strong>. Applies to your next game.
      </p>
      <p className="muted">
        Your current game keeps its original difficulty. Preferences are saved in this browser.
      </p>
      <div className="sound-setting">
        <div>
          <h2>Sound effects</h2>
          <p className="muted">Quiet tones for draws, placements, and the final stack.</p>
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
