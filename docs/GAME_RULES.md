# Game rules

This document is authoritative. The Stage 1 decisions below were confirmed with the user
on 2026-09-13. They replace the original finite shared draw-deck proposal.

## Bricks and towers

- Exactly two players, each with ten bricks in a tower.
- Brick values are integers from 1 through 100, inclusive.
- All twenty values currently in the two towers are unique.
- Tower arrays run top to bottom; the goal is strictly increasing values from smallest
  at the top to largest at the bottom. Gaps between values are allowed.

## Starting a game

1. Shuffle the complete unique 1–100 deck using caller-supplied randomness.
2. Deal from its first entry, alternating player one, player two, player one, and so on.
   Fill each tower from top to bottom until both contain ten bricks.
3. If either tower is already ascending, redeal both from a fresh shuffle. Neither player
   receives an initial win, and two ascending towers do not create a draw.
4. Once both towers are non-winning, choose the starting player randomly with equal chance.
   Start turn number one in the draw phase.

The remaining eighty entries are not retained as a draw pile. The deck exists only to produce
initial unique towers. Tests may supply a complete ordered initial deck to bypass its first
shuffle. An initially winning supplied deck still triggers redealing, using the random source.

To prevent a broken or pathological random source from hanging initialization, the engine
throws `INITIALIZATION_FAILED` after 100 unsuccessful deals. This creates no game, winner,
or draw; it is an explicit initialization error, not a new gameplay outcome.

## Each turn

1. **Draw/roll:** randomly select one value absent from both towers. Each of the eighty
   eligible values has equal probability when the random source is uniform. No already
   occupied value can be rolled, and a player cannot roll twice in one turn.
2. **Replace:** choose any one of the current player's ten positions and replace its brick
   with the rolled value. The removed value leaves the tower and is recorded in discard history.
3. **Check victory:** if the resulting tower is strictly ascending, that player wins immediately.
4. **End turn:** otherwise advance to the other player and increment the engine turn number.
   The web interface groups each pair of player turns as a displayed round.

There is no finite draw pile, exhaustion rule, reshuffle during play, or automatic turn limit.
A removed value becomes eligible for subsequent rolls, including the next player's turn.
Discard history is a record of removals, not a reserved inventory: a historical value may later
be active again, and the same value may occur multiple times in that history.

The twenty tower values remain unique. While awaiting placement, the drawn value is a distinct
twenty-first active value. After replacement there are twenty active values again.

No skipping, discarding a rolled brick without placing it, choosing a discard, rearranging
existing bricks, or acting on the other player's tower is allowed. Difficulty must never
change these rules or give one player favorable rolls.

## Turn and victory semantics

The engine enforces `awaiting-draw` → `awaiting-placement` → `awaiting-end` → the next
player's `awaiting-draw`. A winning replacement goes directly to `complete` with status `won`.
There is no extra end-turn call after victory. All mutation operations reject a completed game.

Player IDs are `0` and `1`. Positions are integers `0` (top) through `9` (bottom). A turn number
counts individual player turns, not pairs of turns. The winning turn retains its number and
acting player. `getCurrentPlayer` returns that player even in a completed game; it does not
imply that another action is allowed.

## Engine and verification

Types include `GameState`, `PlayerState`, `Brick`, `Deck`, `Turn`, and `GameStatus`. Public
operations are `createGame`, `drawBrick`, `replaceBrick`, `endTurn`, `checkWin`,
`getCurrentPlayer`, and `getLegalPlacements`. See `ARCHITECTURE.md` for signatures and errors.
Rules run without a UI, and operations return new state snapshots without modifying their inputs.

Stage 1 tests cover:

- A unique complete initial deck, deterministic shuffling, and invalid deck/random inputs.
- Ten bricks per tower, alternating deal order, random starting player, and initial redeals.
- Uniform mapping of random intervals onto every eligible roll value.
- Exclusion of both towers' values and immediate reuse of removed values.
- Correct replacement, discard recording, actor validation, and turn progression.
- Strictly ascending wins, almost-sorted losses, invalid towers, and no moves after victory.
- Reproducible 200-turn simulations preserving uniqueness, counts, and immutable inputs.

All Stage 1 rule questions are resolved. Do not silently change these decisions in later stages.
