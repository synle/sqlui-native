---
name: release-beta
description: Trigger a beta test release. Dispatches the release-beta.yml workflow to build the app for all platforms and upload artifacts as a draft GitHub release.
disable-model-invocation: true
allowed-tools: Bash(gh *) Bash(git *) Bash(cat *)
---

# Release Beta

Trigger the beta release workflow (`release-beta.yml`) to build test artifacts for all platforms.

## Steps

### 1. Determine the commit SHA to build

By default, use the current HEAD of the main branch. If the user specifies a different SHA or branch, use that instead.

```bash
git rev-parse HEAD
```

### 2. Dispatch the workflow

```bash
gh workflow run release-beta.yml --ref main -f sha="<commit-sha>"
```

If building HEAD, you can omit the sha field (it defaults to HEAD):

```bash
gh workflow run release-beta.yml --ref main
```

### 3. Confirm dispatch and show the workflow run

```bash
# Wait a moment for the run to register
sleep 3
gh run list --workflow=release-beta.yml --limit 1
```

Tell the user the workflow has been dispatched and provide the link to monitor it.

## Important

- Beta releases create **draft** GitHub releases with build artifacts for all platforms (macOS ARM/Intel, Windows, Linux).
- They are NOT published or marked as latest — they are for testing only.
- The release tag format is `release-beta-<date>-<short-sha>`.
- Draft releases accumulate over time. Use the cleanup-releases workflow or manually delete old drafts periodically.
