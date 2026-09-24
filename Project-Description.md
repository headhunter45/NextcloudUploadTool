# Nextcloud Upload Tool

Nextcloud Upload Tool (`nut`) is a fast, cross-platform command-line tool and desktop GUI for uploading files to Nextcloud and generating direct-download or public share links.

- Built as a Rust workspace with a shared `nextcloud_client` library, CLI, and Tauri desktop GUI.
- Streams uploads over WebDAV with progress reporting, standard-input support, `pv` integration, and Unix pipeline support.
- Uses the Nextcloud OCS Sharing API to create public share links and direct-download URLs, including optional password protection.
- Stores credentials in native operating-system keychains, with an encrypted file fallback.
- Supports multiple Nextcloud accounts and self-hosted instances across the CLI and GUI.
- Provides drag-and-drop uploads, per-file and total progress, retry handling, and browser-based Login Flow v2 in the GUI.
- Includes JSON, TSV, URL-only, and direct-URL-only output modes for automation, plus headless SSH and CI authentication.
- Generates shell completions for Bash, Zsh, Fish, PowerShell, and Elvish.

Repository: https://github.com/majinnaibu/nextcloud-upload-tool

The project is released under the MIT License.
