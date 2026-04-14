use async_trait::async_trait;
use std::collections::HashMap;

use crate::error::AppError;
use crate::types::*;

use super::DataAdapter;

/// GraphQL adapter using reqwest for HTTP POST queries.
pub struct GraphqlAdapter {
    endpoint: String,
    variables: Vec<serde_json::Value>,
    default_headers: HashMap<String, String>,
    client: reqwest::Client,
}

impl GraphqlAdapter {
    /// Creates a new GraphQL adapter from the connection string.
    /// Format: `graphql://{"ENDPOINT":"https://example.com/graphql","variables":[...],"headers":{...}}`
    pub fn new(connection: &str) -> Result<Self, AppError> {
        let json_str = connection
            .strip_prefix("graphql://")
            .ok_or_else(|| AppError::Connection("Invalid GraphQL connection string".into()))?;

        let config: serde_json::Value = serde_json::from_str(json_str).map_err(|e| {
            AppError::Connection(format!("Failed to parse GraphQL config: {}", e))
        })?;

        let endpoint = config
            .get("ENDPOINT")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let variables = config
            .get("variables")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        let mut default_headers = HashMap::new();
        if let Some(headers_obj) = config.get("headers").and_then(|v| v.as_object()) {
            for (k, v) in headers_obj {
                if let Some(val) = v.as_str() {
                    default_headers.insert(k.clone(), val.to_string());
                }
            }
        }

        Ok(Self {
            endpoint,
            variables,
            default_headers,
            client: reqwest::Client::new(),
        })
    }

    /// Resolves {{VAR}} placeholders.
    fn resolve_variables(&self, input: &str) -> String {
        let mut result = input.to_string();
        for var in &self.variables {
            let key = var.get("key").or(var.get("name")).and_then(|v| v.as_str()).unwrap_or("");
            let value = var.get("value").and_then(|v| v.as_str()).unwrap_or("");
            let enabled = var.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true);
            if enabled && !key.is_empty() {
                result = result.replace(&format!("{{{{{}}}}}", key), value);
            }
        }
        result
    }

    /// Parses a GraphQL input string into query, variables, and operation name.
    /// Supports `### JSON` separator for variables section.
    fn parse_graphql_input(&self, input: &str) -> (String, serde_json::Value, Option<String>) {
        let resolved = self.resolve_variables(input);
        let parts: Vec<&str> = resolved.splitn(2, "###").collect();

        let query = parts[0].trim().to_string();
        let mut variables = serde_json::Value::Null;
        let mut operation_name = None;

        if parts.len() > 1 {
            let vars_str = parts[1].trim();
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(vars_str) {
                variables = parsed;
            }
        }

        // Try to extract operation name from query
        if let Some(name) = extract_operation_name(&query) {
            operation_name = Some(name);
        }

        (query, variables, operation_name)
    }
}

#[async_trait]
impl DataAdapter for GraphqlAdapter {
    fn dialect(&self) -> Option<Dialect> {
        Some(Dialect::Graphql)
    }

    async fn authenticate(&mut self) -> Result<(), AppError> {
        if self.endpoint.is_empty() {
            return Err(AppError::Connection("ENDPOINT is required".into()));
        }
        if !self.endpoint.starts_with("http://") && !self.endpoint.starts_with("https://") {
            return Err(AppError::Connection(
                "ENDPOINT must start with http:// or https://".into(),
            ));
        }
        Ok(())
    }

    async fn get_databases(&self) -> Result<Vec<DatabaseMetaData>, AppError> {
        Ok(vec![])
    }

    async fn get_tables(&self, _database: Option<&str>) -> Result<Vec<TableMetaData>, AppError> {
        Ok(vec![])
    }

    async fn get_columns(
        &self,
        _table: &str,
        _database: Option<&str>,
    ) -> Result<Vec<ColumnMetaData>, AppError> {
        Ok(vec![
            ColumnMetaData { name: "query".into(), col_type: "graphql".into(), ..Default::default() },
            ColumnMetaData { name: "variables".into(), col_type: "json".into(), ..Default::default() },
            ColumnMetaData { name: "operationName".into(), col_type: "string".into(), ..Default::default() },
            ColumnMetaData { name: "headers".into(), col_type: "json".into(), ..Default::default() },
        ])
    }

    async fn execute(
        &self,
        sql: &str,
        _database: Option<&str>,
        _table: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        let (query, variables, operation_name) = self.parse_graphql_input(sql);

        let mut gql_body = serde_json::json!({ "query": query });
        if !variables.is_null() {
            gql_body["variables"] = variables;
        }
        if let Some(op_name) = operation_name {
            gql_body["operationName"] = serde_json::Value::String(op_name);
        }

        let mut req = self
            .client
            .post(&self.endpoint)
            .header("Content-Type", "application/json");

        for (k, v) in &self.default_headers {
            req = req.header(k.as_str(), v.as_str());
        }

        let resp = req
            .json(&gql_body)
            .send()
            .await
            .map_err(|e| AppError::Query(e.to_string()))?;

        let status = resp.status().as_u16();
        let resp_headers: HashMap<String, String> = resp
            .headers()
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
            .collect();
        let resp_body: serde_json::Value = resp
            .json()
            .await
            .unwrap_or(serde_json::json!({"error": "Failed to parse response"}));

        let graphql_data = resp_body.get("data").cloned();
        let graphql_errors = resp_body.get("errors").cloned();
        let extensions = resp_body.get("extensions").cloned();

        Ok(QueryResult {
            ok: true,
            raw: Some(vec![serde_json::json!({
                "data": graphql_data,
                "errors": graphql_errors,
                "extensions": extensions,
            })]),
            meta: Some(serde_json::json!({
                "isGraphQL": true,
                "status": status,
                "responseHeaders": resp_headers,
                "graphqlData": graphql_data,
                "graphqlErrors": graphql_errors,
            })),
            error: None,
            affected_rows: None,
        })
    }

    async fn disconnect(&mut self) -> Result<(), AppError> {
        Ok(())
    }

    async fn run_diagnostics(&self) -> Result<Vec<ConnectionDiagnostic>, AppError> {
        let gql_body = serde_json::json!({"query": "{ __typename }"});
        match self
            .client
            .post(&self.endpoint)
            .header("Content-Type", "application/json")
            .json(&gql_body)
            .send()
            .await
        {
            Ok(resp) => {
                let success = resp.status().is_success();
                Ok(vec![ConnectionDiagnostic {
                    name: "Introspection".to_string(),
                    success,
                    message: format!("{}", resp.status()),
                }])
            }
            Err(e) => Ok(vec![ConnectionDiagnostic {
                name: "Introspection".to_string(),
                success: false,
                message: e.to_string(),
            }]),
        }
    }
}

/// Extracts the operation name from a GraphQL query string.
fn extract_operation_name(query: &str) -> Option<String> {
    let re = regex::Regex::new(r"(?:query|mutation|subscription)\s+(\w+)").ok()?;
    re.captures(query).map(|c| c[1].to_string())
}
