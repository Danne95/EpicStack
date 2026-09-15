import orderedSeal from '../../../../assets/branding/ordered-seal.svg';
import { Icon } from '../components/Icon';
import { GameControls } from '../components/GameControls';
import { Tower } from '../components/Tower';
import { HUMAN_PLAYER, COMPUTER_PLAYER } from '../hooks/gameController';
import type { GameSession } from '../hooks/gameController';

interface Props {
  session: GameSession;
  onRestart: () => void;
  onNewGame: () => void;
  muted: boolean;
  onMute: () => void;
  onDraw: () => void;
  onSelect: (position: number) => void;
  onConfirm: () => void;
}

export function GameScreen({
  session,
  onDraw,
  onSelect,
  onConfirm,
  onRestart,
  onNewGame,
  muted,
  onMute,
}: Props) {
  const { game, selectedPosition, difficulty, error } = session;
  if (game === null)
    return (
      <main id="main" className="reading-screen">
        <h1 tabIndex={-1}>Your next stack awaits.</h1>
        <p className="lead">Start a game from the menu to take your first turn.</p>
        <a className="button primary" href="#/">
          Go to menu
        </a>
      </main>
    );
  const finished = game.status === 'won';
  const humanTurn = !finished && game.turn.playerId === HUMAN_PLAYER;
  const canDraw = humanTurn && game.turn.phase === 'awaiting-draw' && error === null;
  const canSelect = humanTurn && game.turn.phase === 'awaiting-placement' && error === null;
  const drawn = game.turn.phase === 'awaiting-placement' ? game.turn.drawnBrick : null;
  const selectedBrick =
    selectedPosition === null ? null : game.players[HUMAN_PLAYER].tower[selectedPosition];
  const status = finished
    ? game.winner === HUMAN_PLAYER
      ? 'You found your order.'
      : 'The computer takes this one.'
    : humanTurn
      ? canDraw
        ? 'Your turn. Draw a brick.'
        : 'Choose a place for your brick.'
      : 'Computer’s turn.';

  return (
    <main id="main" className="game-screen">
      <div className="game-topline">
        <div>
          <p className="eyebrow">A little strategy. One brick at a time.</p>
          <h1 tabIndex={-1}>The board</h1>
        </div>
        <div className="game-meta">
          <span className="capitalize">{difficulty}</span>
          <span>Turn {game.turn.number}</span>
        </div>
      </div>
      {error !== null ? (
        <p className="error-message" role="alert">
          {error} <a href="#/">Menu</a>
        </p>
      ) : null}
      <div className="game-layout">
        <Tower
          title="You"
          label="YOUR TOWER"
          tower={game.players[0].tower}
          interactive={canSelect}
          selected={selectedPosition}
          onSelect={onSelect}
          winner={finished && game.winner === HUMAN_PLAYER}
        />
        <section
          className={`turn-panel ${finished ? 'result-panel' : !humanTurn ? 'thinking' : ''}`}
          aria-label="Turn controls"
        >
          <p className="eyebrow">
            {finished ? 'THE FINAL STACK' : humanTurn ? 'YOUR MOVE' : 'OPPONENT’S MOVE'}
          </p>
          <h2 role="status" aria-live="polite">
            {status}
          </h2>
          {finished ? (
            <>
              <div className="result-mark" aria-hidden="true">
                <img src={orderedSeal} alt="" />
              </div>
              <p>
                Ten bricks, perfectly in order.
                <br />A game well played.
              </p>
              <a href="#/" className="button primary">
                Back to menu
              </a>
            </>
          ) : (
            <>
              <div
                className={`drawn-brick ${drawn !== null ? 'has-value' : ''}`}
                aria-label={drawn === null ? 'No brick drawn' : `Drawn brick ${drawn}`}
              >
                <span>{drawn ?? '?'}</span>
                <small>{drawn === null ? 'YOUR NEXT NUMBER' : 'YOUR DRAWN BRICK'}</small>
              </div>
              <p className="placement-note">
                {selectedPosition !== null ? (
                  <>
                    Replace <strong>{selectedBrick}</strong> with <strong>{drawn}</strong> in
                    position {selectedPosition + 1}.
                  </>
                ) : humanTurn ? (
                  canDraw ? (
                    'A fresh number. A new possibility.'
                  ) : (
                    'Select a brick in your tower to replace.'
                  )
                ) : (
                  'The computer is choosing a placement.'
                )}
              </p>
              <button
                className="button primary turn-action"
                disabled={!(canDraw || (canSelect && selectedPosition !== null))}
                onClick={canDraw ? onDraw : onConfirm}
              >
                <Icon name={canDraw ? 'draw' : 'check'} />
                {canDraw ? 'Draw a brick' : humanTurn ? 'Confirm replacement' : 'Computer’s turn'}
              </button>
              <p className="turn-hint">
                Smallest at the top.
                <br />
                Largest at the bottom.
              </p>
            </>
          )}
          {session.lastComputerMove !== null ? (
            <p className="last-move">{session.lastComputerMove}</p>
          ) : null}
        </section>
        <Tower
          title="Computer"
          label="YOUR OPPONENT"
          tower={game.players[1].tower}
          winner={finished && game.winner === COMPUTER_PLAYER}
        />
      </div>
      <GameControls
        finished={finished}
        onRestart={onRestart}
        onNewGame={onNewGame}
        muted={muted}
        onMute={onMute}
      />
      <div className="board-footer">
        <a href="#/how-to-play">Need a refresher? Read the rules</a>
        <span>Take your time. There’s no clock.</span>
      </div>
    </main>
  );
}
