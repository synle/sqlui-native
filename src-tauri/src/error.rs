use thiserror::Error;

/// Application-level error types.
#[derive(Error, Debug)]
pub enum AppError {
    #[error("{0}")]
    General(String),

    #[error("Connection error: {0}")]
    Connection(String),

    #[error("Query execution error: {0}")]
    Query(String),

    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Converts AppError to a serializable string for Tauri command responses.
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Extracts a human-readable error message from any error value.
/// Mirrors the TypeScript `formatErrorMessage()` from `errorUtils.ts`.
pub fn format_error_message(err: &dyn std::fmt::Display, fallback: &str) -> String {
    let msg = err.to_string();
    if msg.is_empty() {
        fallback.to_string()
    } else {
        msg
    }
}
