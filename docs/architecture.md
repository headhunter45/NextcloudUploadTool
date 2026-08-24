# Project Architecture & Developer Setup

This document describes the architectural layout, internal protocols, security model, and developer setup for the **Nextcloud Upload Tool**.

---

## 1. Workspace Layout

The repository is organized as a Cargo workspace with three primary crates:

```
nextcloud-upload-tool/
├── nextcloud_client/         # Shared Rust core library
│   ├── src/
│   │   ├── auth.rs           # Nextcloud Login Flow v2 client & polling
│   │   ├── client.rs         # NextcloudClient WebDAV client & status checks
│   │   ├── config.rs         # ClientConfig and URL normalization
│   │   ├── credentials.rs    # CredentialStore (OS Keychain + accounts.json)
│   │   ├── download.rs       # Direct-download URL generator
│   │   ├── progress.rs       # Async ProgressStream & progress callbacks
│   │   └── sharing.rs        # OCS Sharing API (public share link creation)
├── cli/                      # CLI binary (`nut`)
│   └── src/
│       └── main.rs           # Clap CLI parser, upload handlers, terminal output
├── gui/                      # Desktop application (Tauri v2 + React)
│   ├── src/                  # React + TypeScript frontend
│   │   ├── App.tsx           # UI tabs, drag-and-drop, state management
│   │   └── App.css           # Styling and responsive layout
│   └── src-tauri/            # Tauri Rust backend
│       ├── src/commands.rs   # IPC command handlers forwarding to nextcloud_client
│       └── tauri.conf.json   # Multi-platform bundle configuration
└── docs/                     # Documentation & user guides
```

---

## 2. Shared Core Architecture (`nextcloud_client`)

Both the CLI and GUI frontends share the `nextcloud_client` crate to ensure consistent behavior:

- **WebDAV Upload Pipeline**:
  - Implements HTTP PUT requests against Nextcloud's WebDAV endpoint (`/remote.php/dav/files/<user>/<path>`).
  - Employs streaming request bodies wrapped in a custom `ProgressStream` to capture transferred byte counts in real time without buffering large files in RAM.
  - Automatically handles intermediate remote directory resolution.

- **OCS Sharing API**:
  - Interacts with `/ocs/v2.php/apps/files_sharing/api/v1/shares` using OCS headers (`OCS-APIRequest: true`).
  - Creates public read-only shares (`shareType=3`, `permissions=1`) with optional password protection.
  - Generates canonical public share links (`/index.php/s/<token>`) and direct download links (`/index.php/s/<token>/download`).

- **Unified Credential Storage**:
  - **Keyring Service**: Keyring service identifier `me.majinnaibu.nut`.
  - **Account Metadata**: Stored in `~/.config/nut/accounts.json` containing account IDs, server URLs, usernames, labels, and default account flags.
  - **Secrets**: App passwords and tokens are stored in the OS native keychain (Apple Keychain on macOS, Windows Credential Manager on Windows, and Secret Service on Linux).

---

## 3. GUI Architecture & IPC Bridge

The GUI is built with **Tauri v2** using a lightweight React frontend:
- **Tauri Commands**: Defined in `gui/src-tauri/src/commands.rs` exposing async Rust functions (`upload_file`, `get_accounts`, `login_v2_start`, `login_v2_poll`, `set_default_account`, etc.) to TypeScript.
- **Event Streaming**: As WebDAV uploads progress, the Rust backend emits `upload-progress` events to the Tauri webview containing `file_id`, `bytes_transferred`, `total_bytes`, and `percent`.
- **Drag-and-Drop Integration**: The native OS drag-and-drop listener intercepts dropped files and invokes `get_file_info` to populate the upload queue.

---

## 4. Developer Setup & Testing

### Running Tests
```bash
# Run all unit and integration tests across the workspace
cargo test --workspace

# Run CLI tests only
cargo test -p nut

# Run core library tests only
cargo test -p nextcloud_client
```

### Running GUI in Development Mode
```bash
# In terminal 1: start Vite dev server
cd gui
npm install
npm run dev

# In terminal 2: run Tauri dev desktop app
cargo run -p gui
# Or use Tauri CLI
npm run tauri dev
```
