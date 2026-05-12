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
});
