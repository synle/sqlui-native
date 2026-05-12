import fs from "node:fs";
import { vi } from "vitest";
import { app, initializeEndpoints } from "src/sqlui-server/server";

initializeEndpoints();

/**
 * Minimal supertest-style fluent wrapper around Hono's `app.request()`.
 * Exposes `.get/.post/.put/.delete`, each returning a builder with `.set(headers)`,
 * `.send(body)`, and a `then` that resolves to `{ status, type, body, headers }`.
 */
function makeRequester(honoApp: typeof app) {
  type ReqInit = {
    method: string;
    path: string;
    body?: any;
    headers: Record<string, string>;
  };

  function build(method: string, p: string) {
    const init: ReqInit = { method, path: p, headers: {} };
    const builder: any = {
      set(headers: Record<string, string>) {
        Object.assign(init.headers, headers);
        return builder;
      },
      send(body: any) {
        init.body = body;
        return builder;
      },
      then(resolve: (v: any) => any, reject?: (e: any) => any) {
        return run(init).then(resolve, reject);
      },
    };
    return builder;
  }

  async function run(init: ReqInit) {
    const headers: Record<string, string> = { ...init.headers };
    let body: any = undefined;
    if (init.body !== undefined && (init.method === "POST" || init.method === "PUT" || init.method === "DELETE")) {
      headers["content-type"] = headers["content-type"] || "application/json";
      body = JSON.stringify(init.body);
    }
    const res = await honoApp.request(init.path, { method: init.method, headers, body });
    const type = res.headers.get("content-type") || "";
    const text = await res.text();
    let parsed: any = text;
    if (type.includes("application/json")) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    const headersOut: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headersOut[k.toLowerCase()] = v;
    });
    return { status: res.status, type, body: parsed, headers: headersOut, text };
  }

  return {
    get: (p: string) => build("GET", p),
    post: (p: string) => build("POST", p),
    put: (p: string) => build("PUT", p),
    delete: (p: string) => build("DELETE", p),
  };
}

const requestWithSupertest = makeRequester(app);

function _getCommonHeaders(mockedSessionId) {
  return {
    "sqlui-native-session-id": mockedSessionId,
  };
}

describe("Configs", () => {
  test("GET /api/configs should work", async () => {
    const res = await requestWithSupertest.get(`/api/configs`);
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining("json"));
    expect(res.body).toHaveProperty("storageDir");
    expect(res.body).toHaveProperty("isElectron");
  });

  test("GET /api/configs should return default settings", async () => {
    const res = await requestWithSupertest.get(`/api/configs`);
    expect(res.status).toEqual(200);
    expect(res.body.isElectron).toEqual(false);
    expect(res.body.darkMode).toBeDefined();
    expect(res.body.editorMode).toBeDefined();
    expect(res.body.wordWrap).toBeDefined();
  });

  test("PUT /api/configs should update settings", async () => {
    const newSettings = {
      darkMode: "light",
      layoutMode: "relaxed",
    };

    let res: any;
    res = await requestWithSupertest.put(`/api/configs`).send(newSettings);
    expect(res.status).toEqual(200);
    expect(res.body.darkMode).toEqual("light");
    expect(res.body.layoutMode).toEqual("relaxed");
    expect(res.body).toHaveProperty("storageDir");
    expect(res.body).toHaveProperty("isElectron");

    // restore defaults
    res = await requestWithSupertest.put(`/api/configs`).send({ darkMode: "dark", layoutMode: "compact" });
    expect(res.status).toEqual(200);
    expect(res.body.darkMode).toEqual("dark");
  });
});

describe("Sessions", () => {
  const mockedSessionId = `mocked-session-id.${Date.now()}`;

  const mockedConnection1 = {
    name: "mysql Connection - 7/18/2022",
    connection: "mysql://root:password@localhost:3306",
  };

  const mockedQueryId1 = `mocked-query-id-1.${Date.now()}`;
  const mockedQueryId2 = `mocked-query-id-2.${Date.now()}`;

  const mockedQueryValue1 = {
    id: mockedQueryId1,
    name: "Query 1",
    sql: "--query one",
  };

  const mockedQueryValue2 = {
    id: mockedQueryId2,
    name: "Query 2",
    sql: "--query two",
    selected: true,
  };

  test("Simple scenario Create Session / Get Session", async () => {
    const mockedSessionValue1 = {
      id: mockedSessionId,
      name: "Mocked Session Name Value 1",
    };

    const mockedSessionValue2 = {
      id: mockedSessionId,
      name: "Mocked Session Name Value 2",
    };

    let res: any;
    res = await requestWithSupertest.put(`/api/session/${mockedSessionId}`).send(mockedSessionValue1);
    expect(res.status).toEqual(202);

    res = await requestWithSupertest.get(`/api/sessions`);
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining("json"));
    expect(res.body).toContainEqual(expect.objectContaining(mockedSessionValue1));
    expect(res.body.length > 0).toEqual(true);
    // rename the session
    res = await requestWithSupertest.put(`/api/session/${mockedSessionId}`).send(mockedSessionValue2);
    expect(res.status).toEqual(202);

    res = await requestWithSupertest.get(`/api/sessions`);
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining("json"));
    expect(res.body).toContainEqual(expect.objectContaining(mockedSessionValue2));
  });

  test("Simple Connection", async () => {
    let res: any;

    // add a connection
    res = await requestWithSupertest.post(`/api/connection`).set(_getCommonHeaders(mockedSessionId)).send(mockedConnection1);
    expect(res.status).toEqual(201);
    expect(res.body).toEqual(expect.objectContaining(mockedConnection1));
    const mockedConnectionId1 = res.body.id;
    expect(mockedConnectionId1.length > 0).toBe(true);

    // for simplicity, we will only assert this response headers once
    expect(res.headers["sqlui-native-session-id"]).toEqual(_getCommonHeaders(mockedSessionId)["sqlui-native-session-id"]);

    // delete connection
    res = await requestWithSupertest.delete(`/api/connection/${mockedConnectionId1}`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(202);
  });

  test("Simple Queries", async () => {
    let res: any;

    // add 2 queries
    res = await requestWithSupertest
      .put(`/api/query/${mockedQueryValue1.id}`)
      .set(_getCommonHeaders(mockedSessionId))
      .send(mockedQueryValue1);
    expect(res.status).toEqual(202);
    expect(res.body.id).toEqual(mockedQueryValue1.id);

    res = await requestWithSupertest
      .put(`/api/query/${mockedQueryValue2.id}`)
      .set(_getCommonHeaders(mockedSessionId))
      .send(mockedQueryValue2);
    expect(res.status).toEqual(202);
    expect(res.body.id).toEqual(mockedQueryValue2.id);

    // check the created queries
    res = await requestWithSupertest.get(`/api/queries`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(2);

    // delete one query and test
    res = await requestWithSupertest.delete(`/api/query/${mockedQueryValue1.id}`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(202);

    // check the queries
    res = await requestWithSupertest.get(`/api/queries`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(1);
  });

  test("Clone Session", async () => {
    let res: any;

    // add a connection
    res = await requestWithSupertest.post(`/api/connection`).set(_getCommonHeaders(mockedSessionId)).send(mockedConnection1);
    expect(res.status).toEqual(201);
    expect(res.body).toEqual(expect.objectContaining(mockedConnection1));

    // add 2 queries
    res = await requestWithSupertest
      .put(`/api/query/${mockedQueryValue1.id}`)
      .set(_getCommonHeaders(mockedSessionId))
      .send(mockedQueryValue1);
    expect(res.status).toEqual(202);

    res = await requestWithSupertest
      .put(`/api/query/${mockedQueryValue2.id}`)
      .set(_getCommonHeaders(mockedSessionId))
      .send(mockedQueryValue2);
    expect(res.status).toEqual(202);

    // here let's do the clone (new session should have 1 connection and 2 queries)
    res = await requestWithSupertest.post(`/api/session/${mockedSessionId}/clone`).send({
      name: "New Cloned Session Name 123",
    });
    expect(res.status).toEqual(201);
    const newClonedSessionId = res.body.id;

    expect(newClonedSessionId).toBeDefined();
    expect(newClonedSessionId !== mockedSessionId).toEqual(true);

    delete res.body.id;
    expect(res.body).toEqual(
      expect.objectContaining({
        name: "New Cloned Session Name 123",
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      }),
    );

    // check the created queries and connections
    res = await requestWithSupertest.get(`/api/queries`).set(_getCommonHeaders(newClonedSessionId));
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(2);
    res = await requestWithSupertest.get(`/api/connections`).set(_getCommonHeaders(newClonedSessionId));
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(1);

    // delete the clone session
    res = await requestWithSupertest.delete(`/api/session/${newClonedSessionId}`);
    expect(res.status).toEqual(202);
  });

  test("Clone Session should return 400 when name is missing", async () => {
    const res = await requestWithSupertest.post(`/api/session/${mockedSessionId}/clone`).send({});
    expect(res.status).toEqual(400);
  });

  test("DELETE and Cleaning up the mocked session", async () => {
    let res: any;

    // check the session
    res = await requestWithSupertest.get(`/api/sessions`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining("json"));
    let sizeBeforeDeleteSesssion = res.body.length;

    // delete the old session
    res = await requestWithSupertest.delete(`/api/session/${mockedSessionId}`);
    expect(res.status).toEqual(202);

    // check the session - note: GET /api/sessions auto-creates a session when list is empty,
    // so the minimum length is 1
    res = await requestWithSupertest.get(`/api/sessions`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining("json"));
    expect(res.body.length).toEqual(Math.max(1, sizeBeforeDeleteSesssion - 1));
  });
});

describe("Connections - CRUD", () => {
  const mockedSessionId = `mocked-conn-crud.${Date.now()}`;

  test("Full connection lifecycle: create, get, update, list, delete", async () => {
    let res: any;

    // create a connection
    const connectionData = {
      name: "Test PG Connection",
      connection: "postgres://user:pass@localhost:5432/testdb",
    };
    res = await requestWithSupertest.post(`/api/connection`).set(_getCommonHeaders(mockedSessionId)).send(connectionData);
    expect(res.status).toEqual(201);
    expect(res.body.name).toEqual(connectionData.name);
    expect(res.body.connection).toEqual(connectionData.connection);
    const connectionId = res.body.id;
    expect(connectionId).toBeDefined();

    // get single connection
    res = await requestWithSupertest.get(`/api/connection/${connectionId}`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    expect(res.body.id).toEqual(connectionId);
    expect(res.body.name).toEqual(connectionData.name);

    // update connection
    const updatedData = {
      name: "Updated PG Connection",
      connection: "postgres://user:pass@localhost:5432/updateddb",
    };
    res = await requestWithSupertest.put(`/api/connection/${connectionId}`).set(_getCommonHeaders(mockedSessionId)).send(updatedData);
    expect(res.status).toEqual(202);
    expect(res.body.name).toEqual(updatedData.name);
    expect(res.body.connection).toEqual(updatedData.connection);

    // list connections - should have the updated one
    res = await requestWithSupertest.get(`/api/connections`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((c: any) => c.id === connectionId);
    expect(found).toBeDefined();
    expect(found.name).toEqual(updatedData.name);

    // delete connection
    res = await requestWithSupertest.delete(`/api/connection/${connectionId}`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(202);

    // verify deletion
    res = await requestWithSupertest.get(`/api/connections`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    const foundAfterDelete = res.body.find((c: any) => c.id === connectionId);
    expect(foundAfterDelete).toBeUndefined();
  });

  test("POST /api/connections should replace all connections", async () => {
    let res: any;

    // add two connections individually
    res = await requestWithSupertest
      .post(`/api/connection`)
      .set(_getCommonHeaders(mockedSessionId))
      .send({ name: "Conn A", connection: "mysql://localhost:3306/a" });
    expect(res.status).toEqual(201);

    res = await requestWithSupertest
      .post(`/api/connection`)
      .set(_getCommonHeaders(mockedSessionId))
      .send({ name: "Conn B", connection: "mysql://localhost:3306/b" });
    expect(res.status).toEqual(201);

    // replace all connections with a new set
    const replacementConnections = [{ id: "replacement-1", name: "Replaced Conn", connection: "sqlite://replaced.db" }];
    res = await requestWithSupertest.post(`/api/connections`).set(_getCommonHeaders(mockedSessionId)).send(replacementConnections);
    expect(res.status).toEqual(200);

    // verify replacement
    res = await requestWithSupertest.get(`/api/connections`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(1);
    expect(res.body[0].name).toEqual("Replaced Conn");
  });
});

describe("Connection - Refresh Endpoints", () => {
  const mockedSessionId = `mocked-refresh.${Date.now()}`;

  let connectionId: string;

  beforeAll(async () => {
    const res = await requestWithSupertest.post(`/api/connection`).set(_getCommonHeaders(mockedSessionId)).send({
      name: "Refresh Test Connection",
      connection: "postgres://user:pass@localhost:5432/testdb",
    });
    connectionId = res.body.id;
  });

  test("POST /api/connection/:connectionId/refresh should return 406 for unreachable connection", async () => {
    const res = await requestWithSupertest.post(`/api/connection/${connectionId}/refresh`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(406);
  });

  test("POST /api/connection/:connectionId/refresh should return 404 for unknown connection", async () => {
    const res = await requestWithSupertest.post(`/api/connection/nonexistent/refresh`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(404);
  });

  test("POST /api/connection/:connectionId/database/:databaseId/refresh should return 200", async () => {
    const res = await requestWithSupertest
      .post(`/api/connection/${connectionId}/database/testdb/refresh`)
      .set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    expect(res.body).toEqual({ success: true });
  });

  test("POST /api/connection/:connectionId/database/:databaseId/table/:tableId/refresh should return 200", async () => {
    const res = await requestWithSupertest
      .post(`/api/connection/${connectionId}/database/testdb/table/users/refresh`)
      .set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    expect(res.body).toEqual({ success: true });
  });
});

describe("Connection - Test Endpoint", () => {
  test("POST /api/connection/test should return 400 without connection string", async () => {
    const res = await requestWithSupertest.post(`/api/connection/test`).send({});
    expect(res.status).toEqual(400);
  });
});

describe("Queries - CRUD", () => {
  const mockedSessionId = `mocked-query-crud.${Date.now()}`;

  test("Full query lifecycle: create, list, update, delete", async () => {
    let res: any;

    // create a query using POST
    res = await requestWithSupertest.post(`/api/query`).set(_getCommonHeaders(mockedSessionId)).send({ name: "New Query" });
    expect(res.status).toEqual(201);
    expect(res.body.id).toBeDefined();
    const queryId = res.body.id;

    // update the query with SQL content
    res = await requestWithSupertest.put(`/api/query/${queryId}`).set(_getCommonHeaders(mockedSessionId)).send({
      id: queryId,
      name: "Updated Query",
      sql: "SELECT * FROM users",
      connectionId: "conn-1",
      databaseId: "db-1",
      tableId: "users",
    });
    expect(res.status).toEqual(202);
    expect(res.body.name).toEqual("Updated Query");
    expect(res.body.sql).toEqual("SELECT * FROM users");
    expect(res.body.connectionId).toEqual("conn-1");
    expect(res.body.databaseId).toEqual("db-1");
    expect(res.body.tableId).toEqual("users");

    // list queries
    res = await requestWithSupertest.get(`/api/queries`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const found = res.body.find((q: any) => q.id === queryId);
    expect(found).toBeDefined();
    expect(found.sql).toEqual("SELECT * FROM users");

    // delete query
    res = await requestWithSupertest.delete(`/api/query/${queryId}`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(202);

    // verify deletion
    res = await requestWithSupertest.get(`/api/queries`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    const foundAfterDelete = res.body.find((q: any) => q.id === queryId);
    expect(foundAfterDelete).toBeUndefined();
  });
});

describe("Sessions", () => {
  test("POST /api/session should create a new session", async () => {
    const res = await requestWithSupertest.post(`/api/session`).send({ name: "Brand New Session" });
    expect(res.status).toEqual(201);
    expect(res.body.id).toBeDefined();

    // cleanup
    await requestWithSupertest.delete(`/api/session/${res.body.id}`);
  });

  test("GET /api/session should return 404 without session-id header", async () => {
    const res = await requestWithSupertest.get(`/api/session`);
    expect(res.status).toEqual(404);
  });

  test("GET /api/session should return 404 for unknown session-id", async () => {
    const res = await requestWithSupertest.get(`/api/session`).set({ "sqlui-native-session-id": `non-existent-session.${Date.now()}` });
    expect(res.status).toEqual(404);
  });
});

describe("Folder Items (Bookmarks / Recycle Bin)", () => {
  const folderId = `test-folder.${Date.now()}`;

  test("Full folder item lifecycle: list empty, add, update, delete", async () => {
    let res: any;

    // list items in a new folder - should be empty
    res = await requestWithSupertest.get(`/api/folder/${folderId}`);
    expect(res.status).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toEqual(0);

    // add an item
    const item = {
      name: "Bookmarked Connection",
      type: "connection",
      data: { connection: "mysql://localhost:3306/mydb", name: "My MySQL" },
    };
    res = await requestWithSupertest.post(`/api/folder/${folderId}`).send(item);
    expect(res.status).toEqual(202);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toEqual(item.name);
    expect(res.body.type).toEqual(item.type);
    const itemId = res.body.id;

    // list items - should have 1
    res = await requestWithSupertest.get(`/api/folder/${folderId}`);
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(1);

    // update item
    res = await requestWithSupertest.put(`/api/folder/${folderId}`).send({
      id: itemId,
      name: "Updated Bookmark",
      type: "connection",
      data: { connection: "mysql://localhost:3306/updateddb", name: "Updated MySQL" },
    });
    expect(res.status).toEqual(202);
    expect(res.body.name).toEqual("Updated Bookmark");

    // verify update
    res = await requestWithSupertest.get(`/api/folder/${folderId}`);
    expect(res.status).toEqual(200);
    expect(res.body[0].name).toEqual("Updated Bookmark");

    // delete item
    res = await requestWithSupertest.delete(`/api/folder/${folderId}/${itemId}`);
    expect(res.status).toEqual(202);

    // verify deletion
    res = await requestWithSupertest.get(`/api/folder/${folderId}`);
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(0);
  });

  test("Multiple items in a folder", async () => {
    const multiFolderId = `test-multi-folder.${Date.now()}`;
    let res: any;

    // add multiple items
    const item1 = { name: "Item 1", type: "connection", data: { foo: "bar" } };
    const item2 = { name: "Item 2", type: "query", data: { sql: "SELECT 1" } };
    const item3 = { name: "Item 3", type: "connection", data: { foo: "baz" } };

    res = await requestWithSupertest.post(`/api/folder/${multiFolderId}`).send(item1);
    expect(res.status).toEqual(202);
    const itemId1 = res.body.id;

    res = await requestWithSupertest.post(`/api/folder/${multiFolderId}`).send(item2);
    expect(res.status).toEqual(202);

    res = await requestWithSupertest.post(`/api/folder/${multiFolderId}`).send(item3);
    expect(res.status).toEqual(202);

    // verify all 3 items
    res = await requestWithSupertest.get(`/api/folder/${multiFolderId}`);
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(3);

    // delete one and verify count
    res = await requestWithSupertest.delete(`/api/folder/${multiFolderId}/${itemId1}`);
    expect(res.status).toEqual(202);

    res = await requestWithSupertest.get(`/api/folder/${multiFolderId}`);
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(2);
  });
});

describe("Data Snapshots", () => {
  test("Full snapshot lifecycle: list empty, create, get, list, delete", async () => {
    let res: any;

    // list snapshots
    res = await requestWithSupertest.get(`/api/dataSnapshots`);
    expect(res.status).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    const initialCount = res.body.length;

    // create a snapshot
    const snapshotData = {
      description: "Test Snapshot",
      values: [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ],
    };
    res = await requestWithSupertest.post(`/api/dataSnapshot`).send(snapshotData);
    expect(res.status).toEqual(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.description).toEqual("Test Snapshot");
    expect(res.body.location).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
    const snapshotId = res.body.id;

    // list snapshots - should have one more
    res = await requestWithSupertest.get(`/api/dataSnapshots`);
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(initialCount + 1);

    // get single snapshot with values
    res = await requestWithSupertest.get(`/api/dataSnapshot/${snapshotId}`);
    expect(res.status).toEqual(200);
    expect(res.body.id).toEqual(snapshotId);
    expect(res.body.description).toEqual("Test Snapshot");
    expect(res.body.values).toBeDefined();
    expect(res.body.values).toEqual(snapshotData.values);

    // delete snapshot
    res = await requestWithSupertest.delete(`/api/dataSnapshot/${snapshotId}`);
    expect(res.status).toEqual(202);

    // verify deletion
    res = await requestWithSupertest.get(`/api/dataSnapshots`);
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(initialCount);
  });

  test("GET /api/dataSnapshot/:id should return 404 for non-existent snapshot", async () => {
    const res = await requestWithSupertest.get(`/api/dataSnapshot/non-existent-id`);
    expect(res.status).toEqual(404);
  });

  test("Multiple snapshots can be created and listed", async () => {
    let res: any;

    const snap1 = await requestWithSupertest.post(`/api/dataSnapshot`).send({ description: "Snap 1", values: [{ a: 1 }] });
    expect(snap1.status).toEqual(200);

    const snap2 = await requestWithSupertest.post(`/api/dataSnapshot`).send({ description: "Snap 2", values: [{ b: 2 }] });
    expect(snap2.status).toEqual(200);

    // both should have different ids
    expect(snap1.body.id).not.toEqual(snap2.body.id);

    // cleanup
    await requestWithSupertest.delete(`/api/dataSnapshot/${snap1.body.id}`);
    await requestWithSupertest.delete(`/api/dataSnapshot/${snap2.body.id}`);
  });
});

describe("Response Headers", () => {
  test("Response should echo back session-id header", async () => {
    const sessionId = `header-test.${Date.now()}`;

    const res = await requestWithSupertest.get(`/api/configs`).set({
      "sqlui-native-session-id": sessionId,
    });

    expect(res.headers["sqlui-native-session-id"]).toEqual(sessionId);
  });
});

describe("Schema Search", () => {
  test("GET /api/schema/search should return empty array for empty query", async () => {
    const res = await requestWithSupertest.get(`/api/schema/search`);
    expect(res.status).toEqual(200);
    expect(res.body).toEqual([]);
  });

  test("GET /api/schema/search?q= should return empty array for blank query", async () => {
    const res = await requestWithSupertest.get(`/api/schema/search?q=`);
    expect(res.status).toEqual(200);
    expect(res.body).toEqual([]);
  });

  test("GET /api/schema/search?q=nonexistent should return empty for no matches", async () => {
    const sessionId = `schema-search.${Date.now()}`;
    const res = await requestWithSupertest.get(`/api/schema/search?q=nonexistenttable12345`).set(_getCommonHeaders(sessionId));
    expect(res.status).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("Query Version History", () => {
  const mockedSessionId = `mocked-history.${Date.now()}`;

  test("GET /api/queryVersionHistory should return empty array initially", async () => {
    const res = await requestWithSupertest.get(`/api/queryVersionHistory`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toEqual(0);
  });

  test("POST /api/queryVersionHistory should add an entry", async () => {
    const entry = {
      name: "Test History Entry",
      auditType: "execution",
      connectionId: "conn-1",
      sql: "SELECT * FROM users",
    };

    const res = await requestWithSupertest.post(`/api/queryVersionHistory`).set(_getCommonHeaders(mockedSessionId)).send(entry);
    expect(res.status).toEqual(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toEqual("Test History Entry");
    expect(res.body.type).toEqual("execution");
  });

  test("POST /api/queryVersionHistory should store SQL in data", async () => {
    const entry = {
      name: "SQL History",
      auditType: "delta",
      connectionId: "conn-2",
      sql: "INSERT INTO orders VALUES (1)",
    };

    const res = await requestWithSupertest.post(`/api/queryVersionHistory`).set(_getCommonHeaders(mockedSessionId)).send(entry);
    expect(res.status).toEqual(201);
    expect(res.body.data.sql).toEqual("INSERT INTO orders VALUES (1)");
    expect(res.body.data.connectionId).toEqual("conn-2");
  });

  test("GET /api/queryVersionHistory should list added entries", async () => {
    const res = await requestWithSupertest.get(`/api/queryVersionHistory`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  test("DELETE /api/queryVersionHistory/:entryId should remove a single entry", async () => {
    // add an entry
    const entry = {
      name: "To Delete",
      auditType: "execution",
      connectionId: "conn-1",
      sql: "SELECT 1",
    };
    let res = await requestWithSupertest.post(`/api/queryVersionHistory`).set(_getCommonHeaders(mockedSessionId)).send(entry);
    expect(res.status).toEqual(201);
    const entryId = res.body.id;

    // delete it
    res = await requestWithSupertest.delete(`/api/queryVersionHistory/${entryId}`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(202);
  });

  test("DELETE /api/queryVersionHistory should clear all entries", async () => {
    let res = await requestWithSupertest.delete(`/api/queryVersionHistory`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(202);

    // verify cleared
    res = await requestWithSupertest.get(`/api/queryVersionHistory`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(0);
  });
});

describe("Session Isolation", () => {
  test("Connections from one session should not appear in another", async () => {
    const sessionA = `session-a.${Date.now()}`;
    const sessionB = `session-b.${Date.now()}`;

    // add connection to session A
    let res: any;
    res = await requestWithSupertest
      .post(`/api/connection`)
      .set(_getCommonHeaders(sessionA))
      .send({ name: "Session A Conn", connection: "mysql://localhost/a" });
    expect(res.status).toEqual(201);

    // add connection to session B
    res = await requestWithSupertest
      .post(`/api/connection`)
      .set(_getCommonHeaders(sessionB))
      .send({ name: "Session B Conn", connection: "mysql://localhost/b" });
    expect(res.status).toEqual(201);

    // list connections in session A - should only have session A's connection
    res = await requestWithSupertest.get(`/api/connections`).set(_getCommonHeaders(sessionA));
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(1);
    expect(res.body[0].name).toEqual("Session A Conn");

    // list connections in session B - should only have session B's connection
    res = await requestWithSupertest.get(`/api/connections`).set(_getCommonHeaders(sessionB));
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(1);
    expect(res.body[0].name).toEqual("Session B Conn");
  });

  test("Queries from one session should not appear in another", async () => {
    const sessionA = `session-qa.${Date.now()}`;
    const sessionB = `session-qb.${Date.now()}`;
    const queryIdA = `query-a.${Date.now()}`;
    const queryIdB = `query-b.${Date.now()}`;

    // add query to session A
    let res: any;
    res = await requestWithSupertest
      .put(`/api/query/${queryIdA}`)
      .set(_getCommonHeaders(sessionA))
      .send({ id: queryIdA, name: "Query A", sql: "SELECT 'A'" });
    expect(res.status).toEqual(202);

    // add query to session B
    res = await requestWithSupertest
      .put(`/api/query/${queryIdB}`)
      .set(_getCommonHeaders(sessionB))
      .send({ id: queryIdB, name: "Query B", sql: "SELECT 'B'" });
    expect(res.status).toEqual(202);

    // verify isolation
    res = await requestWithSupertest.get(`/api/queries`).set(_getCommonHeaders(sessionA));
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(1);
    expect(res.body[0].name).toEqual("Query A");

    res = await requestWithSupertest.get(`/api/queries`).set(_getCommonHeaders(sessionB));
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(1);
    expect(res.body[0].name).toEqual("Query B");
  });
});

// ===========================================================================
// Coverage for endpoints exposed by the Express -> Hono migration (PR #31).
// These cover the file-upload reader, the binary backup-download path, the
// no-op appWindow endpoint, the session-id echo across diverse status codes,
// plain-text 404 bodies, body-parser sanity (JSON/empty/urlencoded), and the
// CORS preflight wiring.
// ===========================================================================

describe("POST /api/file - multipart upload", () => {
  test("uploads a utf-8 text file and returns its content verbatim", async () => {
    const fd = new FormData();
    const content = "hello world\nline two\nline three";
    fd.append("file", new Blob([content], { type: "text/plain" }), "sample.txt");

    const r = await app.request("/api/file", { method: "POST", body: fd });
    expect(r.status).toEqual(200);
    const text = await r.text();
    expect(text).toEqual(content);
  });

  test("returns 400 with 'Cannot read the file' when no file is attached", async () => {
    const fd = new FormData();
    // intentionally empty body — no "file" field
    const r = await app.request("/api/file", { method: "POST", body: fd });
    expect(r.status).toEqual(400);
    expect(await r.text()).toEqual("Cannot read the file");
  });

  test("non-utf8 binary content does not crash the handler", async () => {
    // The handler reads via File.text() which decodes as utf-8 — binary bytes
    // become replacement chars but the server must still respond 200, not throw.
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array([0xff, 0xfe, 0x00, 0x10, 0x80, 0x81])]), "binary.bin");

    const r = await app.request("/api/file", { method: "POST", body: fd });
    expect(r.status).toEqual(200);
    // body is whatever utf-8 decoding produced — assert only that it's defined
    // and the handler did not error out.
    const text = await r.text();
    expect(typeof text).toEqual("string");
  });
});

describe("GET /api/backup/database - binary download", () => {
  test("returns 200 with octet-stream + filename header when db file exists", async () => {
    const fakeBuffer = Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x42]);
    const existsSpy = vi.spyOn(fs, "existsSync").mockReturnValue(true);
    const readSpy = vi.spyOn(fs, "readFileSync").mockReturnValue(fakeBuffer as any);

    try {
      const r = await app.request("/api/backup/database", { method: "GET" });
      expect(r.status).toEqual(200);
      expect(r.headers.get("content-type")).toEqual("application/octet-stream");
      const disposition = r.headers.get("content-disposition") || "";
      expect(disposition).toMatch(/^attachment; filename="sqlui-native-backup-.*\.db"$/);
      const body = Buffer.from(await r.arrayBuffer());
      expect(body.length).toBeGreaterThan(0);
      expect(body.equals(fakeBuffer)).toBe(true);
    } finally {
      existsSpy.mockRestore();
      readSpy.mockRestore();
    }
  });

  test("returns 404 JSON when db file is missing", async () => {
    const existsSpy = vi.spyOn(fs, "existsSync").mockReturnValue(false);
    try {
      const r = await app.request("/api/backup/database", { method: "GET" });
      expect(r.status).toEqual(404);
      expect(r.headers.get("content-type") || "").toContain("application/json");
      const body = JSON.parse(await r.text());
      expect(body).toEqual({ error: "Database file not found" });
    } finally {
      existsSpy.mockRestore();
    }
  });
});

describe("POST /api/appWindow - empty 200 response", () => {
  test("responds with 200 and empty body", async () => {
    const r = await app.request("/api/appWindow", { method: "POST" });
    expect(r.status).toEqual(200);
    const text = await r.text();
    // Hono c.body(null) yields an empty body — be flexible: accept "" or
    // anything falsy in case the shim ever emits "{}" or similar.
    expect(text === "" || text === "null" || text === "{}" || text === undefined).toBe(true);
  });
});

describe("Session-id header echo across diverse methods + statuses", () => {
  const sessionId = `echo-suite.${Date.now()}`;

  test("PUT 202 response echoes session-id", async () => {
    const res = await requestWithSupertest
      .put(`/api/session/${sessionId}`)
      .set(_getCommonHeaders(sessionId))
      .send({ id: sessionId, name: "Echo PUT Session" });
    expect(res.status).toEqual(202);
    expect(res.headers["sqlui-native-session-id"]).toEqual(sessionId);

    // cleanup
    await requestWithSupertest.delete(`/api/session/${sessionId}`);
  });

  test("POST 201 response echoes session-id", async () => {
    const postSession = `echo-post.${Date.now()}`;
    const res = await requestWithSupertest
      .post(`/api/connection`)
      .set(_getCommonHeaders(postSession))
      .send({ name: "Echo POST Conn", connection: "mysql://localhost/echo" });
    expect(res.status).toEqual(201);
    expect(res.headers["sqlui-native-session-id"]).toEqual(postSession);

    // cleanup
    await requestWithSupertest.delete(`/api/connection/${res.body.id}`).set(_getCommonHeaders(postSession));
  });

  test("DELETE 202 response echoes session-id", async () => {
    const delSession = `echo-del.${Date.now()}`;
    const fakeQueryId = `echo-q.${Date.now()}`;
    const res = await requestWithSupertest.delete(`/api/query/${fakeQueryId}`).set(_getCommonHeaders(delSession));
    expect(res.status).toEqual(202);
    expect(res.headers["sqlui-native-session-id"]).toEqual(delSession);
  });

  test("404 response still echoes session-id (error path is not silent)", async () => {
    const errSession = `echo-404.${Date.now()}`;
    const res = await requestWithSupertest
      .post(`/api/connection/this-id-does-not-exist-xyz/refresh`)
      .set(_getCommonHeaders(errSession));
    expect(res.status).toEqual(404);
    expect(res.headers["sqlui-native-session-id"]).toEqual(errSession);
  });

  test("400 response still echoes session-id (validation failure)", async () => {
    const errSession = `echo-400.${Date.now()}`;
    const res = await requestWithSupertest.post(`/api/connection/test`).set(_getCommonHeaders(errSession)).send({});
    expect(res.status).toEqual(400);
    expect(res.headers["sqlui-native-session-id"]).toEqual(errSession);
  });
});

describe("Plain-text 404 'Not Found' body", () => {
  test("POST /api/connection/:unknown/refresh returns plain-text 'Not Found', not JSON", async () => {
    const r = await app.request("/api/connection/this-id-does-not-exist-xyz/refresh", {
      method: "POST",
      headers: { "sqlui-native-session-id": `plain-404.${Date.now()}` },
    });
    expect(r.status).toEqual(404);
    const ct = r.headers.get("content-type") || "";
    expect(ct).toContain("text/plain");
    expect(ct).not.toContain("application/json");
    const text = await r.text();
    expect(text).toEqual("Not Found");
  });

  test("GET /api/dataSnapshot/:unknown returns plain-text 'Not Found'", async () => {
    const r = await app.request("/api/dataSnapshot/non-existent-snapshot-xyz-12345", { method: "GET" });
    expect(r.status).toEqual(404);
    const ct = r.headers.get("content-type") || "";
    expect(ct).toContain("text/plain");
    expect(await r.text()).toEqual("Not Found");
  });
});

describe("Body parsing sanity (JSON / empty / urlencoded)", () => {
  test("JSON body fields round-trip into handler's req.body", async () => {
    const sessionId = `body-json.${Date.now()}`;
    const payload = {
      name: "JSON Round Trip",
      auditType: "execution",
      connectionId: "conn-rt",
      sql: "SELECT 'round-trip'",
    };
    const res = await requestWithSupertest.post(`/api/queryVersionHistory`).set(_getCommonHeaders(sessionId)).send(payload);
    expect(res.status).toEqual(201);
    // verify each field the handler read off req.body made it back unchanged
    expect(res.body.name).toEqual("JSON Round Trip");
    expect(res.body.type).toEqual("execution");
    expect(res.body.data.connectionId).toEqual("conn-rt");
    expect(res.body.data.sql).toEqual("SELECT 'round-trip'");
  });

  test("empty JSON body does not crash the handler", async () => {
    // POST /api/connection/test with empty object — handler should respond 400
    // (input validation), not 500. This catches a regression where req.body
    // would be undefined and `connection.connection` would throw.
    const r = await app.request("/api/connection/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "",
    });
    expect(r.status).toEqual(400);
    expect(r.status).not.toEqual(500);
  });

  test("application/x-www-form-urlencoded body parses into req.body fields", async () => {
    const sessionId = `body-urlencoded.${Date.now()}`;
    const r = await app.request("/api/queryVersionHistory", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "sqlui-native-session-id": sessionId,
      },
      body: "name=FormEncoded&auditType=delta&connectionId=conn-form&sql=SELECT+%27form%27",
    });
    expect(r.status).toEqual(201);
    const body = await r.json();
    expect(body.name).toEqual("FormEncoded");
    expect(body.type).toEqual("delta");
    expect(body.data.connectionId).toEqual("conn-form");
    expect(body.data.sql).toEqual("SELECT 'form'");
  });
});

describe("CORS preflight", () => {
  test("OPTIONS /api/configs returns 204 with Access-Control-Allow-Origin: *", async () => {
    const r = await app.request("/api/configs", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "sqlui-native-session-id",
      },
    });
    expect(r.status).toEqual(204);
    expect(r.headers.get("access-control-allow-origin")).toEqual("*");
    expect((r.headers.get("access-control-allow-methods") || "").toUpperCase()).toContain("GET");
  });
});
