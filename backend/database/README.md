# Room storage

The Node API uses `PostgresRoomStore` when `DATABASE_URL` is configured. Without it, local
development uses `MemoryRoomStore`. Both run the same asynchronous `RoomService` operations.
Versioned migrations live under `supabase/migrations/`. The migration source is in
the public `EpicStack` repository; it contains no project credentials. `EpicStack-Mobile` does
not connect to the database.

The initial table stores:

- Unique room code/game ID, revision, created/updated timestamps.
- Host and guest credential hashes (never raw bearer tokens).
- Canonical GameState: towers, discard history, current player, turn phase/number,
  drawn brick when present, status, and winner. The JSON column contains
  `{ "version": 1, "state": GameState }`; waiting rooms have a SQL NULL.
- Created, updated, and expiry timestamps for room lifecycle cleanup.

Room reads and mutations are performed only by the authoritative Node API using its private
database connection. Supabase's Data API is not used for room access. The table enables RLS and
revokes API-role privileges as defense in depth; do not put a database connection string or
privileged API key in the web or mobile client. The initial connection uses the database owner
provided by Supabase's Connect panel. That role bypasses RLS; the API's seat-token and game checks
remain the authority. API-role revocations do not prevent the owner's SQL connection from working.

Each join/move uses one checked-out database connection and transaction. `SELECT ... FOR UPDATE`
locks the room before token, phase, seat, and revision validation. The update also checks the
original revision. Rejected actions roll back; only a committed update reaches the client.
Creation uses a transaction advisory lock to enforce the 500-room limit across API processes.
The decoder checks the version, tower values/uniqueness, phases, winner, discard count, and room
metadata before restoring state. Unsupported/corrupt records fail without being rewritten.

A room is an invitation-backed game session, not a live voice/video connection. Delete a room
after 24 hours without a successful join or move. Every accepted update refreshes `updated_at`
and `expires_at`. Reads, polling, and rejected commands do not extend the window. Expired rooms
immediately return `ROOM_NOT_FOUND`; physical cleanup runs at startup, on creation, and hourly.
Neither expiry nor cleanup records a forfeit or changes PvE statistics.

## Connect locally

1. Confirm the GitHub migration succeeded in Supabase and `public.pvp_rooms` exists.
2. Copy `backend/.env.example` to `backend/.env`. This file is ignored by Git.
3. In Supabase's **Connect** panel, select **Session pooler** and copy its Postgres URL.
   Set `DATABASE_URL="..."` in `backend/.env`, replacing the password placeholder with your
   database password (URL-encode special characters). No Supabase API key is needed.
4. The driver verifies TLS certificates for remote hosts. If the project requires its own CA,
   download the certificate from Supabase Database settings and set `DATABASE_CA_FILE` to its
   local path. Leave SSL options out of the URL so they cannot override verified TLS.
5. Run `npm run backend:start`. Startup checks the table before accepting requests. Then run
   `npm run dev` and play locally as before. Stop and restart the API to confirm rooms remain.

Use the direct Postgres URL if your network supports its address; Session pooler also works
with IPv4. The pool allows five connections per API process, with five-second connection and
statement limits. These leave headroom on small database plans and stay below the client's
eight-second request timeout. Idle connections close after thirty seconds. `NODE_ENV=production`
requires `DATABASE_URL`; a missing/broken database never silently falls back to memory.
`/health` checks storage readiness and returns 503 if unavailable. Shutdown closes the pool.

See [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres).
Hosted API configuration and enabling production multiplayer are the next roadmap steps.

## Database verification

The default suite covers service behavior, expiry, decoding, configuration, and transaction
commit/rollback handling. To exercise the SQL and real concurrent connections, apply the migration
to a dedicated test database, set `EPICSTACK_TEST_DATABASE_URL` in `backend/.env`, then run
`npm run test:database`. This is a separate, explicit command; it never falls back to `DATABASE_URL`.
It creates temporary room rows and deletes its own rows afterward. Normal expiry cleanup also
runs, so use a test project. It does not create/drop tables or apply migrations.
