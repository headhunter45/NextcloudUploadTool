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

/// Default chunk size for Nextcloud chunked uploads (10 MiB).
pub const NEXTCLOUD_CHUNK_SIZE: usize = 10 * 1024 * 1024;

impl NextcloudClient {
    /// Build the WebDAV uploads base URL for chunked transfers.
    ///
    /// Nextcloud chunked upload endpoint format:
    /// `https://<host>/remote.php/dav/uploads/<username>/<upload_id>/`
    pub fn uploads_url(&self, upload_id: &str) -> Result<url::Url> {
        let username = self.username().ok_or_else(|| {
            NextcloudError::Other("Cannot generate uploads URL without username credentials".into())
        })?;

        let clean_id = upload_id.trim_matches('/');
        let path_segment = format!("remote.php/dav/uploads/{username}/{clean_id}/");

        self.config
            .server_url
            .join(&path_segment)
            .map_err(NextcloudError::from)
    }

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

        // Streaming uploads must not be killed by the standard 30s API timeout
        let mut req = self
            .http
            .put(url)
            .body(body)
            .timeout(std::time::Duration::from_secs(86400));
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
    /// Files larger than [`NEXTCLOUD_CHUNK_SIZE`] (10 MiB) are automatically uploaded
    /// in 10 MiB chunks using Nextcloud's Chunking API.
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

        // Ensure parent directories exist before uploading
        let clean_path = remote_path.trim_start_matches('/');
        if let Some((parent_dir, _)) = clean_path.rsplit_once('/') {
            if !parent_dir.is_empty() {
                self.create_folder_all(parent_dir).await?;
            }
        }

        if total_size > NEXTCLOUD_CHUNK_SIZE as u64 {
            self.upload_file_chunked(local_path, remote_path, total_size, callback)
                .await
        } else {
            let file = tokio::fs::File::open(local_path).await?;
            let stream = ReaderStream::with_capacity(file, DEFAULT_CHUNK_SIZE);

            self.upload_stream(remote_path, stream, Some(total_size), callback)
                .await
        }
    }

    /// Upload a file in 10 MiB chunks using Nextcloud Chunking API.
    pub async fn upload_file_chunked(
        &self,
        local_path: &Path,
        remote_path: &str,
        total_size: u64,
        callback: Option<ProgressCallback>,
    ) -> Result<u64> {
        use tokio::io::AsyncReadExt;

        let upload_id = format!(
            "nut-{}-{:08x}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis(),
            std::process::id()
        );

        let target_url = self.webdav_url(remote_path)?;
        let upload_folder_url = self.uploads_url(&upload_id)?;

        // 1. Create chunked upload directory via MKCOL with Destination header (Chunking v2)
        let mkcol_method = Method::from_bytes(b"MKCOL")
            .map_err(|e| NextcloudError::Other(e.to_string()))?;
        let res = self
            .http
            .request(mkcol_method, upload_folder_url.clone())
            .header("Destination", target_url.as_str())
            .timeout(std::time::Duration::from_secs(60))
            .send()
            .await?;

        let status = res.status();
        if !status.is_success() {
            let err = res.text().await.unwrap_or_default();
            return Err(NextcloudError::ServerError {
                status: status.as_u16(),
                message: format!("Failed to create chunked upload folder: {err}"),
            });
        }

        if let Some(ref cb) = callback {
            cb(crate::progress::ProgressEvent::Started {
                total_bytes: Some(total_size),
            });
        }

        // 2. Upload file in 10 MiB chunks
        let mut file = tokio::fs::File::open(local_path).await?;
        let mut bytes_transferred: u64 = 0;
        let mut chunk_number: usize = 1;

        let upload_result: Result<()> = async {
            let mut buffer = vec![0u8; NEXTCLOUD_CHUNK_SIZE];

            while bytes_transferred < total_size {
                let bytes_to_read = std::cmp::min(
                    NEXTCLOUD_CHUNK_SIZE as u64,
                    total_size - bytes_transferred,
                ) as usize;

                file.read_exact(&mut buffer[..bytes_to_read]).await?;
                let chunk_bytes = Bytes::copy_from_slice(&buffer[..bytes_to_read]);
                let chunk_len = chunk_bytes.len() as u64;

                let chunk_name = format!("{chunk_number:08}");
                let chunk_url = upload_folder_url.join(&chunk_name)?;

                let put_res = self
                    .http
                    .put(chunk_url)
                    .header(CONTENT_LENGTH, chunk_len)
                    .header(reqwest::header::CONTENT_TYPE, "application/octet-stream")
                    .body(chunk_bytes)
                    .timeout(std::time::Duration::from_secs(3600))
                    .send()
                    .await?;

                let put_status = put_res.status();
                if !put_status.is_success() {
                    let err = put_res.text().await.unwrap_or_default();
                    return Err(NextcloudError::ServerError {
                        status: put_status.as_u16(),
                        message: format!("Failed to upload chunk {chunk_number}: {err}"),
                    });
                }

                bytes_transferred += chunk_len;
                chunk_number += 1;

                if let Some(ref cb) = callback {
                    cb(crate::progress::ProgressEvent::Progress {
                        bytes_transferred,
                        total_bytes: Some(total_size),
                    });
                }
            }

            Ok(())
        }.await;

        if let Err(e) = upload_result {
            // Clean up upload directory on error
            let _ = self.http.delete(upload_folder_url).send().await;
            return Err(e);
        }

        // 3. Assemble chunks by moving .file to final destination
        let file_url = upload_folder_url.join(".file")?;
        let target_url = self.webdav_url(remote_path)?;

        let move_method = Method::from_bytes(b"MOVE")
            .map_err(|e| NextcloudError::Other(e.to_string()))?;
        let move_res = self
            .http
            .request(move_method, file_url)
            .header("Destination", target_url.as_str())
            .header("OC-Total-Length", total_size.to_string())
            .header("Overwrite", "T")
            .timeout(std::time::Duration::from_secs(3600))
            .send()
            .await?;

        let move_status = move_res.status();
        if !move_status.is_success() {
            let err = move_res.text().await.unwrap_or_default();
            let _ = self.http.delete(upload_folder_url).send().await;
            return Err(NextcloudError::ServerError {
                status: move_status.as_u16(),
                message: format!("Failed to assemble file at '{remote_path}': {err}"),
            });
        }

        if let Some(ref cb) = callback {
            cb(crate::progress::ProgressEvent::Completed {
                total_bytes: total_size,
            });
        }

        Ok(total_size)
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
