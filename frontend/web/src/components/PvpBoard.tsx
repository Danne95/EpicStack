import { Tower } from './Tower';
import orderedSeal from '../../../../assets/branding/ordered-seal.svg';
import type { RoomView } from '../../../../shared/pvp/protocol';
interface Props {
  room: RoomView;
  selected: number | null;
  ready: boolean;
  onSelect: (position: number) => void;
  onMove: () => void;
}
export function PvpBoard({ room, selected, ready, onSelect, onMove }: Props) {
  const game = room.game;
  if (!game) return null;
  const you = room.playerId;
  const friend = you === 0 ? 1 : 0;
  const finished = game.status === 'won';
  const yourTurn = !finished && game.turn.playerId === you;
  const canSelect = ready && yourTurn && game.turn.phase === 'awaiting-placement';
  const drawn = game.turn.phase === 'awaiting-placement' ? game.turn.drawnBrick : null;
  const status = finished
    ? game.winner === you
      ? 'You found your order.'
      : 'Your friend takes this one.'
    : !ready
      ? 'Synchronizing the board…'
      : yourTurn
        ? drawn === null
          ? 'Your turn.'
          : 'Place this brick.'
        : 'Your friend’s turn.';
  return (
    <div className="game-layout">
      <Tower
        title="You"
        label="YOUR TOWER"
        tower={game.players[you].tower}
        interactive={canSelect}
        selected={selected}
        onSelect={onSelect}
        winner={finished && game.winner === you}
      />
      <section
        className={'turn-panel ' + (finished ? 'result-panel' : '')}
        aria-label="Turn controls"
      >
        <p className="eyebrow">
          {finished ? 'THE FINAL STACK' : 'ROUND ' + Math.ceil(game.turn.number / 2)}
        </p>
        <h2 role="status">{status}</h2>
        {finished ? (
          <>
            <div className="result-mark">
              <img src={orderedSeal} alt="" />
            </div>
            <p>
              {game.winner === you ? 'You win.' : 'Your friend wins.'} Ten bricks, perfectly in
              order.
            </p>
            <a className="button primary" href="#/">
              Back to menu
            </a>
          </>
        ) : (
          <>
            <div className="drawn-brick-row">
              <span className="brick-owner" aria-label={yourTurn ? 'Your brick' : 'Friend’s brick'}>
                <span aria-hidden="true">▶</span>
                {yourTurn ? 'You' : 'Friend'}
              </span>
              <div
                className={'drawn-brick ' + (drawn !== null ? 'has-value' : '')}
                aria-label={drawn === null ? 'No brick drawn' : 'Drawn brick ' + drawn}
              >
                <span>{drawn ?? '?'}</span>
                <small>{yourTurn ? 'YOUR BRICK' : 'FRIEND’S BRICK'}</small>
              </div>
            </div>
            <p className="placement-note">
              {canSelect && selected !== null
                ? 'Replace brick ' +
                  game.players[you].tower[selected] +
                  ' in position ' +
                  (selected + 1) +
                  '.'
                : yourTurn
                  ? 'Select a brick, then confirm your placement.'
                  : 'The board updates automatically.'}
            </p>
            {yourTurn ? (
              <button
                className="button primary turn-action"
                disabled={!(canSelect && selected !== null)}
                onClick={onMove}
              >
                Confirm replacement
              </button>
            ) : null}
          </>
        )}
      </section>
      <Tower
        title="Friend"
        label="YOUR OPPONENT"
        tower={game.players[friend].tower}
        winner={finished && game.winner === friend}
      />
    </div>
  );
}
