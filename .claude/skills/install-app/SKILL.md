---
name: install-app
description: Download the latest release artifact, install it locally, and launch the app. Handles macOS (DMG + xattr + tccutil) and detects the right architecture automatically.
disable-model-invocation: true
allowed-tools: Bash(gh *) Bash(hdiutil *) Bash(cp *) Bash(xattr *) Bash(tccutil *) Bash(open *) Bash(rm *) Bash(ls *) Bash(uname *) Bash(cat *)
---

# Install App from Latest Release

Download, install, and launch sqlui-native from the latest GitHub release.

## Steps

1. Detect the current platform and architecture:

   ```
   uname -s   # Darwin = macOS, Linux, MINGW/MSYS = Windows
   uname -m   # arm64 = Apple Silicon, x86_64 = Intel
   ```

2. Get the latest release tag:

   ```
   gh release view --json tagName --jq .tagName
   ```

3. **macOS:**
   - Download the correct `.dmg` based on architecture:
     - Apple Silicon (arm64): `sqlui-native-arm64.dmg`
     - Intel (x86_64): `sqlui-native-x64.dmg`
   - If the architecture-specific DMG is not available, fall back to whichever `.dmg` exists.

   ```
   gh release download <tag> --pattern "sqlui-native-<arch>.dmg" --dir /tmp
   ```

   - Close any running instance of the app:

   ```
   osascript -e 'quit app "sqlui-native"' 2>/dev/null
   ```

   - Mount the DMG:

   ```
   hdiutil attach /tmp/sqlui-native-<arch>.dmg -nobrowse
   ```

   - Copy to Applications (overwrite existing):

   ```
   rm -rf "/Applications/sqlui-native.app"
   cp -R "/Volumes/sqlui-native <version>/sqlui-native.app" /Applications/
   ```

   - Unmount the DMG:

   ```
   hdiutil detach "/Volumes/sqlui-native <version>"
   ```

   - Strip quarantine and reset accessibility permissions:

   ```
   xattr -cr "/Applications/sqlui-native.app"
   tccutil reset Accessibility com.electron.sqlui-native
   ```

   - Launch the app:

   ```
   open "/Applications/sqlui-native.app"
   ```

   - Clean up:

   ```
   rm -f /tmp/sqlui-native-*.dmg
   ```

4. **Windows:**
   - Download the `.exe` installer:

   ```
   gh release download <tag> --pattern "sqlui-native-x64.exe" --dir /tmp
   ```

   - Tell the user to run the `.exe` to install.

5. **Linux:**
   - Download the `.deb` (or `.AppImage` / `.rpm` based on user preference):
   ```
   gh release download <tag> --pattern "sqlui-native.deb" --dir /tmp
   ```

   - Install with `sudo dpkg -i /tmp/sqlui-native.deb` or tell the user to run the AppImage.

## Important

- Always tell the user which version and architecture was installed.
- If the expected artifact is missing from the release, list available assets and ask which one to use.
- On macOS, the `xattr` and `tccutil` steps are mandatory — the app will not launch without them.
