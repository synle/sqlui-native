/** Azure CosmosDB adapter using reqwest for REST API calls. */

use async_trait::async_trait;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use hmac::{Hmac, Mac};
use reqwest::Client;
use sha2::Sha256;
use std::collections::HashMap;

use crate::error::AppError;
use crate::types::*;

use super::DataAdapter;

/// Maximum number of items to scan when inferring column types from sample documents.
const MAX_ITEM_COUNT_TO_SCAN: usize = 5;

/// Azure CosmosDB adapter that communicates via the CosmosDB SQL REST API.
///
/// Connection string format: `cosmosdb://AccountEndpoint=https://...;AccountKey=...`
///
/// Uses direct REST API calls with HMAC-SHA256 authorization headers rather than the
/// `azure_data_cosmos` SDK crate for simpler dependency management and more predictable
/// behavior in bundled Tauri builds.
pub struct CosmosdbAdapter {
    /// The parsed account endpoint URL (e.g., `https://myaccount.documents.azure.com:443/`).
    endpoint: String,
    /// The Base64-encoded master key for HMAC-SHA256 authorization.
    account_key: String,
    /// Shared HTTP client reused across all requests.
    client: Client,
}

/// Parsed key-value pairs from a CosmosDB connection string.
struct CosmosdbConnectionConfig {
    /// The account endpoint URL.
    endpoint: String,
    /// The Base64-encoded account master key.
    account_key: String,
}

/// Parses a `cosmosdb://AccountEndpoint=...;AccountKey=...` connection string into its parts.
///
/// Handles Base64 padding characters (`=`) in AccountKey by splitting on the first `=` only.
///
/// @param connection - The raw connection string with `cosmosdb://` scheme.
/// @returns Parsed config with endpoint and account_key.
fn parse_cosmosdb_connection(connection: &str) -> Result<CosmosdbConnectionConfig, AppError> {
    let without_scheme = connection
        .strip_prefix("cosmosdb://")
        .ok_or_else(|| AppError::Connection("Missing cosmosdb:// scheme".into()))?;

    let mut endpoint = String::new();
    let mut account_key = String::new();

    for part in without_scheme.split(';') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        if let Some((key, _)) = part.split_once('=') {
            let key_lower = key.trim().to_lowercase();
            // Values may contain '=' (Base64 padding, URL paths), so take everything after first '='
            let value = part.splitn(2, '=').nth(1).unwrap_or("").trim().to_string();

            match key_lower.as_str() {
                "accountendpoint" => endpoint = value,
                "accountkey" => account_key = value,
                _ => {} // Ignore unknown keys
            }
        }
    }

    if endpoint.is_empty() {
        return Err(AppError::Connection(
            "Missing AccountEndpoint in CosmosDB connection string. \
             Expected format: cosmosdb://AccountEndpoint=https://...;AccountKey=..."
                .into(),
        ));
    }

    if account_key.is_empty() {
        return Err(AppError::Connection(
            "Missing AccountKey in CosmosDB connection string. \
             Expected format: cosmosdb://AccountEndpoint=https://...;AccountKey=..."
                .into(),
        ));
    }

    // Normalize endpoint to remove trailing slash for consistent URL construction
    let endpoint = endpoint.trim_end_matches('/').to_string();

    Ok(CosmosdbConnectionConfig {
        endpoint,
        account_key,
    })
}

/// Generates the CosmosDB REST API authorization token using HMAC-SHA256.
///
/// CosmosDB uses a custom authorization scheme where the string-to-sign is:
/// `{verb}\n{resourceType}\n{resourceLink}\n{date}\n\n`
///
/// The resulting token format is:
/// `type=master&ver=1.0&sig={base64(hmac_sha256(key, string_to_sign))}`
///
/// @param verb - The HTTP method in lowercase (e.g., "get", "post").
/// @param resource_type - The resource type (e.g., "dbs", "colls", "docs").
/// @param resource_link - The resource link path (e.g., "dbs/mydb/colls/mycoll").
/// @param date - The x-ms-date header value in RFC 1123 format.
/// @param key_base64 - The Base64-encoded master key from the connection string.
/// @returns The URL-encoded authorization token string.
fn generate_auth_token(
    verb: &str,
    resource_type: &str,
    resource_link: &str,
    date: &str,
    key_base64: &str,
) -> Result<String, AppError> {
    let key_bytes = BASE64.decode(key_base64).map_err(|e| {
        AppError::Connection(format!(
            "Failed to decode AccountKey (invalid Base64): {}",
            e
        ))
    })?;

    let payload = format!(
        "{}\n{}\n{}\n{}\n\n",
        verb.to_lowercase(),
        resource_type.to_lowercase(),
        resource_link,
        date.to_lowercase()
    );

    type HmacSha256 = Hmac<Sha256>;
    let mut mac = HmacSha256::new_from_slice(&key_bytes)
        .map_err(|e| AppError::Connection(format!("HMAC key initialization failed: {}", e)))?;
    mac.update(payload.as_bytes());
    let signature = BASE64.encode(mac.finalize().into_bytes());

    let auth_string = format!("type=master&ver=1.0&sig={}", signature);
    Ok(urlencoding::encode(&auth_string).to_string())
}

/// Generates an RFC 1123 formatted UTC date string for the x-ms-date header.
fn rfc1123_date() -> String {
    chrono::Utc::now()
        .format("%a, %d %b %Y %H:%M:%S GMT")
        .to_string()
}

/// Infers column metadata from a set of JSON documents by examining their keys and value types.
///
/// Scans all provided items and builds a union of all observed keys. The type is inferred
/// from the first occurrence of each key. The `id` field is marked as primary key.
///
/// @param items - The JSON objects to scan.
/// @returns Inferred column metadata sorted alphabetically by name.
fn infer_columns_from_items(items: &[serde_json::Value]) -> Vec<ColumnMetaData> {
    let mut columns: HashMap<String, String> = HashMap::new();

    for item in items {
        if let Some(obj) = item.as_object() {
            for (key, value) in obj {
                columns.entry(key.clone()).or_insert_with(|| match value {
                    serde_json::Value::Bool(_) => "boolean".to_string(),
                    serde_json::Value::Number(_) => "number".to_string(),
                    serde_json::Value::String(_) => "string".to_string(),
                    serde_json::Value::Array(_) => "array".to_string(),
                    serde_json::Value::Object(_) => "object".to_string(),
                    serde_json::Value::Null => "null".to_string(),
                });
            }
        }
    }

    let mut cols: Vec<ColumnMetaData> = columns
        .into_iter()
        .map(|(name, col_type)| ColumnMetaData {
            primary_key: if name == "id" { Some(true) } else { None },
            name,
            col_type,
            ..Default::default()
        })
        .collect();

    cols.sort_by(|a, b| a.name.cmp(&b.name));
    cols
}

impl CosmosdbAdapter {
    /// Creates a new CosmosDB adapter by parsing the connection string.
    ///
    /// @param connection - Connection string: `cosmosdb://AccountEndpoint=https://...;AccountKey=...`
    pub fn new(connection: &str) -> Result<Self, AppError> {
        let config = parse_cosmosdb_connection(connection)?;
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| AppError::Connection(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            endpoint: config.endpoint,
            account_key: config.account_key,
            client,
        })
    }

    /// Makes an authenticated GET request to the CosmosDB REST API.
    ///
    /// @param resource_type - The resource type (e.g., "dbs", "colls", "docs").
    /// @param resource_link - The canonical resource link (e.g., "", "dbs/mydb").
    /// @param path - The URL path segment appended to the endpoint.
    async fn rest_get(
        &self,
        resource_type: &str,
        resource_link: &str,
        path: &str,
    ) -> Result<serde_json::Value, AppError> {
        let date = rfc1123_date();
        let auth =
            generate_auth_token("get", resource_type, resource_link, &date, &self.account_key)?;

        let url = format!("{}/{}", self.endpoint, path.trim_start_matches('/'));

        let response = self
            .client
            .get(&url)
            .header("Authorization", &auth)
            .header("x-ms-date", &date)
            .header("x-ms-version", "2018-12-31")
            .header("Content-Type", "application/json")
            .send()
            .await
            .map_err(|e| AppError::Connection(format!("CosmosDB REST request failed: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "No response body".into());
            return Err(AppError::Connection(format!(
                "CosmosDB REST API returned {}: {}",
                status, body
            )));
        }

        response
            .json::<serde_json::Value>()
            .await
            .map_err(|e| AppError::Query(format!("Failed to parse CosmosDB response: {}", e)))
    }

    /// Makes an authenticated POST request to the CosmosDB REST API for SQL queries.
    ///
    /// Sets the `x-ms-documentdb-isquery` and cross-partition headers required for SQL queries.
    ///
    /// @param resource_type - The resource type (typically "docs").
    /// @param resource_link - The canonical resource link (e.g., "dbs/mydb/colls/mycoll").
    /// @param path - The URL path segment appended to the endpoint.
    /// @param body - The JSON request body containing the query.
    async fn rest_post_query(
        &self,
        resource_type: &str,
        resource_link: &str,
        path: &str,
        body: &serde_json::Value,
    ) -> Result<serde_json::Value, AppError> {
        let date = rfc1123_date();
        let auth =
            generate_auth_token("post", resource_type, resource_link, &date, &self.account_key)?;

        let url = format!("{}/{}", self.endpoint, path.trim_start_matches('/'));

        let response = self
            .client
            .post(&url)
            .header("Authorization", &auth)
            .header("x-ms-date", &date)
            .header("x-ms-version", "2018-12-31")
            .header("Content-Type", "application/query+json")
            .header("x-ms-documentdb-isquery", "true")
            .header("x-ms-documentdb-query-enablecrosspartition", "true")
            .json(body)
            .send()
            .await
            .map_err(|e| AppError::Query(format!("CosmosDB query request failed: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let body_text = response
                .text()
                .await
                .unwrap_or_else(|_| "No response body".into());
            return Err(AppError::Query(format!(
                "CosmosDB query returned {}: {}",
                status, body_text
            )));
        }

        response
            .json::<serde_json::Value>()
            .await
            .map_err(|e| AppError::Query(format!("Failed to parse CosmosDB query response: {}", e)))
    }
}

#[async_trait]
impl DataAdapter for CosmosdbAdapter {
    /// Returns the CosmosDB dialect identifier.
    fn dialect(&self) -> Option<Dialect> {
        Some(Dialect::Cosmosdb)
    }

    /// Authenticates by listing databases to verify the endpoint and master key are valid.
    async fn authenticate(&mut self) -> Result<(), AppError> {
        let _databases = self.get_databases().await?;
        Ok(())
    }

    /// Lists all databases in the CosmosDB account via the REST API.
    async fn get_databases(&self) -> Result<Vec<DatabaseMetaData>, AppError> {
        let result = self.rest_get("dbs", "", "dbs").await?;

        let databases = result["Databases"]
            .as_array()
            .unwrap_or(&Vec::new())
            .iter()
            .filter_map(|db| {
                db["id"].as_str().map(|id| DatabaseMetaData {
                    name: id.to_string(),
                    tables: vec![],
                })
            })
            .collect();

        Ok(databases)
    }

    /// Lists all containers in the specified CosmosDB database.
    ///
    /// @param database - The database name (required for CosmosDB).
    async fn get_tables(&self, database: Option<&str>) -> Result<Vec<TableMetaData>, AppError> {
        let db = database.ok_or_else(|| {
            AppError::BadRequest("Database is required for CosmosDB get_tables".into())
        })?;

        let resource_link = format!("dbs/{}", db);
        let path = format!("dbs/{}/colls", db);
        let result = self.rest_get("colls", &resource_link, &path).await?;

        let tables = result["DocumentCollections"]
            .as_array()
            .unwrap_or(&Vec::new())
            .iter()
            .filter_map(|coll| {
                coll["id"].as_str().map(|id| TableMetaData {
                    id: None,
                    name: id.to_string(),
                    columns: vec![],
                })
            })
            .collect();

        Ok(tables)
    }

    /// Infers column metadata by querying sample documents from a container.
    ///
    /// Fetches up to `MAX_ITEM_COUNT_TO_SCAN` documents and unions all observed keys,
    /// inferring types from the first occurrence of each.
    ///
    /// @param table - The container name.
    /// @param database - The database name (required for CosmosDB).
    async fn get_columns(
        &self,
        table: &str,
        database: Option<&str>,
    ) -> Result<Vec<ColumnMetaData>, AppError> {
        let db = database.ok_or_else(|| {
            AppError::BadRequest("Database is required for CosmosDB get_columns".into())
        })?;

        let query = format!(
            "SELECT * FROM c OFFSET 0 LIMIT {}",
            MAX_ITEM_COUNT_TO_SCAN
        );
        let resource_link = format!("dbs/{}/colls/{}", db, table);
        let path = format!("dbs/{}/colls/{}/docs", db, table);
        let body = serde_json::json!({ "query": query });

        let result = self
            .rest_post_query("docs", &resource_link, &path, &body)
            .await?;

        let items = result["Documents"]
            .as_array()
            .cloned()
            .unwrap_or_default();

        Ok(infer_columns_from_items(&items))
    }

    /// Executes a CosmosDB SQL query against a container.
    ///
    /// @param sql - The SQL query string (CosmosDB SQL syntax).
    /// @param database - The database name (required).
    /// @param table - The container name (required).
    async fn execute(
        &self,
        sql: &str,
        database: Option<&str>,
        table: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        let db = database.ok_or_else(|| {
            AppError::BadRequest("Database is required for CosmosDB execute".into())
        })?;

        let container = table.ok_or_else(|| {
            AppError::BadRequest("Table (container) is required for CosmosDB execute".into())
        })?;

        let resource_link = format!("dbs/{}/colls/{}", db, container);
        let path = format!("dbs/{}/colls/{}/docs", db, container);
        let body = serde_json::json!({ "query": sql });

        match self
            .rest_post_query("docs", &resource_link, &path, &body)
            .await
        {
            Ok(result) => {
                let items = result["Documents"]
                    .as_array()
                    .cloned()
                    .unwrap_or_default();

                Ok(QueryResult {
                    ok: true,
                    raw: Some(items),
                    meta: None,
                    error: None,
                    affected_rows: None,
                })
            }
            Err(e) => Ok(QueryResult {
                ok: false,
                raw: None,
                meta: None,
                error: Some(serde_json::Value::String(e.to_string())),
                affected_rows: None,
            }),
        }
    }

    /// No-op disconnect — reqwest Client is stateless with no persistent connections.
    async fn disconnect(&mut self) -> Result<(), AppError> {
        Ok(())
    }
}

// TODO: Full parity items:
// - Partition key support for writes and cross-partition queries
// - Continuation token handling for large result sets (x-ms-continuation)
// - Stored procedure / UDF execution
// - Document CRUD operations (create, replace, upsert, delete)
// - Connection timeout configuration from connection string
