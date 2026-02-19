---
title: sqlui-native
---

# Installation:

## Windows

- %download-link-windows%
- Open the `.exe` file
- Click on `More info`
- Then choose `Run anyway`

![image](https://user-images.githubusercontent.com/3792401/153638199-32b6070f-ee05-48cd-9e84-1eba45db22e4.png)

![image](https://user-images.githubusercontent.com/3792401/153638206-b59ec443-02d5-4efa-92a1-dbecf79e36a6.png)

![image](https://user-images.githubusercontent.com/3792401/153638239-b9e1f1f7-2125-4316-885f-4e266c3a01de.png)

## Mac

- %download-link-mac%
- Open the `.dmg` file
- Drag the binary to Application file
- Open the app once in the Applications folder
- When prompted, clicked on Cancel
- Open `System Preference`, then `Security & Privacy`, then click on `General` tab
- Click on `Open Anyway`

![image](https://user-images.githubusercontent.com/3792401/153640153-725af959-2989-4984-bbab-2f0995ddb94a.png)

![image](https://user-images.githubusercontent.com/3792401/153640199-b6eab565-38c7-4d73-877f-e7f66e18e1c6.png)

![image](https://user-images.githubusercontent.com/3792401/153640665-0699a88f-048b-4691-b529-78572d222fee.png)

![image](https://user-images.githubusercontent.com/3792401/153640374-e412585a-a139-4246-a045-869c4b280e23.png)

![image](https://user-images.githubusercontent.com/3792401/153640533-3ee26765-c808-4454-ba02-8c37d7deafbe.png)

![image](https://user-images.githubusercontent.com/3792401/153640735-8fe99a6e-c052-407e-95a9-13b00c3747f1.png)

### Mac Apple Silicon (M-Series) Troubleshooting

On macOS 26+ with Apple Silicon (M1/M2/M3/M4), you may see the following error when attempting to open the app:

> "sqlui-native.app" is damaged and can't be opened. You should move it to the Trash.

This is caused by macOS quarantine attributes applied to unsigned apps. To fix this, open Terminal and run:

```
xattr -cr /Applications/sqlui-native.app
```

After running the command, you should be able to open sqlui-native normally.

## Ubuntu / Debian

- %download-link-ubuntu%
- Run the following shell command to install the above `.deb`

```
sudo dpkg -i sqlui-native*.deb
```

![image](https://user-images.githubusercontent.com/3792401/153637978-d13ce394-b5b7-4e82-8392-6c6c2e53fe7e.png)

![image](https://user-images.githubusercontent.com/3792401/153638017-85896932-65b1-4670-9a05-b81bcb858d51.png)

## Redhat / CentOS / Fedora

- Download the above `.rpm` file
- Run the following shell command to install the above `.rpm`

```
sudo rpm -i sqlui-native*.rpm
```

## Arch Linux with pacman

```
# download and install it with this command
sudo pacman -U ./sqlui-native*.pacman


# or run this command to download and install it in one command
# replace the version for the latest build
curl https://github.com/synle/sqlui-native/releases/download/1.61.16/sqlui-native-1.61.16.pacman -O -J -L && sudo pacman -U sqlui-native*.pacman && rm sqlui-native*.pacman
```
