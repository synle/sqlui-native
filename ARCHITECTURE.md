# sqlui-native — Architecture

## High-Level Overview

sqlui-native is a cross-platform desktop SQL/NoSQL client packaged as a Tauri v2
application. It is a minimal, multi-database UI supporting MySQL, MariaDB, MS SQL
Server, PostgreSQL, SQLite, Cassandra, MongoDB, Redis, Azure Cosmos / Table
Storage, GraphQL, REST, and Salesforce.

Runtime model: Tauri shell + Node.js sidecar.

- **Tauri shell (Rust)** owns the window, the native menu, the OS-level commands
  (file dialogs, file-explorer, platform info), and the lifecycle of a child
  Node.js process. The Rust entry point lives in `src-tauri/src/lib.rs` and
  exposes a small set of `#[tauri::command]` handlers (`get_sidecar_port`,
  `get_platform_info`, `open_in_file_explorer`, `read_file_content`).
- **Node.js sidecar (`sqlui-server`)** is a Hono HTTP server that owns the
  database drivers. The Rust shell spawns it on startup, reads its bound port
  from stdout (`__SIDECAR_PORT__=…`), and tears it down on exit. In dev mode the
  sidecar is launched by `npm run dev`; in release builds the shell uses a
  bundled `node` binary (downloaded by `scripts/download-node.js`) or falls back
  to a system Node located by probing common version-manager paths
  (`fnm`, `nvm`, `volta`, `mise`, `asdf`, Homebrew, …).
- **React frontend** is a Vite-built SPA loaded into the Tauri webview. It
  resolves the sidecar port via the Rust `get_sidecar_port` command and issues
  HTTP requests against `http://127.0.0.1:<port>/api/...`.

Request flow: UI → React Query hook → `/api/...` HTTP → Hono routes
(`src/sqlui-server/server.ts`) → endpoint registrations in
`src/common/Endpoints.ts` → a `DataAdapter` selected by
`DataAdapterFactory` → driver (mysql2, pg, mongodb, redis, tedious,
cassandra-driver, jsforce, …) → response back to React Query.

A second deployment target, **sqlui-portal**, reuses the same frontend + server
code to build a hosted browser app (no Tauri shell). The build pipeline for it
lives in `scripts/build-portal.js` and `vite.sqlui-portal.config.ts`.

## Key Directories

- `src/` — TypeScript sources for both the frontend and the Node sidecar.
  - `src/index.tsx` — React entry: providers, theme, HashRouter, route table.
  - `src/frontend/` — React UI.
    - `components/` — leaf-level React components (`QueryBox`, `DataTable`,
      `ConnectionForm`, `CommandPalette`, `MissionControl`, …).
    - `views/` — page-level routes (`MainPage`, `NewConnectionPage`,
      `EditConnectionPage`, `BookmarksPage`, `MigrationPage`,
      `RelationshipChartPage`, `RecordPage`, …).
    - `hooks/` — React Query hooks and context providers
      (`useConnection`, `useConnectionQuery`, `useSession`, `useSchema`,
      `useActionDialogs`, `useDataSnapshot`, …).
    - `data/` — HTTP client (`api.tsx`), session, file upload, config,
      connection throttle.
    - `platform/` — runtime detection and adapters: `tauri.ts`, `electron.ts`
      (legacy), `browser.ts`, with `index.ts` selecting the active one.
    - `layout/`, `styles/`, `utils/` — shell layout, SCSS, helpers.
  - `src/common/` — code shared between frontend and server.
    - `adapters/` — one folder per database family, each implementing
      `IDataAdapter` (`MongoDBDataAdapter`, `RedisDataAdapter`,
      `RelationalDataAdapter`, `CassandraDataAdapter`, `RestApiDataAdapter`,
      `GraphQLDataAdapter`, `SalesforceDataAdapter`,
      `AzureCosmosDataAdapter`, `AzureTableStorageAdapter`).
      `DataAdapterFactory.ts` maps a connection string scheme to an adapter;
      `DataScriptFactory.ts` builds dialect-specific SQL/script snippets.
    - `Endpoints.ts` — wires every adapter operation onto Hono routes.
    - `PersistentStorage*.ts` — local persistence layer with JSON-file and
      SQLite backends plus migrations.
  - `src/sqlui-server/` — Node sidecar entry (`index.ts`), Hono app
    (`server.ts`), and portal entry (`portal.ts`).
- `src-tauri/` — Rust crate for the Tauri shell.
  - `src/lib.rs` — sidecar spawn/kill, native menu, Tauri commands.
  - `src/main.rs` — calls `sqlui_native_lib::run()`.
  - `tauri.conf.json` — window, bundle targets, CSP, build hooks.
  - `Cargo.toml`, `capabilities/`, `icons/`.
- `scripts/` — Node build helpers: `prebuild.js`, `postbuild.js`,
  `download-node.js` (fetches a Node binary per target triple),
  `prepare-sidecar.js` (lays out `resources/` for Tauri to bundle),
  `build-portal.js`, `vite-plugin-embed-frontend.ts`.
- `e2e/` — Playwright end-to-end specs; configured by
  `playwright.config.ts` and `playwright.smoke.config.ts`.
- `.github/workflows/` — CI: `pr-main.yaml`, `build-main.yml`,
  `integration-test.yml`, `package.yml`, `release-official.yml`,
  `release-beta.yml`, plus cleanup jobs.

## Important Files

- `package.json` — npm scripts (`dev`, `start`, `build:tauri`, `build:portal`,
  `test-ci`, `test-e2e`, `test-integration`, `validate`, `dist`), runtime deps
  (database drivers, Hono, MUI, React Query, Monaco), and dev deps (Vite,
  Vitest, Playwright, Tauri CLI).
- `src-tauri/tauri.conf.json` — product name, version, identifier
  (`io.synle.github.sqlui-native`), bundle targets (`dmg`, `nsis`, `deb`,
  `appimage`), CSP, and the `beforeBuildCommand` / `beforeDevCommand` hooks
  that drive Vite.
- `src-tauri/Cargo.toml` — Tauri plugins (`tauri-plugin-shell`,
  `tauri-plugin-dialog`, `tauri-plugin-opener`) and Rust deps.
- `vite.frontend.config.ts` — React/SPA bundle into `build/`.
- `vite.sqlui-server.config.ts` / `vite.sqlui-server.sidecar.config.ts` —
  bundles the Hono server (standalone dev vs. Tauri sidecar).
- `vite.sqlui-portal.config.ts` — hosted-portal build.
- `vitest.config.ts` / `vitest.integration.config.ts` — unit + integration test
  configs. `vitest.setup.ts` provides shared setup.
- `playwright.config.ts`, `playwright.smoke.config.ts` — E2E configs.
- `src/index.tsx` — frontend bootstrap, route table, providers, theme.
- `src/sqlui-server/index.ts` / `server.ts` — sidecar entry and Hono app.
- `src/common/adapters/DataAdapterFactory.ts` — scheme → adapter dispatch.
- `src/common/Endpoints.ts` — REST surface for the sidecar.
- `src-tauri/src/lib.rs` — Rust entry, sidecar lifecycle, native menu.

## Build & Release Flow

Local development (`npm run start` → `tauri dev`):
1. `predev` runs `scripts/prebuild.js`.
2. `tauri dev` invokes `beforeDevCommand` (`npm run dev`), which uses
   `concurrently` to run the Vite frontend (port 3000) and a watched
   sidecar build + `nodemon`-restarted Node server (port 3001).
3. Rust skips spawning a sidecar in debug builds (port reported as `0`),
   and the webview talks to the Vite-proxied dev server.

Desktop production build (`npm run dist` → `tauri build`):
1. `beforeBuildCommand` runs `npm run build:tauri`:
   - `prebuild` → `vite build` (frontend → `build/`) → `build-server-sidecar`
     (Hono server bundle) → `scripts/download-node.js` (fetches a Node binary
     for each target) → `scripts/prepare-sidecar.js` (stages
     `resources/sqlui-server.js`, `resources/node_modules`, and the bundled
     `node` binary).
2. `tauri build` compiles the Rust crate and packages the configured bundle
   targets (`dmg`, `nsis`, `deb`, `appimage`) with `resources/` embedded.
3. At runtime, Rust spawns the bundled Node, reads the port from stdout,
   exposes it to the webview, and force-kills the child on exit.

Portal build (`npm run build:portal`): `scripts/build-portal.js` produces a
browser-only artifact using `vite.sqlui-portal.config.ts`; no Tauri shell, no
sidecar binary.

CI / release:
- `pr-main.yaml` runs lint, typecheck, unit, integration, and Playwright
  suites on PRs.
- `build-main.yml` and `package.yml` build the desktop bundle on main.
- `release-official.yml` and `release-beta.yml` are manually dispatched
  release workflows; they produce signed bundles and publish GitHub releases.
- `cleanup-*.yml` workflows reap stale artifacts and old releases.
