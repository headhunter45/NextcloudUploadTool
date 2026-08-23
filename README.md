# Nextcloud Upload Tool (`nut`)

A fast, cross-platform CLI tool and desktop GUI application for uploading files to Nextcloud and instantly generating direct download / public share links.

---

## Overview

**Nextcloud Upload Tool** is designed for quick terminal workflows and smooth desktop integration. It allows you to pipe or upload files directly to your Nextcloud instance, securely manage credentials via your OS keychain, and immediately copy shareable links.

### Key Features

- ⚡ **High-Performance Uploads**: WebDAV streaming uploads with real-time progress reporting and pipe support (`stdin`, `pv`).
- 🔗 **Instant Share Links**: Direct integration with Nextcloud's OCS Sharing API to generate public share URLs and direct-download links.
- 🔐 **Secure Credential Storage**: Native OS Keychain integration (macOS Keychain, Windows Credential Manager, Linux Secret Service) with encrypted file fallback.
- 👥 **Multi-Account Support**: Configure and switch between multiple Nextcloud accounts or self-hosted instances seamlessly.
- 🖥️ **CLI & GUI Frontends**: A lightweight terminal binary (`nut`) and a modern desktop application powered by Tauri.

---

## Project Structure

This repository is structured as a Cargo workspace:

```
.
├── nextcloud_client/   # Core Rust backend library (WebDAV, OCS API, Keyring, Config)
├── cli/                # Terminal CLI executable (`nut`)
├── gui/                # Desktop GUI application (Tauri + Web frontend)
├── Tasks.md            # Canonical project roadmap and task tracking
└── README.md
```

---

## Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/) (1.75+ recommended)
- A running [Nextcloud](https://nextcloud.com/) instance with WebDAV and sharing enabled

### Building the Workspace

Clone the repository and build the workspace crates:

```bash
# Build all workspace members
cargo build

# Run the CLI tool
cargo run -p nut -- --help

# Run tests
cargo test --workspace
```

---

## Roadmap & Tasks

Project tasks, feature specifications, and current progress are tracked in [Tasks.md](Tasks.md).

---

## License

This project is licensed under the [MIT License](LICENSE).
