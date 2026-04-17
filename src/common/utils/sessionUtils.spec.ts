import { vi } from "vitest";
import * as sessionUtils from "src/common/utils/sessionUtils";

describe("sessionUtils", () => {
  afterEach(async () => {
    // Clean up any registered windows
    await sessionUtils.close("test-window-1");
    await sessionUtils.close("test-window-2");
  });

  describe("close", () => {
    test("is a no-op when windowId is undefined", async () => {
      await sessionUtils.close(undefined);
    });

    test("is a no-op when windowId does not exist", async () => {
      await sessionUtils.close("nonexistent");
    });

    test("calls close on a registered window", async () => {
      const mockWindow = { close: vi.fn(), focus: vi.fn() };
      sessionUtils.registerWindow("test-window-1", mockWindow);
      await sessionUtils.close("test-window-1");
      expect(mockWindow.close).toHaveBeenCalled();
    });

    test("does not throw if window.close() throws", async () => {
      const mockWindow = {
        close: vi.fn(() => {
          throw new Error("close failed");
        }),
        focus: vi.fn(),
      };
      sessionUtils.registerWindow("test-window-1", mockWindow);
      await sessionUtils.close("test-window-1");
      expect(mockWindow.close).toHaveBeenCalled();
    });

    test("removes the window after closing", async () => {
      const mockWindow = { close: vi.fn(), focus: vi.fn() };
      sessionUtils.registerWindow("test-window-1", mockWindow);
      await sessionUtils.close("test-window-1");

      // Closing again should not call close a second time
      mockWindow.close.mockClear();
      await sessionUtils.close("test-window-1");
      expect(mockWindow.close).not.toHaveBeenCalled();
    });
  });

  describe("focus", () => {
    test("is a no-op when windowId is undefined", async () => {
      await sessionUtils.focus(undefined);
    });

    test("is a no-op when windowId does not exist", async () => {
      await sessionUtils.focus("nonexistent");
    });

    test("calls focus on a registered window", async () => {
      const mockWindow = { close: vi.fn(), focus: vi.fn() };
      sessionUtils.registerWindow("test-window-1", mockWindow);
      await sessionUtils.focus("test-window-1");
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    test("does not throw if window.focus() throws", async () => {
      const mockWindow = {
        close: vi.fn(),
        focus: vi.fn(() => {
          throw new Error("focus failed");
        }),
      };
      sessionUtils.registerWindow("test-window-1", mockWindow);
      await sessionUtils.focus("test-window-1");
      expect(mockWindow.focus).toHaveBeenCalled();
    });
  });

  describe("registerWindow", () => {
    test("registers a window that can be focused", async () => {
      const mockWindow = { close: vi.fn(), focus: vi.fn() };
      sessionUtils.registerWindow("test-window-2", mockWindow);
      await sessionUtils.focus("test-window-2");
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    test("overwrites a previously registered window", async () => {
      const oldWindow = { close: vi.fn(), focus: vi.fn() };
      const newWindow = { close: vi.fn(), focus: vi.fn() };
      sessionUtils.registerWindow("test-window-1", oldWindow);
      sessionUtils.registerWindow("test-window-1", newWindow);
      await sessionUtils.focus("test-window-1");
      expect(oldWindow.focus).not.toHaveBeenCalled();
      expect(newWindow.focus).toHaveBeenCalled();
    });
  });
});
