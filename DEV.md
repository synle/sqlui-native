# Developer Architecture Guide

This document describes the data flow, code paths, and architecture of sqlui-native for developers working on the codebase.

## High-Level Architecture

sqlui-native is a cross-platform desktop SQL/NoSQL database client built with **Tauri (Rust backend) + React (TypeScript frontend)**. It also supports a browser-based development mode via an Express mocked server.

```
+-------------------------------------------------------------+
|                     Frontend (React/TypeScript)              |
|  Components -> Hooks -> React Query -> ProxyApi -> Platform  |
+---------------------------+---------------------------------+
                            |
               Platform Bridge (IPC or HTTP)
                            |
         +------------------+------------------+
         |                                     |
+--------v---------+             +-------------v-----------+
|  Tauri Backend   |             |  Mocked Server (dev)    |
|  (Rust commands) |             |  (Express + TypeScript) |
+--------+---------+             +-------------+-----------+
         |                                     |
+--------v-------------------------------------v-----------+
|              Database Adapters (per-dialect drivers)      |
|  MySQL | Postgres | SQLite | MSSQL | MongoDB | Redis ... |
+----------------------------------------------------------+
```

## Directory Structure

```
sqlui-native/
├── src/
│   ├── frontend/              # React UI (Vite-bundled for browser)
│   │   ├── components/        # Reusable UI components (~50 directories)
│   │   ├── hooks/             # Custom React hooks (state, data fetching)
│   │   ├── views/             # Route-level page components
│   │   ├── data/              # API client, session, file I/O, throttling
│   │   ├── platform/          # Platform abstraction (Tauri vs browser)
│   │   ├── layout/            # Layout components (resizable panels)
│   │   ├── utils/             # Frontend utilities (formatting, etc.)
│   │   ├── styles/            # Global CSS
│   │   └── App.tsx            # Router + lazy-loaded routes
│   │
│   └── common/                # Shared code (frontend-safe parts only)
│       ├── adapters/          # TypeScript adapter interfaces + script generators
│       │   ├── IDataAdapter.ts          # Adapter interface
│       │   ├── IDataScript.ts           # Script generator interface
│       │   ├── DataScriptFactory.ts     # Routes dialect -> script generator
│       │   ├── BaseDataAdapter/         # Shared adapter logic
│       │   ├── RelationalDataAdapter/   # SQL dialects (mysql/, postgres/, sqlite/, mssql/)
│       │   ├── MongoDBDataAdapter/      # MongoDB
│       │   ├── RedisDataAdapter/        # Redis
│       │   ├── CassandraDataAdapter/    # Cassandra
│       │   ├── RestApiDataAdapter/      # REST API client
│       │   ├── GraphQLDataAdapter/      # GraphQL client
│       │   ├── SalesforceDataAdapter/   # Salesforce (SFDC)
│       │   ├── AzureCosmosDataAdapter/  # Azure CosmosDB
│       │   ├── AzureTableStorageAdapter/# Azure Table Storage
│       │   └── code-snippets/           # Mustache templates for code generation
│       └── utils/             # Shared utilities (error handling, IDs, sessions)
│
├── src-tauri/                 # Tauri / Rust backend
│   └── src/
│       ├── main.rs            # Tauri app entry point
│       ├── lib.rs             # Command registration
│       ├── commands/mod.rs    # All API command handlers (~40 commands)
│       ├── adapters/          # Rust adapter implementations (13 adapters)
│       │   ├── mod.rs         # Adapter trait + factory
│       │   ├── mysql_adapter.rs
│       │   ├── postgres_adapter.rs
│       │   ├── sqlite_adapter.rs
│       │   └── ...            # One file per dialect
│       ├── storage/mod.rs     # SQLite-based persistent storage
│       ├── cache.rs           # Schema caching (databases, tables, columns)
│       ├── types.rs           # Shared Rust types
│       ├── error.rs           # Error types
│       └── menu.rs            # Native menu definitions
│
├── typings/
│   └── index.ts               # Central type definitions (SqluiCore, SqluiFrontend, etc.)
│
├── scripts/                   # Build and CI scripts
├── .github/workflows/         # CI/CD pipelines
├── CLAUDE.md                  # AI assistant instructions
├── CONTRIBUTING.md            # Setup guide, docker samples, adapter guide
└── DEV.md                     # This file
```

## Data Flow: Frontend to Backend

### The Complete Request Lifecycle

Here is the full path of a typical request (e.g., fetching databases for a connection):

```
 1. Component                    useGetDatabases(connectionId)
        |
 2. React Hook                  useQuery({ queryKey, queryFn })
        |                        - Checks React Query cache first
        |                        - If stale/missing, calls queryFn
        |
 3. ProxyApi                    ProxyApi.getConnectionDatabases(connectionId)
        |                        -> _fetch("/api/connection/{id}/databases")
        |
 4. Platform Bridge             platform.backendFetch("GET", url, body, sessionId)
        |                        - Tauri: mapUrlToCommand() -> invoke()
        |                        - Browser: falls through to HTTP fetch()
        |
 5. Tauri Command               get_databases(session_id, connection_id)
        |                        - Reads connection from SQLite storage
        |                        - Creates adapter from connection string
        |
 6. Adapter                     adapter.authenticate() -> adapter.get_databases()
        |                        - Opens connection to actual database
        |                        - Executes SHOW DATABASES (or equivalent)
        |
 7. Response                    Vec<DatabaseMetaData> -> JSON
        |                        - Serialized by Tauri, returned via IPC
        |
 8. React Query Cache           Cached with key [connectionId, "databases"]
        |                        - staleTime: 10 minutes
        |
 9. Component Re-render         { data: [...], isLoading: false }
```

### Layer-by-Layer Detail

#### Layer 1: React Components

Components never call the API directly. They use hooks:

```tsx
// In VirtualizedConnectionTree or similar
const { data: databases } = useGetDatabases(connectionId);
```

Key components:

- `VirtualizedConnectionTree` -- connection/database/table/column tree
- `QueryBox` -- SQL editor with Monaco, connection selector, execute button
- `ResultBox` -- displays query results (tables, JSON, REST responses)
- `MissionControl` -- global command dispatcher (keyboard shortcuts, menu events)
- `CommandPalette` -- fuzzy-searchable command list (Cmd+P)

#### Layer 2: React Hooks + React Query

Hooks wrap React Query's `useQuery` / `useMutation` and call `ProxyApi`:

```
src/frontend/hooks/
├── queryKeys.ts           # Query key factories (MUST use these, never inline strings)
├── useSchema.tsx          # useGetDatabases, useGetTables, useGetColumns, useGetCachedSchema
├── useSchemaRefresh.tsx   # useRetryConnection, useRefreshDatabase, useRefreshTable
├── useConnection.tsx      # useGetConnections, useUpsertConnection, useDeleteConnection
├── useManagedMetadata.tsx # CRUD for REST API folders/requests
├── useSession.tsx         # Session CRUD
├── useSetting.tsx         # App settings
├── useConnectionQuery.tsx # Query tab state (Context + SessionStorage)
├── useActionDialogs.tsx   # Dialog system (alert, confirm, prompt, choice, modal)
├── useShowHide.tsx        # Tree expand/collapse state
└── useToaster.tsx         # Toast notifications
```

Query keys are centralized in `queryKeys.ts`:

```typescript
queryKeys.connections.all; // ["connections"]
queryKeys.databases.list(connId); // [connId, "databases"]
queryKeys.tables.list(connId, dbId); // [connId, dbId, "tables"]
queryKeys.columns.list(connId, dbId, tableId); // [connId, dbId, tableId, "columns"]
```

#### Layer 3: ProxyApi (API Client)

`src/frontend/data/api.tsx` -- static class with methods for every backend endpoint:

```typescript
export class ProxyApi {
  static getConnectionDatabases(connectionId) { ... }
  static getConnectionTables(connectionId, databaseId) { ... }
  static execute(connectionId, databaseId, sql, ...) { ... }
  // ~40 methods total
}
```

The internal `_fetch()` function handles the platform split:

```typescript
async function _fetch<T>(input, initOptions?) {
  // Injects session ID header
  // If Tauri mode + /api URL -> platform.backendFetch() (IPC)
  // Otherwise -> standard fetch() (HTTP)
}
```

#### Layer 4: Platform Bridge

`src/frontend/platform/` abstracts the transport:

```
platform/
├── types.ts    # PlatformBridge interface
├── index.ts    # Detects Tauri vs browser, exports singleton
├── tauri.ts    # Tauri: maps URLs to invoke() commands via regex routes
└── browser.ts  # Browser: falls through to HTTP fetch (no backendFetch)
```

The Tauri platform maps HTTP-style URLs to Tauri command names:

```
GET  /api/connections                              -> invoke("get_connections")
GET  /api/connection/:id/databases                 -> invoke("get_databases", { connectionId })
POST /api/connection/:id/execute                   -> invoke("execute", { connectionId, ... })
POST /api/connection/:id/database/:dbId/refresh    -> invoke("refresh_database", { ... })
```

#### Layer 5: Tauri Commands (Rust Backend)

`src-tauri/src/commands/mod.rs` -- ~40 `#[tauri::command]` handlers:

```rust
#[tauri::command]
pub async fn get_databases(
    session_id: String,
    connection_id: String,
) -> Result<Vec<serde_json::Value>, String> {
    // 1. Read connection from storage
    let store = storage::connections_storage(&session_id);
    let conn = store.get(&connection_id)?;

    // 2. Create adapter from connection string
    let mut adapter = adapters::create_adapter(&conn_str)?;

    // 3. Authenticate + query + disconnect
    adapter.authenticate().await?;
    let dbs = adapter.get_databases().await?;
    adapter.disconnect().await?;

    Ok(dbs)
}
```

#### Layer 6: Database Adapters (Rust)

`src-tauri/src/adapters/` -- one file per dialect, all implementing the `DataAdapter` trait:

```
adapters/
├── mod.rs                 # Trait definition + create_adapter() factory
├── sqlite_adapter.rs
├── mysql_adapter.rs
├── postgres_adapter.rs
├── mssql_adapter.rs
├── mongodb_adapter.rs
├── redis_adapter.rs
├── cassandra_adapter.rs
├── cosmosdb_adapter.rs
├── aztable_adapter.rs
├── salesforce_adapter.rs
├── restapi_adapter.rs
└── graphql_adapter.rs
```

The factory parses the dialect prefix from the connection string:

```
mysql://user:pass@host:3306    -> MySqlAdapter
postgres://user:pass@host:5432 -> PostgresAdapter
sqlite://path/to/db            -> SqliteAdapter
rest://{"HOST":"https://..."}  -> RestApiAdapter
```

## Two Runtime Modes

### Tauri Desktop Mode (Production)

```
React App  --[IPC invoke()]--> Rust commands --> Rust adapters --> Database
```

- Backend: Rust commands in `src-tauri/`
- Transport: Tauri IPC (binary, no HTTP overhead)
- Detection: `window.__TAURI_INTERNALS__` exists
- Native features: system menus, file dialogs, shell commands

### Browser Dev Mode (`npm run dev`)

```
React App  --[HTTP fetch()]--> Express server --> TypeScript adapters --> Database
```

- Backend: Express server on port 3001 (built from `src/common/`)
- Transport: Standard HTTP REST
- Frontend: Vite dev server on port 3000 with proxy to 3001
- Useful for rapid UI iteration without rebuilding Tauri

Both modes share the same frontend code. The `PlatformBridge` abstraction makes them interchangeable.

## State Management

The frontend uses a layered state management approach (no Redux):

### Server State (React Query)

All data from the backend flows through React Query:

- **Connections, databases, tables, columns** -- cached with 10-minute stale time
- **Settings, sessions, snapshots** -- fetched on mount
- **Mutations** -- optimistic updates with automatic cache invalidation

### Client State (React Context + SessionStorage)

| Hook                      | Purpose                                   | Persistence    |
| ------------------------- | ----------------------------------------- | -------------- |
| `useConnectionQuery`      | Open query tabs, editor content, results  | SessionStorage |
| `useShowHide`             | Tree expand/collapse state                | SessionStorage |
| `useActionDialogs`        | Dialog stack (alert/confirm/prompt/modal) | In-memory      |
| `useTreeActions`          | Tree-wide action toggles                  | In-memory      |
| `useSetting`              | App settings (dark mode, layout, etc.)    | Server-side    |
| `useToaster`              | Toast notification queue                  | In-memory      |
| `useClientSidePreference` | Per-user preferences                      | localStorage   |

### Command Dispatch (MissionControl)

`MissionControl` is the global command handler. Commands can originate from:

- Keyboard shortcuts (Ctrl+Enter to execute, Cmd+P for palette)
- Native Tauri menu items
- CommandPalette selections
- Direct calls from components

```
User Action -> MissionControl.selectCommand(event) -> switch(event) -> handler
```

## Backend Storage

### Persistent Storage (SQLite)

All app data is stored in a single SQLite file (`sqlui-native-storage.db`):

| Table                 | Content                         |
| --------------------- | ------------------------------- |
| `connection`          | Saved database connections      |
| `query`               | Saved queries                   |
| `session`             | User sessions                   |
| `folder_item`         | Bookmarks, recycle bin          |
| `data_snapshot`       | Exported data snapshots         |
| `setting`             | App settings                    |
| `managed_database`    | REST API/GraphQL folders        |
| `managed_table`       | REST API/GraphQL saved requests |
| `cached_database`     | Schema cache: databases         |
| `cached_table`        | Schema cache: tables            |
| `cached_column`       | Schema cache: columns           |
| `cached_code_snippet` | Template cache                  |

### Schema Caching

The backend implements a cache-first strategy for schema metadata:

```
Frontend requests databases
  -> Backend checks disk cache (cached_database table)
  -> Cache hit: return cached data immediately
  -> Background: fetch fresh data from real DB, update cache
  -> Next request gets fresh data
```

This makes the UI feel instant while keeping data fresh.

## TypeScript Adapters (Frontend-Safe)

`src/common/adapters/` contains TypeScript code that runs on **both** frontend and backend:

- `IDataAdapter.ts` -- adapter interface (TypeScript definition only)
- `IDataScript.ts` -- script generator interface
- `DataScriptFactory.ts` -- routes dialect to script generator
- Each adapter's `scripts.ts` -- generates dialect-specific SQL/queries

**Important**: These files must NOT import Node.js modules. They are bundled into the frontend by Vite. The actual database connections happen in the Rust backend (`src-tauri/src/adapters/`).

## Key Architectural Rules

1. **Frontend must never import Node.js modules** -- `fs`, `path`, `electron`, `better-sqlite3` are forbidden in `src/frontend/` and frontend-reachable `src/common/` code.

2. **Always use queryKeys from `queryKeys.ts`** -- never hardcode React Query key arrays.

3. **Adapters are ephemeral** -- create, authenticate, use, disconnect per request. Never hold adapter instances across requests.

4. **Session isolation** -- every request includes a `sessionId` header. Storage is partitioned by session.

5. **camelCase everywhere** -- all property names in types and data models use camelCase, never snake_case.

6. **Error logging format** -- `console.error("FileName:functionName", err)` in catch blocks.

7. **ProxyApi is the only API client** -- components and hooks must go through `ProxyApi`, never call `fetch()` or `invoke()` directly.

8. **Platform bridge abstracts transport** -- code should never check for Tauri/Electron directly; use `platform.*` methods.

## Visual: Complete Data Flow Diagram

```
+------------------------------------------------------------------+
|                        FRONTEND (React)                          |
|                                                                  |
|  +------------------+     +------------------+                   |
|  | ConnectionTree   |     | QueryBox         |                   |
|  | (tree view)      |     | (SQL editor)     |                   |
|  +--------+---------+     +--------+---------+                   |
|           |                        |                             |
|  +--------v---------+     +--------v---------+                   |
|  | useGetDatabases   |     | useExecute       |                  |
|  | useGetTables      |     | (mutation hook)  |                  |
|  | useGetColumns     |     +--------+---------+                  |
|  +--------+---------+              |                             |
|           |                        |                             |
|  +--------v------------------------v---------+                   |
|  |           React Query Cache               |                   |
|  |  queryKeys.databases.list(connId) = [...]  |                  |
|  +--------+----------------------------------+                   |
|           |                                                      |
|  +--------v----------------------------------+                   |
|  |              ProxyApi._fetch()            |                   |
|  |  Injects session ID, parses response      |                  |
|  +--------+----------------------------------+                   |
|           |                                                      |
|  +--------v----------------------------------+                   |
|  |          Platform Bridge                  |                   |
|  |  Tauri: mapUrlToCommand() -> invoke()     |                   |
|  |  Browser: HTTP fetch() to Express         |                   |
|  +--------+----------------------------------+                   |
+-----------|--------------------------------------------------+   |
            |  IPC (Tauri) or HTTP (browser)                       |
+-----------v--------------------------------------------------+   |
|                     BACKEND                                  |   |
|                                                              |   |
|  +------------------------------------------------------+   |   |
|  |  Tauri Command Handler                                |   |   |
|  |  get_databases(session_id, connection_id)             |   |   |
|  +--------+---------------------------------------------+   |   |
|           |                                                  |   |
|  +--------v------------------+                               |   |
|  |  Storage Layer            |  SQLite: sqlui-native-storage.db  |
|  |  connections_storage()    |                               |   |
|  +--------+------------------+                               |   |
|           |                                                  |   |
|  +--------v------------------+                               |   |
|  |  Adapter Factory          |                               |   |
|  |  create_adapter(conn_str) |  Parses dialect:// prefix     |   |
|  +--------+------------------+                               |   |
|           |                                                  |   |
|  +--------v------------------+                               |   |
|  |  Database Adapter         |                               |   |
|  |  authenticate()           |  Opens connection             |   |
|  |  get_databases()          |  SHOW DATABASES / equivalent  |   |
|  |  disconnect()             |  Closes connection            |   |
|  +--------+------------------+                               |   |
|           |                                                  |   |
|  +--------v------------------+                               |   |
|  |  Actual Database          |  MySQL, Postgres, SQLite,     |   |
|  |  (external)               |  MongoDB, Redis, etc.         |   |
|  +---------------------------+                               |   |
+--------------------------------------------------------------+   |
+------------------------------------------------------------------+
```

## Adding New Features: Where to Edit

| Task                 | Files to Edit                                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New API endpoint     | `src-tauri/src/commands/mod.rs` (handler), `src-tauri/src/lib.rs` (register), `src/frontend/platform/tauri.ts` (route), `src/frontend/data/api.tsx` (ProxyApi method) |
| New React hook       | `src/frontend/hooks/` (new file), `queryKeys.ts` (if server data)                                                                                                     |
| New page/view        | `src/frontend/views/` (new directory), `src/frontend/App.tsx` (route)                                                                                                 |
| New database adapter | See CONTRIBUTING.md for full guide                                                                                                                                    |
| New command/shortcut | `src/frontend/components/CommandPalette/index.tsx` (option), `src/frontend/components/MissionControl/index.tsx` (handler), `typings/index.ts` (ClientEventKey)        |
| New setting          | `typings/index.ts` (Settings type), `src/frontend/hooks/useSetting.tsx` (hook), backend config handler                                                                |
