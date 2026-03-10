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

### Visualization (RelationshipChartPage)

`src/frontend/views/RelationshipChartPage/index.tsx` — Interactive foreign key relationship visualization for relational databases only (MySQL, MariaDB, MSSQL, PostgreSQL, SQLite).

**Library:** Uses `@xyflow/react` (React Flow v12) for the diagram and `html-to-image` for PNG export.

**Architecture:**
- `RelationshipChartPage` (outer) — Handles data fetching, routing, breadcrumb with table dropdown, and tab switching
- `RelationshipChart` (inner, inside `ReactFlowProvider`) — Renders the interactive diagram using React Flow hooks
- `RelationshipTable` — Sortable MUI Table showing relationships in tabular form
- `TableNode` — Custom React Flow node with handles on all 4 sides (top/right/bottom/left) for optimal edge routing

**Key helpers:**
- `buildRelationships()` — Extracts FK edges from `ColumnMetaData.referencedTableName`/`referencedColumnName`
- `countRelationships()` — Counts refs (outgoing FKs) and deps (incoming FKs) per table
- `computeLayout()` — Radial layout: pivot table centered, related tables arranged in a circle
- `pickBestHandles()` — Selects closest handle pair (source/target side) based on node positions

**Features:**
- Two tabs: **Diagram** (React Flow) and **Table** (MUI Table with sortable columns and Chip-based FK details)
- Tabs use `display: none` (not conditional rendering) so diagram state is preserved when switching
- Breadcrumb dropdown lists all tables with relationship counts: `table (N: X refs, Y deps)`
- Multiple FKs between same table pair are grouped into one edge with multiline label
- Edges use arrows (`MarkerType.ArrowClosed`) pointing from source to target (FK direction)
- Node selection highlights connected edges; show/hide labels toggle; PNG download
- Zoom (scroll), pan (drag), and draggable nodes built into React Flow

**Terminology:** "Ref" = the table has a FK pointing outward (references another table). "Dep" = another table has a FK pointing to this table (depends on it).

**Routes:** `/visualization/:connectionId`, `/visualization/:connectionId/:databaseId`, `/visualization/:connectionId/:databaseId/:tableId`

## Testing

- Tests use Vitest (config in `vite.frontend.config.ts`)
- Unit tests are co-located with source files as `*.spec.ts`/`*.spec.tsx`
- Integration tests exist for each adapter (require running database instances)
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

### Frontend Test Coverage

Tests exist for:

- **Components:** Accordion, Select, Timer, InputError, ConnectionTypeIcon, ColumnName, ColumnType, ColumnAttributes, SplitButton, Resizer, Filter (GlobalFilter), Tabs, DropdownButton, DropdownMenu, JsonFormatData, ConnectionRetryAlert, NewConnectionButton, DeleteConnectionButton, TestConnectionButton, ConnectionHint, ConnectionRevealButton, AlertDialog, ChoiceDialog, PromptDialog, ModalDialog, ConnectionHelper, ConnectionActions, Settings, ElectronEventListener, SessionSelectionModal, Breadcrumbs, SessionManager, ToastHistoryList
- **Hooks:** useShowHide, useActionDialogs, useTreeActions, useToaster (history helpers), useConnection (refreshAfterExecution), useClientSidePreference, useSetting, useServerConfigs, useDataSnapshot, useFolderItems, useSession, useConnectionQuery
- **Data layer:** config (SessionStorageConfig, LocalStorageConfig), session (getRandomSessionId, setCurrentSessionId), file (downloadText, downloadJSON, downloadBlob), api (ProxyApi static methods)
- **Layout:** LayoutTwoColumns
- **Views:** BookmarksPage, RecycleBinPage, NewConnectionPage, EditConnectionPage, MainPage, MigrationPage, RecordPage, RelationshipChartPage
- **Utils:** formatter, executeUtils, commonUtils

## Pre-commit Checklist

After any code change, you MUST run these commands and ensure they all pass before considering the task complete:

```bash
npm run format           # Prettier formatting
npm run lint             # ESLint (must have 0 errors)
npm run typecheck        # TypeScript type check (must have 0 errors)
npm run test-ci          # All tests must pass
```

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
