import { Icon } from './Icon';
import type { CSSProperties } from 'react';
import type { Brick } from '../../../../shared/types/index';
import { MIN_BRICK_VALUE, MAX_BRICK_VALUE } from '../../../../shared/game/constants';

interface TowerProps {
  title: string;
  label: string;
  tower: readonly Brick[];
  interactive?: boolean;
  selected?: number | null;
  onSelect?: (position: number) => void;
  winner?: boolean;
}

export function Tower({
  title,
  label,
  tower,
  interactive = false,
  selected = null,
  onSelect,
  winner = false,
}: TowerProps) {
  return (
    <section className={`tower-panel ${winner ? 'winner' : ''}`} aria-label={`${title} tower`}>
      <div className="tower-heading">
        <div>
          <p className="eyebrow">{label}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <ol className="tower">
        {tower.map((brick, position) => (
          <li
            key={`${position}-${brick}`}
            style={
              {
                '--brick-ratio': (brick - MIN_BRICK_VALUE) / (MAX_BRICK_VALUE - MIN_BRICK_VALUE),
              } as CSSProperties
            }
          >
            <span className="slot-number" aria-hidden="true">
              {String(position + 1).padStart(2, '0')}
            </span>
            {onSelect ? (
              <button
                type="button"
                className={`brick ${selected === position ? 'selected' : ''}`}
                disabled={!interactive}
                aria-pressed={selected === position}
                aria-label={`Position ${position + 1}, brick ${brick}`}
                onClick={() => onSelect(position)}
              >
                <span className="brick-grip" aria-hidden="true">
                  <Icon name="grip" />
                </span>
                <span>{brick}</span>
                <span className="selection-mark" aria-hidden="true">
                  {selected === position ? <Icon name="check" /> : null}
                </span>
              </button>
            ) : (
              <div className="brick opponent-brick">
                <span className="brick-grip" aria-hidden="true">
                  <Icon name="grip" />
                </span>
                <span>{brick}</span>
                <span className="selection-mark" />
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
