import { execute } from "src/frontend/utils/executeUtils";

// Mock the platform module
vi.mock("src/frontend/platform", () => ({
  platform: {
    executeShellCommand: vi.fn(),
  },
}));

import { platform } from "src/frontend/platform";

describe("executeUtils", () => {
  describe("execute", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    test("should delegate to platform.executeShellCommand", async () => {
      vi.mocked(platform.executeShellCommand).mockResolvedValue("output");
      const result = await execute("echo hello");
      expect(result).toEqual("output");
      expect(platform.executeShellCommand).toHaveBeenCalledWith("echo hello");
    });

    test("should resolve empty string when platform returns empty", async () => {
      vi.mocked(platform.executeShellCommand).mockResolvedValue("");
      const result = await execute("echo hello");
      expect(result).toEqual("");
    });

    test("should reject when platform rejects", async () => {
      vi.mocked(platform.executeShellCommand).mockRejectedValue("some error");
      await expect(execute("bad command")).rejects.toEqual("some error");
    });
  });
});
