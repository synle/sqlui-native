/** Build metadata utilities for displaying version, architecture, and channel info. */

/** Returns the CPU architecture label (e.g., "arm64", "x64") or empty string if unavailable. */
export function getArchLabel(): string {
  try {
    return (window as any)?.process?.arch || "";
  } catch {
    return "";
  }
}

/** Returns true if this is a production release build. */
export function isProductionBuild(): boolean {
  return __BUILD_CHANNEL__ === "production";
}

/** Returns true if this is a local dev build (not production or beta). */
export function isDevBuild(): boolean {
  return __BUILD_CHANNEL__ === "dev";
}

/** Returns the short build badge shown in the header (e.g., "[arm64]" or "[DEV - BUILD_04/23/2026 10:30]"). */
export function getBuildBadge(): string {
  const arch = getArchLabel();
  const parts: string[] = [];

  if (__BUILD_CHANNEL__ === "dev") {
    parts.push(`[DEV - BUILD_${__BUILD_DATE__}]`);
  } else if (__BUILD_CHANNEL__ === "beta") {
    parts.push(`[BETA - ${__BUILD_COMMIT__}]`);
  }

  if (arch) {
    parts.push(`[${arch}]`);
  }

  return parts.join(" ");
}

/**
 * Display names for every OS spelling we can receive.
 *
 * Values arrive from three sources that disagree on spelling: Rust target triples (`macos`),
 * the Tauri CLI env (`darwin` since Tauri v2 stopped normalizing it), and Node's
 * `process.platform` (`darwin`, `win32`). All three are accepted.
 */
const OS_LABELS: Record<string, string> = {
  macos: "macOS",
  darwin: "macOS",
  ios: "iOS",
  windows: "Windows",
  win32: "Windows",
  linux: "Linux",
  android: "Android",
  freebsd: "FreeBSD",
  openbsd: "OpenBSD",
  netbsd: "NetBSD",
  sunos: "Solaris",
  solaris: "Solaris",
  aix: "AIX",
};

/** Display name and bitness for every CPU spelling we can receive (Rust triple, Tauri env, or Node `process.arch`). */
const ARCH_LABELS: Record<string, { name: string; bits: string }> = {
  aarch64: { name: "ARM64", bits: "64-bit" },
  arm64: { name: "ARM64", bits: "64-bit" },
  x86_64: { name: "x64", bits: "64-bit" },
  x64: { name: "x64", bits: "64-bit" },
  amd64: { name: "x64", bits: "64-bit" },
  i686: { name: "x86", bits: "32-bit" },
  i586: { name: "x86", bits: "32-bit" },
  ia32: { name: "x86", bits: "32-bit" },
  x86: { name: "x86", bits: "32-bit" },
  arm: { name: "ARM", bits: "32-bit" },
  armv7: { name: "ARM", bits: "32-bit" },
  // macOS fat binary produced by `--target universal-apple-darwin`; bitness is meaningless here.
  universal: { name: "Universal", bits: "" },
};

/**
 * Returns the CPU vendor hint shown in parentheses, or `""` when there is nothing useful to add.
 * @param archName - Normalized CPU display name (e.g. `ARM64`).
 * @param os - Raw OS token, used because "Apple Silicon" only makes sense on macOS.
 */
function getArchVendorHint(archName: string, os: string): string {
  const isMac = (OS_LABELS[(os || "").toLowerCase()] || "") === "macOS";

  if (archName === "Universal") return isMac ? "Intel + Apple Silicon" : "";
  if (archName === "ARM64") return isMac ? "Apple Silicon" : "";
  if (archName === "x64") return isMac ? "Intel" : "Intel/AMD";
  return "";
}

/**
 * Formats an OS token for display.
 * @param os - OS token from a Rust target triple, the Tauri env, or Node's `process.platform`.
 * @returns A human-readable OS name, the raw token when unrecognized, or `"Unknown"` when empty.
 */
export function formatOsLabel(os: string): string {
  const key = (os || "").trim().toLowerCase();
  if (!key) return "Unknown";
  return OS_LABELS[key] || key;
}

/**
 * Formats a CPU token for display, including its bitness (e.g. `ARM64 (Apple Silicon) · 64-bit`).
 * @param arch - CPU token from a Rust target triple, the Tauri env, or Node's `process.arch`.
 * @param os - OS token for the same artifact, used to pick the vendor hint.
 * @returns A human-readable architecture description, or `"Unknown"` when the token is empty.
 */
export function formatArchLabel(arch: string, os: string = ""): string {
  const key = (arch || "").trim().toLowerCase();
  if (!key) return "Unknown";

  const known = ARCH_LABELS[key];
  const name = known?.name || key;
  // Unrecognized tokens still carry their width in the name (riscv64, ppc64le, loongarch64, ...).
  const bits = known ? known.bits : key.includes("64") ? "64-bit" : "";
  const vendorHint = getArchVendorHint(name, os);

  return [vendorHint ? `${name} (${vendorHint})` : name, bits].filter(Boolean).join(" · ");
}

/**
 * Resolves the OS and architecture labels shown in the About dialog.
 *
 * The build target wins when known, because that is what the downloaded artifact was compiled for.
 * Portal and browser-dev bundles have no build target — the frontend there is OS-agnostic, so the
 * machine actually running the server is reported instead.
 *
 * @param host - Runtime host descriptor from the server (`process.platform` / `process.arch`).
 * @param target - Build target override; defaults to the values injected at build time.
 * @returns The `Platform` and `Architecture` values to render.
 */
export function resolvePlatformLabels(
  host?: { platform?: string; arch?: string },
  target?: { os?: string; arch?: string },
): { osLabel: string; archLabel: string } {
  const os = (target?.os ?? __BUILD_TARGET_OS__) || host?.platform || "";
  const arch = (target?.arch ?? __BUILD_TARGET_ARCH__) || host?.arch || "";

  return { osLabel: formatOsLabel(os), archLabel: formatArchLabel(arch, os) };
}
