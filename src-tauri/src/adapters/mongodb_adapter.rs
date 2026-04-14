/** MongoDB adapter for the Tauri backend. */
use async_trait::async_trait;
use futures_util::StreamExt;
use mongodb::{bson::Document, Client, Collection};
use serde_json::Value;
use std::collections::HashMap;
use tokio::sync::Mutex;

use crate::{error::AppError, types::*};

use super::DataAdapter;

/// Maximum number of documents to scan when inferring column types.
const MAX_ITEM_COUNT_TO_SCAN: i64 = 10;

/// MongoDB adapter backed by the `mongodb` crate (v3).
///
/// Stores the `mongodb::Client` behind an `Option<Mutex<>>` so that
/// `authenticate()` can establish the connection and `disconnect()` can
/// drop it.  The raw connection string is retained for reconnection.
pub struct MongodbAdapter {
    /// Raw connection string (e.g. `mongodb://host:27017`).
    connection_string: String,
    /// Active MongoDB client, set after `authenticate()`.
    client: Option<Mutex<Client>>,
}

impl MongodbAdapter {
    /// Creates a new `MongodbAdapter` from a connection string.
    ///
    /// The connection string should start with `mongodb://` or `mongodb+srv://`.
    /// The client is not connected until `authenticate()` is called.
    pub fn new(connection: &str) -> Result<Self, AppError> {
        Ok(Self {
            connection_string: connection.to_string(),
            client: None,
        })
    }

    /// Returns a reference to the connected client or an error if not authenticated.
    fn get_client(&self) -> Result<&Mutex<Client>, AppError> {
        self.client
            .as_ref()
            .ok_or_else(|| AppError::Connection("MongoDB client not connected. Call authenticate() first.".into()))
    }

    /// Infers column metadata by inspecting document fields and their BSON types.
    ///
    /// Scans up to `MAX_ITEM_COUNT_TO_SCAN` documents, collecting every unique
    /// field name and its inferred type string.  The `_id` field is marked as
    /// the primary key.
    fn infer_columns_from_docs(docs: &[Document]) -> Vec<ColumnMetaData> {
        let mut field_types: HashMap<String, String> = HashMap::new();

        for doc in docs {
            for (key, value) in doc.iter() {
                if !field_types.contains_key(key) {
                    let type_str = Self::bson_type_string(value);
                    field_types.insert(key.to_string(), type_str);
                }
            }
        }

        let mut columns: Vec<ColumnMetaData> = field_types
            .into_iter()
            .map(|(name, col_type)| {
                let is_id = name == "_id";
                ColumnMetaData {
                    name,
                    col_type,
                    allow_null: None,
                    primary_key: if is_id { Some(true) } else { None },
                    auto_increment: None,
                    comment: None,
                    references: None,
                    nested: None,
                    property_path: None,
                    kind: None,
                    referenced_table_name: None,
                    referenced_column_name: None,
                    extra: HashMap::new(),
                }
            })
            .collect();

        // Sort so _id comes first, then alphabetical.
        columns.sort_by(|a, b| {
            if a.name == "_id" {
                std::cmp::Ordering::Less
            } else if b.name == "_id" {
                std::cmp::Ordering::Greater
            } else {
                a.name.cmp(&b.name)
            }
        });

        columns
    }

    /// Maps a BSON value to a human-readable type string.
    fn bson_type_string(value: &mongodb::bson::Bson) -> String {
        use mongodb::bson::Bson;
        match value {
            Bson::Double(_) => "Double".into(),
            Bson::String(_) => "String".into(),
            Bson::Array(_) => "Array".into(),
            Bson::Document(_) => "Object".into(),
            Bson::Boolean(_) => "Boolean".into(),
            Bson::Null => "Null".into(),
            Bson::Int32(_) => "Int32".into(),
            Bson::Int64(_) => "Int64".into(),
            Bson::DateTime(_) => "DateTime".into(),
            Bson::Binary(_) => "Binary".into(),
            Bson::ObjectId(_) => "ObjectId".into(),
            Bson::RegularExpression(_) => "Regex".into(),
            Bson::Timestamp(_) => "Timestamp".into(),
            Bson::Decimal128(_) => "Decimal128".into(),
            _ => "Unknown".into(),
        }
    }

    /// Parses a simplified MongoDB command string and executes it.
    ///
    /// Supported command patterns:
    /// - `db.collection('name').find({...})`
    /// - `db.collection('name').insertOne({...})`
    /// - `db.collection('name').insertMany([{...}, ...])`
    /// - `db.collection('name').updateOne({filter}, {update})`
    /// - `db.collection('name').updateMany({filter}, {update})`
    /// - `db.collection('name').deleteOne({filter})`
    /// - `db.collection('name').deleteMany({filter})`
    /// - `db.collection('name').countDocuments({filter})`
    /// - `db.collection('name').aggregate([{...}])`
    /// - Raw JSON is executed via `db.runCommand()`.
    async fn execute_command(
        &self,
        sql: &str,
        database: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        let client_mutex = self.get_client()?;
        let client = client_mutex.lock().await;
        let db_name = database.unwrap_or("test");
        let db = client.database(db_name);

        let trimmed = sql.trim();

        // Try raw JSON as runCommand.
        if trimmed.starts_with('{') {
            let json_value: Value = serde_json::from_str(trimmed)
                .map_err(|e| AppError::Query(format!("Invalid JSON: {}", e)))?;
            let doc: Document = mongodb::bson::to_document(&json_value)
                .map_err(|e| AppError::Query(format!("BSON conversion error: {}", e)))?;

            let result = db
                .run_command(doc)
                .await
                .map_err(|e| AppError::Query(format!("runCommand error: {}", e)))?;

            let json_val = serde_json::to_value(&result).ok();

            return Ok(QueryResult {
                ok: true,
                raw: None,
                meta: json_val,
                error: None,
                affected_rows: None,
            });
        }

        // Parse db.collection('name').operation(...) patterns.
        let re = regex::Regex::new(
            r#"(?s)db\.collection\(\s*['"]([^'"]+)['"]\s*\)\s*\.\s*(\w+)\s*\((.*)\)\s*$"#,
        )
        .map_err(|e| AppError::Query(format!("Regex error: {}", e)))?;

        let caps = re.captures(trimmed).ok_or_else(|| {
            AppError::Query(
                "Invalid MongoDB syntax. Use db.collection('name').operation({...}) or raw JSON for runCommand. \
                 Refer to https://synle.github.io/sqlui-native/guides#mongodb"
                    .into(),
            )
        })?;

        let collection_name = &caps[1];
        let operation = &caps[2];
        let args_str = caps[3].trim();

        let collection: Collection<Document> = db.collection(collection_name);

        match operation {
            "find" => {
                let filter = Self::parse_document_arg(args_str, true)?;
                let mut cursor = collection
                    .find(filter)
                    .await
                    .map_err(|e| AppError::Query(format!("find error: {}", e)))?;

                let mut rows: Vec<Value> = Vec::new();
                while let Some(doc) = cursor.next().await {
                    let doc = doc.map_err(|e| AppError::Query(format!("cursor error: {}", e)))?;
                    if let Ok(val) = serde_json::to_value(&doc) {
                        rows.push(val);
                    }
                }
                Ok(QueryResult {
                    ok: true,
                    raw: Some(rows),
                    meta: None,
                    error: None,
                    affected_rows: None,
                })
            }
            "insertOne" => {
                let doc = Self::parse_document_arg(args_str, false)?;
                let result = collection
                    .insert_one(doc)
                    .await
                    .map_err(|e| AppError::Query(format!("insertOne error: {}", e)))?;
                Ok(QueryResult {
                    ok: true,
                    raw: None,
                    meta: serde_json::to_value(&result.inserted_id).ok(),
                    error: None,
                    affected_rows: Some(1),
                })
            }
            "insertMany" => {
                let docs = Self::parse_document_array_arg(args_str)?;
                let count = docs.len() as i64;
                collection
                    .insert_many(docs)
                    .await
                    .map_err(|e| AppError::Query(format!("insertMany error: {}", e)))?;
                Ok(QueryResult {
                    ok: true,
                    raw: None,
                    meta: Some(serde_json::json!({ "insertedCount": count })),
                    error: None,
                    affected_rows: Some(count),
                })
            }
            "updateOne" | "updateMany" => {
                let (filter, update) = Self::parse_two_document_args(args_str)?;
                let result = if operation == "updateOne" {
                    collection
                        .update_one(filter, update)
                        .await
                        .map_err(|e| AppError::Query(format!("updateOne error: {}", e)))?
                } else {
                    collection
                        .update_many(filter, update)
                        .await
                        .map_err(|e| AppError::Query(format!("updateMany error: {}", e)))?
                };
                Ok(QueryResult {
                    ok: true,
                    raw: None,
                    meta: Some(serde_json::json!({
                        "matchedCount": result.matched_count,
                        "modifiedCount": result.modified_count,
                    })),
                    error: None,
                    affected_rows: Some(result.modified_count as i64),
                })
            }
            "deleteOne" => {
                let filter = Self::parse_document_arg(args_str, false)?;
                let result = collection
                    .delete_one(filter)
                    .await
                    .map_err(|e| AppError::Query(format!("deleteOne error: {}", e)))?;
                Ok(QueryResult {
                    ok: true,
                    raw: None,
                    meta: Some(serde_json::json!({ "deletedCount": result.deleted_count })),
                    error: None,
                    affected_rows: Some(result.deleted_count as i64),
                })
            }
            "deleteMany" => {
                let filter = Self::parse_document_arg(args_str, false)?;
                let result = collection
                    .delete_many(filter)
                    .await
                    .map_err(|e| AppError::Query(format!("deleteMany error: {}", e)))?;
                Ok(QueryResult {
                    ok: true,
                    raw: None,
                    meta: Some(serde_json::json!({ "deletedCount": result.deleted_count })),
                    error: None,
                    affected_rows: Some(result.deleted_count as i64),
                })
            }
            "countDocuments" => {
                let filter = Self::parse_document_arg(args_str, true)?;
                let count = collection
                    .count_documents(filter)
                    .await
                    .map_err(|e| AppError::Query(format!("countDocuments error: {}", e)))?;
                Ok(QueryResult {
                    ok: true,
                    raw: Some(vec![serde_json::json!({ "count": count })]),
                    meta: None,
                    error: None,
                    affected_rows: None,
                })
            }
            "aggregate" => {
                let pipeline = Self::parse_document_array_arg(args_str)?;
                let mut cursor = collection
                    .aggregate(pipeline)
                    .await
                    .map_err(|e| AppError::Query(format!("aggregate error: {}", e)))?;

                let mut rows: Vec<Value> = Vec::new();
                while let Some(doc) = cursor.next().await {
                    let doc = doc.map_err(|e| AppError::Query(format!("cursor error: {}", e)))?;
                    if let Ok(val) = serde_json::to_value(&doc) {
                        rows.push(val);
                    }
                }
                Ok(QueryResult {
                    ok: true,
                    raw: Some(rows),
                    meta: None,
                    error: None,
                    affected_rows: None,
                })
            }
            _ => Err(AppError::Query(format!(
                "Unsupported MongoDB operation: '{}'. Supported: find, insertOne, insertMany, \
                 updateOne, updateMany, deleteOne, deleteMany, countDocuments, aggregate.",
                operation
            ))),
        }
    }

    /// Parses a JSON string into a BSON `Document`.
    ///
    /// If `allow_empty` is true and the input is empty, returns an empty document.
    fn parse_document_arg(args_str: &str, allow_empty: bool) -> Result<Document, AppError> {
        let trimmed = args_str.trim();
        if trimmed.is_empty() && allow_empty {
            return Ok(Document::new());
        }
        // Strip trailing comma if present (for multi-arg parsing leftovers).
        let cleaned = trimmed.trim_end_matches(',').trim();
        let value: Value = serde_json::from_str(cleaned)
            .map_err(|e| AppError::Query(format!("Invalid JSON argument: {} -- input: {}", e, cleaned)))?;
        let doc = mongodb::bson::to_document(&value)
            .map_err(|e| AppError::Query(format!("BSON conversion error: {}", e)))?;
        Ok(doc)
    }

    /// Parses a JSON array string into a vector of BSON `Document`s.
    fn parse_document_array_arg(args_str: &str) -> Result<Vec<Document>, AppError> {
        let trimmed = args_str.trim();
        let value: Value = serde_json::from_str(trimmed)
            .map_err(|e| AppError::Query(format!("Invalid JSON array argument: {}", e)))?;
        let arr = value
            .as_array()
            .ok_or_else(|| AppError::Query("Expected a JSON array".into()))?;
        arr.iter()
            .map(|v| {
                mongodb::bson::to_document(v)
                    .map_err(|e| AppError::Query(format!("BSON conversion error: {}", e)))
            })
            .collect()
    }

    /// Parses two comma-separated JSON objects from an argument string.
    ///
    /// Used for operations like `updateOne({filter}, {update})`.
    fn parse_two_document_args(args_str: &str) -> Result<(Document, Document), AppError> {
        let trimmed = args_str.trim();
        // Find the split point: end of the first JSON object.
        let mut depth = 0;
        let mut split_pos = None;
        for (i, ch) in trimmed.char_indices() {
            match ch {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        split_pos = Some(i + 1);
                        break;
                    }
                }
                _ => {}
            }
        }
        let split_pos = split_pos
            .ok_or_else(|| AppError::Query("Expected two JSON object arguments separated by comma".into()))?;
        let first_str = &trimmed[..split_pos];
        let rest = trimmed[split_pos..].trim();
        let rest = rest.strip_prefix(',').unwrap_or(rest).trim();
        let first = Self::parse_document_arg(first_str, false)?;
        let second = Self::parse_document_arg(rest, false)?;
        Ok((first, second))
    }
}

#[async_trait]
impl DataAdapter for MongodbAdapter {
    /// Returns the MongoDB dialect identifier.
    fn dialect(&self) -> Option<Dialect> {
        Some(Dialect::Mongodb)
    }

    /// Authenticates by connecting to the MongoDB server and listing database names.
    async fn authenticate(&mut self) -> Result<(), AppError> {
        let client = Client::with_uri_str(&self.connection_string)
            .await
            .map_err(|e| AppError::Connection(format!("MongoDB connection failed: {}", e)))?;

        // Verify connectivity by listing databases.
        client
            .list_database_names()
            .await
            .map_err(|e| AppError::Connection(format!("MongoDB connectivity check failed: {}", e)))?;

        self.client = Some(Mutex::new(client));
        Ok(())
    }

    /// Lists all databases on the MongoDB server.
    async fn get_databases(&self) -> Result<Vec<DatabaseMetaData>, AppError> {
        let client_mutex = self.get_client()?;
        let client = client_mutex.lock().await;

        let db_names = client
            .list_database_names()
            .await
            .map_err(|e| AppError::Query(format!("Failed to list databases: {}", e)))?;

        Ok(db_names
            .into_iter()
            .map(|name| DatabaseMetaData {
                name,
                tables: vec![],
            })
            .collect())
    }

    /// Lists all collections in the specified database.
    async fn get_tables(&self, database: Option<&str>) -> Result<Vec<TableMetaData>, AppError> {
        let db_name = database
            .ok_or_else(|| AppError::BadRequest("Database name is required for MongoDB getTables".into()))?;

        let client_mutex = self.get_client()?;
        let client = client_mutex.lock().await;
        let db = client.database(db_name);

        let collection_names = db
            .list_collection_names()
            .await
            .map_err(|e| AppError::Query(format!("Failed to list collections: {}", e)))?;

        Ok(collection_names
            .into_iter()
            .map(|name| TableMetaData {
                id: None,
                name,
                columns: vec![],
            })
            .collect())
    }

    /// Infers column metadata by scanning up to 10 sample documents from a collection.
    ///
    /// The `_id` field is marked as the primary key.
    async fn get_columns(
        &self,
        table: &str,
        database: Option<&str>,
    ) -> Result<Vec<ColumnMetaData>, AppError> {
        let db_name = database
            .ok_or_else(|| AppError::BadRequest("Database name is required for MongoDB getColumns".into()))?;

        let client_mutex = self.get_client()?;
        let client = client_mutex.lock().await;
        let db = client.database(db_name);
        let collection: Collection<Document> = db.collection(table);

        let mut cursor = collection
            .find(Document::new())
            .limit(MAX_ITEM_COUNT_TO_SCAN)
            .await
            .map_err(|e| AppError::Query(format!("Failed to sample documents: {}", e)))?;

        let mut docs: Vec<Document> = Vec::new();
        while let Some(doc) = cursor.next().await {
            match doc {
                Ok(d) => docs.push(d),
                Err(e) => {
                    log::error!("MongodbAdapter:get_columns cursor error: {}", e);
                    break;
                }
            }
        }

        Ok(Self::infer_columns_from_docs(&docs))
    }

    /// Executes a MongoDB command string against the specified database.
    ///
    /// Supports `db.collection('name').operation({...})` syntax for common CRUD
    /// operations, as well as raw JSON for `runCommand`.
    async fn execute(
        &self,
        sql: &str,
        database: Option<&str>,
        _table: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        match self.execute_command(sql, database).await {
            Ok(result) => Ok(result),
            Err(e) => Ok(QueryResult {
                ok: false,
                raw: None,
                meta: None,
                error: Some(serde_json::json!(e.to_string())),
                affected_rows: None,
            }),
        }
    }

    /// Drops the MongoDB client and releases all connections.
    async fn disconnect(&mut self) -> Result<(), AppError> {
        self.client = None;
        Ok(())
    }
}
