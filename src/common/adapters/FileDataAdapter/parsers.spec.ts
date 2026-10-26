import { describe, expect, test } from "vitest";
import { parseFileContent } from "src/common/adapters/FileDataAdapter/parsers";
import { SqluiCore } from "typings";

describe("parseFileContent", () => {
  test("parses JSON and reports malformed JSON", () => {
    expect(parseFileContent("json", '{"name":"Acme"}')).toEqual({ name: "Acme" });
    expect(() => parseFileContent("json", "{broken")).toThrow("Invalid JSON");
  });

  test("parses JSONC comments and trailing commas, but rejects errors", () => {
    expect(parseFileContent("jsonc", '{\n  // comment\n  "items": [1, 2,],\n}')).toEqual({ items: [1, 2] });
    expect(() => parseFileContent("jsonc", '{"items": [}')).toThrow("Invalid JSONC");
  });

  test("parses YAML and the yml alias", () => {
    const source = "items:\n  - name: Acme\n    age: 18\n";

    expect(parseFileContent("yaml", source)).toEqual({ items: [{ name: "Acme", age: 18 }] });
    expect(parseFileContent("yml", source)).toEqual({ items: [{ name: "Acme", age: 18 }] });
    expect(() => parseFileContent("yaml", "items: [unterminated")).toThrow("Invalid YAML");
  });

  test("parses TOML tables and rejects malformed TOML", () => {
    expect(parseFileContent("toml", 'title = "Acme"\n[database]\nport = 9000')).toEqual({ title: "Acme", database: { port: 9000 } });
    expect(() => parseFileContent("toml", "[database\nport = 9000")).toThrow();
  });

  test("parses XML attributes and repeated elements", () => {
    const result = parseFileContent("xml", '<catalog><item id="1">Book</item><item id="2">Pen</item></catalog>');

    expect(result).toEqual({
      catalog: {
        item: [
          { "@_id": 1, "#text": "Book" },
          { "@_id": 2, "#text": "Pen" },
        ],
      },
    });
    expect(() => parseFileContent("xml", "<root><open></root>")).toThrow("Invalid XML");
  });

  test("rejects unsupported dialects", () => {
    expect(() => parseFileContent("unsupported" as SqluiCore.Dialect, "{}")).toThrow("Unsupported document format");
  });
});
