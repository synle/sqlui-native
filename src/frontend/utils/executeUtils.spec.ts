import { execute } from "src/frontend/utils/executeUtils";

// Mock @tauri-apps/api/core
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock window for node environment
const mockWindow = globalThis as any;

describe("executeUtils", () => {
  describe("execute", () => {
    beforeEach(() => {
      mockWindow.window = mockWindow;
    });

    afterEach(() => {
      delete mockWindow.isTauri;
      vi.restoreAllMocks();
    });

    test("should resolve empty string when not in Tauri", async () => {
      mockWindow.isTauri = false;
      const result = await execute("echo hello");
      expect(result).toEqual("");
    });

    test("should resolve empty string when isTauri is undefined", async () => {
      mockWindow.isTauri = undefined;
      const result = await execute("echo hello");
      expect(result).toEqual("");
    });

    test("should execute shell command via Tauri invoke and resolve with stdout", async () => {
      mockWindow.isTauri = true;
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue("output");

      const result = await execute("echo hello", 0);
      expect(result).toEqual("output");
      expect(invoke).toHaveBeenCalledWith("execute_shell", { command: "echo hello" });
    });

    test("should return empty string on invoke error", async () => {
      mockWindow.isTauri = true;
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockRejectedValue(new Error("command failed"));

      const result = await execute("bad command", 0);
      expect(result).toEqual("");
    });
  });
});
