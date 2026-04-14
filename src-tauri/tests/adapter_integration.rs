/// Integration tests for all database adapters.
///
/// Docker-dependent tests auto-skip when containers aren't running.
/// Run with: cd src-tauri && cargo test --test adapter_integration -- --nocapture --test-threads=1
///
/// Connection strings match docker-compose.yml defaults.

use sqlui_native_lib::adapters::{self, DataAdapter};
use sqlui_native_lib::types::QueryResult;

/// Returns true if the error indicates the service is not reachable (Docker not running).
fn is_connection_refused(err: &str) -> bool {
    let e = err.to_lowercase();
    e.contains("connection refused")
        || e.contains("timed out")
        || e.contains("no available servers")
        || e.contains("pool timed out")
        || e.contains("dns error")
        || e.contains("no connections in the pool")
}

/// Helper: test auth + get_databases + execute (for databases that filter system DBs).
/// Auto-skips if the database isn't reachable.
async fn test_adapter_auth_and_execute(conn_str: &str, test_query: &str, label: &str) {
    println!("\n=== Testing {} ===", label);

    let mut adapter = adapters::create_adapter(conn_str)
        .unwrap_or_else(|e| panic!("[{}] Failed to create adapter: {}", label, e));
    println!("[{}] Adapter created", label);

    match adapter.authenticate().await {
        Ok(()) => {}
        Err(e) => {
            let msg = e.to_string();
            if is_connection_refused(&msg) {
                println!("[{}] SKIPPED — service not reachable (Docker not running?)", label);
                let _ = adapter.disconnect().await;
                return;
            }
            let _ = adapter.disconnect().await;
            panic!("[{}] Authentication failed: {}", label, msg);
        }
    }
    println!("[{}] Authenticated OK", label);

    let databases = adapter.get_databases().await.unwrap_or_default();
    println!(
        "[{}] Databases: {:?} ({} found)",
        label,
        databases.iter().map(|d| &d.name).collect::<Vec<_>>(),
        databases.len()
    );

    let db = databases.first().map(|d| d.name.as_str());
    let result = adapter
        .execute(test_query, db, None)
        .await
        .unwrap_or_else(|e| panic!("[{}] Execute failed: {}", label, e));
    assert!(result.ok, "[{}] Query returned ok=false: {:?}", label, result.error);
    println!("[{}] Execute OK", label);

    let _ = adapter.disconnect().await;
    println!("[{}] Test passed", label);
}

/// Helper: run the full adapter lifecycle (authenticate → databases → tables → columns → execute).
/// Auto-skips if the database isn't reachable.
async fn test_adapter_lifecycle(
    conn_str: &str,
    test_query: &str,
    label: &str,
) {
    println!("\n=== Testing {} ===", label);

    let mut adapter = match adapters::create_adapter(conn_str) {
        Ok(a) => a,
        Err(e) => {
            panic!("[{}] Failed to create adapter: {}", label, e);
        }
    };
    println!("[{}] Adapter created", label);

    // Authenticate — skip if service unreachable
    match adapter.authenticate().await {
        Ok(()) => {}
        Err(e) => {
            let msg = e.to_string();
            if is_connection_refused(&msg) {
                println!("[{}] SKIPPED — service not reachable (Docker not running?)", label);
                let _ = adapter.disconnect().await;
                return;
            }
            let _ = adapter.disconnect().await;
            panic!("[{}] Authentication failed: {}", label, msg);
        }
    }
    println!("[{}] Authenticated OK", label);

    // Get databases
    let databases = match adapter.get_databases().await {
        Ok(dbs) => dbs,
        Err(e) => {
            let _ = adapter.disconnect().await;
            panic!("[{}] get_databases failed: {}", label, e);
        }
    };
    println!("[{}] Databases: {:?}", label, databases.iter().map(|d| &d.name).collect::<Vec<_>>());
    assert!(!databases.is_empty(), "[{}] Expected at least one database", label);

    let db_name = &databases[0].name;

    // Get tables
    let tables = match adapter.get_tables(Some(db_name)).await {
        Ok(t) => t,
        Err(e) => {
            eprintln!("[{}] get_tables failed (non-fatal): {}", label, e);
            vec![]
        }
    };
    println!("[{}] Tables in '{}': {} found", label, db_name, tables.len());

    // Get columns (if tables exist)
    if let Some(first_table) = tables.first() {
        let columns = match adapter.get_columns(&first_table.name, Some(db_name)).await {
            Ok(c) => c,
            Err(e) => {
                eprintln!("[{}] get_columns failed (non-fatal): {}", label, e);
                vec![]
            }
        };
        println!("[{}] Columns in '{}': {} found", label, first_table.name, columns.len());
    }

    // Execute query
    if !test_query.is_empty() {
        match adapter.execute(test_query, Some(db_name), None).await {
            Ok(result) => {
                println!("[{}] Execute OK: ok={}", label, result.ok);
                assert!(result.ok, "[{}] Query execution returned ok=false: {:?}", label, result.error);
            }
            Err(e) => {
                let _ = adapter.disconnect().await;
                panic!("[{}] Execute failed: {}", label, e);
            }
        }
    }

    let _ = adapter.disconnect().await;
    println!("[{}] Disconnected OK", label);
}

// ==================== MySQL ====================

#[tokio::test]
async fn test_mysql_adapter() {
    test_adapter_auth_and_execute(
        "mysql://root:password123!@localhost:3306",
        "SELECT 1 AS test_col",
        "MySQL",
    )
    .await;
}

// ==================== MariaDB ====================

#[tokio::test]
async fn test_mariadb_adapter() {
    test_adapter_auth_and_execute(
        "mariadb://root:password123!@localhost:33061",
        "SELECT 1 AS test_col",
        "MariaDB",
    )
    .await;
}

// ==================== PostgreSQL ====================

#[tokio::test]
async fn test_postgres_adapter() {
    test_adapter_lifecycle(
        "postgres://postgres:password123!@localhost:5432",
        "SELECT 1 AS test_col",
        "PostgreSQL",
    )
    .await;
}

// ==================== MSSQL ====================

#[tokio::test]
async fn test_mssql_adapter() {
    test_adapter_auth_and_execute(
        "mssql://sa:password123!@localhost:1433",
        "SELECT 1 AS test_col",
        "MSSQL",
    )
    .await;
}

// ==================== SQLite ====================

#[tokio::test]
async fn test_sqlite_adapter() {
    let db_path = std::env::temp_dir().join("sqlui_test_integration.sqlite");
    let conn_str = format!("sqlite://{}", db_path.display());

    let mut adapter = adapters::create_adapter(&conn_str).expect("create SQLite adapter");
    adapter.authenticate().await.expect("SQLite auth");

    let databases = adapter.get_databases().await.expect("SQLite get_databases");
    assert!(!databases.is_empty(), "SQLite should have at least one database (main)");
    println!("[SQLite] Databases: {:?}", databases.iter().map(|d| &d.name).collect::<Vec<_>>());

    // Create a test table
    let _ = adapter
        .execute("CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)", Some("main"), None)
        .await;

    let tables = adapter.get_tables(Some("main")).await.expect("SQLite get_tables");
    println!("[SQLite] Tables: {:?}", tables.iter().map(|t| &t.name).collect::<Vec<_>>());

    if let Some(t) = tables.iter().find(|t| t.name == "test_table") {
        let columns = adapter.get_columns(&t.name, Some("main")).await.expect("SQLite get_columns");
        println!("[SQLite] Columns: {:?}", columns.iter().map(|c| &c.name).collect::<Vec<_>>());
        assert!(columns.len() >= 2, "test_table should have at least 2 columns");
    }

    let result = adapter
        .execute("SELECT 1 AS test_col", Some("main"), None)
        .await
        .expect("SQLite execute");
    assert!(result.ok, "SQLite query should succeed");

    let _ = adapter.disconnect().await;

    // Cleanup
    let _ = std::fs::remove_file(&db_path);
    println!("[SQLite] Test passed and cleaned up");
}

// ==================== MongoDB ====================

#[tokio::test]
async fn test_mongodb_adapter() {
    test_adapter_lifecycle(
        "mongodb://localhost:27017",
        r#"{"ping": 1}"#,
        "MongoDB",
    )
    .await;
}

// ==================== Redis ====================

#[tokio::test]
async fn test_redis_adapter() {
    let mut adapter = adapters::create_adapter("redis://localhost:6379").expect("create Redis adapter");
    match adapter.authenticate().await {
        Ok(()) => {}
        Err(e) => {
            let msg = e.to_string();
            if is_connection_refused(&msg) {
                println!("[Redis] SKIPPED — service not reachable (Docker not running?)");
                return;
            }
            panic!("[Redis] Authentication failed: {}", msg);
        }
    }

    let databases = adapter.get_databases().await.expect("Redis get_databases");
    println!("[Redis] Databases: {:?}", databases.iter().map(|d| &d.name).collect::<Vec<_>>());
    assert!(!databases.is_empty(), "Redis should have at least one database");

    let tables = adapter.get_tables(Some(&databases[0].name)).await.unwrap_or_default();
    println!("[Redis] Keys in '{}': {} found", databases[0].name, tables.len());

    let result = adapter
        .execute("INFO", Some(&databases[0].name), None)
        .await
        .expect("Redis execute");
    assert!(result.ok, "Redis INFO should succeed");
    println!("[Redis] Execute OK");

    let _ = adapter.disconnect().await;
    println!("[Redis] Test passed");
}

// ==================== Cassandra ====================

#[tokio::test]
async fn test_cassandra_adapter() {
    test_adapter_lifecycle(
        "cassandra://cassandra:cassandra@localhost:9042",
        "SELECT cluster_name, release_version FROM system.local",
        "Cassandra",
    )
    .await;
}

// ==================== Azure Table Storage ====================

#[tokio::test]
async fn test_aztable_adapter() {
    let conn_str = match std::env::var("TEST_AZ_TABLE_STORAGE_CONNECTION") {
        Ok(c) if !c.is_empty() => c,
        _ => {
            println!("[AzTable] SKIPPED — set TEST_AZ_TABLE_STORAGE_CONNECTION to run");
            return;
        }
    };

    test_adapter_lifecycle(&conn_str, "", "AzTable").await;
}

// ==================== Azure CosmosDB ====================

#[tokio::test]
async fn test_cosmosdb_adapter() {
    let conn_str = match std::env::var("TEST_AZ_COSMOSDB_CONNECTION") {
        Ok(c) if !c.is_empty() => c,
        _ => {
            println!("[CosmosDB] SKIPPED — set TEST_AZ_COSMOSDB_CONNECTION to run");
            return;
        }
    };

    test_adapter_lifecycle(&conn_str, "", "CosmosDB").await;
}

// ==================== Salesforce ====================

#[tokio::test]
async fn test_sfdc_adapter() {
    let conn_str = match std::env::var("TEST_SFDC_CONNECTION") {
        Ok(c) if !c.is_empty() => c,
        _ => {
            println!("[SFDC] SKIPPED — set TEST_SFDC_CONNECTION to run");
            return;
        }
    };

    test_adapter_lifecycle(&conn_str, "SELECT Id, Name FROM Account LIMIT 5", "SFDC").await;
}

// ==================== REST API ====================

#[tokio::test]
async fn test_rest_api_adapter() {
    let conn_str = r#"rest://{"HOST":"https://httpbin.org"}"#;

    let mut adapter = adapters::create_adapter(conn_str).expect("create REST adapter");
    adapter.authenticate().await.expect("REST auth");

    // REST databases/tables are managed metadata, adapter returns empty
    let databases = adapter.get_databases().await.expect("REST get_databases");
    assert!(databases.is_empty(), "REST adapter returns empty databases (managed externally)");

    // Test curl execution
    let result = adapter
        .execute("curl 'https://httpbin.org/get'", None, None)
        .await
        .expect("REST curl execute");
    assert!(result.ok, "REST curl should succeed");

    let meta = result.meta.as_ref().expect("REST should have meta");
    assert_eq!(meta["isRestApi"], true);
    assert_eq!(meta["status"], 200);
    println!("[REST/curl] Execute OK: status={}", meta["status"]);

    // Test fetch execution
    let result = adapter
        .execute(r#"fetch("https://httpbin.org/get", { "method": "GET" })"#, None, None)
        .await
        .expect("REST fetch execute");
    assert!(result.ok, "REST fetch should succeed");

    let meta = result.meta.as_ref().expect("REST fetch should have meta");
    assert_eq!(meta["status"], 200);
    println!("[REST/fetch] Execute OK: status={}", meta["status"]);

    // Test variable resolution
    let result = adapter
        .execute("curl '{{HOST}}/get'", None, None)
        .await
        .expect("REST variable resolution");
    assert!(result.ok, "REST with {{HOST}} should succeed");
    println!("[REST/{{HOST}}] Variable resolution OK");

    let _ = adapter.disconnect().await;
    println!("[REST API] All tests passed");
}

// ==================== GraphQL ====================

#[tokio::test]
async fn test_graphql_adapter() {
    // Use a public GraphQL endpoint (Countries API)
    let conn_str = r#"graphql://{"ENDPOINT":"https://countries.trevorblades.com/graphql"}"#;

    let mut adapter = adapters::create_adapter(conn_str).expect("create GraphQL adapter");
    adapter.authenticate().await.expect("GraphQL auth");

    let result = adapter
        .execute(r#"{ countries { code name } }"#, None, None)
        .await
        .expect("GraphQL execute");
    assert!(result.ok, "GraphQL query should succeed: {:?}", result.error);
    println!("[GraphQL] Execute OK");

    let _ = adapter.disconnect().await;
    println!("[GraphQL] Test passed");
}
