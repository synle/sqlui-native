# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SQLUI Native is a cross-platform Electron desktop SQL/NoSQL database client supporting MySQL, MariaDB, MSSQL, PostgreSQL, SQLite, Cassandra, MongoDB, Redis, Azure CosmosDB, and Azure Table Storage.

## Commands

```bash
npm install             # Install dependencies
npm start               # Run in Electron (dev mode)
npm run dev             # Run mocked server + React dev server at http://localhost:3000
npm run build           # Build React + Electron + mocked server
npm test                # Run Jest tests (watch mode)
npm run test-ci         # Run Jest tests (CI, no watch)
npm run lint            # ESLint with auto-fix
npm run format          # Prettier formatting
npm run fix-import      # Fix and organize imports
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

All database engines implement `IDataAdapter` (authenticate, getDatabases, getTables, getColumns, execute). `DataAdapterFactory` creates the correct adapter based on connection dialect. `DataScriptFactory` generates dialect-specific SQL/query scripts.

Adapter implementations live in `src/common/adapters/`:

- `RelationalDataAdapter` - MySQL, MariaDB, Postgres, MSSQL, SQLite (via Sequelize)
- `CassandraDataAdapter`, `MongoDBDataAdapter`, `RedisDataAdapter`, `AzureCosmosDataAdapter`, `AzureTableStorageAdapter`

### Endpoint Pattern

`src/common/Endpoints.ts` defines API handlers that work in both modes. In Electron, handlers are registered via IPC. In mocked server mode, they're mounted as Express routes. Session ID and Window ID are passed in request headers.

### Frontend State Management

Custom React hooks and context providers instead of Redux: `useSession`, `useConnection`, `useConnectionQuery`, `useSetting`, `useActionDialogs`, `useShowHide`, `useTreeActions`, `useFolderItems`.

### Persistent Storage

`PersistentStorage<T>` stores data as JSON files in the user's app data directory (`~/Library/Application Support/sqlui-native/` on Mac, `%APPDATA%/sqlui-native` on Windows).

## Adding a New Database Adapter

1. Add a new dialect value in `typings/index.ts`
2. Create adapter in `src/common/adapters/` (see `_SampleDataAdapter_/` for template)
3. Register in `DataAdapterFactory.ts` and `DataScriptFactory.ts`
4. Add dialect icon as PNG in `public/assets/` (filename must match dialect name)
5. Add script spec tests in `DataScriptFactory.spec.ts`

## Build Configuration

- React app: Create React App (react-scripts)
- Electron main process: `webpack-electron.config.js` with `tsconfig-electron.json`
- Mocked server: `webpack-mocked-server.config.js` with `tsconfig-mocked-server.json`
- Prettier: 100 char width, single quotes, trailing commas, 2-space indent
- NODE_VERSION: 20
- npm
