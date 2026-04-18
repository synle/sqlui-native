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

// Skip if already downloaded
if (fs.existsSync(outputBinary)) {
  log(`Node.js binary already exists at ${outputBinary}, skipping download.`);
  process.exit(0);
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
    execSync(`unzip -o "${archivePath}" "${binaryPath}" -d "${tmpDir}"`, { stdio: "inherit" });
  } else {
    execSync(`tar -xzf "${archivePath}" -C "${tmpDir}" "${binaryPath}"`, { stdio: "inherit" });
  }

  const extractedBinary = path.join(tmpDir, binaryPath);
  fs.copyFileSync(extractedBinary, outputBinary);
  fs.chmodSync(outputBinary, 0o755);

  log(`Node.js binary saved to ${outputBinary}`);
} catch (err) {
  console.error("download-node.js:extract", err.message);
  process.exit(1);
} finally {
  // Cleanup temp directory
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

log("Node.js binary download complete.");
