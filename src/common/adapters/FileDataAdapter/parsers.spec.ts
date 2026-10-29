import { describe, expect, test } from "vitest";
import { parseFileContent } from "src/common/adapters/FileDataAdapter/parsers";
import { SqluiCore } from "typings";

describe("parseFileContent", () => {
  test("parses JSON and reports malformed JSON", () => {
    expect(parseFileContent("json", '{"name":"Acme"}')).toMatchInlineSnapshot(`
      {
        "name": "Acme",
      }
    `);
    expect(() => parseFileContent("json", "{broken")).toThrow("Invalid JSON");
  });

  test("parses JSONC comments and trailing commas, but rejects errors", () => {
    expect(parseFileContent("jsonc", '{\n  // comment\n  "items": [1, 2,],\n}')).toMatchInlineSnapshot(`
      {
        "items": [
          1,
          2,
        ],
      }
    `);
    expect(() => parseFileContent("jsonc", '{"items": [}')).toThrow("Invalid JSONC");
  });

  test("parses YAML and the yml alias", () => {
    const source = "items:\n  - name: Acme\n    age: 18\n";

    expect(parseFileContent("yaml", source)).toMatchInlineSnapshot(`
      {
        "items": [
          {
            "age": 18,
            "name": "Acme",
          },
        ],
      }
    `);
    expect(parseFileContent("yml", source)).toMatchInlineSnapshot(`
      {
        "items": [
          {
            "age": 18,
            "name": "Acme",
          },
        ],
      }
    `);
    expect(() => parseFileContent("yaml", "items: [unterminated")).toThrow("Invalid YAML");
  });

  test("parses TOML tables and rejects malformed TOML", () => {
    expect(parseFileContent("toml", 'title = "Acme"\n[database]\nport = 9000')).toMatchInlineSnapshot(`
      {
        "database": {
          "port": 9000,
        },
        "title": "Acme",
      }
    `);
    expect(() => parseFileContent("toml", "[database\nport = 9000")).toThrow();
  });

  test("parses XML attributes and repeated elements", () => {
    const result = parseFileContent("xml", '<catalog><item id="1">Book</item><item id="2">Pen</item></catalog>');

    expect(result).toMatchInlineSnapshot(`
      {
        "catalog": {
          "item": [
            {
              "#text": "Book",
              "@_id": 1,
            },
            {
              "#text": "Pen",
              "@_id": 2,
            },
          ],
        },
      }
    `);
    expect(() => parseFileContent("xml", "<root><open></root>")).toThrow("Invalid XML");
  });

  test("rejects unsupported dialects", () => {
    expect(() => parseFileContent("unsupported" as SqluiCore.Dialect, "{}")).toThrow("Unsupported document format");
  });
});
