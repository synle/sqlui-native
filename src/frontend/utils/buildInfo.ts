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

/** Returns the short build badge shown in the header (e.g., "[arm64]" or "[BETA - abc1234] [arm64]"). */
export function getBuildBadge(): string {
  const arch = getArchLabel();
  const parts: string[] = [];

  if (__BUILD_CHANNEL__ !== "production") {
    const label = __BUILD_CHANNEL__ === "beta" ? "BETA" : "DEV";
    parts.push(`[${label} - ${__BUILD_COMMIT__}]`);
  }

  if (arch) {
    parts.push(`[${arch}]`);
  }

  return parts.join(" ");
}
