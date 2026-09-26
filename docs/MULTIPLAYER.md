# Local friend play — Stage 10

## Start and play

Open two terminals in EpicStack:

1. Run `npm run backend:start` in the first.
2. Run `npm run dev` in the second.
3. Open http://127.0.0.1:5173 and choose **Play a friend**.
4. Create a room, then copy its invitation link or ten-character code.
5. Open a separate tab by pasting the link, or use another browser profile. Join the room.
6. Each player's brick is drawn automatically on their turn. They select one of their own bricks
   and confirm. Turns and results
   update automatically, normally within 1.5 seconds.

Both local players must use the same web origin. Do not duplicate an existing player tab
or use an opener-created tab: browsers can copy session storage, which would copy its seat.
The backend binds to loopback and invitations work only on this computer. Internet play
requires a hosted backend; GitHub Pages cannot run the Node server. The friend-play button
is available only in development builds. Production web and Android remain PvE.

## Invitations and reconnect

Invitations contain only the room code, never player credentials. Joining requires an
explicit button press. Each player receives a private token kept in versioned sessionStorage.
Refreshing or returning from the menu restores the same seat in the same tab. Closing the
tab normally clears its storage; cross-device seat recovery is not included.

The controller polls the authoritative room every 1.5 seconds and bounds requests to eight
seconds. A disconnected client keeps its last visible board, disables moves, and retries.
After reconnecting it reads the current state. It never retries a submitted move automatically:
when an acknowledgement is lost, reading state determines whether the move succeeded.
Older responses cannot overwrite newer revisions or responses from a different session.
Leaving the screen stops polling and ignores outstanding responses.

Forget this room requires confirmation and removes this tab's credential. It does not
forfeit the game, free the server seat, or award a win. The other player can still see the
room but cannot finish without the missing player. Completed games show the correct win/loss
message to both players. To play again, forget the completed room and create a new invitation.
PvP results are separate from existing computer-game statistics.

If browser storage is unavailable, play works while the screen stays mounted, but refreshing
or leaving that screen loses the seat. A visible notice explains this limitation.
With default memory storage, a server restart loses all rooms and the client prompts for a new
room. Configured Postgres storage keeps rooms across restarts. Both modes expire rooms after
24 hours without a join or move; polling does not extend expiry. A create/join
request whose response is lost cannot recover its newly issued token; create a new room.

## Implementation boundaries

- shared/pvp/protocol.ts contains only platform-independent network data types.
- frontend/web/src/network/pvpApi.ts handles fetch, errors, timeouts, and invitation URLs.
- hooks/pvpController.ts owns session restoration, polling, revisions, and submitted actions.
- hooks/usePvp.ts connects the controller to React without putting rules in components.
- MultiplayerScreen and PvpBoard reuse existing tokens and Tower rendering, including
  value-proportional widths, keyboard controls, touch targets, and responsive layout.
- backend validates credentials, revisions, random draws, legal actions, and winners.

No accounts, chat, public matchmaking, leaderboards, or hosted services were added.
