use thiserror::Error;

/// The central error type for all operations in the Nextcloud client library.
#[derive(Debug, Error)]
pub enum NextcloudError {
    #[error("Invalid URL: {0}")]
    InvalidUrl(#[from] url::ParseError),

    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Authentication failed for user '{username}': {message}")]
    AuthenticationFailed { username: String, message: String },

    #[error("Resource not found at '{path}'")]
    NotFound { path: String },

    #[error("Invalid file path '{path}': {reason}")]
    InvalidPath { path: String, reason: String },

    #[error("Nextcloud server error (HTTP {status}): {message}")]
    ServerError { status: u16, message: String },

    #[error("Nextcloud OCS API error (Code {status_code}): {message}")]
    OcsApiError { status_code: i32, message: String },

    #[error("{0}")]
    Other(String),
}

/// Convenience type alias for `Result<T, NextcloudError>`.
pub type Result<T> = std::result::Result<T, NextcloudError>;
