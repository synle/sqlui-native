/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import {
  formatArchLabel,
  formatOsLabel,
  getArchLabel,
  getBuildBadge,
  isDevBuild,
  isProductionBuild,
  resolvePlatformLabels,
} from "src/frontend/utils/buildInfo";

// jsdom shares globalThis with node, so `window.process === process`. Stub
// `window.process` via the WindowProxy proxy instead — but be careful not to
// remove Node's `process` global. We set a sentinel and restore after.
const ORIG_WINDOW_PROCESS = (window as any).process;

describe("buildInfo", () => {
  beforeEach(() => {
    // Restore baseline before each test
    (window as any).process = ORIG_WINDOW_PROCESS;
  });

  afterEach(() => {
    (window as any).process = ORIG_WINDOW_PROCESS;
  });

  describe("getArchLabel", () => {
    test("returns process.arch (node global) when running under jsdom (Node process is present)", () => {
      // Under jsdom, `window` and globalThis are the same, so window.process is
      // Node's process and has an `arch` field. We assert it is a non-empty string.
      const label = getArchLabel();
      expect(typeof label).toBe("string");
    });

    test("returns the explicit arch when window.process.arch is overridden", () => {
      (window as any).process = { arch: "arm64" };
      expect(getArchLabel()).toBe("arm64");
    });
  });

  describe("channel helpers", () => {
    test("isDevBuild is true under test config (BUILD_CHANNEL=dev)", () => {
      expect(isDevBuild()).toBe(true);
    });
    test("isProductionBuild is false under test config", () => {
      expect(isProductionBuild()).toBe(false);
    });
  });

  describe("getBuildBadge", () => {
    test("dev channel returns badge with [DEV - BUILD_<date>] segment", () => {
      const badge = getBuildBadge();
      expect(badge).toContain("[DEV - BUILD_");
    });

    test("badge includes arch segment when window.process.arch is overridden", () => {
      (window as any).process = { arch: "x64" };
      const badge = getBuildBadge();
      expect(badge).toContain("[x64]");
    });
  });
  describe("formatOsLabel", () => {
    test("maps Rust, Tauri and Node spellings to the same display name", () => {
      expect(formatOsLabel("macos")).toBe("macOS");
      expect(formatOsLabel("darwin")).toBe("macOS");
      expect(formatOsLabel("windows")).toBe("Windows");
      expect(formatOsLabel("win32")).toBe("Windows");
      expect(formatOsLabel("linux")).toBe("Linux");
    });

    test("is case insensitive and trims", () => {
      expect(formatOsLabel("  Darwin ")).toBe("macOS");
    });

    test("passes through unrecognized tokens and reports empty input as Unknown", () => {
      expect(formatOsLabel("plan9")).toBe("plan9");
      expect(formatOsLabel("")).toBe("Unknown");
    });
  });

  describe("formatArchLabel", () => {
    test("adds the Apple Silicon hint only on macOS", () => {
      expect(formatArchLabel("aarch64", "macos")).toBe("ARM64 (Apple Silicon) \u00b7 64-bit");
      expect(formatArchLabel("arm64", "darwin")).toBe("ARM64 (Apple Silicon) \u00b7 64-bit");
      expect(formatArchLabel("aarch64", "linux")).toBe("ARM64 \u00b7 64-bit");
    });

    test("labels x86_64 as Intel on macOS and Intel/AMD elsewhere", () => {
      expect(formatArchLabel("x86_64", "macos")).toBe("x64 (Intel) \u00b7 64-bit");
      expect(formatArchLabel("x64", "win32")).toBe("x64 (Intel/AMD) \u00b7 64-bit");
      expect(formatArchLabel("x86_64", "linux")).toBe("x64 (Intel/AMD) \u00b7 64-bit");
    });

    test("reports 32-bit targets", () => {
      expect(formatArchLabel("i686", "windows")).toBe("x86 \u00b7 32-bit");
      expect(formatArchLabel("ia32", "win32")).toBe("x86 \u00b7 32-bit");
      expect(formatArchLabel("arm", "linux")).toBe("ARM \u00b7 32-bit");
    });

    test("omits bitness for macOS universal binaries", () => {
      expect(formatArchLabel("universal", "macos")).toBe("Universal (Intel + Apple Silicon)");
      expect(formatArchLabel("universal", "linux")).toBe("Universal");
    });

    test("infers bitness from the name for unrecognized architectures", () => {
      expect(formatArchLabel("riscv64", "linux")).toBe("riscv64 \u00b7 64-bit");
      expect(formatArchLabel("mystery", "linux")).toBe("mystery");
      expect(formatArchLabel("")).toBe("Unknown");
    });
  });

  describe("resolvePlatformLabels", () => {
    test("prefers the build target over the runtime host", () => {
      expect(resolvePlatformLabels({ platform: "linux", arch: "x64" }, { os: "macos", arch: "aarch64" })).toEqual({
        osLabel: "macOS",
        archLabel: "ARM64 (Apple Silicon) \u00b7 64-bit",
      });
    });

    test("falls back to the runtime host when there is no build target", () => {
      expect(resolvePlatformLabels({ platform: "win32", arch: "x64" }, { os: "", arch: "" })).toEqual({
        osLabel: "Windows",
        archLabel: "x64 (Intel/AMD) \u00b7 64-bit",
      });
    });

    test("falls back per field when the target is only partially known", () => {
      expect(resolvePlatformLabels({ platform: "darwin", arch: "arm64" }, { os: "", arch: "x86_64" })).toEqual({
        osLabel: "macOS",
        archLabel: "x64 (Intel) \u00b7 64-bit",
      });
    });

    test("reports Unknown when neither source knows anything", () => {
      expect(resolvePlatformLabels(undefined, { os: "", arch: "" })).toEqual({
        osLabel: "Unknown",
        archLabel: "Unknown",
      });
    });

    test("uses the build-time globals when no target override is given", () => {
      // vitest.config.ts stubs the target globals as empty, so the host wins here.
      expect(resolvePlatformLabels({ platform: "linux", arch: "x64" })).toEqual({
        osLabel: "Linux",
        archLabel: "x64 (Intel/AMD) \u00b7 64-bit",
      });
    });
  });
});
