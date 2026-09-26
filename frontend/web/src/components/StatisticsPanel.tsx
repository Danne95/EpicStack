import type { Difficulty } from '../../../../shared/ai/difficulty';
import type { Statistics } from '../hooks/localData';
import { DIFFICULTIES } from '../hooks/localData';
import { difficultyLabel } from '../difficultyLabels';

export function StatisticsPanel({ statistics }: { statistics: Record<Difficulty, Statistics> }) {
  return (
    <section className="statistics-panel" aria-labelledby="statistics-title">
      <p className="eyebrow accent">Your record</p>
      <h2 id="statistics-title">Game record</h2>
      <div className="statistics-grid">
        {DIFFICULTIES.map((level) => {
          const s = statistics[level];
          const played = s.wins + s.losses;
          return (
            <section
              className="statistics-card"
              key={level}
              aria-label={`${difficultyLabel(level)} statistics`}
            >
              <h3>{difficultyLabel(level)}</h3>
              <dl>
                <div>
                  <dt>Games</dt>
                  <dd>{played}</dd>
                </div>
                <div>
                  <dt>Wins / losses</dt>
                  <dd>
                    {s.wins} / {s.losses}
                  </dd>
                </div>
                <div>
                  <dt>Win rate</dt>
                  <dd>{played ? `${Math.round((s.wins / played) * 100)}%` : '—'}</dd>
                </div>
                <div>
                  <dt>Average win</dt>
                  <dd>{s.wins ? `${(s.winningTurns / s.wins).toFixed(1)} rounds` : '—'}</dd>
                </div>
                <div>
                  <dt>Best win</dt>
                  <dd>{s.bestWin === null ? '—' : `${s.bestWin} rounds`}</dd>
                </div>
              </dl>
            </section>
          );
        })}
      </div>
    </section>
  );
}
