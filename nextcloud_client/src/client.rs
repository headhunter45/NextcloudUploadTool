use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, USER_AGENT};
use serde::{Deserialize, Serialize};
use url::Url;

use crate::config::ClientConfig;
use crate::error::{NextcloudError, Result};

/// Response payload from Nextcloud's `/status.php` endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStatus {
    pub installed: bool,
    pub maintenance: bool,
    pub version: String,

    #[serde(rename = "versionstring")]
    pub version_string: String,

    pub edition: String,

    #[serde(rename = "productname", default)]
    pub product_name: Option<String>,
}

/// The core Nextcloud client instance.
#[derive(Debug, Clone)]
pub struct NextcloudClient {
    pub(crate) config: ClientConfig,
    pub(crate) http: reqwest::Client,
}

impl NextcloudClient {
    /// Create a new `NextcloudClient` from a [`ClientConfig`].
    pub fn new(config: ClientConfig) -> Result<Self> {
        let mut headers = HeaderMap::new();

        // Set User-Agent
        headers.insert(
            USER_AGENT,
            HeaderValue::from_str(&config.user_agent)
                .map_err(|e| NextcloudError::Other(e.to_string()))?,
        );

        // Set Basic Auth header if credentials are provided
        if let Some(ref creds) = config.credentials {
            use reqwest::header::HeaderValue;
            let raw_auth = format!("{}:{}", creds.username, creds.app_password);
            let encoded = base64_encode(raw_auth.as_bytes());
            let mut auth_val = HeaderValue::from_str(&format!("Basic {encoded}"))
                .map_err(|e| NextcloudError::Other(e.to_string()))?;
            auth_val.set_sensitive(true);
            headers.insert(AUTHORIZATION, auth_val);
        }

        // Standard Nextcloud OCS headers for JSON responses
        headers.insert("OCS-APIRequest", HeaderValue::from_static("true"));

        let http = reqwest::Client::builder()
            .default_headers(headers)
            .timeout(config.timeout)
            .build()?;

        Ok(Self { config, http })
    }

    /// Reference to the underlying client configuration.
    pub fn config(&self) -> &ClientConfig {
        &self.config
    }

    /// Access the underlying `reqwest::Client` for raw HTTP operations.
    pub fn http(&self) -> &reqwest::Client {
        &self.http
    }

    /// Nextcloud username configured for this client (if any).
    pub fn username(&self) -> Option<&str> {
        self.config.credentials.as_ref().map(|c| c.username.as_str())
    }

    /// Build the full WebDAV URL for a given remote file path.
    ///
    /// Nextcloud WebDAV endpoint format:
    /// `https://<host>/remote.php/dav/files/<username>/<path>`
    pub fn webdav_url(&self, remote_path: &str) -> Result<Url> {
        let username = self.username().ok_or_else(|| {
            NextcloudError::Other("Cannot generate WebDAV URL without username credentials".into())
        })?;

        let clean_path = remote_path.trim_start_matches('/');
        let path_segment = format!("remote.php/dav/files/{username}/{clean_path}");

        self.config
            .server_url
            .join(&path_segment)
            .map_err(NextcloudError::from)
    }

    /// Build the OCS sharing API URL.
    ///
    /// Nextcloud OCS sharing endpoint:
    /// `https://<host>/ocs/v2.php/apps/files_sharing/api/v1/shares`
    pub fn ocs_shares_url(&self) -> Result<Url> {
        self.config
            .server_url
            .join("ocs/v2.php/apps/files_sharing/api/v1/shares?format=json")
            .map_err(NextcloudError::from)
    }

    /// Build the public download URL from a share token.
    ///
    /// Format: `https://<host>/index.php/s/<token>/download`
    pub fn direct_download_url(&self, share_token: &str) -> Result<Url> {
        let path_segment = format!("index.php/s/{share_token}/download");
        self.config
            .server_url
            .join(&path_segment)
            .map_err(NextcloudError::from)
    }

    /// Check server reachability and retrieve server version info from `/status.php`.
    ///
    /// This endpoint does not require authentication.
    pub async fn check_status(&self) -> Result<ServerStatus> {
        let status_url = self.config.server_url.join("status.php")?;

        let response = self
            .http
            .get(status_url)
            .send()
            .await?
            .error_for_status()?;

        let status = response.json::<ServerStatus>().await?;
        Ok(status)
    }
}

/// Simple Base64 encoder helper avoiding extra external crate dependencies.
fn base64_encode(data: &[u8]) -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);

    for chunk in data.chunks(3) {
        let b0 = chunk[0];
        let b1 = chunk.get(1).copied().unwrap_or(0);
        let b2 = chunk.get(2).copied().unwrap_or(0);

        out.push(CHARSET[(b0 >> 2) as usize] as char);
        out.push(CHARSET[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);

        if chunk.len() > 1 {
            out.push(CHARSET[(((b1 & 0x0F) << 2) | (b2 >> 6)) as usize] as char);
        } else {
            out.push('=');
        }

        if chunk.len() > 2 {
            out.push(CHARSET[(b2 & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::AccountCredentials;

    #[test]
    fn test_webdav_url_builder() {
        let config = ClientConfig::new(
            "https://nextcloud.example.com",
            Some(AccountCredentials::new("bob", "app-pass")),
        )
        .unwrap();

        let client = NextcloudClient::new(config).unwrap();
        let url = client.webdav_url("Documents/test.pdf").unwrap();

        assert_eq!(
            url.as_str(),
            "https://nextcloud.example.com/remote.php/dav/files/bob/Documents/test.pdf"
        );
    }

    #[test]
    fn test_direct_download_url() {
        let config = ClientConfig::new("https://nextcloud.example.com", None).unwrap();
        let client = NextcloudClient::new(config).unwrap();
        let download_url = client.direct_download_url("AbCdEf12345").unwrap();

        assert_eq!(
            download_url.as_str(),
            "https://nextcloud.example.com/index.php/s/AbCdEf12345/download"
        );
    }

    #[test]
    fn test_status_deserialization() {
        let sample_json = r#"{
            "installed": true,
            "maintenance": false,
            "version": "28.0.2.5",
            "versionstring": "28.0.2",
            "edition": "Community",
            "productname": "Nextcloud"
        }"#;

        let status: ServerStatus = serde_json::from_str(sample_json).unwrap();
        assert_eq!(status.version_string, "28.0.2");
        assert_eq!(status.product_name.as_deref(), Some("Nextcloud"));
    }
}
