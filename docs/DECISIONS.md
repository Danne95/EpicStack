# Decisions

## 2026-09-13 — Pure TypeScript shared engine

**Decision:** keep game rules and AI in `shared/`, free of platform dependencies.

**Reason:** the same logic can run in browser, Android integration, and automated tests.
The Android runtime choice is deferred; this decision does not imply Kotlin can import TypeScript.

## 2026-09-13 — One root toolchain

**Decision:** use a root npm package and lockfile with React, Vite, TypeScript, Vitest,
ESLint, Prettier, and plain CSS. Do not add a monorepo framework or publish shared packages.

**Reason:** one web client and shared sources do not yet need package orchestration. Filesystem
boundaries and separate TypeScript checks are sufficient for the initial project.

## 2026-09-13 — Separate platform type environments

**Decision:** type-check shared production sources with ECMAScript libraries and no ambient
platform types; check the browser and build tooling with their own configurations.

**Reason:** accidental DOM/Node usage in the engine should fail early. Lint adds import
guardrails, while review remains responsible for indirect dependency boundaries.

## 2026-09-13 — Establish the foundation before implementing behavior

**Decision:** the initial change completes Stage 0 only. The Vite entry is intentionally empty.
Vitest temporarily permits no test files; remove that option in Stage 1.

**Reason:** the roadmap requires tested rules and AI before UI. Fake engine scaffolds, visual
screens, or meaningless tests would obscure the actual completion state. Some game rules
still require confirmation and are explicitly listed in `GAME_RULES.md`.

## 2026-09-13 — Static deployment compatibility

**Decision:** Vite emits relative asset URLs. GitHub Actions, navigation, and offline caching
are deferred to their roadmap stages.

**Reason:** a GitHub Pages project may be served from a repository subpath. Relative asset
paths prepare for that without prematurely implementing release infrastructure.

## 2026-09-13 — PvE stays independent of multiplayer

**Decision:** keep backend directories empty until Stage 9; no account or network service is
required for PvE. Introduce Android in Stage 8 rather than scaffolding a native project now.

**Reason:** future features must not complicate the first polished single-player release.

## 2026-09-13 — Fresh random rolls replace the finite draw deck

**Decision:** as confirmed by the user during Stage 1, every turn selects uniformly from
values absent from both towers. Removed values may return on later rolls. A shuffled deck
is used only to initialize the towers, and no remaining draw pile is stored in state.

**Reason:** the user wants a random value rolled for the playing side on every turn, without
a supply that runs out, while preserving uniqueness across both towers. Discards are history,
not inventory. This supersedes the original shared finite draw-deck proposal and its exhaustion
question. AI probability reasoning must follow the new rule.

## 2026-09-13 — Initial deal and first turn

**Decision:** deal alternately from the front of the initial deck into each tower top to bottom.
Redeal both if either is ascending. Choose the first player randomly after an accepted deal.

**Reason:** these choices were confirmed by the user. Supplied test decks follow the same order
and initial-win policy. A named 100-attempt initialization guard reports pathological random
sources explicitly rather than hanging; it never returns a winning start or a drawn game.

## 2026-09-13 — Explicit phases and immutable data

**Decision:** represent draw, placement, end-turn, and completed phases with unions. Validate
the actor and phase for every mutation. Resolve victory during replacement and reject all
further actions. Inject random functions at initialization and drawing, never into stored state.

**Reason:** controllers and the future AI share the same legal actions; an animation or repeated
click cannot roll twice or move after victory. Plain readonly state can cross platform boundaries
without UI dependencies. Stable error codes let later controllers explain rejected actions.

**Verification:** the Stage 1 suite covers rules and immutable state, including deterministic
200-turn simulations. The temporary empty-test allowance from Stage 0 has been removed.

## 2026-09-13 — Explainable baseline computer

**Decision:** evaluate every legal placement with the existing engine, returning a move and
six numeric score components. Keep one frozen weight configuration. Rank wins above all
heuristic scores and break exact ties by the topmost position. Do not consume randomness.

**Reason:** this gives Stage 2 a complete, reproducible computer player that can be inspected
and tested without UI. Difficulty configurations and search are deferred to Stage 3.
Using engine operations avoids a second implementation of move legality or victory.

**Decision:** share eligible-value generation between the roller and AI. Future opportunity
scores use the board after the proposed replacement, so the removed value is immediately
eligible again. Treat the opponent's tower as fixed for these basic estimates.

**Reason:** this follows the confirmed fresh-roll rule without predicting unseen random
values. The estimates are explicitly local approximations, not exact forecasts of the board
after the opponent's intervening move. Every coefficient and limitation is in `AI_DESIGN.md`.

## 2026-09-13 — Difficulty changes evaluation, not the game

**Decision:** preserve Stage 2 as default Medium. Add immutable Easy, Hard, and Expert profiles
with shared weight fields, range awareness, decision spread, and bounded future-roll counts.
Every level takes immediate wins. Easy may choose uniformly among close non-winning moves
using a separate supplied random source. Hard/Expert select deterministically.

**Reason:** this yields understandable differences without favorable rolls, different legal
moves, name-based conditionals, or regressions for existing callers. Runtime validation prevents
invalid numeric settings and excessive forecasting work. The original illustrative `searchDepth`
field is replaced with `forecastRollCount`, which precisely describes the implemented workload.

## 2026-09-13 — Range-aware scoring and one-roll forecasting

**Decision:** use a longest-path calculation to count retainable tower bricks while reserving
enough unoccupied numeric capacity between their positions. Treat the opponent's current
values as blocked for this estimate. Expert also examines the eighty eligible future values
and ten placements for each, returning expected best retained fraction.

**Reason:** this catches attractive local fits that cannot support an ascending completion,
including the near-top 98/99/100 case. One-roll projections provide a bounded improvement over
Hard without an unbounded search tree. They freeze the opponent and do not claim to predict
its move or the actual game random sequence. No hypothetical state is committed to the game.

**Verification:** paired seeded games show increasing wins within the fixed regression corpus.
Expert has a tested 8,000-projection cap per decision; measured 95th-percentile time was 2.86 ms
on the development machine. Full formulas, profile values, limitations, and results are in
`AI_DESIGN.md`. Browser/mobile performance and broader play balancing remain to be assessed.

## 2026-09-14 — Web MVP controller and navigation

**Decision:** use a pure session reducer around the existing engine, with randomness supplied
as action data. Use hash navigation and retain the session at App level. Pause pending computer
work outside the game screen; ignore callbacks whose expected game is no longer current.

**Reason:** repeated clicks and React reducer replay cannot create extra game moves or consume
different random inputs. Hash navigation needs no router library or server fallback. In-memory
matches keep Stage 4 small; persistence, audio, and animation remain later-stage work.

## Stage 5 — Original local SVG identity

Decision: Use a widening stack logo, a small shared SVG icon sprite, a subtle registration
grid, and a static ordered-stack victory seal. Keep the existing mineral, clay, and moss
palette, readable numbers, and value-based gameplay widths.

Reason: These assets express the ordering mechanic, remain crisp at every screen size,
and require no external font, image service, or component library. The sprite import uses
Vite’s no-inline option because SVG use fragments need a file URL rather than a data URL.
Decorative motion is deferred to Stage 6.

## Stage 6 — Local record and replay controls

Decision: Count only finished matches, per the user’s confirmation. Store aggregate records
per difficulty and saved mute/difficulty preferences in versioned browser storage.

Reason: Abandonment is not a loss in this casual game. Aggregate records stay small and
require neither an account nor a backend. Best and average wins use the human’s own turns.
Restart restores the opening towers and starter with fresh future randomness; New game
deals a fresh opening at the selected difficulty. Neither changes the shared rules or AI.

## Stage 7 — Versioned offline release

Decision: Precache the emitted release with a small build-generated service worker. Keep
updates waiting until every existing EpicStack client closes. Scope caches to the project URL.

Reason: The game has no runtime backend requests; its small static asset set needs no new
library. Atomic installation prevents partial updates, and waiting avoids disrupting matches.
Hash navigation and relative URLs keep the same build usable at a Pages project subpath.

## 2026-09-15 — Public web and private Android/iPhone clients

Decision: Keep EpicStack public, including the web client, shared rules/AI/types, and common
assets. Use one future private EpicStack-Mobile repository for both Android and iPhone,
sharing mobile presentation where practical and separating platform-specific integration.

Reason: A repository cannot contain private subdirectories. Separate mobile visibility does
not require three copies of the game: versioned shared dependencies keep rules and common
assets canonical. Mobile upgrades are explicit and each platform releases independently.

This supersedes the original Stage 8 plan to add frontend/android inside EpicStack.
Framework selection, package delivery, and mobile scaffolding wait until Stage 8.

## 2026-09-16 — Android first, reuse the existing interface

The user deferred iPhone and chose the existing interface for Android. Use Capacitor in the
private EpicStack-Mobile repository, with the public game pinned as a Git submodule. This
supersedes the separate mobile UI and shared-package proposal: the complete existing game
is reused, so individual shared package publishing is unnecessary at this stage.

Android builds omit the web service worker because assets are bundled with each APK.
No Android integration or Capacitor dependency is added to the public game repository.

## 2026-09-16 — Local PvP foundation; Android verification deferred

The user explicitly deferred Android device debugging and requested Stage 9, choosing a
local backend before hosting. Stage 8 runtime checks remain open rather than marked complete.
Use Node's built-in HTTP server and the existing Vite toolchain, with no added dependencies.
Keep transient rooms in one process while establishing the API and authoritative move flow.
Token-based player identity and revision checks prevent impersonation and stale moves.
The backend calls the existing engine; PvE never depends on backend availability.
Durable storage and internet deployment are future work. Stage 10 provides the friend-play UI.

## 2026-09-16 — Stage 10 local friend play

Use short HTTP polling instead of adding WebSockets or a networking library. Turn-based
play tolerates a 1.5-second update interval. Keep per-tab credentials in sessionStorage so
separate players can test in separate tabs and reload to reconnect. Never put tokens in
invitation links. Require explicit confirmation before forgetting a seat.

Keep local multiplayer visible only during development until a hosted backend is available.
Do not imply that a localhost invitation can reach a friend on another computer. Closing a
room locally is not a forfeit and does not change canonical rules or PvE statistics.
