#!/bin/bash
####################################
# download-node.sh
# Downloads a platform-specific Node.js binary for the Tauri sidecar.
# Usage: bash scripts/download-node.sh <target-triple>
# Example: bash scripts/download-node.sh aarch64-apple-darwin
####################################

set -euo pipefail

NODE_VERSION="${NODE_VERSION:-24}"
TARGET_TRIPLE="${1:?Usage: download-node.sh <target-triple>}"
BINARIES_DIR="src-tauri/binaries"

mkdir -p "$BINARIES_DIR"

# Map Rust target triple to Node.js platform/arch
case "$TARGET_TRIPLE" in
  x86_64-pc-windows-msvc)
    NODE_PLATFORM="win"
    NODE_ARCH="x64"
    EXT=".exe"
    ;;
  aarch64-pc-windows-msvc)
    NODE_PLATFORM="win"
    NODE_ARCH="arm64"
    EXT=".exe"
    ;;
  x86_64-apple-darwin)
    NODE_PLATFORM="darwin"
    NODE_ARCH="x64"
    EXT=""
    ;;
  aarch64-apple-darwin)
    NODE_PLATFORM="darwin"
    NODE_ARCH="arm64"
    EXT=""
    ;;
  x86_64-unknown-linux-gnu)
    NODE_PLATFORM="linux"
    NODE_ARCH="x64"
    EXT=""
    ;;
  aarch64-unknown-linux-gnu)
    NODE_PLATFORM="linux"
    NODE_ARCH="arm64"
    EXT=""
    ;;
  *)
    echo "Unsupported target triple: $TARGET_TRIPLE"
    exit 1
    ;;
esac

# Resolve the latest Node.js version for the major version
echo "Resolving Node.js v${NODE_VERSION} for ${NODE_PLATFORM}-${NODE_ARCH}..."
RESOLVED_VERSION=$(curl -sL "https://nodejs.org/dist/latest-v${NODE_VERSION}.x/" | grep -oE "node-v[0-9]+\.[0-9]+\.[0-9]+" | head -1 | sed 's/node-v//')

if [ -z "$RESOLVED_VERSION" ]; then
  echo "Failed to resolve Node.js version"
  exit 1
fi

echo "Downloading Node.js v${RESOLVED_VERSION} for ${NODE_PLATFORM}-${NODE_ARCH}..."

if [ "$NODE_PLATFORM" = "win" ]; then
  # Windows: download the zip, extract just node.exe
  URL="https://nodejs.org/dist/v${RESOLVED_VERSION}/node-v${RESOLVED_VERSION}-${NODE_PLATFORM}-${NODE_ARCH}.zip"
  TMPFILE=$(mktemp /tmp/node-XXXXXX.zip)
  curl -sL "$URL" -o "$TMPFILE"
  unzip -o -j "$TMPFILE" "node-v${RESOLVED_VERSION}-${NODE_PLATFORM}-${NODE_ARCH}/node.exe" -d "$BINARIES_DIR"
  mv "$BINARIES_DIR/node.exe" "$BINARIES_DIR/node-${TARGET_TRIPLE}.exe"
  rm "$TMPFILE"
else
  # Unix: download the tarball, extract just the node binary
  URL="https://nodejs.org/dist/v${RESOLVED_VERSION}/node-v${RESOLVED_VERSION}-${NODE_PLATFORM}-${NODE_ARCH}.tar.gz"
  TMPFILE=$(mktemp /tmp/node-XXXXXX.tar.gz)
  curl -sL "$URL" -o "$TMPFILE"
  tar -xzf "$TMPFILE" -C "$BINARIES_DIR" --strip-components=2 "node-v${RESOLVED_VERSION}-${NODE_PLATFORM}-${NODE_ARCH}/bin/node"
  mv "$BINARIES_DIR/node" "$BINARIES_DIR/node-${TARGET_TRIPLE}"
  chmod +x "$BINARIES_DIR/node-${TARGET_TRIPLE}"
  rm "$TMPFILE"
fi

echo "Node.js binary saved to: $BINARIES_DIR/node-${TARGET_TRIPLE}${EXT}"
ls -lh "$BINARIES_DIR/node-${TARGET_TRIPLE}${EXT}"
