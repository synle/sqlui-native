import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import FileDataAdapter from "src/common/adapters/FileDataAdapter";

const LOCAL_FILE_ACCESS_ENV = "SQLUI_LOCAL_FILE_ADAPTER_ENABLED";
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
let tempDir: string;
let originalAccessSetting: string | undefined;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "sqlui-file-adapter-"));
  originalAccessSetting = process.env[LOCAL_FILE_ACCESS_ENV];
  process.env[LOCAL_FILE_ACCESS_ENV] = "true";
});

afterEach(async () => {
  if (originalAccessSetting === undefined) {
    delete process.env[LOCAL_FILE_ACCESS_ENV];
  } else {
    process.env[LOCAL_FILE_ACCESS_ENV] = originalAccessSetting;
  }
  await rm(tempDir, { recursive: true, force: true });
});

function makeConnection(dialect: string, filePath: string): string {
  return `${dialect}://${encodeURI(filePath)}`;
}

describe("FileDataAdapter", () => {
  test("reads an absolute path, executes the sample query, and preserves source text", async () => {
    const filePath = path.join(tempDir, "people with spaces.json");
    const source = '{\n  "items": [{"name":"Ada","age":17},{"name":"Grace","age":18}]\n}\n';
    await writeFile(filePath, source);
    const adapter = new FileDataAdapter(makeConnection("json", filePath));

    await expect(adapter.authenticate()).resolves.toBeUndefined();
    await expect(adapter.getDatabases()).resolves.toEqual([{ name: "people with spaces.json", tables: [] }]);
    await expect(adapter.getTables(undefined)).resolves.toEqual([{ name: "people with spaces.json", columns: [] }]);
    await expect(adapter.getColumns("people with spaces.json", undefined)).resolves.toContainEqual({
      name: "items",
      propertyPath: ["items"],
      type: "array",
      nested: false,
    });

    const result = await adapter.execute("", undefined, undefined);

    expect(result.ok).toBe(true);
    expect(result.raw).toEqual([
      {
        items: [
          { name: "Ada", age: 17 },
          { name: "Grace", age: 18 },
        ],
      },
    ]);
    expect(result.meta).toEqual({ isFileData: true, rawSource: source, sourceFormat: "json" });
    await adapter.disconnect();
  });

  test("executes the Select JSON query with a filtered result", async () => {
    const filePath = path.join(tempDir, "people.json");
    await writeFile(filePath, '{"items":[{"age":17},{"age":18},{"age":22}]}');
    const adapter = new FileDataAdapter(makeConnection("json", filePath));

    const result = await adapter.execute("res_json = res_json.items.filter(item.age >= 18); display(res_json);", undefined, undefined);

    expect(result.raw).toEqual([[{ age: 18 }, { age: 22 }]]);
  });

  test("infers columns for root arrays and scalar documents", async () => {
    const arrayPath = path.join(tempDir, "rows.json");
    await writeFile(arrayPath, '[{"id":1},{"id":2}]');
    const arrayColumns = await new FileDataAdapter(makeConnection("json", arrayPath)).getColumns("rows.json", undefined);

    expect(arrayColumns).toContainEqual({ name: "id", propertyPath: ["id"], type: "integer", nested: false });

    const scalarPath = path.join(tempDir, "scalar.json");
    await writeFile(scalarPath, '"ready"');
    const scalarColumns = await new FileDataAdapter(makeConnection("json", scalarPath)).getColumns("scalar.json", undefined);

    expect(scalarColumns).toContainEqual({ name: "value", propertyPath: ["value"], type: "string", nested: false });
  });

  test.each([
    ["jsonc", "config.jsonc", '{"enabled": true, // comment\n}', { enabled: true }],
    ["yaml", "config.yaml", "enabled: true\n", { enabled: true }],
    ["yml", "config.yml", "enabled: true\n", { enabled: true }],
    ["toml", "config.toml", "enabled = true\n", { enabled: true }],
    ["xml", "config.xml", "<config><enabled>true</enabled></config>", { config: { enabled: true } }],
  ] as const)("loads and parses %s documents", async (dialect, fileName, source, expected) => {
    const filePath = path.join(tempDir, fileName);
    await writeFile(filePath, source);
    const adapter = new FileDataAdapter(makeConnection(dialect, filePath));

    const result = await adapter.execute("display(res_json)", undefined, undefined);

    expect(result.raw).toEqual([expected]);
    expect(result.meta).toMatchObject({ rawSource: source, sourceFormat: dialect });
  });

  test("rejects file access when the server is not loopback-only", async () => {
    const filePath = path.join(tempDir, "private.json");
    await writeFile(filePath, "{}");
    process.env[LOCAL_FILE_ACCESS_ENV] = "false";
    const adapter = new FileDataAdapter(makeConnection("json", filePath));

    await expect(adapter.execute("display(res_json)", undefined, undefined)).rejects.toThrow("disabled on network-bound servers");
  });

  test("rejects relative paths, unsupported schemes, and malformed path encoding", () => {
    expect(() => new FileDataAdapter("json://relative/config.json")).toThrow("absolute filesystem path");
    expect(() => new FileDataAdapter("json://")).toThrow("include an absolute path");
    expect(() => new FileDataAdapter("not a uri")).toThrow("Unsupported local document dialect");
    expect(() => new FileDataAdapter("mysql://localhost")).toThrow("Unsupported local document dialect");
    expect(() => new FileDataAdapter("json:///tmp/%ZZ.json")).toThrow("invalid percent-encoding");
    expect(() => new FileDataAdapter("json:///tmp/%00file.json")).toThrow("null character");
  });

  test("rejects directory paths instead of parsing them as files", async () => {
    const adapter = new FileDataAdapter(makeConnection("json", tempDir));

    await expect(adapter.authenticate()).rejects.toThrow("regular file");
  });

  test("rejects missing and oversized files", async () => {
    const missingPath = path.join(tempDir, "missing.json");
    const adapter = new FileDataAdapter(makeConnection("json", missingPath));
    await expect(adapter.authenticate()).rejects.toMatchObject({
      code: "ENOENT",
      message: "Local document file access failed (ENOENT).",
    });

    const largePath = path.join(tempDir, "large.json");
    await writeFile(largePath, Buffer.alloc(MAX_DOCUMENT_SIZE_BYTES + 1, 32));
    const largeAdapter = new FileDataAdapter(makeConnection("json", largePath));
    await expect(largeAdapter.authenticate()).rejects.toThrow("size limit");
  });
});
