---
name: install-app
description: Download an existing SQLUI Native release for the current OS and architecture, install it locally, and launch it. Use when the user requests installation rather than publication.
---

# Install App from an Existing Release

Install an existing release without triggering a build or release workflow. Follow global secret-handling and destructive-operation rules.

## Preconditions

1. Resolve the repository identity from GitHub or its remote; do not infer it from the checkout directory.
2. Detect the operating system and architecture.
3. Inspect the latest release and its actual asset list. If the default lookup fails, list releases and select the latest non-draft release.
4. Match the artifact to the OS and architecture; do not silently fall back to an arbitrary DMG or installer.
5. If the expected artifact is missing, show available assets and ask which one to use.
6. Create a task-specific download directory. Track exact downloaded paths and mounted volumes rather than using shared-directory wildcards.

## Stop the Target Installation

Stop the application being replaced before installation. Identify its executable path and PID, then establish which child sidecar belongs to it.

Ask before stopping user-owned processes that this task did not create. Prefer a normal application quit and wait for the sidecar's parent-death shutdown.

If shutdown fails, inspect the specific remaining PID and request approval before forced termination. Never kill by name, kill every Node process, or terminate an unknown listener on port 3001.

## macOS

1. Download the matching DMG and mount that exact file without opening unrelated volumes.
2. Record the mount path returned by the mount command. Locate `sqlui-native.app` inside that mounted volume.
3. If `/Applications/sqlui-native.app` exists, preserve a recoverable backup before replacing it. Ask before deleting or overwriting an untracked installation.
4. Copy the new app to `/Applications/`.
5. Detach only the volume mounted by this task.
6. Strip quarantine from the installed unsigned application:

   ```bash
   xattr -cr "/Applications/sqlui-native.app"
   ```

7. Launch the installed app:

   ```bash
   open /Applications/sqlui-native.app
   ```

8. Confirm startup before treating installation as successful. Keep the backup available for rollback if the new app fails.
9. Clean up only exact task-owned download paths, with the required destructive-action approval. Never delete a wildcard of shared temporary files.

## Windows

Download the matching `.exe` installer and tell the user which exact file to run. Do not claim installation succeeded before the user confirms completion.

## Linux

Download the matching `.deb` for Debian-based systems or AppImage for other distributions. Obtain approval for privileged installation and target only the downloaded file.

If installation requires interaction or privileges unavailable to the agent, give the user the exact artifact path and report installation as pending.

## Completion

Report the release version, OS, architecture, installation path, launch result, and any retained backup or pending user action. Never report a download alone as a completed installation.
