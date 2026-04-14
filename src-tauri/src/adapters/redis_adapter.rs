/** Redis adapter for the Tauri backend. */
use async_trait::async_trait;
use tokio::sync::Mutex;

use crate::{error::AppError, types::*};

use super::DataAdapter;

/// Redis adapter backed by the `redis` crate with tokio async support.
///
/// Supports both `redis://` (plain) and `rediss://` (TLS) connection strings.
/// Redis is a key-value store, so `getDatabases`, `getTables`, and `getColumns`
/// return minimal hard-coded metadata.  The `execute` method parses simple
/// Redis command strings (e.g. `GET key`, `SET key value`).
pub struct RedisAdapter {
    /// Raw connection string (e.g. `redis://localhost:6379`).
    connection_string: String,
    /// Active async multiplexed connection, set after `authenticate()`.
    connection: Option<Mutex<redis::aio::MultiplexedConnection>>,
}

impl RedisAdapter {
    /// Creates a new `RedisAdapter` from a connection string.
    ///
    /// The connection string should start with `redis://` or `rediss://`.
    /// The connection is not established until `authenticate()` is called.
    pub fn new(connection: &str) -> Result<Self, AppError> {
        Ok(Self {
            connection_string: connection.to_string(),
            connection: None,
        })
    }

    /// Returns a reference to the active connection or an error if not authenticated.
    fn get_connection(&self) -> Result<&Mutex<redis::aio::MultiplexedConnection>, AppError> {
        self.connection
            .as_ref()
            .ok_or_else(|| AppError::Connection("Redis client not connected. Call authenticate() first.".into()))
    }

    /// Parses a Redis command string into a command name and arguments.
    ///
    /// Handles both simple whitespace-separated tokens and quoted strings.
    /// For example: `SET "my key" "my value"` parses into `["SET", "my key", "my value"]`.
    fn parse_command(input: &str) -> Vec<String> {
        let mut tokens = Vec::new();
        let mut current = String::new();
        let mut in_quote = false;
        let mut quote_char = '"';

        for ch in input.trim().chars() {
            if in_quote {
                if ch == quote_char {
                    in_quote = false;
                } else {
                    current.push(ch);
                }
            } else if ch == '"' || ch == '\'' {
                in_quote = true;
                quote_char = ch;
            } else if ch.is_whitespace() {
                if !current.is_empty() {
                    tokens.push(current.clone());
                    current.clear();
                }
            } else {
                current.push(ch);
            }
        }
        if !current.is_empty() {
            tokens.push(current);
        }
        tokens
    }
}

#[async_trait]
impl DataAdapter for RedisAdapter {
    /// Returns the Redis dialect identifier.
    fn dialect(&self) -> Option<Dialect> {
        Some(Dialect::Redis)
    }

    /// Authenticates by connecting to Redis and sending a PING command.
    async fn authenticate(&mut self) -> Result<(), AppError> {
        let client = redis::Client::open(self.connection_string.as_str())
            .map_err(|e| AppError::Connection(format!("Redis client creation failed: {}", e)))?;

        let mut conn = client
            .get_multiplexed_async_connection()
            .await
            .map_err(|e| AppError::Connection(format!("Redis connection failed: {}", e)))?;

        // Verify connectivity with PING.
        let pong: String = redis::cmd("PING")
            .query_async(&mut conn)
            .await
            .map_err(|e| AppError::Connection(format!("Redis PING failed: {}", e)))?;

        if pong != "PONG" {
            return Err(AppError::Connection(format!(
                "Unexpected PING response: {}",
                pong
            )));
        }

        self.connection = Some(Mutex::new(conn));
        Ok(())
    }

    /// Returns a single hard-coded database entry for Redis.
    ///
    /// Redis does not have a database concept comparable to SQL; numbered
    /// databases (0-15) are seldom exposed in UIs.
    async fn get_databases(&self) -> Result<Vec<DatabaseMetaData>, AppError> {
        Ok(vec![DatabaseMetaData {
            name: "Redis Database".into(),
            tables: vec![],
        }])
    }

    /// Returns a single hard-coded table entry for Redis.
    ///
    /// Redis is a key-value store and does not have tables.
    async fn get_tables(&self, _database: Option<&str>) -> Result<Vec<TableMetaData>, AppError> {
        Ok(vec![TableMetaData {
            id: None,
            name: "Redis Table".into(),
            columns: vec![],
        }])
    }

    /// Returns an empty column list since Redis has no column schema.
    async fn get_columns(
        &self,
        _table: &str,
        _database: Option<&str>,
    ) -> Result<Vec<ColumnMetaData>, AppError> {
        Ok(vec![])
    }

    /// Executes a Redis command parsed from a string.
    ///
    /// The first whitespace-delimited token is the command name (case-insensitive);
    /// remaining tokens are arguments.  Supported commands include GET, SET, DEL,
    /// KEYS, MGET, HGET, HSET, HGETALL, LPUSH, RPUSH, LRANGE, SADD, SMEMBERS,
    /// INCR, DECR, TTL, EXPIRE, EXISTS, TYPE, DBSIZE, FLUSHDB, INFO, and PING.
    /// Quoted strings are supported for keys/values containing spaces.
    async fn execute(
        &self,
        sql: &str,
        _database: Option<&str>,
        _table: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        let conn_mutex = self.get_connection()?;
        let mut conn = conn_mutex.lock().await;

        let tokens = Self::parse_command(sql);
        if tokens.is_empty() {
            return Ok(QueryResult {
                ok: false,
                raw: None,
                meta: None,
                error: Some(serde_json::json!("Empty command")),
                affected_rows: None,
            });
        }

        let command = tokens[0].to_uppercase();
        let args = &tokens[1..];

        // Build a generic redis::Cmd so we can handle any command uniformly.
        let mut cmd = redis::cmd(&command);
        for arg in args {
            cmd.arg(arg.as_str());
        }

        // Execute and interpret the result based on the Redis value type.
        let result: redis::RedisResult<redis::Value> = cmd.query_async(&mut *conn).await;

        match result {
            Ok(value) => {
                let json_value = redis_value_to_json(&value);
                match json_value {
                    serde_json::Value::Null => Ok(QueryResult {
                        ok: true,
                        raw: Some(vec![serde_json::json!({ "value": null })]),
                        meta: None,
                        error: None,
                        affected_rows: None,
                    }),
                    serde_json::Value::String(ref s) if s == "OK" => Ok(QueryResult {
                        ok: true,
                        raw: None,
                        meta: Some(serde_json::json!("OK")),
                        error: None,
                        affected_rows: None,
                    }),
                    serde_json::Value::Array(arr) => {
                        let rows: Vec<serde_json::Value> = arr
                            .into_iter()
                            .map(|item| serde_json::json!({ "value": item }))
                            .collect();
                        Ok(QueryResult {
                            ok: true,
                            raw: Some(rows),
                            meta: None,
                            error: None,
                            affected_rows: None,
                        })
                    }
                    other => Ok(QueryResult {
                        ok: true,
                        raw: Some(vec![serde_json::json!({ "value": other })]),
                        meta: None,
                        error: None,
                        affected_rows: None,
                    }),
                }
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

    /// Drops the Redis connection and releases resources.
    async fn disconnect(&mut self) -> Result<(), AppError> {
        self.connection = None;
        Ok(())
    }
}

/// Converts a `redis::Value` into a `serde_json::Value` for serialization.
fn redis_value_to_json(value: &redis::Value) -> serde_json::Value {
    match value {
        redis::Value::Nil => serde_json::Value::Null,
        redis::Value::Int(i) => serde_json::json!(i),
        redis::Value::BulkString(bytes) => {
            match String::from_utf8(bytes.clone()) {
                Ok(s) => serde_json::Value::String(s),
                Err(_) => serde_json::json!(format!("<binary {} bytes>", bytes.len())),
            }
        }
        redis::Value::Array(arr) => {
            serde_json::Value::Array(arr.iter().map(redis_value_to_json).collect())
        }
        redis::Value::Okay => serde_json::Value::String("OK".into()),
        redis::Value::SimpleString(s) => serde_json::Value::String(s.clone()),
        redis::Value::Double(f) => serde_json::json!(f),
        redis::Value::Boolean(b) => serde_json::json!(b),
        redis::Value::Map(pairs) => {
            let mut map = serde_json::Map::new();
            for (k, v) in pairs {
                let key = match redis_value_to_json(k) {
                    serde_json::Value::String(s) => s,
                    other => other.to_string(),
                };
                map.insert(key, redis_value_to_json(v));
            }
            serde_json::Value::Object(map)
        }
        redis::Value::Set(items) => {
            serde_json::Value::Array(items.iter().map(redis_value_to_json).collect())
        }
        redis::Value::ServerError(err) => serde_json::json!({ "error": format!("{:?}", err) }),
        _ => serde_json::Value::String(format!("{:?}", value)),
    }
}
