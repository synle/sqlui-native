---
name: install-app
description: Kill running instances, download the latest release artifact, install it locally, and launch the app. Handles macOS (DMG + xattr) and detects the right architecture automatically.
disable-model-invocation: true
allowed-tools: Bash(gh *) Bash(hdiutil *) Bash(cp *) Bash(xattr *) Bash(open *) Bash(rm *) Bash(ls *) Bash(uname *) Bash(cat *) Bash(pkill *) Bash(kill *) Bash(lsof *) Bash(ps *) Bash(sleep *)
---

# Install App from Latest Release

Kill any running sqlui-native processes, download, install, and launch from the latest GitHub release.

## Steps

### 0. Kill all running sqlui-native processes

This MUST run first to ensure a clean install. Kill the app, the sidecar server, and any related Node.js processes:

```bash
# Kill the Tauri app
pkill -f "sqlui-native" 2>/dev/null
osascript -e 'quit app "sqlui-native"' 2>/dev/null

# Kill any sqlui-server sidecar processes
pkill -f "sqlui-server" 2>/dev/null

# Kill any node processes running our server on common ports
lsof -ti tcp:3001 2>/dev/null | xargs kill -9 2>/dev/null

# Wait for processes to exit
sleep 2

# Verify nothing is left
ps aux | grep -E "sqlui-native|sqlui-server" | grep -v grep && echo "WARNING: processes still running" || echo "All clean"
```

### 1. Detect the current platform and architecture

```
uname -s   # Darwin = macOS, Linux, MINGW/MSYS = Windows
uname -m   # arm64 = Apple Silicon, x86_64 = Intel
```

### 2. Get the latest release tag

```
gh release view --json tagName --jq .tagName
```

If no release is found, list available releases and pick the latest non-draft one:

```
gh release list --limit 10
```

### 3. macOS

- Download the correct `.dmg` based on architecture. Try these patterns in order:
  - `*arm64.dmg` or `*aarch64.dmg` (Apple Silicon)
  - `*x64.dmg` or `*x86_64.dmg` (Intel)
  - Fall back to any `.dmg` if architecture-specific one isn't found.

```
gh release download <tag> --pattern "*.dmg" --dir /tmp
```

- If multiple DMGs downloaded, pick the right one for the arch.

- Mount the DMG:

```
hdiutil attach /tmp/<name>.dmg -nobrowse
```

- Find the mounted volume (name varies by version):

```
ls /Volumes/ | grep -i sqlui
```

- Copy to Applications (overwrite existing):

```
rm -rf "/Applications/sqlui-native.app"
cp -R "/Volumes/<volume-name>/sqlui-native.app" /Applications/
```

- Unmount the DMG:

```
hdiutil detach "/Volumes/<volume-name>"
```

- Strip quarantine attribute:

```
xattr -cr "/Applications/sqlui-native.app"
```

- Clean up:

```
rm -f /tmp/sqlui-native*.dmg
```

- Launch the app:

```
open /Applications/sqlui-native.app
```

### 4. Windows

- Download the `.exe` installer:

```
gh release download <tag> --pattern "*.exe" --dir /tmp
```

- Tell the user to run the installer.

### 5. Linux

- Download the `.deb` (or `.AppImage` for non-Debian distros):

```
gh release download <tag> --pattern "*.deb" --dir /tmp
```

- Install with `sudo dpkg -i /tmp/*.deb` or tell the user to run the AppImage.

## Important

- Always kill running instances FIRST before installing.
- Always tell the user which version and architecture was installed.
- If the expected artifact is missing from the release, list available assets and ask which one to use.
- On macOS, the `xattr` step is mandatory — the app will not launch without it.
