# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SQLUI Native is a cross-platform desktop SQL/NoSQL database client and REST API client supporting MySQL, MariaDB, MSSQL, PostgreSQL, SQLite, Cassandra, MongoDB, Redis, Azure CosmosDB, Azure Table Storage, Salesforce (SFDC), and REST API (curl/fetch). The desktop shell uses **Tauri v2** with a **Node.js sidecar** (Express server).

## Commands

```bash
npm install             # Install dependencies
npm start               # Run in Tauri dev mode (alias for npx tauri dev)
npx tauri dev           # Run Tauri + Vite dev server + sqlui-server
npx tauri build         # Build production Tauri app (.dmg/.exe/.deb)
npm run dev             # Run sqlui-server + Vite dev server at http://localhost:3000 (browser only)
npm run build           # Build frontend (Vite) + sqlui-server
npm run build:tauri     # Build frontend + sidecar bundle + prepare resources for Tauri
npm test                # Run Vitest tests (watch mode)
npm run test-ci         # Run Vitest tests (CI, no watch)
npm run lint            # ESLint with auto-fix
npm run format          # Prettier formatting
npm run typecheck       # TypeScript type check (tsc --noEmit)
npm run validate        # All checks: lint → typecheck → test-ci → format → e2e → smoke → integration
```

**Run a single test file:**

```bash
npx vitest run src/path/to/file.spec.ts
```

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

### Two Runtime Modes

The app runs in **Tauri mode** (`npx tauri dev` / `npx tauri build`) or **browser mode** (`npm run dev`). Both share the same backend code in `src/common/`. The frontend communicates with the backend via HTTP through the sqlui-server (Express). In Tauri mode, the server runs as a **Node.js sidecar process** on a dynamic port. In browser mode, the server runs standalone on port 3001.

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
- **CORS**: Express needs `Access-Control-Allow-Origin: *` because the frontend runs on `tauri://localhost`
- **`src-tauri/resources/`**: Must exist before `cargo build`. In CI, run `mkdir -p src-tauri/resources && npm run build:tauri` before `cargo test` or `tauri build`
- **App location**: Production `.app` must run from `/Applications/` or DMG mount

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
- **`src/sqlui-server/`** - Express server (Tauri sidecar in production, standalone in dev)
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

- Tests use Vitest (config in `vite.frontend.config.ts`)
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

- React app: Vite (`vite.frontend.config.ts`) — dev server on port 3000, proxy to port 3001
- Tauri sidecar bundle: Vite SSR (`vite.sqlui-server.sidecar.config.ts`) — single-file `sqlui-server.js`
- Server: Vite SSR (`vite.sqlui-server.config.ts`) — `build/sqlui-server.js`
- Prettier: 140 char width, single quotes, trailing commas, 2-space indent
- NODE_VERSION: 24 (use `fnm` to switch: `fnm use 24`)

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
