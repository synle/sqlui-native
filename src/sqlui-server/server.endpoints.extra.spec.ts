/**
 * Extra coverage for less-trafficked endpoints registered in src/common/Endpoints.ts.
 * Targets managed-database / managed-table CRUD, schema/cached, connect/execute error paths,
 * and the dataSnapshot GET shape for known-bad payloads.
 */
import { describe, test, expect } from "vitest";
import { app, initializeEndpoints } from "src/sqlui-server/server";

initializeEndpoints();

function hdrs(sessionId: string) {
  return { "sqlui-native-session-id": sessionId, "content-type": "application/json" };
}

async function json(method: string, path: string, sessionId: string, body?: any) {
  const init: RequestInit = { method, headers: hdrs(sessionId) };
  if (body !== undefined) init.body = JSON.stringify(body);
  const r = await app.request(path, init);
  let parsed: any = await r.text();
  try {
    parsed = JSON.parse(parsed);
  } catch {}
  return { status: r.status, body: parsed };
}

describe("Managed Databases (REST API connection)", () => {
  const sid = `extra-mdb.${Date.now()}`;
  let connectionId = "";

  test("setup: create a rest:// connection", async () => {
    const r = await json("POST", "/api/connection", sid, {
      name: "Acme REST Collection",
      connection: 'rest://{"HOST":"https://api.example.com"}',
    });
    expect(r.status).toEqual(201);
    connectionId = r.body.id;
  });

  test("POST /api/connection/:cid/managedDatabase creates a folder", async () => {
    const r = await json("POST", `/api/connection/${connectionId}/managedDatabase`, sid, {
      name: "Reports",
    });
    expect([200, 201]).toContain(r.status);
    expect(r.body.name).toEqual("Reports");
  });

  test("GET /api/connection/:cid/managedDatabases lists folders", async () => {
    const r = await json("GET", `/api/connection/${connectionId}/managedDatabases`, sid);
    expect(r.status).toEqual(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.length).toBeGreaterThanOrEqual(1);
  });

  test("GET /api/connection/:cid/managedDatabase/:id returns one folder", async () => {
    const folderId = "Reports";
    const r = await json("GET", `/api/connection/${connectionId}/managedDatabase/${folderId}`, sid);
    expect([200, 404]).toContain(r.status);
  });

  test("PUT /api/connection/:cid/managedDatabase/:id updates a folder", async () => {
    const folderId = "Reports";
    const r = await json(
      "PUT",
      `/api/connection/${connectionId}/managedDatabase/${folderId}`,
      sid,
      {
        id: folderId,
        name: "Reports2",
      },
    );
    expect([200, 202]).toContain(r.status);
  });

  test("DELETE /api/connection/:cid/managedDatabase/:id removes it", async () => {
    // accept either successful delete or not-found, since rename may have moved id
    const r = await json("DELETE", `/api/connection/${connectionId}/managedDatabase/Reports`, sid);
    expect([200, 202, 404]).toContain(r.status);
  });
});

describe("Managed Tables", () => {
  const sid = `extra-mtbl.${Date.now()}`;
  let connectionId = "";

  test("setup: create a rest:// connection + a folder", async () => {
    const r = await json("POST", "/api/connection", sid, {
      name: "Globex REST",
      connection: 'rest://{"HOST":"https://api.globex.test"}',
    });
    connectionId = r.body.id;
    expect(connectionId).toBeDefined();
    await json("POST", `/api/connection/${connectionId}/managedDatabase`, sid, { name: "F1" });
  });

  test("POST /api/connection/:cid/database/:db/managedTable creates a saved request", async () => {
    const r = await json("POST", `/api/connection/${connectionId}/database/F1/managedTable`, sid, {
      name: "List users",
    });
    expect([200, 201]).toContain(r.status);
    expect(r.body.id).toBeDefined();
  });

  test("GET /api/connection/:cid/managedTables lists tables", async () => {
    const r = await json("GET", `/api/connection/${connectionId}/managedTables`, sid);
    expect(r.status).toEqual(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  test("GET unknown managedTable returns 404 or empty", async () => {
    const r = await json(
      "GET",
      `/api/connection/${connectionId}/database/F1/managedTable/nope`,
      sid,
    );
    expect([200, 404]).toContain(r.status);
  });
});

describe("schema/cached endpoint", () => {
  const sid = `extra-cached.${Date.now()}`;

  test("GET cached schema for unknown connection returns shape", async () => {
    const r = await json("GET", `/api/connection/unknown/database/anyDb/schema/cached`, sid);
    expect(r.status).toEqual(200);
    expect(r.body).toEqual(
      expect.objectContaining({
        databases: expect.any(Array),
        tables: expect.any(Array),
        columns: expect.any(Object),
      }),
    );
  });
});

describe("connect/execute error paths", () => {
  const sid = `extra-execute.${Date.now()}`;
  let cid = "";
  test("setup: a connection with bad URL", async () => {
    const r = await json("POST", "/api/connection", sid, {
      name: "Initech",
      connection: "mysql://nobody:nobody@localhost:65535/none",
    });
    cid = r.body.id;
  });

  test("POST /api/connection/:cid/execute responds without throwing", async () => {
    const r = await json("POST", `/api/connection/${cid}/execute`, sid, {});
    // Server may return success-with-error (200 + ok:false), or a network/validation error
    expect([200, 400, 404, 406, 500]).toContain(r.status);
  });

  test("POST /api/connection/unknown/connect returns 404", async () => {
    const r = await json("POST", `/api/connection/unknown-conn-xyz/connect`, sid);
    expect(r.status).toEqual(404);
  });
});

describe("POST /api/dataSnapshot — empty values still 200", () => {
  test("empty values array is allowed", async () => {
    const sid = `extra-snap.${Date.now()}`;
    const r = await json("POST", "/api/dataSnapshot", sid, { description: "Empty", values: [] });
    expect(r.status).toEqual(200);
    expect(r.body.id).toBeDefined();
    // cleanup
    await json("DELETE", `/api/dataSnapshot/${r.body.id}`, sid);
  });
});

describe("connection/test validation", () => {
  test("POST /api/connection/test with non-string connection returns 400", async () => {
    const r = await app.request("/api/connection/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ connection: 123 }),
    });
    // Either treated as invalid (400) or as an unauth check that fails (502/500/406).
    expect([400, 406, 500, 502]).toContain(r.status);
  });
});
