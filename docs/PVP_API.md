# Local PvP API — Stage 9

Run `npm run backend:start` from the public repository. The server binds only to
`127.0.0.1:8787`; set PORT to change the port. Stop with Ctrl+C. No service account,
database installation is required for memory mode. Set `DATABASE_URL` in `backend/.env` for
Supabase persistence; see [room storage setup](../backend/database/README.md). This is still a local developer API;
Stage 10 adds a local browser interface. See [multiplayer usage](MULTIPLAYER.md).

## Protocol

Requests and responses use JSON. POST requests require Content-Type: application/json.
Create and join return `{ token, room }`; reads and moves return `{ room }`.
Save each player's token privately. All room reads and moves require
`Authorization: Bearer <token>`. The room code invites a guest; it is not a player credential.

| Method | Path              | Body                                         | Behavior                                            |
| ------ | ----------------- | -------------------------------------------- | --------------------------------------------------- |
| GET    | /health           | —                                            | Reports process availability                        |
| POST   | /rooms            | {}                                           | Creates waiting room and host token (201)           |
| POST   | /rooms/CODE/join  | {}                                           | Seats guest, deals towers, randomly chooses starter |
| GET    | /rooms/CODE       | —                                            | Returns authenticated player's current snapshot     |
| POST   | /rooms/CODE/moves | {"type":"draw","revision":1}                 | Server rolls the brick                              |
| POST   | /rooms/CODE/moves | {"type":"replace","position":0,"revision":2} | Replaces brick and ends non-winning turn            |

Room codes are ten uppercase hexadecimal characters. Tokens contain 32 random bytes;
only SHA-256 token hashes are stored. A snapshot includes code, revision, playerId,
playersJoined, status, game, createdAt, and updatedAt. Both towers are visible, matching
existing gameplay. No credentials appear in snapshots. Game is null while waiting.

Revision begins at zero and increases once on joining or each accepted move. Use the
revision from the latest snapshot; concurrent or repeated commands with an old revision
receive STALE_REVISION (409). Fetch the snapshot before deciding the next action.
A network failure after a successful command may leave the client unsure whether it was
accepted; read current state instead of blindly retrying. There is no automatic retry layer.

Identity comes from the token, never a submitted playerId. Clients cannot supply bricks,
towers, randomness, or winners. The shared engine validates turn ownership, phase,
positions, and victory. A winning replacement preserves the completed winning state;
further actions are rejected by the engine. No separate multiplayer rules exist.

Errors use {"error":"CODE"}: 400 malformed commands, 401 invalid credentials, 403 unapproved browser
Origin header rejected, 404 unknown room/route, 409 stale revision/full room/rule violation,
413 body above 1 KiB, 415 non-JSON content, and 503 room capacity reached. Rejections do
not change game state or revision. Unknown errors return a generic 500 response.

## Scope and limitations

Both storage modes cap active rooms at 500. Memory mode loses rooms on restart; Postgres mode
retains rooms and uses row locks plus revision checks to serialize commands across API processes.
Rooms expire after 24 hours without an accepted join or move. Reads/rejected moves do not renew
expiry. Expired rooms return `ROOM_NOT_FOUND`, and startup, creation, and hourly sweeps remove
their rows. Discard history grows with played turns, as in the canonical engine.

The server uses cryptographic randomness for room codes, credentials, and engine rolls.
Tests inject predictable game randomness. Request/header timeouts are ten seconds and
bodies are limited to 1 KiB. No CORS access is enabled. Browser Origin headers are allowed only for the local Vite
origins http://127.0.0.1:5173 and http://localhost:5173. Vite proxies /api to this server.
Durable storage and 24-hour room expiry are implemented. Before exposing this server publicly, add request rate
limits, HTTPS deployment, and an explicit allowed browser origin policy. Do not expose
this local prototype through a tunnel as a production service.

`GET /health` checks storage and returns 503 with `STORAGE_UNAVAILABLE` if the database is
unreachable or its schema is missing. Other unexpected storage failures return a generic 500
without database details. An ambiguous command response still requires reading current state;
the backend does not replay moves automatically.

PvE makes no API requests and remains playable without this backend. GitHub Pages still
hosts only the static web build. Android uses its pinned public game version independently.
