import { describe, test, expect } from "vitest";
import { allSettledWithLimit } from "src/common/utils/allSettledWithLimit";

describe("allSettledWithLimit", () => {
  test("never exceeds the concurrency limit", async () => {
    let active = 0;
    let peak = 0;
    await allSettledWithLimit([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3, async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active--;
    });
    expect(peak).toBe(3);
  });

  test("preserves input order and captures rejections", async () => {
    const results = await allSettledWithLimit([30, 1, 10], 2, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      if (ms === 1) throw new Error("bad");
      return ms;
    });
    expect(results[0]).toEqual({ status: "fulfilled", value: 30 });
    expect(results[1].status).toBe("rejected");
    expect(results[2]).toEqual({ status: "fulfilled", value: 10 });
  });

  test("returns an empty array for empty input", async () => {
    expect(await allSettledWithLimit([], 4, async () => 1)).toEqual([]);
  });

  test("treats a non-positive limit as 1", async () => {
    let peak = 0;
    let active = 0;
    await allSettledWithLimit([1, 2, 3], 0, async () => {
      active++;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active--;
    });
    expect(peak).toBe(1);
  });
});
