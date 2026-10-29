import { describe, expect, test } from "vitest";
import FileDataAdapterScripts from "src/common/adapters/FileDataAdapter/scripts";
import { getTableActions } from "src/common/adapters/DataScriptFactory";
import { SqluiCore } from "typings";

describe("FileDataAdapterScripts", () => {
  test.each([
    ["json", "JSON File", "json:///absolute/path/to/file.json"],
    ["jsonc", "JSONC File", "jsonc:///absolute/path/to/file.jsonc"],
    ["yaml", "YAML File", "yaml:///absolute/path/to/file.yaml"],
    ["yml", "YAML File", "yml:///absolute/path/to/file.yml"],
    ["toml", "TOML File", "toml:///absolute/path/to/file.toml"],
    ["xml", "XML File", "xml:///absolute/path/to/file.xml"],
  ] as const)("provides connection hints for %s", (dialect, label, sample) => {
    expect(FileDataAdapterScripts.isDialectSupported(dialect)).toBe(true);
    expect(FileDataAdapterScripts.getDialectName(dialect)).toBe(label);
    expect(FileDataAdapterScripts.getSampleConnectionString(dialect)).toBe(sample);
  });

  test("uses JSON defaults when a dialect is omitted and falls back for other dialects", () => {
    expect(FileDataAdapterScripts.getSampleConnectionString()).toBe("json:///absolute/path/to/file.json");
    expect(FileDataAdapterScripts.getDialectName()).toBe("");
    expect(FileDataAdapterScripts.getDialectName("mysql")).toBe("Mysql");
    expect(FileDataAdapterScripts.getConnectionSetupGuide()).toContain("json:///absolute/path/to/file.json");
  });

  test("offers an absolute-path field, icon, and JavaScript query mode", () => {
    expect(FileDataAdapterScripts.getConnectionFormInputs("json")).toMatchInlineSnapshot(`
      [
        [
          "filePath",
          "Absolute file path",
        ],
      ]
    `);
    expect(FileDataAdapterScripts.getDialectIcon()).toContain("file.png");
    expect(FileDataAdapterScripts.getSyntaxMode()).toBe("javascript");
  });

  test("inserts the display query from the Select JSON table command", () => {
    const input = { dialect: "json" as SqluiCore.Dialect, tableId: "package.json" };
    const command = getTableActions(input)[0];
    const sample = FileDataAdapterScripts.getSampleSelectQuery(input);

    expect(command).toMatchInlineSnapshot(`
      {
        "formatter": "js",
        "label": "Select JSON",
        "query": "display(res_json);",
      }
    `);
    expect(command.query).toContain("display(res_json)");
    expect(sample?.query).toBe("display(res_json);");
    expect(FileDataAdapterScripts.getDatabaseScripts()).toMatchInlineSnapshot(`[]`);
    expect(FileDataAdapterScripts.getConnectionScripts()).toMatchInlineSnapshot(`[]`);
  });
});
