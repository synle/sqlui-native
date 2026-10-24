# AGENTS

SQLUI Native is a cross-platform SQL/NoSQL, GraphQL, and REST client. The desktop runtime uses Tauri v2 with a Node.js/Hono sidecar.

## Context and Sources of Truth

Read `DEV.md` and `ARCHITECTURE.md` before non-trivial work. Read `CONTRIBUTING.md` for adapter development, Docker fixtures, and integration setup.

- `AGENTS.md` owns repository rules; `DEV.md` owns commands and development procedures; `ARCHITECTURE.md` owns runtime flows and module ownership.
- `package.json`, `.node-version`, build configs, and workflow files own current commands, versions, and gates. Verify them rather than copying historical inventories.
- Saved plans describe proposals and historical results, not current implementation. Re-read source before promoting a plan item into project guidance.
- Keep global engineering rules in their managed source; do not duplicate them here or edit generated global deployments.
- Use `AGENTS.md` for repository and directory-specific context. If only `CLAUDE.md` exists, rename it and update references while preserving its guidance.
- If both context files exist, reconcile their distinct guidance into `AGENTS.md` without silently discarding rules.

## Runtime and Module Boundaries

All supported runtimes use HTTP through `src/sqlui-server/` to reach the shared backend in `src/common/`. See `ARCHITECTURE.md` for desktop, browser, and portal flows.

- Frontend-reachable code must not import Node.js APIs or storage modules, directly or transitively.
- This includes `DataScriptFactory.ts`, adapter `scripts.ts` files, and their dependencies. Keep them pure: no I/O or Node.js APIs.
- Forbidden frontend imports include `PersistentStorage.ts`, `PersistentStorageJsonFile.ts`, `PersistentStorageSqlite.ts`, `PersistentStorageMigration.ts`, `node:fs`, `node:path`, and `node:sqlite`.
- Expose storage data through `Endpoints.ts` and call it through `ProxyApi` in `src/frontend/data/api.tsx`.
- Use storage factory functions such as `getConnectionsStorage` and `getQueryStorage`; never instantiate storage implementations directly in consumers.
- Set `SQLUI_HOME_DIR` before the first storage operation. `getStorageDir()` resolves lazily and caches its result; changing the environment afterward has no effect.
- Portal storage defaults to `~/.sqlui-portal/`, but CLI/environment overrides can explicitly share desktop storage. Do not assume unconditional isolation.

## Adapter and Query Contracts

Adapters implement `IDataAdapter`; `DataAdapterFactory` selects implementations and `DataScriptFactory` supplies dialect-specific scripts.

- `disconnect()` is the sole cleanup method. The caller invokes it in `finally`; adapter methods must never disconnect internally.
- Background metadata refreshes own separate adapters and cleanup. Never reuse the foreground adapter after its caller returns.
- Keep uncached table fetches bounded through the existing `allSettledWithLimit` path and `TABLE_FETCH_CONCURRENCY` in `DataAdapterFactory.ts`.
- `cancel()` is optional and must not disconnect. PostgreSQL, MySQL/MariaDB, and MSSQL implement server-side cancellation.
- Preserve the `executionId` registration/unregistration lifecycle in `src/common/utils/inFlightExecutions.ts` and the execute endpoint.
- Cancellation uses `POST /api/connection/:connectionId/execute/:executionId/cancel`. Unsupported adapters do not gain server-side cancellation from UI abandonment.
- Execute failures retain HTTP 200 with `{ ok: false, error, errorKind }`. Preserve this compatibility contract; use `errorUtils.ts` for classification.

### Adding an Adapter

1. Add the dialect in `typings/index.ts`.
2. Implement the adapter using `src/common/adapters/_SampleDataAdapter_/` as the template.
3. Register implementations in `DataAdapterFactory.ts` and `DataScriptFactory.ts`.
4. Add a PNG dialect icon, import it in `scripts.ts`, and expose it through `getDialectIcon()`.
5. Add adapter tests and script cases in `DataScriptFactory.spec.ts`.

`DataScriptFactory.spec.ts` generates `guides.md`; never edit that output manually. Follow `CONTRIBUTING.md` for the full procedure.

## Frontend and Desktop Guardrails

- Keep SQL completion filtering in `src/frontend/utils/sqlCompletionContext.ts`; it is a pure heuristic, not a full SQL parser.
- `monacoSetup.ts` loads editor and JSON workers. JavaScript/TypeScript and HTML use basic grammars, not their heavyweight language services.
- Preserve `AdvancedEditor` lifecycle ownership: apply options in place, dispose providers/listeners, and retain cached models only through the existing model-cache lifecycle.
- Preserve React-core vendor grouping and `stripCrossoriginPlugin()` in `vite.frontend.config.ts`; splitting React incorrectly can prevent startup.
- Preserve Tauri CSP allowances for loopback sidecar requests and GitHub access in `src-tauri/tauri.conf.json`.
- Keep `dangerousDisableAssetCspModification: ["style-src"]` for MUI/Emotion.
- Keep the release-only `windows_subsystem = "windows"` attribute on `src-tauri/src/main.rs`, never `lib.rs`.
- Moving that attribute to `lib.rs` leaves the binary's console subsystem unchanged. Child-process flags cannot hide the parent's console.
- Apply Windows `CREATE_NO_WINDOW` (`0x08000000`) to every child spawn, including Node discovery probes.
- These console controls are Windows-only; do not add equivalent console-hiding branches on macOS or Linux.
- Preserve the sidecar stdout marker and bounded startup wait. See `ARCHITECTURE.md` for startup and shutdown ownership.

## Code and Documentation Conventions

- Use camelCase for model/type property names, never snake_case.
- Use template literals for multiline HTML, not array `.join("")`.
- Storage sets persisted `createdAt`/`updatedAt` timestamps in epoch milliseconds; callers must not set them manually.
- Use root-relative `src/...` imports, supported by `tsconfig.json`.
- Prefix unused parameters with `_`.
- Catch blocks use `console.error` with a `FileName:functionName` label, never `console.log`.
- Endpoint labels include the route: `Endpoints.ts:handler [GET /api/...]`.
- Exception: `useActionDialogs` dismissal wrappers use `catch (_err) {}` without logging expected dismissals.

### TSDoc

Add TSDoc to all exported functions, classes, components, hooks, types, interfaces, and constants in modified non-test source. Document what and why, not redundant types.

- Script files start with a `/** Description. */` header.
- Describe parameter semantics with `@param connectionId - The connection to refresh`.
- Use `@returns` when the result is not obvious.
- Convert touched JSDoc-style comments to TSDoc; remove `{type}` annotations.
- Exempt test files (`*.spec.*`), `_Sample*` files, and `sw*.js` files.

Update `CONTRIBUTING.md` for adapter changes. Update `README.md` for significant new features and adapter changes at semi-major scope.

## Testing and Validation Policy

After all changes, run `npm run lint && npm run typecheck && npm run test-ci && npm run format` once locally, unless the user explicitly waives checks. See `DEV.md` for lifecycle side effects and affected-build requirements.

Do not run E2E tests locally; leave them to CI. `npm run validate` is CI-only because it includes E2E and smoke stages.

- Unit tests are co-located `*.spec.ts`/`*.spec.tsx` files. Integration specs use `*.integration.spec.*` and are excluded from the unit run.
- Local database integration tests require Docker. Cloud adapter tests require their configured environment variables and skip when unavailable.
- `TEST_*_CONNECTION` variables contain real credentials. Never log or expose them.
- Use fictional test data such as Acme, Globex, and Initech; never real data.
- Every jsdom test starts with `// @vitest-environment jsdom`.
- Use `@testing-library/react`; mock hooks with top-level `vi.mock("src/frontend/hooks/...")`.
- Mock `useLayoutModeSetting: () => "compact"` when layout mode is used, and mock `CodeEditorBox` when testing Monaco consumers.
- Prefer `toContain` for text assertions and `toMatchInlineSnapshot` for empty/null render checks.
- Coverage thresholds belong in configs and CI, not prose. Never lower them without an explicit reason.
- When raising JS/TS floors, update `vitest.config.ts` and workflow `MIN_*` values together. See `DEV.md` for the existing reporting mismatch.

## Skills and Releases

Keep each repository skill at `.agents/skills/<name>/SKILL.md`, with a matching kebab-case directory and frontmatter name. Use portable `name` and `description` frontmatter.

Migrate legacy agent-specific skill/command files into that layout. Do not add duplicate skill bodies or new command files.

- `.agents/skills/release/SKILL.md` owns release routing and execution. Official is the default; beta requires explicit beta/prerelease/test-release intent.
- Never infer beta from branch, SHA, dirty state, CI failure, or uncertainty. Clear release requests proceed without routing or confirmation prompts.
- Summarize commits since the last non-draft, non-prerelease release. Do not create changesets, changelogs, static notes, or custom workflow note inputs.
- `.agents/skills/install-app/SKILL.md` owns installing existing release artifacts.
- `.agents/skills/test-app/SKILL.md` owns explicitly requested manual testing. Manual testing does not authorize publishing a release.

## GitHub Raw File URLs

Use the `?raw=1` blob format with the actual ref: `https://github.com/{owner}/{repo}/blob/{ref}/{path}?raw=1`.

Do not use the contents API or `raw.githubusercontent.com` for raw-file retrieval.

## Git / PR Merge Policy

- Always use squash and merge for PRs, never merge commits or rebase merges.
- This repository requires `git pull --rebase` before `git push`; this repository-specific rule overrides the global merge-only sync default.
- You may `git merge origin/main` locally to sync branches, but PR merges must always be squash merges.
