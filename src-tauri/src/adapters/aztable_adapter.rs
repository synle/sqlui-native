/** Azure Table Storage adapter using reqwest for REST API calls. */

use async_trait::async_trait;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use hmac::{Hmac, Mac};
use reqwest::Client;
use sha2::Sha256;
use std::collections::HashMap;

use crate::error::AppError;
use crate::types::*;

use super::DataAdapter;

/// Maximum number of entities to scan when inferring column types.
const MAX_ITEM_COUNT_TO_SCAN: usize = 5;

/// Azure Table Storage adapter that communicates via the Table Storage REST API.
///
/// Connection string format:
/// `aztable://DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net`
///
/// Uses SharedKeyLite authorization with HMAC-SHA256 signing.
pub struct AztableAdapter {
    /// The storage account name.
    account_name: String,
    /// The Base64-encoded account key for HMAC-SHA256 signing.
    account_key: String,
    /// The table service endpoint URL (e.g., `https://myaccount.table.core.windows.net`).
    endpoint: String,
    /// Shared HTTP client reused across all requests.
    client: Client,
}

/// Parsed key-value pairs from an Azure Table Storage connection string.
struct AztableConnectionConfig {
    /// The storage account name.
    account_name: String,
    /// The Base64-encoded account key.
    account_key: String,
    /// The protocol (http or https).
    protocol: String,
    /// The endpoint suffix (e.g., `core.windows.net`).
    endpoint_suffix: String,
}

/// Parses an `aztable://DefaultEndpointsProtocol=...;AccountName=...;AccountKey=...` connection string.
///
/// Handles Base64 padding characters (`=`) in AccountKey by splitting on the first `=` only.
///
/// @param connection - The raw connection string with `aztable://` scheme.
/// @returns Parsed config with account name, key, protocol, and endpoint suffix.
fn parse_aztable_connection(connection: &str) -> Result<AztableConnectionConfig, AppError> {
    let without_scheme = connection
        .strip_prefix("aztable://")
        .ok_or_else(|| AppError::Connection("Missing aztable:// scheme".into()))?;

    let mut account_name = String::new();
    let mut account_key = String::new();
    let mut protocol = "https".to_string();
    let mut endpoint_suffix = "core.windows.net".to_string();

    for part in without_scheme.split(';') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        if let Some((key, _)) = part.split_once('=') {
            let key_lower = key.trim().to_lowercase();
            // Take everything after first '=' to handle Base64 padding in AccountKey
            let value = part.splitn(2, '=').nth(1).unwrap_or("").trim().to_string();

            match key_lower.as_str() {
                "defaultendpointsprotocol" => protocol = value,
                "accountname" => account_name = value,
                "accountkey" => account_key = value,
                "endpointsuffix" => endpoint_suffix = value,
                _ => {} // Ignore unknown keys (e.g., TableEndpoint)
            }
        }
    }

    if account_name.is_empty() {
        return Err(AppError::Connection(
            "Missing AccountName in Azure Table Storage connection string. \
             Expected format: aztable://DefaultEndpointsProtocol=https;AccountName=...;AccountKey=..."
                .into(),
        ));
    }

    if account_key.is_empty() {
        return Err(AppError::Connection(
            "Missing AccountKey in Azure Table Storage connection string. \
             Expected format: aztable://DefaultEndpointsProtocol=https;AccountName=...;AccountKey=..."
                .into(),
        ));
    }

    Ok(AztableConnectionConfig {
        account_name,
        account_key,
        protocol,
        endpoint_suffix,
    })
}

/// Generates the SharedKeyLite authorization header for Azure Table Storage REST API.
///
/// SharedKeyLite string-to-sign format for Table Storage:
/// `{Date}\n/{accountName}/{resourcePath}`
///
/// This is simpler than full SharedKey and sufficient for Table Storage operations.
///
/// @param date - The x-ms-date header value in RFC 1123 format.
/// @param account_name - The storage account name.
/// @param account_key_base64 - The Base64-encoded account key.
/// @param resource_path - The canonicalized resource (e.g., "Tables", "mytable()").
/// @returns The Authorization header value: `SharedKeyLite {account}:{signature}`.
fn generate_shared_key_lite_auth(
    date: &str,
    account_name: &str,
    account_key_base64: &str,
    resource_path: &str,
) -> Result<String, AppError> {
    let key_bytes = BASE64.decode(account_key_base64).map_err(|e| {
        AppError::Connection(format!(
            "Failed to decode AccountKey (invalid Base64): {}",
            e
        ))
    })?;

    // SharedKeyLite for Table Storage: Date + "\n" + CanonicalizedResource
    let canonicalized_resource = format!("/{}/{}", account_name, resource_path);
    let string_to_sign = format!("{}\n{}", date, canonicalized_resource);

    type HmacSha256 = Hmac<Sha256>;
    let mut mac = HmacSha256::new_from_slice(&key_bytes)
        .map_err(|e| AppError::Connection(format!("HMAC key initialization failed: {}", e)))?;
    mac.update(string_to_sign.as_bytes());
    let signature = BASE64.encode(mac.finalize().into_bytes());

    Ok(format!("SharedKeyLite {}:{}", account_name, signature))
}

/// Generates an RFC 1123 formatted UTC date string for the x-ms-date header.
fn rfc1123_date() -> String {
    chrono::Utc::now()
        .format("%a, %d %b %Y %H:%M:%S GMT")
        .to_string()
}

/// Infers column metadata from a set of JSON entities by examining their keys and value types.
///
/// Applies Azure Table Storage conventions:
/// - `PartitionKey` / `partitionKey` gets the `clustering` kind
/// - `RowKey` / `rowKey` gets the `partition_key` kind and is marked as primary key
///
/// @param items - The JSON entities to scan.
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
        .map(|(name, col_type)| {
            let kind = match name.as_str() {
                "partitionKey" | "PartitionKey" => Some("clustering".to_string()),
                "rowKey" | "RowKey" => Some("partition_key".to_string()),
                _ => None,
            };
            let primary_key = match name.as_str() {
                "rowKey" | "RowKey" => Some(true),
                _ => None,
            };

            ColumnMetaData {
                name,
                col_type,
                primary_key,
                kind,
                ..Default::default()
            }
        })
        .collect();

    cols.sort_by(|a, b| a.name.cmp(&b.name));
    cols
}

impl AztableAdapter {
    /// Creates a new Azure Table Storage adapter by parsing the connection string.
    ///
    /// @param connection - Connection string: `aztable://DefaultEndpointsProtocol=...;AccountName=...;AccountKey=...`
    pub fn new(connection: &str) -> Result<Self, AppError> {
        let config = parse_aztable_connection(connection)?;
        let endpoint = format!(
            "{}://{}.table.{}",
            config.protocol, config.account_name, config.endpoint_suffix
        );

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| AppError::Connection(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            account_name: config.account_name,
            account_key: config.account_key,
            endpoint,
            client,
        })
    }

    /// Makes an authenticated GET request to the Azure Table Storage REST API.
    ///
    /// Uses SharedKeyLite authorization with HMAC-SHA256 signing.
    ///
    /// @param path - The URL path after the endpoint (e.g., "Tables", "mytable()").
    async fn rest_get(&self, path: &str) -> Result<serde_json::Value, AppError> {
        let date = rfc1123_date();

        // The canonicalized resource path is everything before query parameters
        let resource_path = path.split('?').next().unwrap_or(path);
        let auth = generate_shared_key_lite_auth(
            &date,
            &self.account_name,
            &self.account_key,
            resource_path,
        )?;

        let url = format!("{}/{}", self.endpoint, path);

        let response = self
            .client
            .get(&url)
            .header("Authorization", &auth)
            .header("x-ms-date", &date)
            .header("x-ms-version", "2019-02-02")
            .header("Accept", "application/json;odata=nometadata")
            .header("DataServiceVersion", "3.0;NetFx")
            .send()
            .await
            .map_err(|e| {
                AppError::Connection(format!("Azure Table Storage REST request failed: {}", e))
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "No response body".into());
            return Err(AppError::Connection(format!(
                "Azure Table Storage REST API returned {}: {}",
                status, body
            )));
        }

        response.json::<serde_json::Value>().await.map_err(|e| {
            AppError::Query(format!(
                "Failed to parse Azure Table Storage response: {}",
                e
            ))
        })
    }
}

#[async_trait]
impl DataAdapter for AztableAdapter {
    /// Returns the Azure Table Storage dialect identifier.
    fn dialect(&self) -> Option<Dialect> {
        Some(Dialect::Aztable)
    }

    /// Authenticates by listing tables to verify the account credentials are valid.
    async fn authenticate(&mut self) -> Result<(), AppError> {
        self.rest_get("Tables")
            .await
            .map_err(|e| {
                AppError::Connection(format!(
                    "Azure Table Storage authentication failed: {}. \
                     Verify that your AccountName and AccountKey are correct.",
                    e
                ))
            })?;
        Ok(())
    }

    /// Returns a single hard-coded database entry for Azure Table Storage.
    ///
    /// Azure Table Storage does not have the concept of multiple databases — all tables
    /// live under a single storage account.
    async fn get_databases(&self) -> Result<Vec<DatabaseMetaData>, AppError> {
        Ok(vec![DatabaseMetaData {
            name: "Azure Table Storage".to_string(),
            tables: vec![],
        }])
    }

    /// Lists all tables in the Azure Table Storage account.
    ///
    /// @param _database - Unused; Azure Table Storage has a flat table namespace.
    async fn get_tables(&self, _database: Option<&str>) -> Result<Vec<TableMetaData>, AppError> {
        let result = self.rest_get("Tables").await?;

        let tables = result["value"]
            .as_array()
            .unwrap_or(&Vec::new())
            .iter()
            .filter_map(|t| {
                t["TableName"].as_str().map(|name| TableMetaData {
                    id: None,
                    name: name.to_string(),
                    columns: vec![],
                })
            })
            .collect();

        Ok(tables)
    }

    /// Infers column metadata by scanning sample entities from a table.
    ///
    /// Queries up to `MAX_ITEM_COUNT_TO_SCAN` entities and unions all observed keys.
    /// Applies Azure-specific kind annotations for PartitionKey and RowKey.
    ///
    /// @param table - The table name.
    /// @param _database - Unused; Azure Table Storage has a flat table namespace.
    async fn get_columns(
        &self,
        table: &str,
        _database: Option<&str>,
    ) -> Result<Vec<ColumnMetaData>, AppError> {
        let path = format!("{}()?$top={}", table, MAX_ITEM_COUNT_TO_SCAN);
        let result = self.rest_get(&path).await?;

        let items = result["value"].as_array().cloned().unwrap_or_default();

        Ok(infer_columns_from_items(&items))
    }

    /// Executes a query against Azure Table Storage.
    ///
    /// The `sql` parameter is treated as OData query options appended to the table URL:
    /// - If empty: returns all entities from the table
    /// - If starts with `$`: treated as raw OData options (e.g., `$filter=...&$select=...`)
    /// - Otherwise: treated as a `$filter` expression
    ///
    /// @param sql - The OData query expression.
    /// @param _database - Unused.
    /// @param table - The table name to query (required).
    async fn execute(
        &self,
        sql: &str,
        _database: Option<&str>,
        table: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        let table_name = table.ok_or_else(|| {
            AppError::BadRequest("Table is required for Azure Table Storage execute".into())
        })?;

        let trimmed = sql.trim();
        let path = if trimmed.is_empty() {
            format!("{}()", table_name)
        } else if trimmed.starts_with('$') {
            // Already has OData prefix (e.g., $filter=...)
            format!("{}()?{}", table_name, trimmed)
        } else {
            // Assume it is a filter expression
            format!(
                "{}()?$filter={}",
                table_name,
                urlencoding::encode(trimmed)
            )
        };

        match self.rest_get(&path).await {
            Ok(result) => {
                let items = result["value"].as_array().cloned().unwrap_or_default();

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
// - SAS token authentication as an alternative to SharedKey
// - Entity CRUD operations (insert, update, merge, delete) via POST/PUT/MERGE/DELETE
// - Batch/transaction support via $batch endpoint
// - Continuation token handling (x-ms-continuation-NextPartitionKey/NextRowKey)
// - OData select, top, orderby query options parsing
