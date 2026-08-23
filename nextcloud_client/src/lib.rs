//! # Nextcloud Client Library
//!
//! A high-performance, asynchronous Rust library for interacting with Nextcloud's
//! WebDAV file transfer APIs, OCS Sharing API, and credential storage.

pub mod client;
pub mod config;
pub mod error;
pub mod models;
pub mod progress;
pub mod sharing;
pub mod webdav;

// Convenient top-level re-exports
pub use client::{NextcloudClient, ServerStatus};
pub use config::{AccountCredentials, ClientConfig};
pub use error::{NextcloudError, Result};
pub use models::{UploadOptions, UploadResult};
pub use progress::{ProgressCallback, ProgressEvent};
pub use sharing::{CreateShareParams, ShareInfo, ShareType};
