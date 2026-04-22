---
title: sqlui-native
---

# Installation

## Windows

1. Download: %download-link-windows-x64-exe%
2. Run the `.exe` installer
3. If Windows SmartScreen appears, click `More info` then `Run anyway`

![image](https://user-images.githubusercontent.com/3792401/153638199-32b6070f-ee05-48cd-9e84-1eba45db22e4.png)

![image](https://user-images.githubusercontent.com/3792401/153638206-b59ec443-02d5-4efa-92a1-dbecf79e36a6.png)

![image](https://user-images.githubusercontent.com/3792401/153638239-b9e1f1f7-2125-4316-885f-4e266c3a01de.png)

## Mac

1. Download: %download-link-mac-arm64%
2. Open the `.dmg` file and drag `sqlui-native.app` to the `Applications` folder
3. Open the app from Applications — macOS will block it the first time
4. Go to **System Settings > Privacy & Security**, scroll down, and click `Open Anyway`
5. Alternatively, run this in Terminal to bypass the quarantine check:

```
xattr -cr /Applications/sqlui-native.app
```

![image](https://user-images.githubusercontent.com/3792401/153640153-725af959-2989-4984-bbab-2f0995ddb94a.png)

![image](https://user-images.githubusercontent.com/3792401/153640199-b6eab565-38c7-4d73-877f-e7f66e18e1c6.png)

![image](https://user-images.githubusercontent.com/3792401/153640665-0699a88f-048b-4691-b529-78572d222fee.png)

![image](https://user-images.githubusercontent.com/3792401/153640374-e412585a-a139-4246-a045-869c4b280e23.png)

![image](https://user-images.githubusercontent.com/3792401/153640533-3ee26765-c808-4454-ba02-8c37d7deafbe.png)

![image](https://user-images.githubusercontent.com/3792401/153640735-8fe99a6e-c052-407e-95a9-13b00c3747f1.png)

### Mac Apple Silicon (M-Series) — "App is damaged" Error

On Apple Silicon Macs (M1/M2/M3/M4), you may see:

> "sqlui-native.app" is damaged and can't be opened. You should move it to the Trash.

This is caused by macOS quarantine attributes on unsigned apps. Fix it by running:

```
xattr -cr /Applications/sqlui-native.app
```

## Ubuntu / Debian

1. Download: %download-link-ubuntu%
2. Install via terminal:

```
sudo dpkg -i sqlui-native*.deb
```

![image](https://user-images.githubusercontent.com/3792401/153637978-d13ce394-b5b7-4e82-8392-6c6c2e53fe7e.png)

![image](https://user-images.githubusercontent.com/3792401/153638017-85896932-65b1-4670-9a05-b81bcb858d51.png)

## Linux Other Distros (AppImage)

1. Download: %download-link-appimage%
2. Make executable and run:

```
chmod +x sqlui-native*.AppImage
./sqlui-native*.AppImage
```
