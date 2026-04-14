use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::adapters;
use crate::cache;
use crate::error::AppError;
use crate::storage;
use crate::types::*;

/// Generic JSON response for simple status messages.
#[derive(Serialize)]
pub struct StatusResponse {
    pub success: bool,
}

/// Generic ID response for delete operations.
#[derive(Serialize)]
pub struct IdResponse {
    pub id: String,
}

// ==================== Config Commands ====================

/// GET /api/configs — Returns server configuration and settings.
#[tauri::command]
pub fn get_configs() -> Result<serde_json::Value, String> {
    let settings_store = storage::settings_storage();
    let settings: serde_json::Value = settings_store
        .get("app-settings")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(default_settings);

    let mut result = settings;
    if let Some(obj) = result.as_object_mut() {
        obj.insert(
            "storageDir".to_string(),
            serde_json::Value::String(storage::get_storage_dir().to_string_lossy().to_string()),
        );
        obj.insert("isElectron".to_string(), serde_json::Value::Bool(false));
    }
    Ok(result)
}

/// PUT /api/configs — Updates server settings.
#[tauri::command]
pub fn update_configs(body: serde_json::Value) -> Result<serde_json::Value, String> {
    let settings_store = storage::settings_storage();
    let mut current: serde_json::Value = settings_store
        .get("app-settings")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(default_settings);

    // Merge incoming settings
    if let (Some(base), Some(update)) = (current.as_object_mut(), body.as_object()) {
        for (k, v) in update {
            base.insert(k.clone(), v.clone());
        }
    }
    current["id"] = serde_json::json!("app-settings");

    let result: serde_json::Value = settings_store.update(&current).map_err(|e| e.to_string())?;
    Ok(result)
}

// ==================== Connection Commands ====================

/// GET /api/connections — Lists all connections for the session.
#[tauri::command]
pub fn get_connections(session_id: String) -> Result<Vec<serde_json::Value>, String> {
    let store = storage::connections_storage(&session_id);
    let connections: Vec<serde_json::Value> = store.list().map_err(|e| e.to_string())?;
    Ok(connections)
}

/// POST /api/connections — Replaces all connections for the session.
#[tauri::command]
pub fn set_connections(
    session_id: String,
    body: Vec<serde_json::Value>,
) -> Result<Vec<serde_json::Value>, String> {
    let store = storage::connections_storage(&session_id);
    let result = store.set(&body).map_err(|e| e.to_string())?;
    Ok(result)
}

/// POST /api/connection — Creates a new connection.
/// For REST/GraphQL dialects, auto-creates a "Folder 1" managed database.
#[tauri::command]
pub fn create_connection(
    session_id: String,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let store = storage::connections_storage(&session_id);
    let result: serde_json::Value = store.add(&body).map_err(|e| e.to_string())?;

    // Auto-create "Folder 1" for REST/GraphQL connections
    if let Some(conn_str) = result.get("connection").and_then(|v| v.as_str()) {
        if let Some(dialect) = crate::types::parse_dialect(conn_str) {
            if dialect.uses_managed_metadata() {
                if let Some(connection_id) = result.get("id").and_then(|v| v.as_str()) {
                    let db_store = storage::managed_databases_storage(connection_id);
                    let folder = serde_json::json!({
                        "id": "Folder 1",
                        "name": "Folder 1",
                        "connectionId": connection_id,
                    });
                    let _ = db_store.add::<serde_json::Value>(&folder);
                }
            }
        }
    }

    Ok(result)
}

/// PUT /api/connection/:connectionId — Updates a connection.
#[tauri::command]
pub fn update_connection(
    session_id: String,
    connection_id: String,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let store = storage::connections_storage(&session_id);
    let mut entry = body;
    entry["id"] = serde_json::json!(connection_id);
    let result: serde_json::Value = store.update(&entry).map_err(|e| e.to_string())?;
    Ok(result)
}

/// DELETE /api/connection/:connectionId — Deletes a connection.
#[tauri::command]
pub fn delete_connection(
    session_id: String,
    connection_id: String,
) -> Result<serde_json::Value, String> {
    let store = storage::connections_storage(&session_id);
    let deleted: Option<serde_json::Value> =
        store.delete(&connection_id).map_err(|e| e.to_string())?;
    Ok(deleted.unwrap_or(serde_json::json!({"id": connection_id})))
}

/// GET /api/connection/:connectionId — Gets a connection and authenticates.
#[tauri::command]
pub async fn get_connection(
    session_id: String,
    connection_id: String,
) -> Result<serde_json::Value, String> {
    let store = storage::connections_storage(&session_id);
    let conn: Option<serde_json::Value> =
        store.get(&connection_id).map_err(|e| e.to_string())?;

    match conn {
        Some(mut c) => {
            // Try to authenticate
            let conn_str = c
                .get("connection")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            match adapters::create_adapter(&conn_str) {
                Ok(mut adapter) => {
                    match adapter.authenticate().await {
                        Ok(()) => {
                            c["status"] = serde_json::json!("online");
                            if let Some(d) = adapter.dialect() {
                                c["dialect"] = serde_json::to_value(d).unwrap_or_default();
                            }
                        }
                        Err(e) => {
                            c["status"] = serde_json::json!("offline");
                            c["error"] = serde_json::json!(e.to_string());
                            eprintln!("commands:get_connection auth error: {}", e);
                        }
                    }
                    let _ = adapter.disconnect().await;
                }
                Err(e) => {
                    c["status"] = serde_json::json!("offline");
                    c["error"] = serde_json::json!(e.to_string());
                }
            }
            Ok(c)
        }
        None => Err(format!("Connection {} not found", connection_id)),
    }
}

/// POST /api/connection/test — Tests a connection without saving.
#[tauri::command]
pub async fn test_connection(body: serde_json::Value) -> Result<serde_json::Value, String> {
    let conn_str = body
        .get("connection")
        .and_then(|v| v.as_str())
        .ok_or("Missing connection string")?
        .to_string();
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let mut adapter = adapters::create_adapter(&conn_str).map_err(|e| e.to_string())?;
    adapter.authenticate().await.map_err(|e| e.to_string())?;

    let dialect = adapter.dialect();
    let diagnostics = adapter.run_diagnostics().await.unwrap_or_default();
    let _ = adapter.disconnect().await;

    let mut result = serde_json::json!({
        "name": name,
        "connection": conn_str,
        "status": "online",
        "databases": [],
    });
    if let Some(d) = dialect {
        result["dialect"] = serde_json::to_value(d).unwrap_or_default();
    }
    if !diagnostics.is_empty() {
        result["diagnostics"] = serde_json::to_value(diagnostics).unwrap_or_default();
    }
    Ok(result)
}

/// POST /api/connection/:connectionId/execute — Executes a query.
#[tauri::command]
pub async fn execute_query(
    session_id: String,
    connection_id: String,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let store = storage::connections_storage(&session_id);
    let conn: serde_json::Value = store
        .get(&connection_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Connection {} not found", connection_id))?;

    let conn_str = conn
        .get("connection")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let sql = body
        .get("sql")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let database = body.get("database").and_then(|v| v.as_str()).map(String::from);
    let table = body.get("table").and_then(|v| v.as_str()).map(String::from);

    let mut adapter = adapters::create_adapter(&conn_str).map_err(|e| e.to_string())?;
    adapter.authenticate().await.map_err(|e| e.to_string())?;

    let result = adapter
        .execute(&sql, database.as_deref(), table.as_deref())
        .await;
    let _ = adapter.disconnect().await;

    match result {
        Ok(qr) => Ok(serde_json::to_value(qr).unwrap_or_default()),
        Err(e) => Ok(serde_json::json!({
            "ok": false,
            "error": e.to_string(),
        })),
    }
}

/// POST /api/connection/:connectionId/connect — Connects and fetches full metadata.
/// For REST/GraphQL, returns managed databases (folders) instead of adapter databases.
#[tauri::command]
pub async fn connect_connection(
    session_id: String,
    connection_id: String,
) -> Result<serde_json::Value, String> {
    let store = storage::connections_storage(&session_id);
    let conn: serde_json::Value = store
        .get(&connection_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Connection {} not found", connection_id))?;

    let conn_str = conn
        .get("connection")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let name = conn
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let mut adapter = adapters::create_adapter(&conn_str).map_err(|e| e.to_string())?;
    adapter.authenticate().await.map_err(|e| e.to_string())?;
    let dialect = adapter.dialect();

    // For managed-metadata dialects, get databases from storage
    let databases: Vec<DatabaseMetaData> =
        if dialect.as_ref().map_or(false, |d| d.uses_managed_metadata()) {
            let db_store = storage::managed_databases_storage(&connection_id);
            let mut managed: Vec<serde_json::Value> = db_store.list().unwrap_or_default();
            if managed.is_empty() {
                let folder = serde_json::json!({
                    "id": "Folder 1",
                    "name": "Folder 1",
                    "connectionId": connection_id,
                });
                let _ = db_store.add::<serde_json::Value>(&folder);
                managed = db_store.list().unwrap_or_default();
            }
            managed
                .iter()
                .filter_map(|entry| {
                    entry.get("name").and_then(|v| v.as_str()).map(|n| DatabaseMetaData {
                        name: n.to_string(),
                        tables: vec![],
                    })
                })
                .collect()
        } else {
            adapter.get_databases().await.unwrap_or_default()
        };

    let _ = adapter.disconnect().await;

    // Cache databases
    let cache_key = format!("databases:{}", connection_id);
    let cache_entry = serde_json::json!({
        "id": cache_key,
        "data": databases,
        "timestamp": storage::now_ms(),
    });
    let _ = storage::cached_databases_storage().add::<serde_json::Value>(&cache_entry);

    let mut result = serde_json::json!({
        "connection": conn_str,
        "name": name,
        "status": "online",
        "databases": databases,
    });
    if let Some(d) = dialect {
        result["dialect"] = serde_json::to_value(d).unwrap_or_default();
    }
    Ok(result)
}

/// GET /api/connection/:connectionId/databases — Lists databases.
/// For REST/GraphQL, returns managed databases (folders) from storage instead of querying the adapter.
#[tauri::command]
pub async fn get_databases(
    session_id: String,
    connection_id: String,
) -> Result<Vec<DatabaseMetaData>, String> {
    let store = storage::connections_storage(&session_id);
    let conn: serde_json::Value = store
        .get(&connection_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Connection {} not found", connection_id))?;

    let conn_str = conn
        .get("connection")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // For managed-metadata dialects (REST/GraphQL), read from managed storage
    if let Some(dialect) = crate::types::parse_dialect(&conn_str) {
        if dialect.uses_managed_metadata() {
            let db_store = storage::managed_databases_storage(&connection_id);
            let mut managed: Vec<serde_json::Value> = db_store.list().unwrap_or_default();

            // Auto-seed "Folder 1" if empty
            if managed.is_empty() {
                let folder = serde_json::json!({
                    "id": "Folder 1",
                    "name": "Folder 1",
                    "connectionId": connection_id,
                });
                let _ = db_store.add::<serde_json::Value>(&folder);
                managed = db_store.list().unwrap_or_default();
            }

            let mut dbs: Vec<DatabaseMetaData> = managed
                .iter()
                .filter_map(|entry| {
                    entry.get("name").and_then(|v| v.as_str()).map(|name| DatabaseMetaData {
                        name: name.to_string(),
                        tables: vec![],
                    })
                })
                .collect();
            dbs.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
            return Ok(dbs);
        }
    }

    let mut adapter = adapters::create_adapter(&conn_str).map_err(|e| e.to_string())?;
    adapter.authenticate().await.map_err(|e| e.to_string())?;
    let mut dbs = adapter.get_databases().await.map_err(|e| e.to_string())?;
    let _ = adapter.disconnect().await;

    dbs.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(dbs)
}

/// GET /api/connection/:connectionId/database/:databaseId/tables — Lists tables.
/// For REST/GraphQL, returns managed tables (requests) from storage instead of querying the adapter.
#[tauri::command]
pub async fn get_tables(
    session_id: String,
    connection_id: String,
    database_id: String,
) -> Result<Vec<TableMetaData>, String> {
    let store = storage::connections_storage(&session_id);
    let conn: serde_json::Value = store
        .get(&connection_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Connection {} not found", connection_id))?;

    let conn_str = conn
        .get("connection")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // For managed-metadata dialects (REST/GraphQL), read from managed storage
    if let Some(dialect) = crate::types::parse_dialect(&conn_str) {
        if dialect.uses_managed_metadata() {
            let table_store = storage::managed_tables_storage(&connection_id);
            let managed: Vec<serde_json::Value> = table_store.list().unwrap_or_default();
            let mut tables: Vec<TableMetaData> = managed
                .iter()
                .filter(|entry| {
                    entry.get("databaseId").and_then(|v| v.as_str()) == Some(&database_id)
                })
                .filter_map(|entry| {
                    let name = entry.get("name").and_then(|v| v.as_str())?.to_string();
                    let id = entry.get("id").and_then(|v| v.as_str()).map(|s| s.to_string());
                    Some(TableMetaData { id, name, columns: vec![] })
                })
                .collect();
            tables.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
            return Ok(tables);
        }
    }

    let mut adapter = adapters::create_adapter(&conn_str).map_err(|e| e.to_string())?;
    adapter.authenticate().await.map_err(|e| e.to_string())?;
    let mut tables = adapter
        .get_tables(Some(&database_id))
        .await
        .map_err(|e| e.to_string())?;
    let _ = adapter.disconnect().await;

    tables.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(tables)
}

/// GET /api/connection/:connectionId/database/:databaseId/table/:tableId/columns — Lists columns.
#[tauri::command]
pub async fn get_columns(
    session_id: String,
    connection_id: String,
    database_id: String,
    table_id: String,
) -> Result<Vec<ColumnMetaData>, String> {
    let store = storage::connections_storage(&session_id);
    let conn: serde_json::Value = store
        .get(&connection_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Connection {} not found", connection_id))?;

    let conn_str = conn
        .get("connection")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let mut adapter = adapters::create_adapter(&conn_str).map_err(|e| e.to_string())?;
    adapter.authenticate().await.map_err(|e| e.to_string())?;
    let columns = adapter
        .get_columns(&table_id, Some(&database_id))
        .await
        .map_err(|e| e.to_string())?;
    let _ = adapter.disconnect().await;

    Ok(columns)
}

/// GET /api/connection/:connectionId/database/:databaseId/schema/cached — Returns cached schema.
#[tauri::command]
pub fn get_cached_schema(
    connection_id: String,
    database_id: String,
) -> Result<serde_json::Value, String> {
    // Return whatever we have in the cache stores
    let dbs_store = storage::cached_databases_storage();
    let tables_store = storage::cached_tables_storage();
    let cols_store = storage::cached_columns_storage();

    let db_key = format!("databases:{}", connection_id);
    let table_key = format!("tables:{}:{}", connection_id, database_id);

    let databases: Vec<DatabaseMetaData> = dbs_store
        .get::<serde_json::Value>(&db_key)
        .ok()
        .flatten()
        .and_then(|v| serde_json::from_value(v.get("data").cloned().unwrap_or_default()).ok())
        .unwrap_or_default();

    let tables: Vec<TableMetaData> = tables_store
        .get::<serde_json::Value>(&table_key)
        .ok()
        .flatten()
        .and_then(|v| serde_json::from_value(v.get("data").cloned().unwrap_or_default()).ok())
        .unwrap_or_default();

    let mut columns: HashMap<String, Vec<ColumnMetaData>> = HashMap::new();
    let all_cols: Vec<serde_json::Value> = cols_store.list().unwrap_or_default();
    let prefix = format!("{}:{}", connection_id, database_id);
    for entry in all_cols {
        if let Some(id) = entry.get("id").and_then(|v| v.as_str()) {
            if id.starts_with(&prefix) {
                let parts: Vec<&str> = id.splitn(3, ':').collect();
                if parts.len() == 3 {
                    let table_id = parts[2].to_string();
                    if let Some(data) = entry.get("data") {
                        if let Ok(cols) = serde_json::from_value::<Vec<ColumnMetaData>>(data.clone())
                        {
                            columns.insert(table_id, cols);
                        }
                    }
                }
            }
        }
    }

    Ok(serde_json::json!({
        "databases": databases,
        "tables": tables,
        "columns": columns,
    }))
}

/// POST /api/connection/:connectionId/refresh — Clears cache and re-authenticates.
#[tauri::command]
pub async fn refresh_connection(
    session_id: String,
    connection_id: String,
) -> Result<serde_json::Value, String> {
    // Clear all caches for this connection
    clear_caches_for_connection(&connection_id);
    // Reconnect
    connect_connection(session_id, connection_id).await
}

/// POST /api/connection/:connectionId/database/:databaseId/refresh — Clears database cache.
#[tauri::command]
pub fn refresh_database(
    connection_id: String,
    database_id: String,
) -> Result<serde_json::Value, String> {
    let table_key = format!("tables:{}:{}", connection_id, database_id);
    let _ = storage::cached_tables_storage().delete::<serde_json::Value>(&table_key);
    // Clear columns for all tables in this database
    let cols_store = storage::cached_columns_storage();
    let all_cols: Vec<serde_json::Value> = cols_store.list().unwrap_or_default();
    let prefix = format!("{}:{}", connection_id, database_id);
    for entry in all_cols {
        if let Some(id) = entry.get("id").and_then(|v| v.as_str()) {
            if id.starts_with(&prefix) {
                let _ = cols_store.delete::<serde_json::Value>(id);
            }
        }
    }
    Ok(serde_json::json!({"success": true}))
}

/// POST /api/connection/:connectionId/database/:databaseId/table/:tableId/refresh — Clears table cache.
#[tauri::command]
pub fn refresh_table(
    connection_id: String,
    database_id: String,
    table_id: String,
) -> Result<serde_json::Value, String> {
    let col_key = format!("{}:{}:{}", connection_id, database_id, table_id);
    let _ = storage::cached_columns_storage().delete::<serde_json::Value>(&col_key);
    Ok(serde_json::json!({"success": true}))
}

// ==================== Query Commands ====================

/// GET /api/queries — Lists all queries for the session.
#[tauri::command]
pub fn get_queries(session_id: String) -> Result<Vec<serde_json::Value>, String> {
    let store = storage::queries_storage(&session_id);
    let queries: Vec<serde_json::Value> = store.list().map_err(|e| e.to_string())?;
    Ok(queries)
}

/// POST /api/query — Creates a new query.
#[tauri::command]
pub fn create_query(session_id: String, body: serde_json::Value) -> Result<serde_json::Value, String> {
    let store = storage::queries_storage(&session_id);
    let result: serde_json::Value = store.add(&body).map_err(|e| e.to_string())?;
    Ok(result)
}

/// PUT /api/query/:queryId — Updates a query.
#[tauri::command]
pub fn update_query(
    session_id: String,
    query_id: String,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let store = storage::queries_storage(&session_id);
    let mut entry = body;
    entry["id"] = serde_json::json!(query_id);
    let result: serde_json::Value = store.update(&entry).map_err(|e| e.to_string())?;
    Ok(result)
}

/// DELETE /api/query/:queryId — Deletes a query.
#[tauri::command]
pub fn delete_query(session_id: String, query_id: String) -> Result<serde_json::Value, String> {
    let store = storage::queries_storage(&session_id);
    let deleted: Option<serde_json::Value> = store.delete(&query_id).map_err(|e| e.to_string())?;
    Ok(deleted.unwrap_or(serde_json::json!({"id": query_id})))
}

// ==================== Session Commands ====================

/// GET /api/sessions — Lists all sessions.
#[tauri::command]
pub fn get_sessions() -> Result<Vec<serde_json::Value>, String> {
    let store = storage::sessions_storage();
    let mut sessions: Vec<serde_json::Value> = store.list().map_err(|e| e.to_string())?;

    // Auto-create first session if none exist
    if sessions.is_empty() {
        let name = format!(
            "New Session {}",
            chrono::Local::now().format("%Y-%m-%d %H:%M")
        );
        let entry = serde_json::json!({"name": name});
        let created: serde_json::Value = store.add(&entry).map_err(|e| e.to_string())?;
        sessions.push(created);
    }

    Ok(sessions)
}

/// GET /api/session — Gets the current session by session ID header.
#[tauri::command]
pub fn get_session(session_id: String) -> Result<serde_json::Value, String> {
    let store = storage::sessions_storage();
    store
        .get(&session_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Session {} not found", session_id))
}

/// POST /api/session — Creates a new session.
#[tauri::command]
pub fn create_session(body: serde_json::Value) -> Result<serde_json::Value, String> {
    let store = storage::sessions_storage();
    let result: serde_json::Value = store.add(&body).map_err(|e| e.to_string())?;
    Ok(result)
}

/// PUT /api/session/:sessionId — Updates a session.
#[tauri::command]
pub fn update_session(session_id: String, body: serde_json::Value) -> Result<serde_json::Value, String> {
    let store = storage::sessions_storage();
    let mut entry = body;
    entry["id"] = serde_json::json!(session_id);
    let result: serde_json::Value = store.update(&entry).map_err(|e| e.to_string())?;
    Ok(result)
}

/// POST /api/session/:sessionId/clone — Clones a session.
#[tauri::command]
pub fn clone_session(session_id: String, body: serde_json::Value) -> Result<serde_json::Value, String> {
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .ok_or("Missing name")?
        .to_string();

    let sessions_store = storage::sessions_storage();
    let new_session: serde_json::Value = sessions_store
        .add(&serde_json::json!({"name": name}))
        .map_err(|e| e.to_string())?;
    let new_session_id = new_session["id"].as_str().unwrap_or("").to_string();

    // Clone connections
    let src_connections: Vec<serde_json::Value> = storage::connections_storage(&session_id)
        .list()
        .unwrap_or_default();
    let dst_store = storage::connections_storage(&new_session_id);
    for conn in &src_connections {
        let _: serde_json::Value = dst_store.add(conn).unwrap_or_default();
    }

    // Clone queries
    let src_queries: Vec<serde_json::Value> = storage::queries_storage(&session_id)
        .list()
        .unwrap_or_default();
    let dst_query_store = storage::queries_storage(&new_session_id);
    for query in &src_queries {
        let _: serde_json::Value = dst_query_store.add(query).unwrap_or_default();
    }

    Ok(new_session)
}

/// DELETE /api/session/:sessionId — Deletes a session and associated data.
#[tauri::command]
pub fn delete_session(session_id: String) -> Result<serde_json::Value, String> {
    let store = storage::sessions_storage();
    let deleted = store.delete::<serde_json::Value>(&session_id).map_err(|e| e.to_string())?;
    // Clean up connections and queries for the session
    let _ = storage::connections_storage(&session_id).set::<serde_json::Value>(&[]);
    let _ = storage::queries_storage(&session_id).set::<serde_json::Value>(&[]);
    Ok(deleted.unwrap_or(serde_json::json!({"id": session_id})))
}

// ==================== Folder Item Commands ====================

/// GET /api/folder/:folderId — Lists items in a folder.
#[tauri::command]
pub fn get_folder_items(folder_id: String) -> Result<Vec<serde_json::Value>, String> {
    let store = storage::folder_items_storage(&folder_id);
    let items: Vec<serde_json::Value> = store.list().map_err(|e| e.to_string())?;
    Ok(items)
}

/// POST /api/folder/:folderId — Adds an item to a folder.
#[tauri::command]
pub fn add_folder_item(
    folder_id: String,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let store = storage::folder_items_storage(&folder_id);
    let result: serde_json::Value = store.add(&body).map_err(|e| e.to_string())?;
    Ok(result)
}

/// PUT /api/folder/:folderId — Updates a folder item.
#[tauri::command]
pub fn update_folder_item(
    folder_id: String,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let store = storage::folder_items_storage(&folder_id);
    let result: serde_json::Value = store.update(&body).map_err(|e| e.to_string())?;
    Ok(result)
}

/// DELETE /api/folder/:folderId/:itemId — Deletes a folder item.
#[tauri::command]
pub fn delete_folder_item(folder_id: String, item_id: String) -> Result<serde_json::Value, String> {
    let store = storage::folder_items_storage(&folder_id);
    let deleted = store.delete::<serde_json::Value>(&item_id).map_err(|e| e.to_string())?;
    Ok(deleted.unwrap_or(serde_json::json!({"id": item_id})))
}

// ==================== Data Snapshot Commands ====================

/// GET /api/dataSnapshots — Lists all snapshots.
#[tauri::command]
pub fn get_data_snapshots() -> Result<Vec<serde_json::Value>, String> {
    let store = storage::data_snapshot_storage();
    let snapshots: Vec<serde_json::Value> = store.list().map_err(|e| e.to_string())?;
    Ok(snapshots)
}

/// GET /api/dataSnapshot/:dataSnapshotId — Gets a single snapshot with values.
#[tauri::command]
pub fn get_data_snapshot(data_snapshot_id: String) -> Result<serde_json::Value, String> {
    let store = storage::data_snapshot_storage();
    let mut snapshot: serde_json::Value = store
        .get(&data_snapshot_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Snapshot {} not found", data_snapshot_id))?;

    // Load values from disk
    if let Some(location) = snapshot.get("location").and_then(|v| v.as_str()) {
        match store.read_data_file(location) {
            Ok(values) => {
                snapshot["values"] = values;
            }
            Err(e) => {
                snapshot["values"] = serde_json::json!([{"error": e.to_string()}]);
            }
        }
    }
    Ok(snapshot)
}

/// POST /api/dataSnapshot — Creates a new snapshot.
#[tauri::command]
pub fn create_data_snapshot(body: serde_json::Value) -> Result<serde_json::Value, String> {
    let store = storage::data_snapshot_storage();
    let values = body.get("values").cloned().unwrap_or(serde_json::json!([]));
    let description = body
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // Generate ID and write values to disk
    let id = storage::generate_id("dataSnapshot");
    let file_name = format!("{}.json", id);
    let location = store
        .write_data_file(&file_name, &values)
        .map_err(|e| e.to_string())?;

    let entry = serde_json::json!({
        "id": id,
        "description": description,
        "location": location,
    });
    let result: serde_json::Value = store.add(&entry).map_err(|e| e.to_string())?;
    Ok(result)
}

/// DELETE /api/dataSnapshot/:dataSnapshotId — Deletes a snapshot.
#[tauri::command]
pub fn delete_data_snapshot(data_snapshot_id: String) -> Result<serde_json::Value, String> {
    let store = storage::data_snapshot_storage();
    let deleted = store
        .delete::<serde_json::Value>(&data_snapshot_id)
        .map_err(|e| e.to_string())?;
    Ok(deleted.unwrap_or(serde_json::json!({"id": data_snapshot_id})))
}

// ==================== Managed Metadata Commands ====================

/// GET /api/connection/:connectionId/managedDatabases — Lists managed databases (folders).
#[tauri::command]
pub fn get_managed_databases(connection_id: String) -> Result<Vec<serde_json::Value>, String> {
    let store = storage::managed_databases_storage(&connection_id);
    let items: Vec<serde_json::Value> = store.list().map_err(|e| e.to_string())?;
    Ok(items)
}

/// POST /api/connection/:connectionId/managedDatabase — Creates a managed database.
#[tauri::command]
pub fn create_managed_database(
    connection_id: String,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let store = storage::managed_databases_storage(&connection_id);
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("Folder")
        .to_string();
    let entry = serde_json::json!({
        "id": name,
        "name": name,
        "connectionId": connection_id,
    });
    let result: serde_json::Value = store.add(&entry).map_err(|e| e.to_string())?;
    Ok(result)
}

/// PUT /api/connection/:connectionId/managedDatabase/:managedDatabaseId — Updates a managed database.
/// Handles rename (delete old + create new + update child tables) and props-only update.
#[tauri::command]
pub fn update_managed_database(
    connection_id: String,
    managed_database_id: String,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let store = storage::managed_databases_storage(&connection_id);
    let new_name = body.get("name").and_then(|v| v.as_str()).map(String::from);
    let new_props = body.get("props").cloned();

    if let Some(ref name) = new_name {
        if name != &managed_database_id {
            // Rename: get existing, delete old, create new, update child tables
            let existing: Option<serde_json::Value> = store.get(&managed_database_id).unwrap_or(None);
            let _ = store.delete::<serde_json::Value>(&managed_database_id);

            let mut merged_props = existing
                .as_ref()
                .and_then(|e| e.get("props").cloned())
                .unwrap_or(serde_json::json!({}));
            if let Some(ref p) = new_props {
                if let (Some(base), Some(update)) = (merged_props.as_object_mut(), p.as_object()) {
                    for (k, v) in update { base.insert(k.clone(), v.clone()); }
                }
            }

            let mut new_entry = serde_json::json!({
                "id": name,
                "name": name,
                "connectionId": connection_id,
            });
            if merged_props.as_object().map_or(false, |o| !o.is_empty()) {
                new_entry["props"] = merged_props;
            }
            let result: serde_json::Value = store.add(&new_entry).map_err(|e| e.to_string())?;

            // Update child tables to reference new database name
            let table_store = storage::managed_tables_storage(&connection_id);
            let tables: Vec<serde_json::Value> = table_store.list().unwrap_or_default();
            for table in tables {
                if table.get("databaseId").and_then(|v| v.as_str()) == Some(&managed_database_id) {
                    let mut updated = table.clone();
                    updated["databaseId"] = serde_json::json!(name);
                    let _ = table_store.update(&updated);
                }
            }
            return Ok(result);
        }
    }

    if let Some(props) = new_props {
        // Props-only update (e.g., folder variables)
        let entry: serde_json::Value = store
            .get(&managed_database_id)
            .map_err(|e| e.to_string())?
            .ok_or("Managed database not found")?;
        let mut existing_props = entry.get("props").cloned().unwrap_or(serde_json::json!({}));
        if let (Some(base), Some(update)) = (existing_props.as_object_mut(), props.as_object()) {
            for (k, v) in update { base.insert(k.clone(), v.clone()); }
        }
        let mut updated = entry;
        updated["props"] = existing_props;
        let result: serde_json::Value = store.update(&updated).map_err(|e| e.to_string())?;
        return Ok(result);
    }

    Err("`name` or `props` is required".into())
}

/// DELETE /api/connection/:connectionId/managedDatabase/:managedDatabaseId — Deletes a managed database and child tables.
#[tauri::command]
pub fn delete_managed_database(
    connection_id: String,
    managed_database_id: String,
) -> Result<serde_json::Value, String> {
    // Delete child tables first
    let tables_store = storage::managed_tables_storage(&connection_id);
    let all_tables: Vec<serde_json::Value> = tables_store.list().unwrap_or_default();
    for table in all_tables {
        if table.get("databaseId").and_then(|v| v.as_str()) == Some(&managed_database_id) {
            if let Some(id) = table.get("id").and_then(|v| v.as_str()) {
                let _ = tables_store.delete::<serde_json::Value>(id);
            }
        }
    }

    let store = storage::managed_databases_storage(&connection_id);
    let _ = store.delete::<serde_json::Value>(&managed_database_id);
    Ok(serde_json::json!({"id": managed_database_id}))
}

/// GET /api/connection/:connectionId/managedDatabase/:managedDatabaseId — Gets a single managed database.
#[tauri::command]
pub fn get_managed_database(
    connection_id: String,
    managed_database_id: String,
) -> Result<serde_json::Value, String> {
    let store = storage::managed_databases_storage(&connection_id);
    store
        .get(&managed_database_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Managed database not found".into())
}

/// GET /api/connection/:connectionId/managedTables — Lists managed tables.
#[tauri::command]
pub fn get_managed_tables(connection_id: String) -> Result<Vec<serde_json::Value>, String> {
    let store = storage::managed_tables_storage(&connection_id);
    let items: Vec<serde_json::Value> = store.list().map_err(|e| e.to_string())?;
    Ok(items)
}

/// POST /api/connection/:connectionId/database/:databaseId/managedTable — Creates a managed table.
#[tauri::command]
pub fn create_managed_table(
    connection_id: String,
    database_id: String,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let store = storage::managed_tables_storage(&connection_id);
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("New Request")
        .to_string();
    let entry = serde_json::json!({
        "name": name,
        "connectionId": connection_id,
        "databaseId": database_id,
    });
    let result: serde_json::Value = store.add(&entry).map_err(|e| e.to_string())?;
    Ok(result)
}

/// GET /api/connection/:connectionId/database/:databaseId/managedTable/:managedTableId — Gets a single managed table.
#[tauri::command]
pub fn get_managed_table(
    connection_id: String,
    database_id: String,
    managed_table_id: String,
) -> Result<serde_json::Value, String> {
    let store = storage::managed_tables_storage(&connection_id);
    let entry: serde_json::Value = store
        .get(&managed_table_id)
        .map_err(|e| e.to_string())?
        .ok_or("Managed table not found")?;
    if entry.get("databaseId").and_then(|v| v.as_str()) != Some(&database_id) {
        return Err("Managed table not found".into());
    }
    Ok(entry)
}

/// PUT /api/connection/:connectionId/database/:databaseId/managedTable/:managedTableId — Updates a managed table.
/// Merges props with existing props (does not overwrite).
#[tauri::command]
pub fn update_managed_table(
    connection_id: String,
    database_id: String,
    managed_table_id: String,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let store = storage::managed_tables_storage(&connection_id);
    let entry: serde_json::Value = store
        .get(&managed_table_id)
        .map_err(|e| e.to_string())?
        .ok_or("Managed table not found")?;

    // Verify databaseId matches
    if entry.get("databaseId").and_then(|v| v.as_str()) != Some(&database_id) {
        return Err("Managed table not found".into());
    }

    let mut updated = entry;
    if let Some(name) = body.get("name").and_then(|v| v.as_str()) {
        updated["name"] = serde_json::json!(name);
    }
    if let Some(props) = body.get("props") {
        let mut existing_props = updated.get("props").cloned().unwrap_or(serde_json::json!({}));
        if let (Some(base), Some(update)) = (existing_props.as_object_mut(), props.as_object()) {
            for (k, v) in update { base.insert(k.clone(), v.clone()); }
        }
        updated["props"] = existing_props;
    }
    let result: serde_json::Value = store.update(&updated).map_err(|e| e.to_string())?;
    Ok(result)
}

/// DELETE /api/connection/:connectionId/database/:databaseId/managedTable/:managedTableId — Deletes a managed table.
#[tauri::command]
pub fn delete_managed_table(
    connection_id: String,
    _database_id: String,
    managed_table_id: String,
) -> Result<serde_json::Value, String> {
    let store = storage::managed_tables_storage(&connection_id);
    let _ = store.delete::<serde_json::Value>(&managed_table_id);
    Ok(serde_json::json!({"id": managed_table_id}))
}

// ==================== Schema Search Command ====================

/// GET /api/schema/search?q= — Searches cached schema.
#[tauri::command]
pub fn search_schema(q: Option<String>) -> Result<Vec<serde_json::Value>, String> {
    let query = match q {
        Some(ref s) if !s.is_empty() => s.to_lowercase(),
        _ => return Ok(vec![]),
    };

    let cols_store = storage::cached_columns_storage();
    let all_entries: Vec<serde_json::Value> = cols_store.list().unwrap_or_default();
    let mut results = Vec::new();

    for entry in all_entries {
        if let Some(id) = entry.get("id").and_then(|v| v.as_str()) {
            let parts: Vec<&str> = id.splitn(3, ':').collect();
            if parts.len() == 3 {
                if let Some(data) = entry.get("data") {
                    if let Ok(columns) = serde_json::from_value::<Vec<ColumnMetaData>>(data.clone())
                    {
                        for col in columns {
                            if col.name.to_lowercase().contains(&query)
                                || col.col_type.to_lowercase().contains(&query)
                                || parts[2].to_lowercase().contains(&query)
                            {
                                results.push(serde_json::json!({
                                    "connectionId": parts[0],
                                    "databaseId": parts[1],
                                    "tableId": parts[2],
                                    "column": col,
                                }));
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(results)
}

// ==================== Query Version History Commands ====================

/// GET /api/queryVersionHistory — Lists version history for session.
#[tauri::command]
pub fn get_query_version_history(session_id: String) -> Result<Vec<serde_json::Value>, String> {
    let folder_id = format!("queryHistory_{}", session_id);
    let store = storage::folder_items_storage(&folder_id);
    let items: Vec<serde_json::Value> = store.list().map_err(|e| e.to_string())?;
    Ok(items)
}

/// POST /api/queryVersionHistory — Records a query version history entry.
#[tauri::command]
pub fn add_query_version_history(
    session_id: String,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let folder_id = format!("queryHistory_{}", session_id);
    let store = storage::folder_items_storage(&folder_id);
    let result: serde_json::Value = store.add(&body).map_err(|e| e.to_string())?;
    Ok(result)
}

/// DELETE /api/queryVersionHistory/:entryId — Deletes a history entry.
#[tauri::command]
pub fn delete_query_version_history_entry(
    session_id: String,
    entry_id: String,
) -> Result<serde_json::Value, String> {
    let folder_id = format!("queryHistory_{}", session_id);
    let store = storage::folder_items_storage(&folder_id);
    let deleted = store.delete::<serde_json::Value>(&entry_id).map_err(|e| e.to_string())?;
    Ok(deleted.unwrap_or(serde_json::json!({"id": entry_id})))
}

/// DELETE /api/queryVersionHistory — Clears all history for session.
#[tauri::command]
pub fn clear_query_version_history(session_id: String) -> Result<Vec<serde_json::Value>, String> {
    let folder_id = format!("queryHistory_{}", session_id);
    let store = storage::folder_items_storage(&folder_id);
    let _ = store.set::<serde_json::Value>(&[]);
    Ok(vec![])
}

// ==================== Session Ping Commands ====================

/// POST /api/sessions/ping — Records a ping for the calling window.
#[tauri::command]
pub fn ping_session(window_id: String, session_id: String) -> Result<serde_json::Value, String> {
    cache::sessions::open(&window_id, &session_id);
    Ok(serde_json::json!({"success": true}))
}

/// GET /api/sessions/opened — Returns opened sessions.
#[tauri::command]
pub fn get_opened_sessions() -> Result<Vec<serde_json::Value>, String> {
    let opened = cache::sessions::get_opened();
    let result: Vec<serde_json::Value> = opened
        .into_iter()
        .map(|(window_id, session_id)| {
            serde_json::json!({"windowId": window_id, "sessionId": session_id})
        })
        .collect();
    Ok(result)
}

// ==================== Backup Command ====================

/// GET /api/backup/database — Returns the database file for download.
#[tauri::command]
pub fn backup_database() -> Result<Vec<u8>, String> {
    let db_path = storage::get_storage_dir().join("sqlui-native-storage.db");
    std::fs::read(&db_path).map_err(|e| format!("Failed to read database file: {}", e))
}

// ==================== Helpers ====================

/// Clears all caches for a connection.
fn clear_caches_for_connection(connection_id: &str) {
    let db_key = format!("databases:{}", connection_id);
    let _ = storage::cached_databases_storage().delete::<serde_json::Value>(&db_key);

    // Clear all tables and columns
    let tables_store = storage::cached_tables_storage();
    let all_tables: Vec<serde_json::Value> = tables_store.list().unwrap_or_default();
    for entry in &all_tables {
        if let Some(id) = entry.get("id").and_then(|v| v.as_str()) {
            if id.contains(connection_id) {
                let _ = tables_store.delete::<serde_json::Value>(id);
            }
        }
    }

    let cols_store = storage::cached_columns_storage();
    let all_cols: Vec<serde_json::Value> = cols_store.list().unwrap_or_default();
    for entry in &all_cols {
        if let Some(id) = entry.get("id").and_then(|v| v.as_str()) {
            if id.starts_with(connection_id) {
                let _ = cols_store.delete::<serde_json::Value>(id);
            }
        }
    }
}
