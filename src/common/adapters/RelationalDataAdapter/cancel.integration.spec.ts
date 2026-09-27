/**
 * Integration coverage for server-side query cancellation (requires the Docker DBs
 * from CONTRIBUTING.md). A long sleep is started, cancelled mid-flight, and must settle
 * quickly as a failed result classified as `cancelled`.
 */
import createRelationalDataAdapter from "src/common/adapters/RelationalDataAdapter/index";
import { classifyError } from "src/common/utils/errorUtils";

const CASES = [
  { name: "postgres", connection: "postgres://postgres:password123!@127.0.0.1:5432", sleepSql: "SELECT pg_sleep(30)" },
  { name: "mysql", connection: "mysql://root:password123!@127.0.0.1:3306", sleepSql: "SELECT SLEEP(30)" },
];

/** How long to let the query start before cancelling. */
const CANCEL_DELAY_MS = 500;
/** Upper bound for the cancelled query to settle — far below the 30s sleep. */
const SETTLE_BUDGET_MS = 10_000;

describe.each(CASES)("$name cancel", ({ connection, sleepSql }) => {
  test("cancel aborts a running query", async () => {
    const adapter = createRelationalDataAdapter(connection);
    try {
      expect(await adapter.cancel!()).toBe(false);

      const started = Date.now();
      const running = adapter.execute(sleepSql, undefined, undefined);
      await new Promise((resolve) => setTimeout(resolve, CANCEL_DELAY_MS));
      expect(await adapter.cancel!()).toBe(true);

      const result = await running;
      expect(Date.now() - started).toBeLessThan(SETTLE_BUDGET_MS);
      if (result.ok) {
        // MySQL SLEEP() returns 1 instead of erroring when interrupted by KILL QUERY.
        expect(result.raw?.[0] && Object.values(result.raw[0])[0]).toBe(1);
      } else {
        expect(classifyError(result.error)).toBe("cancelled");
      }
    } finally {
      await adapter.disconnect();
    }
  }, 30_000);
});
