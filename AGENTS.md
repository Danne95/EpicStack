# Working on EpicStack

EpicStack is a turn-based number-ordering game. The first release is an offline-capable
PvE browser game on GitHub Pages. Keep the architecture understandable and maintainable.

## Read before editing

- Read `docs/ROADMAP.md` to identify the current stage. Complete one stage before starting
  another; do not implement later features opportunistically.
- Read `docs/GAME_RULES.md` before changing game state, rules, or legal moves. It is the
  canonical rule source. Do not silently invent or change rules; resolve open decisions
  with the user before implementing dependent behavior.
- Read `docs/AI_DESIGN.md` before changing computer behavior. Explain every scoring
  function, weight, difficulty configuration, and reasoning rule there.
- Read `docs/VISUAL_STYLE.md` before creating UI or visual assets.
- Read `docs/ARCHITECTURE.md` before changing dependencies or file organization.

## Code boundaries

- Keep `shared/` pure TypeScript: no React, DOM, browser, Android, or backend dependencies.
- UI depends on a game controller, which calls the shared engine. Never put game rules
  or AI scoring inside components, event handlers, or animations.
- Humans and AI use the same legal engine operations. Never give the AI hidden information
  or special moves. Inject randomness so identical inputs can produce identical decisions.
- Reuse the engine and AI for future Android and PvP work. Do not duplicate rules.
- Do not add backend infrastructure during PvE development.
- Avoid dependencies when the existing stack can reasonably solve the problem. No Redux,
  large UI framework, or speculative state-management framework.

## Implementation style

- Use descriptive names, small focused files/functions, explicit public types, and
  unions/enums for finite states. Prefer immutable state updates and deterministic functions.
- Name constants and explain non-obvious values, especially AI weights.
- Avoid giant components, utility dumping grounds, global mutable state, duplicated logic,
  unrelated abstractions, and debug logging.
- Write meaningful unit tests for every game-rule and AI change. The engine must run in
  Node tests without a UI. Never replace rule tests with UI-only checks.
- Keep documentation current when architecture or behavior changes. Record significant
  decisions and their reasons in `docs/DECISIONS.md`.

## Stage workflow and completion

1. Read relevant documentation and inspect existing architecture.
2. Implement the smallest complete change in the current stage.
3. Add or update relevant tests.
4. Run `npm run check` and `npm run build`; resolve failures.
5. Verify behavior. For UI work, check desktop, tablet, and mobile sizes and console errors.
6. Update documentation and the roadmap only after validation.

A feature is done when implementation, types, lint, tests, documentation, and applicable
responsive UI checks pass, with no unexplained constants or debug logging.

Keep verification proportionate. Prefer focused tests and one final quality-check run; do not
expand or repeat testing without a concrete uncovered behavior, failure, or material change.

The engine test suite is required. Do not restore `--passWithNoTests`; an empty run is not
rule coverage. Engine test helpers belong under `shared/game/tests/`, outside production type checking.
