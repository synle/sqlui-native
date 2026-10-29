/** Verify that the npm snapshot-update command preserves Vitest file filters. */
import { describe, expect, it } from "vitest";
import { parseCLI } from "vitest/node";
import { scripts } from "../package.json";

describe("test:update-snapshots", () => {
  it("updates snapshots once without consuming forwarded spec filters", () => {
    const { filter, options } = parseCLI(
      `${scripts["test:update-snapshots"]} src/common/utils/setPath.spec.ts scripts/vite-plugin-embed-frontend.spec.ts`,
    );

    expect({ filter, run: options.run, update: options.update }).toMatchInlineSnapshot(`
      {
        "filter": [
          "src/common/utils/setPath.spec.ts",
          "scripts/vite-plugin-embed-frontend.spec.ts",
        ],
        "run": true,
        "update": "all",
      }
    `);
  });

  it("updates the whole unit suite only when no spec filter is supplied", () => {
    const { filter, options } = parseCLI(scripts["test:update-snapshots"]);

    expect({ filter, run: options.run, update: options.update }).toMatchInlineSnapshot(`
      {
        "filter": [],
        "run": true,
        "update": "all",
      }
    `);
  });
});
