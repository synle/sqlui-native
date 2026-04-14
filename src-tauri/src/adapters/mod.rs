pub mod sqlite_adapter;
pub mod mysql_adapter;
pub mod postgres_adapter;
pub mod mssql_adapter;
pub mod mongodb_adapter;
pub mod redis_adapter;
pub mod cassandra_adapter;
pub mod cosmosdb_adapter;
pub mod aztable_adapter;
pub mod salesforce_adapter;
pub mod restapi_adapter;
pub mod graphql_adapter;

use async_trait::async_trait;

use crate::error::AppError;
use crate::types::*;

/// Trait that all database adapters must implement.
/// Mirrors the TypeScript `IDataAdapter` interface.
#[async_trait]
pub trait DataAdapter: Send + Sync {
    /// Returns the dialect for this adapter.
    fn dialect(&self) -> Option<Dialect>;

    /// Validates the connection is reachable.
    async fn authenticate(&mut self) -> Result<(), AppError>;

    /// Lists all databases/keyspaces/schemas.
    async fn get_databases(&self) -> Result<Vec<DatabaseMetaData>, AppError>;

    /// Lists all tables/collections in a database.
    async fn get_tables(&self, database: Option<&str>) -> Result<Vec<TableMetaData>, AppError>;

    /// Lists all columns/fields for a table.
    async fn get_columns(
        &self,
        table: &str,
        database: Option<&str>,
    ) -> Result<Vec<ColumnMetaData>, AppError>;

    /// Executes a query/command and returns the result.
    async fn execute(
        &self,
        sql: &str,
        database: Option<&str>,
        table: Option<&str>,
    ) -> Result<QueryResult, AppError>;

    /// Closes all connections and cleans up resources.
    async fn disconnect(&mut self) -> Result<(), AppError>;

    /// Optional: runs connection diagnostics (REST/GraphQL).
    async fn run_diagnostics(&self) -> Result<Vec<ConnectionDiagnostic>, AppError> {
        Ok(vec![])
    }
}

/// Creates the appropriate adapter based on the connection string's dialect scheme.
pub fn create_adapter(connection: &str) -> Result<Box<dyn DataAdapter>, AppError> {
    let dialect = parse_dialect(connection).ok_or_else(|| {
        AppError::Connection(format!(
            "Unsupported connection scheme: {}",
            connection.split("://").next().unwrap_or("unknown")
        ))
    })?;

    match dialect {
        Dialect::Sqlite => Ok(Box::new(sqlite_adapter::SqliteAdapter::new(connection)?)),
        Dialect::Mysql | Dialect::Mariadb => {
            Ok(Box::new(mysql_adapter::MysqlAdapter::new(connection)?))
        }
        Dialect::Postgres | Dialect::Postgresql => {
            Ok(Box::new(postgres_adapter::PostgresAdapter::new(connection)?))
        }
        Dialect::Mssql => Ok(Box::new(mssql_adapter::MssqlAdapter::new(connection)?)),
        Dialect::Mongodb => Ok(Box::new(mongodb_adapter::MongodbAdapter::new(connection)?)),
        Dialect::Redis | Dialect::Rediss => {
            Ok(Box::new(redis_adapter::RedisAdapter::new(connection)?))
        }
        Dialect::Cassandra => Ok(Box::new(cassandra_adapter::CassandraAdapter::new(
            connection,
        )?)),
        Dialect::Cosmosdb => Ok(Box::new(cosmosdb_adapter::CosmosdbAdapter::new(
            connection,
        )?)),
        Dialect::Aztable => Ok(Box::new(aztable_adapter::AztableAdapter::new(connection)?)),
        Dialect::Sfdc => Ok(Box::new(salesforce_adapter::SalesforceAdapter::new(
            connection,
        )?)),
        Dialect::Rest => Ok(Box::new(restapi_adapter::RestApiAdapter::new(connection)?)),
        Dialect::Graphql => Ok(Box::new(graphql_adapter::GraphqlAdapter::new(connection)?)),
    }
}
