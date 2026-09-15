import type { Difficulty } from '../../../../shared/ai/difficulty';
import type { Statistics } from '../hooks/localData';
import { DIFFICULTIES } from '../hooks/localData';

export function StatisticsPanel({ statistics }: { statistics: Record<Difficulty, Statistics> }) {
  const games = DIFFICULTIES.reduce(
    (total, level) => total + statistics[level].wins + statistics[level].losses,
    0,
  );
  return (
    <section className="statistics-panel" aria-labelledby="statistics-title">
      <p className="eyebrow accent">Your record</p>
      <h2 id="statistics-title">Every stack tells a story.</h2>
      <p>
        {games} finished {games === 1 ? 'game' : 'games'}. Restarted and unfinished games don’t
        count.
      </p>
      <div className="statistics-grid">
        {DIFFICULTIES.map((level) => {
          const s = statistics[level];
          const played = s.wins + s.losses;
          return (
            <section className="statistics-card" key={level} aria-label={`${level} statistics`}>
              <h3 className="capitalize">{level}</h3>
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
                  <dd>{s.wins ? `${(s.winningTurns / s.wins).toFixed(1)} turns` : '—'}</dd>
                </div>
                <div>
                  <dt>Best win</dt>
                  <dd>{s.bestWin === null ? '—' : `${s.bestWin} turns`}</dd>
                </div>
              </dl>
            </section>
          );
        })}
      </div>
      <p className="small-note">Win speed counts your turns only. Saved in this browser.</p>
    </section>
  );
}
