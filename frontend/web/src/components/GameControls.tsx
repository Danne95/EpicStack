import { useState } from 'react';

interface Props {
  finished: boolean;
  onRestart: () => void;
  onNewGame: () => void;
  muted: boolean;
  onMute: () => void;
}
export function GameControls({ finished, onRestart, onNewGame, muted, onMute }: Props) {
  const [pending, setPending] = useState<'restart' | 'new' | null>(null);
  function request(action: 'restart' | 'new'): void {
    if (!finished) setPending(action);
    else if (action === 'restart') onRestart();
    else onNewGame();
  }
  return (
    <section className="game-controls" aria-label="Game options">
      <div className="control-buttons">
        <button className="button secondary" onClick={() => request('restart')}>
          Restart
        </button>
        <button className="button secondary" onClick={() => request('new')}>
          New game
        </button>
        <button className="button secondary" aria-pressed={muted} onClick={onMute}>
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      </div>
      {pending !== null ? (
        <div className="restart-prompt" role="group" aria-label="Confirm game change">
          <p>
            {pending === 'restart'
              ? 'Restore the opening towers? Future draws will be fresh.'
              : 'Deal a fresh game using your selected difficulty?'}{' '}
            This unfinished game won’t count in your record.
          </p>
          <button
            className="button primary"
            onClick={() => {
              if (pending === 'restart') onRestart();
              else onNewGame();
              setPending(null);
            }}
          >
            Yes, {pending === 'restart' ? 'restart' : 'new game'}
          </button>
          <button className="button secondary" onClick={() => setPending(null)}>
            Keep playing
          </button>
        </div>
      ) : null}
    </section>
  );
}
