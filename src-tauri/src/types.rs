use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Supported database dialect identifiers.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Dialect {
    Mysql,
    Mariadb,
    Mssql,
    Postgres,
    Postgresql,
    Sqlite,
    Cassandra,
    Mongodb,
    Redis,
    Rediss,
    Cosmosdb,
    Aztable,
    Sfdc,
    Rest,
    Graphql,
}

impl Dialect {
    /// Returns the dialect scheme string used in connection URLs.
    pub fn as_str(&self) -> &str {
        match self {
            Dialect::Mysql => "mysql",
            Dialect::Mariadb => "mariadb",
            Dialect::Mssql => "mssql",
            Dialect::Postgres => "postgres",
            Dialect::Postgresql => "postgresql",
            Dialect::Sqlite => "sqlite",
            Dialect::Cassandra => "cassandra",
            Dialect::Mongodb => "mongodb",
            Dialect::Redis => "redis",
            Dialect::Rediss => "rediss",
            Dialect::Cosmosdb => "cosmosdb",
            Dialect::Aztable => "aztable",
            Dialect::Sfdc => "sfdc",
            Dialect::Rest => "rest",
            Dialect::Graphql => "graphql",
        }
    }

    /// Returns true if this dialect uses managed metadata (folders/requests).
    pub fn uses_managed_metadata(&self) -> bool {
        matches!(self, Dialect::Rest | Dialect::Graphql)
    }
}

/// Parses a dialect from the scheme portion of a connection string.
pub fn parse_dialect(connection: &str) -> Option<Dialect> {
    let scheme = connection.split("://").next()?;
    match scheme.to_lowercase().as_str() {
        "mysql" => Some(Dialect::Mysql),
        "mariadb" => Some(Dialect::Mariadb),
        "mssql" => Some(Dialect::Mssql),
        "postgres" => Some(Dialect::Postgres),
        "postgresql" => Some(Dialect::Postgresql),
        "sqlite" => Some(Dialect::Sqlite),
        "cassandra" => Some(Dialect::Cassandra),
        "mongodb" | "mongodb+srv" => Some(Dialect::Mongodb),
        "redis" => Some(Dialect::Redis),
        "rediss" => Some(Dialect::Rediss),
        "cosmosdb" => Some(Dialect::Cosmosdb),
        "aztable" => Some(Dialect::Aztable),
        "sfdc" => Some(Dialect::Sfdc),
        "rest" => Some(Dialect::Rest),
        "graphql" => Some(Dialect::Graphql),
        _ => None,
    }
}

/// Server configuration returned by GET /api/configs.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerConfigs {
    pub storage_dir: String,
    pub is_electron: bool,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// Core connection properties (without required id).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoreConnectionProps {
    pub connection: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dialect: Option<Dialect>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub props: Option<serde_json::Value>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// Persisted connection with required id.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionProps {
    pub id: String,
    pub connection: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dialect: Option<Dialect>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub props: Option<serde_json::Value>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// Column metadata for a table.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnMetaData {
    pub name: String,
    #[serde(rename = "type")]
    pub col_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub allow_null: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary_key: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_increment: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub references: Option<TableReferenceMetaData>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nested: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub property_path: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub referenced_table_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub referenced_column_name: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// Default implementation for ColumnMetaData with empty strings and None fields.
impl Default for ColumnMetaData {
    fn default() -> Self {
        Self {
            name: String::new(),
            col_type: String::new(),
            allow_null: None,
            primary_key: None,
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
    }
}

/// Foreign key reference metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableReferenceMetaData {
    pub model: String,
    pub key: String,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// Table metadata with columns.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableMetaData {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub name: String,
    pub columns: Vec<ColumnMetaData>,
}

/// Database metadata with tables.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseMetaData {
    pub name: String,
    pub tables: Vec<TableMetaData>,
}

/// Query result from execute().
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResult {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw: Option<Vec<serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub affected_rows: Option<i64>,
}

/// Session metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<u64>,
}

/// Saved query.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionQuery {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connection_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub database_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub table_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sql: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pinned: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<u64>,
}

/// Folder item (bookmarks, recycle bin, query history).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderItem {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "type")]
    pub item_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connections: Option<Vec<serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<u64>,
}

/// Data snapshot metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataSnapshot {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default)]
    pub values: Vec<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<u64>,
}

/// Managed database (folder for REST/GraphQL connections).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedDatabase {
    pub id: String,
    pub name: String,
    pub connection_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub props: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<u64>,
}

/// Managed table (request for REST/GraphQL connections).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedTable {
    pub id: String,
    pub name: String,
    pub connection_id: String,
    pub database_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub props: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<u64>,
}

/// Connection diagnostic result.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionDiagnostic {
    pub name: String,
    pub success: bool,
    pub message: String,
}

/// Full connection metadata with databases and diagnostics.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoreConnectionMetaData {
    pub connection: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dialect: Option<Dialect>,
    pub databases: Vec<DatabaseMetaData>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub diagnostics: Option<Vec<ConnectionDiagnostic>>,
}

/// Cached schema response for autocomplete.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedSchema {
    pub databases: Vec<DatabaseMetaData>,
    pub tables: Vec<TableMetaData>,
    pub columns: HashMap<String, Vec<ColumnMetaData>>,
}

/// Schema search result.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaSearchResult {
    pub connection_id: String,
    pub connection_name: String,
    pub connection_string: String,
    pub database_id: String,
    pub table_id: String,
    pub column: ColumnMetaData,
}

/// Default application settings.
pub fn default_settings() -> serde_json::Value {
    serde_json::json!({
        "darkMode": "dark",
        "animationMode": "on",
        "layoutMode": "compact",
        "querySelectionMode": "new-tab",
        "editorMode": "advanced",
        "tableRenderer": "advanced",
        "wordWrap": "wrap",
        "queryTabOrientation": "horizontal",
        "querySize": "1000",
        "deleteMode": "soft-delete",
    })
}
