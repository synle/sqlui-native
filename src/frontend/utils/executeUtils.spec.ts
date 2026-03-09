import { execute } from "src/frontend/utils/executeUtils";

// Mock window for node environment
const mockWindow = globalThis as any;

describe("executeUtils", () => {
  describe("execute", () => {
    beforeEach(() => {
      mockWindow.window = mockWindow;
    });

    afterEach(() => {
      delete mockWindow.isElectron;
      delete mockWindow.requireElectron;
    });

    test("should resolve empty string when not in Electron", async () => {
      mockWindow.isElectron = false;
      const result = await execute("echo hello");
      expect(result).toEqual("");
    });

    test("should resolve empty string when isElectron is undefined", async () => {
      mockWindow.isElectron = undefined;
      const result = await execute("echo hello");
      expect(result).toEqual("");
    });

    test("should execute shell command and resolve with stdout", async () => {
      const mockExec = vi.fn((_cmd: string, callback: Function) => {
        callback(null, "output", "");
      });
      mockWindow.isElectron = true;
      mockWindow.requireElectron = vi.fn(() => ({ exec: mockExec }));

      const result = await execute("echo hello", 0);
      expect(result).toEqual("output");
      expect(mockWindow.requireElectron).toHaveBeenCalledWith("child_process");
      expect(mockExec).toHaveBeenCalledWith("echo hello", expect.any(Function));
    });

    test("should reject with stderr on error", async () => {
      const mockExec = vi.fn((_cmd: string, callback: Function) => {
        callback(new Error("fail"), "", "some error");
      });
      mockWindow.isElectron = true;
      mockWindow.requireElectron = vi.fn(() => ({ exec: mockExec }));

      await expect(execute("bad command", 0)).rejects.toEqual("some error");
    });

    test("should use default delay of 25ms", async () => {
      const mockExec = vi.fn((_cmd: string, callback: Function) => {
        callback(null, "ok", "");
      });
      mockWindow.isElectron = true;
      mockWindow.requireElectron = vi.fn(() => ({ exec: mockExec }));

      vi.useFakeTimers();
      const promise = execute("echo test");

      // Should not have executed yet at 0ms
      expect(mockExec).not.toHaveBeenCalled();

      // Advance past default 25ms delay
      vi.advanceTimersByTime(30);
      expect(mockExec).toHaveBeenCalled();

      vi.useRealTimers();
      const result = await promise;
      expect(result).toEqual("ok");
    });
  });
});
