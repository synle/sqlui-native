use async_trait::async_trait;
use std::collections::HashMap;
use std::time::Instant;

use crate::error::AppError;
use crate::types::*;

use super::DataAdapter;

/// REST API adapter using reqwest for HTTP requests.
/// Parses curl command strings and executes them.
pub struct RestApiAdapter {
    host: String,
    variables: Vec<serde_json::Value>,
    client: reqwest::Client,
}

impl RestApiAdapter {
    /// Creates a new REST API adapter from the connection string.
    /// Format: `rest://{"HOST":"https://api.example.com","variables":[...]}`
    pub fn new(connection: &str) -> Result<Self, AppError> {
        let json_str = connection
            .strip_prefix("rest://")
            .ok_or_else(|| AppError::Connection("Invalid REST API connection string".into()))?;

        let config: serde_json::Value = serde_json::from_str(json_str).map_err(|e| {
            AppError::Connection(format!("Failed to parse REST API config: {}", e))
        })?;

        let host = config
            .get("HOST")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let variables = config
            .get("variables")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        Ok(Self {
            host,
            variables,
            client: reqwest::Client::builder()
                .danger_accept_invalid_certs(true)
                .build()
                .unwrap_or_default(),
        })
    }

    /// Resolves {{VAR}} placeholders in a string using the variable list.
    fn resolve_variables(&self, input: &str) -> String {
        let mut result = input.to_string();
        // Inject HOST
        result = result.replace("{{HOST}}", &self.host);
        // Inject user-defined variables
        for var in &self.variables {
            let key = var.get("key").or(var.get("name")).and_then(|v| v.as_str()).unwrap_or("");
            let value = var.get("value").and_then(|v| v.as_str()).unwrap_or("");
            let enabled = var.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true);
            if enabled && !key.is_empty() {
                result = result.replace(&format!("{{{{{}}}}}", key), value);
            }
        }
        // Built-in dynamic variables
        result = result.replace("{{$timestamp}}", &chrono::Utc::now().timestamp().to_string());
        result = result.replace("{{$isoTimestamp}}", &chrono::Utc::now().to_rfc3339());
        result = result.replace("{{$randomUUID}}", &uuid::Uuid::new_v4().to_string());
        result
    }

    /// Parses a simplified curl command and executes it.
    async fn execute_curl(&self, curl_str: &str) -> Result<QueryResult, AppError> {
        let resolved = self.resolve_variables(curl_str);
        let parts = shell_words_parse(&resolved);

        let mut method = "GET".to_string();
        let mut url = String::new();
        let mut headers: HashMap<String, String> = HashMap::new();
        let mut body: Option<String> = None;

        let mut i = 0;
        while i < parts.len() {
            match parts[i].as_str() {
                "curl" => {} // skip
                "-X" | "--request" => {
                    i += 1;
                    if i < parts.len() {
                        method = parts[i].to_uppercase();
                    }
                }
                "-H" | "--header" => {
                    i += 1;
                    if i < parts.len() {
                        if let Some((k, v)) = parts[i].split_once(':') {
                            headers.insert(k.trim().to_string(), v.trim().to_string());
                        }
                    }
                }
                "-d" | "--data" | "--data-raw" => {
                    i += 1;
                    if i < parts.len() {
                        body = Some(parts[i].clone());
                    }
                }
                s if s.starts_with("http://") || s.starts_with("https://") || s.starts_with("{{") => {
                    url = s.to_string();
                    // Strip surrounding quotes
                    url = url.trim_matches('\'').trim_matches('"').to_string();
                }
                s if !s.starts_with('-') && url.is_empty() && i > 0 => {
                    url = s.trim_matches('\'').trim_matches('"').to_string();
                }
                _ => {} // skip unsupported flags
            }
            i += 1;
        }

        if url.is_empty() {
            return Err(AppError::Query("No URL found in curl command".into()));
        }

        let start = Instant::now();
        let mut req = self.client.request(
            reqwest::Method::from_bytes(method.as_bytes()).unwrap_or(reqwest::Method::GET),
            &url,
        );

        for (k, v) in &headers {
            req = req.header(k.as_str(), v.as_str());
        }
        if let Some(b) = body {
            req = req.body(b);
        }

        let resp = req.send().await.map_err(|e| AppError::Query(e.to_string()))?;
        let elapsed = start.elapsed();

        let status = resp.status().as_u16();
        let status_text = resp.status().canonical_reason().unwrap_or("").to_string();
        let resp_headers: HashMap<String, String> = resp
            .headers()
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
            .collect();
        let resp_body = resp.text().await.unwrap_or_default();

        let body_json: serde_json::Value =
            serde_json::from_str(&resp_body).unwrap_or(serde_json::Value::String(resp_body.clone()));

        let timing = serde_json::json!({ "total": elapsed.as_millis() as u64 });
        let size = resp_body.len();

        // Parse cookies from Set-Cookie headers
        let mut cookies: HashMap<String, String> = HashMap::new();
        for (k, v) in &resp_headers {
            if k.to_lowercase() == "set-cookie" {
                if let Some(name_val) = v.split(';').next() {
                    if let Some((ck, cv)) = name_val.split_once('=') {
                        cookies.insert(ck.trim().to_string(), cv.trim().to_string());
                    }
                }
            }
        }

        let result_row = serde_json::json!({
            "status": status,
            "statusText": status_text,
            "headers": resp_headers,
            "cookies": cookies,
            "body": body_json,
            "timing": timing,
            "size": size,
        });

        Ok(QueryResult {
            ok: true,
            raw: Some(vec![result_row]),
            meta: Some(serde_json::json!({
                "isRestApi": true,
                "status": status,
                "statusText": status_text,
                "timing": timing,
                "size": size,
                "responseHeaders": resp_headers,
                "responseCookies": cookies,
                "responseBody": resp_body,
                "responseBodyParsed": body_json,
                "requestMethod": method,
                "requestUrl": url,
            })),
            error: None,
            affected_rows: None,
        })
    }

    /// Parses a fetch() call and executes it as an HTTP request.
    /// Supports: fetch("url", { method, headers, body })
    async fn execute_fetch(&self, input: &str) -> Result<QueryResult, AppError> {
        let resolved = self.resolve_variables(input);

        // Extract the JSON-like content: fetch("url", { ... });
        // Strip "fetch(" prefix and ");" or ")" suffix
        let inner = resolved
            .trim()
            .trim_start_matches("fetch")
            .trim()
            .trim_start_matches('(')
            .trim_end_matches(';')
            .trim()
            .trim_end_matches(')')
            .trim();

        // Split into URL and options: "url", { ... }
        // Find the first comma after the closing quote of the URL
        let (url_str, options_str) = if inner.starts_with('"') || inner.starts_with('\'') {
            let quote = inner.chars().next().unwrap();
            if let Some(end_quote) = inner[1..].find(quote) {
                let url_part = &inner[1..end_quote + 1];
                let rest = inner[end_quote + 2..].trim().trim_start_matches(',').trim();
                (url_part.to_string(), rest.to_string())
            } else {
                (inner.to_string(), String::new())
            }
        } else {
            (inner.to_string(), String::new())
        };

        if url_str.is_empty() {
            return Err(AppError::Query("No URL found in fetch() call".into()));
        }

        // Parse options JSON (method, headers, body)
        let mut method = "GET".to_string();
        let mut headers: HashMap<String, String> = HashMap::new();
        let mut body: Option<String> = None;

        if !options_str.is_empty() {
            if let Ok(opts) = serde_json::from_str::<serde_json::Value>(&options_str) {
                if let Some(m) = opts.get("method").and_then(|v| v.as_str()) {
                    method = m.to_uppercase();
                }
                if let Some(h) = opts.get("headers").and_then(|v| v.as_object()) {
                    for (k, v) in h {
                        if let Some(val) = v.as_str() {
                            headers.insert(k.clone(), val.to_string());
                        }
                    }
                }
                if let Some(b) = opts.get("body") {
                    body = Some(if b.is_string() {
                        b.as_str().unwrap().to_string()
                    } else {
                        b.to_string()
                    });
                }
            }
        }

        // Execute the request (reuse the same response handling as execute_curl)
        let start = Instant::now();
        let mut req = self.client.request(
            reqwest::Method::from_bytes(method.as_bytes()).unwrap_or(reqwest::Method::GET),
            &url_str,
        );
        for (k, v) in &headers {
            req = req.header(k.as_str(), v.as_str());
        }
        if let Some(b) = body {
            req = req.body(b);
        }

        let resp = req.send().await.map_err(|e| AppError::Query(e.to_string()))?;
        let elapsed = start.elapsed();

        let status = resp.status().as_u16();
        let status_text = resp.status().canonical_reason().unwrap_or("").to_string();
        let resp_headers: HashMap<String, String> = resp
            .headers()
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
            .collect();
        let resp_body = resp.text().await.unwrap_or_default();

        let body_json: serde_json::Value =
            serde_json::from_str(&resp_body).unwrap_or(serde_json::Value::String(resp_body.clone()));

        let timing = serde_json::json!({ "total": elapsed.as_millis() as u64 });
        let size = resp_body.len();

        let mut cookies: HashMap<String, String> = HashMap::new();
        for (k, v) in &resp_headers {
            if k.to_lowercase() == "set-cookie" {
                if let Some(name_val) = v.split(';').next() {
                    if let Some((ck, cv)) = name_val.split_once('=') {
                        cookies.insert(ck.trim().to_string(), cv.trim().to_string());
                    }
                }
            }
        }

        let result_row = serde_json::json!({
            "status": status,
            "statusText": status_text,
            "headers": resp_headers,
            "cookies": cookies,
            "body": body_json,
            "timing": timing,
            "size": size,
        });

        Ok(QueryResult {
            ok: true,
            raw: Some(vec![result_row]),
            meta: Some(serde_json::json!({
                "isRestApi": true,
                "status": status,
                "statusText": status_text,
                "timing": timing,
                "size": size,
                "responseHeaders": resp_headers,
                "responseCookies": cookies,
                "responseBody": resp_body,
                "responseBodyParsed": body_json,
                "requestMethod": method,
                "requestUrl": url_str,
            })),
            error: None,
            affected_rows: None,
        })
    }
}

#[async_trait]
impl DataAdapter for RestApiAdapter {
    fn dialect(&self) -> Option<Dialect> {
        Some(Dialect::Rest)
    }

    async fn authenticate(&mut self) -> Result<(), AppError> {
        if self.host.is_empty() {
            return Err(AppError::Connection("HOST is required".into()));
        }
        if !self.host.starts_with("http://") && !self.host.starts_with("https://") {
            return Err(AppError::Connection("HOST must start with http:// or https://".into()));
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
            ColumnMetaData { name: "method".into(), col_type: "string".into(), ..Default::default() },
            ColumnMetaData { name: "url".into(), col_type: "string".into(), ..Default::default() },
            ColumnMetaData { name: "headers".into(), col_type: "json".into(), ..Default::default() },
            ColumnMetaData { name: "params".into(), col_type: "json".into(), ..Default::default() },
            ColumnMetaData { name: "body".into(), col_type: "string".into(), ..Default::default() },
            ColumnMetaData { name: "bodyType".into(), col_type: "string".into(), ..Default::default() },
        ])
    }

    async fn execute(
        &self,
        sql: &str,
        _database: Option<&str>,
        _table: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        let trimmed = sql.trim();
        if trimmed.is_empty() {
            return Err(AppError::Query("No request to execute. Enter a curl or fetch() command.".into()));
        }
        // Auto-detect fetch() vs curl syntax
        if trimmed.starts_with("fetch(") || trimmed.starts_with("fetch (") {
            self.execute_fetch(trimmed).await
        } else {
            self.execute_curl(trimmed).await
        }
    }

    async fn disconnect(&mut self) -> Result<(), AppError> {
        Ok(())
    }

    async fn run_diagnostics(&self) -> Result<Vec<ConnectionDiagnostic>, AppError> {
        let mut results = Vec::new();
        for method_name in &["HEAD", "GET", "OPTIONS"] {
            let method = reqwest::Method::from_bytes(method_name.as_bytes()).unwrap();
            match self.client.request(method, &self.host).send().await {
                Ok(resp) => results.push(ConnectionDiagnostic {
                    name: method_name.to_string(),
                    success: resp.status().is_success(),
                    message: format!("{}", resp.status()),
                }),
                Err(e) => results.push(ConnectionDiagnostic {
                    name: method_name.to_string(),
                    success: false,
                    message: e.to_string(),
                }),
            }
        }
        Ok(results)
    }
}

// ColumnMetaData::default() is defined in types.rs

/// Simple shell-like word splitting (handles single and double quotes).
fn shell_words_parse(input: &str) -> Vec<String> {
    let mut words = Vec::new();
    let mut current = String::new();
    let mut in_single_quote = false;
    let mut in_double_quote = false;
    let mut escaped = false;

    for ch in input.chars() {
        if escaped {
            current.push(ch);
            escaped = false;
            continue;
        }
        match ch {
            '\\' if !in_single_quote => escaped = true,
            '\'' if !in_double_quote => in_single_quote = !in_single_quote,
            '"' if !in_single_quote => in_double_quote = !in_double_quote,
            ' ' | '\t' | '\n' if !in_single_quote && !in_double_quote => {
                if !current.is_empty() {
                    words.push(current.clone());
                    current.clear();
                }
            }
            _ => current.push(ch),
        }
    }
    if !current.is_empty() {
        words.push(current);
    }
    words
}
