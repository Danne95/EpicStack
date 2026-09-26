# EpicStack

A turn-based number-ordering game: build a tower of ten bricks in ascending order,
smallest at the top, before your opponent does.

The initial target is a polished PvE web game hosted on GitHub Pages, playable offline
once loaded, without a backend. Android device verification is deferred; iPhone is deferred. Stage 9 provides a local PvP API.

The web client, shared rules/AI, and common assets stay in this public repository. Stage 8
uses a separate private EpicStack-Mobile repository for Android, with the existing interface
and a pinned public game dependency. iPhone is deferred. See the [future directory plan](docs/ARCHITECTURE.md#future-clients-and-repository-visibility).

## Current status

Stages 0–6 are complete: engineering foundation, game engine, four AI levels, a playable web MVP,
EpicStack’s original visual identity, and single-player polish.
The engine deals towers, rolls eligible values, validates turns, replaces bricks, and detects
victory without any UI. Each turn rolls a number absent from both towers; removed values can
return later, so there is no finite draw pile. All initial rule decisions are documented.

The computer evaluates every legal placement, takes immediate wins, and returns a choice
with six explainable scores. Easy favors immediate fit, Medium balances ordering and position,
Hard considers feasible ranges, and Expert evaluates possible future rolls. All follow the
same game rules. Easy's decision randomness is separate from the game's rolls.
Run `npm run dev` to play. The web app includes the menu, game board, settings, and instructions.
Draw a brick, select a tower position, and confirm; the computer then takes its turn.
Preferences and completed-game statistics are saved in this browser. Active matches stay
in memory while navigating but reset on refresh. Settings shows records for each difficulty.
Restart restores the opening towers; New game deals fresh towers. Sound can be muted,
and decorative animations respect reduced motion.
Stage 7 is complete: [play EpicStack](https://danne95.github.io/EpicStack/).
Stage 8 Android development is in progress. See [release instructions](docs/RELEASE.md).

## Development

Use Node.js 24 (recommended) or Node.js 22.13+ within the 22.x line, and npm.

```sh
npm ci
npm run check
npm run build
```

```sh
npm run dev        # Play the web game locally
npm run test:watch # Vitest in watch mode
npm run format    # Apply formatting
npm run preview   # Serve the production build after building
```

`npm run check` runs formatting, lint, strict type checking, and the required Vitest suite.
Tests include scoring examples, paired difficulty comparisons, complete computer games,
and 200-turn engine simulations in Node without a UI.
`npm run build` emits `dist/` using relative asset paths. GitHub Pages
deployment and offline caching are configured.

If the PowerShell npm launcher fails on Windows, use `npm.cmd` in the commands above.

## Layout

| Path                  | Responsibility                                               |
| --------------------- | ------------------------------------------------------------ |
| `frontend/web/src/`   | React presentation and controller hooks                      |
| `frontend/web/tests/` | Web/controller tests                                         |
| `shared/game/`        | Pure TypeScript state, rules, rolling, and engine tests      |
| `shared/ai/`          | Four difficulty profiles, scoring, forecasting, and AI tests |
| `shared/types/`       | Shared platform-independent types                            |
| `assets/`             | Branding, bricks, icons, backgrounds, audio, fonts           |
| `backend/`            | Local authoritative PvP API                                  |
| `docs/`               | Canonical rules, architecture, AI, style, decisions, roadmap |

The Android client lives in the separate private `EpicStack-Mobile` repository. Root tooling serves one project; no
workspace framework or package publishing is needed. Shared production code is type-checked
separately without DOM or Node globals.

Start with [the roadmap](docs/ROADMAP.md), [game rules](docs/GAME_RULES.md), and
[contributing instructions](CONTRIBUTING.md). Coding agents must follow [AGENTS.md](AGENTS.md).

## Local multiplayer backend

Run `npm run backend:start` to build and start the Stage 9 API at
`http://127.0.0.1:8787`. Rooms reset when the process stops. See
[the API contract](docs/PVP_API.md) for create/join/move requests. Start `npm run dev` as well and choose **Play a friend**.
See [local multiplayer usage](docs/MULTIPLAYER.md) for two-tab play and reconnect.
Production web and Android builds remain PvE until a hosted backend is configured.
