import type { CSSProperties } from 'react';
import { Icon } from '../components/Icon';
import type { Difficulty } from '../../../../shared/ai/difficulty';
import { DifficultyPicker } from '../components/DifficultyPicker';

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
        <p className="eyebrow accent">A small game of big decisions</p>
        <h1 tabIndex={-1}>
          Find your
          <br />
          <em>order.</em>
        </h1>
        <p className="menu-intro">
          Ten bricks. One perfect stack.
          <br />
          Put your numbers in order before the computer does.
        </p>
        {canResume ? (
          <p className="resume-note">Your game is waiting. Pick up where you left off.</p>
        ) : (
          <DifficultyPicker value={difficulty} onChange={onDifficulty} />
        )}
        <div className="menu-actions">
          <button className="button primary" onClick={onPlay}>
            {canResume ? 'Resume game' : 'Play against computer'} <Icon name="arrow" />
          </button>
          <a className="text-link" href="#/how-to-play">
            How to play <Icon name="arrow" />
          </a>
        </div>
        <p className="small-note">No account. No rush. Just you and the numbers.</p>
      </div>
      <div className="menu-art" aria-hidden="true">
        <div className="art-caption">
          <span>THE ART OF</span>
          <span>GETTING THINGS IN ORDER</span>
        </div>
        <div className="display-stack">
          {[8, 24, 39, 57, 76, 94].map((number, index) => (
            <div
              key={number}
              className={`display-brick display-brick-${index}`}
              style={{ '--display-width': `${45 + number * 0.55}%` } as CSSProperties}
            >
              <span>EPICSTACK</span>
              <strong>{number}</strong>
              <Icon name="grip" />
            </div>
          ))}
        </div>
        <div className="art-footnote">
          <span>01 / SMALLEST</span>
          <span>100 / LARGEST</span>
        </div>
      </div>
    </main>
  );
}
