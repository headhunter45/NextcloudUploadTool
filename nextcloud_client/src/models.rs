use serde::{Deserialize, Serialize};

/// High-level options for uploading a file to Nextcloud.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadOptions {
    /// Remote directory or full path on Nextcloud (e.g. `"Uploads/"` or `"Photos/sample.png"`).
    pub remote_path: String,

    /// Whether to automatically create a public share link after upload.
    pub create_share: bool,

    /// Optional password for the generated public share link.
    pub share_password: Option<String>,

    /// Whether to overwrite existing files at the target path.
    pub overwrite: bool,
}

impl Default for UploadOptions {
    fn default() -> Self {
        Self {
            remote_path: String::new(),
            create_share: false,
            share_password: None,
            overwrite: true,
        }
    }
}

impl UploadOptions {
    pub fn new(remote_path: impl Into<String>) -> Self {
        Self {
            remote_path: remote_path.into(),
            ..Default::default()
        }
    }

    pub fn with_share(mut self, create_share: bool) -> Self {
        self.create_share = create_share;
        self
    }

    pub fn with_share_password(mut self, password: impl Into<String>) -> Self {
        self.share_password = Some(password.into());
        self.create_share = true;
        self
    }
}

/// Result returned from a successful file upload operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadResult {
    /// The final remote path of the uploaded file on the Nextcloud instance.
    pub remote_path: String,

    /// Total number of bytes transferred.
    pub bytes_uploaded: u64,

    /// Public share URL if a share link was requested (e.g. `https://cloud.example.com/s/XyZ123`).
    pub share_url: Option<String>,

    /// Direct download link if a share link was requested (e.g. `https://cloud.example.com/index.php/s/XyZ123/download`).
    pub direct_download_url: Option<String>,
}
