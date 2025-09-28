# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`, with React components under `components/`, reusable logic in `hooks/`, Zustand stores in `stores/`, and shared styles in `styles/`. The app boots through `main.tsx` and `App.tsx`, which host the Monaco-powered editors. End-to-end specs sit in `tests/`, static assets in `public/`, and marketing imagery in `docs/`. Vite outputs builds to `dist/` (generated—do not edit). Tooling files (`vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig*.json`) stay at the repository root.

## Build, Test, and Development Commands
- `npm run dev` runs the Vite dev server at http://localhost:5173 with HMR.
- `npm run build` emits an optimized bundle in `dist/`; `npm run preview` serves it for smoke checks.
- `npm run lint` invokes ESLint with the TypeScript and React Hooks presets; resolve findings before commit.
- `npm run format` applies Prettier to staged sources.
- `npm run typecheck` executes `tsc --noEmit` to catch typing regressions early.

## Coding Style & Naming Conventions
TypeScript and React are required. Prettier enforces 2-space indentation, single quotes, no semicolons, 100-character lines, and LF endings. Prefer PascalCase for component files, camelCase for hooks/utilities, and kebab-case for assets. Keep Zustand store slices in `src/stores` focused on a single concern and co-locate derived hooks in `src/hooks`. Run `npm run lint && npm run format` before pushing to avoid style-only churn in PRs.

## Testing Guidelines
`npm test` runs the Playwright suite in `tests/*.spec.ts`, mirroring the flows exercised in production. Add or update specs when altering UI flows, especially layer parsing or document management. Use `npm run test:vitest` for unit-level checks with Happy DOM and place specs beside the code. `npm run test:coverage` produces coverage reports to confirm new logic paths.

## Commit & Pull Request Guidelines
Recent history favors emoji-prefixed summaries (for example, `✨ Add diff mode with side-by-side comparison`). Keep the imperative tone and describe the behavior change, not the implementation detail. Each PR should include a concise summary, linked issue (if any), the test commands you executed, and UI screenshots when the interface changes. Run linting, type checks, and at least one relevant test before requesting review to keep the `deploy.yml` workflow healthy.
