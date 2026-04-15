import { execute } from "src/frontend/utils/executeUtils";

const mockExecuteShellCommand = vi.fn();

vi.mock("src/frontend/platform", () => ({
  platform: {
    executeShellCommand: (...args: any[]) => mockExecuteShellCommand(...args),
  },
}));

describe("executeUtils", () => {
  describe("execute", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    test("should delegate to platform.executeShellCommand", async () => {
      mockExecuteShellCommand.mockResolvedValue("output");

      const result = await execute("echo hello", 0);
      expect(result).toEqual("output");
      expect(mockExecuteShellCommand).toHaveBeenCalledWith("echo hello");
    });

    test("should return empty string when platform returns empty", async () => {
      mockExecuteShellCommand.mockResolvedValue("");

      const result = await execute("echo hello");
      expect(result).toEqual("");
    });
  });
});
