// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("src/frontend/data/config", () => ({
  LocalStorageConfig: {
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  },
}));

import { useLocalStoragePreferences, useSideBarWidthPreference } from "src/frontend/hooks/useClientSidePreference";

describe("useClientSidePreference", () => {
  test("useLocalStoragePreferences returns default value", () => {
    const { result } = renderHook(() => useLocalStoragePreferences("clientConfig/leftPanelWidth", 300));
    expect(result.current.value).toBe(undefined);
  });

  test("useLocalStoragePreferences onChange updates value", () => {
    const { result } = renderHook(() => useLocalStoragePreferences("clientConfig/leftPanelWidth", 300));
    act(() => {
      result.current.onChange(500);
    });
    expect(result.current.value).toBe(500);
  });

  test("useSideBarWidthPreference returns value and onChange", () => {
    const { result } = renderHook(() => useSideBarWidthPreference());
    expect(result.current).toHaveProperty("value");
    expect(result.current.onChange).toBeDefined();
  });
});
