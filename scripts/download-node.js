require("./common");

const { execSync } = require("child_process");
const os = require("os");

log(`
==============================================
# download-node.js
# Download Node.js binary for Tauri sidecar bundling
==============================================
`);

/** Minimum Node.js major version required (node:sqlite needs 22+). */
const MIN_NODE_MAJOR = 22;

/** Node.js version to download (without 'v' prefix). */
const NODE_VERSION = process.env.NODE_VERSION || "22.17.0";

/** Target platform and architecture. Can be overridden via env vars for cross-compilation. */
const targetPlatform = process.env.TARGET_PLATFORM || os.platform();
const targetArch = process.env.TARGET_ARCH || os.arch();

/**
 * Maps OS/arch to Node.js download filename conventions.
 * @param {string} platform - Node.js platform string (darwin, win32, linux)
 * @param {string} arch - Node.js arch string (x64, arm64)
 * @returns {{ distName: string, ext: string, binaryPath: string }}
 */
function getNodeDistInfo(platform, arch) {
  const nodeArch = arch === "arm64" ? "arm64" : "x64";

  if (platform === "win32") {
    return {
      distName: `node-v${NODE_VERSION}-win-${nodeArch}`,
      ext: "zip",
      binaryPath: `node-v${NODE_VERSION}-win-${nodeArch}/node.exe`,
    };
  }

  const osPart = platform === "darwin" ? "darwin" : "linux";
  return {
    distName: `node-v${NODE_VERSION}-${osPart}-${nodeArch}`,
    ext: "tar.gz",
    binaryPath: `node-v${NODE_VERSION}-${osPart}-${nodeArch}/bin/node`,
  };
}

const BINARIES_DIR = path.join("src-tauri", "binaries");
const { distName, ext, binaryPath } = getNodeDistInfo(targetPlatform, targetArch);
const downloadUrl = `https://nodejs.org/dist/v${NODE_VERSION}/${distName}.${ext}`;
const outputBinary = targetPlatform === "win32" ? path.join(BINARIES_DIR, "node.exe") : path.join(BINARIES_DIR, "node");

// Records which platform/arch the cached binary was fetched for. Without this, building
// a second target on the same machine (e.g. macOS arm64 then x64) silently reuses the
// first architecture's binary and ships an app whose sidecar cannot start.
const stampFile = path.join(BINARIES_DIR, ".node-binary-target");
const expectedStamp = `${targetPlatform}-${targetArch}-v${NODE_VERSION}`;

// Skip if already downloaded for this exact platform/arch/version
if (fs.existsSync(outputBinary)) {
  const cachedStamp = fs.existsSync(stampFile) ? fs.readFileSync(stampFile, "utf-8").trim() : "";
  if (cachedStamp === expectedStamp) {
    log(`Node.js binary already exists at ${outputBinary} for ${expectedStamp}, skipping download.`);
    process.exit(0);
  }
  log(`Cached Node.js binary is for "${cachedStamp || "unknown"}", need "${expectedStamp}" — re-downloading.`);
  fs.rmSync(outputBinary, { force: true });
}

fs.mkdirSync(BINARIES_DIR, { recursive: true });

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "node-download-"));
const archivePath = path.join(tmpDir, `${distName}.${ext}`);

log(`Downloading Node.js v${NODE_VERSION} for ${targetPlatform}-${targetArch}...`);
log(`URL: ${downloadUrl}`);

try {
  execSync(`curl -fSL "${downloadUrl}" -o "${archivePath}"`, { stdio: "inherit" });
} catch (err) {
  console.error("download-node.js:download", err.message);
  process.exit(1);
}

log("Extracting Node.js binary...");

try {
  if (ext === "zip") {
    // `unzip` is not guaranteed on Windows runner images; fall back to PowerShell,
    // which ships with every supported Windows version including arm64.
    try {
      execSync(`unzip -o "${archivePath}" "${binaryPath}" -d "${tmpDir}"`, { stdio: "inherit" });
    } catch (_err) {
      log("unzip unavailable, falling back to PowerShell Expand-Archive...");
      execSync(
        `powershell -NoProfile -NonInteractive -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${tmpDir}' -Force"`,
        { stdio: "inherit" },
      );
    }
  } else {
    execSync(`tar -xzf "${archivePath}" -C "${tmpDir}" "${binaryPath}"`, { stdio: "inherit" });
  }

  const extractedBinary = path.join(tmpDir, binaryPath);
  fs.copyFileSync(extractedBinary, outputBinary);
  fs.chmodSync(outputBinary, 0o755);
  fs.writeFileSync(stampFile, expectedStamp);

  log(`Node.js binary saved to ${outputBinary} (${expectedStamp})`);
} catch (err) {
  console.error("download-node.js:extract", err.message);
  process.exit(1);
} finally {
  // Cleanup temp directory
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

log("Node.js binary download complete.");
