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
