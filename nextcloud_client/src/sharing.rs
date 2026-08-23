use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::client::NextcloudClient;
use crate::error::{NextcloudError, Result};

/// Nextcloud OCS Share Type enumeration.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum ShareType {
    User = 0,
    Group = 1,
    PublicLink = 3,
    Email = 4,
    Federated = 6,
    Circle = 7,
    Room = 10,
}

impl Default for ShareType {
    fn default() -> Self {
        Self::PublicLink
    }
}

/// Request parameters for creating a new share via the Nextcloud OCS API.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CreateShareParams {
    /// Remote path of the file or folder to share (e.g. `"Uploads/photo.jpg"`).
    pub path: String,

    /// Type of share (defaults to `ShareType::PublicLink`).
    pub share_type: ShareType,

    /// Optional password to protect a public share link.
    pub password: Option<String>,

    /// Bitmask permissions (e.g. 1 = Read, 31 = All).
    pub permissions: Option<u32>,

    /// Optional expiration date in `YYYY-MM-DD` format.
    pub expire_date: Option<String>,

    /// Optional note for the recipient.
    pub note: Option<String>,

    /// Optional custom label for public links.
    pub label: Option<String>,
}

impl CreateShareParams {
    /// Create parameters for a public link share.
    pub fn public_link(path: impl Into<String>) -> Self {
        Self {
            path: path.into(),
            share_type: ShareType::PublicLink,
            ..Default::default()
        }
    }

    /// Set an optional password for the public share.
    pub fn with_password(mut self, password: impl Into<String>) -> Self {
        self.password = Some(password.into());
        self
    }

    /// Set an optional expiration date (`YYYY-MM-DD`).
    pub fn with_expire_date(mut self, expire_date: impl Into<String>) -> Self {
        self.expire_date = Some(expire_date.into());
        self
    }
}

/// Metadata returned for an active Nextcloud share.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ShareInfo {
    /// Unique identifier for the share on the Nextcloud instance.
    pub id: String,

    /// Share type (3 = Public Link).
    pub share_type: u8,

    /// Username of the share owner.
    #[serde(default)]
    pub uid_owner: String,

    /// Public URL for the share link (e.g. `https://cloud.example.com/s/XyZ123`).
    #[serde(default)]
    pub url: String,

    /// Unique share token (e.g. `XyZ123`).
    #[serde(default)]
    pub token: String,

    /// Remote path of the shared resource.
    #[serde(default)]
    pub path: String,

    /// Bitmask permissions on the share.
    #[serde(default)]
    pub permissions: u32,

    /// Expiration timestamp or formatted date string if set.
    pub expiration: Option<String>,
}

// Internal OCS envelope format
#[derive(Debug, Deserialize)]
struct OcsEnvelope<T> {
    ocs: OcsPayload<T>,
}

#[derive(Debug, Deserialize)]
struct OcsPayload<T> {
    meta: OcsMeta,
    data: Option<T>,
}

#[derive(Debug, Deserialize)]
struct OcsMeta {
    #[serde(default)]
    status: String,
    statuscode: i32,
    message: Option<String>,
}

impl NextcloudClient {
    /// Create a new share using the Nextcloud OCS Sharing API.
    ///
    /// Endpoint: `POST /ocs/v2.php/apps/files_sharing/api/v1/shares`
    pub async fn create_share(&self, params: CreateShareParams) -> Result<ShareInfo> {
        let shares_url = self.ocs_shares_url()?;

        let mut form = HashMap::new();
        // Ensure path begins with '/' for Nextcloud OCS sharing API
        let normalized_path = if params.path.starts_with('/') {
            params.path
        } else {
            format!("/{}", params.path)
        };

        form.insert("path", normalized_path);
        let share_type_str = (params.share_type as u8).to_string();
        form.insert("shareType", share_type_str);

        if let Some(ref pass) = params.password {
            form.insert("password", pass.clone());
        }
        if let Some(perms) = params.permissions {
            form.insert("permissions", perms.to_string());
        }
        if let Some(ref expire) = params.expire_date {
            form.insert("expireDate", expire.clone());
        }
        if let Some(ref note) = params.note {
            form.insert("note", note.clone());
        }
        if let Some(ref label) = params.label {
            form.insert("label", label.clone());
        }

        let response = self
            .http
            .post(shares_url)
            .form(&form)
            .send()
            .await?
            .error_for_status()?;

        let envelope: OcsEnvelope<ShareInfo> = response.json().await?;

        // OCS statuscode 200 = Success in OCS v2
        if envelope.ocs.meta.statuscode == 200 || envelope.ocs.meta.statuscode == 100 {
            envelope.ocs.data.ok_or_else(|| {
                NextcloudError::Other("OCS API returned success status but missing data payload".into())
            })
        } else {
            Err(NextcloudError::OcsApiError {
                status_code: envelope.ocs.meta.statuscode,
                message: envelope
                    .ocs
                    .meta
                    .message
                    .unwrap_or_else(|| envelope.ocs.meta.status),
            })
        }
    }

    /// Convenience helper to create a public link share for a remote path.
    pub async fn create_public_share(
        &self,
        remote_path: &str,
        password: Option<&str>,
    ) -> Result<ShareInfo> {
        let mut params = CreateShareParams::public_link(remote_path);
        if let Some(pass) = password {
            params = params.with_password(pass);
        }
        self.create_share(params).await
    }

    /// Delete an existing share by share ID.
    ///
    /// Endpoint: `DELETE /ocs/v2.php/apps/files_sharing/api/v1/shares/{id}`
    pub async fn delete_share(&self, share_id: &str) -> Result<()> {
        let delete_path = format!(
            "ocs/v2.php/apps/files_sharing/api/v1/shares/{}?format=json",
            share_id
        );
        let url = self.config.server_url.join(&delete_path)?;

        let response = self.http.delete(url).send().await?.error_for_status()?;

        let envelope: OcsEnvelope<serde_json::Value> = response.json().await?;
        if envelope.ocs.meta.statuscode == 200 || envelope.ocs.meta.statuscode == 100 {
            Ok(())
        } else {
            Err(NextcloudError::OcsApiError {
                status_code: envelope.ocs.meta.statuscode,
                message: envelope
                    .ocs
                    .meta
                    .message
                    .unwrap_or_else(|| envelope.ocs.meta.status),
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ocs_response_deserialization() {
        let sample_ocs_json = r#"{
            "ocs": {
                "meta": {
                    "status": "ok",
                    "statuscode": 200,
                    "message": "OK"
                },
                "data": {
                    "id": "42",
                    "share_type": 3,
                    "uid_owner": "alice",
                    "url": "https://cloud.example.com/s/AbCdEf12345",
                    "token": "AbCdEf12345",
                    "path": "/Uploads/photo.jpg",
                    "permissions": 1,
                    "expiration": null
                }
            }
        }"#;

        let envelope: OcsEnvelope<ShareInfo> = serde_json::from_str(sample_ocs_json).unwrap();
        assert_eq!(envelope.ocs.meta.statuscode, 200);

        let data = envelope.ocs.data.unwrap();
        assert_eq!(data.id, "42");
        assert_eq!(data.token, "AbCdEf12345");
        assert_eq!(data.url, "https://cloud.example.com/s/AbCdEf12345");
        assert_eq!(data.share_type, 3);
        assert_eq!(data.path, "/Uploads/photo.jpg");
    }

    #[test]
    fn test_create_share_params_builder() {
        let params = CreateShareParams::public_link("Documents/report.pdf")
            .with_password("supersecret")
            .with_expire_date("2026-12-31");

        assert_eq!(params.path, "Documents/report.pdf");
        assert_eq!(params.share_type, ShareType::PublicLink);
        assert_eq!(params.password.as_deref(), Some("supersecret"));
        assert_eq!(params.expire_date.as_deref(), Some("2026-12-31"));
    }
}
