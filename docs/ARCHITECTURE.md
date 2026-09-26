# Architecture

## Initial release

EpicStack is a browser-only PvE game built with TypeScript, React, Vite, and plain CSS.
Vitest tests the shared engine without rendering UI. ESLint, Prettier, and strict TypeScript
provide quality checks. No backend or state-management framework is needed.

```text
UI (components/screens)
  ↓
Game Controller (web hooks)
  ↓
Shared Game Engine
  ↓
Game State
```

The controller sequences draw, selection, confirmation, AI turns, and presentation effects.
The engine validates moves and returns state updates. UI reflects state; it never decides
whether a move wins or is legal. Animation timing cannot determine game outcomes.

All four AI levels consume legal moves from the engine and score candidate placements. They
do not mutate the game, inspect future game rolls, or bypass engine validation. Easy's optional
choice among close moves uses a separate caller-supplied decision random stream.

## Module responsibilities

- `shared/game/gameState.ts`: initialization and immutable state transitions.
- `shared/game/gameRules.ts`: turn phases, legal actions, and move validation.
- `shared/game/deck.ts`: unique initial deck construction, validation, and injected shuffling.
- `shared/game/initialDeal.ts`: alternating initial deal and redealing ascending towers.
- `shared/game/rollBrick.ts`: uniform selection from values absent from both towers.
- `shared/game/winCondition.ts`: strictly ascending tower detection.
- `shared/game/errors.ts`: stable rule error codes.
- `shared/game/constants.ts`: named game dimensions and initialization retry bound.
- `shared/game/index.ts`: public engine entry point.
- `shared/types/`: platform-independent domain types.
- `shared/ai/evaluator.ts`: candidate evaluation and move selection.
- `shared/ai/scoring.ts`: named, explainable scoring components.
- `shared/ai/weights.ts`: Medium's retained baseline weights and the shared score combiner.
- `shared/ai/types.ts`: move evaluations and numeric score breakdowns.
- `shared/ai/index.ts`: public AI entry point.
- `shared/ai/difficulty.ts`: immutable Easy/Medium/Hard/Expert profiles and bounded validation.
- `shared/ai/ranges.ts`: feasible retained-brick analysis and opponent-aware numeric capacity.
- `shared/ai/forecast.ts`: bounded projections of possible future rolls with the opponent fixed.
- `shared/ai/strategies/`: focused strategies only when an implemented difficulty needs them.
- `frontend/web/src/components/`: reusable presentation pieces.
- `frontend/web/src/screens/`: menu, game, settings, and instructions in Stage 4.
- `frontend/web/src/hooks/`: controller and browser integration.
- `frontend/web/src/styles/`: custom CSS tokens, responsive layouts, and effects.
- `assets/`: original visual and audio files; imported by the presentation layer.

The engine, baseline AI, and difficulties were implemented in Stages 1, 2, and 3 respectively.
The web presentation and controller are implemented in Stage 4. Avoid empty implementation files until their stage;
`.gitkeep` files preserve scaffold directories.

## Engine API and state

Import operations from `shared/game/index.ts` and types from `shared/types/index.ts`.

| Operation                                 | Contract                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `createGame({ random, initialDeck? })`    | Deal two non-winning towers, then randomly choose the starter.                      |
| `drawBrick(state, playerId, random)`      | Roll a value absent from both towers; advance to placement.                         |
| `replaceBrick(state, playerId, position)` | Replace one brick; record its removal; resolve victory immediately.                 |
| `endTurn(state, playerId)`                | Advance a completed non-winning turn to the other player.                           |
| `checkWin(tower)`                         | Check ten valid, strictly ascending values.                                         |
| `getCurrentPlayer(state)`                 | Read the player identified by the current or final turn.                            |
| `getLegalPlacements(state, playerId)`     | Return positions 0–9 during that player's placement phase, otherwise an empty list. |

`GameState` is a readonly discriminated union of playing and won states. Turn phases control
when a drawn brick exists; a won state always has a winner and a completed turn. State contains
only data, not callbacks, clocks, or platform handles. Arrays may be structurally shared between
snapshots; callers must respect their readonly types. Transitions also work with frozen inputs.
Use states produced by the engine; arbitrary deserialized state validation is not implemented.

The `Deck` type represents only the initial shuffled 1–100 sequence. No future deck is stored
in game state. Each roll samples the eighty values absent from both towers, and `discardedBricks`
records historical removals without excluding them from future rolls. Its entries can repeat.

The caller supplies a `RandomSource` returning finite values in `[0, 1)`. Initial shuffling uses
Fisher–Yates, initial redeals consume further shuffles, and the starter is chosen after an accepted
deal. Each in-game roll consumes exactly one random value after action validation. Map it to an
index in the ascending eligible-value list, avoiding potentially unbounded reroll loops.
Identical initial inputs and random sequences produce identical games; replay requires those
inputs in addition to the state. The caller may use `Math.random` for normal local play.

Invalid actions throw `GameRuleError` with a stable `code`: `GAME_OVER`, `NOT_CURRENT_PLAYER`,
`INVALID_TURN_PHASE`, or `INVALID_POSITION`. Invalid setup/random inputs use `INVALID_DECK`,
`INVALID_RANDOM_VALUE`, or `INITIALIZATION_FAILED`. `NO_AVAILABLE_BRICKS` guards the standalone
roller against an empty pool; an engine-created game always has eighty candidates. Rejected
actions leave state unchanged; action validation happens before consuming roll randomness.

Initialization has a 100-deal limit to report pathological random sources rather than hang.
This is not a gameplay turn limit or draw result. No game is returned when initialization fails.

Example turn from a TypeScript caller at the project root:

```ts
import { createGame, drawBrick, replaceBrick, endTurn } from './shared/game/index';
import type { GameState } from './shared/types/index';

let state: GameState = createGame({ random: Math.random });
const playerId = state.turn.playerId;
state = drawBrick(state, playerId, Math.random);
state = replaceBrick(state, playerId, 0); // Replace the top position for this example.
if (state.status === 'playing') {
  state = endTurn(state, playerId);
}
```

## Dependency enforcement

`shared/ai/index.ts` exports `chooseMove`, `evaluateMoves`, and their result types. AI depends
on the engine; the engine never imports AI. Evaluation obtains legal positions from the engine,
simulates each using `replaceBrick`, and uses the engine's `getAvailableBricks` to estimate
future opportunities under the confirmed rolling rule. The roller uses that same eligibility
helper, preventing duplicate definitions of which numbers may appear.

The AI returns a decision with six numeric reasons rather than applying a turn. Controllers
remain responsible for drawing, applying the chosen position, and ending non-winning turns.
No additional state-management layer, dependency, or asynchronous runtime is required.
See `AI_DESIGN.md` for all formulas, weights, information boundaries, and approximation limits.

`evaluateMoves(state, playerId, profile?)` defaults to Medium. `chooseMove` takes an optional
`{ profile, random }` object; UI code can map a selected `Difficulty` key through
`DIFFICULTY_PROFILES`. Evaluation branches on numeric controls, not named levels. Profile
validation bounds future roll projections to eighty values and keeps all weights finite.
No difficulty modifies game rules, active values, or the game-roll random source.

Hard analyzes which existing bricks can remain in a feasible ascending completion, including
capacity lost to the visible opponent tower. Expert additionally projects all possible values
for one hypothetical roll, with a fixed operation budget. These are mathematical tower scores,
not simulated committed turns: the opponent's intervening action is not predicted. The
eventual chosen placement is always applied through the same engine operation as a human's.

Keep Easy's decision generator separate from the game's roll generator. Medium/Hard/Expert
do not consume decision randomness. A missing required decision source is an explicit error;
there is no hidden platform-global random fallback or time-dependent search cutoff.

The shared source is checked separately with only the ECMAScript standard library and no
ambient platform types. Web sources receive DOM types; tooling receives Node types.
ESLint blocks React, native, Node-prefixed, presentation, asset, and backend imports in shared
files, and backend imports in web presentation. Reviews must also reject indirect platform
dependencies; lint is a guardrail rather than a complete dependency graph validator.

Game randomness is supplied through explicit inputs. Shared modules must not access browser
storage, timers, network, rendering, or global mutable state. Persistence, audio, and timing
belong to the platform layer when their stages arrive.

## Clients and repository visibility

Updated 2026-09-16: EpicStack stays public. EpicStack-Mobile is a separate private repository
for Android. iPhone is deferred; no iOS project or dependencies are created.

```text
EpicStack/                         PUBLIC
├── frontend/web/                  Canonical React interface
├── shared/game/                   Canonical rules and state
├── shared/ai/                     Canonical AI
├── shared/types/
├── assets/                        Canonical common assets
└── docs/

EpicStack-Mobile/                  PRIVATE
├── game/                          Git submodule pinned to a public EpicStack commit
├── android/                       Capacitor Android integration
├── scripts/                       Build helpers
├── capacitor.config.json
├── package.json
└── README.md
```

The user chose to reuse the existing interface. Capacitor packages the production web build
and runs the same TypeScript engine and AI within Android WebView. No separately maintained
mobile interface or copied rule implementation is needed. The submodule is a pinned upstream
dependency, not a fork: edit canonical game code in EpicStack, publish it, then deliberately
advance the mobile submodule and rebuild.

The public build:android command emits the same game without a service worker. Android
bundles all web assets, so offline play does not require a first online visit and stale web
caches cannot override an APK update. Capacitor dependencies stay in the private repository.
No hosted server URL is used by the Android app.

Web deployment and Android APK releases remain independent. Local statistics belong to the
installation and do not sync with the website. Signing keys remain outside Git. The initial
debug application ID is io.github.danne95.epicstack; review it before any store release.

PvP Client → Authoritative Backend → Shared Game Engine

Stage 9 adds a local backend that validates actions against the same engine and owns
authoritative state. Its HTTP contract is described below; no database dependency is added.
PvE must work even if all future backend services are unavailable.

## Stage 6 presentation and persistence

Restart reuses the initial immutable game snapshot and its difficulty, including the original
starting player; subsequent draws are fresh. New game calls normal initialization with the
selected preference. Both actions ask inline before abandoning an unfinished game.

LocalData and localStore own versioned browser data under epicstack.local.v1. A per-app
store exposes snapshots through React useSyncExternalStore. Preferences and aggregate
statistics save on changes; invalid data resets safely and blocked storage retains a usable
in-memory session with a notice. Clearing browser data removes the record. Concurrent-tab
merging and active-match restoration are outside this stage.

Only completed games count, once per immutable winning state (a WeakSet guards effect replay).
Each difficulty stores wins, losses, total human turns across wins, and the fewest turns in
a win. Games played is wins plus losses; win rate and average derive from those totals.
A winning human has ceil(global winning turn / 2) personal turns regardless of starter.
Restarting, leaving, or refreshing an unfinished match adds no result. Replaying a completed
opening is a new attempt and can count another result.

useSound observes state changes and generates local Web Audio tones after a user gesture.
It does not change game state. Mute closes the context; missing audio support leaves play
available. CSS animates newly rendered bricks and completed results, with reduced-motion
overrides. All changes are confined to the web presentation layer.

## Delivery and offline behavior

The web client uses hash navigation for menu, game, settings, and instructions, avoiding
server route requirements on static hosting. App-level state preserves a match while navigating
between screens. Settings apply to the next match. Refreshing discards the in-memory session;
the active match is not saved. Stage 6 stores preferences and completed-game statistics locally.

`hooks/gameController.ts` is a pure reducer coordinating the shared engine and AI. It guards
UI actions, retains selection until explicit confirmation, and rejects stale computer results
by expected-state identity. `useGame.ts` supplies browser random samples before dispatch,
keeping reducer replay deterministic under React Strict Mode. Computer work is scheduled on
a 550ms timer so the thinking state is perceptible, and cancelled when the game screen is left
or the game changes. No animation event controls a move.
Web Crypto samples game rolls and decision randomness independently. Components only display
state and invoke controller actions; they contain no scoring or victory rules.

Vite uses relative production asset URLs for a GitHub Pages project subpath. Hash navigation
supports static hosting. The Pages workflow builds and uploads only dist. Public deployment
and live offline verification passed on 2026-09-15.

Offline play while a loaded session remains open and offline reopening are separate checks.
offlineBuild.ts emits a worker with a content-derived version and complete release asset list.
frontend/web/service-worker.js precaches all files atomically, serves cached HTML for navigation,
and caches only known release assets. Cache names include the project scope. Activation removes
only older caches for that scope. Updates wait until all existing clients close; no skipWaiting
or forced reload interrupts a match. OfflineStatus registers only in production and reports
readiness. Failed installation leaves the existing release active. See RELEASE.md for limits.

## Stage 9 — Local authoritative PvP

The optional Node HTTP server in backend/http.ts calls backend/multiplayer/rooms.ts,
which owns rooms and calls the existing shared engine. It has no UI dependencies.
The engine never imports backend code. A separate backend TypeScript configuration uses
Node globals, while shared code remains platform-independent.

HTTP client → authenticated room service → shared engine → canonical game state.

Commands carry the expected revision. The service identifies the player from a private
token and generates randomness itself. Replacement and ending a non-winning turn are one
atomic service operation. In-memory storage is intentionally limited to local development;
see [the API contract](PVP_API.md) and backend/database/README.md for persistence requirements.
The existing Vite installation bundles the Node entry point into dist-backend/server.cjs.
The web build and GitHub Pages deployment do not include or start this server.

## Stage 10 — Local multiplayer presentation

The multiplayer screen uses a separate controller and HTTP adapter; it does not share the
PvE controller or statistics lifecycle. Shared protocol types live in shared/pvp and import
only domain types. Both client and backend consume that contract without cross-platform
imports. The controller restores a per-tab credential and polls for authoritative snapshots.
Generation checks discard responses after moves, room changes, or unmounting; revision
checks stop older snapshots replacing newer ones. The backend remains the final authority.

Vite's local /api proxy connects development screens to the loopback backend. Production
builds keep the multiplayer entry disabled until hosting is explicitly configured. There
are no API requests during PvE. See MULTIPLAYER.md for session and reconnect semantics.
