// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { vi } from "vitest";

const mockConfigs: any = {
  darkMode: "dark",
  layoutMode: "compact",
  editorMode: "simple",
  editorHeight: "medium",
  tableRenderer: "simple",
  wordWrap: "wrap",
  queryTabOrientation: "horizontal",
  querySize: "50",
  tablePageSize: "25",
  deleteMode: "soft-delete",
  animationMode: "on",
};

vi.mock("src/frontend/hooks/useServerConfigs", () => ({
  useGetServerConfigs: () => ({ data: mockConfigs }),
  useUpdateServerConfigs: () => ({ mutate: vi.fn() }),
}));

vi.mock("@mui/material/useMediaQuery", () => ({
  default: () => false,
}));

import {
  useSetting,
  useDarkModeSetting,
  useLayoutModeSetting,
  useEditorModeSetting,
  useEditorHeightSetting,
  useTableRenderer,
  useWordWrapSetting,
  useQueryTabOrientationSetting,
  useQuerySizeSetting,
  useTablePageSize,
  useIsSoftDeleteModeSetting,
  useIsAnimationModeOn,
  DEFAULT_QUERY_SIZE,
} from "src/frontend/hooks/useSetting";

describe("useSetting hooks", () => {
  test("useSetting returns settings and onChange", () => {
    const { result } = renderHook(() => useSetting());
    expect(result.current.settings).toBeDefined();
    expect(result.current.onChange).toBeDefined();
  });

  test("useDarkModeSetting returns dark", () => {
    const { result } = renderHook(() => useDarkModeSetting());
    expect(result.current).toContain("dark");
  });

  test("useLayoutModeSetting returns compact", () => {
    const { result } = renderHook(() => useLayoutModeSetting());
    expect(result.current).toContain("compact");
  });

  test("useEditorModeSetting returns simple", () => {
    const { result } = renderHook(() => useEditorModeSetting());
    expect(result.current).toContain("simple");
  });

  test("useEditorHeightSetting returns medium", () => {
    const { result } = renderHook(() => useEditorHeightSetting());
    expect(result.current).toContain("medium");
  });

  test("useTableRenderer returns simple", () => {
    const { result } = renderHook(() => useTableRenderer());
    expect(result.current).toContain("simple");
  });

  test("useWordWrapSetting returns true when wrap", () => {
    const { result } = renderHook(() => useWordWrapSetting());
    expect(result.current).toBe(true);
  });

  test("useQueryTabOrientationSetting returns horizontal", () => {
    const { result } = renderHook(() => useQueryTabOrientationSetting());
    expect(result.current).toContain("horizontal");
  });

  test("useQuerySizeSetting returns parsed number", () => {
    const { result } = renderHook(() => useQuerySizeSetting());
    expect(result.current).toBe(50);
  });

  test("useTablePageSize returns parsed number", () => {
    const { result } = renderHook(() => useTablePageSize());
    expect(result.current).toBe(25);
  });

  test("useIsSoftDeleteModeSetting returns true for soft-delete", () => {
    const { result } = renderHook(() => useIsSoftDeleteModeSetting());
    expect(result.current).toBe(true);
  });

  test("useIsAnimationModeOn returns true when on", () => {
    const { result } = renderHook(() => useIsAnimationModeOn());
    expect(result.current).toBe(true);
  });

  test("DEFAULT_QUERY_SIZE is 100", () => {
    expect(DEFAULT_QUERY_SIZE).toBe(100);
  });
});
