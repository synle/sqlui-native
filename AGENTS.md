# AGENTS

SQLUI Native is a cross-platform SQL/NoSQL, GraphQL, and REST client. The desktop runtime uses Tauri v2 with a Node.js/Hono sidecar.

## Context and Sources of Truth

`AGENTS.md` owns repository rules. Before non-trivial work, read `DEV.md` for commands and procedures, and `ARCHITECTURE.md` for runtime flows and module ownership.

For adapter development, Docker fixtures, or integration setup, read `CONTRIBUTING.md`.

- Verify current commands, versions, and gates against `package.json`, `.node-version`, build configs, and workflows, not historical inventories.
- Plans record proposals and historical results, not current implementation. Re-read source before promoting plan items into guidance.
- Keep global engineering rules in their managed source; do not duplicate them here or edit generated global deployments.
- Keep repository guardrails in `AGENTS.md`, not Claude-specific hook configuration.
- Use `AGENTS.md` for repository and directory-specific context. If only `CLAUDE.md` exists, rename it and update references while preserving its guidance.
- If both context files exist, reconcile their distinct guidance into `AGENTS.md` without silently discarding rules.

## Runtime and Module Boundaries

All supported runtimes use HTTP through `src/sqlui-server/` to reach the shared backend in `src/common/`. See `ARCHITECTURE.md` for desktop, browser, and portal flows.

- Frontend-reachable code must not import Node.js APIs or storage modules, directly or transitively.
- Keep `DataScriptFactory.ts`, adapter `scripts.ts` files, and their dependencies pure: no I/O or Node.js APIs.
- Forbidden frontend imports include `PersistentStorage.ts`, `PersistentStorageJsonFile.ts`, `PersistentStorageSqlite.ts`, `PersistentStorageMigration.ts`, `node:fs`, `node:path`, and `node:sqlite`.
- Expose storage data through `Endpoints.ts` and call it through `ProxyApi` in `src/frontend/data/api.tsx`.
- Use storage factory functions such as `getConnectionsStorage` and `getQueryStorage`; never instantiate storage implementations directly in consumers.
- Set `SQLUI_HOME_DIR` before the first storage operation. `getStorageDir()` lazily caches its first resolution; later environment changes have no effect.
- Portal storage defaults to `~/.sqlui-portal/`, but CLI/environment overrides can share desktop storage; never assume unconditional isolation.

## Adapter and Query Contracts

Adapters implement `IDataAdapter`; `DataAdapterFactory` selects implementations and `DataScriptFactory` supplies dialect-specific scripts.

- `disconnect()` is the sole cleanup method. The caller invokes it in `finally`; adapter methods must never disconnect internally.
- Background metadata refreshes own separate adapters and cleanup. Never reuse the foreground adapter after its caller returns.
- Keep uncached table fetches bounded through the existing `allSettledWithLimit` path and `TABLE_FETCH_CONCURRENCY` in `DataAdapterFactory.ts`.
- `cancel()` is optional and must not disconnect. PostgreSQL, MySQL/MariaDB, and MSSQL implement server-side cancellation.
- Preserve the `executionId` registration/unregistration lifecycle in `src/common/utils/inFlightExecutions.ts` and the execute endpoint.
- Cancellation uses `POST /api/connection/:connectionId/execute/:executionId/cancel`. Unsupported adapters do not gain server-side cancellation from UI abandonment.
- Execute failures retain HTTP 200 with `{ ok: false, error, errorKind }`. Preserve this compatibility contract; use `errorUtils.ts` for classification.

### Local Document Files

- Keep `FileDataAdapter` read-only and its query language restricted; never replace the evaluator with arbitrary JavaScript execution.
- Preserve the loopback-bind gate through `configureLocalFileAccess()` and the adapter's read-time check. Network-bound portal mode must fail closed.
- Preserve the document-size limit, query-length limit, evaluation budget, and filesystem-path redaction. Their constants belong in the adapter and query parser.
- Preserve the result/source-tab contract: `raw: [result]` plus `meta.isFileData`, `meta.rawSource`, and `meta.sourceFormat`.

### Adding an Adapter

For adapter additions, follow the complete procedure in `CONTRIBUTING.md#adding-new-adapters`.

`DataScriptFactory.spec.ts` generates `guides.md`; never edit that output manually.

## Frontend and Desktop Guardrails

- Keep SQL completion filtering in `src/frontend/utils/sqlCompletionContext.ts`; it is a pure heuristic, not a full SQL parser.
- `monacoSetup.ts` uses public Monaco ESM entrypoints and loads editor and JSON workers. JavaScript/TypeScript and HTML use basic grammars, not their heavyweight language services.
- Preserve `AdvancedEditor` lifecycle ownership: apply options in place, dispose providers/listeners, and retain cached models only through the existing model-cache lifecycle.
- Preserve React-core vendor grouping in `vite.frontend.helpers.mts` and `stripCrossoriginPlugin()` in `vite.frontend.config.mts`; splitting React incorrectly can prevent startup.
- Preserve Tauri CSP allowances for loopback sidecar requests and GitHub access in `src-tauri/tauri.conf.json`.
- Keep `dangerousDisableAssetCspModification: ["style-src"]` for MUI/Emotion.
- Keep the release-only `windows_subsystem = "windows"` attribute on `src-tauri/src/main.rs`, never `lib.rs`.
- That attribute in `lib.rs` does not change the binary subsystem; child-process flags cannot hide the parent console.
- Apply Windows `CREATE_NO_WINDOW` (`0x08000000`) to every child spawn, including Node discovery probes.
- These console controls are Windows-only; do not add equivalent console-hiding branches on macOS or Linux.
- Preserve the sidecar stdout marker and bounded startup wait. See `ARCHITECTURE.md` for startup and shutdown ownership.

For build-tool or dependency changes, read `DEV.md#build-configuration-contracts` before editing configs or upgrading Monaco/Tauri.

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

After all changes, run the local pre-commit chain in `DEV.md#checks` once, unless the user explicitly waives checks. See `DEV.md` for lifecycle side effects and affected-build requirements.

Do not run E2E tests locally; leave them to CI. `npm run validate` is CI-only because it includes E2E and smoke stages.

- Unit tests are co-located `*.spec.ts`/`*.spec.tsx` files. Integration specs use `*.integration.spec.*` and are excluded from the unit run.
- Local database integration tests require Docker. Cloud adapter tests require their configured environment variables and skip when unavailable.
- `TEST_*_CONNECTION` variables contain real credentials. Never log or expose them.
- Use fictional test data such as Acme, Globex, and Initech; never real data.
- Every jsdom test starts with `// @vitest-environment jsdom`.
- Use `@testing-library/react`; mock hooks with top-level `vi.mock("src/frontend/hooks/...")`.
- Mock `useLayoutModeSetting: () => "compact"` when layout mode is used, and mock `CodeEditorBox` when testing Monaco consumers.
- Prefer `toMatchInlineSnapshot` for small, deterministic object/array results, parsed payloads, metadata, and empty/null render checks.
- Keep focused scalar, identity, relational, partial/asymmetric, and table-driven assertions when they express the contract more clearly. Prefer `toContain` for text fragments.
- Snapshot stable public output, not implementation details or real credentials. Pin or normalize nondeterministic fields without weakening their behavioral checks.
- Update snapshots with `npm run test:update-snapshots -- <spec-path>` and review every generated diff. Never accept changed output solely because regeneration passes.
- Coverage thresholds belong in configs and CI, not prose. Never lower them without an explicit reason.
- When raising JS/TS floors, update `vitest.config.mts` and workflow `MIN_*` values together. See `DEV.md` for the existing reporting mismatch.

## Skills and Releases

Keep each repository skill at `.agents/skills/<name>/SKILL.md`, with a matching kebab-case directory and frontmatter name. Use portable `name` and `description` frontmatter.

Migrate legacy agent-specific skill/command files into that layout. Do not add duplicate skill bodies or new command files.

- For release/publish requests, read `.agents/skills/release/SKILL.md` first. It owns routing, automatic continuation, commit summaries, and workflow-generated notes.
- Official is the default; only explicit beta/prerelease/test-release intent selects beta.
- `.agents/skills/install-app/SKILL.md` owns installing existing release artifacts.
- `.agents/skills/test-app/SKILL.md` owns explicitly requested manual testing. Manual testing does not authorize publishing a release.

## GitHub Raw File URLs

Use the `?raw=1` blob format with the actual ref: `https://github.com/{owner}/{repo}/blob/{ref}/{path}?raw=1`.

Do not use the contents API or `raw.githubusercontent.com` for raw-file retrieval.

## Git / PR Merge Policy

- Always use squash and merge for PRs, never merge commits or rebase merges.
- This repository requires `git pull --rebase` before `git push`; this repository-specific rule overrides the global merge-only sync default.
- You may `git merge origin/main` locally to sync branches.
