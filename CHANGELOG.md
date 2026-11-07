# Changelog — v0.1.0

Initial release of **Nextcloud Upload Tool (`nut`)**, a fast cross-platform CLI and desktop GUI application for uploading files to Nextcloud and generating instant share and direct-download links.

## Highlights

### Core & Protocol (`nextcloud_client`)
- **Streaming WebDAV Uploads**: Asynchronous streaming file and `stdin` uploads with real-time byte transfer progress callbacks.
- **OCS Share Link Generation**: Automatic creation of public share links (`/ocs/v2.php/apps/files_sharing/api/v1/shares`) with optional password protection and expiration dates.
- **Direct Download URLs**: Instant generation of direct download links (`/index.php/s/<token>/download`) from share tokens.
- **Secure Credential Storage**: Native OS keychain integration (macOS Keychain, Windows Credential Manager, Linux Secret Service / D-Bus) with encrypted config fallback.
- **Multi-Account Management**: Store, list, switch default, and target multiple Nextcloud accounts seamlessly across both CLI and GUI.

### Command-Line Interface (`nut`)
- **Flexible Authentication**:
  - Interactive browser login via Nextcloud **Login Flow v2** (`nut login <url>`).
  - Headless & SSH support (`--no-browser`, `--manual` interactive prompt, and non-interactive `--username` / `--app-password` flags).
- **Single, Batch & Recursive Uploads**: Upload multiple files, glob patterns, and recursive directory trees (`--recursive` / `-r`) with `--continue-on-error`.
- **Unix Pipeline & `pv` Support**: Stream directly from `stdin` (`--stdin`, `--filename`, `--size`) with automatic TTY detection so piped output stays clean.
- **Automation-Ready Output**: Format results as `--json`, `--tsv`, `--url-only`, `--direct-url-only`, or `--quiet`.
- **Shell Completions**: Built-in completion script generation (`nut completions <bash|zsh|fish|powershell|elvish>`).

### Desktop GUI (`nut-gui`)
- **Tauri v2 + React Application**: Native desktop experience across macOS (`.dmg` / `.app`), Linux (`.deb` / `.rpm` / `.AppImage`), and Windows (`.msi` / `.exe`).
- **Drag-and-Drop Upload Queue**: Queue multiple files, reorder or remove items, and monitor per-file and aggregate progress bars.
- **One-Click Share & Copy**: Toggle public share creation and password protection, and copy share or direct-download links with one click.
- **Account Switcher & Login UI**: Manage multiple Nextcloud accounts with one-click browser Login Flow v2 or manual app-password entry.

