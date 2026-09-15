# Contributing

Read `AGENTS.md` and the relevant documents in `docs/` before making changes. Follow the
current stage in `docs/ROADMAP.md`; finish and verify it before beginning the next.

## Local workflow

1. Install Node.js 24 (or Node.js 22.13+ within the 22.x line) and run `npm ci`.
2. Make one focused change within the existing architecture.
3. For engine and AI behavior, add colocated `*.test.ts` tests under `shared/`.
   Put web tests under `frontend/web/tests/`. Vitest currently uses the Node environment;
   add browser testing support only when the UI stage requires it.
4. Run `npm run format`, `npm run check`, and `npm run build`.
5. Update canonical documentation for changed behavior and decisions for architecture changes.
6. Describe the problem, resulting behavior, verification, and any remaining limitations.

Do not add fake tests just to make a suite green. The engine now has required rule tests;
an empty suite fails. Keep shared test helpers under `shared/game/tests/` so they are excluded
from the production shared type environment while remaining type-checked through their tests.

Keep platform dependencies in their presentation layer. The shared production type check
deliberately excludes DOM and automatic ambient types. Lint also blocks known platform imports.
Unit tests may use Vitest, but production modules must not depend on test helpers.

Never commit generated builds, dependency directories, secrets, or debug logs. Commit the
npm lockfile with dependency changes. Do not introduce a new library without a concrete need.

UI work must include keyboard interaction and checks at mobile, tablet, and desktop sizes.
Do not infer game rules from visual behavior: resolve gaps in `docs/GAME_RULES.md` first.
