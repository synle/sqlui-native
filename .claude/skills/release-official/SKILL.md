---
name: release-official
description: Trigger an official production release. Generates release notes from changes since the last published official release and dispatches the release-official.yml workflow.
disable-model-invocation: true
allowed-tools: Bash(gh *) Bash(git *) Bash(cat *) Bash(node *)
---

# Release Official

Trigger the official production release workflow (`release-official.yml`). This generates release notes from all commits since the last published official release and dispatches the workflow.

## Steps

### 1. Find the last official published release

The last official release is the most recent **non-draft, non-prerelease** release:

```bash
gh release list --limit 20 --json tagName,isDraft,isPrerelease --jq '[.[] | select(.isDraft == false and .isPrerelease == false)] | .[0].tagName // empty'
```

If no official release exists, use the first commit as the baseline.

### 2. Get the current version from package.json

```bash
node -p "require('./package.json').version"
```

### 3. Generate release notes

Get the commit log since the last official release tag:

```bash
git log <last-tag>..HEAD --pretty=format:"- %s (%h)" --no-merges
```

If no previous tag, use `git log --pretty=format:"- %s (%h)" --no-merges -20` for the last 20 commits.

### 4. Show the user the release notes and ask for confirmation

Display:

- Current version from package.json
- Last official release tag
- Number of commits since last release
- The generated changelog

Ask the user to confirm or edit the release notes before proceeding.

### 5. Dispatch the workflow

```bash
gh workflow run release-official.yml --ref main -f message="<release-notes>"
```

### 6. Confirm dispatch and show the workflow run

```bash
# Wait a moment for the run to register
sleep 3
gh run list --workflow=release-official.yml --limit 1
```

Tell the user the workflow has been dispatched and provide the link to monitor it.

## Important

- Always show the changelog and ask for confirmation BEFORE dispatching.
- The release notes (`message` field) should include the generated changelog.
- The workflow creates the release as a draft, builds all platforms, runs integration tests, and publishes (un-drafts + marks as latest) only if everything succeeds.
- If any build or test fails, the release is automatically rolled back (deleted).
