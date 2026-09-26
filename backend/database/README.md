# Room storage

Stage 9 uses an in-memory Map in RoomService. No database dependency is installed.
A future durable store should retain:

- Unique room code/game ID, revision, created/updated timestamps.
- Host and guest credential hashes (never raw bearer tokens).
- Canonical GameState: towers, discard history, current player, turn phase/number,
  drawn brick when present, status, and winner.

Persist each accepted command atomically with a comparison against the submitted revision.
Only one command may update a given revision. Validate restored data and schema versions
before passing it to the engine; arbitrary deserialized state is not currently supported.
There is no finite in-game deck to persist under the confirmed rolling rules.
