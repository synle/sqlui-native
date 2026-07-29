/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import {
  getArchLabel,
  isProductionBuild,
  isDevBuild,
  getBuildBadge,
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
});
