//! MSSQL adapter using tiberius for async TDS protocol access to SQL Server.
use async_trait::async_trait;
use std::collections::HashMap;
use tiberius::{AuthMethod, Client, Column, ColumnData, Config, EncryptionLevel};
use tokio::net::TcpStream;
use tokio::sync::Mutex;
use tokio_util::compat::{Compat, TokioAsyncWriteCompatExt};
use percent_encoding::percent_decode_str;
use url::Url;

use crate::error::AppError;
use crate::types::*;

use super::DataAdapter;

/// System databases to exclude from getDatabases() results.
const SYSTEM_DATABASES: &[&str] = &["master", "tempdb", "model", "msdb"];

/// Parsed connection parameters extracted from the MSSQL connection URL.
struct MssqlConnParams {
    /// Server hostname.
    host: String,
    /// Server port (default 1433).
    port: u16,
    /// Login username.
    username: String,
    /// Login password.
    password: String,
}

/// Data adapter for MSSQL (SQL Server) databases using the tiberius driver.
/// Wraps the TDS protocol client in an async-safe Mutex for shared access.
pub struct MssqlAdapter {
    /// Parsed connection parameters for creating new connections.
    params: MssqlConnParams,
    /// The active tiberius client, wrapped in a Mutex because tiberius Client
    /// requires &mut self for query execution.
    client: Mutex<Option<Client<Compat<TcpStream>>>>,
}

impl MssqlAdapter {
    /// Creates a new MssqlAdapter by parsing the connection string.
    /// @param connection - The connection URL (e.g., "mssql://sa:password@host:1433").
    pub fn new(connection: &str) -> Result<Self, AppError> {
        let params = parse_mssql_url(connection)?;

        Ok(Self {
            params,
            client: Mutex::new(None),
        })
    }

    /// Builds a tiberius Config from the parsed connection parameters.
    /// @param database - Optional database name to set in the config.
    fn build_config(&self, database: Option<&str>) -> Result<Config, AppError> {
        let mut config = Config::new();
        config.host(&self.params.host);
        config.port(self.params.port);
        config.authentication(AuthMethod::sql_server(
            &self.params.username,
            &self.params.password,
        ));
        config.encryption(EncryptionLevel::NotSupported);
        config.trust_cert();

        if let Some(db) = database {
            config.database(db);
        }

        Ok(config)
    }

    /// Creates a new tiberius Client connected to the given database.
    /// @param database - Optional database name.
    async fn create_client(
        &self,
        database: Option<&str>,
    ) -> Result<Client<Compat<TcpStream>>, AppError> {
        let config = self.build_config(database)?;

        let addr = format!("{}:{}", self.params.host, self.params.port);
        let tcp = TcpStream::connect(&addr).await.map_err(|e| {
            AppError::Connection(format!(
                "MssqlAdapter: failed to connect to {}: {}",
                addr, e
            ))
        })?;
        tcp.set_nodelay(true).ok();

        let client = Client::connect(config, tcp.compat_write())
            .await
            .map_err(|e| {
                AppError::Connection(format!("MssqlAdapter: TDS handshake failed: {}", e))
            })?;

        Ok(client)
    }

    /// Returns the main client, creating it if it doesn't exist yet.
    async fn get_or_create_client(
        &self,
    ) -> Result<(), AppError> {
        let mut guard = self.client.lock().await;
        if guard.is_none() {
            let client = self.create_client(None).await?;
            *guard = Some(client);
        }
        Ok(())
    }

    /// Executes a SQL query using a tiberius client and returns rows as
    /// a Vec of serde_json::Map objects plus the optional affected row count.
    async fn exec_query_on(
        client: &mut Client<Compat<TcpStream>>,
        sql: &str,
    ) -> Result<(Vec<serde_json::Value>, Option<i64>), AppError> {
        let stream = client.query(sql, &[]).await.map_err(|e| {
            AppError::Query(format!("MssqlAdapter:exec_query: {}", e))
        })?;

        let query_result = stream.into_results().await.map_err(|e| {
            AppError::Query(format!("MssqlAdapter:exec_query:results: {}", e))
        })?;

        let mut all_rows: Vec<serde_json::Value> = Vec::new();
        let mut total_affected: Option<i64> = None;

        for result_set in &query_result {
            for row in result_set {
                let columns: &[Column] = row.columns();
                let mut map = serde_json::Map::new();
                for (i, col) in columns.iter().enumerate() {
                    let name = col.name().to_string();
                    let value = match row.try_get::<&str, _>(i) {
                        Ok(Some(s)) => serde_json::Value::String(s.to_string()),
                        _ => match row.try_get::<i32, _>(i) {
                            Ok(Some(n)) => serde_json::json!(n),
                            _ => match row.try_get::<i64, _>(i) {
                                Ok(Some(n)) => serde_json::json!(n),
                                _ => match row.try_get::<f64, _>(i) {
                                    Ok(Some(n)) => serde_json::json!(n),
                                    _ => match row.try_get::<bool, _>(i) {
                                        Ok(Some(b)) => serde_json::json!(b),
                                        _ => serde_json::Value::Null,
                                    },
                                },
                            },
                        },
                    };
                    map.insert(name, value);
                }
                all_rows.push(serde_json::Value::Object(map));
            }
        }

        // If no rows returned, this was likely a DML statement.
        if all_rows.is_empty() {
            total_affected = Some(0);
        }

        Ok((all_rows, total_affected))
    }
}

#[async_trait]
impl DataAdapter for MssqlAdapter {
    /// Returns the MSSQL dialect identifier.
    fn dialect(&self) -> Option<Dialect> {
        Some(Dialect::Mssql)
    }

    /// Validates the connection by connecting and running a test query.
    async fn authenticate(&mut self) -> Result<(), AppError> {
        let mut client = self.create_client(None).await?;
        client
            .query("SELECT 1 AS test", &[])
            .await
            .map_err(|e| AppError::Connection(format!("MssqlAdapter:authenticate: {}", e)))?
            .into_results()
            .await
            .map_err(|e| AppError::Connection(format!("MssqlAdapter:authenticate: {}", e)))?;

        let mut guard = self.client.lock().await;
        *guard = Some(client);

        Ok(())
    }

    /// Retrieves all non-system databases from sys.databases.
    async fn get_databases(&self) -> Result<Vec<DatabaseMetaData>, AppError> {
        self.get_or_create_client().await?;
        let mut guard = self.client.lock().await;
        let client = guard.as_mut().ok_or_else(|| {
            AppError::Connection("MssqlAdapter:get_databases: no active connection".to_string())
        })?;

        let (rows, _) =
            Self::exec_query_on(client, "SELECT name AS [database] FROM sys.databases").await?;

        let mut databases: Vec<DatabaseMetaData> = rows
            .into_iter()
            .filter_map(|row| {
                row.get("database")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .filter(|name| !SYSTEM_DATABASES.contains(&name.to_lowercase().as_str()))
            .map(|name| DatabaseMetaData {
                name,
                tables: vec![],
            })
            .collect();

        databases.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        Ok(databases)
    }

    /// Retrieves all user tables for a given database.
    /// Creates a temporary connection to the target database since MSSQL
    /// connections are scoped to a single database.
    /// @param database - The database name.
    async fn get_tables(&self, database: Option<&str>) -> Result<Vec<TableMetaData>, AppError> {
        let mut client = if let Some(db) = database {
            self.create_client(Some(db)).await?
        } else {
            self.get_or_create_client().await?;
            let mut guard = self.client.lock().await;
            // Take the client out temporarily; we'll put it back.
            guard.take().ok_or_else(|| {
                AppError::Connection("MssqlAdapter:get_tables: no active connection".to_string())
            })?
        };

        let result = Self::exec_query_on(
            &mut client,
            "SELECT name AS [tablename] FROM SYSOBJECTS WHERE xtype = 'U' ORDER BY name",
        )
        .await;

        // If we borrowed the main client, put it back.
        if database.is_none() {
            let mut guard = self.client.lock().await;
            *guard = Some(client);
        }

        let (rows, _) = result?;

        let mut tables: Vec<TableMetaData> = rows
            .into_iter()
            .filter_map(|row| {
                row.get("tablename")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .map(|name| TableMetaData {
                id: None,
                name,
                columns: vec![],
            })
            .collect();

        tables.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        Ok(tables)
    }

    /// Retrieves column metadata for a table, including primary key detection
    /// via COLUMNPROPERTY and foreign key references via INFORMATION_SCHEMA.
    /// @param table - The table name.
    /// @param database - The database name.
    async fn get_columns(
        &self,
        table: &str,
        database: Option<&str>,
    ) -> Result<Vec<ColumnMetaData>, AppError> {
        let mut client = if let Some(db) = database {
            self.create_client(Some(db)).await?
        } else {
            self.get_or_create_client().await?;
            let mut guard = self.client.lock().await;
            guard.take().ok_or_else(|| {
                AppError::Connection("MssqlAdapter:get_columns: no active connection".to_string())
            })?
        };

        let mut columns: Vec<ColumnMetaData> = Vec::new();

        // Fetch column definitions with PK and identity detection.
        let col_sql = format!(
            r#"SELECT
                c.COLUMN_NAME AS name,
                c.DATA_TYPE AS type,
                c.IS_NULLABLE AS is_nullable,
                c.COLUMN_DEFAULT AS column_default,
                CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS is_primary_key,
                COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') AS is_identity
            FROM INFORMATION_SCHEMA.COLUMNS c
            LEFT JOIN (
                SELECT ku.COLUMN_NAME
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
                WHERE tc.TABLE_NAME = '{}' AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
            ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME
            WHERE c.TABLE_NAME = '{}'
            ORDER BY c.ORDINAL_POSITION"#,
            table, table
        );

        let col_result = Self::exec_query_on(&mut client, &col_sql).await;

        if let Ok((col_rows, _)) = &col_result {
            for row in col_rows {
                let name = row
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let col_type = row
                    .get("type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_uppercase();
                let is_nullable = row
                    .get("is_nullable")
                    .and_then(|v| v.as_str())
                    .unwrap_or("NO");
                let is_primary_key = row
                    .get("is_primary_key")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0);
                let is_identity = row
                    .get("is_identity")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0);

                columns.push(ColumnMetaData {
                    name,
                    col_type,
                    allow_null: Some(is_nullable == "YES"),
                    primary_key: Some(is_primary_key == 1),
                    auto_increment: if is_identity == 1 { Some(true) } else { None },
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
        }

        // Fetch foreign key references.
        let fk_sql = format!(
            r#"SELECT
                fk_col.COLUMN_NAME,
                pk_tab.TABLE_NAME AS REFERENCED_TABLE_NAME,
                pk_col.COLUMN_NAME AS REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE fk_col
                ON rc.CONSTRAINT_NAME = fk_col.CONSTRAINT_NAME
            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pk_col
                ON rc.UNIQUE_CONSTRAINT_NAME = pk_col.CONSTRAINT_NAME
                AND fk_col.ORDINAL_POSITION = pk_col.ORDINAL_POSITION
            JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk_tab_c
                ON rc.UNIQUE_CONSTRAINT_NAME = pk_tab_c.CONSTRAINT_NAME
            JOIN INFORMATION_SCHEMA.TABLES pk_tab
                ON pk_tab_c.TABLE_NAME = pk_tab.TABLE_NAME
            WHERE fk_col.TABLE_NAME = '{}'"#,
            table
        );

        let fk_result = Self::exec_query_on(&mut client, &fk_sql).await;

        // Put the main client back if we borrowed it.
        if database.is_none() {
            let mut guard = self.client.lock().await;
            *guard = Some(client);
        }

        if let Ok((fk_rows, _)) = &fk_result {
            for fk in fk_rows {
                let column_name = fk
                    .get("COLUMN_NAME")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let ref_table = fk
                    .get("REFERENCED_TABLE_NAME")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let ref_column = fk
                    .get("REFERENCED_COLUMN_NAME")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                if let Some(col) = columns.iter_mut().find(|c| c.name == column_name) {
                    col.kind = Some("foreign_key".to_string());
                    col.referenced_table_name = Some(ref_table);
                    col.referenced_column_name = Some(ref_column);
                }
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
        let mut client = if let Some(db) = database {
            self.create_client(Some(db)).await?
        } else {
            self.get_or_create_client().await?;
            let mut guard = self.client.lock().await;
            guard.take().ok_or_else(|| {
                AppError::Connection("MssqlAdapter:execute: no active connection".to_string())
            })?
        };

        let result = Self::exec_query_on(&mut client, sql).await;

        // Put the main client back if we borrowed it.
        if database.is_none() {
            let mut guard = self.client.lock().await;
            *guard = Some(client);
        }

        match result {
            Ok((rows, affected)) => {
                if rows.is_empty() {
                    Ok(QueryResult {
                        ok: true,
                        raw: None,
                        meta: None,
                        error: None,
                        affected_rows: affected,
                    })
                } else {
                    Ok(QueryResult {
                        ok: true,
                        raw: Some(rows),
                        meta: None,
                        error: None,
                        affected_rows: affected,
                    })
                }
            }
            Err(e) => Ok(QueryResult {
                ok: false,
                raw: None,
                meta: None,
                error: Some(serde_json::json!({ "message": e.to_string() })),
                affected_rows: None,
            }),
        }
    }

    /// Closes the active tiberius client connection.
    async fn disconnect(&mut self) -> Result<(), AppError> {
        let mut guard = self.client.lock().await;
        if let Some(client) = guard.take() {
            client.close().await.map_err(|e| {
                AppError::Connection(format!("MssqlAdapter:disconnect: {}", e))
            })?;
        }
        Ok(())
    }
}

/// Parses a MSSQL connection URL into its component parts.
/// Expected format: `mssql://user:password@host:port`
/// @param connection - The raw connection string.
fn parse_mssql_url(connection: &str) -> Result<MssqlConnParams, AppError> {
    // Replace the mssql:// scheme with a parseable one for url crate.
    let normalized = connection.replacen("mssql://", "http://", 1);
    let url = Url::parse(&normalized).map_err(|e| {
        AppError::Connection(format!("Invalid MSSQL connection string: {}", e))
    })?;

    let host = url.host_str().unwrap_or("localhost").to_string();
    let port = url.port().unwrap_or(1433);
    let username = url.username().to_string();
    let password = url.password().unwrap_or("").to_string();

    // URL-decode username and password (url crate returns percent-encoded strings).
    let username = percent_decode_str(&username).decode_utf8_lossy().to_string();
    let password = percent_decode_str(&password).decode_utf8_lossy().to_string();

    Ok(MssqlConnParams {
        host,
        port,
        username,
        password,
    })
}

/// Converts a tiberius ColumnData value to a serde_json::Value.
/// Handles common SQL Server types: strings, integers, floats, booleans,
/// UUIDs, and datetimes.
/// @param data - The tiberius ColumnData to convert.
fn tiberius_column_to_json(data: &ColumnData<'_>) -> serde_json::Value {
    match data {
        ColumnData::U8(v) => v
            .map(|n| serde_json::Value::Number(n.into()))
            .unwrap_or(serde_json::Value::Null),
        ColumnData::I16(v) => v
            .map(|n| serde_json::Value::Number(n.into()))
            .unwrap_or(serde_json::Value::Null),
        ColumnData::I32(v) => v
            .map(|n| serde_json::Value::Number(n.into()))
            .unwrap_or(serde_json::Value::Null),
        ColumnData::I64(v) => v
            .map(|n| serde_json::Value::Number(n.into()))
            .unwrap_or(serde_json::Value::Null),
        ColumnData::F32(v) => v
            .and_then(|n| serde_json::Number::from_f64(n as f64))
            .map(serde_json::Value::Number)
            .unwrap_or(serde_json::Value::Null),
        ColumnData::F64(v) => v
            .and_then(|n| serde_json::Number::from_f64(n))
            .map(serde_json::Value::Number)
            .unwrap_or(serde_json::Value::Null),
        ColumnData::Bit(v) => v
            .map(serde_json::Value::Bool)
            .unwrap_or(serde_json::Value::Null),
        ColumnData::String(v) => v
            .as_ref()
            .map(|s| serde_json::Value::String(s.to_string()))
            .unwrap_or(serde_json::Value::Null),
        ColumnData::Guid(v) => v
            .map(|g| serde_json::Value::String(g.to_string()))
            .unwrap_or(serde_json::Value::Null),
        ColumnData::Numeric(v) => v
            .map(|n| {
                // Convert decimal to string first, then try as f64.
                let s = n.to_string();
                s.parse::<f64>()
                    .ok()
                    .and_then(|f| serde_json::Number::from_f64(f))
                    .map(serde_json::Value::Number)
                    .unwrap_or_else(|| serde_json::Value::String(s))
            })
            .unwrap_or(serde_json::Value::Null),
        ColumnData::DateTime(v) => v
            .map(|_| serde_json::Value::String(format!("{:?}", data)))
            .unwrap_or(serde_json::Value::Null),
        ColumnData::SmallDateTime(v) => v
            .map(|_| serde_json::Value::String(format!("{:?}", data)))
            .unwrap_or(serde_json::Value::Null),
        ColumnData::DateTime2(v) => v
            .map(|_| serde_json::Value::String(format!("{:?}", data)))
            .unwrap_or(serde_json::Value::Null),
        ColumnData::DateTimeOffset(v) => v
            .map(|_| serde_json::Value::String(format!("{:?}", data)))
            .unwrap_or(serde_json::Value::Null),
        ColumnData::Date(v) => v
            .map(|_| serde_json::Value::String(format!("{:?}", data)))
            .unwrap_or(serde_json::Value::Null),
        ColumnData::Time(v) => v
            .map(|_| serde_json::Value::String(format!("{:?}", data)))
            .unwrap_or(serde_json::Value::Null),
        ColumnData::Binary(v) => v
            .as_ref()
            .map(|b| {
                let hex: String = b.as_ref().iter().map(|byte| format!("{:02x}", byte)).collect();
                serde_json::Value::String(format!("0x{}", hex))
            })
            .unwrap_or(serde_json::Value::Null),
        ColumnData::Xml(v) => v
            .as_ref()
            .map(|x| serde_json::Value::String(x.to_string()))
            .unwrap_or(serde_json::Value::Null),
    }
}
