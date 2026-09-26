# Room storage

Stage 9/10 use an in-memory Map in `RoomService`. Hosted Stage 11 stores rooms in Supabase
Postgres using versioned migrations under `supabase/migrations/`. The migration source is in
the public `EpicStack` repository; it contains no project credentials. `EpicStack-Mobile` does
not connect to the database.

The initial table stores:

- Unique room code/game ID, revision, created/updated timestamps.
- Host and guest credential hashes (never raw bearer tokens).
- Canonical GameState: towers, discard history, current player, turn phase/number,
  drawn brick when present, status, and winner.
- Created, updated, and expiry timestamps for room lifecycle cleanup.

Room reads and mutations are performed only by the authoritative Node API using its private
database connection. Supabase's Data API is not used for room access. The table enables RLS and
revokes API-role privileges as defense in depth; do not put a database connection string or
privileged API key in the web or mobile client.

Persist each accepted command atomically with a comparison against the submitted revision. A
room lock or conditional update must ensure only one command can update a given revision. Join
must claim the guest seat once. Validate restored data and schema versions before passing it to
the engine; arbitrary deserialized state is not supported. There is no finite in-game deck to
persist under the confirmed rolling rules.

A room is an invitation-backed game session, not a live voice/video connection. Delete a room
after 24 hours without a successful join or move. Every accepted update refreshes `updated_at`
and `expires_at`; cleanup removes rows whose `expires_at` has passed.
