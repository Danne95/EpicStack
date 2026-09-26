import { useState } from 'react';
import { PvpBoard } from '../components/PvpBoard';
import { usePvp } from '../hooks/usePvp';
import { PVP_ENABLED } from '../network/pvpApi';
import { invitationUrl, inviteCode } from '../network/pvpProtocol';

export function MultiplayerScreen() {
  if (!PVP_ENABLED)
    return (
      <main id="main" className="reading-screen">
        <h1 tabIndex={-1}>Friend play is coming.</h1>
        <p>
          The local multiplayer version is ready for development. Online hosting is not available
          yet.
        </p>
        <a className="button primary" href="#/">
          Play against computer
        </a>
      </main>
    );
  return <LocalMultiplayer />;
}
function LocalMultiplayer() {
  const { controller, state } = usePvp();
  const [code, setCode] = useState(() => inviteCode(window.location.hash));
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const { room, pending, connected, error, selected, storageAvailable } = state;
  const link = room ? invitationUrl(window.location.href, room.code) : '';
  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
      document.querySelector<HTMLInputElement>('#invitation-link')?.select();
    }
  }
  return (
    <main id="main" className="game-screen multiplayer-screen">
      <div className="game-topline">
        <div>
          <p className="eyebrow">Same board. Friendly rivalry.</p>
          <h1 tabIndex={-1}>Play a friend</h1>
        </div>
        <a href="#/">Back to menu</a>
      </div>
      {!storageAvailable ? (
        <p className="storage-notice" role="status">
          Storage is unavailable. Keep this tab open to keep your seat.
        </p>
      ) : null}
      {error ? (
        <p className="error-message" role="alert">
          {error}
        </p>
      ) : null}
      {!room ? (
        <div className="pvp-lobby">
          <section className="pvp-card">
            <p className="eyebrow">MAKE THE FIRST MOVE</p>
            <h2>Invite a friend</h2>
            <p>
              Create a room and share its link or code. Your game begins when your friend joins.
            </p>
            <button
              className="button primary"
              disabled={pending}
              onClick={() => {
                void controller.open();
              }}
            >
              Create room
            </button>
          </section>
          <section className="pvp-card">
            <p className="eyebrow">HAVE AN INVITATION?</p>
            <h2>Join their table</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void controller.open(code.trim().toUpperCase());
              }}
            >
              <label htmlFor="room-code">Room code</label>
              <input
                id="room-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                maxLength={10}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="10-character code"
                required
              />
              <button className="button primary" disabled={pending}>
                Join room
              </button>
            </form>
          </section>
          <p className="small-note pvp-local-note">
            Local preview: use two separate browser tabs on this computer. Internet invitations need
            a hosted backend.
          </p>
        </div>
      ) : (
        <>
          <div className="pvp-room-bar">
            <p>
              Room <strong>{room.code}</strong>
            </p>
            <span role="status">
              {pending
                ? 'Sending move…'
                : connected
                  ? room.status === 'waiting'
                    ? 'Waiting for your friend'
                    : 'Connected'
                  : 'Reconnecting…'}
            </span>
          </div>
          {room.status === 'waiting' ? (
            <section className="pvp-card pvp-invite">
              <h2>Your table is ready.</h2>
              <p>Send this invitation to your friend. Keep this tab open while they join.</p>
              <label htmlFor="invitation-link">Invitation link</label>
              <input
                id="invitation-link"
                value={link}
                readOnly
                onFocus={(event) => event.target.select()}
              />
              <button
                className="button primary"
                onClick={() => {
                  void copyLink();
                }}
              >
                {copied ? 'Link copied' : 'Copy invitation link'}
              </button>
              <p className="small-note">
                This local link works on this computer. Your seat stays private; only the room code
                is shared.
              </p>
            </section>
          ) : (
            <PvpBoard
              room={room}
              selected={selected}
              ready={connected && !pending}
              onSelect={controller.select}
              onMove={() => {
                void controller.move('replace');
              }}
            />
          )}
          <div className="pvp-room-actions">
            <p className="small-note">
              Refresh this tab to reconnect. Going to the menu keeps your seat. PvP results do not
              change your computer-game statistics.
            </p>
            {confirmLeave ? (
              <div>
                <p>Forget this seat? You won’t be able to rejoin this match from this tab.</p>
                <button
                  className="button secondary"
                  onClick={() => {
                    controller.forget();
                    setConfirmLeave(false);
                    setCopied(false);
                    setCode('');
                    window.location.hash = '/multiplayer';
                  }}
                >
                  Forget seat
                </button>{' '}
                <button className="button secondary" onClick={() => setConfirmLeave(false)}>
                  Keep playing
                </button>
              </div>
            ) : (
              <button
                className="button secondary"
                disabled={pending}
                onClick={() => setConfirmLeave(true)}
              >
                {room.status === 'won' ? 'Start another room' : 'Forget this room'}
              </button>
            )}
          </div>
        </>
      )}
    </main>
  );
}
