use url::Url;

use crate::client::NextcloudClient;
use crate::error::{NextcloudError, Result};

/// Minimum permitted length for a Nextcloud share token.
pub const MIN_SHARE_TOKEN_LENGTH: usize = 6;

/// Maximum permitted length for a Nextcloud share token.
pub const MAX_SHARE_TOKEN_LENGTH: usize = 64;

/// Validates that a share token consists only of valid alphanumeric or safe characters (`[a-zA-Z0-9_-]`).
///
/// Returns `Ok(())` if valid, or a [`NextcloudError::Other`] describing the validation failure.
pub fn validate_share_token(token: &str) -> Result<()> {
    let trimmed = token.trim();

    if trimmed.is_empty() {
        return Err(NextcloudError::Other("Share token cannot be empty".into()));
    }

    if trimmed.len() < MIN_SHARE_TOKEN_LENGTH || trimmed.len() > MAX_SHARE_TOKEN_LENGTH {
        return Err(NextcloudError::Other(format!(
            "Invalid share token length ({}): expected between {} and {} characters",
            trimmed.len(),
            MIN_SHARE_TOKEN_LENGTH,
            MAX_SHARE_TOKEN_LENGTH
        )));
    }

    if !trimmed.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-') {
        return Err(NextcloudError::Other(format!(
            "Invalid characters in share token '{token}': tokens must only contain alphanumeric characters, hyphens, or underscores"
        )));
    }

    Ok(())
}

/// Builds a direct download URL for a shared file given a base Nextcloud URL and share token.
///
/// Format: `https://<host>/index.php/s/<token>/download`
pub fn build_direct_download_url(base_url: &Url, share_token: &str) -> Result<Url> {
    validate_share_token(share_token)?;
    let clean_token = share_token.trim();
    let path_segment = format!("index.php/s/{clean_token}/download");
    base_url.join(&path_segment).map_err(NextcloudError::from)
}

/// Builds a direct download URL for a specific file within a shared folder.
///
/// Nextcloud supports downloading an individual file from a shared directory via query parameters:
/// `https://<host>/index.php/s/<token>/download?path=%2F&files=filename.ext`
pub fn build_subfile_download_url(
    base_url: &Url,
    share_token: &str,
    subfile_path: &str,
) -> Result<Url> {
    let mut url = build_direct_download_url(base_url, share_token)?;

    let clean_path = subfile_path.trim_start_matches('/');
    if let Some((dir, file)) = clean_path.rsplit_once('/') {
        let root_dir = format!("/{dir}");
        url.query_pairs_mut()
            .append_pair("path", &root_dir)
            .append_pair("files", file);
    } else {
        url.query_pairs_mut()
            .append_pair("path", "/")
            .append_pair("files", clean_path);
    }

    Ok(url)
}

impl NextcloudClient {
    /// Generate a validated direct download URL from a share token.
    pub fn direct_download_url(&self, share_token: &str) -> Result<Url> {
        build_direct_download_url(&self.config.server_url, share_token)
    }

    /// Generate a validated direct download URL for a specific sub-file in a shared folder.
    pub fn subfile_download_url(&self, share_token: &str, subfile_path: &str) -> Result<Url> {
        build_subfile_download_url(&self.config.server_url, share_token, subfile_path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_tokens() {
        assert!(validate_share_token("AbCdEf123456789").is_ok());
        assert!(validate_share_token("aB1_2-3z").is_ok());
        assert!(validate_share_token("kLx9Q2wP0vN4m1R").is_ok());
    }

    #[test]
    fn test_invalid_tokens() {
        // Empty
        assert!(validate_share_token("").is_err());
        // Too short (< 6 chars)
        assert!(validate_share_token("abc").is_err());
        // Too long (> 64 chars)
        assert!(validate_share_token(&"a".repeat(65)).is_err());
        // Path traversal / slashes
        assert!(validate_share_token("../secret").is_err());
        assert!(validate_share_token("abc/def").is_err());
        // Spaces & query chars
        assert!(validate_share_token("abc def").is_err());
        assert!(validate_share_token("abc?download=1").is_err());
        assert!(validate_share_token("abc#frag").is_err());
    }

    #[test]
    fn test_build_direct_download_url() {
        let base = Url::parse("https://cloud.example.com/").unwrap();
        let download_url = build_direct_download_url(&base, "kLx9Q2wP0vN4m1R").unwrap();

        assert_eq!(
            download_url.as_str(),
            "https://cloud.example.com/index.php/s/kLx9Q2wP0vN4m1R/download"
        );
    }

    #[test]
    fn test_build_subpath_installation() {
        let base = Url::parse("https://example.com/nextcloud/").unwrap();
        let download_url = build_direct_download_url(&base, "kLx9Q2wP0vN4m1R").unwrap();

        assert_eq!(
            download_url.as_str(),
            "https://example.com/nextcloud/index.php/s/kLx9Q2wP0vN4m1R/download"
        );
    }

    #[test]
    fn test_build_subfile_download_url() {
        let base = Url::parse("https://cloud.example.com/").unwrap();
        let subfile_url =
            build_subfile_download_url(&base, "kLx9Q2wP0vN4m1R", "archive/document.pdf").unwrap();

        assert_eq!(
            subfile_url.as_str(),
            "https://cloud.example.com/index.php/s/kLx9Q2wP0vN4m1R/download?path=%2Farchive&files=document.pdf"
        );
    }
}
