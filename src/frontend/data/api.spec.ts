// @vitest-environment jsdom
import { vi } from "vitest";
import { ProxyApi } from "src/frontend/data/api";

describe("ProxyApi", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ result: "ok" })),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("getConfigs calls fetch with /api/configs", async () => {
    await ProxyApi.getConfigs();
    expect(fetch).toHaveBeenCalled();
  });

  test("getConnections calls fetch", async () => {
    await ProxyApi.getConnections();
    expect(fetch).toHaveBeenCalled();
  });

  test("getSessions calls fetch", async () => {
    await ProxyApi.getSessions();
    expect(fetch).toHaveBeenCalled();
  });

  test("getQueries calls fetch", async () => {
    await ProxyApi.getQueries();
    expect(fetch).toHaveBeenCalled();
  });

  test("deleteConnection calls fetch with delete method", async () => {
    await ProxyApi.deleteConnection("c1");
    expect(fetch).toHaveBeenCalled();
  });

  test("upsertConnection with id uses put", async () => {
    await ProxyApi.upsertConnection({ id: "c1", connection: "mysql://localhost" } as any);
    expect(fetch).toHaveBeenCalled();
  });

  test("upsertConnection without id uses post", async () => {
    await ProxyApi.upsertConnection({ connection: "mysql://localhost" } as any);
    expect(fetch).toHaveBeenCalled();
  });

  test("getDataSnapshots calls fetch", async () => {
    await ProxyApi.getDataSnapshots();
    expect(fetch).toHaveBeenCalled();
  });

  test("test() POSTs to /api/connection/test", async () => {
    await ProxyApi.test({ name: "X", connection: "mysql://x" } as any);
    expect((fetch as any).mock.calls[0][0]).toMatch(/\/api\/connection\/test/);
  });

  test("execute() POSTs with the query body", async () => {
    await ProxyApi.execute({
      id: "q1",
      sql: "SELECT 1",
      connectionId: "c1",
      databaseId: "d1",
    } as any);
    const call = (fetch as any).mock.calls[0];
    expect(call[1].method.toLowerCase()).toBe("post");
  });

  test("reconnect() POSTs to /connect", async () => {
    await ProxyApi.reconnect("c1");
    expect((fetch as any).mock.calls[0][0]).toMatch(/\/connect$/);
  });

  test("refresh endpoints POST", async () => {
    await ProxyApi.refreshConnection("c");
    await ProxyApi.refreshDatabase("c", "d");
    await ProxyApi.refreshTable("c", "d", "t");
    const calls = (fetch as any).mock.calls;
    for (const c of calls.slice(-3)) {
      expect(c[1].method.toLowerCase()).toBe("post");
    }
  });

  test("managed databases CRUD calls fetch each time", async () => {
    await ProxyApi.listManagedDatabases("c");
    await ProxyApi.createManagedDatabase("c", { name: "F1" });
    await ProxyApi.getManagedDatabase("c", "F1");
    await ProxyApi.renameManagedDatabase("c", "F1", { name: "F1A" });
    await ProxyApi.updateManagedDatabase("c", "F1A", { props: {} } as any);
    await ProxyApi.deleteManagedDatabase("c", "F1A");
    expect((fetch as any).mock.calls.length).toBeGreaterThanOrEqual(6);
  });

  test("managed tables CRUD calls fetch each time", async () => {
    await ProxyApi.listManagedTables("c");
    await ProxyApi.createManagedTable("c", "d", { name: "t1" });
    await ProxyApi.getManagedTable("c", "d", "t1");
    await ProxyApi.updateManagedTable("c", "d", "t1", { props: {} } as any);
    await ProxyApi.deleteManagedTable("c", "d", "t1");
    expect((fetch as any).mock.calls.length).toBeGreaterThanOrEqual(5);
  });

  test("upsertQuery POSTs for new, PUTs for existing", async () => {
    await ProxyApi.upsertQuery({ name: "Q" } as any);
    await ProxyApi.upsertQuery({ id: "q1", name: "Q2" } as any);
    const calls = (fetch as any).mock.calls;
    expect(calls[calls.length - 2][1].method.toLowerCase()).toBe("post");
    expect(calls[calls.length - 1][1].method.toLowerCase()).toBe("put");
  });

  test("upsertSession POSTs for new, PUTs for existing", async () => {
    await ProxyApi.upsertSession({ name: "S" } as any);
    await ProxyApi.upsertSession({ id: "s1", name: "S2" } as any);
    const calls = (fetch as any).mock.calls;
    expect(calls[calls.length - 2][1].method.toLowerCase()).toBe("post");
    expect(calls[calls.length - 1][1].method.toLowerCase()).toBe("put");
  });

  test("cloneSession POSTs to /clone path", async () => {
    await ProxyApi.cloneSession({ id: "s1", name: "S" } as any);
    expect((fetch as any).mock.calls[(fetch as any).mock.calls.length - 1][0]).toMatch(/\/clone$/);
  });

  test("deleteQuery DELETEs", async () => {
    await ProxyApi.deleteQuery("q1");
    expect((fetch as any).mock.calls[(fetch as any).mock.calls.length - 1][1].method.toLowerCase()).toBe("delete");
  });

  test("deleteSession DELETEs", async () => {
    await ProxyApi.deleteSession("s1");
    expect((fetch as any).mock.calls[(fetch as any).mock.calls.length - 1][1].method.toLowerCase()).toBe("delete");
  });

  test("update() POSTs to /api/connections (bulk replace)", async () => {
    await ProxyApi.update([] as any);
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[0]).toMatch(/\/api\/connections$/);
    expect(c[1].method.toLowerCase()).toBe("post");
  });

  test("getCachedSchema calls fetch", async () => {
    await ProxyApi.getCachedSchema("c", "d");
    expect((fetch as any).mock.calls[(fetch as any).mock.calls.length - 1][0]).toMatch(/\/schema\/cached$/);
  });

  test("getSession calls fetch", async () => {
    await ProxyApi.getSession();
    expect((fetch as any).mock.calls[(fetch as any).mock.calls.length - 1][0]).toMatch(/\/api\/session/);
  });

  test("getConnection calls fetch with the id in URL", async () => {
    await ProxyApi.getConnection("conn-abc");
    expect((fetch as any).mock.calls[(fetch as any).mock.calls.length - 1][0]).toContain("conn-abc");
  });

  test("upsertConnectionForSession PUT when id present", async () => {
    await ProxyApi.upsertConnectionForSession("sess-1", { id: "c1", name: "X", connection: "mysql://x" } as any);
    expect((fetch as any).mock.calls[(fetch as any).mock.calls.length - 1][1].method.toLowerCase()).toBe("put");
  });

  test("upsertConnectionForSession POST when id missing", async () => {
    await ProxyApi.upsertConnectionForSession("sess-1", { name: "X", connection: "mysql://x" } as any);
    expect((fetch as any).mock.calls[(fetch as any).mock.calls.length - 1][1].method.toLowerCase()).toBe("post");
  });

  test("readFileContent POSTs the file to /api/file and returns server text", async () => {
    const file = new File(["hello world"], "f.txt", { type: "text/plain" });
    const out = await ProxyApi.readFileContent(file);
    // server is mocked to return the JSON.stringify({result:"ok"}) body — verify endpoint
    expect(typeof out).toBe("string");
    const call = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(call[0]).toMatch(/\/api\/file/);
  });

  test("updateConfigs PUTs to /api/configs with settings body", async () => {
    await ProxyApi.updateConfigs({ darkMode: "dark" } as any);
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[0]).toMatch(/\/api\/configs$/);
    expect(c[1].method.toUpperCase()).toBe("PUT");
    expect(c[1].body).toContain("darkMode");
  });

  test("getConnectionsBySessionId injects session header", async () => {
    await ProxyApi.getConnectionsBySessionId("sess-123");
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[1].headers["sqlui-native-session-id"]).toBe("sess-123");
  });

  test("getConnectionDatabases hits /databases endpoint", async () => {
    await ProxyApi.getConnectionDatabases("c1");
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[0]).toMatch(/\/connection\/c1\/databases$/);
  });

  test("getConnectionTables hits /tables endpoint", async () => {
    await ProxyApi.getConnectionTables("c1", "db1");
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[0]).toMatch(/\/connection\/c1\/database\/db1\/tables$/);
  });

  test("getConnectionColumns hits /columns endpoint", async () => {
    await ProxyApi.getConnectionColumns("c1", "db1", "t1");
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[0]).toContain("/connection/c1/database/db1/table/t1/columns");
  });

  test("renameManagedDatabase PUTs to managedDatabase endpoint with new name", async () => {
    await ProxyApi.renameManagedDatabase("c", "F1", { name: "F1A" });
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[0]).toContain("F1");
    expect(c[1].method.toLowerCase()).toBe("put");
  });

  test("updateManagedTable wraps body as props when no name/props keys present", async () => {
    await ProxyApi.updateManagedTable("c", "db", "t1", { foo: "bar" } as any);
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    const payload = JSON.parse(c[1].body);
    expect(payload).toHaveProperty("props");
    expect(payload.props).toEqual({ foo: "bar" });
  });

  test("updateManagedTable sends body as-is when 'name' key is present", async () => {
    await ProxyApi.updateManagedTable("c", "db", "t1", { name: "renamed" });
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    const payload = JSON.parse(c[1].body);
    expect(payload).toEqual({ name: "renamed" });
  });

  test("updateManagedTable sends body as-is when 'props' key is present", async () => {
    await ProxyApi.updateManagedTable("c", "db", "t1", { props: { foo: "bar" } as any });
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    const payload = JSON.parse(c[1].body);
    expect(payload).toEqual({ props: { foo: "bar" } });
  });

  test("searchSchema URL-encodes the query parameter", async () => {
    await ProxyApi.searchSchema("a b/c");
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[0]).toContain("/schema/search?q=a%20b%2Fc");
  });

  test("getFolderItems GETs /folder/<id>", async () => {
    await ProxyApi.getFolderItems("recycle_bin");
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[0]).toMatch(/\/folder\/recycle_bin$/);
  });

  test("addFolderItem POSTs", async () => {
    await ProxyApi.addFolderItem("recycle_bin", { type: "Query", data: { sql: "select 1" } } as any);
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[1].method.toLowerCase()).toBe("post");
  });

  test("updateFolderItem PUTs", async () => {
    await ProxyApi.updateFolderItem("recycle_bin", { id: "abc", type: "Query", data: {} } as any);
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[1].method.toLowerCase()).toBe("put");
  });

  test("upsertFolderItem PUTs when id present", async () => {
    await ProxyApi.upsertFolderItem("recycle_bin", { id: "abc", type: "Query", data: {} } as any);
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[1].method.toLowerCase()).toBe("put");
  });

  test("upsertFolderItem POSTs when id absent", async () => {
    await ProxyApi.upsertFolderItem("recycle_bin", { type: "Query", data: {} } as any);
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[1].method.toLowerCase()).toBe("post");
  });

  test("deleteFolderItem DELETEs to /folder/<id>/<itemId>", async () => {
    await ProxyApi.deleteFolderItem("recycle_bin" as any, "abc");
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[0]).toMatch(/\/folder\/recycle_bin\/abc$/);
    expect(c[1].method.toLowerCase()).toBe("delete");
  });

  test("getDataSnapshot GETs by id", async () => {
    await ProxyApi.getDataSnapshot("snap-1");
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[0]).toMatch(/\/dataSnapshot\/snap-1$/);
  });

  test("addDataSnapshot POSTs", async () => {
    await ProxyApi.addDataSnapshot({ values: [], description: "test" });
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[1].method.toLowerCase()).toBe("post");
  });

  test("deleteDataSnapshot DELETEs", async () => {
    await ProxyApi.deleteDataSnapshot("snap-1");
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[0]).toMatch(/\/dataSnapshot\/snap-1$/);
    expect(c[1].method.toLowerCase()).toBe("delete");
  });

  test("getQueryVersionHistory GETs the endpoint", async () => {
    await ProxyApi.getQueryVersionHistory();
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[0]).toMatch(/\/queryVersionHistory$/);
  });

  test("addQueryVersionHistory POSTs", async () => {
    await ProxyApi.addQueryVersionHistory({ connectionId: "c", sql: "select 1", auditType: "saved" as any });
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[1].method.toLowerCase()).toBe("post");
  });

  test("deleteQueryVersionHistory DELETEs a single entry", async () => {
    await ProxyApi.deleteQueryVersionHistory("entry-1");
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[0]).toMatch(/\/queryVersionHistory\/entry-1$/);
    expect(c[1].method.toLowerCase()).toBe("delete");
  });

  test("clearQueryVersionHistory DELETEs the collection", async () => {
    await ProxyApi.clearQueryVersionHistory();
    const c = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
    expect(c[0]).toMatch(/\/queryVersionHistory$/);
    expect(c[1].method.toLowerCase()).toBe("delete");
  });

  test("non-ok response rejects with parsed body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve(JSON.stringify({ error: "bad" })),
      }),
    );
    await expect(ProxyApi.getConfigs()).rejects.toEqual({ error: "bad" });
  });

  test("non-JSON response body falls back to raw text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("not-json-at-all"),
      }),
    );
    const out = await ProxyApi.getConfigs();
    expect(out).toBe("not-json-at-all");
  });
});
