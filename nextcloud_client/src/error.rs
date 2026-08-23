use thiserror::Error;

/// Core error type for Nextcloud client operations.
#[derive(Error, Debug)]
pub enum NextcloudError {
    #[error("Invalid URL: {0}")]
    InvalidUrl(#[from] url::ParseError),

    #[error("HTTP request error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Authentication failed for user '{username}': {message}")]
    AuthenticationFailed { username: String, message: String },

    #[error("Resource not found at '{path}'")]
    NotFound { path: String },

    #[error("Server error ({status}): {message}")]
    ServerError { status: u16, message: String },

    #[error("Nextcloud OCS API error (code {status_code}): {message}")]
    OcsApiError {
        status_code: i32,
        message: String,
    },

    #[error("Invalid path '{path}': {reason}")]
    InvalidPath { path: String, reason: String },

    #[error("Unexpected error: {0}")]
    Other(String),
}

/// Convenience alias for `Result<T, NextcloudError>`.
pub type Result<T> = std::result::Result<T, NextcloudError>;
