# Roadmap

Complete each stage with documentation, focused implementation, appropriate tests, lint,
type checking, build verification, and any applicable responsive UI checks before continuing.
Do not interpret this roadmap as permission to add later features to an earlier stage.

## Stage 0 — Engineering foundation (complete)

- [x] Canonical documentation and agent/contributor instructions.
- [x] Web, shared, asset, and deferred backend directory boundaries.
- [x] React/Vite/TypeScript setup with plain CSS planned for presentation.
- [x] Strict platform-specific TypeScript checks, ESLint, Prettier, and Vitest configuration.
- [x] Install and lock dependencies; verify formatting, lint, types, test runner, and build.

No gameplay or screens were implemented in this stage. Its empty-suite allowance was temporary
and has now been removed during Stage 1.

Verified on 2026-09-13 using Node.js 24.14.0: `npm run check` and `npm run build` passed.
Vitest reported no test files, as expected for this foundation. The build emits relative
asset paths. Responsive UI, gameplay, offline caching, and deployment remain unverified
until their implementation stages. Dependency installation reported no known vulnerabilities.

## Stage 1 — Core engine (complete)

- [x] Resolve open rules with the user and document them in `GAME_RULES.md`.
- [x] Define `GameState`, `PlayerState`, `Brick`, `Deck`, `Turn`, and `GameStatus`.
- [x] Implement unique initial dealing, injected randomness, fresh eligible-value rolls,
      replacement, discard history, end turn, current player lookup, and victory detection.
- [x] Expose legal placements; reject invalid moves and actions after victory; preserve inputs.
- [x] Add canonical rule tests and remove the empty-suite allowance.
- [x] Complete final checks and production build verification.

Confirmed change from the original plan: there is no finite in-game draw deck. Each turn
rolls a value absent from both towers, and removed values can return later. Initial dealing
still uses a complete shuffled deck. This change is recorded in `DECISIONS.md`.

Verified on 2026-09-13: 64 tests across seven files pass, as do formatting, lint, strict
type checking, and the production build. Simulations run 200 turns with no UI or backend.

## Stage 2 — Basic computer player (complete)

- [x] Evaluate every legal placement through named numeric scoring components.
- [x] Cover neighbour fit, ordering improvement, position suitability, future flexibility,
      dead-end risk, and expected future progress.
- [x] Document formulas, weights, legal information, tie-breaking, and deterministic inputs.
- [x] Test scoring and legal selection before adding UI.
- [x] Complete final checks and production build verification.

Verified on 2026-09-13: all 83 tests across ten files pass, including seeded computer games,
immediate wins, component scores, deterministic ties, and immutable evaluation. Formatting,
lint, strict type checking, and the production build pass. No new dependencies were added.

## Stage 3 — Difficulty system (complete)

- [x] Define data-driven Easy, Medium, Hard, and Expert profiles; preserve default Medium.
- [x] Add range-aware evaluation, bounded future-roll projections, and decision spread without cheating.
- [x] Explain profile values and validate long-term range/flexibility reasoning, including
      the 98/99/100 near-top example.
- [x] Test paired difficulty comparisons, immediate wins, immutable inputs, and reproducibility.
- [x] Measure Expert runtime and enforce its deterministic operation bound.
- [x] Complete final quality checks and production build verification.

Verified on 2026-09-13: all 121 tests across thirteen files pass, along with formatting,
lint, strict type checking, and the production build. The 48 paired comparison games all
finished; each higher level won more games within its adjacent-level fixture set. Expert's
measured 95th-percentile decision time was 2.86 ms on the development machine. See
`AI_DESIGN.md` for the test corpus, profile formulas, operation budget, and limitations.

## Stage 4 — Web MVP (complete)

- [x] Finalize the initial visual tokens from `VISUAL_STYLE.md` before creating UI.
- [x] Build Main Menu, Game, Settings, and How to Play screens.
- [x] Show opponent tower, turn indicator, drawn brick, player tower, controls, and result.
- [x] Implement draw → select position → confirm replacement → computer turn through a controller.
- [x] Provide native keyboard controls, focus management, and responsive layouts.
- [x] Keep game rules in the engine; no decorative animation or sound in this stage.

Verified on 2026-09-14: all 130 tests pass, as do formatting, lint, types, and production build.
Browser checks covered desktop menu, a complete human/computer turn on mobile, tablet sizing,
settings, instructions, and resuming a match. No browser errors were reported; mobile (390px)
and tablet (820px) content matched viewport width without horizontal overflow. Controller
tests cover both winning outcomes, repeated clicks, and stale computer callbacks.

Matches and preferences live in memory. Refreshing starts a fresh session; opening the game
route without a match directs the player to the menu. Deployment, offline reopening, saved
statistics, sound, and decorative animation remain in later stages.

## Stage 5 — EpicStack identity (complete)

- [x] Refine the original logo, brick design, button shapes, background, icons, and victory treatment.
- [x] Use custom CSS tokens and lightweight SVG assets; avoid generic library styling.
- [x] Verify readability, contrast, responsive behavior, and coherent visual states.

Verified on 2026-09-14: formatting, lint, types, all 130 existing tests, and production build
pass. Browser review covered desktop, 820px tablet, 390px phone, and 320px minimum width,
including selected bricks and a completed match. No browser errors or observed horizontal
overflow. Original SVG assets load locally; the icon sprite is emitted as a separate file
so fragment references work. Gameplay width scaling is preserved. No dependencies or tests
were added for this visual pass. Victory animation remains in Stage 6.

## Stage 6 — Polish (complete)

- [x] Add replacement animations, computer-thinking feedback, and victory animation.
- [x] Add sound effects, mute, difficulty settings, restart, and new-game controls.
- [x] Store statistics locally: games, wins, losses, win rate, average turns to win, best game,
      and difficulty. Define counting semantics and persistence behavior before implementation.
- [x] Keep polish self-contained without accounts, a backend, or external media requests.

Verified on 2026-09-14: all 134 tests pass (four focused persistence/statistics tests added),
with lint, types, formatting, and production build passing. Browser checks covered restart
during a pending computer turn, thinking feedback, Web Audio tone scheduling, mute, a full
human win recorded once, saved settings/results after refresh, and fresh-game difficulty.
Desktop (1264px), tablet (820px), and phone (390px) layouts were reviewed with no browser
errors. Reduced-motion CSS disables all new decorative movement. Active matches still reset
on refresh; deployment and offline reopening remain Stage 7 work.

## Stage 7 — GitHub Pages release (prepared; publication pending)

- [x] Configure production builds and the GitHub Actions/Pages workflow.
- [x] Verify local production navigation, repository-subpath assets, refreshes, and responsive layouts.
- [x] Verify a complete game with the server unavailable after loading.
- [x] Define and verify caching/update behavior for offline reopening.
- [ ] Create the GitHub repository, enable Pages, and complete the first hosted deployment.
- [ ] Verify the live site and offline reopening on the published origin.

Local release checks passed on 2026-09-15: one full quality-check run (134 tests), production
build, offline reload and complete game, and waiting-update activation after the client left.
See RELEASE.md. The public Danne95/EpicStack repository exists; source upload and Pages deployment are pending.
Do not begin Stage 8 yet.

## Stage 8 — Mobile: Android and iPhone

- Create a separate private `EpicStack-Mobile` repository for both mobile versions.
- Choose a mobile framework/runtime that can share presentation code across Android and iOS.
- Keep platform-specific integration in `android/` and `ios/`; final folders depend on the framework.
- Consume explicitly versioned shared engine/AI/types and common asset packages from public EpicStack.
- Maintain rules, AI, and common assets only in the public repository; do not fork or copy-edit them.
- Ship PvE, difficulty settings, local statistics, and offline play on both platforms.
- Verify identical AI decisions for identical shared versions, state, configuration, and random inputs.
- Keep signing keys and credentials outside Git, including the private repository.
- Choose package delivery and mobile release sequencing during this stage, after Stage 7 is complete.

## Stage 9 — PvP architecture

- Introduce a lightweight authoritative backend using the existing engine.
- Support create game → room/invitation → friend joins → alternating turns.
- Validate every move server-side.
- Plan storage for game ID, players, towers, discard history, current player, turn number,
  status, winner, and timestamps.
- Keep PvE usable independently of backend availability.

## Stage 10 — PvP features

- Invite friend, room codes, share links, reconnect, turn synchronization, and win/loss state.
- Defer public matchmaking, global accounts, chat, leaderboards, friends systems, and ranked
  competitive play to separately agreed stages.
