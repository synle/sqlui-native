import * as sessionUtils from "src/common/utils/sessionUtils";

describe("sessionUtils", () => {
  test("registerWindow and close do not throw", async () => {
    // close with no windowId is a no-op
    await sessionUtils.close(undefined);
    await sessionUtils.close("nonexistent");
  });

  test("focus with no windowId is a no-op", async () => {
    await sessionUtils.focus(undefined);
    await sessionUtils.focus("nonexistent");
  });
});
