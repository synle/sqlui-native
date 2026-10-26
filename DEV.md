# Development Guide

Read `AGENTS.md` for repository rules and `ARCHITECTURE.md` for runtime ownership. `CONTRIBUTING.md` covers database fixtures, integration setup, and adapter implementation details.

Commands below reflect repository configuration, not a claim that they passed in the current session.

## Prerequisites

- Use the development Node version in `.node-version` (currently 24) and npm.
- Tauri development and packaging also require Rust and the platform's Tauri build prerequisites.
- Docker is needed for local database integration tests, not ordinary frontend development.
- Desktop packages include Node; `scripts/download-node.js` controls the bundled version independently of `.node-version`.
- Portal execution requires Node 22 or newer because backend code uses `node:sqlite`; the Vite `node18` output target does not lower that runtime requirement.

Install dependencies from the repository root. Review dependency lifecycle scripts before permitting their execution, following global dependency-safety rules.

## Start Development

| Command                        | Behavior                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `npm start` or `npx tauri dev` | Tauri development window plus the browser development stack                    |
| `npm run dev`                  | Hono server on loopback port 3001 plus Vite on port 3000                       |
| `npm run dev-server`           | Server build watcher plus nodemon restart loop                                 |
| `npm run start-webapp`         | Vite frontend only; expects the API on port 3001                               |
| `npm run start-server`         | Builds the server through its prestart hook, then runs `build/sqlui-server.js` |

`predev` runs `scripts/prebuild.js`. Vite proxies `/api` requests to the backend; Tauri debug builds do not spawn an additional sidecar.

These are long-running commands. For agent-driven work, launch them in the background with captured logs and track their process IDs.

### Data and Process Safety

Set `SQLUI_HOME_DIR` to a fresh disposable directory before launching a manual test server. Keep real desktop and portal profiles untouched.

**Warning:** `startStandalone()` in `src/sqlui-server/index.ts` tries to kill the process occupying port 3001 before listening. Inspect ownership before starting it.

Do not launch the standalone server against an occupied port unless the listener is verified as part of this task and stopping it is authorized. Do not kill by process name or port alone.

Changing the frontend port alone does not isolate a second stack: Vite's API proxy, the backend port, and Tauri's `devUrl` must agree.

## Build and Package

Run all build commands from the repository root.

| Command                             | Output / lifecycle                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run build`                     | Prebuild, Vite frontend into `build/`, then `postbuild` runs `build-server`         |
| `npm run build-server`              | Standalone server bundle at `build/sqlui-server.js`                                 |
| `npm run build-server-sidecar`      | Fully bundled sidecar plus sibling `sqlui-server-assets.json`                       |
| `npm run build:tauri`               | Frontend/server, sidecar bundle, Node download, and prepared `src-tauri/resources/` |
| `npm run dist` or `npx tauri build` | Native packages; Tauri's `beforeBuildCommand` already invokes `build:tauri`         |
| `npm run build:portal`              | Frontend and portal distribution under `dist/portal/`                               |

Do not install dependencies inside `build/` or treat it as a separate source package. `scripts/build.sh` is a legacy wrapper with dependency-install and OS-package side effects, not a prerequisite for Tauri packaging.

### Generated Files and Version Synchronization

`scripts/prebuild.js` selects the higher version from `package.json` and `src-tauri/tauri.conf.json`, then synchronizes differing versions and lockfile metadata.

It also creates `src/package.json`, build/public package metadata, and removes stale `build/assets/` before regeneration. Builds can therefore change files; inspect the working tree afterward.

- Do not hand-edit `src/package.json`, generated build output, or embedded-asset JSON.
- `scripts/prepare-sidecar.js` copies server artifacts and Node into `src-tauri/resources/`.
- `scripts/download-node.js` keys the cached binary by platform, architecture, and version. Set `TARGET_PLATFORM`/`TARGET_ARCH` correctly for cross-target packaging.
- Prepare `src-tauri/resources/` through `npm run build:tauri` before invoking Cargo directly; the native build expects those resources.
- Tauri rejects a `node_modules` entry in `frontendDist`; the preparation script removes the build-directory symlink.
- `guides.md` is generated by `DataScriptFactory.spec.ts`, not edited manually.

### Affected-Build Requirements

After build-related or Vite configuration changes, run the affected task:

- Frontend: `npm run build`.
- Server: `npm run build-server`.
- Tauri/sidecar: `npm run build:tauri && npx tauri build`.
- Shared backend (`src/common/`): run all three build paths above.
- Portal build or entry changes: also run `npm run build:portal`.

The Tauri command reruns its configured before-build hook; the explicit preparation step remains useful when diagnosing resources. Do not infer success from a previous build's artifacts.

## Checks

Follow the batching policy in `AGENTS.md`. Run the local pre-commit chain once after all edits unless the user explicitly waives checks:

```bash
npm run lint && npm run typecheck && npm run test-ci && npm run format
```

| Command                                   | Scope / caveat                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run lint`                            | `oxlint --fix src`; mutates source, not ESLint                                                |
| `npm run typecheck`                       | TypeScript without emit                                                                       |
| `npm run test-ci`                         | One-shot unit suite; `pretest-ci` first builds frontend and server                            |
| `npm test`                                | Build followed by Vitest watch mode; unsuitable for unattended one-shot checks                |
| `npx vitest run src/path/to/file.spec.ts` | Focused unit test without npm's full pretest build hook                                       |
| `npm run test-integration`                | Integration suite; local databases need Docker and cloud adapters need configured credentials |
| `npm run format`                          | `oxfmt --write .`; can touch unrelated files                                                  |
| `npm run format:check`                    | Read-only formatting check                                                                    |
| `npm run validate`                        | CI-only: lint, typecheck, unit tests, format, E2E, smoke, integration                         |

For scoped formatting, invoke the installed formatter on the exact changed paths rather than reformatting unrelated work:

```bash
./node_modules/.bin/oxfmt --write AGENTS.md DEV.md ARCHITECTURE.md
```

Do not run `test-e2e`, `test-smoke`, or `validate` locally. Automated browser E2E belongs in CI; explicitly requested manual checks use the `test-app` skill.

For one integration file:

```bash
npx vitest run --config vitest.integration.config.ts src/common/adapters/RelationalDataAdapter/mysql.integration.spec.ts
```

Never print `TEST_*_CONNECTION` values. Missing cloud credentials mean skipped coverage, not a passing cloud-adapter check.

### Coverage Ownership

Keep numeric floors in their authoritative configuration, not duplicated here:

- JS/TS enforcement: `vitest.config.ts` → `test.coverage.thresholds`, enabled by coverage runs.
- JS/TS workflow `MIN_*` values: `.github/workflows/build-main.yml` and `.github/workflows/integration-test.yml`.
- Rust enforcement: `rust_unit_tests` in `.github/workflows/integration-test.yml`, using `cargo-llvm-cov` and its `MIN_*` variables.
- Rust summary output: `src-tauri/rust-coverage.json`; CI uploads it as `rust-coverage`.

**Known drift:** `build-main.yml` currently has lower JS/TS reporting baselines than Vitest and `integration-test.yml`. Do not describe those values as synchronized.

Vitest remains the JS/TS enforcement gate. When raising floors, update the config and both workflows together; do not lower floors to hide drift.

Rust coverage uses the library test target on the runner's OS. Release-only branches are excluded; platform-gated branches for other operating systems are unmeasured.

## Dependency Upgrade Ledger

This ledger records dependency versions evaluated for this repository. “Upstream changes” summarizes relevant release or security notes; “Repository impact” states whether current code uses affected behavior. Each accepted dependency update has its own commit.

### Node.js and frontend

| Package                   | Version               | Upstream changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Repository impact                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dompurify`               | `3.4.13` → `3.4.17`   | Fixes template-expression sanitization with attached shadow roots and XHTML SVG attribute validation; no API migration reported. [GHSA-cg2g-xh64-v4q7](https://github.com/cure53/DOMPurify/security/advisories/GHSA-cg2g-xh64-v4q7), [GHSA-c6gr-qvv4-5v3f](https://github.com/cure53/DOMPurify/security/advisories/GHSA-c6gr-qvv4-5v3f).                                                                                                                                                                                                                                                                                                                             | `sanitizeHtml` uses the default string-returning mode; it does not enable `SAFE_FOR_TEMPLATES`, DOM-returning options, or XHTML parsing. No call-site migration required.                                                                                                                                                                                                                            |
| `hono`                    | `4.13.3` → `4.13.14`  | Fixes static-path decoding and related security issues. `serveStatic` now serves only GET and HEAD requests. [v4.13.14 release](https://github.com/honojs/hono/releases/tag/v4.13.14), [GHSA-5r4p-p66f-jhc7](https://github.com/honojs/hono/security/advisories/GHSA-5r4p-p66f-jhc7).                                                                                                                                                                                                                                                                                                                                                                                | `server.ts` uses `serveStatic` for frontend assets; browser asset requests use GET, and API routes are separate. No migration needed.                                                                                                                                                                                                                                                                |
| `@hono/node-server`       | `2.1.1` → `2.1.5`     | Fixes HTTP/2 reset signal handling and limits static serving to GET and HEAD. [v2.1.5 release](https://github.com/honojs/node-server/releases/tag/v2.1.5).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `index.ts` and `portal.ts` use `serve`; `server.ts` uses `serveStatic`. Static assets use GET/HEAD, and no server API changes are required.                                                                                                                                                                                                                                                          |
| `@testing-library/dom`    | `10.4.1` → `10.4.2`   | Patch update; no API migration identified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | No application source imports this test utility directly; test libraries consume it. No runtime migration.                                                                                                                                                                                                                                                                                           |
| `@testing-library/react`  | `16.3.2` → `16.3.3`   | Patch update; React 18/19 and DOM 10 peer ranges remain supported.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Test-only dependency; no application runtime migration. The unit suite verifies test-runner compatibility.                                                                                                                                                                                                                                                                                           |
| `@tanstack/react-virtual` | `3.14.10` → `3.14.23` | Patch-series update; no breaking API change identified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Data tables, toast history, and the connection tree use `useVirtualizer`; current options remain unchanged.                                                                                                                                                                                                                                                                                          |
| `@vitejs/plugin-react`    | `6.1.0` → `6.1.2`     | Patch update; no plugin API migration identified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Used only by the Vite frontend config; final Vite build verifies plugin compatibility.                                                                                                                                                                                                                                                                                                               |
| `mysql2`                  | `3.24.0` → `3.24.6`   | Patch update; no connection or query API migration identified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | MySQL/MariaDB adapters use `createPool`, `getConnection`, `query`, and `end`; no call-site migration.                                                                                                                                                                                                                                                                                                |
| `pg`                      | `8.23.0` → `8.23.1`   | Patch update; no `Client` API migration identified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | The Postgres adapter uses `Client.connect`, `query`, and `end`; no call-site migration.                                                                                                                                                                                                                                                                                                              |
| `jsforce`                 | `3.10.22` → `3.12.0`  | Fixes SFDX command spawning and a JWT instance URL issue; adds opt-in W3C trace propagation and updates `csv-parse`. No removed API appears in the changelog. [3.12.0 changelog](https://github.com/jsforce/jsforce/blob/3.12.0/CHANGELOG.md?raw=1).                                                                                                                                                                                                                                                                                                                                                                                                                 | The adapter uses `Connection` login, identity, describe, and SObject APIs; it does not use SFDX Registry, JWT auth, or trace-context configuration. No call-site migration required.                                                                                                                                                                                                                 |
| `qs`                      | `6.15.3` → `6.16.1`   | Fixes `arrayLimit` and `isBuffer` parsing issues; 6.16.1 also fixes serialization/merge edge cases. 6.16.0 adds optional stringify depth control with the existing default unchanged. [6.16.1 changelog](https://github.com/ljharb/qs/blob/v6.16.1/CHANGELOG.md?raw=1), [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx), [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g).                                                                                                                                                                                                                                          | The app only calls `qs.stringify(options)` when building PostgreSQL URLs and generated connection examples; it does not call `parse`. Default serialization needs no migration.                                                                                                                                                                                                                      |
| `vite`                    | `8.2.2` → `8.3.5`     | Fixes current 8.2.x server/security advisories and includes build/optimizer fixes; no migration entry appears in the release notes. [v8.3.5 release](https://github.com/vitejs/vite/releases/tag/v8.3.5), [GHSA-rq7h-c2jc-7f22](https://github.com/vitejs/vite/security/advisories/GHSA-rq7h-c2jc-7f22), [GHSA-vfpm-58rq-9qcg](https://github.com/vitejs/vite/security/advisories/GHSA-vfpm-58rq-9qcg).                                                                                                                                                                                                                                                              | `monacoSetup.ts` imports editor and JSON worker entrypoints separately; the Vite 8.3.5 production build emitted both outputs. The open [nested-worker issue](https://github.com/vitejs/vite/issues/23894) appears outside this path. Existing Vite deprecation warnings were present before this update.                                                                                             |
| `monaco-editor`           | `0.55.1` → `0.57.0`   | 0.56.0 reorganizes public ESM entrypoints, renames `stackOridinal`, and removes deprecated `IMirrorModel`/`IWorkerContext` types. 0.57.0 updates bundled DOMPurify to 3.4.15. [Changelog](https://github.com/microsoft/monaco-editor/blob/v0.57.0/CHANGELOG.md?raw=1).                                                                                                                                                                                                                                                                                                                                                                                               | The app's old deep ESM imports broke the build; `monacoSetup.ts` now uses public entrypoints and explicit grammar/worker registrations. No references to removed types or the renamed property were found. TypeScript now uses `moduleResolution: bundler` for package exports. npm override keeps Monaco's nested DOMPurify at patched 3.4.17. Build, typecheck, and 19 Monaco/editor tests passed. |
| `@vitest/coverage-v8`     | `4.1.11` → `4.1.12`   | Patch release aligns the V8 coverage provider with Vitest 4.1.12; no provider API changes listed. [v4.1.12 release](https://github.com/vitest-dev/vitest/releases/tag/v4.1.12).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Repository uses the provider only for test coverage; Vitest 4.1.12 follows in its own commit to restore the declared peer-version pair. No application runtime migration.                                                                                                                                                                                                                            |
| `vitest`                  | `4.1.11` → `4.1.12`   | Hardens manual and redirect mocks; no test API migration listed. [v4.1.12 release](https://github.com/vitest-dev/vitest/releases/tag/v4.1.12), [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8), [GHSA-xp26-3454-mjgp](https://github.com/advisories/GHSA-xp26-3454-mjgp).                                                                                                                                                                                                                                                                                                                                                                   | Vitest runs repository tests only. Existing `vi.mock` usage remains unchanged; coverage provider and runner now align at 4.1.12.                                                                                                                                                                                                                                                                     |
| `concurrently`            | `7.6.0` → `10.0.6`    | v8 raises the Node floor to 18; v9 changes interruption behavior with `--max-processes`; v10 raises the Node floor to 22, becomes ESM-only, removes deprecated flags, and defaults prefix colors to automatic. v10.0.6 updates `shell-quote` to 1.12.0. Upstream has no `CHANGELOG.md`; release notes were reviewed for v8, v9, and v10. [v8.0.0](https://github.com/open-cli-tools/concurrently/releases/tag/v8.0.0), [v9.0.0](https://github.com/open-cli-tools/concurrently/releases/tag/v9.0.0), [v10.0.0](https://github.com/open-cli-tools/concurrently/releases/tag/v10.0.0), [v10.0.6](https://github.com/open-cli-tools/concurrently/releases/tag/v10.0.6). | The repository invokes only the CLI in development scripts; it imports no API and uses none of the removed flags or `--max-processes`. Development Node 24 satisfies the new floor. Only developer log prefix colors change. Version check and two short child commands passed.                                                                                                                      |
| `oxfmt`                   | `0.61.0` → `0.74.0`   | Fixes critical Tinypool advisories through Tinypool 2.2.0. 0.72.0 changes Markdown formatting; 0.73.0 changes the `--migrate prettier` interface and TOML formatter crate. [v0.72.0](https://github.com/oxc-project/oxc/releases/tag/oxfmt_v0.72.0), [v0.73.0](https://github.com/oxc-project/oxc/releases/tag/oxfmt_v0.73.0), [v0.74.0](https://github.com/oxc-project/oxc/releases/tag/oxfmt_v0.74.0), [GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr).                                                                                                         | The app does not use `--migrate prettier` or the formatter crate API. Under 0.74.0, `oxfmt --check .` flags only `DEV.md`; the Markdown formatting change is limited to this dependency ledger.                                                                                                                                                                                                      |

### Tauri and Rust

Rust/Tauri dependency findings will be recorded here after the Node/frontend phase.

## Debugging

`.vscode/launch.json` provides server, Chrome webapp, Tauri, unit-test, current-file, and integration-test configurations.

- API health: `/api/health` returns status, PID, and uptime.
- Desktop startup: inspect the Node selection and `__SIDECAR_PORT__=` handshake in `src-tauri/src/lib.rs` and `src/sqlui-server/index.ts`.
- React Query Devtools: `Ctrl+Shift+Alt+D` on Windows/Linux or `Cmd+Shift+Option+D` on macOS. The Command Palette also exposes the toggle.
- Command Palette: `Cmd+P` on macOS or `Ctrl+P` elsewhere.
- Use built macOS applications from `/Applications/` or their mounted DMG rather than arbitrary extracted locations.

Do not diagnose by reading real saved connection profiles or local database snapshots without the required secret-access authorization.

## Installation and Release

Use `.agents/skills/install-app/SKILL.md` to install an existing release for the matching OS and architecture. Preserve any existing installation before replacing it.

For unsigned macOS packages, the installation procedure includes:

```bash
xattr -cr "/Applications/sqlui-native.app"
```

Windows uses the matching `.exe` installer. Linux release artifacts include `.deb` and AppImage formats.

Use `.agents/skills/release/SKILL.md` only for an explicit release request. It owns official/beta routing, duplicate-run checks, commit summaries, and workflow dispatch.

`release-official.yml` delegates to `package.yml`; `release-beta.yml` is the explicit prerelease path. Leave custom notes inputs unset so workflows generate release notes.
