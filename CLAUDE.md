# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SQLUI Native is a cross-platform Electron desktop SQL/NoSQL database client and REST API client supporting MySQL, MariaDB, MSSQL, PostgreSQL, SQLite, Cassandra, MongoDB, Redis, Azure CosmosDB, Azure Table Storage, Salesforce (SFDC), and REST API (curl/fetch).

## Commands

```bash
npm install             # Install dependencies
npm start               # Run in Electron (dev mode)
npm run dev             # Run sqlui-server + Vite dev server at http://localhost:3000
npm run build           # Build frontend (Vite) + Electron + sqlui-server
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

**Debug shortcut:** `Ctrl+Shift+Alt+D` (Windows/Linux) or `Cmd+Shift+Option+D` (Mac) toggles React Query Devtools in packaged builds. Also available via Command Palette (`Cmd+P` / `Ctrl+P`) as "Toggle React Query Devtools".

## Architecture

### Two Runtime Modes

The app runs in **Electron mode** (`npm start`) or **browser mode** (`npm run dev`). Both share the same backend code in `src/common/`. In both modes, the frontend communicates with the backend via HTTP through the sqlui-server (Express). In Electron mode, the server is embedded in the main process on a dynamic port. In browser mode, the server runs standalone on port 3001.

### Frontend/Backend Module Boundary

**The frontend bundle (`src/frontend/`) must NEVER import modules that depend on Node.js APIs (`fs`, `path`, `electron`, `node:sqlite`, etc.).** Vite builds the frontend for the browser — Node.js modules are either stubbed (breaking at runtime) or unbundleable (native addons).

Forbidden imports from frontend-reachable code:

- `PersistentStorage.ts`, `PersistentStorageJsonFile.ts`, `PersistentStorageSqlite.ts`, `PersistentStorageMigration.ts`
- `electron`, `node:fs`, `node:path`, `node:sqlite`
- Any module in `src/common/` that transitively imports the above

**Frontend-reachable `src/common/` code** includes `DataScriptFactory.ts`, all adapter `scripts.ts` files, and anything they import (e.g., `renderCodeSnippet.ts`). These run on both frontend and backend — they must be pure (no I/O, no Node.js APIs).

**If the frontend needs data from storage**, create an API endpoint in `Endpoints.ts` and call it via `ProxyApi`. Never import storage modules into frontend-reachable code.

### Naming Convention

All property names in type definitions and data models use **camelCase** — never snake_case. This applies to all fields including timestamps (`createdAt`, `updatedAt`), identifiers (`connectionId`, `sessionId`), and flags (`allowNull`, `primaryKey`). Follow this convention when adding new properties.

### HTML Strings

When returning multi-line HTML strings (e.g., from adapter methods like `getConnectionSetupGuide`), use **template literals** (backticks) with the HTML written inline — do NOT use array `.join("")`. Example:

```typescript
getConnectionSetupGuide(): string {
  return `
    <strong>Title</strong>
    <ol>
      <li><strong>Step 1</strong> -- Description here.</li>
      <li><strong>Step 2</strong> -- Another description.</li>
    </ol>
  `;
}
```

### Timestamps

All persisted models (`Session`, `ConnectionProps`, `ConnectionQuery`, `FolderItem`, `DataSnapshot`) include `createdAt` and `updatedAt` fields (epoch ms). These are **auto-set by `PersistentStorage`** — `createdAt` and `updatedAt` on `add()`, `updatedAt` on `update()`. Do NOT set them manually in endpoint handlers.

### Directory Structure

- **`src/frontend/`** - React 19 UI (MUI v9, React Query, Monaco Editor, React Router v7)
- **`src/frontend/platform/`** - Platform abstraction layer (Electron vs browser). Auto-detects environment at import time.
- **`src/electron/`** - Electron main process (window management, embedded server, IPC for menus/shell)
- **`src/common/`** - Shared backend: database adapters, API endpoint handlers, persistent storage
- **`src/sqlui-server/`** - Express server wrapping the shared backend (embedded in Electron, standalone in dev)
- **`typings/index.ts`** - Central type definitions (`SqluiCore`, `SqluiFrontend`, `SqlAction`, `SqluiEnums`)

### Import Paths

`tsconfig.json` uses `baseUrl: "."`, so imports are root-relative: `import Foo from 'src/common/adapters/...'` (not `../../`).

### Database Adapter Pattern

All database engines implement `IDataAdapter` (authenticate, getDatabases, getTables, getColumns, execute, disconnect). `DataAdapterFactory` creates the correct adapter based on connection dialect. `DataScriptFactory` generates dialect-specific SQL/query scripts. `BaseDataAdapter` provides shared logic (connection string parsing, type inference/resolution). `BaseDataScript` provides shared script generation (select, insert, update, delete, DDL) with dialect-specific overrides.

Adapter implementations live in `src/common/adapters/`:

- `RelationalDataAdapter` - Per-dialect adapters using native drivers (no ORM):
  - `sqlite/` — `node:sqlite` (`DatabaseSync`, built-in, no native compilation)
  - `mysql/` — `mysql2/promise`
  - `mariadb/` — extends MySQL adapter (protocol-compatible)
  - `postgres/` — `pg` (node-postgres)
  - `mssql/` — `tedious` (promisified wrapper)
  - `index.ts` — factory function `createRelationalDataAdapter()` that routes to the correct adapter by dialect
  - `scripts.ts` — shared SQL script generation for all relational dialects
- `CassandraDataAdapter`, `MongoDBDataAdapter`, `RedisDataAdapter`, `AzureCosmosDataAdapter`, `AzureTableStorageAdapter`, `SalesforceDataAdapter`
- `RestApiDataAdapter` - REST API client (curl/fetch syntax, executed via system curl)

Each adapter directory contains `index.ts` (adapter class) and `scripts.ts` (ConcreteDataScripts class with dialect-specific query generators). Some also have `utils.ts` for client configuration helpers.

**Connection String Formats:**

Connection strings are prefixed with a dialect scheme (`dialect://...`) but the format after the scheme varies:

- **URL** (relational databases, Cassandra, MongoDB, Redis): Standard URI — `dialect://user:pass@host:port` (e.g., `mysql://root:pass@localhost:3306`)
- **JSON** (SFDC, REST API): JSON object — `sfdc://{"username":"...","password":"..."}` or `rest://{"HOST":"https://api.example.com"}`
- **Microsoft-style** (Azure Table Storage, CosmosDB): Semicolon-delimited key=value pairs — `aztable://DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...`

**Adapter Connection Lifecycle:**

- Each adapter manages its own connection(s) as instance state. Connection strategies vary by driver:
  - **SQLite** (`node:sqlite`): Single synchronous `DatabaseSync` instance. All operations are sync wrapped in async.
  - **MySQL/MariaDB** (`mysql2/promise`): Connection pool (`pool.getConnection()`). Database switching via `USE` statement.
  - **PostgreSQL** (`pg`): Map of `pg.Client` instances per database (PG doesn't support `USE` — requires new connection per database).
  - **MSSQL** (`tedious`): Creates new `Connection` per database. Callback-based API wrapped in promises.
- `disconnect()` is the SOLE cleanup method — it closes all connections and clears state. It must **never** be called internally by adapter methods. It is called exclusively by the **caller** (`Endpoints.ts`, `DataAdapterFactory`, or tests) in `finally` blocks after all operations complete.
- **SFDC auto-refresh:** The `SalesforceDataAdapter` wraps all operations in `withAutoRefresh()`, which detects `INVALID_SESSION_ID` / `Session expired` errors and automatically re-authenticates (for Client Credentials flow where no refresh token is available). The OAuth2 token request uses Node's native `https` module instead of jsforce's internal HTTP client, which hangs in bundled Electron builds.
- **REST API (stateless):** The `RestApiDataAdapter` has no persistent connection. Each `execute()` call parses the curl/fetch command, resolves `{{VAR}}` placeholders, and spawns a `curl` subprocess. `authenticate()` just validates the JSON config. `disconnect()` is a no-op. The `HOST` field from the connection string JSON is auto-injected as the `{{HOST}}` variable.

### REST API Adapter

`RestApiDataAdapter` maps the standard adapter interface to HTTP requests:

- **Connection** = API collection (e.g., "GitHub API") with a `HOST` and variables
- **Database** = Folder for organizing requests (default: "Default")
- **Table** = Saved request (e.g., "GET /users")
- **Columns** = Request metadata fields (method, url, headers, params, body, bodyType)
- **execute()** = Parse curl/fetch syntax → resolve variables → spawn curl → return response

**Connection string:** `rest://{"HOST":"https://api.example.com","variables":[{"key":"TOKEN","value":"abc","enabled":true}]}`

**Dual syntax:** Auto-detects `curl` vs `fetch()` input. Both are parsed into `RestApiRequest` and executed via the system `curl` binary. `curlParser.ts` and `fetchParser.ts` handle parsing; `requestParser.ts` auto-routes.

**Variable system:** `{{VAR}}` placeholders resolved by `variableResolver.ts`. 4-layer priority (folder > environment > collection > global). Built-in dynamic variables: `{{$timestamp}}`, `{{$isoTimestamp}}`, `{{$randomUUID}}`, `{{$randomInt}}`.

**File uploads / multipart form data:** `-F`/`--form` flags are preserved as individual `formParts` on `RestApiRequest` (not merged into `body`). The executor passes each `-F` flag directly to the system `curl` binary, which handles multipart boundaries and `@file` references natively. Example: `curl -X POST '{{HOST}}/post' -F 'file=@/path/to/file' -F 'description=my upload'`.

**Curl flag support:** The parser recognizes and passes through these curl flags: `-X` (method), `-H` (headers), `-d`/`--data`/`--data-raw` (body), `-F`/`--form` (multipart), `-u` (basic auth), `-b` (cookies), `-L` (follow redirects), `-k` (insecure), `--max-time`/`-m` (request timeout), `--connect-timeout` (connection timeout), `-x`/`--proxy` (proxy URL). Timeout and proxy flags are passed directly to the system curl binary.

**Unresolved variable warnings:** After variable resolution, any remaining `{{VAR}}` placeholders are detected by `findUnresolvedVariables()` and surfaced in the result metadata. `RestApiResultBox` displays a warning banner listing undefined variables.

**Execution:** `curlExecutor.ts` spawns `curl` with `--write-out` for timing metrics (DNS, connect, TLS, TTFB, total) and `-i` for response headers. Response is parsed into structured `RestApiResponse` with status, headers, body, cookies, timing, and size. Duplicate response headers (e.g., multiple `Set-Cookie`) are joined with `, ` per HTTP spec; individual cookies are still parsed into a separate map.

**Code snippets:** REST API supports code generation via Mustache templates (`javascript.rest.mustache`, `python.rest.mustache`, `java.rest.mustache`). The curl/fetch command is parsed to extract URL, method, headers, and body, then interpolated into language-specific templates (fetch API for JS, `requests` for Python, `HttpClient` for Java).

**Context menus:** Database (folder) context menu shows "New Request" templates (curl/fetch × GET/POST JSON/POST form/PUT JSON/PUT form/PATCH/DELETE). Connection context menu hides "Refresh" and "Test Connection" (not applicable for stateless HTTP).

**Managed metadata ID strategy:**

- **Databases (folders):** `id === name` — the folder name is the identifier (set explicitly on create via `id: name`).
- **Tables (requests):** UUID-based IDs auto-generated by `PersistentStorage` (format: `managedTables.<timestamp>.<random>`). The `name` field is the human-readable display name (e.g., "GET Request", "POST JSON"). The `id` is never shown to users.
- `TableMetaData` has an optional `id` field. For managed tables, `id` carries the UUID; for regular database tables, `id` is absent and `name` is the identifier. Use `table.id ?? table.name` when you need the lookup key.
- When creating managed tables from the frontend, use the returned `created.id` for subsequent API calls — do NOT use the `name` as a lookup key.

**Export/Import:**

- REST API connection export includes a `managedMetadata` field with all folders and requests (stripping `connectionId`, `createdAt`, `updatedAt` — these are reconstructed on import).
- On import, existing managed metadata is deleted first, then recreated fresh from the import data (always creates new, even in "Keep IDs" mode).
- Export format:
  ```json
  {
    "_type": "connection",
    "id": "connection.123.456",
    "connection": "rest://{\"HOST\":\"https://httpbin.org\"}",
    "name": "My API",
    "managedMetadata": {
      "databases": [{ "name": "Folder 1", "props": { "variables": [...] } }],
      "tables": [{ "name": "GET users", "databaseId": "Folder 1", "props": { "query": "curl {{HOST}}/users" } }]
    }
  }
  ```
- Non-REST-API connections export without `managedMetadata` (backward compatible).

### Backend Schema Caching

`DataAdapterFactory.ts` implements a three-tier persistent disk cache for schema metadata:

- **Databases** (`cache.databases.json`) — cached per connection (`connectionId` key)
- **Tables** (`cache.tables.json`) — cached per database (`connectionId:databaseId` key)
- **Columns** (`cache.columns.json`) — cached per table (`connectionId:databaseId:tableId` key)

All caches use `PersistentStorage` (JSON files in the app data directory). The pattern is **cache-first with background refresh**: on a cache hit, the cached data is returned immediately and a non-blocking background fetch updates the cache for the next call. Background refreshes are deduplicated via a `pendingRefreshes` Set to prevent concurrent fetches for the same resource.

Key functions: `getCachedDatabases`/`setCachedDatabases`, `getCachedTables`/`setCachedTables`, `getCachedColumns`/`setCachedColumns`, `listCachedColumnsByDatabase`, `getCachedSchema` (consolidated read). Clear functions: `clearCachedColumns` (all for a connection), `clearCachedDatabase` (tables + columns for a database), `clearCachedTable` (columns for a table).

**Refresh endpoints** allow users to manually clear caches and re-fetch:

- `POST /api/connection/:connectionId/refresh` — clears all caches, re-authenticates
- `POST /api/connection/:connectionId/database/:databaseId/refresh` — clears table + column caches
- `POST /api/connection/:connectionId/database/:databaseId/table/:tableId/refresh` — clears column cache

**Cached schema endpoint** for lightweight reads (no DB queries):

- `GET /api/connection/:connectionId/database/:databaseId/schema/cached` — returns `{ databases, tables, columns }` from disk cache in one call. Used by QueryBox for autocomplete.

### Frontend Request Throttling

`src/frontend/data/connectionThrottle.ts` provides a per-connection semaphore (`ConnectionThrottle`) that limits concurrent column fetch requests to 3 per connection. This prevents flooding the server when expanding a database with many tables in the tree view.

### Endpoint Pattern

`src/common/Endpoints.ts` defines API handlers mounted as Express routes via `setUpDataEndpoints(app)`. All modes use HTTP. Session ID and Window ID are passed in request headers.

### Session Ping / Keep-Alive

Opened sessions are tracked in-memory by `src/common/utils/sessionUtils.ts` (windowId → sessionId mapping). To prevent stale sessions from blocking selection (e.g., after a browser tab closes without cleanup), a ping/keep-alive mechanism is used:

- **`POST /api/sessions/ping`** — Records a timestamp for the calling window. Called by `SessionManager` on mount, every 1 minute, and on window focus.
- **`GET /api/sessions/opened`** — Before returning, cleans up sessions not pinged within `SESSION_STALE_THRESHOLD_MS` (10 minutes, defined in `Endpoints.ts`). Sessions with no ping record (legacy) are also treated as stale.
- **`sessionUtils.ping(windowId)`** — Updates `lastPing` map. Called on `open()` as well.
- **`sessionUtils.cleanupStaleSessions(thresholdMs)`** — Removes entries from `openedSessions` and `lastPing` where the ping is missing or older than the threshold.

### Frontend State Management

Custom React hooks and context providers instead of Redux: `useSession`, `useConnection`, `useConnectionQuery`, `useSetting`, `useActionDialogs`, `useShowHide`, `useTreeActions`, `useFolderItems`.

Additional hooks: `useToaster` (toast notifications with history), `useClientSidePreference` (localStorage-backed preferences), `useServerConfigs` (server configuration), `useDataSnapshot` (import/export snapshots).

**Hook module organization (under `src/frontend/hooks/`):**

- **`queryKeys.ts`** — Centralized React Query key factory. All cache keys are defined here as typed factory functions (`queryKeys.connections.all`, `queryKeys.databases.list(connectionId)`, etc.). Never use inline string arrays for query keys — always import from this module.
- **`useConnection.tsx`** — Connection CRUD hooks (`useGetConnections`, `useUpsertConnection`, `useDeleteConnection`, etc.) and re-exports from `useSchema` and `useSchemaRefresh` for backward compatibility.
- **`useSchema.ts`** — Schema read hooks: `useGetDatabases`, `useGetTables`, `useGetCachedSchema`, `useGetAllTableColumns`, `useGetColumns`. These are re-exported from `useConnection.tsx`.
- **`useSchemaRefresh.ts`** — Schema invalidation hooks: `useRetryConnection`, `useRefreshDatabase`, `useRefreshTable`. Contains centralized `invalidateSchemaForDatabase` and `invalidateSchemaForTable` helpers.
- **`useManagedMetadata.ts`** — Managed metadata mutation hooks for REST API folders and requests: `useCreateManagedDatabase`, `useUpdateManagedDatabase`, `useDeleteManagedDatabase`, `useCreateManagedTable`, `useUpdateManagedTable`, `useDeleteManagedTable`. Used by `ConnectionActions`, `DatabaseActions`, and `TableActions`.

### Frontend Data Layer

- **`src/frontend/data/api.tsx`** - `ProxyApi` static class wraps all backend calls via HTTP (Electron uses `file://` with `webRequest` redirect to embedded server)
- **`src/frontend/data/config.ts`** - `SessionStorageConfig` and `LocalStorageConfig` constants for storage keys
- **`src/frontend/data/file.tsx`** - File download utilities (text, JSON, CSV, blob)
- **`src/frontend/data/session.tsx`** - Session ID generation and management

### Code Snippets

`src/common/adapters/code-snippets/` contains connection code templates for Java, JavaScript, and Python. Raw Mustache templates live in `templates/` as `.mustache` files named `{language}.{engine}.mustache` (e.g., `javascript.mysql.mustache`, `python.postgres.mustache`). `renderCodeSnippet.ts` renders them with dialect-specific context values. Used by `ConcreteDataScripts.getCodeSnippet()` in each adapter's `scripts.ts`.

**Template loading (three-tier with version gating):**

1. **Bundled fallback** — `.mustache` files are imported via Vite `?raw` and baked into the build. Always available offline.
2. **Disk cache** — After a successful remote fetch, templates are persisted to `cache.code-snippets.json` via `PersistentStorage`. On next launch, the disk cache is loaded if its `version` matches the current app version (cache is discarded on app updates so new bundled templates take precedence).
3. **Remote refresh** — On first `renderCodeSnippet()` call, all templates are fetched in parallel from `https://github.com/synle/sqlui-native/blob/head/src/common/adapters/code-snippets/templates/{filename}?raw=1`. Fetched templates override in-memory copies immediately and are saved to disk. Failures are silently ignored.

**To update templates without an app release:** Edit the `.mustache` files in the `main` branch — running apps pick up changes on next launch.

### Persistent Storage

The storage layer has two backends behind the `IPersistentStorage<T>` interface (`src/common/IPersistentStorage.ts`):

- **`PersistentStorageJsonFile<T>`** (deprecated) — Legacy JSON file backend. Each instance maps to a separate `.json` file in the app data directory (`~/Library/Application Support/sqlui-native/` on Mac, `%APPDATA%/sqlui-native` on Windows).
- **`PersistentStorageSqlite<T>`** — SQLite backend. All data lives in a single `sqlui-native-storage.db` file with separate tables per data type. No `id` duplication — the `id` column is the source of truth; the `data` JSON column does not contain `id`. On read, `id` is re-injected from the column.

**Constructor:** `constructor(table: string, instanceId: string, name: string, storageLocation?: string)` — `table` is the SQLite table name (ignored by JSON backend).

**`PersistentStorage`** is re-exported from `src/common/PersistentStorage.ts` as an alias for `PersistentStorageJsonFile` for backward compatibility.

**Factory functions** in `src/common/PersistentStorageJsonFile.ts` create pre-configured instances: `getConnectionsStorage`, `getQueryStorage`, `getSessionsStorage`, `getFolderItemsStorage`, `getDataSnapshotStorage`, `getSettingsStorage`, `getManagedDatabasesStorage`, `getManagedTablesStorage`, `getCachedDatabasesStorage`, `getCachedTablesStorage`, `getCachedColumnsStorage`, `getCachedCodeSnippetsStorage`.

**Never instantiate `PersistentStorage` / `PersistentStorageJsonFile` / `PersistentStorageSqlite` directly.** Always use the factory functions above. They centralize the table name mapping and ensure consistency across backends. When adding a new storage type, create a new factory function in `PersistentStorageJsonFile.ts` and re-export it from `PersistentStorage.ts`.

**SQLite table mapping** (snake_case, singular): `connection`, `query`, `session`, `folder_item`, `data_snapshot`, `setting`, `managed_database`, `managed_table`, `cached_database`, `cached_table`, `cached_column`, `cached_code_snippet`.

**Storage version tracking:** A `database_storage_version` entry in the `setting` table tracks the schema version. Missing = legacy JSON (v0), `1` = first SQLite version. Used by `PersistentStorageMigration.ts` to determine if migration is needed.

**Migration** (`src/common/PersistentStorageMigration.ts`): On app startup, `runMigration()` checks the storage version. If legacy JSON files exist, it reads them, inserts entries into the corresponding SQLite tables, and moves the `.json` files to `{storageDir}/backup/`. Users can restore by moving files back from `backup/`.

### Shared Utilities

`src/common/utils/` contains shared helper functions used across the backend:

- **`errorUtils.ts`** — `formatErrorMessage(err, fallback)` extracts a human-readable message from any caught error (handles `sqlMessage`, `message`, `toString()`). `safeDisconnect(engine)` wraps adapter disconnect in a swallowed try/catch for use in finally blocks. `backfillTimestamps(items, label)` mutates items with missing `createdAt`/`updatedAt` fields and returns whether any were modified.
- **`commonUtils.ts`** — `getGeneratedRandomId()` for generating unique IDs.
- **`sessionUtils.ts`** — In-memory session tracking (windowId → sessionId mapping) with ping/keep-alive and stale cleanup.

## Adding a New Database Adapter

1. Add a new dialect value in `typings/index.ts`
2. Create adapter in `src/common/adapters/` (see `_SampleDataAdapter_/` for template)
3. Register in `DataAdapterFactory.ts` and `DataScriptFactory.ts`
4. Add dialect icon as PNG in your adapter directory, import it in `scripts.ts`, and return it from `getDialectIcon()`
5. Add script spec tests in `DataScriptFactory.spec.ts` (this test also auto-generates `guides.md` — never edit that file manually)

See CONTRIBUTING.md for the full step-by-step guide with code examples.

### Key Frontend Components

- **`QueryBox`** - SQL/query editor with Monaco editor, connection/database selectors, and execution controls
- **`ResultBox`** - Displays query results with DataTable (legacy and modern/virtualized variants)
- **`VirtualizedConnectionTree`** - Tree view of connections/databases/tables/columns using virtualized flat rows
- **`ActionDialogs`** - Global dialog system (alert, choice, prompt, modal) managed via `useActionDialogs` context
- **`MissionControl`** - Central event handler that wires up all application commands (session, connection, query, settings, navigation). Processes commands from the `CommandPalette`, keyboard shortcuts, and Electron menu events
- **`CommandPalette`** - Fuzzy-searchable command list (`Cmd+P` / `Ctrl+P`). Options defined in `ALL_COMMAND_PALETTE_OPTIONS` array in `CommandPalette/index.tsx`. Supports expanding per-connection/per-query commands. When adding new app-wide actions, add a `ClientEventKey` in `typings/index.ts`, a command option in `CommandPalette`, and a `case` in `MissionControl`'s `_executeCommandPalette` switch
- **`ConnectionActions`** - Dropdown menu of actions per connection (bookmark, edit, export, duplicate, refresh, test, delete). Shows "Refreshing..." with spinner when a refresh is in progress, preventing double-refresh
- **`NewConnectionButton`** - Split button for creating connections, with dropdown for Import, Export All, Data Migration, Refresh All Connections, and Collapse All
- **`ConnectionForm`** - New/edit connection forms with dialect-specific hints
- **`MigrationBox`** - Data migration between connections with column mapping

### Views (Pages)

`src/frontend/views/` contains route-level page components: `MainPage`, `NewConnectionPage`, `EditConnectionPage`, `BookmarksPage`, `RecycleBinPage`, `MigrationPage`, `RecordPage`, `RelationshipChartPage`.

### Visualization (RelationshipChartPage)

`src/frontend/views/RelationshipChartPage/index.tsx` — Interactive foreign key relationship visualization for relational databases only (MySQL, MariaDB, MSSQL, PostgreSQL, SQLite).

**Library:** Uses `@xyflow/react` (React Flow v12) for the diagram and `html-to-image` for PNG export.

**Architecture:**

- `RelationshipChartPage` (outer) — Handles data fetching, routing, breadcrumb with table dropdown, and tab switching
- `RelationshipChart` (inner, inside `ReactFlowProvider`) — Renders the interactive diagram using React Flow hooks
- `RelationshipTable` — Sortable MUI Table showing relationships in tabular form
- `TableNode` — Custom React Flow node with handles on all 4 sides (top/right/bottom/left) for optimal edge routing
- `RelationshipEdgeComponent` — Custom edge using `EdgeLabelRenderer` for HTML labels with MUI Tooltip on hover

**Key helpers:**

- `buildRelationships()` — Extracts FK edges from `ColumnMetaData.referencedTableName`/`referencedColumnName`
- `countRelationships()` — Counts refs (outgoing FKs) and deps (incoming FKs) per table
- `classifyTables()` — Categorizes related tables as ref-only, dep-only, or hybrid (both directions)
- `computeLayout()` — 3-column (horizontal) or 3-row (vertical) layout with wrapping overflow
- `pickBestHandles()` — Selects closest handle pair (source/target side) based on node positions
- `placeColumnsWrapped()` / `placeRowsWrapped()` — Position tables with overflow wrapping (max 8 per column, 10 per row)
- `getCollapsedLabel()` — Generates summary label like "2 refs" or "1 dep"

**Layout modes:**

- **Horizontal (default):** 3 columns — left (refs), center (pivot + hybrid), right (deps). Wraps after `MAX_PER_COL=8` items per column.
- **Vertical:** 3 rows — top (refs), center (pivot + hybrid), bottom (deps). Wraps after `MAX_PER_ROW=10` items per row.
- Overflow wraps inward toward center. Side groups are positioned at container edges.

**Features:**

- Two tabs: **Diagram** (React Flow) and **Table** (MUI Table with sortable columns and Chip-based FK details)
- Tabs use `display: none` (not conditional rendering) so diagram state is preserved when switching
- Breadcrumb dropdown lists all tables with relationship counts: `table (N: X refs, Y deps)`
- Multiple FKs between same table pair are grouped into one edge
- **Expand/collapse labels:** Collapsed (default) shows summary ("2 refs"), expanded shows full FK details joined by `|`
- **Tooltip on collapsed labels:** Hovering shows chip-styled FK details (same format as table view)
- **Edge click cycling:** Clicking an edge label selects the source node, clicking again selects the target
- Edges use arrows (`MarkerType.ArrowClosed`) pointing from source to target (FK direction), consistent size on selection
- **Orientation toggle:** Switch between 3-column and 3-row layouts
- **Redraw button:** Force re-layout after window resize
- PNG download, zoom (scroll), pan (drag), and draggable nodes

**Constants (top of file):** `NODE_WIDTH`, `NODE_HEIGHT`, `EDGE_LABEL_FONT_SIZE`, `COL_GAP`, `ROW_GAP`, `WRAP_PAD`, `MAX_PER_COL`, `MAX_PER_ROW`

**Terminology:** "Ref" = the table has a FK pointing outward (references another table). "Dep" = another table has a FK pointing to this table (depends on it).

**Routes:** `/visualization/:connectionId`, `/visualization/:connectionId/:databaseId`, `/visualization/:connectionId/:databaseId/:tableId`

## Testing

- Tests use Vitest (config in `vite.frontend.config.ts`)
- Unit tests are co-located with source files as `*.spec.ts`/`*.spec.tsx`
- Integration tests exist for each adapter (require running database instances, run via `npm run test-integration`)
- Integration tests use `*.integration.spec.ts` naming and are excluded from `npm run test-ci`
- Cloud-based adapters (Azure Table Storage, Azure CosmosDB, Salesforce) require connection strings via environment variables (`TEST_AZ_TABLE_STORAGE_CONNECTION`, `TEST_AZ_COSMOSDB_CONNECTION`, `TEST_SFDC_CONNECTION`). Tests auto-skip when the env var is not set. In CI, these are mapped **manually** from GitHub secrets in `.github/workflows/integration-test.yml` under the `env:` block of the "Run integration tests" step. When adding a new cloud adapter integration test, you must add its secret mapping there too
- **SECURITY: `TEST_*_CONNECTION` env vars contain real credentials. NEVER log, echo, console.log, or expose these values in code, tests, or CI output.**
- **Test data convention:** Use fictional company names (Acme, Globex, Initech) and made-up ticket keys in tests and documentation examples. Never use real company names, real credentials, or real user data.
- Known: `jsdom` environment tests may show errors if the package is not installed; this doesn't affect test results
- Run `npm run test-ci` for CI mode (no watch), `npm test` for watch mode

### Frontend Test Conventions

- All `jsdom` tests must start with `// @vitest-environment jsdom`
- Use `@testing-library/react` (`render`, `fireEvent`, `act`) for component tests
- When MUI theme is needed, wrap with `renderWithTheme` helper using `createTheme()` + `ThemeProvider`
- Mock hooks with `vi.mock("src/frontend/hooks/...")` at the top of the file
- Mock `useSetting` with `useLayoutModeSetting: () => "compact"` when components use layout mode
- Mock `CodeEditorBox` when testing components that use Monaco editor
- Prefer `toContain` for text assertions over exact `toEqual`
- Use `toMatchInlineSnapshot` for empty/null render checks
- For stub assertions, `toHaveBeenCalled()` is sufficient — no need to assert call count
- Avoid `toEqual` for text — use `toContain` where it makes sense

## GitHub Raw File URLs

When fetching raw file content from GitHub repos, always use the `?raw=1` blob URL format:

```
https://github.com/{owner}/{repo}/blob/head/{path}?raw=1
```

Do NOT use:

- `https://api.github.com/repos/{owner}/{repo}/contents/{path}` (GitHub Contents API)
- `https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}`

## Pre-commit Checklist

After **all** changes are complete, run `npm run validate` once. Do NOT run it after each atomic change — only once at the end.

```bash
npm run validate         # Runs: lint → typecheck → test-ci → format → test-e2e → test-smoke → test-integration
```

This single command runs everything in order: ESLint, TypeScript type check, unit tests, Prettier formatting, e2e tests, smoke tests, and integration tests (heaviest, last).

Additionally:

1. **Always add TSDoc for ALL code in every change.** TSDoc is mandatory on every function, constant, type, interface, and any code you touch — no exceptions. Script files must start with a single-line `/** Description. */` file header. See the **Documentation** section below for TSDoc style rules.
2. **Update docs** when making significant changes:
   - **CONTRIBUTING.md** — Update when adding or modifying database adapters (new auth flows, connection formats, query modes, setup instructions, integration tests).
   - **README.md** — Update for new features and adapter changes (new adapters, significant changes to existing ones). Only for semi-major or new features, not minor tweaks.

## Error Handling Convention

In catch blocks, always use `console.error` (never `console.log`) with a label in the format `"FileName:functionName"`:

```typescript
} catch (err) {
  console.error("FileName:functionName", err);
}
```

- The label should include the file name and the enclosing function/method name.
- For endpoint handlers, include the HTTP method and URL: `console.error(\`Endpoints.ts:handler [GET /api/...]\`, err)`.
- Never leave catch blocks empty — always log with `console.error`.
- Unused function parameters should be prefixed with `_` (e.g., `_input`, `_dialect`).

**Exception — `useActionDialogs` wraps:** Catch blocks that wrap `useActionDialogs` methods (`alert`, `modal`, `choice`, `prompt`, `dismiss`) should NOT use `console.error`. These rejections are expected (e.g. user dismissing a dialog). Instead, use `_err` to silence the lint warning:

```typescript
} catch (_err) {
  // user dismissed dialog
}
```

Never use an empty `finally` block — replace it with `catch (_err) {}` when wrapping dialog actions.

## Build Verification

After any build-related or Vite config change, run the affected build task to verify it works:

- Frontend changes (`vite.frontend.config.ts`, `index.html`, `src/frontend/`): `npm run build`
- Electron changes (`vite.electron.config.ts`, `src/electron/`): `npm run build-electron`
- Server changes (`vite.sqlui-server.config.ts`, `src/sqlui-server/`): `npm run build-server`
- Shared backend changes (`src/common/`): run all three builds

## Build Configuration

- React app: Vite (`vite.frontend.config.ts`) - dev server on port 3000 with proxy to sqlui-server on port 3001
- Electron main process: Vite SSR (`vite.electron.config.ts`) - outputs `build/main.js`
- Server: Vite SSR (`vite.sqlui-server.config.ts`) - outputs `build/sqlui-server.js`
- Prettier: 140 char width, single quotes, trailing commas, 2-space indent
- NODE_VERSION: 24 (use `fnm` to switch: `fnm use 24`)
- npm

## Documentation

### TSDoc

When writing or modifying non-test source code (`.ts`, `.tsx`), add **TSDoc** comments to all exported functions, classes, components, hooks, types, interfaces, and constants. Do not duplicate type information already present in the TypeScript signature — document _what_ and _why_, not the types. Script files must start with a single-line `/** Description. */` file header.

This is a non-negotiable part of every code change — no PR or commit should be made without ensuring TSDoc coverage.

- **Use TSDoc**, not JSDoc. This is a TypeScript codebase; avoid JSDoc-style type annotations (`@param {string}`, `@returns {number}`).
- **Skip TSDoc for**: test files (`*.spec.*`), `_Sample*` files, and `sw*.js` files.
- **`@param`** — describe semantics, not types: `@param connectionId - The connection to refresh`
- **`@returns`** — describe what the caller gets back when it isn't obvious from the return type.
- **`@remarks`** — use for non-obvious implementation details, caveats, or performance notes.
- **`@example`** — include when usage isn't obvious (e.g., complex hook signatures).

```ts
// GOOD — TSDoc, no redundant types
/**
 * Fetches databases for a connection.
 * @param connectionId - The connection to query
 * @returns The list of databases including metadata
 */
function getDatabases(connectionId: string): Promise<DatabaseMetaData[]> { ... }

// BAD — JSDoc-style with redundant type annotations
/**
 * @param {string} connectionId
 * @returns {Promise<DatabaseMetaData[]>}
 */
function getDatabases(connectionId: string): Promise<DatabaseMetaData[]> { ... }
```

> **Migration note:** Existing code uses JSDoc-style comments. When touching a file, convert its doc comments to TSDoc style (remove `{type}` annotations from `@param`/`@returns` tags). No need to bulk-convert files you aren't otherwise modifying.
