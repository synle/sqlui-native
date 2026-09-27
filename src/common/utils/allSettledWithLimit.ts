/** Bounded-concurrency variant of Promise.allSettled. */

/**
 * Runs `worker` over `items` with at most `limit` in flight at once, preserving input
 * order in the result — same shape as `Promise.allSettled`, but bounded so a fan-out
 * over hundreds of items does not exhaust a connection pool.
 * @param items - Inputs to process.
 * @param limit - Max concurrent workers; clamped to `[1, items.length]`.
 * @param worker - Async function applied to each item.
 * @returns Settled results in the same order as `items`.
 */
export async function allSettledWithLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = Array.from({ length: items.length });
  const poolSize = Math.max(1, Math.min(Math.floor(limit) || 1, items.length));
  let next = 0;

  const runLane = async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };

  await Promise.all(Array.from({ length: poolSize }, runLane));
  return results;
}
