import supertest from "supertest";
import { app } from "src/mocked-server/mocked-server";

const requestWithSupertest = supertest(app);

function _getCommonHeaders(mockedSessionId) {
  return {
    "sqlui-native-session-id": mockedSessionId,
    "sqlui-native-window-id": "mocked-window-id",
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
    expect(res.body).toContainEqual(mockedSessionValue1);
    expect(res.body.length > 0).toEqual(true);
    // rename the session
    res = await requestWithSupertest.put(`/api/session/${mockedSessionId}`).send(mockedSessionValue2);
    expect(res.status).toEqual(202);

    res = await requestWithSupertest.get(`/api/sessions`);
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining("json"));
    expect(res.body).toContainEqual(mockedSessionValue2);
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
    expect(res.headers["sqlui-native-window-id"]).toEqual(_getCommonHeaders(mockedSessionId)["sqlui-native-window-id"]);

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
    expect(res.body).toMatchInlineSnapshot(`
      {
        "name": "New Cloned Session Name 123",
      }
    `);

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

    // check the session
    res = await requestWithSupertest.get(`/api/sessions`).set(_getCommonHeaders(mockedSessionId));
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining("json"));
    expect(res.body.length).toEqual(sizeBeforeDeleteSesssion - 1);
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

describe("Sessions - Open/Close and Window Mapping", () => {
  test("GET /api/sessions/opened should return list of opened session ids", async () => {
    const res = await requestWithSupertest.get(`/api/sessions/opened`);
    expect(res.status).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("POST /api/sessions/opened/:sessionId should open a new session", async () => {
    const newSessionId = `test-open-session.${Date.now()}`;
    const windowId = `test-window.${Date.now()}`;

    const res = await requestWithSupertest
      .post(`/api/sessions/opened/${newSessionId}`)
      .set({ "sqlui-native-session-id": newSessionId, "sqlui-native-window-id": windowId });
    expect(res.status).toEqual(201);
    expect(res.body.outcome).toEqual("create_new_session");
  });

  test("POST /api/sessions/opened/:sessionId should detect existing session", async () => {
    const sessionId = `test-existing-session.${Date.now()}`;
    const windowId1 = `test-window-1.${Date.now()}`;
    const windowId2 = `test-window-2.${Date.now()}`;

    // open session first time
    let res: any;
    res = await requestWithSupertest
      .post(`/api/sessions/opened/${sessionId}`)
      .set({ "sqlui-native-session-id": sessionId, "sqlui-native-window-id": windowId1 });
    expect(res.status).toEqual(201);
    expect(res.body.outcome).toEqual("create_new_session");

    // open same session from different window - should indicate focus
    res = await requestWithSupertest
      .post(`/api/sessions/opened/${sessionId}`)
      .set({ "sqlui-native-session-id": sessionId, "sqlui-native-window-id": windowId2 });
    expect(res.status).toEqual(202);
    expect(res.body.outcome).toEqual("focus_on_old_session_id");
  });

  test("POST /api/session should create a new session", async () => {
    const res = await requestWithSupertest.post(`/api/session`).send({ name: "Brand New Session" });
    expect(res.status).toEqual(201);
    expect(res.body.id).toBeDefined();

    // cleanup
    await requestWithSupertest.delete(`/api/session/${res.body.id}`);
  });

  test("GET /api/session should return 404 without window-id header", async () => {
    const res = await requestWithSupertest.get(`/api/session`);
    expect(res.status).toEqual(404);
  });

  test("GET /api/session should return 404 for unknown window-id", async () => {
    const res = await requestWithSupertest.get(`/api/session`).set({ "sqlui-native-window-id": `non-existent-window.${Date.now()}` });
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
    expect(res.body.created).toBeDefined();
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
  test("Response should echo back session-id and window-id headers", async () => {
    const sessionId = `header-test.${Date.now()}`;
    const windowId = `window-header-test.${Date.now()}`;

    const res = await requestWithSupertest.get(`/api/configs`).set({
      "sqlui-native-session-id": sessionId,
      "sqlui-native-window-id": windowId,
    });

    expect(res.headers["sqlui-native-session-id"]).toEqual(sessionId);
    expect(res.headers["sqlui-native-window-id"]).toEqual(windowId);
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
