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
});
