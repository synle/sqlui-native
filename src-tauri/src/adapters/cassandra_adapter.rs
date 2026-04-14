/** Cassandra adapter for the Tauri backend. */
use async_trait::async_trait;
use scylla::{Session, SessionBuilder};
use std::collections::HashMap;
use tokio::sync::Mutex;
use url::Url;

use crate::{error::AppError, types::*};

use super::DataAdapter;

/// Cassandra/ScyllaDB adapter backed by the `scylla` crate.
///
/// Connection string format: `cassandra://[user:pass@]host:port[/keyspace]`
/// The adapter connects to the cluster on `authenticate()` and queries
/// system tables for schema metadata.
pub struct CassandraAdapter {
    /// Raw connection string (retained for diagnostics/reconnection).
    #[allow(dead_code)]
    connection_string: String,
    /// Parsed host address (e.g. `host:port`).
    host: String,
    /// Parsed port (defaults to 9042).
    port: u16,
    /// Optional username for authentication.
    username: Option<String>,
    /// Optional password for authentication.
    password: Option<String>,
    /// Optional default keyspace from the connection string path.
    default_keyspace: Option<String>,
    /// Active ScyllaDB/Cassandra session, set after `authenticate()`.
    session: Option<Mutex<Session>>,
}

impl CassandraAdapter {
    /// Creates a new `CassandraAdapter` by parsing the connection string.
    ///
    /// Extracts host, port, optional credentials, and optional default keyspace
    /// from the `cassandra://` URL.
    pub fn new(connection: &str) -> Result<Self, AppError> {
        let parsed = Self::parse_connection_string(connection)?;
        Ok(parsed)
    }

    /// Parses a `cassandra://` connection string into adapter configuration.
    fn parse_connection_string(connection: &str) -> Result<Self, AppError> {
        // Replace cassandra:// with a scheme that url::Url can parse.
        let url_str = connection.replacen("cassandra://", "http://", 1);
        let url = Url::parse(&url_str)
            .map_err(|e| AppError::Connection(format!("Invalid Cassandra connection string: {}", e)))?;

        let host = url.host_str().unwrap_or("localhost").to_string();
        let port = url.port().unwrap_or(9042);

        let username = if url.username().is_empty() {
            None
        } else {
            Some(url.username().to_string())
        };
        let password = url.password().map(|p| p.to_string());

        let path = url.path().trim_start_matches('/');
        let default_keyspace = if path.is_empty() {
            None
        } else {
            Some(path.to_string())
        };

        Ok(Self {
            connection_string: connection.to_string(),
            host,
            port,
            username,
            password,
            default_keyspace,
            session: None,
        })
    }

    /// Returns a reference to the active session or an error if not authenticated.
    fn get_session(&self) -> Result<&Mutex<Session>, AppError> {
        self.session
            .as_ref()
            .ok_or_else(|| AppError::Connection("Cassandra session not connected. Call authenticate() first.".into()))
    }

    /// Executes a CQL query and returns the result rows as JSON values.
    async fn execute_query(
        &self,
        cql: &str,
        params: &[&str],
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let session_mutex = self.get_session()?;
        let session = session_mutex.lock().await;

        // Build query with parameters using the Scylla driver.
        let query = scylla::query::Query::new(cql);

        let result = if params.is_empty() {
            session
                .query_unpaged(query, &[])
                .await
                .map_err(|e| AppError::Query(format!("CQL execution error: {}", e)))?
        } else {
            // Convert string params to tuples of the appropriate arity.
            let values: Vec<String> = params.iter().map(|s| s.to_string()).collect();
            match params.len() {
                1 => session
                    .query_unpaged(query, (values[0].clone(),))
                    .await
                    .map_err(|e| AppError::Query(format!("CQL execution error: {}", e)))?,
                2 => session
                    .query_unpaged(query, (values[0].clone(), values[1].clone()))
                    .await
                    .map_err(|e| AppError::Query(format!("CQL execution error: {}", e)))?,
                3 => session
                    .query_unpaged(
                        query,
                        (values[0].clone(), values[1].clone(), values[2].clone()),
                    )
                    .await
                    .map_err(|e| AppError::Query(format!("CQL execution error: {}", e)))?,
                _ => {
                    return Err(AppError::Query(
                        "Cassandra adapter supports up to 3 positional parameters".into(),
                    ));
                }
            }
        };

        // Convert result rows to JSON.
        let mut rows_json: Vec<serde_json::Value> = Vec::new();

        let col_specs = result.col_specs().to_vec();
        if let Some(rows) = result.rows {
            for row in rows {
                let mut map = serde_json::Map::new();
                for (i, col) in row.columns.iter().enumerate() {
                    let col_name = if i < col_specs.len() {
                        col_specs[i].name.clone()
                    } else {
                        format!("col_{}", i)
                    };

                    let value = match col {
                        None => serde_json::Value::Null,
                        Some(cql_value) => cql_value_to_json(cql_value),
                    };
                    map.insert(col_name, value);
                }
                rows_json.push(serde_json::Value::Object(map));
            }
        }

        Ok(rows_json)
    }
}

#[async_trait]
impl DataAdapter for CassandraAdapter {
    /// Returns the Cassandra dialect identifier.
    fn dialect(&self) -> Option<Dialect> {
        Some(Dialect::Cassandra)
    }

    /// Authenticates by establishing a session to the Cassandra cluster.
    ///
    /// Attempts connection with credentials if provided. Optionally sets the
    /// default keyspace from the connection string path.
    async fn authenticate(&mut self) -> Result<(), AppError> {
        let known_node = format!("{}:{}", self.host, self.port);

        let mut builder = SessionBuilder::new().known_node(&known_node);

        // Apply credentials if provided.
        if let (Some(user), Some(pass)) = (&self.username, &self.password) {
            builder = builder.user(user, pass);
        }

        // Apply default keyspace if provided.
        if let Some(ref ks) = self.default_keyspace {
            builder = builder.use_keyspace(ks, false);
        }

        let session = builder
            .build()
            .await
            .map_err(|e| AppError::Connection(format!("Cassandra connection failed: {}", e)))?;

        self.session = Some(Mutex::new(session));
        Ok(())
    }

    /// Lists all keyspaces in the Cassandra cluster.
    async fn get_databases(&self) -> Result<Vec<DatabaseMetaData>, AppError> {
        let rows = self
            .execute_query("SELECT keyspace_name FROM system_schema.keyspaces", &[])
            .await?;

        Ok(rows
            .into_iter()
            .filter_map(|row| {
                row.get("keyspace_name")
                    .and_then(|v| v.as_str())
                    .map(|name| DatabaseMetaData {
                        name: name.to_string(),
                        tables: vec![],
                    })
            })
            .collect())
    }

    /// Lists all tables in the specified keyspace.
    async fn get_tables(&self, database: Option<&str>) -> Result<Vec<TableMetaData>, AppError> {
        let keyspace = database
            .ok_or_else(|| AppError::BadRequest("Keyspace name is required for Cassandra getTables".into()))?;

        let rows = self
            .execute_query(
                "SELECT table_name FROM system_schema.tables WHERE keyspace_name = ?",
                &[keyspace],
            )
            .await?;

        Ok(rows
            .into_iter()
            .filter_map(|row| {
                row.get("table_name")
                    .and_then(|v| v.as_str())
                    .map(|name| TableMetaData {
                        id: None,
                        name: name.to_string(),
                        columns: vec![],
                    })
            })
            .collect())
    }

    /// Lists all columns for a table in the specified keyspace.
    ///
    /// Queries `system_schema.columns` for column name, type, and kind
    /// (partition_key, clustering, regular, static).
    async fn get_columns(
        &self,
        table: &str,
        database: Option<&str>,
    ) -> Result<Vec<ColumnMetaData>, AppError> {
        let keyspace = database
            .ok_or_else(|| AppError::BadRequest("Keyspace name is required for Cassandra getColumns".into()))?;

        let rows = self
            .execute_query(
                "SELECT column_name, type, kind FROM system_schema.columns WHERE keyspace_name = ? AND table_name = ?",
                &[keyspace, table],
            )
            .await?;

        Ok(rows
            .into_iter()
            .filter_map(|row| {
                let name = row.get("column_name")?.as_str()?.to_string();
                let col_type = row
                    .get("type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string();
                let kind = row
                    .get("kind")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                let is_partition_key = kind.as_deref() == Some("partition_key");

                Some(ColumnMetaData {
                    name,
                    col_type,
                    allow_null: None,
                    primary_key: if is_partition_key { Some(true) } else { None },
                    auto_increment: None,
                    comment: None,
                    references: None,
                    nested: None,
                    property_path: None,
                    kind,
                    referenced_table_name: None,
                    referenced_column_name: None,
                    extra: HashMap::new(),
                })
            })
            .collect())
    }

    /// Executes a CQL query against the specified keyspace.
    ///
    /// If a keyspace (database) is provided, the query is prefixed with
    /// `USE keyspace;` to set the context.
    async fn execute(
        &self,
        sql: &str,
        database: Option<&str>,
        _table: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        let session_mutex = self.get_session()?;
        let session = session_mutex.lock().await;

        // Optionally switch keyspace before executing.
        if let Some(keyspace) = database {
            let use_stmt = format!("USE \"{}\"", keyspace);
            let _ = session.query_unpaged(scylla::query::Query::new(&use_stmt), &[]).await;
        }

        let query = scylla::query::Query::new(sql);
        let result = session
            .query_unpaged(query, &[])
            .await
            .map_err(|e| {
                AppError::Query(format!("CQL execution error: {}", e))
            });

        match result {
            Ok(query_result) => {
                let mut rows_json: Vec<serde_json::Value> = Vec::new();

                let col_specs = query_result.col_specs().to_vec();
                if let Some(rows) = query_result.rows {
                    for row in rows {
                        let mut map = serde_json::Map::new();
                        for (i, col) in row.columns.iter().enumerate() {
                            let col_name = if i < col_specs.len() {
                                col_specs[i].name.clone()
                            } else {
                                format!("col_{}", i)
                            };
                            let value = match col {
                                None => serde_json::Value::Null,
                                Some(cql_value) => cql_value_to_json(cql_value),
                            };
                            map.insert(col_name, value);
                        }
                        rows_json.push(serde_json::Value::Object(map));
                    }
                }

                let affected = if rows_json.is_empty() {
                    None
                } else {
                    Some(rows_json.len() as i64)
                };

                Ok(QueryResult {
                    ok: true,
                    raw: if rows_json.is_empty() {
                        None
                    } else {
                        Some(rows_json)
                    },
                    meta: None,
                    error: None,
                    affected_rows: affected,
                })
            }
            Err(e) => Ok(QueryResult {
                ok: false,
                raw: None,
                meta: None,
                error: Some(serde_json::json!(e.to_string())),
                affected_rows: None,
            }),
        }
    }

    /// Drops the Cassandra session and releases cluster connections.
    async fn disconnect(&mut self) -> Result<(), AppError> {
        self.session = None;
        Ok(())
    }
}

/// Converts a ScyllaDB `CqlValue` into a `serde_json::Value` for serialization.
fn cql_value_to_json(value: &scylla::frame::response::result::CqlValue) -> serde_json::Value {
    use scylla::frame::response::result::CqlValue;
    match value {
        CqlValue::Ascii(s) | CqlValue::Text(s) => serde_json::Value::String(s.clone()),
        CqlValue::Int(i) => serde_json::json!(i),
        CqlValue::BigInt(i) => serde_json::json!(i),
        CqlValue::SmallInt(i) => serde_json::json!(i),
        CqlValue::TinyInt(i) => serde_json::json!(i),
        CqlValue::Float(f) => serde_json::json!(f),
        CqlValue::Double(d) => serde_json::json!(d),
        CqlValue::Boolean(b) => serde_json::json!(b),
        CqlValue::Uuid(u) => serde_json::Value::String(u.to_string()),
        CqlValue::Timeuuid(u) => serde_json::Value::String(u.to_string()),
        CqlValue::Timestamp(d) => serde_json::json!(d.0),
        CqlValue::Date(d) => serde_json::json!(d.0),
        CqlValue::Blob(bytes) => {
            serde_json::Value::String(format!("<blob {} bytes>", bytes.len()))
        }
        CqlValue::Inet(addr) => serde_json::Value::String(addr.to_string()),
        CqlValue::Varint(v) => serde_json::Value::String(format!("{:?}", v)),
        CqlValue::Decimal(d) => serde_json::Value::String(format!("{:?}", d)),
        CqlValue::Counter(c) => serde_json::json!(c.0),
        CqlValue::List(items) => {
            serde_json::Value::Array(items.iter().map(cql_value_to_json).collect())
        }
        CqlValue::Set(items) => {
            serde_json::Value::Array(items.iter().map(cql_value_to_json).collect())
        }
        CqlValue::Map(pairs) => {
            let mut map = serde_json::Map::new();
            for (k, v) in pairs {
                let key = match cql_value_to_json(k) {
                    serde_json::Value::String(s) => s,
                    other => other.to_string(),
                };
                map.insert(key, cql_value_to_json(v));
            }
            serde_json::Value::Object(map)
        }
        CqlValue::Tuple(items) => {
            serde_json::Value::Array(
                items
                    .iter()
                    .map(|opt| match opt {
                        Some(v) => cql_value_to_json(v),
                        None => serde_json::Value::Null,
                    })
                    .collect(),
            )
        }
        CqlValue::UserDefinedType { fields, .. } => {
            let mut map = serde_json::Map::new();
            for (name, opt_val) in fields {
                let val = match opt_val {
                    Some(v) => cql_value_to_json(v),
                    None => serde_json::Value::Null,
                };
                map.insert(name.clone(), val);
            }
            serde_json::Value::Object(map)
        }
        CqlValue::Empty => serde_json::Value::Null,
        _ => serde_json::Value::String(format!("{:?}", value)),
    }
}
