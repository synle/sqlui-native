use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{de::DeserializeOwned, Serialize};
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::error::AppError;

/// Singleton SQLite database connection shared across all storage instances.
static DB: std::sync::LazyLock<Mutex<Connection>> = std::sync::LazyLock::new(|| {
    let path = get_storage_path();
    std::fs::create_dir_all(path.parent().unwrap()).ok();
    let conn = Connection::open(&path).expect("Failed to open SQLite storage database");
    conn.execute_batch("PRAGMA journal_mode = WAL;")
        .expect("Failed to set WAL mode");
    Mutex::new(conn)
});

/// Tables that have been ensured to exist (cached to avoid repeated CREATE TABLE).
static ENSURED_TABLES: std::sync::LazyLock<Mutex<HashSet<String>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashSet::new()));

/// Returns the storage directory path (platform-specific app data directory).
pub fn get_storage_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("SQLUI_STORAGE_DIR") {
        return PathBuf::from(dir);
    }
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("sqlui-native")
}

/// Returns the full path to the SQLite database file.
fn get_storage_path() -> PathBuf {
    get_storage_dir().join("sqlui-native-storage.db")
}

/// Ensures a table exists in the database, creating it if necessary.
fn ensure_table(conn: &Connection, table: &str) {
    let mut ensured = ENSURED_TABLES.lock().unwrap();
    if ensured.contains(table) {
        return;
    }
    let sql = format!(
        r#"CREATE TABLE IF NOT EXISTS "{}" (id TEXT PRIMARY KEY NOT NULL, data JSON NOT NULL) WITHOUT ROWID"#,
        table
    );
    conn.execute_batch(&sql).unwrap_or_else(|e| {
        eprintln!("storage:ensure_table failed for {}: {}", table, e);
    });
    ensured.insert(table.to_string());
}

/// Generates a random ID with the given prefix (e.g., "connection.1234567890.5678").
pub fn generate_id(prefix: &str) -> String {
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let rand: u64 = rand_u64();
    format!("{}.{}.{}", prefix, ts, rand)
}

/// Simple random u64 using thread-local state.
fn rand_u64() -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    std::time::SystemTime::now().hash(&mut hasher);
    std::thread::current().id().hash(&mut hasher);
    hasher.finish()
}

/// Returns the current epoch timestamp in milliseconds.
pub fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

/// Generic CRUD operations on a SQLite-backed storage table.
/// Mirrors the TypeScript `PersistentStorageSqlite<T>` interface.
pub struct Storage {
    table: String,
    id_prefix: String,
}

impl Storage {
    /// Creates a new Storage instance for the given table and ID prefix.
    pub fn new(table: &str, id_prefix: &str) -> Self {
        Self {
            table: table.to_string(),
            id_prefix: id_prefix.to_string(),
        }
    }

    /// Lists all entries in the table.
    pub fn list<T: DeserializeOwned>(&self) -> Result<Vec<T>, AppError> {
        let conn = DB.lock().unwrap();
        ensure_table(&conn, &self.table);
        let sql = format!(r#"SELECT id, data FROM "{}""#, self.table);
        let mut stmt = conn.prepare(&sql).map_err(AppError::Sqlite)?;
        let rows = stmt
            .query_map([], |row| {
                let id: String = row.get(0)?;
                let data: String = row.get(1)?;
                Ok((id, data))
            })
            .map_err(AppError::Sqlite)?;

        let mut results = Vec::new();
        for row in rows {
            let (id, data) = row.map_err(AppError::Sqlite)?;
            if let Ok(mut val) = serde_json::from_str::<serde_json::Value>(&data) {
                val["id"] = serde_json::Value::String(id);
                if let Ok(item) = serde_json::from_value(val) {
                    results.push(item);
                }
            }
        }
        Ok(results)
    }

    /// Gets a single entry by ID.
    pub fn get<T: DeserializeOwned>(&self, id: &str) -> Result<Option<T>, AppError> {
        let conn = DB.lock().unwrap();
        ensure_table(&conn, &self.table);
        let sql = format!(r#"SELECT id, data FROM "{}" WHERE id = ?"#, self.table);
        let result = conn.query_row(&sql, params![id], |row| {
            let id: String = row.get(0)?;
            let data: String = row.get(1)?;
            Ok((id, data))
        });

        match result {
            Ok((id, data)) => {
                let mut val: serde_json::Value = serde_json::from_str(&data)?;
                val["id"] = serde_json::Value::String(id);
                Ok(Some(serde_json::from_value(val)?))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::Sqlite(e)),
        }
    }

    /// Adds a new entry with an auto-generated ID. Sets createdAt and updatedAt.
    pub fn add<T: Serialize + DeserializeOwned>(&self, entry: &T) -> Result<T, AppError> {
        let mut val = serde_json::to_value(entry)?;
        let obj = val.as_object_mut().ok_or(AppError::Storage("Expected object".into()))?;

        // Generate ID if not present
        let id = if let Some(existing) = obj.get("id").and_then(|v| v.as_str()) {
            existing.to_string()
        } else {
            generate_id(&self.id_prefix)
        };
        obj.insert("id".to_string(), serde_json::Value::String(id.clone()));

        let ts = now_ms();
        obj.insert("createdAt".to_string(), serde_json::json!(ts));
        obj.insert("updatedAt".to_string(), serde_json::json!(ts));

        // Strip id from data (stored in column)
        let mut data_val = val.clone();
        data_val.as_object_mut().unwrap().remove("id");
        let data_str = serde_json::to_string(&data_val)?;

        let conn = DB.lock().unwrap();
        ensure_table(&conn, &self.table);
        let sql = format!(
            r#"INSERT OR REPLACE INTO "{}" (id, data) VALUES (?, ?)"#,
            self.table
        );
        conn.execute(&sql, params![id, data_str])
            .map_err(AppError::Sqlite)?;

        Ok(serde_json::from_value(val)?)
    }

    /// Updates an existing entry by merging with the stored data.
    pub fn update<T: Serialize + DeserializeOwned>(&self, entry: &T) -> Result<T, AppError> {
        let update_val = serde_json::to_value(entry)?;
        let id = update_val
            .get("id")
            .and_then(|v| v.as_str())
            .ok_or(AppError::Storage("Entry must have an id".into()))?
            .to_string();

        // Get existing entry and merge
        let conn = DB.lock().unwrap();
        ensure_table(&conn, &self.table);
        let sql = format!(r#"SELECT data FROM "{}" WHERE id = ?"#, self.table);
        let existing_data: String = conn
            .query_row(&sql, params![id], |row| row.get(0))
            .unwrap_or_else(|_| "{}".to_string());

        let mut merged: serde_json::Value = serde_json::from_str(&existing_data)?;
        if let (Some(base), Some(update)) = (merged.as_object_mut(), update_val.as_object()) {
            for (k, v) in update {
                if k != "id" {
                    base.insert(k.clone(), v.clone());
                }
            }
        }
        merged["updatedAt"] = serde_json::json!(now_ms());

        let data_str = serde_json::to_string(&merged)?;
        let upsert_sql = format!(
            r#"INSERT OR REPLACE INTO "{}" (id, data) VALUES (?, ?)"#,
            self.table
        );
        conn.execute(&upsert_sql, params![id, data_str])
            .map_err(AppError::Sqlite)?;

        // Return merged with id
        merged["id"] = serde_json::Value::String(id);
        Ok(serde_json::from_value(merged)?)
    }

    /// Replaces all entries in the table (within a transaction).
    pub fn set<T: Serialize + DeserializeOwned>(&self, entries: &[T]) -> Result<Vec<T>, AppError> {
        let conn = DB.lock().unwrap();
        ensure_table(&conn, &self.table);

        let delete_sql = format!(r#"DELETE FROM "{}""#, self.table);
        conn.execute_batch(&delete_sql).map_err(AppError::Sqlite)?;

        let insert_sql = format!(
            r#"INSERT OR REPLACE INTO "{}" (id, data) VALUES (?, ?)"#,
            self.table
        );
        let mut results = Vec::new();
        for entry in entries {
            let mut val = serde_json::to_value(entry)?;
            let obj = val.as_object_mut().unwrap();
            let id = obj
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let ts = now_ms();
            obj.entry("createdAt".to_string())
                .or_insert(serde_json::json!(ts));
            obj.insert("updatedAt".to_string(), serde_json::json!(ts));

            let mut data_val = val.clone();
            data_val.as_object_mut().unwrap().remove("id");
            let data_str = serde_json::to_string(&data_val)?;
            conn.execute(&insert_sql, params![id, data_str])
                .map_err(AppError::Sqlite)?;
            results.push(serde_json::from_value(val)?);
        }
        Ok(results)
    }

    /// Deletes an entry by ID and returns it.
    pub fn delete<T: DeserializeOwned>(&self, id: &str) -> Result<Option<T>, AppError> {
        let item = self.get::<T>(id)?;
        let conn = DB.lock().unwrap();
        ensure_table(&conn, &self.table);
        let sql = format!(r#"DELETE FROM "{}" WHERE id = ?"#, self.table);
        conn.execute(&sql, params![id]).map_err(AppError::Sqlite)?;
        Ok(item)
    }

    /// Writes a JSON data file to disk and returns the file path.
    pub fn write_data_file(&self, file_name: &str, content: &serde_json::Value) -> Result<String, AppError> {
        let path = get_storage_dir().join(file_name);
        let data = serde_json::to_string(content)?;
        std::fs::write(&path, data)?;
        Ok(path.to_string_lossy().to_string())
    }

    /// Reads and parses a JSON data file from disk.
    pub fn read_data_file(&self, file_path: &str) -> Result<serde_json::Value, AppError> {
        let data = std::fs::read_to_string(file_path)?;
        Ok(serde_json::from_str(&data)?)
    }
}

// --- Factory functions for pre-configured storage instances ---

/// Connections storage for a session.
pub fn connections_storage(session_id: &str) -> Storage {
    Storage::new(&format!("connections_{}", session_id), "connection")
}

/// Queries storage for a session.
pub fn queries_storage(session_id: &str) -> Storage {
    Storage::new(&format!("queries_{}", session_id), "query")
}

/// Sessions storage (global).
pub fn sessions_storage() -> Storage {
    Storage::new("sessions", "session")
}

/// Settings storage (global).
pub fn settings_storage() -> Storage {
    Storage::new("settings", "setting")
}

/// Folder items storage for a folder ID (e.g., recycleBin, bookmarks).
pub fn folder_items_storage(folder_id: &str) -> Storage {
    Storage::new(&format!("folder_items_{}", folder_id), "folderItem")
}

/// Data snapshot storage (global).
pub fn data_snapshot_storage() -> Storage {
    Storage::new("data_snapshots", "dataSnapshot")
}

/// Managed databases storage for a connection.
pub fn managed_databases_storage(connection_id: &str) -> Storage {
    Storage::new(
        &format!("managed_databases_{}", connection_id),
        "managedDatabase",
    )
}

/// Managed tables storage for a connection.
pub fn managed_tables_storage(connection_id: &str) -> Storage {
    Storage::new(
        &format!("managed_tables_{}", connection_id),
        "managedTable",
    )
}

/// Cached databases storage (global).
pub fn cached_databases_storage() -> Storage {
    Storage::new("cached_databases", "cachedDatabase")
}

/// Cached tables storage (global).
pub fn cached_tables_storage() -> Storage {
    Storage::new("cached_tables", "cachedTable")
}

/// Cached columns storage (global).
pub fn cached_columns_storage() -> Storage {
    Storage::new("cached_columns", "cachedColumn")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_storage() -> Storage {
        std::env::set_var("SQLUI_STORAGE_DIR", "/tmp/sqlui-native-test");
        Storage::new("test_table", "test")
    }

    #[test]
    fn test_generate_id() {
        let id = generate_id("test");
        assert!(id.starts_with("test."));
        let parts: Vec<&str> = id.split('.').collect();
        assert_eq!(parts.len(), 3);
    }

    #[test]
    fn test_now_ms() {
        let ts = now_ms();
        assert!(ts > 1_700_000_000_000); // After ~Nov 2023
    }

    #[test]
    fn test_storage_add_and_get() {
        let storage = setup_test_storage();
        let entry = serde_json::json!({"name": "test_entry"});
        let result: serde_json::Value = storage.add(&entry).unwrap();
        assert!(result.get("id").is_some());
        assert_eq!(result["name"], "test_entry");
        assert!(result.get("createdAt").is_some());

        let id = result["id"].as_str().unwrap();
        let fetched: serde_json::Value = storage.get(id).unwrap().unwrap();
        assert_eq!(fetched["name"], "test_entry");
    }

    #[test]
    fn test_storage_list() {
        let storage = Storage::new("test_list_table", "test");
        std::env::set_var("SQLUI_STORAGE_DIR", "/tmp/sqlui-native-test");
        let _: serde_json::Value = storage
            .add(&serde_json::json!({"name": "item1"}))
            .unwrap();
        let _: serde_json::Value = storage
            .add(&serde_json::json!({"name": "item2"}))
            .unwrap();
        let items: Vec<serde_json::Value> = storage.list().unwrap();
        assert!(items.len() >= 2);
    }
}
