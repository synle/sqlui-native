// @vitest-environment jsdom
/**
 * Regression coverage for migration script generation per target dialect.
 *
 * `generateMigrationScript` lives inside `MigrationBox/index.tsx` (a JSX module).
 * To unit-test the pure logic without rendering the component, we import it directly
 * and stub out `dataApi.execute` by passing `fromDataToUse` so no I/O happens.
 */
import { describe, expect, test, vi } from "vitest";

// Avoid loading Monaco (and other DOM-heavy modules) transitively when importing
// MigrationBox. We only exercise the pure script-generation function here.
vi.mock("src/frontend/components/CodeEditorBox", () => ({
  default: () => null,
}));
vi.mock("src/frontend/components/Select", () => ({ default: () => null }));

import { generateMigrationScript } from "src/frontend/components/MigrationBox/index";
import { SqluiCore, SqluiFrontend } from "typings";

const fromQuery: SqluiFrontend.ConnectionQuery = {
  id: "test_query",
  name: "Test Migration Query",
  connectionId: "test_connection",
  databaseId: "test_db",
  tableId: "test_table",
  sql: "select * from setting",
};

const columns: SqluiCore.ColumnMetaData[] = [
  { name: "Id", type: "string", allowNull: false, primaryKey: true },
  { name: "Name", type: "string", allowNull: true },
];

const sampleRows = [
  { Id: "row1", Name: "Acme" },
  { Id: "row2", Name: "Globex" },
];

const fromDataToUse: SqluiCore.Result = {
  ok: true,
  raw: sampleRows,
};

describe("generateMigrationScript — sfdc target", () => {
  test("emits a non-empty script when migrating to Salesforce", async () => {
    const [script, errors] = await generateMigrationScript(
      "sfdc",
      "Acme Migration", // toDatabaseId — not used by Salesforce but kept for parity
      "Account",
      fromQuery,
      columns,
      fromDataToUse,
    );

    // Regression: previously an unsupported dialect produced an empty script.
    expect(script).toBeTruthy();
    expect(script.length).toBeGreaterThan(0);
    expect(errors).toBe("");
  });

  test("schema step explains that SObjects are not API-creatable", async () => {
    const [script] = await generateMigrationScript("sfdc", "Acme Migration", "Account", fromQuery, columns, fromDataToUse);

    expect(script).toContain("Salesforce does not support creating SObjects via the API");
    // The user-supplied SObject API name is surfaced so users know what to verify.
    expect(script).toContain("Account");
  });

  test("data step invokes jsforce conn.sobject(...).create with the supplied rows", async () => {
    const [script] = await generateMigrationScript("sfdc", "Acme Migration", "Account", fromQuery, columns, fromDataToUse);

    expect(script).toContain("conn.sobject('Account')");
    expect(script).toContain(".create(");
    expect(script).toContain("Acme");
    expect(script).toContain("Globex");
  });

  test("reports the no-data warning when the source query returned zero rows", async () => {
    const [script, errors] = await generateMigrationScript("sfdc", "Acme Migration", "Account", fromQuery, columns, { ok: true, raw: [] });

    expect(script).toContain("doesn't contain any record");
    expect(errors).toContain("doesn't contain any record");
  });
});

describe("generateMigrationScript — useUpsert toggle", () => {
  // NOTE on assertions: the migration script is pushed through `formatSQL`, which
  // reflows multi-word keywords across lines (e.g. `DO UPDATE SET` becomes
  // `DO\nUPDATE\nSET`). Match with whitespace-flexible regexes rather than
  // literal `.toContain("DO UPDATE SET")` so the tests are robust to formatter changes.

  test("sqlite emits ON CONFLICT ... DO UPDATE when useUpsert is set", async () => {
    const [script] = await generateMigrationScript("sqlite", "acme_db", "settings", fromQuery, columns, fromDataToUse, {
      toDialect: "sqlite",
      newDatabaseName: "acme_db",
      newTableName: "settings",
      useUpsert: true,
      upsertKeyField: "Id",
    });

    expect(script).toMatch(/ON CONFLICT\s*\(Id\)/);
    expect(script).toMatch(/DO\s+UPDATE\s+SET/);
    expect(script).toContain("excluded.Name");
  });

  test("mysql emits ON DUPLICATE KEY UPDATE when useUpsert is set", async () => {
    const [script] = await generateMigrationScript("mysql", "acme_db", "settings", fromQuery, columns, fromDataToUse, {
      toDialect: "mysql",
      newDatabaseName: "acme_db",
      newTableName: "settings",
      useUpsert: true,
      upsertKeyField: "Id",
    });

    expect(script).toMatch(/ON DUPLICATE KEY\s+UPDATE/);
    expect(script).toMatch(/Name\s*=\s*VALUES\s*\(\s*Name\s*\)/);
  });

  test("mssql emits MERGE when useUpsert is set", async () => {
    const [script] = await generateMigrationScript("mssql", "acme_db", "settings", fromQuery, columns, fromDataToUse, {
      toDialect: "mssql",
      newDatabaseName: "acme_db",
      newTableName: "settings",
      useUpsert: true,
      upsertKeyField: "Id",
    });

    expect(script).toContain("MERGE INTO settings");
    expect(script).toMatch(/WHEN MATCHED THEN\s+UPDATE/);
    expect(script).toContain("WHEN NOT MATCHED THEN INSERT");
  });

  test("default path still emits plain INSERT when useUpsert is not set", async () => {
    const [script] = await generateMigrationScript("sqlite", "acme_db", "settings", fromQuery, columns, fromDataToUse);

    expect(script).toContain("INSERT INTO");
    expect(script).not.toContain("ON CONFLICT");
    expect(script).not.toContain("ON DUPLICATE KEY");
  });
});

describe("generateMigrationScript — disableForeignKeyConstraints toggle", () => {
  test("sqlite wraps the data step in PRAGMA foreign_keys = OFF / ON", async () => {
    const [script] = await generateMigrationScript("sqlite", "acme_db", "settings", fromQuery, columns, fromDataToUse, {
      toDialect: "sqlite",
      newDatabaseName: "acme_db",
      newTableName: "settings",
      disableForeignKeyConstraints: true,
    });

    expect(script).toContain("PRAGMA foreign_keys = OFF");
    expect(script).toContain("PRAGMA foreign_keys = ON");
    // Off must appear before On (regression: don't swap them).
    expect(script.indexOf("PRAGMA foreign_keys = OFF")).toBeLessThan(script.indexOf("PRAGMA foreign_keys = ON"));
  });

  test("mysql wraps the data step in SET FOREIGN_KEY_CHECKS toggles", async () => {
    const [script] = await generateMigrationScript("mysql", "acme_db", "settings", fromQuery, columns, fromDataToUse, {
      toDialect: "mysql",
      newDatabaseName: "acme_db",
      newTableName: "settings",
      disableForeignKeyConstraints: true,
    });

    expect(script).toContain("SET FOREIGN_KEY_CHECKS = 0");
    expect(script).toContain("SET FOREIGN_KEY_CHECKS = 1");
  });

  test("no FK toggle statements appear when the option is not set", async () => {
    const [script] = await generateMigrationScript("sqlite", "acme_db", "settings", fromQuery, columns, fromDataToUse);

    expect(script).not.toContain("PRAGMA foreign_keys");
  });
});
