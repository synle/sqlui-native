/** Salesforce (SFDC) adapter using reqwest for SOAP login and REST API queries. */

use async_trait::async_trait;
use reqwest::Client;
use std::collections::HashMap;
use tokio::sync::RwLock;

use crate::error::AppError;
use crate::types::*;

use super::DataAdapter;

/// Salesforce REST API version used for all endpoints.
const SFDC_API_VERSION: &str = "v59.0";

/// Salesforce adapter that handles SOAP/OAuth2 authentication and SOQL/SOSL query execution.
///
/// Connection string format: `sfdc://{"username":"...","password":"...","securityToken":"...","loginUrl":"..."}`
///
/// Maps Salesforce concepts to the adapter interface:
/// - Database = Salesforce org (single per connection, identified by organization_id)
/// - Table = SObject (Account, Contact, Lead, etc.)
/// - Column = SObject field (from describe API)
/// - execute() = SOQL query or SOSL search via REST API
pub struct SalesforceAdapter {
    /// Parsed SFDC connection credentials.
    config: SfdcConnectionConfig,
    /// Shared HTTP client reused across all requests.
    client: Client,
    /// Active session state (access token + instance URL), wrapped in RwLock for interior mutability.
    session: RwLock<Option<SfdcSession>>,
}

/// Parsed credentials from an SFDC connection string JSON.
#[derive(Debug, Clone)]
struct SfdcConnectionConfig {
    /// Salesforce username (email format).
    username: String,
    /// Salesforce password.
    password: String,
    /// Security token appended to password for SOAP login.
    security_token: String,
    /// Login URL (e.g., `https://login.salesforce.com` or `https://test.salesforce.com`).
    login_url: String,
    /// OAuth2 Connected App client ID (optional -- enables OAuth2 Client Credentials flow).
    client_id: String,
    /// OAuth2 Connected App client secret (optional -- used with client_id).
    client_secret: String,
}

/// Active Salesforce session with authentication tokens.
#[derive(Debug, Clone)]
struct SfdcSession {
    /// OAuth2 access token (or SOAP session ID) used as Bearer token.
    access_token: String,
    /// Instance URL for the authenticated org (e.g., `https://na1.salesforce.com`).
    instance_url: String,
}

/// Parses an `sfdc://{"username":"...","password":"...","securityToken":"...","loginUrl":"..."}` connection string.
///
/// Supports optional `clientId` and `clientSecret` fields for OAuth2 Client Credentials flow.
///
/// @param connection - The raw connection string with `sfdc://` scheme followed by JSON.
fn parse_sfdc_connection(connection: &str) -> Result<SfdcConnectionConfig, AppError> {
    let without_scheme = connection.strip_prefix("sfdc://").ok_or_else(|| {
        AppError::Connection("Missing sfdc:// scheme".into())
    })?;

    let parsed: serde_json::Value = serde_json::from_str(without_scheme).map_err(|e| {
        AppError::Connection(format!(
            "Invalid SFDC connection string JSON: {}. \
             Expected format: sfdc://{{\"username\":\"...\",\"password\":\"...\",\"securityToken\":\"...\",\"loginUrl\":\"...\"}}",
            e
        ))
    })?;

    let mut login_url = parsed["loginUrl"]
        .as_str()
        .unwrap_or("login.salesforce.com")
        .trim()
        .trim_end_matches('/')
        .to_string();

    // Ensure login URL has a protocol prefix
    if !login_url.is_empty() && !login_url.starts_with("http") {
        login_url = format!("https://{}", login_url);
    }

    Ok(SfdcConnectionConfig {
        username: parsed["username"].as_str().unwrap_or("").to_string(),
        password: parsed["password"].as_str().unwrap_or("").to_string(),
        security_token: parsed["securityToken"].as_str().unwrap_or("").to_string(),
        login_url,
        client_id: parsed["clientId"].as_str().unwrap_or("").to_string(),
        client_secret: parsed["clientSecret"].as_str().unwrap_or("").to_string(),
    })
}

/// Rewrites Salesforce error messages to be more user-friendly with actionable guidance.
///
/// Maps common Salesforce error codes/messages to detailed troubleshooting instructions
/// that match the TypeScript adapter's `getSfdcErrorMessage()` behavior.
///
/// @param msg - The original error message string from the Salesforce API.
fn rewrite_sfdc_error(msg: &str) -> String {
    if msg.contains("SOAP API login() is disabled") {
        return [
            "SOAP API login is disabled in this Salesforce org.",
            "",
            "To fix this, go to Salesforce Setup:",
            "  1. Search \"SOAP API\" in Quick Find",
            "  2. Enable \"SOAP API Login Allowed\"",
            "",
            "Or enable it on your user profile:",
            "  1. Setup > Users > Profiles > [Your Profile]",
            "  2. Under Administrative Permissions, check \"SOAP API Login Allowed\"",
            "",
            "Alternatively, provide a Connected App for OAuth2 login by adding",
            "\"clientId\" and \"clientSecret\" to your connection JSON.",
        ]
        .join("\n");
    }

    if msg.contains("INVALID_LOGIN") {
        return [
            "Invalid login credentials.",
            "",
            "Please check:",
            "  - Username is your Salesforce username (email format), not your actual email",
            "  - Password is correct",
            "  - Security token is appended (get it from Setup > My Personal Information > Reset My Security Token)",
            "  - Login URL is correct (use \"login.salesforce.com\" for production, \"test.salesforce.com\" for sandbox)",
        ]
        .join("\n");
    }

    if msg.contains("LOGIN_MUST_USE_SECURITY_TOKEN") {
        return [
            "Security token required.",
            "",
            "Your IP is not whitelisted. Add your security token:",
            "  1. Go to Salesforce Setup > My Personal Information > Reset My Security Token",
            "  2. Check your email for the new token",
            "  3. Add it to the \"securityToken\" field in your connection string",
        ]
        .join("\n");
    }

    msg.to_string()
}

/// Recursively removes Salesforce `attributes` metadata keys from query result records.
///
/// Salesforce REST API includes `attributes: { type: "Account", url: "/..." }` in every record
/// and nested relationship objects. These are internal metadata that clutters result display.
///
/// @param value - The JSON value to clean.
fn clean_salesforce_record(value: serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            let cleaned: serde_json::Map<String, serde_json::Value> = map
                .into_iter()
                .filter(|(key, _)| key != "attributes")
                .map(|(key, val)| (key, clean_salesforce_record(val)))
                .collect();
            serde_json::Value::Object(cleaned)
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(arr.into_iter().map(clean_salesforce_record).collect())
        }
        other => other,
    }
}

/// Escapes XML special characters in a string for safe inclusion in SOAP envelopes.
fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

/// Extracts the text content of an XML element by tag name using simple string search.
///
/// This is a lightweight parser that does not handle XML namespaces or nested elements
/// with the same tag name. Sufficient for parsing flat SOAP response fields.
///
/// @param xml - The XML string to search.
/// @param tag - The element name (e.g., "sessionId", "serverUrl").
fn extract_xml_value(xml: &str, tag: &str) -> Option<String> {
    let open = format!("<{}>", tag);
    let close = format!("</{}>", tag);

    let start = xml.find(&open)? + open.len();
    let end = xml[start..].find(&close)? + start;

    Some(xml[start..end].to_string())
}

impl SalesforceAdapter {
    /// Creates a new Salesforce adapter by parsing the connection string JSON.
    ///
    /// @param connection - Connection string: `sfdc://{"username":"...","password":"...",...}`
    pub fn new(connection: &str) -> Result<Self, AppError> {
        let config = parse_sfdc_connection(connection)?;
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| AppError::Connection(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            config,
            client,
            session: RwLock::new(None),
        })
    }

    /// Performs SOAP login to Salesforce using username + password + security token.
    ///
    /// Uses the Partner SOAP API login endpoint. The password and security token are
    /// concatenated as required by Salesforce.
    async fn soap_login(&self) -> Result<SfdcSession, AppError> {
        let soap_url = format!("{}/services/Soap/u/{}", self.config.login_url, SFDC_API_VERSION);

        let soap_body = format!(
            r#"<?xml version="1.0" encoding="utf-8" ?>
<env:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">
  <env:Body>
    <n1:login xmlns:n1="urn:partner.soap.sforce.com">
      <n1:username>{}</n1:username>
      <n1:password>{}{}</n1:password>
    </n1:login>
  </env:Body>
</env:Envelope>"#,
            escape_xml(&self.config.username),
            escape_xml(&self.config.password),
            escape_xml(&self.config.security_token),
        );

        let response = self
            .client
            .post(&soap_url)
            .header("Content-Type", "text/xml; charset=utf-8")
            .header("SOAPAction", "login")
            .body(soap_body)
            .send()
            .await
            .map_err(|e| {
                AppError::Connection(format!(
                    "SOAP login request failed: {}. Check your loginUrl ({}) and network connectivity.",
                    e, self.config.login_url
                ))
            })?;

        let body = response.text().await.map_err(|e| {
            AppError::Connection(format!("Failed to read SOAP login response: {}", e))
        })?;

        // Check for SOAP fault in the response XML
        if body.contains("<faultstring>") || body.contains("<sf:exceptionMessage>") {
            let fault_msg = extract_xml_value(&body, "faultstring")
                .or_else(|| extract_xml_value(&body, "sf:exceptionMessage"))
                .unwrap_or_else(|| "Unknown SOAP login error".to_string());
            return Err(AppError::Connection(rewrite_sfdc_error(&fault_msg)));
        }

        // Extract sessionId and serverUrl from the successful login response
        let session_id = extract_xml_value(&body, "sessionId").ok_or_else(|| {
            AppError::Connection("SOAP login succeeded but sessionId not found in response".into())
        })?;

        let server_url = extract_xml_value(&body, "serverUrl").ok_or_else(|| {
            AppError::Connection("SOAP login succeeded but serverUrl not found in response".into())
        })?;

        // Derive the instance URL from the serverUrl (e.g., https://na1.salesforce.com)
        let instance_url = if let Ok(url) = url::Url::parse(&server_url) {
            format!("{}://{}", url.scheme(), url.host_str().unwrap_or(""))
        } else {
            self.config.login_url.clone()
        };

        Ok(SfdcSession {
            access_token: session_id,
            instance_url,
        })
    }

    /// Performs OAuth2 Client Credentials flow to obtain an access token.
    ///
    /// Used when `clientId` is provided without a username. The Connected App grants
    /// access directly without user interaction. No refresh token is available in this flow.
    async fn oauth2_client_credentials_login(&self) -> Result<SfdcSession, AppError> {
        let token_url = format!("{}/services/oauth2/token", self.config.login_url);

        let params = [
            ("grant_type", "client_credentials"),
            ("client_id", &self.config.client_id),
            ("client_secret", &self.config.client_secret),
        ];

        let response = self
            .client
            .post(&token_url)
            .form(&params)
            .send()
            .await
            .map_err(|e| {
                AppError::Connection(format!(
                    "OAuth2 token request to {} failed: {}",
                    token_url, e
                ))
            })?;

        let status = response.status();
        let raw_text = response.text().await.map_err(|e| {
            AppError::Connection(format!("Failed to read OAuth2 token response: {}", e))
        })?;

        let body: serde_json::Value = serde_json::from_str(&raw_text).map_err(|e| {
            AppError::Connection(format!(
                "Failed to parse OAuth2 token response (status {}): {}. Response: {}",
                status,
                e,
                &raw_text[..raw_text.len().min(500)]
            ))
        })?;

        if let Some(error) = body["error"].as_str() {
            let desc = body["error_description"].as_str().unwrap_or(error);
            return Err(AppError::Connection(rewrite_sfdc_error(desc)));
        }

        let access_token = body["access_token"]
            .as_str()
            .ok_or_else(|| AppError::Connection("OAuth2 response missing access_token".into()))?
            .to_string();

        let instance_url = body["instance_url"]
            .as_str()
            .ok_or_else(|| AppError::Connection("OAuth2 response missing instance_url".into()))?
            .to_string();

        Ok(SfdcSession {
            access_token,
            instance_url,
        })
    }

    /// Ensures an active session exists, performing login if needed.
    ///
    /// Chooses the authentication flow based on the connection config:
    /// - If `clientId` is set and `username` is empty: OAuth2 Client Credentials
    /// - Otherwise: SOAP login with username + password + securityToken
    async fn ensure_session(&self) -> Result<SfdcSession, AppError> {
        {
            let session = self.session.read().await;
            if let Some(ref s) = *session {
                return Ok(s.clone());
            }
        }

        let new_session = if !self.config.client_id.is_empty() && self.config.username.is_empty() {
            self.oauth2_client_credentials_login().await?
        } else {
            self.soap_login().await?
        };

        {
            let mut session = self.session.write().await;
            *session = Some(new_session.clone());
        }

        Ok(new_session)
    }

    /// Clears the cached session, forcing re-authentication on next API call.
    async fn clear_session(&self) {
        let mut session = self.session.write().await;
        *session = None;
    }

    /// Wraps an operation with automatic session refresh on expiry.
    ///
    /// If the operation fails due to `INVALID_SESSION_ID` or `Session expired`, clears
    /// the cached session and retries once with fresh credentials. This mirrors the
    /// TypeScript adapter's `withAutoRefresh()` behavior.
    async fn with_auto_refresh<F, Fut, T>(&self, operation: F) -> Result<T, AppError>
    where
        F: Fn(SfdcSession) -> Fut + Send,
        Fut: std::future::Future<Output = Result<T, AppError>> + Send,
    {
        let session = self.ensure_session().await?;
        match operation(session).await {
            Ok(result) => Ok(result),
            Err(e) => {
                let msg = e.to_string();
                if msg.contains("INVALID_SESSION_ID")
                    || msg.contains("Session expired")
                    || msg.contains("refresh token")
                {
                    self.clear_session().await;
                    let fresh_session = self.ensure_session().await?;
                    operation(fresh_session).await
                } else {
                    Err(e)
                }
            }
        }
    }

    /// Makes an authenticated GET request to the Salesforce REST API.
    ///
    /// @param session - The active SFDC session with access token.
    /// @param path - The REST API path (e.g., "/services/data/v59.0/sobjects").
    async fn rest_get(
        &self,
        session: &SfdcSession,
        path: &str,
    ) -> Result<serde_json::Value, AppError> {
        let url = format!("{}{}", session.instance_url, path);

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", session.access_token))
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| AppError::Query(format!("Salesforce REST request failed: {}", e)))?;

        let status = response.status();
        let body: serde_json::Value = response.json().await.map_err(|e| {
            AppError::Query(format!("Failed to parse Salesforce response: {}", e))
        })?;

        if !status.is_success() {
            // Salesforce returns errors as an array: [{ "message": "...", "errorCode": "..." }]
            let error_msg = if let Some(arr) = body.as_array() {
                arr.iter()
                    .filter_map(|e| e["message"].as_str())
                    .collect::<Vec<_>>()
                    .join("; ")
            } else {
                body.to_string()
            };

            // Session errors should propagate up to trigger auto-refresh
            if error_msg.contains("INVALID_SESSION_ID") || error_msg.contains("Session expired") {
                return Err(AppError::Connection(error_msg));
            }

            return Err(AppError::Query(format!(
                "Salesforce API returned {}: {}",
                status, error_msg
            )));
        }

        Ok(body)
    }
}

#[async_trait]
impl DataAdapter for SalesforceAdapter {
    /// Returns the Salesforce dialect identifier.
    fn dialect(&self) -> Option<Dialect> {
        Some(Dialect::Sfdc)
    }

    /// Authenticates by establishing a Salesforce session via SOAP or OAuth2.
    async fn authenticate(&mut self) -> Result<(), AppError> {
        let _session = self.ensure_session().await?;
        Ok(())
    }

    /// Returns a single "database" representing the Salesforce org.
    ///
    /// Salesforce does not have multiple databases -- each connection represents one org.
    /// The database name is the organization_id from the userinfo endpoint.
    async fn get_databases(&self) -> Result<Vec<DatabaseMetaData>, AppError> {
        self.with_auto_refresh(|session| {
            let client = self.client.clone();
            async move {
                let identity_url =
                    format!("{}/services/oauth2/userinfo", session.instance_url);

                let response = client
                    .get(&identity_url)
                    .header("Authorization", format!("Bearer {}", session.access_token))
                    .header("Accept", "application/json")
                    .send()
                    .await
                    .map_err(|e| AppError::Query(format!("Identity request failed: {}", e)))?;

                let body: serde_json::Value = response.json().await.unwrap_or_default();
                let org_id = body["organization_id"]
                    .as_str()
                    .unwrap_or("Salesforce Org");

                Ok(vec![DatabaseMetaData {
                    name: org_id.to_string(),
                    tables: vec![],
                }])
            }
        })
        .await
    }

    /// Retrieves all queryable SObjects as "tables" from the Salesforce org.
    ///
    /// Uses the Global Describe endpoint to list all SObjects, filtering to only those
    /// that are queryable (excludes internal/setup-only objects).
    ///
    /// @param _database - Unused; Salesforce has a single org per connection.
    async fn get_tables(&self, _database: Option<&str>) -> Result<Vec<TableMetaData>, AppError> {
        self.with_auto_refresh(|session| {
            let self_ref = &self;
            async move {
                let path = format!("/services/data/{}/sobjects", SFDC_API_VERSION);
                let body = self_ref.rest_get(&session, &path).await?;

                let tables = body["sobjects"]
                    .as_array()
                    .unwrap_or(&Vec::new())
                    .iter()
                    .filter(|obj| obj["queryable"].as_bool().unwrap_or(false))
                    .filter_map(|obj| {
                        obj["name"].as_str().map(|name| TableMetaData {
                            id: None,
                            name: name.to_string(),
                            columns: vec![],
                        })
                    })
                    .collect();

                Ok(tables)
            }
        })
        .await
    }

    /// Retrieves field metadata for a given SObject using the Salesforce describe API.
    ///
    /// @param table - The SObject API name (e.g., "Account", "Contact", "Lead").
    /// @param _database - Unused; Salesforce has a single org per connection.
    async fn get_columns(
        &self,
        table: &str,
        _database: Option<&str>,
    ) -> Result<Vec<ColumnMetaData>, AppError> {
        let table_owned = table.to_string();

        self.with_auto_refresh(|session| {
            let self_ref = &self;
            let table_ref = table_owned.clone();
            async move {
                let path = format!(
                    "/services/data/{}/sobjects/{}/describe",
                    SFDC_API_VERSION, table_ref
                );
                let body = self_ref.rest_get(&session, &path).await?;

                let columns = body["fields"]
                    .as_array()
                    .unwrap_or(&Vec::new())
                    .iter()
                    .map(|field| {
                        let name = field["name"].as_str().unwrap_or("").to_string();
                        ColumnMetaData {
                            primary_key: if name == "Id" { Some(true) } else { None },
                            allow_null: field["nillable"].as_bool(),
                            comment: field["label"].as_str().map(|s| s.to_string()),
                            col_type: field["type"].as_str().unwrap_or("string").to_string(),
                            name,
                            ..Default::default()
                        }
                    })
                    .collect();

                Ok(columns)
            }
        })
        .await
    }

    /// Executes a query against the Salesforce org.
    ///
    /// Supports two modes:
    /// 1. **SOQL** -- Queries starting with SELECT (read-only, via /query endpoint)
    /// 2. **SOSL** -- Queries starting with FIND (search, via /search endpoint)
    ///
    /// Results have Salesforce `attributes` metadata stripped for cleaner display.
    ///
    /// @param sql - The SOQL or SOSL query string.
    /// @param _database - Unused; table is determined by the query.
    /// @param _table - Unused; table is determined by the query.
    async fn execute(
        &self,
        sql: &str,
        _database: Option<&str>,
        _table: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        let sql_owned = sql.trim().to_string();

        let result = self
            .with_auto_refresh(|session| {
                let self_ref = &self;
                let query = sql_owned.clone();
                async move {
                    let trimmed = query.trim();

                    // Route to the correct API endpoint based on query type
                    let path = if trimmed.to_uppercase().starts_with("FIND") {
                        format!(
                            "/services/data/{}/search/?q={}",
                            SFDC_API_VERSION,
                            urlencoding::encode(trimmed)
                        )
                    } else {
                        format!(
                            "/services/data/{}/query/?q={}",
                            SFDC_API_VERSION,
                            urlencoding::encode(trimmed)
                        )
                    };

                    let body = self_ref.rest_get(&session, &path).await?;

                    // Extract and clean records from the response
                    let records = if let Some(records) = body["records"].as_array() {
                        records
                            .iter()
                            .cloned()
                            .map(clean_salesforce_record)
                            .collect::<Vec<_>>()
                    } else if let Some(search_records) = body["searchRecords"].as_array() {
                        search_records
                            .iter()
                            .cloned()
                            .map(clean_salesforce_record)
                            .collect::<Vec<_>>()
                    } else {
                        vec![]
                    };

                    let meta = serde_json::json!({
                        "totalSize": body["totalSize"].as_i64().unwrap_or(records.len() as i64),
                        "done": body["done"].as_bool().unwrap_or(true),
                    });

                    Ok(QueryResult {
                        ok: true,
                        raw: Some(records),
                        meta: Some(meta),
                        error: None,
                        affected_rows: None,
                    })
                }
            })
            .await;

        match result {
            Ok(qr) => Ok(qr),
            Err(e) => Ok(QueryResult {
                ok: false,
                raw: None,
                meta: None,
                error: Some(serde_json::Value::String(rewrite_sfdc_error(
                    &e.to_string(),
                ))),
                affected_rows: None,
            }),
        }
    }

    /// Disconnects by clearing the cached session token.
    ///
    /// The Salesforce REST API is stateless -- clearing the token prevents reuse.
    async fn disconnect(&mut self) -> Result<(), AppError> {
        self.clear_session().await;
        Ok(())
    }
}

// TODO: Full parity items:
// - JS API mode (conn.sobject().create/update/delete) -- requires a query DSL parser
// - Bulk API support for large data operations
// - Describe metadata caching to reduce API calls
// - OAuth2 Web Server flow (authorization_code grant) for interactive login
// - Refresh token handling for long-lived sessions
// - nextRecordsUrl pagination for queries exceeding 2000 records
