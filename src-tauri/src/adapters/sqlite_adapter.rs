/** SQLite adapter using rusqlite for synchronous, high-performance database access. */
use async_trait::async_trait;
use regex::Regex;
use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

use crate::error::AppError;
use crate::types::*;

use super::DataAdapter;

/// Regex matching SQL statements that return rows (SELECT, PRAGMA, EXPLAIN, WITH).
fn is_select_like(sql: &str) -> bool {
    lazy_static_regex().is_match(sql)
}

/// Returns a compiled regex for detecting read-only SQL statements.
fn lazy_static_regex() -> &'static Regex {
    use std::sync::OnceLock;
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)^\s*(SELECT|PRAGMA|EXPLAIN|WITH)\b").unwrap())
}

/// Data adapter for SQLite databases using rusqlite.
/// Wraps synchronous rusqlite operations behind the async DataAdapter trait
/// using `tokio::task::spawn_blocking`.
pub struct SqliteAdapter {
    /// The raw connection string (e.g., "sqlite:///path/to/db" or "sqlite://:memory:").
    connection_string: String,
    /// The file path extracted from the connection string.
    storage_path: String,
    /// The underlying rusqlite connection, wrapped in a Mutex for Send + Sync safety.
    connection: Mutex<Option<Connection>>,
}

impl SqliteAdapter {
    /// Creates a new SqliteAdapter by parsing the connection string.
    /// Does not open the database until `authenticate()` is called.
    /// @param connection - The full connection URL (e.g., "sqlite:///path.db" or "sqlite://:memory:").
    pub fn new(connection: &str) -> Result<Self, AppError> {
        let storage_path = connection.replace("sqlite://", "").replace('\\', "/");

        if storage_path.is_empty() {
            return Err(AppError::Connection(
                "SQLite connection string must include a file path or :memory:".to_string(),
            ));
        }

        Ok(Self {
            connection_string: connection.to_string(),
            storage_path,
            connection: Mutex::new(None),
        })
    }

    /// Opens the SQLite database file and stores the connection.
    /// Validates the parent directory exists for file-based databases.
    fn open_connection(&self) -> Result<(), AppError> {
        let mut guard = self.connection.lock().map_err(|e| {
            AppError::Connection(format!("SqliteAdapter: failed to acquire lock: {}", e))
        })?;

        if guard.is_some() {
            return Ok(());
        }

        // Validate parent directory for non-memory databases
        if self.storage_path != ":memory:" {
            let path = Path::new(&self.storage_path);
            if let Some(parent) = path.parent() {
                if !parent.as_os_str().is_empty() && !parent.exists() {
                    return Err(AppError::Connection(format!(
                        "SQLite database parent directory not found: {}",
                        parent.display()
                    )));
                }
            }
        }

        let conn = Connection::open(&self.storage_path).map_err(|e| {
            AppError::Connection(format!(
                "SqliteAdapter: failed to open '{}': {}",
                self.storage_path, e
            ))
        })?;

        *guard = Some(conn);
        Ok(())
    }

    /// Runs a closure with access to the underlying rusqlite Connection.
    /// Returns an error if the connection has not been opened yet.
    fn with_connection<F, T>(&self, f: F) -> Result<T, AppError>
    where
        F: FnOnce(&Connection) -> Result<T, AppError>,
    {
        let guard = self.connection.lock().map_err(|e| {
            AppError::Connection(format!("SqliteAdapter: failed to acquire lock: {}", e))
        })?;

        match guard.as_ref() {
            Some(conn) => f(conn),
            None => Err(AppError::Connection(
                "SqliteAdapter: not connected. Call authenticate() first.".to_string(),
            )),
        }
    }
}

#[async_trait]
impl DataAdapter for SqliteAdapter {
    /// Returns the SQLite dialect identifier.
    fn dialect(&self) -> Option<Dialect> {
        Some(Dialect::Sqlite)
    }

    /// Opens and validates the SQLite database file.
    async fn authenticate(&mut self) -> Result<(), AppError> {
        let connection_string = self.connection_string.clone();
        let storage_path = self.storage_path.clone();

        // Open connection in blocking context since rusqlite is synchronous
        self.open_connection().map_err(|e| {
            AppError::Connection(format!(
                "SqliteAdapter:authenticate: failed for '{}': {}",
                storage_path, e
            ))
        })?;

        // Verify the connection works by running a trivial query
        self.with_connection(|conn| {
            conn.execute_batch("SELECT 1").map_err(|e| {
                AppError::Connection(format!(
                    "SqliteAdapter:authenticate: validation failed for '{}': {}",
                    connection_string, e
                ))
            })
        })?;

        Ok(())
    }

    /// Returns a hardcoded single-database list since SQLite has no concept of multiple databases.
    async fn get_databases(&self) -> Result<Vec<DatabaseMetaData>, AppError> {
        Ok(vec![DatabaseMetaData {
            name: "Sqlite".to_string(),
            tables: vec![],
        }])
    }

    /// Retrieves all user tables from the SQLite database.
    /// Excludes internal sqlite_* system tables.
    async fn get_tables(&self, _database: Option<&str>) -> Result<Vec<TableMetaData>, AppError> {
        self.with_connection(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT name AS tablename FROM sqlite_master \
                     WHERE type='table' AND name NOT LIKE '%sqlite%' \
                     ORDER BY tablename",
                )
                .map_err(|e| AppError::Query(format!("SqliteAdapter:get_tables: {}", e)))?;

            let rows = stmt
                .query_map([], |row| row.get::<_, String>(0))
                .map_err(|e| AppError::Query(format!("SqliteAdapter:get_tables: {}", e)))?;

            let mut tables: Vec<TableMetaData> = Vec::new();
            for row in rows {
                let name =
                    row.map_err(|e| AppError::Query(format!("SqliteAdapter:get_tables: {}", e)))?;
                tables.push(TableMetaData {
                    id: None,
                    name,
                    columns: vec![],
                });
            }

            tables.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
            Ok(tables)
        })
    }

    /// Retrieves column metadata for a table using PRAGMA table_info and foreign_key_list.
    /// Maps notnull=0 to allowNull=true and pk>0 to primaryKey=true.
    async fn get_columns(
        &self,
        table: &str,
        _database: Option<&str>,
    ) -> Result<Vec<ColumnMetaData>, AppError> {
        let table = table.to_string();

        self.with_connection(|conn| {
            let mut columns: Vec<ColumnMetaData> = Vec::new();

            // Fetch column schema via PRAGMA table_info
            {
                let mut stmt = conn
                    .prepare(&format!("PRAGMA table_info(`{}`)", table))
                    .map_err(|e| {
                        AppError::Query(format!("SqliteAdapter:get_columns:table_info: {}", e))
                    })?;

                let rows = stmt
                    .query_map([], |row| {
                        Ok((
                            row.get::<_, String>(1)?, // name
                            row.get::<_, String>(2)?, // type
                            row.get::<_, i32>(3)?,    // notnull
                            row.get::<_, i32>(5)?,    // pk
                        ))
                    })
                    .map_err(|e| {
                        AppError::Query(format!("SqliteAdapter:get_columns:table_info: {}", e))
                    })?;

                for row in rows {
                    let (name, col_type, notnull, pk) = row.map_err(|e| {
                        AppError::Query(format!("SqliteAdapter:get_columns:table_info: {}", e))
                    })?;

                    columns.push(ColumnMetaData {
                        name,
                        col_type,
                        allow_null: Some(notnull == 0),
                        primary_key: Some(pk > 0),
                        auto_increment: None,
                        comment: None,
                        references: None,
                        nested: None,
                        property_path: None,
                        kind: None,
                        referenced_table_name: None,
                        referenced_column_name: None,
                        extra: Default::default(),
                    });
                }
            }

            // Fetch foreign key references via PRAGMA foreign_key_list
            {
                let fk_result = conn.prepare(&format!("PRAGMA foreign_key_list(`{}`)", table));

                if let Ok(mut fk_stmt) = fk_result {
                    let fk_rows = fk_stmt.query_map([], |row| {
                        Ok((
                            row.get::<_, String>(3)?, // from (local column)
                            row.get::<_, String>(2)?, // table (referenced table)
                            row.get::<_, String>(4)?, // to (referenced column)
                        ))
                    });

                    if let Ok(fk_rows) = fk_rows {
                        for fk_row in fk_rows {
                            if let Ok((from, ref_table, ref_column)) = fk_row {
                                if let Some(col) = columns.iter_mut().find(|c| c.name == from) {
                                    col.kind = Some("foreign_key".to_string());
                                    col.referenced_table_name = Some(ref_table);
                                    col.referenced_column_name = Some(ref_column);
                                }
                            }
                        }
                    }
                }
            }

            Ok(columns)
        })
    }

    /// Executes a SQL statement against the SQLite database.
    /// Auto-detects SELECT/PRAGMA/EXPLAIN/WITH queries (returns rows) vs mutations (returns affected rows).
    async fn execute(
        &self,
        sql: &str,
        _database: Option<&str>,
        _table: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        let sql = sql.to_string();

        self.with_connection(|conn| {
            if is_select_like(&sql) {
                // Read query: return result rows as JSON values
                let mut stmt = conn
                    .prepare(&sql)
                    .map_err(|e| AppError::Query(format!("SqliteAdapter:execute: {}", e)))?;

                let column_names: Vec<String> =
                    stmt.column_names().iter().map(|s| s.to_string()).collect();

                let rows = stmt
                    .query_map([], |row| {
                        let mut map = serde_json::Map::new();
                        for (i, col_name) in column_names.iter().enumerate() {
                            let value = sqlite_value_to_json(row, i);
                            map.insert(col_name.clone(), value);
                        }
                        Ok(serde_json::Value::Object(map))
                    })
                    .map_err(|e| AppError::Query(format!("SqliteAdapter:execute: {}", e)))?;

                let mut result_rows: Vec<serde_json::Value> = Vec::new();
                for row in rows {
                    let value =
                        row.map_err(|e| AppError::Query(format!("SqliteAdapter:execute: {}", e)))?;
                    result_rows.push(value);
                }

                Ok(QueryResult {
                    ok: true,
                    raw: Some(result_rows),
                    meta: None,
                    error: None,
                    affected_rows: None,
                })
            } else {
                // Write query: return affected row count
                let changes = conn
                    .execute(&sql, [])
                    .map_err(|e| AppError::Query(format!("SqliteAdapter:execute: {}", e)))?;

                Ok(QueryResult {
                    ok: true,
                    raw: None,
                    meta: None,
                    error: None,
                    affected_rows: Some(changes as i64),
                })
            }
        })
    }

    /// Closes the SQLite database connection and releases resources.
    async fn disconnect(&mut self) -> Result<(), AppError> {
        let mut guard = self.connection.lock().map_err(|e| {
            AppError::Connection(format!(
                "SqliteAdapter:disconnect: failed to acquire lock: {}",
                e
            ))
        })?;

        if let Some(conn) = guard.take() {
            // rusqlite::Connection::close returns Result<(), (Connection, Error)>
            if let Err((_conn, e)) = conn.close() {
                log::error!("SqliteAdapter:disconnect: {}", e);
            }
        }

        Ok(())
    }
}

/// Converts a rusqlite row value at the given column index to a serde_json::Value.
/// Handles INTEGER, REAL, TEXT, BLOB, and NULL types gracefully.
fn sqlite_value_to_json(row: &rusqlite::Row, idx: usize) -> serde_json::Value {
    // Try integer first, then float, then string, then blob, then null
    if let Ok(v) = row.get::<_, i64>(idx) {
        return serde_json::Value::Number(serde_json::Number::from(v));
    }
    if let Ok(v) = row.get::<_, f64>(idx) {
        if let Some(n) = serde_json::Number::from_f64(v) {
            return serde_json::Value::Number(n);
        }
        return serde_json::Value::Null;
    }
    if let Ok(v) = row.get::<_, String>(idx) {
        return serde_json::Value::String(v);
    }
    if let Ok(v) = row.get::<_, Vec<u8>>(idx) {
        // Represent blobs as base64-encoded strings
        use std::fmt::Write;
        let mut hex = String::with_capacity(v.len() * 2);
        for byte in &v {
            let _ = write!(hex, "{:02x}", byte);
        }
        return serde_json::Value::String(format!("0x{}", hex));
    }
    serde_json::Value::Null
}
