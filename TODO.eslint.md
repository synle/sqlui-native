# TODO — oxlint rule debt

Context: linting migrated from ESLint 8 (+ @typescript-eslint, eslint-plugin-react,
eslint-plugin-unused-imports) to **oxlint** (`npm run lint` → `oxlint --fix src`).
Config lives in `.oxlintrc.json`. This file documents every rule we carried over,
disabled, or tuned to keep the codebase warning-clean, so a future agent can
revisit and tighten them.

## Goal for follow-up agent

Work each item below toward `error` severity or removal of the override — i.e.
fix the underlying code instead of silencing the rule. Nothing here is blocking;
the current setup exits 0 with zero warnings.

## Rules currently enabled (warn)

| Rule                   | Config                                                                                                      | Notes                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `correctness` category | `"warn"`                                                                                                    | oxlint's default bucket; catches real bugs  |
| `no-unused-vars`       | warn, `argsIgnorePattern`/`varsIgnorePattern`/`caughtErrorsIgnorePattern`: `^_`, `ignoreRestSiblings: true` | Repo convention: unused params prefixed `_` |
| `no-debugger`          | warn                                                                                                        | Carried over from old ESLint config         |
| `no-empty`             | warn, `allowEmptyCatch: true`                                                                               | Empty catch allowed intentionally           |

## Rules disabled (carried over from old .eslintrc.js)

These were already off under ESLint; kept off to preserve behavior:

- [ ] `no-async-promise-executor` — async executors used in a few places; audit and enable
- [ ] `no-case-declarations` — lexical declarations in case blocks; add braces instead
- [ ] `no-fallthrough` — intentional fallthroughs exist; audit each and annotate/fix
- [ ] `no-self-assign` — mostly harmless; verify none are copy-paste bugs
- [ ] `no-unsafe-optional-chaining` — heavy optional-chain usage across frontend; large fix surface

## Rules disabled (oxlint-only rules that were never on before)

New engine flagged idiomatic-but-noisy patterns; turned off rather than churning
hundreds of lines during migration:

- [ ] `no-unused-expressions` — 19 hits at migration time; React short-circuit
      renders like `cond && <Foo />`. Enable with TS-aware config later.
- [ ] `unicorn/no-useless-spread` — 7 hits; style-level cleanup candidates
- [ ] `unicorn/no-useless-fallback-in-spread` — 7 hits; e.g. `...(x || {})`
      where `x` is never falsy. Safe mechanical fixes.

## Real issues found and fixed during migration

Kept here as proof the stricter engine pays off:

1. `src/common/adapters/RestApiDataAdapter/fetchParser.ts` — `let cookies`
   declared but never assigned (always `undefined`); now explicit
   `cookies: undefined` in the returned object.
2. `src/frontend/components/ResultBox/index.tsx` — duplicated condition
   `x?.original || x?.original || x`; deduped to `x?.original || x`.

## Ignore patterns

`*.spec.ts`, `*.spec.tsx`, `dist`, `build`, `src-tauri/target`, `coverage`,
`playwright-report`, `test-results`.

## Migration notes

- ESLint packages removed entirely: `eslint`, `@typescript-eslint/parser`,
  `@typescript-eslint/eslint-plugin`, `eslint-plugin-react`,
  `eslint-plugin-unused-imports`, `.eslintrc.js`.
- No custom ESLint plugins were in use, so nothing needs porting back if oxlint
  covers it. If a rule proves un-replicable in oxlint, re-add targeted ESLint
  alongside rather than dropping the check silently.
