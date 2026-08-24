use bytes::Bytes;
use futures_util::Stream;
use reqwest::header::CONTENT_LENGTH;
use reqwest::Method;
use std::path::Path;
use tokio::io::AsyncRead;
use tokio_util::io::ReaderStream;

use crate::client::NextcloudClient;
use crate::error::{NextcloudError, Result};
use crate::progress::{ProgressCallback, ProgressStream};

/// Default buffer size for streaming file uploads (64 KiB).
pub const DEFAULT_CHUNK_SIZE: usize = 64 * 1024;

impl NextcloudClient {
    /// Upload a stream of bytes to a Nextcloud WebDAV destination with optional progress reporting.
    /// Automatically ensures any parent directories exist before uploading.
    ///
    /// # Arguments
    /// * `remote_path` - The destination path on Nextcloud (e.g. `"Uploads/photo.jpg"`).
    /// * `stream` - An async stream yielding chunks of bytes.
    /// * `content_length` - The total size of the stream in bytes, if known.
    /// * `callback` - Optional callback invoked as byte chunks are transferred.
    pub async fn upload_stream<S, E>(
        &self,
        remote_path: &str,
        stream: S,
        content_length: Option<u64>,
        callback: Option<ProgressCallback>,
    ) -> Result<u64>
    where
        S: Stream<Item = std::result::Result<Bytes, E>> + Send + Sync + 'static,
        E: Into<Box<dyn std::error::Error + Send + Sync>> + 'static,
    {
        // Ensure parent directories exist
        let clean_path = remote_path.trim_start_matches('/');
        if let Some((parent_dir, _)) = clean_path.rsplit_once('/') {
            if !parent_dir.is_empty() {
                self.create_folder_all(parent_dir).await?;
            }
        }

        let url = self.webdav_url(remote_path)?;
        let progress_stream = ProgressStream::new(stream, content_length, callback);
        let body = reqwest::Body::wrap_stream(progress_stream);

        let mut req = self.http.put(url).body(body);
        if let Some(len) = content_length {
            req = req.header(CONTENT_LENGTH, len);
        }

        let response = req.send().await?;
        let status = response.status();

        if status.is_success() {
            // 200 OK, 201 Created, or 204 No Content
            Ok(content_length.unwrap_or(0))
        } else if status == reqwest::StatusCode::UNAUTHORIZED {
            Err(NextcloudError::AuthenticationFailed {
                username: self.username().unwrap_or("unknown").to_string(),
                message: "Invalid credentials or unauthorized WebDAV access".to_string(),
            })
        } else if status == reqwest::StatusCode::NOT_FOUND {
            Err(NextcloudError::NotFound {
                path: remote_path.to_string(),
            })
        } else if status == reqwest::StatusCode::CONFLICT {
            Err(NextcloudError::Other(format!(
                "WebDAV Conflict (409) at '{remote_path}'. Ensure the destination directory exists."
            )))
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(NextcloudError::ServerError {
                status: status.as_u16(),
                message: error_text,
            })
        }
    }

    /// Upload a local file from disk to Nextcloud WebDAV.
    ///
    /// # Arguments
    /// * `local_path` - Path to the local file to read and upload.
    /// * `remote_path` - The destination path on Nextcloud.
    /// * `callback` - Optional callback for real-time upload progress.
    pub async fn upload_file<P: AsRef<Path>>(
        &self,
        local_path: P,
        remote_path: &str,
        callback: Option<ProgressCallback>,
    ) -> Result<u64> {
        let local_path = local_path.as_ref();
        let metadata = tokio::fs::metadata(local_path).await?;

        if !metadata.is_file() {
            return Err(NextcloudError::InvalidPath {
                path: local_path.display().to_string(),
                reason: "Specified path is not a file".to_string(),
            });
        }

        let total_size = metadata.len();
        let file = tokio::fs::File::open(local_path).await?;
        let stream = ReaderStream::with_capacity(file, DEFAULT_CHUNK_SIZE);

        self.upload_stream(remote_path, stream, Some(total_size), callback)
            .await
    }

    /// Upload data from any async reader (e.g. standard input `tokio::io::stdin()`).
    ///
    /// # Arguments
    /// * `reader` - An async reader implementing [`AsyncRead`].
    /// * `remote_path` - The destination path on Nextcloud.
    /// * `total_size` - Known byte size, or `None` for chunked transfer.
    /// * `callback` - Optional callback for upload progress.
    pub async fn upload_reader<R>(
        &self,
        reader: R,
        remote_path: &str,
        total_size: Option<u64>,
        callback: Option<ProgressCallback>,
    ) -> Result<u64>
    where
        R: AsyncRead + Send + Sync + 'static,
    {
        let stream = ReaderStream::with_capacity(reader, DEFAULT_CHUNK_SIZE);
        self.upload_stream(remote_path, stream, total_size, callback)
            .await
    }

    /// Create a remote directory using the WebDAV `MKCOL` method.
    ///
    /// Returns `Ok(())` if the directory was created (201) or already exists (405).
    pub async fn create_folder(&self, remote_dir: &str) -> Result<()> {
        let url = self.webdav_url(remote_dir)?;
        let mkcol_method = Method::from_bytes(b"MKCOL")
            .map_err(|e| NextcloudError::Other(e.to_string()))?;

        let response = self.http.request(mkcol_method, url).send().await?;
        let status = response.status();

        // 201 Created = success
        // 405 Method Not Allowed = directory already exists in WebDAV
        if status.is_success() || status == reqwest::StatusCode::METHOD_NOT_ALLOWED {
            Ok(())
        } else if status == reqwest::StatusCode::UNAUTHORIZED {
            Err(NextcloudError::AuthenticationFailed {
                username: self.username().unwrap_or("unknown").to_string(),
                message: "Unauthorized to create folder".to_string(),
            })
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(NextcloudError::ServerError {
                status: status.as_u16(),
                message: error_text,
            })
        }
    }

    /// Recursively ensure all parent and subdirectories exist using WebDAV `MKCOL`.
    pub async fn create_folder_all(&self, remote_dir: &str) -> Result<()> {
        let clean = remote_dir.trim_matches('/');
        if clean.is_empty() {
            return Ok(());
        }

        let mut current_path = String::new();
        for segment in clean.split('/') {
            if segment.is_empty() {
                continue;
            }
            if !current_path.is_empty() {
                current_path.push('/');
            }
            current_path.push_str(segment);
            self.create_folder(&current_path).await?;
        }
        Ok(())
    }
}
