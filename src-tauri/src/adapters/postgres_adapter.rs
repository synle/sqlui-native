//! PostgreSQL adapter using sqlx for async database access.
use async_trait::async_trait;
use std::collections::HashMap;
use tokio::sync::RwLock;
use url::Url;

use crate::error::AppError;
use crate::types::*;

use super::DataAdapter;

/// System databases to exclude from getDatabases() results.
const SYSTEM_DATABASES: &[&str] = &["template0", "template1"];

/// Data adapter for PostgreSQL databases using the sqlx driver.
/// Maintains a map of connection pools keyed by database name, since
/// PostgreSQL does not support USE statements to switch databases on
/// an existing connection.
pub struct PostgresAdapter {
    /// The raw connection string provided by the user.
    connection_string: String,
    /// Parsed connection URL components for rebuilding per-database URLs.
    base_url: Url,
    /// Map of database name to sqlx connection pool. Uses RwLock for interior
    /// mutability so `&self` methods can lazily create pools.
    pools: RwLock<HashMap<String, sqlx::PgPool>>,
}

impl PostgresAdapter {
    /// Creates a new PostgresAdapter by parsing the connection string.
    /// Accepts both `postgres://` and `postgresql://` schemes.
    /// @param connection - The connection URL (e.g., "postgres://user:pass@host:port/database").
    pub fn new(connection: &str) -> Result<Self, AppError> {
        let normalized = if connection.starts_with("postgresql://") {
            connection.replacen("postgresql://", "postgres://", 1)
        } else {
            connection.to_string()
        };

        let base_url = Url::parse(&normalized).map_err(|e| {
            AppError::Connection(format!("Invalid PostgreSQL connection string: {}", e))
        })?;

        Ok(Self {
            connection_string: normalized,
            base_url,
            pools: RwLock::new(HashMap::new()),
        })
    }

    /// Returns an existing pool for the given database, or creates one.
    /// PostgreSQL requires a separate connection per database, so each
    /// database gets its own pool with the URL path rewritten.
    async fn get_pool(&self, database: Option<&str>) -> Result<sqlx::PgPool, AppError> {
        let cache_key = database.unwrap_or("__default__").to_string();

        // Check if pool already exists (read lock).
        {
            let pools = self.pools.read().await;
            if let Some(pool) = pools.get(&cache_key) {
                return Ok(pool.clone());
            }
        }

        // Build the connection URL for the target database.
        let connect_url = if let Some(db) = database {
            let mut url = self.base_url.clone();
            url.set_path(&format!("/{}", db));
            url.to_string()
        } else {
            self.connection_string.clone()
        };

        let pool = sqlx::PgPool::connect(&connect_url).await.map_err(|e| {
            AppError::Connection(format!(
                "PostgresAdapter: failed to connect to database '{}': {}",
                cache_key, e
            ))
        })?;

        // Store under write lock.
        let mut pools = self.pools.write().await;
        pools.insert(cache_key, pool.clone());

        Ok(pool)
    }
}

#[async_trait]
impl DataAdapter for PostgresAdapter {
    /// Returns the PostgreSQL dialect identifier.
    fn dialect(&self) -> Option<Dialect> {
        Some(Dialect::Postgres)
    }

    /// Validates the connection by running `SELECT 1` on the default database.
    async fn authenticate(&mut self) -> Result<(), AppError> {
        let pool = self.get_pool(None).await?;
        sqlx::query("SELECT 1")
            .execute(&pool)
            .await
            .map_err(|e| AppError::Connection(format!("PostgresAdapter:authenticate: {}", e)))?;
        Ok(())
    }

    /// Retrieves all non-system databases from pg_database.
    async fn get_databases(&self) -> Result<Vec<DatabaseMetaData>, AppError> {
        let pool = self.get_pool(None).await?;

        let rows: Vec<(String,)> =
            sqlx::query_as("SELECT datname AS database FROM pg_database")
                .fetch_all(&pool)
                .await
                .map_err(|e| {
                    AppError::Query(format!("PostgresAdapter:get_databases: {}", e))
                })?;

        let mut databases: Vec<DatabaseMetaData> = rows
            .into_iter()
            .map(|(name,)| name)
            .filter(|name| !SYSTEM_DATABASES.contains(&name.to_lowercase().as_str()))
            .map(|name| DatabaseMetaData {
                name,
                tables: vec![],
            })
            .collect();

        databases.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        Ok(databases)
    }

    /// Retrieves all tables in the public schema for a given database.
    /// @param database - The database name.
    async fn get_tables(&self, database: Option<&str>) -> Result<Vec<TableMetaData>, AppError> {
        let pool = self.get_pool(database).await?;

        let rows: Vec<(String,)> = sqlx::query_as(
            "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
        )
        .fetch_all(&pool)
        .await
        .map_err(|e| AppError::Query(format!("PostgresAdapter:get_tables: {}", e)))?;

        let mut tables: Vec<TableMetaData> = rows
            .into_iter()
            .map(|(name,)| TableMetaData {
                id: None,
                name,
                columns: vec![],
            })
            .collect();

        tables.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        Ok(tables)
    }

    /// Retrieves column metadata for a table, including primary key, unique,
    /// nullable status, and foreign key references via information_schema.
    /// @param table - The table name.
    /// @param database - The database name.
    async fn get_columns(
        &self,
        table: &str,
        database: Option<&str>,
    ) -> Result<Vec<ColumnMetaData>, AppError> {
        let pool = self.get_pool(database).await?;

        let mut columns: Vec<ColumnMetaData> = Vec::new();

        // Fetch column definitions with PK and UNIQUE detection.
        let col_rows: Vec<(String, String, String, Option<String>, bool, bool)> = sqlx::query_as(
            r#"SELECT
                c.column_name AS name,
                c.data_type AS type,
                c.is_nullable,
                c.column_default,
                CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END AS primary_key,
                CASE WHEN uc.constraint_type = 'UNIQUE' THEN true ELSE false END AS is_unique
            FROM information_schema.columns c
            LEFT JOIN information_schema.key_column_usage kcu
                ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name AND c.table_schema = kcu.table_schema
            LEFT JOIN information_schema.table_constraints tc
                ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = c.table_schema
            LEFT JOIN information_schema.table_constraints uc
                ON kcu.constraint_name = uc.constraint_name AND uc.constraint_type = 'UNIQUE' AND uc.table_schema = c.table_schema
            WHERE c.table_name = $1 AND c.table_schema = 'public'
            ORDER BY c.ordinal_position"#,
        )
        .bind(table)
        .fetch_all(&pool)
        .await
        .map_err(|e| AppError::Query(format!("PostgresAdapter:get_columns:columns: {}", e)))?;

        for (name, col_type, is_nullable, column_default, primary_key, is_unique) in &col_rows {
            let auto_increment = column_default
                .as_ref()
                .map(|d| d.starts_with("nextval("))
                .unwrap_or(false);

            columns.push(ColumnMetaData {
                name: name.clone(),
                col_type: col_type.to_uppercase(),
                allow_null: Some(is_nullable == "YES"),
                primary_key: Some(*primary_key),
                auto_increment: if auto_increment { Some(true) } else { None },
                comment: None,
                references: None,
                nested: None,
                property_path: None,
                kind: None,
                referenced_table_name: None,
                referenced_column_name: None,
                extra: HashMap::new(),
            });
        }

        // Fetch foreign key references.
        let fk_rows: Vec<(String, String, String)> = sqlx::query_as(
            r#"SELECT
                kcu.column_name,
                ccu.table_name AS referenced_table_name,
                ccu.column_name AS referenced_column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
            WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'"#,
        )
        .bind(table)
        .fetch_all(&pool)
        .await
        .map_err(|e| AppError::Query(format!("PostgresAdapter:get_columns:foreignKeys: {}", e)))?;

        for (column_name, ref_table, ref_column) in &fk_rows {
            if let Some(col) = columns.iter_mut().find(|c| &c.name == column_name) {
                col.kind = Some("foreign_key".to_string());
                col.referenced_table_name = Some(ref_table.clone());
                col.referenced_column_name = Some(ref_column.clone());
            }
        }

        Ok(columns)
    }

    /// Executes a raw SQL query against the specified database.
    /// Returns rows as JSON for SELECT-like queries, or affected row count
    /// for DML statements.
    /// @param sql - The SQL query string.
    /// @param database - The target database name.
    /// @param _table - Unused for relational adapters.
    async fn execute(
        &self,
        sql: &str,
        database: Option<&str>,
        _table: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        let pool = self.get_pool(database).await?;

        // Use sqlx::query to get raw rows.
        let result = sqlx::query(sql).fetch_all(&pool).await;

        match result {
            Ok(rows) => {
                if rows.is_empty() {
                    // Likely a DML statement; try to get affected rows via execute.
                    let exec_result = sqlx::query(sql).execute(&pool).await;
                    match exec_result {
                        Ok(r) => Ok(QueryResult {
                            ok: true,
                            raw: Some(vec![]),
                            meta: None,
                            error: None,
                            affected_rows: Some(r.rows_affected() as i64),
                        }),
                        Err(_) => Ok(QueryResult {
                            ok: true,
                            raw: Some(vec![]),
                            meta: None,
                            error: None,
                            affected_rows: None,
                        }),
                    }
                } else {
                    // Convert PgRow → serde_json::Value.
                    let json_rows = pg_rows_to_json(&rows);
                    Ok(QueryResult {
                        ok: true,
                        raw: Some(json_rows),
                        meta: None,
                        error: None,
                        affected_rows: None,
                    })
                }
            }
            Err(e) => {
                // Query might be a non-SELECT statement (INSERT/UPDATE/DELETE).
                // Try execute instead.
                let exec_result = sqlx::query(sql).execute(&pool).await;
                match exec_result {
                    Ok(r) => Ok(QueryResult {
                        ok: true,
                        raw: None,
                        meta: None,
                        error: None,
                        affected_rows: Some(r.rows_affected() as i64),
                    }),
                    Err(_) => Ok(QueryResult {
                        ok: false,
                        raw: None,
                        meta: None,
                        error: Some(serde_json::json!({ "message": e.to_string() })),
                        affected_rows: None,
                    }),
                }
            }
        }
    }

    /// Closes all connection pools and clears the pool map.
    async fn disconnect(&mut self) -> Result<(), AppError> {
        let mut pools = self.pools.write().await;
        for (_key, pool) in pools.drain() {
            pool.close().await;
        }
        Ok(())
    }
}

/// Converts a slice of sqlx PgRows into a Vec of serde_json::Value objects.
/// Each row becomes a JSON object with column names as keys.
fn pg_rows_to_json(rows: &[sqlx::postgres::PgRow]) -> Vec<serde_json::Value> {
    use sqlx::Column;
    use sqlx::Row;
    use sqlx::TypeInfo;

    rows.iter()
        .map(|row| {
            let mut map = serde_json::Map::new();
            for col in row.columns() {
                let name = col.name().to_string();
                let type_name = col.type_info().name();
                let value = pg_column_to_json(row, col.ordinal(), type_name);
                map.insert(name, value);
            }
            serde_json::Value::Object(map)
        })
        .collect()
}

/// Extracts a single column value from a PgRow and converts it to a
/// serde_json::Value based on the PostgreSQL type name.
/// @param row - The sqlx PgRow.
/// @param ordinal - The column index.
/// @param type_name - The PostgreSQL type name (e.g., "INT4", "TEXT", "BOOL").
fn pg_column_to_json(
    row: &sqlx::postgres::PgRow,
    ordinal: usize,
    type_name: &str,
) -> serde_json::Value {
    use sqlx::Row;

    // Try to decode based on type; fall back to string representation.
    match type_name {
        "BOOL" => row
            .try_get::<Option<bool>, _>(ordinal)
            .ok()
            .flatten()
            .map(serde_json::Value::Bool)
            .unwrap_or(serde_json::Value::Null),
        "INT2" => row
            .try_get::<Option<i16>, _>(ordinal)
            .ok()
            .flatten()
            .map(|v| serde_json::Value::Number(v.into()))
            .unwrap_or(serde_json::Value::Null),
        "INT4" => row
            .try_get::<Option<i32>, _>(ordinal)
            .ok()
            .flatten()
            .map(|v| serde_json::Value::Number(v.into()))
            .unwrap_or(serde_json::Value::Null),
        "INT8" => row
            .try_get::<Option<i64>, _>(ordinal)
            .ok()
            .flatten()
            .map(|v| serde_json::Value::Number(v.into()))
            .unwrap_or(serde_json::Value::Null),
        "FLOAT4" => row
            .try_get::<Option<f32>, _>(ordinal)
            .ok()
            .flatten()
            .and_then(|v| serde_json::Number::from_f64(v as f64))
            .map(serde_json::Value::Number)
            .unwrap_or(serde_json::Value::Null),
        "FLOAT8" | "NUMERIC" => row
            .try_get::<Option<f64>, _>(ordinal)
            .ok()
            .flatten()
            .and_then(|v| serde_json::Number::from_f64(v))
            .map(serde_json::Value::Number)
            .unwrap_or(serde_json::Value::Null),
        "JSON" | "JSONB" => row
            .try_get::<Option<serde_json::Value>, _>(ordinal)
            .ok()
            .flatten()
            .unwrap_or(serde_json::Value::Null),
        _ => {
            // Default: try as String, then fall back to Null.
            row.try_get::<Option<String>, _>(ordinal)
                .ok()
                .flatten()
                .map(serde_json::Value::String)
                .unwrap_or(serde_json::Value::Null)
        }
    }
}
