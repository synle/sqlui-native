# AGENTS

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SQLUI Native is a cross-platform desktop SQL/NoSQL database client and REST API client supporting MySQL, MariaDB, MSSQL, PostgreSQL, SQLite, Cassandra, MongoDB, Redis, Azure CosmosDB, Azure Table Storage, Salesforce (SFDC), and REST API (curl/fetch). The desktop shell uses **Tauri v2** with a **Node.js sidecar** (Hono server).

## Commands

```bash
npm install             # Install dependencies
npm start               # Run in Tauri dev mode (alias for npx tauri dev)
npx tauri dev           # Run Tauri + Vite dev server + sqlui-server
npx tauri build         # Build production Tauri app (.dmg/.exe/.deb)
npm run dev             # Run sqlui-server + Vite dev server at http://localhost:3000 (browser only)
npm run build           # Build frontend (Vite) + sqlui-server
npm run build:tauri     # Build frontend + sidecar bundle + prepare resources for Tauri
npm run build:portal    # Build frontend + portal bundle → dist/portal/ (sqlui-portal.js + sqlui-portal-assets.json + bash launcher)
npm test                # Run Vitest tests (watch mode)
npm run test-ci         # Run Vitest tests (CI, no watch)
npm run lint            # ESLint with auto-fix
npm run format          # oxfmt formatting
npm run typecheck       # TypeScript type check (tsc --noEmit)
npm run validate        # All checks: lint → typecheck → test-ci → format → e2e → smoke → integration
```

**Run a single test file:**

```bash
npx vitest run src/path/to/file.spec.ts
```

**VSCode debugging:** `.vscode/launch.json` provides launch configs for the dev
server (`Debug Server`), the webapp in Chrome, the full Tauri app, and Vitest
(unit, single-file, integration). Open the Run and Debug panel and pick one.

**Run integration tests** (requires Docker containers — see CONTRIBUTING.md):

```bash
npm run test-integration
npx vitest run --config vitest.integration.config.ts src/common/adapters/RelationalDataAdapter/mysql.integration.spec.ts
```

**Packaging:** `bash scripts/build.sh && npm run dist`

**Installing built artifacts:**

- **macOS:** Download the `.dmg`, open it, drag `sqlui-native.app` to `/Applications`, then run `xattr -cr "/Applications/sqlui-native.app"` (strips quarantine for unsigned builds).
- **Windows:** Download the `.exe`, run it to install, and follow the installer prompts.

**Debug shortcut:** `Ctrl+Shift+Alt+D` (Windows/Linux) or `Cmd+Shift+Option+D` (Mac) toggles React Query Devtools in packaged builds. Also available via Command Palette (`Cmd+P` / `Ctrl+P`).

## Architecture

### Three Runtime Modes

The app runs in **Tauri mode** (`npx tauri dev` / `npx tauri build`), **browser dev mode** (`npm run dev`), or **portal mode** (`npm run build:portal` → `./dist/portal/sqlui-portal`). All three share the same backend code in `src/common/`. The frontend communicates with the backend via HTTP through the sqlui-server (Hono).

- **Tauri mode**: Server runs as a Node.js **sidecar process** on a dynamic port; frontend served by Tauri from `frontendDist`.
- **Browser dev mode**: Server runs standalone on port 3001; frontend served by Vite dev server on port 3000.
- **Portal mode**: Single bundled Node script that serves BOTH `/api/*` and the React UI from one port. Like phpMyAdmin / sqlite-web. See "Portal Mode" section below.

### Portal Mode

A self-contained web portal distribution. Entry point: `src/sqlui-server/portal.ts`. Build config: `vite.sqlui-portal.config.ts`. Output: `dist/portal/sqlui-portal.js` + `sqlui-portal-assets.json` + bash launcher.

- **Storage isolation**: Portal mode persists to `~/.sqlui-portal/` (NOT `~/.sqlui-native/`) — set via `SQLUI_HOME_DIR` env var, read once at module load by `PersistentStorageJsonFile.ts`. Set this BEFORE importing any storage modules.
- **Single fixed session**: All requests run under session id `"portal"`. Frontend bootstraps via `window.__SQLUI_PORTAL_SESSION__` injected into served `index.html`.
- **CLI inputs**: Positional args are parsed as connection strings (any dialect URL or a SQLite file path). Each is normalized, deduped against existing connections by canonical connection string, and added to the portal session.
- **Default port**: `19378` (rare). Falls back to a random port on EADDRINUSE; always echoes the running URL on boot.
- **Asset embedding**: Frontend `build/` dir is base64-encoded into a sibling `sqlui-portal-assets.json` (NOT inlined via Vite `define` — multi-MB literals expand catastrophically through minification). The runtime decodes the JSON into `os.tmpdir()/sqlui-portal-<pid>/` and points Hono's `serveStatic` there.

The same embed mechanism (`scripts/vite-plugin-embed-frontend.ts → emitEmbeddedAssetsPlugin`) is reused by the desktop sidecar config (`vite.sqlui-server.sidecar.config.ts`), so `build/sqlui-server.js` ships with `build/sqlui-server-assets.json`. The sidecar entry (`src/sqlui-server/index.ts`) calls `mountStaticAssets` when the JSON sibling is present, letting the same server binary serve UI in both Tauri-sidecar and standalone modes — one code path, three callers.

### Tauri + Node.js Sidecar Architecture

- **Tauri** (Rust) provides the desktop shell: native window, menus, process lifecycle
- **Node.js sidecar**: Tauri spawns `node sqlui-server.js` as a child process on a random port
- **Port protocol**: The sidecar prints `__SIDECAR_PORT__=<port>` to stdout; Tauri reads it
- **Parent-death detection**: Sidecar monitors stdin; when Tauri exits, stdin closes and the sidecar shuts down
- **Dev mode**: `npx tauri dev` runs `npm run dev` (Vite + sqlui-server on port 3001), sidecar is skipped
- **Production**: All JS dependencies are bundled into a single `sqlui-server.js` via `vite.sqlui-server.sidecar.config.ts`
- **System Node.js required**: The sidecar uses the system's `node` binary (Node 22+). `find_system_node()` in `src-tauri/src/lib.rs` probes fnm/nvm/volta/mise/homebrew paths since GUI apps don't inherit shell PATH

### Tauri-Specific Gotchas

- **CSP**: `tauri.conf.json` must allow `connect-src http://127.0.0.1:*` and `https://api.github.com`. Use `dangerousDisableAssetCspModification: ["style-src"]` for MUI/Emotion
- **crossorigin attributes**: Vite adds `crossorigin` to `<script>`/`<link>` tags which breaks `tauri://` protocol. The `strip-crossorigin` plugin in `vite.frontend.config.ts` removes them
- **CORS**: The Hono server applies `Access-Control-Allow-Origin: *` because the frontend runs on `tauri://localhost`
- **`src-tauri/resources/`**: Must exist before `cargo build`. In CI, run `mkdir -p src-tauri/resources && npm run build:tauri` before `cargo test` or `tauri build`
- **App location**: Production `.app` must run from `/Applications/` or DMG mount
- **Windows `windows_subsystem` attribute MUST live on the binary root (`src-tauri/src/main.rs`), never on `lib.rs`.** The inner attribute `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` is silently ignored on `lib.rs` — Rust accepts it, but the binary's PE subsystem header is unchanged, so the release `.exe` ships as a console-subsystem app and pops a console window on every launch (and on every child spawn). Symptom: bundled Tauri app shows a black terminal window alongside the GUI, and the `Sidecar: …` `println!` output is visible — meaning the parent has a console of its own. **Fix history**: v3.1.9 moved the attribute from `lib.rs` to `main.rs`. There is a regression test (`windows_subsystem_attribute_lives_on_binary_root` in `lib.rs`) that fails the build if it drifts back. Adding `CREATE_NO_WINDOW` to child spawns alone cannot fix this — the console window is the parent's.
- **Every Windows child spawn must apply `CREATE_NO_WINDOW` (`0x08000000`)** via `std::os::windows::process::CommandExt::creation_flags`. `spawn_sidecar()` and the `find_system_node()` probes in `lib.rs` already do this. If you add a new `Command::new(...)` on a Windows path, mirror the pattern (`#[cfg(target_os = "windows")] cmd.creation_flags(CREATE_NO_WINDOW);`) — otherwise short-lived children will flash their own console.
- **Scope: Windows-only.** Both the `windows_subsystem` PE header and the `CREATE_NO_WINDOW` creation flag are Win32-only abstractions. macOS and Linux do not auto-allocate a terminal for a child process — a GUI parent launched from Finder / `.desktop` / app launcher has no controlling terminal, child stdio inherits null fds, and no window appears. Don't bother conditionally hiding consoles on non-Windows targets.

### Frontend/Backend Module Boundary

**The frontend bundle (`src/frontend/`) must NEVER import modules that depend on Node.js APIs (`fs`, `path`, `node:sqlite`, etc.).** Vite builds the frontend for the browser.

Forbidden imports from frontend-reachable code:

- `PersistentStorage.ts`, `PersistentStorageJsonFile.ts`, `PersistentStorageSqlite.ts`, `PersistentStorageMigration.ts`
- `node:fs`, `node:path`, `node:sqlite`
- Any module in `src/common/` that transitively imports the above

**Frontend-reachable `src/common/` code** includes `DataScriptFactory.ts`, all adapter `scripts.ts` files, and anything they import. These must be pure (no I/O, no Node.js APIs).

**If the frontend needs data from storage**, create an API endpoint in `Endpoints.ts` and call it via `ProxyApi`. Never import storage modules into frontend-reachable code.

### Conventions

- **Naming**: All property names in types and data models use **camelCase** — never snake_case
- **HTML Strings**: Use **template literals** for multi-line HTML (e.g., `getConnectionSetupGuide`), not array `.join("")`
- **Timestamps**: All persisted models include `createdAt`/`updatedAt` (epoch ms), auto-set by `PersistentStorage` — do NOT set manually
- **Import Paths**: `tsconfig.json` uses `baseUrl: "."`, so imports are root-relative: `import Foo from 'src/common/adapters/...'`

### Directory Structure

- **`src/frontend/`** - React 19 UI (MUI v9, React Query, Monaco Editor, React Router v7)
- **`src-tauri/`** - Tauri v2 Rust shell (sidecar management, native menus, window lifecycle)
- **`src/common/`** - Shared backend: database adapters, API endpoint handlers, persistent storage
- **`src/sqlui-server/`** - Hono server (Tauri sidecar in production, standalone in dev)
- **`typings/index.ts`** - Central type definitions

### Database Adapter Pattern

All database engines implement `IDataAdapter` (authenticate, getDatabases, getTables, getColumns, execute, disconnect). `DataAdapterFactory` creates the correct adapter based on connection dialect. `DataScriptFactory` generates dialect-specific scripts. Adapter implementations live in `src/common/adapters/`.

Key rules:

- `disconnect()` is the SOLE cleanup method — **never** call it internally within adapter methods. Called exclusively by the caller in `finally` blocks.
- **Persistent Storage factory functions** (`getConnectionsStorage`, `getQueryStorage`, etc.) must always be used — never instantiate `PersistentStorage` / `PersistentStorageSqlite` directly.

### Adding a New Database Adapter

1. Add a new dialect value in `typings/index.ts`
2. Create adapter in `src/common/adapters/` (see `_SampleDataAdapter_/` for template)
3. Register in `DataAdapterFactory.ts` and `DataScriptFactory.ts`
4. Add dialect icon as PNG in your adapter directory, import it in `scripts.ts`, and return it from `getDialectIcon()`
5. Add script spec tests in `DataScriptFactory.spec.ts` (auto-generates `guides.md` — never edit that file manually)

See CONTRIBUTING.md for the full step-by-step guide.

## Testing

- Tests use Vitest (config in `vitest.config.ts`; integration config in `vitest.integration.config.ts`)
- Unit tests are co-located with source files as `*.spec.ts`/`*.spec.tsx`
- Integration tests: `*.integration.spec.ts` naming, excluded from `npm run test-ci`, require Docker
- Cloud-based adapter tests require env vars (`TEST_AZ_TABLE_STORAGE_CONNECTION`, etc.) — auto-skip when not set. Map secrets in `.github/workflows/integration-test.yml`
- **SECURITY: `TEST_*_CONNECTION` env vars contain real credentials. NEVER log or expose them.**
- **Test data convention:** Use fictional company names (Acme, Globex, Initech). Never use real data.

### Frontend Test Conventions

- All `jsdom` tests must start with `// @vitest-environment jsdom`
- Use `@testing-library/react` for component tests
- Mock hooks with `vi.mock("src/frontend/hooks/...")` at the top of the file
- Mock `useSetting` with `useLayoutModeSetting: () => "compact"` when components use layout mode
- Mock `CodeEditorBox` when testing components that use Monaco editor
- Prefer `toContain` over `toEqual` for text assertions
- Use `toMatchInlineSnapshot` for empty/null render checks

## GitHub Raw File URLs

Always use the `?raw=1` blob URL format: `https://github.com/{owner}/{repo}/blob/head/{path}?raw=1`

Do NOT use `api.github.com/repos/.../contents/` or `raw.githubusercontent.com`.

## Pre-commit Checklist

After **all** changes are complete, run `npm run validate` once. Do NOT run it after each atomic change.

Additionally:

1. **Always add TSDoc for ALL code in every change.** See the Documentation section below.
2. **Update docs** when making significant changes:
   - **CONTRIBUTING.md** — When adding or modifying database adapters
   - **README.md** — For new features and adapter changes (semi-major only)

## Error Handling Convention

In catch blocks, always use `console.error` (never `console.log`) with a label `"FileName:functionName"`:

```typescript
} catch (err) {
  console.error("FileName:functionName", err);
}
```

- For endpoint handlers: `console.error(\`Endpoints.ts:handler [GET /api/...]\`, err)`
- Unused parameters: prefix with `_` (e.g., `_input`, `_dialect`)
- **Exception — `useActionDialogs` wraps:** Use `catch (_err) {}` (no console.error — dismissals are expected)

## Build Verification

After any build-related or Vite config change, run the affected build task:

- Frontend changes: `npm run build`
- Tauri/sidecar changes: `npm run build:tauri && npx tauri build`
- Server changes: `npm run build-server`
- Shared backend changes (`src/common/`): run all three builds

## Build Configuration

- React app: Vite (`vite.frontend.config.ts`, via `rolldown-vite` alias — Rust bundler, ~11x faster prod builds) — dev server on port 3000, proxy to port 3001
- Tauri sidecar bundle: Vite SSR (`vite.sqlui-server.sidecar.config.ts`) — single-file `sqlui-server.js`
- Server: Vite SSR (`vite.sqlui-server.config.ts`) — `build/sqlui-server.js`
- Portal bundle: Vite SSR (`vite.sqlui-portal.config.ts`) — `dist/portal/sqlui-portal.js`
- Rust/Tauri CI builds use sccache (`RUSTC_WRAPPER`) backed by the GitHub Actions cache
- Vitest: `vitest.config.ts` (unit) + `vitest.integration.config.ts` (integration)
- oxfmt: 140 char width (`printWidth`), 2-space indent (`.oxfmtrc.json`)
- NODE_VERSION: 24 (use `fnm` to switch: `fnm use 24`)

## Code Coverage Thresholds

**Two coverage gates run in CI; both fail the build on regression. Source-of-truth lives in code/CI, not in this doc — never hard-code numbers here.**

- **Frontend / JS-TS (Vitest + V8):** Thresholds enforced in `vitest.config.ts` under `test.coverage.thresholds` (statements / branches / functions / lines). The same baselines are mirrored as `MIN_*` env vars in `.github/workflows/build-main.yml` and `.github/workflows/integration-test.yml` for the step-summary table. Vitest is the enforcement gate; the bash check is defense-in-depth.
- **Rust / Tauri (`cargo-llvm-cov`):** Thresholds enforced by the `rust_unit_tests` job in `.github/workflows/integration-test.yml` as `MIN_LINES` / `MIN_REGIONS` / `MIN_FUNCTIONS`. JSON summary is at `src-tauri/rust-coverage.json` (uploaded as `rust-coverage` artifact). Scope: `src-tauri/src/**/*.rs`, `--lib` target only — code gated by `#[cfg(not(debug_assertions))]` / `#[cfg(target_os = ...)]` is excluded.

When raising the floor: bump in both places (Vitest config + workflow `MIN_*` env) for JS/TS; bump the workflow `MIN_*` env for Rust. Never lower without an explicit reason.

## Documentation (TSDoc)

When writing or modifying non-test source code, add **TSDoc** comments to all exported functions, classes, components, hooks, types, interfaces, and constants. Document _what_ and _why_, not the types. Script files must start with a `/** Description. */` file header.

- **Use TSDoc**, not JSDoc. Avoid `@param {string}` type annotations.
- **Skip TSDoc for**: test files (`*.spec.*`), `_Sample*` files, and `sw*.js` files.
- **`@param`** — describe semantics: `@param connectionId - The connection to refresh`
- **`@returns`** — describe what the caller gets back when not obvious from the return type.
- **Migration note:** When touching a file with JSDoc-style comments, convert to TSDoc (remove `{type}` annotations).

## CI / Release Workflows

Use `/release-official` and `/release-beta` skills for interactive triggering from Claude Code.

- **`release-official.yml`** — Delegates to `package.yml` for full release lifecycle (format, build, test, publish, deploy)
- **`release-beta.yml`** — Standalone beta workflow using shared composite actions from `synle/workflows/actions/release/`

## Git / PR Merge Policy

- Always use **squash and merge** when merging PRs. Never use merge commits or rebase merges.
- **Always rebase before pushing** (`git pull --rebase` before `git push`).
- You may `git merge origin/main` locally to sync branches, but PR merges must always be squash merges.
