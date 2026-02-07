# Contributing

## Development Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd ai-seo-os
   npm install
   cd server && npm install && cd ..
   ```

2. **Environment**
   - Copy `.env.example` to `.env` (root and `server/.env`).
   - Set at least: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`, `REDIS_URL`, `JWT_SECRET`.

3. **Run locally**
   - Backend: `cd server && npm run dev`
   - Frontend: `npm run dev`
   - Workers: `cd server && npm run worker` (optional)

4. **Scripts**
   - `scripts/setup.sh` – full dev setup (Unix).
   - `scripts/migrate.sh` – run DB migrations.
   - `scripts/seed-data.sh` – seed test data (if implemented).

## Code Style

- **Frontend:** Biome for lint and format. Run `npm run lint` and `npm run format`.
- **Backend:** TypeScript strict; run `npx tsc --noEmit` in `server/`.
- **Formatting:** Consistent indentation and quotes; avoid trailing whitespace.
- **Naming:** Clear, consistent names; prefer `camelCase` for variables/functions, `PascalCase` for types/components.

## Testing

- **Location:** `server/src/__tests__/` (unit, integration, fixtures).
- **Runner:** Jest (see `jest.config.js`). Run: `npm run test` from repo root when tests exist.
- **Scope:** Unit tests for services/utils; integration tests for API routes and workers.
- **Fixtures:** Use `fixtures/` and `test-helpers.ts` for shared data and helpers.

## Pull Request Process

1. Branch from `main` (or `develop` if used): `git checkout -b feature/your-feature`.
2. Make small, focused commits. Keep changes minimal and readable.
3. Run lint and typecheck: `npm run lint`, `cd server && npx tsc --noEmit`.
4. Add or update tests for new behavior.
5. Push and open a PR. Fill in the description and link any issues.
6. Address review feedback. CI must pass (lint, typecheck, tests).
7. Squash or rebase if requested; then maintainers will merge.

## Commit Conventions

- Use present tense: “Add endpoint” not “Added endpoint”.
- Start with a verb: “Fix health check”, “Add agent retry”, “Update docs”.
- Optional: prefix with area, e.g. `api:`, `frontend:`, `agents:`, `docs:`.

## Questions

Open an issue for bugs, features, or documentation. For security-sensitive issues, prefer private contact if the project provides it.
