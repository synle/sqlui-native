import { describe, expect, test } from "vitest";
import { evaluateDataQuery } from "src/common/adapters/FileDataAdapter/queryParser";

describe("evaluateDataQuery", () => {
  const data = {
    items: [
      { age: 17, active: true, name: "Ada" },
      { age: 18, active: true, name: "Grace" },
      { age: 22, active: false, name: "Lin" },
    ],
  };

  test("filters with the implicit item predicate syntax", () => {
    const result = evaluateDataQuery("res_json = res_json.items.filter(item.age >= 18); display(res_json);", data);

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "active": true,
          "age": 18,
          "name": "Grace",
        },
        {
          "active": false,
          "age": 22,
          "name": "Lin",
        },
      ]
    `);
  });

  test("filters with a parenthesized arrow callback and logical comparisons", () => {
    const result = evaluateDataQuery("display(res_json.items.filter((item) => item.age >= 18 && item.active === true));", data);

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "active": true,
          "age": 18,
          "name": "Grace",
        },
      ]
    `);
  });

  test("maps, searches, and slices values", () => {
    const result = evaluateDataQuery(
      'display(res_json.items.filter(item => item.name.includes("r")).map(item => item.name).slice(0, 2));',
      data,
    );

    expect(result).toMatchInlineSnapshot(`
      [
        "Grace",
      ]
    `);
  });

  test("supports slice with one bound and single-quoted strings", () => {
    const result = evaluateDataQuery("display(res_json.items.map(item => item.name).slice(1));", data);

    expect(result).toMatchInlineSnapshot(`
      [
        "Grace",
        "Lin",
      ]
    `);
    expect(evaluateDataQuery("display(res_json.items.find(item => item.name === 'Grace'));", data)).toMatchInlineSnapshot(`
      {
        "active": true,
        "age": 18,
        "name": "Grace",
      }
    `);
  });

  test("finds one matching value and reads bracket properties", () => {
    const result = evaluateDataQuery('display(res_json["items"].find(item => item.age >= 18));', data);

    expect(result).toMatchInlineSnapshot(`
      {
        "active": true,
        "age": 18,
        "name": "Grace",
      }
    `);
  });

  test.each([
    ["item.age > 18", [{ age: 22, active: false, name: "Lin" }]],
    ["item.age < 18", [{ age: 17, active: true, name: "Ada" }]],
    [
      "item.age <= 18",
      [
        { age: 17, active: true, name: "Ada" },
        { age: 18, active: true, name: "Grace" },
      ],
    ],
    [
      "item.age !== 18",
      [
        { age: 17, active: true, name: "Ada" },
        { age: 22, active: false, name: "Lin" },
      ],
    ],
    ['item.age >= "18"', []],
  ] as const)("compares values with %s", (predicate, expected) => {
    expect(evaluateDataQuery(`display(res_json.items.filter(item => ${predicate}));`, data)).toEqual(expected);
  });

  test("short-circuits boolean conditions and supports logical negation", () => {
    expect(evaluateDataQuery("display(res_json.items.filter(item => item.active === false || item.age < 18));", data))
      .toMatchInlineSnapshot(`
      [
        {
          "active": true,
          "age": 17,
          "name": "Ada",
        },
        {
          "active": false,
          "age": 22,
          "name": "Lin",
        },
      ]
    `);
    expect(evaluateDataQuery("display(res_json.items.filter(item => !item.active));", data)).toMatchInlineSnapshot(`
      [
        {
          "active": false,
          "age": 22,
          "name": "Lin",
        },
      ]
    `);
  });

  test.each([
    ["item.age + 1", [18, 19, 23]],
    ["item.age - 1", [16, 17, 21]],
    ["item.age * 2", [34, 36, 44]],
    ["item.age / 2", [8.5, 9, 11]],
    ["item.age % 2", [1, 0, 0]],
    ["-item.age", [-17, -18, -22]],
    ['item.name + "!"', ["Ada!", "Grace!", "Lin!"]],
  ] as const)("maps arithmetic expression %s", (expression, expected) => {
    expect(evaluateDataQuery(`display(res_json.items.map(item => ${expression}));`, data)).toEqual(expected);
  });

  test("reads collection lengths and indexes, and searches arrays", () => {
    expect(evaluateDataQuery("display(res_json.items.length);", data)).toBe(3);
    expect(evaluateDataQuery('display("sample".length);', data)).toBe(6);
    expect(evaluateDataQuery("display(res_json.items[0]);", data)).toMatchInlineSnapshot(`
      {
        "active": true,
        "age": 17,
        "name": "Ada",
      }
    `);
    expect(evaluateDataQuery("display(res_json.items.includes(res_json.items[0]));", data)).toBe(true);
    expect(evaluateDataQuery("display(res_json.missing);", data)).toBeUndefined();
  });

  test("supports literal values, empty statements, and block comments", () => {
    expect(evaluateDataQuery(";;; display(false); display(true);", data)).toBe(true);
    expect(evaluateDataQuery("display(null);", data)).toBe(null);
    expect(evaluateDataQuery("/* parsed input */ display(res_json)", data)).toEqual(data);
  });

  test("rejects malformed tokens and invalid string escapes", () => {
    expect(() => evaluateDataQuery("display(@);", data)).toThrow("Unsupported character");
    expect(() => evaluateDataQuery("display('unterminated);", data)).toThrow("Unclosed string literal");
    expect(() => evaluateDataQuery("display('bad\\q');", data)).toThrow("Invalid string escape");
    expect(() => evaluateDataQuery("display(res_json); /* unclosed", data)).toThrow("Unclosed block comment");
  });

  test("rejects invalid access and method arguments", () => {
    expect(() => evaluateDataQuery("display(res_json.items[true]);", data)).toThrow("Property access requires a string or numeric key");
    expect(() => evaluateDataQuery("display(res_json.items.filter());", data)).toThrow("filter() requires one predicate");
    expect(() => evaluateDataQuery("display(res_json.items.filter(item => true, item => false));", data)).toThrow(
      "filter() requires one predicate",
    );
    expect(() => evaluateDataQuery("display(res_json.items.includes(item => true));", data)).toThrow("includes() requires one value");
    expect(() => evaluateDataQuery("display(res_json.filter(item => true));", data)).toThrow("requires an array");
    expect(() => evaluateDataQuery("display(res_json.items.slice());", data)).toThrow("slice() requires one or two numeric arguments");
    expect(() => evaluateDataQuery('display(res_json.items.slice("1"));', data)).toThrow("slice() arguments must be integers");
    expect(() => evaluateDataQuery("display(res_json.items.slice(item => true));", data)).toThrow(
      "slice() requires one or two numeric arguments",
    );
    expect(() => evaluateDataQuery("display(res_json.items.length.includes(1));", data)).toThrow("includes() requires an array");
    expect(() => evaluateDataQuery("display(res_json.items.filter(item => item.age + item.active));", data)).toThrow(
      "requires two numbers or two strings",
    );
    expect(() => evaluateDataQuery("display(res_json.items.map(item => item.age - item.active));", data)).toThrow("requires numbers");
  });

  test("supports comments and semicolon-free final statements", () => {
    const result = evaluateDataQuery("// Keep the parsed value unchanged\ndisplay(res_json)", data);

    expect(result).toEqual(data);
  });

  test("rejects queries that omit display", () => {
    expect(() => evaluateDataQuery("res_json = res_json.items", data)).toThrow("Query must call display(res_json)");
  });

  test("rejects JavaScript execution and unknown identifiers", () => {
    expect(() => evaluateDataQuery("display(process.exit())", data)).toThrow("Unknown identifier 'process'");
    expect(() => evaluateDataQuery("display(secret)", data)).toThrow("Unknown identifier 'secret'");
  });

  test("rejects prototype traversal", () => {
    expect(() => evaluateDataQuery("display(res_json.constructor)", data)).toThrow("Property 'constructor' is not allowed");
  });

  test("rejects unsupported methods and missing statement separators", () => {
    expect(() => evaluateDataQuery("display(res_json.items.sort())", data)).toThrow("Unsupported method 'sort'");
    expect(() => evaluateDataQuery("display(res_json) display(res_json)", data)).toThrow("Expected a semicolon");
    expect(() => evaluateDataQuery("res_json.items = [] ; display(res_json)", data)).toThrow("Expected res_json assignment");
  });

  test("rejects oversized queries", () => {
    expect(() => evaluateDataQuery(`display(res_json);${" ".repeat(16_384)}`, data)).toThrow("character limit");
  });

  test("stops array operations at the evaluation budget", () => {
    const manyItems = Array.from({ length: 20_000 }, () => ({ age: 20 }));

    expect(() => evaluateDataQuery("display(res_json.filter(item.age >= 18));", manyItems)).toThrow("evaluation limit");
  });
});
