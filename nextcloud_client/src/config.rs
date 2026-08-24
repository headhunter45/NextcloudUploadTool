use serde::{Deserialize, Serialize};
use std::time::Duration;
use url::Url;

use crate::error::{NextcloudError, Result};

/// Default request timeout for API calls (excluding long streaming uploads).
pub const DEFAULT_TIMEOUT_SECS: u64 = 30;

/// Default User-Agent header string.
pub const DEFAULT_USER_AGENT: &str = "NextcloudUploadTool/0.1.0 (Rust)";

/// Credentials used to authenticate against a Nextcloud instance.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AccountCredentials {
    pub username: String,
    pub app_password: String,
}

impl AccountCredentials {
    pub fn new(username: impl Into<String>, app_password: impl Into<String>) -> Self {
        Self {
            username: username.into(),
            app_password: app_password.into(),
        }
    }
}

/// Configuration settings for connecting to a Nextcloud server.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientConfig {
    /// Base URL of the Nextcloud instance (e.g. `https://cloud.example.com`).
    pub server_url: Url,

    /// User authentication credentials.
    pub credentials: Option<AccountCredentials>,

    /// Request timeout for standard API calls.
    #[serde(with = "humantime_serde", default = "default_timeout")]
    pub timeout: Duration,

    /// Custom User-Agent header.
    pub user_agent: String,
}

fn default_timeout() -> Duration {
    Duration::from_secs(DEFAULT_TIMEOUT_SECS)
}

// Simple serde helper for duration if humantime_serde is not pulled in
mod humantime_serde {
    use serde::{Deserialize, Deserializer, Serializer};
    use std::time::Duration;

    pub fn serialize<S>(duration: &Duration, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_u64(duration.as_secs())
    }

    pub fn deserialize<'de, D>(deserializer: D) -> std::result::Result<Duration, D::Error>
    where
        D: Deserializer<'de>,
    {
        let secs = u64::deserialize(deserializer)?;
        Ok(Duration::from_secs(secs))
    }
}

impl ClientConfig {
    /// Normalize a server URL string: validates http/https scheme and ensures a trailing slash.
    pub fn normalize_url(server_url_str: &str) -> Result<Url> {
        let mut server_url = Url::parse(server_url_str)?;

        // Ensure scheme is http or https
        if server_url.scheme() != "http" && server_url.scheme() != "https" {
            return Err(NextcloudError::Other(format!(
                "Unsupported URL scheme '{}'. Must be http or https.",
                server_url.scheme()
            )));
        }

        // Ensure the path has a trailing slash for reliable path joining
        if !server_url.path().ends_with('/') {
            let new_path = format!("{}/", server_url.path());
            server_url.set_path(&new_path);
        }

        Ok(server_url)
    }

    /// Create a new `ClientConfig` by parsing a URL string and optional credentials.
    pub fn new(
        server_url_str: &str,
        credentials: Option<AccountCredentials>,
    ) -> Result<Self> {
        let server_url = Self::normalize_url(server_url_str)?;

        Ok(Self {
            server_url,
            credentials,
            timeout: default_timeout(),
            user_agent: DEFAULT_USER_AGENT.to_string(),
        })
    }

    /// Set a custom request timeout.
    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    /// Set a custom User-Agent.
    pub fn with_user_agent(mut self, user_agent: impl Into<String>) -> Self {
        self.user_agent = user_agent.into();
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_config_creation() {
        let config = ClientConfig::new(
            "https://cloud.example.com",
            Some(AccountCredentials::new("alice", "secret123")),
        )
        .expect("Valid URL should parse");

        assert_eq!(config.server_url.as_str(), "https://cloud.example.com/");
        assert_eq!(config.credentials.as_ref().unwrap().username, "alice");
    }

    #[test]
    fn test_subpath_normalization() {
        let url = ClientConfig::normalize_url("https://disobedient.cloud/nextcloud").unwrap();
        assert_eq!(url.as_str(), "https://disobedient.cloud/nextcloud/");
    }

    #[test]
    fn test_invalid_scheme() {
        let result = ClientConfig::new("ftp://cloud.example.com", None);
        assert!(result.is_err());
    }
}
