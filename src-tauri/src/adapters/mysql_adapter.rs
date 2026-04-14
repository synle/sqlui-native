/** MySQL/MariaDB adapter using sqlx with the mysql feature for async database access. */
use async_trait::async_trait;
use sqlx::mysql::{MySqlPool, MySqlPoolOptions, MySqlRow};
use sqlx::{Column, Row, TypeInfo};

use crate::error::AppError;
use crate::types::*;

use super::DataAdapter;

/// System databases excluded from getDatabases() results.
const SYSTEM_DATABASES: &[&str] = &["information_schema", "performance_schema", "mysql", "sys"];

/// Data adapter for MySQL and MariaDB databases using sqlx.
/// Handles both mysql:// and mariadb:// connection strings by normalizing
/// mariadb:// to mysql:// since they share the same wire protocol.
pub struct MysqlAdapter {
    /// The original connection string as provided by the user.
    connection_string: String,
    /// The normalized connection URL (mariadb:// replaced with mysql://).
    normalized_url: String,
    /// The detected dialect (Mysql or Mariadb).
    detected_dialect: Dialect,
    /// The sqlx connection pool, initialized on authenticate().
    pool: Option<MySqlPool>,
}

impl MysqlAdapter {
    /// Creates a new MysqlAdapter by parsing and normalizing the connection string.
    /// Does not connect to the database until `authenticate()` is called.
    /// @param connection - The full connection URL (e.g., "mysql://root:pass@localhost:3306" or "mariadb://...").
    pub fn new(connection: &str) -> Result<Self, AppError> {
        let detected_dialect = if connection.starts_with("mariadb://") {
            Dialect::Mariadb
        } else {
            Dialect::Mysql
        };

        // Normalize mariadb:// to mysql:// for sqlx compatibility
        let normalized_url = connection.replace("mariadb://", "mysql://");

        Ok(Self {
            connection_string: connection.to_string(),
            normalized_url,
            detected_dialect,
            pool: None,
        })
    }

    /// Returns a reference to the connection pool, or an error if not yet authenticated.
    fn get_pool(&self) -> Result<&MySqlPool, AppError> {
        self.pool.as_ref().ok_or_else(|| {
            AppError::Connection(
                "MysqlAdapter: not connected. Call authenticate() first.".to_string(),
            )
        })
    }

    /// Creates and stores a new sqlx MySqlPool from the normalized connection URL.
    async fn create_pool(&mut self) -> Result<(), AppError> {
        if self.pool.is_some() {
            return Ok(());
        }

        let pool = MySqlPoolOptions::new()
            .max_connections(5)
            .connect(&self.normalized_url)
            .await
            .map_err(|e| AppError::Connection(format!("MysqlAdapter:create_pool: {}", e)))?;

        self.pool = Some(pool);
        Ok(())
    }
}

#[async_trait]
impl DataAdapter for MysqlAdapter {
    /// Returns the detected dialect (Mysql or Mariadb).
    fn dialect(&self) -> Option<Dialect> {
        Some(self.detected_dialect.clone())
    }

    /// Validates the database connection by running `SELECT 1`.
    async fn authenticate(&mut self) -> Result<(), AppError> {
        self.create_pool().await?;

        let pool = self.get_pool()?;
        sqlx::query("SELECT 1")
            .execute(pool)
            .await
            .map_err(|e| AppError::Connection(format!("MysqlAdapter:authenticate: {}", e)))?;

        Ok(())
    }

    /// Lists all non-system databases via `SHOW DATABASES`, sorted alphabetically.
    async fn get_databases(&self) -> Result<Vec<DatabaseMetaData>, AppError> {
        let pool = self.get_pool()?;

        let rows: Vec<MySqlRow> = sqlx::query("SHOW DATABASES")
            .fetch_all(pool)
            .await
            .map_err(|e| AppError::Query(format!("MysqlAdapter:get_databases: {}", e)))?;

        let mut databases: Vec<DatabaseMetaData> = rows
            .iter()
            .filter_map(|row| {
                let name: String = row.try_get(0).ok()?;
                if SYSTEM_DATABASES.contains(&name.to_lowercase().as_str()) {
                    None
                } else {
                    Some(DatabaseMetaData {
                        name,
                        tables: vec![],
                    })
                }
            })
            .collect();

        databases.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        Ok(databases)
    }

    /// Lists all tables in a database via information_schema, sorted alphabetically.
    async fn get_tables(&self, database: Option<&str>) -> Result<Vec<TableMetaData>, AppError> {
        let pool = self.get_pool()?;
        let database = database.ok_or_else(|| {
            AppError::BadRequest("MysqlAdapter:get_tables: database name is required".to_string())
        })?;

        let rows: Vec<MySqlRow> = sqlx::query(
            "SELECT TABLE_NAME AS tablename FROM information_schema.tables \
             WHERE TABLE_SCHEMA = ? ORDER BY tablename",
        )
        .bind(database)
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Query(format!("MysqlAdapter:get_tables: {}", e)))?;

        let mut tables: Vec<TableMetaData> = rows
            .iter()
            .filter_map(|row| {
                let name: String = row.try_get("tablename").ok()?;
                Some(TableMetaData {
                    id: None,
                    name,
                    columns: vec![],
                })
            })
            .collect();

        tables.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        Ok(tables)
    }

    /// Retrieves column metadata and foreign key references for a table.
    /// Uses `SHOW FULL COLUMNS` for schema and information_schema.KEY_COLUMN_USAGE for FK info.
    async fn get_columns(
        &self,
        table: &str,
        database: Option<&str>,
    ) -> Result<Vec<ColumnMetaData>, AppError> {
        let pool = self.get_pool()?;
        let database = database.ok_or_else(|| {
            AppError::BadRequest("MysqlAdapter:get_columns: database name is required".to_string())
        })?;

        let mut columns: Vec<ColumnMetaData> = Vec::new();

        // Fetch column schema via SHOW FULL COLUMNS
        // We need to switch database context first with a USE statement,
        // then run SHOW FULL COLUMNS FROM `table`
        {
            let query = format!("SHOW FULL COLUMNS FROM `{}`.`{}`", database, table);
            let rows: Vec<MySqlRow> = sqlx::query(&query).fetch_all(pool).await.map_err(|e| {
                AppError::Query(format!("MysqlAdapter:get_columns:show_columns: {}", e))
            })?;

            for row in &rows {
                let field: String = row.try_get("Field").unwrap_or_default();
                let col_type: String = row.try_get("Type").unwrap_or_default();
                let null_str: String = row.try_get("Null").unwrap_or_default();
                let key: String = row.try_get("Key").unwrap_or_default();
                let comment: Option<String> =
                    row.try_get("Comment").ok().and_then(
                        |c: String| {
                            if c.is_empty() {
                                None
                            } else {
                                Some(c)
                            }
                        },
                    );
                let extra_field: String = row.try_get("Extra").unwrap_or_default();

                columns.push(ColumnMetaData {
                    name: field,
                    col_type,
                    allow_null: Some(null_str == "YES"),
                    primary_key: Some(key == "PRI"),
                    auto_increment: Some(extra_field.contains("auto_increment")),
                    comment,
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

        // Fetch foreign key references from information_schema
        {
            let fk_rows: Result<Vec<MySqlRow>, _> = sqlx::query(
                "SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME \
                 FROM information_schema.KEY_COLUMN_USAGE \
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? \
                 AND REFERENCED_TABLE_NAME IS NOT NULL",
            )
            .bind(database)
            .bind(table)
            .fetch_all(pool)
            .await;

            if let Ok(fk_rows) = fk_rows {
                for fk_row in &fk_rows {
                    let column_name: String = fk_row.try_get("COLUMN_NAME").unwrap_or_default();
                    let ref_table: String =
                        fk_row.try_get("REFERENCED_TABLE_NAME").unwrap_or_default();
                    let ref_column: String =
                        fk_row.try_get("REFERENCED_COLUMN_NAME").unwrap_or_default();

                    if let Some(col) = columns.iter_mut().find(|c| c.name == column_name) {
                        col.kind = Some("foreign_key".to_string());
                        col.referenced_table_name = Some(ref_table);
                        col.referenced_column_name = Some(ref_column);
                    }
                }
            } else if let Err(e) = fk_rows {
                log::error!("MysqlAdapter:get_columns:foreign_keys: {}", e);
            }
        }

        Ok(columns)
    }

    /// Executes a SQL statement against the specified database.
    /// Returns rows for SELECT-like queries and affected row counts for mutations.
    async fn execute(
        &self,
        sql: &str,
        database: Option<&str>,
        _table: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        let pool = self.get_pool()?;

        // Switch to the target database if specified
        if let Some(db) = database {
            let use_stmt = format!("USE `{}`", db);
            sqlx::query(&use_stmt).execute(pool).await.map_err(|e| {
                AppError::Query(format!("MysqlAdapter:execute:use_database: {}", e))
            })?;
        }

        // Determine if this is a read or write query
        let trimmed = sql.trim();
        let is_read = trimmed
            .split_whitespace()
            .next()
            .map(|first| {
                matches!(
                    first.to_uppercase().as_str(),
                    "SELECT" | "SHOW" | "DESCRIBE" | "DESC" | "EXPLAIN" | "WITH"
                )
            })
            .unwrap_or(false);

        if is_read {
            // Execute as a query that returns rows
            let rows: Vec<MySqlRow> = sqlx::query(sql)
                .fetch_all(pool)
                .await
                .map_err(|e| AppError::Query(format!("MysqlAdapter:execute: {}", e)))?;

            let mut result_rows: Vec<serde_json::Value> = Vec::with_capacity(rows.len());

            for row in &rows {
                let mut map = serde_json::Map::new();
                for (i, col) in row.columns().iter().enumerate() {
                    let col_name = col.name().to_string();
                    let value = mysql_value_to_json(row, i);
                    map.insert(col_name, value);
                }
                result_rows.push(serde_json::Value::Object(map));
            }

            Ok(QueryResult {
                ok: true,
                raw: Some(result_rows),
                meta: None,
                error: None,
                affected_rows: None,
            })
        } else {
            // Execute as a mutation that returns affected row count
            let result = sqlx::query(sql)
                .execute(pool)
                .await
                .map_err(|e| AppError::Query(format!("MysqlAdapter:execute: {}", e)))?;

            Ok(QueryResult {
                ok: true,
                raw: None,
                meta: None,
                error: None,
                affected_rows: Some(result.rows_affected() as i64),
            })
        }
    }

    /// Closes the MySQL connection pool and releases all resources.
    async fn disconnect(&mut self) -> Result<(), AppError> {
        if let Some(pool) = self.pool.take() {
            pool.close().await;
        }
        Ok(())
    }
}

/// Converts a sqlx MySqlRow value at the given column index to a serde_json::Value.
/// Attempts extraction in order: i64, f64, String, bytes, falling back to Null.
fn mysql_value_to_json(row: &MySqlRow, idx: usize) -> serde_json::Value {
    let col = &row.columns()[idx];
    let type_name = col.type_info().name();

    // Handle numeric types
    match type_name {
        "BOOLEAN" | "BOOL" | "TINYINT(1)" => {
            if let Ok(v) = row.try_get::<bool, _>(idx) {
                return serde_json::Value::Bool(v);
            }
        }
        "TINYINT" | "SMALLINT" | "MEDIUMINT" | "INT" | "BIGINT" | "YEAR" => {
            if let Ok(v) = row.try_get::<i64, _>(idx) {
                return serde_json::Value::Number(serde_json::Number::from(v));
            }
        }
        "TINYINT UNSIGNED" | "SMALLINT UNSIGNED" | "MEDIUMINT UNSIGNED" | "INT UNSIGNED"
        | "BIGINT UNSIGNED" => {
            if let Ok(v) = row.try_get::<u64, _>(idx) {
                return serde_json::Value::Number(serde_json::Number::from(v));
            }
            if let Ok(v) = row.try_get::<i64, _>(idx) {
                return serde_json::Value::Number(serde_json::Number::from(v));
            }
        }
        "FLOAT" | "DOUBLE" | "DECIMAL" => {
            if let Ok(v) = row.try_get::<f64, _>(idx) {
                if let Some(n) = serde_json::Number::from_f64(v) {
                    return serde_json::Value::Number(n);
                }
            }
            // Fall through to string representation for DECIMAL precision
            if let Ok(v) = row.try_get::<String, _>(idx) {
                return serde_json::Value::String(v);
            }
        }
        _ => {}
    }

    // Try string for text/date/datetime/json types
    if let Ok(v) = row.try_get::<String, _>(idx) {
        return serde_json::Value::String(v);
    }

    // Try bytes for binary/blob types
    if let Ok(v) = row.try_get::<Vec<u8>, _>(idx) {
        // Attempt UTF-8 decode; fall back to hex encoding
        match String::from_utf8(v.clone()) {
            Ok(s) => return serde_json::Value::String(s),
            Err(_) => {
                use std::fmt::Write;
                let mut hex = String::with_capacity(v.len() * 2);
                for byte in &v {
                    let _ = write!(hex, "{:02x}", byte);
                }
                return serde_json::Value::String(format!("0x{}", hex));
            }
        }
    }

    // Column value is NULL or unrecognized type
    serde_json::Value::Null
}
