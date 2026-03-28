import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";

describe("BaseDataAdapter", () => {
  describe("getConnectionParameters", () => {
    test("bogus input #1 should not throw errors and return undefined", async () => {
      let actual = BaseDataAdapter.getConnectionParameters("   bogus1://localhost:9042/system_schema");
      expect(actual?.scheme).toMatchInlineSnapshot(`undefined`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
      expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`undefined`);
    });

    test("bogus input #2 should not throw errors and return undefined", async () => {
      let actual = BaseDataAdapter.getConnectionParameters("bogus2    ://localhost:9042/system_schema");
      expect(actual?.scheme).toMatchInlineSnapshot(`undefined`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
      expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`undefined`);
    });

    test("bogus input #3 should not throw errors and return undefined", async () => {
      let actual = BaseDataAdapter.getConnectionParameters("b o g u s 3://localhost:9042/system_schema");
      expect(actual?.scheme).toMatchInlineSnapshot(`undefined`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
      expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`undefined`);
    });

    test("scheme with dash and plus should work", async () => {
      let actual = BaseDataAdapter.getConnectionParameters("lldp-med://localhost:9042/system_schema");
      expect(actual?.scheme).toMatchInlineSnapshot(`"lldp-med"`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
      expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`"system_schema"`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
        [
          {
            "host": "localhost",
            "port": 9042,
          },
        ]
      `);

      actual = BaseDataAdapter.getConnectionParameters("lldp-med+tcp://localhost:9042/system_schema");
      expect(actual?.scheme).toMatchInlineSnapshot(`"lldp-med+tcp"`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
      expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`"system_schema"`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
        [
          {
            "host": "localhost",
            "port": 9042,
          },
        ]
      `);
    });

    test("basic input should work", async () => {
      let actual = BaseDataAdapter.getConnectionParameters("cassandra://localhost:9042");
      expect(actual?.scheme).toMatchInlineSnapshot(`"cassandra"`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
      expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
        [
          {
            "host": "localhost",
            "port": 9042,
          },
        ]
      `);
    });

    test("input with keyspace", async () => {
      let actual = BaseDataAdapter.getConnectionParameters("cassandra://localhost:9042/system_schema");
      expect(actual?.scheme).toMatchInlineSnapshot(`"cassandra"`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
      expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`"system_schema"`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
        [
          {
            "host": "localhost",
            "port": 9042,
          },
        ]
      `);
    });

    test("input with username and password", async () => {
      let actual = BaseDataAdapter.getConnectionParameters("cassandra://username:password@localhost:9042");
      expect(actual?.scheme).toMatchInlineSnapshot(`"cassandra"`);
      expect(actual?.username).toMatchInlineSnapshot(`"username"`);
      expect(actual?.password).toMatchInlineSnapshot(`"password"`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
        [
          {
            "host": "localhost",
            "port": 9042,
          },
        ]
      `);
    });

    test("input with username and password and database", async () => {
      let actual = BaseDataAdapter.getConnectionParameters("cassandra://username:password@localhost:9042/system_schema");
      expect(actual?.scheme).toMatchInlineSnapshot(`"cassandra"`);
      expect(actual?.username).toMatchInlineSnapshot(`"username"`);
      expect(actual?.password).toMatchInlineSnapshot(`"password"`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`"system_schema"`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
        [
          {
            "host": "localhost",
            "port": 9042,
          },
        ]
      `);
    });

    test("input that needs to be encoded properly", async () => {
      let actual = BaseDataAdapter.getConnectionParameters(
        "cassandra://sqlui-native-17823707621378612879:some_strong-PasswordMa+9T=]-G?We4Pp$wcUK==@sqlui-native-17823707621378612879.cassandra.cosmos.azure.com:10350",
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`"cassandra"`);
      expect(actual?.username).toMatchInlineSnapshot(`"sqlui-native-17823707621378612879"`);
      expect(actual?.password).toMatchInlineSnapshot(`"some_strong-PasswordMa+9T=]-G?We4Pp$wcUK=="`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
        [
          {
            "host": "sqlui-native-17823707621378612879.cassandra.cosmos.azure.com",
            "port": 10350,
          },
        ]
      `);
    });

    test("input that needs further encoding", async () => {
      let actual = BaseDataAdapter.getConnectionParameters(
        "mongodb+srv://username:Mgvkgff8gjv6fp4ju4hag97%25t%2FX(EB%40n9)(T(7P)nm2ytsbmd2aw26ncsd54@mongodb.azure.com",
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`"mongodb+srv"`);
      expect(actual?.username).toMatchInlineSnapshot(`"username"`);
      expect(actual?.password).toMatchInlineSnapshot(`"Mgvkgff8gjv6fp4ju4hag97%t/X(EB@n9)(T(7P)nm2ytsbmd2aw26ncsd54"`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
        [
          {
            "host": "mongodb.azure.com",
          },
        ]
      `);
    });

    test("postgresql complex example", async () => {
      let actual = BaseDataAdapter.getConnectionParameters("postgresql://demo:demo13524@127.0.0.1:26257/movr?sslmode=require");
      expect(actual?.scheme).toMatchInlineSnapshot(`"postgresql"`);
      expect(actual?.username).toMatchInlineSnapshot(`"demo"`);
      expect(actual?.password).toMatchInlineSnapshot(`"demo13524"`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`"movr"`);
      expect(actual?.options).toMatchInlineSnapshot(`
        {
          "sslmode": "require",
        }
      `);
      expect(actual?.options).toMatchInlineSnapshot(`
        {
          "sslmode": "require",
        }
      `);
      expect(actual?.hosts).toMatchInlineSnapshot(`
        [
          {
            "host": "127.0.0.1",
            "port": 26257,
          },
        ]
      `);
    });

    test("mongodb+srv complex example", async () => {
      let actual = BaseDataAdapter.getConnectionParameters("mongodb+srv://username:password@localhost:27017");
      expect(actual?.scheme).toMatchInlineSnapshot(`"mongodb+srv"`);
      expect(actual?.username).toMatchInlineSnapshot(`"username"`);
      expect(actual?.password).toMatchInlineSnapshot(`"password"`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
        [
          {
            "host": "localhost",
            "port": 27017,
          },
        ]
      `);
    });

    test("mongodb+srv with no port example", async () => {
      let actual = BaseDataAdapter.getConnectionParameters("mongodb+srv://username:password@localhost");
      expect(actual?.scheme).toMatchInlineSnapshot(`"mongodb+srv"`);
      expect(actual?.username).toMatchInlineSnapshot(`"username"`);
      expect(actual?.password).toMatchInlineSnapshot(`"password"`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
        [
          {
            "host": "localhost",
          },
        ]
      `);
    });

    test("redis simple example", async () => {
      let actual = BaseDataAdapter.getConnectionParameters("redis://localhost:6379");
      expect(actual?.scheme).toMatchInlineSnapshot(`"redis"`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
      expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
        [
          {
            "host": "localhost",
            "port": 6379,
          },
        ]
      `);
    });

    test("rediss complex example", async () => {
      let actual = BaseDataAdapter.getConnectionParameters("rediss://username:password@localhost:6379");
      expect(actual?.scheme).toMatchInlineSnapshot(`"rediss"`);
      expect(actual?.username).toMatchInlineSnapshot(`"username"`);
      expect(actual?.password).toMatchInlineSnapshot(`"password"`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
        [
          {
            "host": "localhost",
            "port": 6379,
          },
        ]
      `);
    });
  });

  describe("resolveTypes", () => {
    test("resolves flat object with primitive types", () => {
      const result = BaseDataAdapter.resolveTypes({ name: "Acme", count: 42, active: true });
      expect(result["name"].type).toBe("string");
      expect(result["count"].type).toBe("integer");
      expect(result["active"].type).toBe("boolean");
    });

    test("distinguishes integer from float", () => {
      const result = BaseDataAdapter.resolveTypes({ whole: 10, decimal: 3.14 });
      expect(result["whole"].type).toBe("integer");
      expect(result["decimal"].type).toBe("float");
    });

    test("resolves nested objects with path separators", () => {
      const result = BaseDataAdapter.resolveTypes({ address: { city: "Springfield", zip: 12345 } });
      expect(result["address/city"].type).toBe("string");
      expect(result["address/city"].nested).toBe(true);
      expect(result["address/city"].propertyPath).toEqual(["address", "city"]);
      expect(result["address/zip"].type).toBe("integer");
    });

    test("marks top-level properties as not nested", () => {
      const result = BaseDataAdapter.resolveTypes({ id: 1 });
      expect(result["id"].nested).toBe(false);
    });

    test("handles null and undefined values gracefully", () => {
      const result = BaseDataAdapter.resolveTypes({ a: null, b: undefined, c: "ok" });
      expect(result["a"]).toBeUndefined();
      expect(result["b"]).toBeUndefined();
      expect(result["c"].type).toBe("string");
    });

    test("handles empty object", () => {
      const result = BaseDataAdapter.resolveTypes({});
      expect(Object.keys(result).length).toBe(0);
    });

    test("applies custom type converter", () => {
      const converter = (type: string, _value: any) => type.toUpperCase();
      const result = BaseDataAdapter.resolveTypes({ name: "Globex" }, converter);
      expect(result["name"].type).toBe("STRING");
    });

    test("custom converter receives pre-converted number types", () => {
      const types: string[] = [];
      const converter = (type: string, _value: any) => {
        types.push(type);
        return type;
      };
      BaseDataAdapter.resolveTypes({ a: 10, b: 1.5 }, converter);
      expect(types).toContain("integer");
      expect(types).toContain("float");
    });

    test("handles deeply nested objects", () => {
      const result = BaseDataAdapter.resolveTypes({ l1: { l2: { l3: "deep" } } });
      expect(result["l1/l2/l3"].type).toBe("string");
      expect(result["l1/l2/l3"].propertyPath).toEqual(["l1", "l2", "l3"]);
      expect(result["l1/l2/l3"].nested).toBe(true);
    });
  });

  describe("inferTypesFromItems", () => {
    test("infers columns from a single item", () => {
      const columns = BaseDataAdapter.inferTypesFromItems([{ id: 1, name: "Initech" }]);
      const names = columns.map((c) => c.name);
      expect(names).toContain("id");
      expect(names).toContain("name");
    });

    test("merges columns from multiple items with different shapes", () => {
      const columns = BaseDataAdapter.inferTypesFromItems([{ a: 1 }, { b: "two" }]);
      const names = columns.map((c) => c.name);
      expect(names).toContain("a");
      expect(names).toContain("b");
    });

    test("returns empty array for empty input", () => {
      expect(BaseDataAdapter.inferTypesFromItems([])).toEqual([]);
    });
  });

  describe("inferSqlTypeFromItems", () => {
    test("returns SQL types for mysql dialect", () => {
      const columns = BaseDataAdapter.inferSqlTypeFromItems([{ id: 1, price: 9.99, name: "widget", active: true }], "mysql");
      const byName = Object.fromEntries(columns.map((c) => [c.name, c.type]));
      expect(byName["id"]).toBe("INTEGER");
      expect(byName["price"]).toBe("FLOAT");
      expect(byName["name"]).toBe("TEXT");
      expect(byName["active"]).toBe("BOOLEAN");
    });

    test("returns SQL types for mssql dialect (BIT for boolean)", () => {
      const columns = BaseDataAdapter.inferSqlTypeFromItems([{ flag: true }], "mssql");
      expect(columns[0].type).toBe("BIT");
    });

    test("returns SQL types for cassandra dialect (INT for integer)", () => {
      const columns = BaseDataAdapter.inferSqlTypeFromItems([{ count: 5 }], "cassandra");
      expect(columns[0].type).toBe("INT");
    });

    test("returns raw JS types when no dialect hint is given", () => {
      const columns = BaseDataAdapter.inferSqlTypeFromItems([{ count: 5, ratio: 0.5, label: "x" }]);
      const byName = Object.fromEntries(columns.map((c) => [c.name, c.type]));
      expect(byName["count"]).toBe("integer");
      expect(byName["ratio"]).toBe("float");
      expect(byName["label"]).toBe("string");
    });

    test("returns raw JS types for non-SQL dialects like mongodb", () => {
      const columns = BaseDataAdapter.inferSqlTypeFromItems([{ n: 1, s: "a", b: true }], "mongodb");
      const byName = Object.fromEntries(columns.map((c) => [c.name, c.type]));
      expect(byName["n"]).toBe("integer");
      expect(byName["s"]).toBe("string");
      expect(byName["b"]).toBe("boolean");
    });
  });
});
