import * as formatter from "src/frontend/utils/formatter";

describe("formatter", () => {
  describe("formatJS", () => {
    test("should work", async () => {
      const actual = formatter.formatJS(
        `db.collection("sy-collection-1a").distinct("commute",{_id:"",commute:"","company.location":"","company.name":"",location:"",name:"",zip:""});`,
      );
      expect(actual).toMatchInlineSnapshot(`
"db.collection(\\"sy-collection-1a\\")
  .distinct(\\"commute\\", {
    _id: \\"\\",
    commute: \\"\\",
    \\"company.location\\": \\"\\",
    \\"company.name\\": \\"\\",
    location: \\"\\",
    name: \\"\\",
    zip: \\"\\"
  });"
`);
    });

    test("should return original string if formatting fails", async () => {
      const invalidJs = "";
      const actual = formatter.formatJS(invalidJs);
      expect(actual).toEqual("");
    });
  });

  describe("formatSQL", () => {
    test("should work", async () => {
      const actual = formatter.formatSQL(`SELECT AlbumId, ArtistId, Title FROM albums WHERE Title = 'abc' LIMIT 100`);
      expect(actual).toMatchInlineSnapshot(`
"SELECT
  AlbumId,
  ArtistId,
  Title
FROM
  albums
WHERE
  Title = 'abc'
LIMIT
  100"
`);
    });

    test("should handle simple query", async () => {
      const actual = formatter.formatSQL(`SELECT * FROM users`);
      expect(actual).toContain("SELECT");
      expect(actual).toContain("users");
    });
  });

  describe("formatDuration", () => {
    test("should return seconds for durations > 1 second", () => {
      expect(formatter.formatDuration(2000)).toEqual("2 seconds");
      expect(formatter.formatDuration(5500)).toEqual("5 seconds");
      expect(formatter.formatDuration(10000)).toEqual("10 seconds");
      expect(formatter.formatDuration(60000)).toEqual("60 seconds");
    });

    test("should return '<= 1 second' for durations <= 1 second", () => {
      expect(formatter.formatDuration(0)).toEqual("<= 1 second");
      expect(formatter.formatDuration(500)).toEqual("<= 1 second");
      expect(formatter.formatDuration(999)).toEqual("<= 1 second");
      expect(formatter.formatDuration(1000)).toEqual("<= 1 second");
    });

    test("should floor the seconds value", () => {
      expect(formatter.formatDuration(2999)).toEqual("2 seconds");
      expect(formatter.formatDuration(3001)).toEqual("3 seconds");
    });
  });

  describe("escapeSQLValue", () => {
    test("should escape single quotes", () => {
      expect(formatter.escapeSQLValue("it's")).toEqual("it''s");
      expect(formatter.escapeSQLValue("it's a 'test'")).toEqual("it''s a ''test''");
    });

    test("should return empty string for undefined", () => {
      expect(formatter.escapeSQLValue(undefined)).toEqual("");
    });

    test("should return unchanged string without quotes", () => {
      expect(formatter.escapeSQLValue("hello world")).toEqual("hello world");
    });

    test("should handle empty string", () => {
      expect(formatter.escapeSQLValue("")).toEqual("");
    });
  });

  describe("isValueNumber", () => {
    test("should return true for numbers", () => {
      expect(formatter.isValueNumber(42)).toBe(true);
      expect(formatter.isValueNumber(0)).toBe(true);
      expect(formatter.isValueNumber(3.14)).toBe(true);
      expect(formatter.isValueNumber(-1)).toBe(true);
    });

    test("should return true for numeric strings", () => {
      expect(formatter.isValueNumber("42")).toBe(true);
      expect(formatter.isValueNumber("3.14")).toBe(true);
      expect(formatter.isValueNumber("0")).toBe(true);
    });

    test("should return false for non-numbers", () => {
      expect(formatter.isValueNumber("abc")).toBe(false);
      expect(formatter.isValueNumber(NaN)).toBe(false);
    });
  });

  describe("isValueBoolean", () => {
    test("should return true for boolean values", () => {
      expect(formatter.isValueBoolean(true)).toBe(true);
      expect(formatter.isValueBoolean(false)).toBe(true);
    });

    test("should return true for boolean strings (case insensitive)", () => {
      expect(formatter.isValueBoolean("true")).toBe(true);
      expect(formatter.isValueBoolean("false")).toBe(true);
      expect(formatter.isValueBoolean("True")).toBe(true);
      expect(formatter.isValueBoolean("FALSE")).toBe(true);
    });

    test("should return false for non-boolean values", () => {
      expect(formatter.isValueBoolean("yes")).toBe(false);
      expect(formatter.isValueBoolean("1")).toBe(false);
      expect(formatter.isValueBoolean("abc")).toBe(false);
    });
  });
});
