import { columnFetchThrottle } from "src/frontend/data/connectionThrottle";

describe("ConnectionThrottle", () => {
  describe("columnFetchThrottle (maxConcurrent=3)", () => {
    test("acquire resolves immediately when under limit", async () => {
      const release = await columnFetchThrottle.acquire("conn-a");
      expect(typeof release).toBe("function");
      release();
    });

    test("allows up to 3 concurrent acquires for the same connection", async () => {
      const releases = await Promise.all([
        columnFetchThrottle.acquire("conn-b"),
        columnFetchThrottle.acquire("conn-b"),
        columnFetchThrottle.acquire("conn-b"),
      ]);
      expect(releases.length).toBe(3);
      releases.forEach((r) => r());
    });

    test("4th acquire is queued until a slot frees up", async () => {
      const r1 = await columnFetchThrottle.acquire("conn-c");
      const r2 = await columnFetchThrottle.acquire("conn-c");
      const r3 = await columnFetchThrottle.acquire("conn-c");

      let fourthResolved = false;
      const fourthPromise = columnFetchThrottle.acquire("conn-c").then((release) => {
        fourthResolved = true;
        return release;
      });

      // Allow microtasks to settle
      await new Promise((r) => setTimeout(r, 10));
      expect(fourthResolved).toBe(false);

      // Release one slot
      r1();
      const r4 = await fourthPromise;
      expect(fourthResolved).toBe(true);

      r2();
      r3();
      r4();
    });

    test("different connections are throttled independently", async () => {
      const releasesX = await Promise.all([
        columnFetchThrottle.acquire("conn-x"),
        columnFetchThrottle.acquire("conn-x"),
        columnFetchThrottle.acquire("conn-x"),
      ]);

      // conn-y should still be able to acquire immediately
      const releaseY = await columnFetchThrottle.acquire("conn-y");
      expect(typeof releaseY).toBe("function");

      releaseY();
      releasesX.forEach((r) => r());
    });

    test("queued requests are processed in FIFO order", async () => {
      const r1 = await columnFetchThrottle.acquire("conn-d");
      const r2 = await columnFetchThrottle.acquire("conn-d");
      const r3 = await columnFetchThrottle.acquire("conn-d");

      const order: number[] = [];

      const p4 = columnFetchThrottle.acquire("conn-d").then((release) => {
        order.push(4);
        return release;
      });
      const p5 = columnFetchThrottle.acquire("conn-d").then((release) => {
        order.push(5);
        return release;
      });

      r1();
      const r4 = await p4;

      r2();
      const r5 = await p5;

      expect(order).toEqual([4, 5]);

      r3();
      r4();
      r5();
    });

    test("release cleans up internal maps when all slots are freed", async () => {
      const r1 = await columnFetchThrottle.acquire("conn-cleanup");
      const r2 = await columnFetchThrottle.acquire("conn-cleanup");
      r1();
      r2();

      // After all released, acquiring again should work fine (maps cleaned up)
      const r3 = await columnFetchThrottle.acquire("conn-cleanup");
      expect(typeof r3).toBe("function");
      r3();
    });
  });
});
