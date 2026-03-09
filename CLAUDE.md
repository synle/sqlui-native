# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SQLUI Native is a cross-platform Electron desktop SQL/NoSQL database client supporting MySQL, MariaDB, MSSQL, PostgreSQL, SQLite, Cassandra, MongoDB, Redis, Azure CosmosDB, and Azure Table Storage.

## Commands

```bash
npm install             # Install dependencies
npm start               # Run in Electron (dev mode)
npm run dev             # Run mocked server + Vite dev server at http://localhost:3000
npm run build           # Build frontend (Vite) + Electron + mocked server
npm test                # Run Vitest tests (watch mode)
npm run test-ci         # Run Vitest tests (CI, no watch)
npm run lint            # ESLint with auto-fix
npm run format          # Prettier formatting
```

**Packaging:** `bash scripts/build.sh && npm run dist`

## Architecture

### Two Runtime Modes

The app runs in **Electron mode** (`npm start`) or **mocked server mode** (`npm run dev`). Both share the same backend code in `src/common/`. In Electron mode, the renderer communicates with the main process via IPC. In mocked server mode, an Express server on port 3001 serves the same endpoints over HTTP.

### Directory Structure

- **`src/frontend/`** - React 17 UI (MUI v5, React Query, Monaco Editor, React Router v6)
- **`src/electron/`** - Electron main process (window management, IPC handlers, menus)
- **`src/common/`** - Shared backend: database adapters, API endpoint handlers, persistent storage
- **`src/mocked-server/`** - Express server wrapping the shared backend for browser-based dev
- **`typings/index.ts`** - Central type definitions (`SqluiCore`, `SqluiFrontend`, `SqlAction`, `SqluiEnums`)

### Database Adapter Pattern

All database engines implement `IDataAdapter` (authenticate, getDatabases, getTables, getColumns, execute). `DataAdapterFactory` creates the correct adapter based on connection dialect. `DataScriptFactory` generates dialect-specific SQL/query scripts. `BaseDataAdapter` provides shared logic (connection string parsing, type inference/resolution). `BaseDataScript` provides shared script generation (select, insert, update, delete, DDL) with dialect-specific overrides.

Adapter implementations live in `src/common/adapters/`:

- `RelationalDataAdapter` - MySQL, MariaDB, Postgres, MSSQL, SQLite (via Sequelize)
- `CassandraDataAdapter`, `MongoDBDataAdapter`, `RedisDataAdapter`, `AzureCosmosDataAdapter`, `AzureTableStorageAdapter`

Each adapter directory contains `index.ts` (adapter class) and `scripts.ts` (ConcreteDataScripts class with dialect-specific query generators). Some also have `utils.ts` for client configuration helpers.

### Endpoint Pattern

`src/common/Endpoints.ts` defines API handlers that work in both modes. In Electron, handlers are registered via IPC. In mocked server mode, they're mounted as Express routes. Session ID and Window ID are passed in request headers.

### Frontend State Management

Custom React hooks and context providers instead of Redux: `useSession`, `useConnection`, `useConnectionQuery`, `useSetting`, `useActionDialogs`, `useShowHide`, `useTreeActions`, `useFolderItems`.

Additional hooks: `useToaster` (toast notifications with history), `useClientSidePreference` (localStorage-backed preferences), `useServerConfigs` (server configuration), `useDataSnapshot` (import/export snapshots).

### Frontend Data Layer

- **`src/frontend/data/api.tsx`** - `ProxyApi` static class wraps all backend calls (works in both Electron IPC and HTTP modes)
- **`src/frontend/data/config.ts`** - `SessionStorageConfig` and `LocalStorageConfig` constants for storage keys
- **`src/frontend/data/file.tsx`** - File download utilities (text, JSON, CSV, blob)
- **`src/frontend/data/session.tsx`** - Session ID generation and management

### Code Snippets

`src/common/adapters/code-snippets/` contains connection code templates for Java, JavaScript, and Python. `renderCodeSnippet.ts` renders templates with dialect-specific values. Used by `BaseDataScript.getCodeSnippet()`.

### Persistent Storage

`PersistentStorage<T>` stores data as JSON files in the user's app data directory (`~/Library/Application Support/sqlui-native/` on Mac, `%APPDATA%/sqlui-native` on Windows).

## Adding a New Database Adapter

1. Add a new dialect value in `typings/index.ts`
2. Create adapter in `src/common/adapters/` (see `_SampleDataAdapter_/` for template)
3. Register in `DataAdapterFactory.ts` and `DataScriptFactory.ts`
4. Add dialect icon as PNG in your adapter directory, import it in `scripts.ts`, and return it from `getDialectIcon()`
5. Add script spec tests in `DataScriptFactory.spec.ts`

### Key Frontend Components

- **`QueryBox`** - SQL/query editor with Monaco editor, connection/database selectors, and execution controls
- **`ResultBox`** - Displays query results with DataTable (legacy and modern/virtualized variants)
- **`VirtualizedConnectionTree`** - Tree view of connections/databases/tables/columns using virtualized flat rows
- **`ActionDialogs`** - Global dialog system (alert, choice, prompt, modal) managed via `useActionDialogs` context
- **`MissionControl`** - Command palette with keyboard shortcut support
- **`ConnectionForm`** - New/edit connection forms with dialect-specific hints
- **`MigrationBox`** - Data migration between connections with column mapping

### Views (Pages)

`src/frontend/views/` contains route-level page components: `MainPage`, `NewConnectionPage`, `EditConnectionPage`, `BookmarksPage`, `RecycleBinPage`, `MigrationPage`, `RecordPage`, `RelationshipChartPage`.

## Testing

- Tests use Vitest (config in `vite.frontend.config.ts`)
- Unit tests are co-located with source files as `*.spec.ts`/`*.spec.tsx`
- Integration tests exist for each adapter (require running database instances)
- Known: `jsdom` environment tests may show errors if the package is not installed; this doesn't affect test results
- Run `npm run test-ci` for CI mode (no watch), `npm test` for watch mode

## Pre-commit Checklist

After any code change, you MUST run these commands and ensure they all pass before considering the task complete:

```bash
npm run format           # Prettier formatting
npm run lint             # ESLint (must have 0 errors)
npm run test-ci          # All tests must pass
```

## Build Verification

After any build-related or Vite config change, run the affected build task to verify it works:

- Frontend changes (`vite.frontend.config.ts`, `index.html`, `src/frontend/`): `npm run build`
- Electron changes (`vite.electron.config.ts`, `src/electron/`): `npm run build-electron`
- Mocked server changes (`vite.mocked-server.config.ts`, `src/mocked-server/`): `npm run build-mocked-server`
- Shared backend changes (`src/common/`): run all three builds

## Build Configuration

- React app: Vite (`vite.frontend.config.ts`) - dev server on port 3000 with proxy to mocked server on port 3001
- Electron main process: Vite SSR (`vite.electron.config.ts`) - outputs `build/main.js`
- Mocked server: Vite SSR (`vite.mocked-server.config.ts`) - outputs `build/mocked-server.js`
- Prettier: 100 char width, single quotes, trailing commas, 2-space indent
- NODE_VERSION: 24
- npm

## Documentation

All source files in `src/` have JSDoc documentation on exported functions, classes, interfaces, types, and components. When adding new exports, follow the existing JSDoc style: concise 1-2 line descriptions with `@param` and `@returns` tags where applicable.
