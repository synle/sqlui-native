# DONE — oxlint rule debt (resolved)

Context: linting migrated from ESLint 8 (+ @typescript-eslint, eslint-plugin-react,
eslint-plugin-unused-imports) to **oxlint** (`npm run lint` → `oxlint --fix src`).
Config lives in `.oxlintrc.json`. This file documented every rule we disabled or
tuned to keep the codebase warning-clean; all items are now **resolved** and the
rules run at `error` severity — violations fail CI.

## Final state

- `correctness` category: **error**
- All previously-disabled rules re-enabled at **error** with zero remaining findings
- `npm run lint` exits 0 on a clean tree; typecheck clean; 2335 unit tests pass

## What was fixed to get there

### Rules re-enabled after code fixes

| Rule                            | Findings | Fix applied                                                                                                                                                                                                                 |
| ------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-unused-expressions`         | 19       | Rewrote statement-position ternaries and `x && y()` side-effect calls as explicit `if` blocks (useActionDialogs, SimpleEditor, BookmarksItemList, DropdownMenu, DropdownButton, Timer, ActionDialogs, Tabs, MissionControl) |
| `no-async-promise-executor`     | 10       | Replaced `new Promise(async ...)` with sync executor + inner async IIFE (MongoDB, Redis — async keyword dropped, no await inside, _SampleDataAdapter_, Salesforce, AzureTableStorage x3, AzureCosmos x2, Cassandra)         |
| `no-useless-spread`             | 7        | Inlined single-property object spreads; `new Set(array)` without array spread (commonUtils, MigrationBox, AdvancedEditor, MongoDB scripts, Cassandra, Settings, MissionControl)                                             |
| `no-useless-fallback-in-spread` | 7        | Dropped `\|\| {}` fallbacks — spreading nullish in object literals is a no-op (BaseDataAdapter, GraphQL x2, Endpoints x4)                                                                                                   |
| `no-self-assign`                | 1        | Removed no-op string branch; guarded final stringify instead (ColumnAttributes)                                                                                                                                             |
| `no-unsafe-optional-chaining`   | 3        | Null-safe defaults before destructuring/indexing (CommandPalette, Redis utils, MissionControl)                                                                                                                              |

### Real behavior notes (no intended behavior changes)

- Redis adapter executor had no `await` — simply removed the `async` keyword.
- `...columnsMap[key]`, `...config.headers` etc. rely on object-spread ignoring
  `undefined`/`null`; semantics identical to the previous `\|\| {}` guards.
- ColumnAttributes: strings now skip `JSON.stringify` via a `typeof !== "string"`
  guard — output identical to before.

## Ignore patterns (unchanged)

`*.spec.ts`, `*.spec.tsx`, `dist`, `build`, `src-tauri/target`, `coverage`,
`playwright-report`, `test-results`.

## Migration history

- ESLint packages fully removed: `eslint`, `@typescript-eslint/parser`,
  `@typescript-eslint/eslint-plugin`, `eslint-plugin-react`,
  `eslint-plugin-unused-imports`, `.eslintrc.js`.
- Earlier migration fixes (kept from TODO version): unassigned `cookies` var in
  `fetchParser.ts`; duplicated `?.original \|\| ?.original` condition in ResultBox.
