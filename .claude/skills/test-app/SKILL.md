---
name: test-app
description: Manually test the app in 3 phases - dev server, Electron, and bundled DMG. Use when validating that the app works end-to-end after changes.
disable-model-invocation: true
allowed-tools: Bash(npm *) Bash(node *) Bash(npx *) Bash(lsof *) Bash(kill *) Bash(open *) Bash(sleep *) Bash(gh *) Bash(ls *) Bash(tail *) Bash(cat *)
---

# Manual App Testing (3 Phases)

Run the app in each runtime mode, pausing for the user to manually verify after each phase. Wait for explicit user confirmation before moving to the next phase.

## Phase 1: Dev Server (Browser Mode)

1. Kill any existing processes on ports 3000 and 3001:
   ```
   lsof -ti:3000,3001 | xargs kill -9 2>/dev/null
   ```
2. Build the sqlui-server if `build/sqlui-server.js` doesn't exist:
   ```
   npm run build-server
   ```
3. Start the sqlui-server (port 3001) in the background:
   ```
   NODE_OPTIONS='--max-old-space-size=4096' node build/sqlui-server.js
   ```
4. Start the Vite dev server (port 3000) in the background:
   ```
   NODE_OPTIONS='--max-old-space-size=4096' ENV_TYPE='browser' npx vite --config vite.frontend.config.ts --strictPort
   ```
5. Wait for both to be ready, then tell the user:
   - Open http://localhost:3000/
   - Verify: app loads, editor renders with syntax highlighting, typing and autocomplete work, no console errors
6. **Wait for user signal** before proceeding.
7. Kill processes on ports 3000 and 3001 before moving on.

## Phase 2: Electron (npm start)

1. Run `npm start` in the background (this triggers prebuild + build + electron launch).
2. Wait for the Electron window to appear (monitor logs for successful startup).
3. Tell the user:
   - Verify: Electron app loads, editor works, autocomplete works, no console errors (Cmd+Shift+Option+I for DevTools)
4. **Wait for user signal** before proceeding.

## Phase 3: Bundled DMG

1. Check if a GitHub Actions release workflow is running for the current version. If not, trigger one:
   ```
   gh workflow run dist-main.yml --ref main
   ```
2. Poll the workflow until the macOS ARM64 build job completes (check every 60 seconds).
3. Find the release tag matching the version in `package.json`.
4. Download the `sqlui-native-arm64.dmg` asset to `/tmp/`.
5. Open the DMG:
   ```
   open /tmp/sqlui-native-arm64.dmg
   ```
6. Tell the user:
   - Open the app from the DMG (drag to Applications or run directly)
   - Verify: app loads, editor works, autocomplete works, no console errors
7. **Wait for user signal** for final confirmation.

## Important

- After each phase, clearly tell the user it's ready and what to test.
- Do NOT proceed to the next phase until the user explicitly says to move on.
- If any phase fails to start, diagnose the issue and fix it before asking the user to test.
