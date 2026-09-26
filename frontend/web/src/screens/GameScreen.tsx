import orderedSeal from '../../../../assets/branding/ordered-seal.svg';
import { GameControls } from '../components/GameControls';
import { Tower } from '../components/Tower';
import { HUMAN_PLAYER, COMPUTER_PLAYER } from '../hooks/gameController';
import type { GameSession } from '../hooks/gameController';
import { difficultyLabel } from '../difficultyLabels';

interface Props {
  session: GameSession;
  onRestart: () => void;
  onNewGame: () => void;
  onSelect: (position: number) => void;
  onConfirm: () => void;
}

export function GameScreen({ session, onSelect, onConfirm, onRestart, onNewGame }: Props) {
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
  const canSelect = humanTurn && game.turn.phase === 'awaiting-placement' && error === null;
  const drawn = game.turn.phase === 'awaiting-placement' ? game.turn.drawnBrick : null;
  const selectedBrick =
    selectedPosition === null ? null : game.players[HUMAN_PLAYER].tower[selectedPosition];
  const status = finished
    ? game.winner === HUMAN_PLAYER
      ? 'You found your order.'
      : 'The computer takes this one.'
    : humanTurn
      ? 'Place this brick.'
      : 'Computer’s turn.';

  return (
    <main id="main" className="game-screen">
      <h1 className="visually-hidden" tabIndex={-1}>
        Game
      </h1>
      <div className="game-topline">
        <div className="game-meta">
          <span>{difficultyLabel(difficulty)}</span>
          <span>Round {Math.ceil(game.turn.number / 2)}</span>
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
              <div className="drawn-brick-row">
                <span
                  className="brick-owner"
                  aria-label={humanTurn ? 'Your brick' : 'Computer’s brick'}
                >
                  <span aria-hidden="true">▶</span>
                  {humanTurn ? 'You' : 'Computer'}
                </span>
                <div
                  className={`drawn-brick ${drawn !== null ? 'has-value' : ''}`}
                  aria-label={drawn === null ? 'No brick drawn' : `Drawn brick ${drawn}`}
                >
                  <span>{drawn ?? '?'}</span>
                  <small>{humanTurn ? 'YOUR BRICK' : 'COMPUTER’S BRICK'}</small>
                </div>
              </div>
              <p className="placement-note">
                {selectedPosition !== null ? (
                  <>
                    Replace <strong>{selectedBrick}</strong> with <strong>{drawn}</strong> in
                    position {selectedPosition + 1}.
                  </>
                ) : humanTurn ? (
                  'Select a brick to replace.'
                ) : (
                  'The computer is choosing a placement.'
                )}
              </p>
              {humanTurn ? (
                <button
                  className="button primary turn-action"
                  disabled={!(canSelect && selectedPosition !== null)}
                  onClick={onConfirm}
                >
                  Confirm replacement
                </button>
              ) : null}
            </>
          )}
        </section>
        <Tower
          title="Computer"
          label="YOUR OPPONENT"
          tower={game.players[1].tower}
          winner={finished && game.winner === COMPUTER_PLAYER}
        />
      </div>
      <GameControls finished={finished} onRestart={onRestart} onNewGame={onNewGame} />
    </main>
  );
}
