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
