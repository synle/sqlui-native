import { Express } from "express";
import path from "node:path";
import {
  clearCachedColumns,
  clearCachedDatabase,
  clearCachedTable,
  getColumns,
  getConnectionMetaData,
  getDataAdapter,
  getDatabases,
  getTables,
  getCachedSchema,
  listAllCachedColumns,
} from "src/common/adapters/DataAdapterFactory";
import fs from "node:fs";
import {
  getConnectionsStorage,
  getDataSnapshotStorage,
  getDbFilePath,
  getFolderItemsStorage,
  getManagedDatabasesStorage,
  getManagedTablesStorage,
  getQueryStorage,
  getSessionsStorage,
  getSettingsStorage,
  storageDir,
} from "src/common/PersistentStorage";
import { writeDebugLog } from "src/common/utils/debugLogger";
import { backfillTimestamps, formatErrorMessage, safeDisconnect } from "src/common/utils/errorUtils";
import { SqluiCore, SqluiEnums } from "typings";
let expressAppContext: Express | undefined;

/** Storage key for the application settings entry. */
const SETTINGS_ID = "app-settings";

/** Default application settings applied when no saved settings exist. */
const DEFAULT_SETTINGS = {
  darkMode: "dark",
  animationMode: "on",
  layoutMode: "compact",
  querySelectionMode: "new-tab",
  editorMode: "advanced",
  tableRenderer: "advanced",
  wordWrap: "wrap",
  queryTabOrientation: "horizontal",
  querySize: "1000",
  deleteMode: "soft-delete",
};

/** Maximum age (ms) before an _apiCache session entry is evicted. */
const API_CACHE_TTL_MS = 30 * 60 * 1000;

/** In-memory per-session cache shared across API endpoint handlers. */
const _apiCache: Record<string, { data: Record<string, any>; lastAccessed: number }> = {};

/**
 * Evicts stale _apiCache entries older than API_CACHE_TTL_MS.
 * Runs periodically to prevent unbounded memory growth.
 */
function evictStaleApiCacheEntries() {
  const now = Date.now();
  for (const key of Object.keys(_apiCache)) {
    if (now - _apiCache[key].lastAccessed > API_CACHE_TTL_MS) {
      delete _apiCache[key];
    }
  }
}

/** Run cache eviction every 10 minutes. */
setInterval(evictStaleApiCacheEntries, 10 * 60 * 1000);

/**
 * Registers a single API endpoint on the Express app.
 * Wraps the handler with error handling and session ID header forwarding.
 * @param method - HTTP method ("get", "post", "put", "delete").
 * @param url - URL pattern (Express-style) for the endpoint.
 * @param incomingHandler - Async handler receiving (req, res, cache).
 */
function addDataEndpoint(
  method: "get" | "post" | "put" | "delete",
  url: string,
  incomingHandler: (req: any, res: any, cache: any) => void,
) {
  const handlerToUse = async (req: any, res: any, cache: any) => {
    try {
      res.header("sqlui-native-session-id", req.headers["sqlui-native-session-id"]);
      await incomingHandler(req, res, cache);
    } catch (err: any) {
      console.error(`Endpoints.ts:addDataEndpoint [${method.toUpperCase()} ${url}] error`, err);
      writeDebugLog(`Endpoints.ts:error [${method.toUpperCase()} ${url}] - ${err?.message || err}\n${err?.stack || ""}`);
      const message = formatErrorMessage(err);
      try {
        res.status(500).json({ error: message });
      } catch (resErr) {
        console.error(`Endpoints.ts:addDataEndpoint [${method.toUpperCase()} ${url}] resError`, resErr);
        writeDebugLog(`Endpoints.ts:resError [${method.toUpperCase()} ${url}] - ${(resErr as any)?.message || resErr}`);
      }
    }
  };

  expressAppContext![method](url, async (req, res) => {
    const cacheKey = req.headers["sqlui-native-session-id"];
    const apiCache = {
      get(key: SqluiEnums.ServerApiCacheKey) {
        try {
          const entry = _apiCache[cacheKey];
          if (entry) {
            entry.lastAccessed = Date.now();
            return entry.data[key];
          }
          return undefined;
        } catch (err: any) {
          console.error("Endpoints.ts:get", err);
          return undefined;
        }
      },
      set(key: SqluiEnums.ServerApiCacheKey, value: any) {
        try {
          if (!_apiCache[cacheKey]) {
            _apiCache[cacheKey] = { data: {}, lastAccessed: Date.now() };
          }
          _apiCache[cacheKey].data[key] = value;
          _apiCache[cacheKey].lastAccessed = Date.now();
        } catch (err: any) {
          console.error("Endpoints.ts:set", err);
        }
      },
      json() {
        return JSON.stringify(_apiCache);
      },
    };

    await handlerToUse(req, res, apiCache);
  });
}

/**
 * Registers all API endpoint handlers for connections, queries, sessions, folders, and data snapshots.
 * All endpoints are registered as Express HTTP routes.
 * @param anExpressAppContext - The Express app to register routes on.
 */
export function setUpDataEndpoints(anExpressAppContext: Express) {
  expressAppContext = anExpressAppContext;
  writeDebugLog(`Endpoints.ts:setUpDataEndpoints - storageDir=${storageDir}`);
  // storageDir
  //=========================================================================
  // config api endpoints
  //=========================================================================
  addDataEndpoint("get", "/api/configs", async (req, res) => {
    const settingsStorage = await getSettingsStorage();
    let settings = settingsStorage.get(SETTINGS_ID);

    if (!settings) {
      // no settings saved yet, seed with defaults
      settings = settingsStorage.add({ id: SETTINGS_ID, ...DEFAULT_SETTINGS });
    }

    const { id, ...settingsData } = settings;

    res.status(200).json({
      storageDir,
      isElectron: !expressAppContext,
      ...settingsData,
    });
  });

  addDataEndpoint("put", "/api/configs", async (req, res) => {
    const settingsStorage = await getSettingsStorage();
    const existing = settingsStorage.get(SETTINGS_ID);

    const updated = settingsStorage[existing ? "update" : "add"]({
      id: SETTINGS_ID,
      ...req.body,
    });

    const { id, ...settingsData } = updated;

    res.status(200).json({
      storageDir,
      isElectron: !expressAppContext,
      ...settingsData,
    });
  });

  //=========================================================================
  // backup api endpoints
  //=========================================================================
  addDataEndpoint("get", "/api/backup/database", async (_req, res) => {
    const dbPath = getDbFilePath();
    if (!fs.existsSync(dbPath)) {
      res.status(404).json({ error: "Database file not found" });
      return;
    }
    const fileName = `sqlui-native-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    const fileBuffer = fs.readFileSync(dbPath);
    res.status(200).send(fileBuffer);
  });

  //=========================================================================
  // connection api endpoints
  //=========================================================================
  addDataEndpoint("get", "/api/connections", async (req, res) => {
    const connectionsStorage = await getConnectionsStorage(req.headers["sqlui-native-session-id"]);

    const connections = await connectionsStorage.list();

    // backfill legacy connections missing timestamps (batch write)
    if (backfillTimestamps(connections, "connection")) {
      connectionsStorage.set(connections);
    }

    // Return connections immediately without blocking on auth checks.
    // Each connection starts with status undefined — the frontend
    // triggers individual /api/connection/:id/connect calls to check status.
    res.status(200).json(connections);
  });

  addDataEndpoint("post", "/api/connections", async (req, res) => {
    const connectionsStorage = await getConnectionsStorage(req.headers["sqlui-native-session-id"]);

    const connections = await connectionsStorage.set(req.body);

    res.status(200).json(connections);
  });

  addDataEndpoint("get", "/api/connection/:connectionId", async (req, res) => {
    const connectionsStorage = await getConnectionsStorage(req.headers["sqlui-native-session-id"]);

    const connection = await connectionsStorage.get(req.params?.connectionId);

    if (!connection) {
      res.status(404).json({ error: "Connection not found" });
      return;
    }

    const engine = getDataAdapter(connection.connection);
    try {
      await engine.authenticate();

      connection.status = "online";
      connection.dialect = engine.dialect;
    } catch (err: any) {
      console.error("Endpoints.ts:authenticate", err);
    } finally {
      await safeDisconnect(engine);
    }

    res.status(200).json(connection);
  });

  addDataEndpoint("get", "/api/connection/:connectionId/databases", async (req, res) => {
    try {
      res.status(200).json(await getDatabases(req.headers["sqlui-native-session-id"], req.params?.connectionId));
    } catch (err: any) {
      const message = formatErrorMessage(err, "Connection failed");
      console.error("Endpoints.ts:getDatabases", err);
      res.status(500).json({ error: message });
    }
  });

  addDataEndpoint("get", "/api/connection/:connectionId/database/:databaseId", async (req, res) => {
    try {
      const databases = await getDatabases(req.headers["sqlui-native-session-id"], req.params?.connectionId);
      const database = databases.find((db) => db.name === req.params?.databaseId);

      if (!database) {
        return res.status(404).send("Not Found");
      }

      res.status(200).json(database);
    } catch (err: any) {
      const message = formatErrorMessage(err, "Connection failed");
      console.error("Endpoints.ts:getDatabase", err);
      res.status(500).json({ error: message });
    }
  });

  addDataEndpoint("get", "/api/connection/:connectionId/database/:databaseId/tables", async (req, res) => {
    try {
      res.status(200).json(await getTables(req.headers["sqlui-native-session-id"], req.params?.connectionId, req.params?.databaseId));
    } catch (err: any) {
      const message = formatErrorMessage(err, "Connection failed");
      console.error("Endpoints.ts:getTables", err);
      res.status(500).json({ error: message });
    }
  });

  addDataEndpoint("get", "/api/connection/:connectionId/database/:databaseId/table/:tableId/columns", async (req, res) => {
    try {
      res
        .status(200)
        .json(
          await getColumns(req.headers["sqlui-native-session-id"], req.params?.connectionId, req.params?.databaseId, req.params?.tableId),
        );
    } catch (err: any) {
      const message = formatErrorMessage(err, "Connection failed");
      console.error("Endpoints.ts:getColumns", err);
      res.status(500).json({ error: message });
    }
  });

  addDataEndpoint("get", "/api/connection/:connectionId/database/:databaseId/schema/cached", async (req, res) => {
    try {
      const result = getCachedSchema(req.params?.connectionId, req.params?.databaseId);
      res.status(200).json(result);
    } catch (err: any) {
      const message = formatErrorMessage(err, "Connection failed");
      console.error(`Endpoints.ts:handler [GET /api/.../schema/cached]`, err);
      res.status(500).json({ error: message });
    }
  });

  addDataEndpoint("post", "/api/connection/:connectionId/refresh", async (req, res) => {
    const connectionsStorage = await getConnectionsStorage(req.headers["sqlui-native-session-id"]);

    const connection = await connectionsStorage.get(req.params?.connectionId);

    if (!connection) {
      return res.status(404).send("Not Found");
    }

    // Clear backend cache for this connection before reconnecting
    if (connection.id) {
      clearCachedColumns(connection.id);
    }

    const engine = getDataAdapter(connection.connection);
    try {
      await engine.authenticate();
      res.status(200).json(await getConnectionMetaData(connection));
    } catch (err: any) {
      res.status(406).json(`Failed to connect ${err.toString()}`);
      console.error("Endpoints.ts:handler [POST /api/connection/:connectionId/refresh]", err);
    } finally {
      await safeDisconnect(engine);
    }
  });

  addDataEndpoint("post", "/api/connection/:connectionId/database/:databaseId/refresh", async (req, res) => {
    try {
      const connectionId = req.params?.connectionId;
      const databaseId = req.params?.databaseId;
      clearCachedDatabase(connectionId, databaseId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      const message = formatErrorMessage(err, "Refresh failed");
      console.error("Endpoints.ts:handler [POST /api/connection/:connectionId/database/:databaseId/refresh]", err);
      res.status(500).json({ error: message });
    }
  });

  addDataEndpoint("post", "/api/connection/:connectionId/database/:databaseId/table/:tableId/refresh", async (req, res) => {
    try {
      const connectionId = req.params?.connectionId;
      const databaseId = req.params?.databaseId;
      const tableId = req.params?.tableId;
      clearCachedTable(connectionId, databaseId, tableId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      const message = formatErrorMessage(err, "Refresh failed");
      console.error("Endpoints.ts:handler [POST /api/connection/:connectionId/database/:databaseId/table/:tableId/refresh]", err);
      res.status(500).json({ error: message });
    }
  });

  addDataEndpoint("get", "/api/schema/search", async (req, res) => {
    const query = (req.query?.q || "").toString().toLowerCase().trim();

    if (!query) {
      return res.status(200).json([]);
    }

    const connectionsStorage = await getConnectionsStorage(req.headers["sqlui-native-session-id"]);
    const connections = await connectionsStorage.list();
    const connectionMap: Record<string, SqluiCore.ConnectionProps> = {};
    for (const conn of connections) {
      connectionMap[conn.id] = conn;
    }

    const allCached = listAllCachedColumns();
    const results: SqluiCore.SchemaSearchResult[] = [];

    for (const entry of allCached) {
      const [connectionId, databaseId, tableId] = entry.id.split(":");
      const conn = connectionMap[connectionId];
      if (!conn) continue;

      const tableMatches = tableId.toLowerCase().includes(query);

      for (const column of entry.data) {
        if (tableMatches || column.name.toLowerCase().includes(query) || column.type.toLowerCase().includes(query)) {
          results.push({
            connectionId,
            connectionName: conn.name,
            connectionString: conn.connection,
            databaseId,
            tableId,
            column,
          });
        }
      }
    }

    res.status(200).json(results);
  });

  addDataEndpoint("post", "/api/connection/:connectionId/connect", async (req, res) => {
    const connectionsStorage = await getConnectionsStorage(req.headers["sqlui-native-session-id"]);

    const connection = await connectionsStorage.get(req.params?.connectionId);

    if (!connection) {
      return res.status(404).send("Not Found");
    }

    // Clear backend column cache for this connection before reconnecting
    if (connection.id) {
      clearCachedColumns(connection.id);
    }

    const engine = getDataAdapter(connection.connection);
    try {
      await engine.authenticate();
      res.status(200).json(await getConnectionMetaData(connection));
    } catch (err: any) {
      // here means we failed to connect, just set back 407 - Not Acceptable
      // here we return the barebone
      res.status(406).json(`Failed to connect ${err.toString()}`);
      console.error("Endpoints.ts:connect", err);
    } finally {
      // Dispose of the adapter connection/driver immediately
      try {
        await engine.disconnect();
      } catch (_err) {
        // best-effort cleanup
      }
    }
  });

  addDataEndpoint("post", "/api/connection/:connectionId/execute", async (req, res) => {
    const connectionsStorage = await getConnectionsStorage(req.headers["sqlui-native-session-id"]);

    const connection = await connectionsStorage.get(req.params?.connectionId);

    if (!connection) {
      return res.status(404).send("Not Found");
    }

    const engine = getDataAdapter(connection.connection);
    // Set connectionId for adapters that need it (e.g., REST API folder-level variables)
    if ("connectionId" in engine) {
      (engine as any).connectionId = req.params?.connectionId;
    }
    try {
      res.status(200).json(await engine.execute(req.body?.sql, req.body?.database, req.body?.table));
    } catch (err: any) {
      const message = formatErrorMessage(err, "Query execution failed");
      console.error("Endpoints.ts:execute", err);
      res.status(200).json({ ok: false, error: message });
    } finally {
      await safeDisconnect(engine);
    }
  });

  addDataEndpoint("post", "/api/connection/test", async (req, res) => {
    const connection: SqluiCore.CoreConnectionProps = req.body;
    if (!connection.connection) {
      return res.status(400).send("`connection` is required...");
    }

    const engine = getDataAdapter(connection.connection);
    try {
      await engine.authenticate();

      // Run optional diagnostics (e.g., REST API HTTP probes)
      let diagnostics: SqluiCore.ConnectionDiagnostic[] | undefined;
      if (typeof (engine as any).runDiagnostics === "function") {
        diagnostics = await (engine as any).runDiagnostics();
      }

      res.status(200).json({
        name: connection.name,
        id: connection?.id,
        connection: connection.connection,
        status: "online",
        dialect: engine.dialect,
        databases: [],
        ...(diagnostics && diagnostics.length > 0 ? { diagnostics } : {}),
      });
    } catch (err: any) {
      const message = formatErrorMessage(err, "Connection test failed");
      console.error("Endpoints.ts:testConnection", err);
      res.status(406).json({ error: message });
    } finally {
      await safeDisconnect(engine);
    }
  });

  addDataEndpoint("post", "/api/connection", async (req, res) => {
    const connectionsStorage = await getConnectionsStorage(req.headers["sqlui-native-session-id"]);

    const newConnection = await connectionsStorage.add({
      connection: req.body?.connection,
      name: req.body?.name,
    });

    // Seed an initial folder for REST API connections
    try {
      const dialect = getDataAdapter(newConnection.connection).dialect;
      if (dialect === "rest" || dialect === "graphql") {
        const dbStorage = await getManagedDatabasesStorage(newConnection.id);
        await dbStorage.add({ id: "Folder 1", name: "Folder 1", connectionId: newConnection.id });
      }
    } catch (_err) {
      // Non-fatal — user can create folders manually
    }

    res.status(201).json(newConnection);
  });

  addDataEndpoint("put", "/api/connection/:connectionId", async (req, res) => {
    const connectionsStorage = await getConnectionsStorage(req.headers["sqlui-native-session-id"]);

    res.status(202).json(
      await connectionsStorage.update({
        id: req.params?.connectionId,
        connection: req.body?.connection,
        name: req.body?.name,
      }),
    );
  });

  addDataEndpoint("delete", "/api/connection/:connectionId", async (req, res) => {
    const connectionsStorage = await getConnectionsStorage(req.headers["sqlui-native-session-id"]);

    res.status(202).json(await connectionsStorage.delete(req.params?.connectionId));
  });

  //=========================================================================
  // managed metadata api endpoints (folders/requests for REST API, etc.)
  //=========================================================================

  /** GET all managed databases (folders) for a connection. */
  addDataEndpoint("get", "/api/connection/:connectionId/managedDatabases", async (req, res) => {
    const { connectionId } = req.params;
    try {
      const storage = await getManagedDatabasesStorage(connectionId);
      const entries = await storage.list();
      res.status(200).json(entries);
    } catch (err) {
      console.error(`Endpoints.ts:handler [GET /api/connection/:connectionId/managedDatabases]`, err);
      res.status(500).send("Failed to list managed databases");
    }
  });

  /** GET all managed tables (requests) for a connection. */
  addDataEndpoint("get", "/api/connection/:connectionId/managedTables", async (req, res) => {
    const { connectionId } = req.params;
    try {
      const storage = await getManagedTablesStorage(connectionId);
      const entries = await storage.list();
      res.status(200).json(entries);
    } catch (err) {
      console.error(`Endpoints.ts:handler [GET /api/connection/:connectionId/managedTables]`, err);
      res.status(500).send("Failed to list managed tables");
    }
  });

  addDataEndpoint("post", "/api/connection/:connectionId/managedDatabase", async (req, res) => {
    const { connectionId } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).send("`name` is required");
    }
    const storage = await getManagedDatabasesStorage(connectionId);
    const result = await storage.add({ id: name, name, connectionId });
    await clearCachedColumns(connectionId);
    res.status(201).json(result);
  });

  /** GET a single managed database by ID (includes props). */
  addDataEndpoint("get", "/api/connection/:connectionId/managedDatabase/:managedDatabaseId", async (req, res) => {
    const { connectionId, managedDatabaseId } = req.params;
    const storage = await getManagedDatabasesStorage(connectionId);
    try {
      const entry = await storage.get(managedDatabaseId);
      if (!entry) {
        return res.status(404).send("Managed database not found");
      }
      res.status(200).json(entry);
    } catch (err) {
      console.error(`Endpoints.ts:handler [GET /api/connection/:connectionId/managedDatabase/:managedDatabaseId]`, err);
      res.status(404).send("Managed database not found");
    }
  });

  /** PUT updates a managed database's name and/or props (e.g., folder variables for REST API). */
  addDataEndpoint("put", "/api/connection/:connectionId/managedDatabase/:managedDatabaseId", async (req, res) => {
    const { connectionId, managedDatabaseId } = req.params;
    const { name, props } = req.body;
    const dbStorage = await getManagedDatabasesStorage(connectionId);

    if (name && name !== managedDatabaseId) {
      // Rename: delete old, create new with props
      let existing: any = null;
      try {
        existing = await dbStorage.get(managedDatabaseId);
      } catch (_err) {
        // old entry may not exist
      }
      await dbStorage.delete(managedDatabaseId);
      const mergedProps = { ...(existing?.props || {}), ...(props || {}) };
      const result = await dbStorage.add({
        id: name,
        name,
        connectionId,
        ...(Object.keys(mergedProps).length > 0 ? { props: mergedProps } : {}),
      });
      // Update child tables to reference new database name
      const tableStorage = await getManagedTablesStorage(connectionId);
      const tables = await tableStorage.list();
      for (const table of tables) {
        if (table.databaseId === managedDatabaseId) {
          await tableStorage.update({ ...table, databaseId: name });
        }
      }
      await clearCachedColumns(connectionId);
      res.status(202).json(result);
    } else if (props) {
      // Props-only update (no rename)
      try {
        const entry = await dbStorage.get(managedDatabaseId);
        const updated = await dbStorage.update({ ...entry, props: { ...(entry.props || {}), ...props } });
        res.status(200).json(updated);
      } catch (err) {
        console.error(`Endpoints.ts:handler [PUT /api/connection/:connectionId/managedDatabase/:managedDatabaseId]`, err);
        res.status(404).send("Managed database not found");
      }
    } else {
      return res.status(400).send("`name` or `props` is required");
    }
  });

  addDataEndpoint("delete", "/api/connection/:connectionId/managedDatabase/:managedDatabaseId", async (req, res) => {
    const { connectionId, managedDatabaseId } = req.params;
    const dbStorage = await getManagedDatabasesStorage(connectionId);
    await dbStorage.delete(managedDatabaseId);
    // Also delete child tables
    const tableStorage = await getManagedTablesStorage(connectionId);
    const tables = await tableStorage.list();
    for (const table of tables) {
      if (table.databaseId === managedDatabaseId) {
        await tableStorage.delete(table.id);
      }
    }
    await clearCachedColumns(connectionId);
    res.status(202).json({ id: managedDatabaseId });
  });

  addDataEndpoint("post", "/api/connection/:connectionId/database/:databaseId/managedTable", async (req, res) => {
    const { connectionId, databaseId } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).send("`name` is required");
    }
    const storage = await getManagedTablesStorage(connectionId);
    const result = await storage.add({ name, connectionId, databaseId });
    await clearCachedDatabase(connectionId, databaseId);
    res.status(201).json(result);
  });

  addDataEndpoint("delete", "/api/connection/:connectionId/database/:databaseId/managedTable/:managedTableId", async (req, res) => {
    const { connectionId, databaseId, managedTableId } = req.params;
    const storage = await getManagedTablesStorage(connectionId);
    await storage.delete(managedTableId);
    await clearCachedDatabase(connectionId, databaseId);
    res.status(202).json({ id: managedTableId });
  });

  /** GET a single managed table by ID (includes props). */
  addDataEndpoint("get", "/api/connection/:connectionId/database/:databaseId/managedTable/:managedTableId", async (req, res) => {
    const { connectionId, databaseId, managedTableId } = req.params;
    const storage = await getManagedTablesStorage(connectionId);
    try {
      const entry = await storage.get(managedTableId);
      if (!entry || entry.databaseId !== databaseId) {
        return res.status(404).send("Managed table not found");
      }
      res.status(200).json(entry);
    } catch (err) {
      console.error(`Endpoints.ts:handler [GET /api/connection/:connectionId/database/:databaseId/managedTable/:managedTableId]`, err);
      res.status(404).send("Managed table not found");
    }
  });

  /** PUT updates a managed table's name and/or props (e.g., saved query for REST API requests). */
  addDataEndpoint("put", "/api/connection/:connectionId/database/:databaseId/managedTable/:managedTableId", async (req, res) => {
    const { connectionId, databaseId, managedTableId } = req.params;
    const { name, props } = req.body;
    const storage = await getManagedTablesStorage(connectionId);
    try {
      const entry = await storage.get(managedTableId);
      if (!entry || entry.databaseId !== databaseId) {
        return res.status(404).send("Managed table not found");
      }
      const updates = { ...entry };
      if (name) updates.name = name;
      if (props) updates.props = { ...(entry.props || {}), ...props };
      const updated = await storage.update(updates);
      res.status(200).json(updated);
    } catch (err) {
      console.error(`Endpoints.ts:handler [PUT /api/connection/:connectionId/database/:databaseId/managedTable/:managedTableId]`, err);
      res.status(500).send("Failed to update managed table");
    }
  });

  //=========================================================================
  // query api endpoints
  //=========================================================================
  addDataEndpoint("get", "/api/queries", async (req, res) => {
    const queryStorage = await getQueryStorage(req.headers["sqlui-native-session-id"]);

    const queries = await queryStorage.list();

    // backfill legacy queries missing timestamps (batch write)
    if (backfillTimestamps(queries, "query")) {
      queryStorage.set(queries);
    }

    res.status(200).json(queries);
  });

  addDataEndpoint("post", "/api/query", async (req, res) => {
    const queryStorage = await getQueryStorage(req.headers["sqlui-native-session-id"]);

    res.status(201).json(
      await queryStorage.add({
        name: req.body?.name,
      }),
    );
  });

  addDataEndpoint("put", "/api/query/:queryId", async (req, res) => {
    const queryStorage = await getQueryStorage(req.headers["sqlui-native-session-id"]);

    res.status(202).json(
      await queryStorage.update({
        id: req.body.id,
        name: req.body.name,
        connectionId: req.body?.connectionId,
        databaseId: req.body?.databaseId,
        tableId: req.body?.tableId,
        sql: req.body?.sql,
      }),
    );
  });

  addDataEndpoint("delete", "/api/query/:queryId", async (req, res) => {
    const queryStorage = await getQueryStorage(req.headers["sqlui-native-session-id"]);

    res.status(202).json(await queryStorage.delete(req.params?.queryId));
  });
  //=========================================================================
  // session api endpoints
  //=========================================================================
  // get the current session
  addDataEndpoint("get", "/api/session", async (req, res) => {
    const sessionId = req.headers["sqlui-native-session-id"];
    if (!sessionId) {
      return res.status(404).json(null);
    }

    const sessionsStorage = await getSessionsStorage();
    const session = await sessionsStorage.get(sessionId);

    if (!session) {
      return res.status(404).json(null);
    }

    res.status(200).json(session);
  });

  addDataEndpoint("get", "/api/sessions", async (req, res) => {
    const sessionsStorage = await getSessionsStorage();

    let sessions = sessionsStorage.list();

    if (sessions.length === 0) {
      sessionsStorage.add({
        name: `New Session ${new Date().toLocaleString()}`,
      });
      sessions = sessionsStorage.list();
    }

    // backfill legacy sessions: fix missing names and timestamps (batch write)
    let sessionsDirty = false;
    for (const session of sessions) {
      let needsUpdate = false;

      // fix sessions with no name
      if (!session.name) {
        const fallbackDate = session.createdAt ? new Date(session.createdAt).toLocaleString() : new Date().toLocaleString();
        session.name = `Session ${fallbackDate}`;
        console.error(`Endpoints.ts:GET /api/sessions - backfilled missing name for session ${session.id}: "${session.name}"`);
        needsUpdate = true;
      }

      // migrate legacy field names (created → createdAt, lastUpdated → updatedAt)
      const legacy = session as any;
      if (legacy.created && !session.createdAt) {
        session.createdAt = legacy.created;
        delete legacy.created;
        needsUpdate = true;
      }
      if (legacy.lastUpdated && !session.updatedAt) {
        session.updatedAt = legacy.lastUpdated;
        delete legacy.lastUpdated;
        needsUpdate = true;
      }

      // backfill missing timestamps
      if (!session.createdAt) {
        session.createdAt = Date.now();
        console.error(`Endpoints.ts:GET /api/sessions - backfilled missing createdAt for session ${session.id}`);
        needsUpdate = true;
      }
      if (!session.updatedAt) {
        session.updatedAt = Date.now();
        console.error(`Endpoints.ts:GET /api/sessions - backfilled missing updatedAt for session ${session.id}`);
        needsUpdate = true;
      }

      if (needsUpdate) {
        sessionsDirty = true;
      }
    }

    if (sessionsDirty) {
      sessionsStorage.set(sessions);
    }

    res.status(200).json(sessions);
  });

  addDataEndpoint("post", "/api/session", async (req, res) => {
    const sessionsStorage = await getSessionsStorage();

    res.status(201).json(
      await sessionsStorage.add({
        name: req.body?.name,
      }),
    );
  });

  addDataEndpoint("put", "/api/session/:sessionId", async (req, res) => {
    const sessionsStorage = await getSessionsStorage();

    res.status(202).json(
      await sessionsStorage.update({
        id: req.params?.sessionId,
        name: req.body?.name,
      }),
    );
  });

  addDataEndpoint("post", "/api/session/:sessionId/clone", async (req, res) => {
    const name = req.body?.name;
    const clonedFromSessionId = req.params?.sessionId;

    if (!name) {
      return res.status(400).send("`name` is required...");
    }
    const sessionsStorage = await getSessionsStorage();

    const newSession = await sessionsStorage.add({
      name,
    });

    const newSessionId = newSession.id;

    // get a list of connections and queries from the old session
    const connectionsStorage = await getConnectionsStorage(clonedFromSessionId);
    const connections = await connectionsStorage.list();
    const queryStorage = await getQueryStorage(clonedFromSessionId);
    const queries = await queryStorage.list();

    // here's the copy and clone of connections and queries
    const newConnectionsStorage = await getConnectionsStorage(newSessionId);
    const newQueryStorage = await getQueryStorage(newSessionId);
    await newConnectionsStorage.set(connections);
    await newQueryStorage.set(queries);

    res.status(201).json(newSession);
  });

  addDataEndpoint("delete", "/api/session/:sessionId", async (req, res) => {
    const sessionIdToDelete = req.params?.sessionId;
    if (!sessionIdToDelete) {
      throw new Error("sessionId is required");
    }
    const sessionsStorage = await getSessionsStorage();

    const response = await sessionsStorage.delete(sessionIdToDelete);

    res.status(202).json(response);
  });
  //=========================================================================
  // folder items endpoints used in bookmarks and recycle bin
  //=========================================================================
  // this get a list of all items in a folder
  addDataEndpoint("get", "/api/folder/:folderId", async (req, res) => {
    const folderItemsStorage = await getFolderItemsStorage(req.params?.folderId);

    const items = await folderItemsStorage.list();

    // backfill createdAt and type for existing items that were created before these fields existed (batch write)
    let folderDirty = false;
    for (const item of items) {
      let needsUpdate = false;

      if (!item.createdAt) {
        item.createdAt = Date.now();
        needsUpdate = true;
      }

      if (!(item as any).type) {
        // infer type from data shape: if it has sql, it's a Query; if it has dialect, it's a Connection
        const itemData = (item as any).data;
        if (itemData?.sql !== undefined) {
          (item as any).type = "Query";
        } else if (itemData?.dialect !== undefined) {
          (item as any).type = "Connection";
        }
        needsUpdate = true;
      }

      if (needsUpdate) {
        folderDirty = true;
      }
    }
    if (folderDirty) {
      folderItemsStorage.set(items);
    }

    res.status(200).json(items);
  });

  // adds item to a folder (bookmarks or recycle bin)
  addDataEndpoint("post", "/api/folder/:folderId", async (req, res) => {
    const folderItemsStorage = await getFolderItemsStorage(req.params?.folderId);

    const entry: Record<string, any> = {
      name: req.body.name,
      type: req.body.type,
      data: req.body.data,
      connections: req.body.connections,
    };

    // allow callers (e.g. import) to preserve the original ID
    if (req.body.id) {
      entry.id = req.body.id;
    }

    res.status(202).json(await folderItemsStorage.add(entry));
  });

  addDataEndpoint("put", "/api/folder/:folderId", async (req, res) => {
    const folderItemsStorage = await getFolderItemsStorage(req.params?.folderId);

    res.status(202).json(
      await folderItemsStorage.update({
        id: req.body.id,
        name: req.body.name,
        type: req.body.type,
        data: req.body.data,
      }),
    );
  });

  // can be used to delete items off the recycle permanently
  addDataEndpoint("delete", "/api/folder/:folderId/:itemId", async (req, res) => {
    const folderItemsStorage = await getFolderItemsStorage(req.params?.folderId);

    res.status(202).json(await folderItemsStorage.delete(req.params?.itemId));
  });

  // Open in app window — no-op in browser mode (window navigation handled by frontend)
  addDataEndpoint("post", "/api/appWindow", async (_req, res) => {
    res.status(200).send();
  });
  // data snapshot endpoints
  addDataEndpoint("get", "/api/dataSnapshots", async (req, res) => {
    const dataSnapshotStorage = await getDataSnapshotStorage();

    const snapshots = await dataSnapshotStorage.list();

    // backfill legacy snapshots: migrate "created" → "createdAt" and add missing timestamps (batch write)
    let snapshotsDirty = false;
    for (const snapshot of snapshots) {
      const legacy = snapshot as any;
      if (legacy.created && !snapshot.createdAt) {
        snapshot.createdAt = legacy.created;
        delete legacy.created;
        snapshotsDirty = true;
      }
    }
    if (backfillTimestamps(snapshots, "snapshot") || snapshotsDirty) {
      dataSnapshotStorage.set(snapshots);
    }

    res.status(200).json(snapshots);
  });

  addDataEndpoint("get", "/api/dataSnapshot/:dataSnapshotId", async (req, res) => {
    const dataSnapshotStorage = await getDataSnapshotStorage();

    const dataSnapshotId = req.params?.dataSnapshotId;

    const dataSnapshot = await dataSnapshotStorage.get(dataSnapshotId);

    if (!dataSnapshot) {
      return res.status(404).send("Not Found");
    }

    try {
      dataSnapshot.values = dataSnapshotStorage.readDataFile(dataSnapshot.location);
    } catch (err) {
      console.error("Endpoints.ts:readDataFile", err);
      dataSnapshot.values = [
        {
          error: `Failed to read content of data snapshot - file=${dataSnapshot.location}`,
        },
      ];
    }

    res.status(200).json(dataSnapshot);
  });

  addDataEndpoint("post", "/api/dataSnapshot", async (req, res) => {
    const dataSnapshotStorage = await getDataSnapshotStorage();

    const dataSnapshotId = dataSnapshotStorage.getGeneratedRandomId();

    const location = dataSnapshotStorage.writeDataFile(dataSnapshotId, req.body.values);

    const resp = await dataSnapshotStorage.add({
      id: dataSnapshotId,
      description: req.body.description,
      location,
    });
    res.status(200).json(resp);
  });

  addDataEndpoint("delete", "/api/dataSnapshot/:dataSnapshotId", async (req, res) => {
    const dataSnapshotStorage = await getDataSnapshotStorage();
    // TODO: should we delete the snapshot data too?
    res.status(202).json(await dataSnapshotStorage.delete(req.params?.dataSnapshotId));
  });

  //=========================================================================
  // query version history endpoints
  //=========================================================================
  const MAX_QUERY_VERSION_ENTRIES = 200;

  addDataEndpoint("get", "/api/queryVersionHistory", async (req, res) => {
    const storage = await getFolderItemsStorage(`queryHistory_${req.headers["sqlui-native-session-id"]}`);
    res.status(200).json(await storage.list());
  });

  addDataEndpoint("post", "/api/queryVersionHistory", async (req, res) => {
    const storage = await getFolderItemsStorage(`queryHistory_${req.headers["sqlui-native-session-id"]}`);

    const entry = await storage.add({
      name: req.body.name,
      type: req.body.auditType,
      data: {
        connectionId: req.body.connectionId,
        sql: req.body.sql,
      },
    });

    // trim to MAX entries per connection, keeping the newest
    const allEntries = await storage.list();
    const byConnection: Record<string, typeof allEntries> = {};
    for (const e of allEntries) {
      const connId = e.type === "execution" || e.type === "delta" ? e.data.connectionId : undefined;
      if (connId) (byConnection[connId] ??= []).push(e);
    }

    const toDelete: string[] = [];
    for (const entries of Object.values(byConnection)) {
      if (entries.length > MAX_QUERY_VERSION_ENTRIES) {
        entries.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        for (let i = MAX_QUERY_VERSION_ENTRIES; i < entries.length; i++) {
          toDelete.push(entries[i].id);
        }
      }
    }

    for (const id of toDelete) {
      await storage.delete(id);
    }

    res.status(201).json(entry);
  });

  addDataEndpoint("delete", "/api/queryVersionHistory/:entryId", async (req, res) => {
    const storage = await getFolderItemsStorage(`queryHistory_${req.headers["sqlui-native-session-id"]}`);
    res.status(202).json(await storage.delete(req.params?.entryId));
  });

  addDataEndpoint("delete", "/api/queryVersionHistory", async (req, res) => {
    const storage = await getFolderItemsStorage(`queryHistory_${req.headers["sqlui-native-session-id"]}`);
    await storage.set([]);
    res.status(202).json([]);
  });
}
