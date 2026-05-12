/** @vitest-environment jsdom */
import { describe, test, expect, vi } from "vitest";

// We import only the exported helpers without rendering MissionControl,
// which has a sprawling tree of dependencies. The helpers themselves are
// pure modulo a tiny module-level Set.

// Mock heavy transitive deps that fire on import
vi.mock("src/frontend/monacoSetup", () => ({ monaco: {}, default: {} }));

// MissionControl imports many hooks — provide minimal mocks for top-of-module imports
vi.mock("src/frontend/hooks/useActionDialogs", () => ({ useActionDialogs: () => ({}) }));
vi.mock("src/frontend/hooks/useConnection", () => ({}));
vi.mock("src/frontend/hooks/useConnectionQuery", () => ({}));
vi.mock("src/frontend/hooks/useSession", () => ({}));
vi.mock("src/frontend/hooks/useSetting", () => ({ useLayoutModeSetting: () => "compact" }));
vi.mock("src/frontend/hooks/useShowHide", () => ({ useShowHide: () => ({}) }));
vi.mock("src/frontend/hooks/useToaster", () => ({ default: () => ({}) }));

import { isConnectionRefreshing, allMenuKeys } from "src/frontend/components/MissionControl";

describe("MissionControl exports", () => {
  test("isConnectionRefreshing returns false when no id given", () => {
    expect(isConnectionRefreshing()).toBe(false);
    expect(isConnectionRefreshing(undefined)).toBe(false);
  });

  test("isConnectionRefreshing returns false for an unknown id (module-level Set empty by default)", () => {
    expect(isConnectionRefreshing("never-seen")).toBe(false);
  });

  test("allMenuKeys contains the well-known electron menu identifiers", () => {
    expect(allMenuKeys).toContain("menu-connection-new");
    expect(allMenuKeys).toContain("menu-import");
    expect(allMenuKeys).toContain("menu-session-delete");
    expect(allMenuKeys.length).toBeGreaterThan(8);
  });
});
