# Architecture

SQLUI Native shares one React frontend and one Node.js backend across desktop, browser development, and portal distributions. Tauri supplies the native desktop shell, not a separate database implementation.

`AGENTS.md` owns change constraints. `DEV.md` owns setup, commands, packaging, and validation procedures. This map describes current source, not unimplemented plan proposals.

## Runtime Paths

```text
Packaged desktop
  Tauri webview: build/ frontend
    → ProxyApi: http://127.0.0.1:<dynamic-port>/api/*
      → Node sidecar: Hono → Endpoints → adapters / storage

Browser and Tauri development
  Vite: localhost:3000
    → /api proxy: localhost:3001
      → standalone Hono → Endpoints → adapters / storage

Portal
  Node portal: configurable host, default port 19378
    → static React frontend and /api/* on the same server
      → shared Hono / Endpoints → adapters / storage
```

### Packaged Desktop

`src-tauri/src/main.rs` enters `lib.rs`, which owns windows, native menus, commands, and sidecar lifecycle.

1. `spawn_sidecar()` prefers the bundled Node executable in resources. `find_system_node()` is a fallback, not the normal packaged-runtime dependency.
2. Rust launches `resources/sqlui-server.js` with `SIDECAR_PORT=0`, piped stdin/stdout, and the configured resource paths.
3. `src/sqlui-server/index.ts` binds to `127.0.0.1` on an OS-assigned port and prints `__SIDECAR_PORT__=<port>`.
4. Rust reads stdout through a worker/channel with a 15-second startup deadline, then stores the port in `SidecarState`.
5. `ProxyApi` invokes `get_sidecar_port` and caches the sidecar base URL. Debug builds return port 0 and keep relative API URLs.

Closing the Tauri parent closes the stdin pipe. Node handles stdin closure and termination signals; Rust also owns child shutdown and force-kill fallback.

The frontend still comes from Tauri's `frontendDist`. The sidecar can additionally serve the embedded frontend when its sibling asset JSON exists.

### Development

Tauri's `beforeDevCommand` runs `npm run dev`; Rust skips sidecar creation in debug builds. Browser development uses the same frontend/server pair without the native shell.

`startStandalone()` binds to loopback port 3001. Unlike sidecar mode, standalone mode does not use parent-stdin shutdown detection.

The current standalone startup forcibly frees an occupied port. See `DEV.md` before launching it alongside other processes.

### Portal

`src/sqlui-server/portal.ts` initializes the shared endpoints, mounts frontend assets, imports positional connection inputs, and starts the server.

- Default binding: `0.0.0.0:19378`, making the portal reachable on the LAN.
- `--host 127.0.0.1` restricts binding to loopback.
- An occupied requested port causes one retry on an OS-assigned port; the startup banner reports the actual URL.
- Positional dialect URLs and SQLite paths pass through `portalHelpers.ts`, normalization, and connection deduplication.
- The server creates the `portal` session and injects `window.__SQLUI_PORTAL_SESSION__` into `index.html`.
- `src/frontend/data/session.tsx` uses that bootstrap only when no per-window session is already stored. It is a default selection, not authentication.

Storage precedence is:

1. `--home-dir` / `--config-path`.
2. `--use-desktop-storage`, selecting `~/.sqlui-native/`.
3. An existing `SQLUI_HOME_DIR`.
4. The portal default, `~/.sqlui-portal/`.

All storage selection must finish before the first storage operation. Import order alone does not determine the cached storage directory.

## Module Ownership

| Area                                                                | Responsibility / entry points                                                                             |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/frontend/`                                                     | React UI, React Query hooks, query tabs, Monaco, result rendering, platform bridges                       |
| `src/frontend/data/api.tsx`                                         | `ProxyApi`, API base URL discovery, request/session headers                                               |
| `src/frontend/platform/`                                            | Tauri/browser platform integration; Electron compatibility code remains, but current packaging uses Tauri |
| `src/common/Endpoints.ts`                                           | Shared API registration and application operations                                                        |
| `src/common/adapters/DataAdapterFactory.ts`                         | Dialect routing, metadata/cache orchestration, adapter lifecycle                                          |
| `src/common/adapters/FileDataAdapter/`                              | Node-only, read-only local JSON/JSONC/YAML/TOML/XML parsing and query evaluation                          |
| `src/common/adapters/DataScriptFactory.ts` and adapter `scripts.ts` | Browser-safe query templates, dialect metadata, icons, setup guides                                       |
| `src/common/PersistentStorage*.ts`                                  | Storage facade, implementations, and migration support                                                    |
| `src/common/utils/`                                                 | Shared helpers, error classification, concurrency limiting, in-flight execution registry                  |
| `src/sqlui-server/server.ts`                                        | Hono application, CORS, file/health routes, endpoint initialization, static mounting                      |
| `src/sqlui-server/index.ts`                                         | Desktop sidecar and standalone server lifecycle                                                           |
| `src/sqlui-server/portal.ts`                                        | Portal CLI, storage selection, session bootstrap, single-port hosting                                     |
| `src-tauri/`                                                        | Rust desktop shell and bundle configuration                                                               |
| `typings/index.ts`                                                  | Shared data models, dialects, query/result contracts                                                      |
| `scripts/` and `vite*.config.mts`                                   | Version synchronization, bundling, embedded assets, native resources                                      |

The browser bundle may reach pure modules under `src/common/`, but never Node-backed adapters or storage implementations. Add an endpoint instead of crossing that boundary.

### HTTP and Sessions

`ProxyApi` sends `sqlui-native-session-id`; the backend uses that header to select session-scoped data. It is not an authorization token.

`Endpoints.ts` still adapts Hono requests to buffered Express-style `(req, res)` handlers. Existing handler syntax does not imply an Express server dependency.

`server.ts` registers file-upload, file-save, and health routes, while `initializeEndpoints()` registers shared application routes. Static SPA fallback excludes `/api/*` requests.

## Query Execution and Cancellation

The execute endpoint looks up the saved connection, creates an adapter, and calls `execute(sql, database, table)`. Cleanup remains caller-owned in `finally`.

When a valid client `executionId` exists, the endpoint registers the adapter under `connectionId:executionId` before execution and unregisters it during cleanup.

The Stop button in `QueryBox` calls the cancel endpoint through `ProxyApi.cancelExecution`. The registry returns `cancelled`, `not_found`, `unsupported`, or `idle`; endpoint exceptions produce an error response.

Server-side cancellation currently exists in the relational adapters:

- PostgreSQL: `pg_cancel_backend` over a side connection.
- MySQL/MariaDB: `KILL QUERY` over a side connection.
- MSSQL: the active driver's cancellation operation.

A successful cancellation request does not prove the query has already settled. The UI waits for the execution response after a `cancelled` outcome.

If cancellation is unsupported or fails, the UI can abandon the run and ignore its late result. That does not stop database work.

Execute failures preserve HTTP 200 and return `ok: false` with `errorKind`. `src/common/utils/errorUtils.ts` classifies errors from driver codes, including cancellation, rather than message matching.

## Local Document Queries

`FileDataAdapter` reads one local JSON, JSONC, YAML/YML, TOML, or XML file through backend-only parsers. Each operation that needs contents reads the file again.

`localAccess.ts` derives access from the runtime's bind host. The adapter checks that gate before reading; network-bound portal mode cannot enable file reads through a connection URI.

`queryParser.ts` evaluates a restricted `res_json`/`display(...)` grammar with query-length and evaluation-step limits. It does not evaluate arbitrary JavaScript; assignments change the in-memory query value, never the source file.

Successful execution returns `raw: [result]` plus `meta.isFileData`, `meta.rawSource`, and `meta.sourceFormat`. `ResultBox/FileDataResultBox.tsx` uses that metadata for formatted output and exact source-text tabs.

See `CONTRIBUTING.md#local-structured-text-file-adapter` for parser ownership, supported operations, size limits, and extension tests.

## Metadata and Storage

`DataAdapterFactory.ts` serves cached metadata and refreshes stale entries in the background. Refresh work creates its own adapter and disconnects it independently of the foreground caller.

Uncached table discovery uses `allSettledWithLimit`; the concurrency constant lives in the factory. Column metadata loads lazily and feeds cached schema/autocomplete paths.

The `PersistentStorage.ts` facade currently re-exports JSON-backed factories by default. SQLite storage and migration support exist, but their presence does not mean all normal consumers have migrated.

`getStorageDir()` in `PersistentStorageJsonFile.ts` resolves `SQLUI_HOME_DIR` on its first call, falls back to `~/.sqlui-native/`, and caches the path.

JSON writes use a sibling temporary file and rename. Storage adds timestamps; consumers use factories instead of selecting an implementation directly.

## Editor and Frontend Bundling

`CodeEditorBox/AdvancedEditor.tsx` owns Monaco instances, completion providers, and model reuse. Option changes apply in place; cleanup disposes the editor while the model cache controls retained undo history.

SQL completion filtering lives in `src/frontend/utils/sqlCompletionContext.ts`:

- Table positions filter suggestions to databases/tables.
- Table or alias qualifiers resolve known columns; database qualifiers select table suggestions.
- Unknown contexts retain the full suggestion list.
- Alias matching uses a regex heuristic; comma-join aliases after the first table and subquery aliases are not fully resolved.

`monacoSetup.ts` includes editor and JSON workers plus basic-language grammars. TypeScript and HTML language services are intentionally absent; syntax highlighting remains.

`vite.frontend.helpers.mts` owns vendor grouping and build-target resolution. `vite.frontend.config.mts` calls those helpers and strips HTML `crossorigin` attributes for Tauri protocol compatibility.

React-core packages share one vendor chunk to avoid circular initialization failures. Keep chunk-selection logic in the helper module so tests need not import the full build config.

## Distribution and Embedded Assets

`vite.sqlui-server.config.mts` produces the standalone server bundle. `vite.sqlui-server.sidecar.config.mts` bundles JavaScript dependencies for desktop resources.

`emitEmbeddedAssetsPlugin` in `scripts/vite-plugin-embed-frontend.mts` writes the built frontend as a base64 map into a sibling JSON file:

- Sidecar: `sqlui-server.js` plus `sqlui-server-assets.json`.
- Portal: `sqlui-portal.js` plus `sqlui-portal-assets.json`.

Runtimes extract these assets into per-process temporary directories and call `mountStaticAssets()`. Keep large asset maps out of Vite `define`; inlining causes excessive minifier expansion.

The portal build also emits a launcher, package metadata, and a versioned tarball. Tauri's preparation script copies server artifacts and the target-specific Node executable into native resources.

## Current Security Boundaries and Open Work

**The current API is not an authenticated service.** `server.ts` permits wildcard CORS, and the portal exposes the shared application on the LAN by default.

The local document adapter reads host files and enables access only for loopback-bound runtimes. The portal disables it on non-loopback binds, including its default `0.0.0.0` host; use `--host 127.0.0.1` for local file connections. Filesystem errors retain safe error codes but redact absolute paths from responses and logs. This gate does not add authentication or make other portal data safe to expose.

`/api/file/save` accepts a caller-supplied absolute path and writes content. Current checks do not restrict writes to paths approved by a native save dialog.

Saved connection strings can contain plaintext credentials. Neither a session header nor a loopback binding should be described as a credential-protection mechanism.

Use disposable profiles and loopback portal binding for local testing. Do not expose real saved credentials or treat the portal as a multi-user authorization boundary.

Per-launch API tokens, stricter CORS, per-path file authorization, keychain storage, pooled adapter caching, and streaming row limits remain enhancement proposals, not documented guarantees.
