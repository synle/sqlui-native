---
name: test-app
description: Guide explicitly requested manual checks of browser development, Tauri development, and an existing bundled application. Pause for user confirmation between phases without publishing a release.
---

# Manual App Testing

Use this skill only when the user requests interactive manual testing. It does not authorize local automated E2E tests, publication, or stopping unrelated applications.

Read `../../../AGENTS.md`, `../../../DEV.md`, and `../../../ARCHITECTURE.md` first. Run commands from the repository root.

Run the phases in order and wait for explicit user confirmation before advancing.

## Preparation

- Use a fresh disposable `SQLUI_HOME_DIR` for the test servers and application. Do not reuse the user's desktop or portal profile.
- Inspect listeners on ports 3000 and 3001 before startup. The standalone server itself attempts to kill a listener on 3001.
- If either port belongs to another task or user process, stop and ask rather than starting over it.
- Start long-running commands in the background, capture logs, and record task-owned PIDs.
- Stop only this task's processes between phases. Ask before stopping an existing user-owned application.
- If startup fails, diagnose and fix the failure before asking the user to test.

## Phase 1: Browser Development

1. Start `npm run dev` from the repository root with the disposable storage environment. Its predev hook prepares generated metadata.
2. Wait for both Hono and Vite to report readiness.
3. Ask the user to open `http://localhost:3000/`.
4. Request checks for app loading, editor rendering, highlighting, typing, autocomplete, and console errors.
5. Wait for the user's result and explicit signal to proceed.
6. Stop the task-owned development processes before Phase 2.

## Phase 2: Tauri Development

1. Start `npm start` in the background with the same isolated storage configuration.
2. Wait for the Tauri development window and backend readiness.
3. Request checks for app loading, editor typing, autocomplete, and console errors.
4. Wait for the user's result and explicit signal to proceed.
5. Close the task-owned development application and servers before Phase 3.

## Phase 3: Existing Bundled Application

1. Find an existing artifact for the intended version and host architecture. Do not hard-code ARM64.
2. On macOS, use the matching DMG; on other platforms, use the matching native package.
3. Follow `../install-app/SKILL.md` for installation safety, backup, and macOS quarantine handling.
4. Launch the application with the disposable storage environment and verify the effective profile before creating connections.
5. Request checks for app loading, editor typing, autocomplete, and console errors.
6. Wait for final user confirmation.

If the requested artifact does not exist, report that phase as blocked. Do not dispatch an official or beta release to manufacture a test artifact.

A separately authorized release follows `../release/SKILL.md`. A separately authorized local packaging run follows `../../../DEV.md`.

## Completion

Report each phase as passed, failed, blocked, or not run, based on startup evidence and the user's actual confirmation. Include remaining task-owned processes and the disposable storage path.
