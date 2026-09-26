import { PVP_ENABLED } from '../network/pvpApi';
import type { CSSProperties } from 'react';
import type { Difficulty } from '../../../../shared/ai/difficulty';
import { DifficultyPicker } from '../components/DifficultyPicker';
import { Icon } from '../components/Icon';

interface Props {
  difficulty: Difficulty;
  onDifficulty: (value: Difficulty) => void;
  onPlay: () => void;
  canResume: boolean;
}

export function MenuScreen({ difficulty, onDifficulty, onPlay, canResume }: Props) {
  return (
    <main id="main" className="menu-screen">
      <div className="menu-copy">
        <h1 tabIndex={-1}>Ten bricks. One perfect stack.</h1>
        <p className="menu-intro">Put your numbers in order before the computer does.</p>
        {!canResume ? <DifficultyPicker value={difficulty} onChange={onDifficulty} /> : null}
        <div className="menu-actions">
          <button className="button primary" onClick={onPlay}>
            {canResume ? 'Resume game' : 'Play against computer'} <Icon name="arrow" />
          </button>
          {PVP_ENABLED ? (
            <a className="button secondary" href="#/multiplayer">
              Play a friend
            </a>
          ) : null}
        </div>
      </div>
      <div className="menu-art" aria-hidden="true">
        <div className="display-stack">
          {[8, 24, 39, 57, 76, 94].map((number, index) => (
            <div
              key={number}
              className={`display-brick display-brick-${index}`}
              style={{ '--display-width': `${45 + number * 0.55}%` } as CSSProperties}
            >
              <strong>{number}</strong>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
