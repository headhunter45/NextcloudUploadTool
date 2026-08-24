# Nextcloud Upload Tool (`nut`)

[![CI](https://github.com/majinnaibu/nextcloud-upload-tool/actions/workflows/ci.yml/badge.svg)](https://github.com/majinnaibu/nextcloud-upload-tool/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A fast, cross-platform CLI tool and desktop GUI application for uploading files to Nextcloud and instantly generating direct download / public share links.

---

## Key Features

- ⚡ **High-Performance Uploads**: WebDAV streaming uploads with real-time progress reporting and pipe support (`stdin`, `pv`, Unix pipelines).
- 🔗 **Instant Share Links**: Direct integration with Nextcloud's OCS Sharing API to generate public share URLs and direct-download links with optional password protection.
- 🔐 **Secure Credential Storage**: Native OS Keychain integration (macOS Keychain, Windows Credential Manager, Linux Secret Service) with encrypted file fallback.
- 👥 **Multi-Account Support**: Configure and switch between multiple Nextcloud accounts or self-hosted instances seamlessly across CLI and GUI.
- 🖥️ **Modern Desktop GUI**: Drag-and-drop queue management, per-file & total progress bars, retry handling, and browser-based Login Flow v2.
- 🤖 **Automation Ready**: Output formatting options (`--json`, `--tsv`, `--url-only`, `--direct-url-only`) and headless SSH / CI authentication.
- 🐚 **Shell Completions**: First-class completion scripts for `bash`, `zsh`, `fish`, `powershell`, and `elvish`.

---

## Documentation

- 📖 **[CLI Reference](docs/cli-reference.md)**: Full syntax, subcommands (`login`, `upload`, `accounts`, `completions`), and options reference.
- 💡 **[Automation & Scripting Recipes](docs/automation-recipes.md)**: Real-world examples for pipelines (`stdin`, `pv`, `mysqldump`, `curl`), `jq` parsing, and CI/CD workflows.
- 📦 **[Installation Guide](docs/installation.md)**: Pre-built binaries, packages (`.dmg`, `.deb`, `.rpm`, `.msi`, `.AppImage`), and source compilation instructions.
- 🖥️ **[GUI User Guide](docs/gui-guide.md)**: Walkthrough of the desktop app, drag-and-drop queue, retry mechanics, and account management.
- 👥 **[Multi-Account Guide](docs/multi-account.md)**: Managing multiple servers, switching active defaults, and CLI/GUI token sharing.
- 🏗️ **[Architecture & Developer Guide](docs/architecture.md)**: Workspace layout, WebDAV/OCS protocol implementation, and Tauri IPC bridge.

---

## Quick Start

### 1. CLI Usage

#### Connect your Nextcloud account:
```bash
# Interactive Login Flow v2 (opens browser):
nut login https://cloud.example.com --label "Work"

# Headless SSH authorization (prints URL in terminal):
nut login https://cloud.example.com --no-browser --label "Server"

# Or connect interactively via terminal prompt:
nut login https://cloud.example.com --manual

# Or non-interactive / CI automated script:
nut login https://cloud.example.com -u alice -p "app-password"
```

#### Upload files and generate share links:
```bash
# Upload a single file and generate a public share link:
nut upload -s document.pdf

# Upload multiple files into a remote folder:
nut upload -s -d "Projects/2026" file1.png file2.png

# Upload recursively:
nut upload -s -r assets/

# Stream from standard input (e.g. backup pipes):
tar -czf - data/ | nut upload -s --stdin --filename "backup.tar.gz"

# Output only the share link (ideal for scripts and clipboard pipes):
nut upload -s --url-only report.pdf | pbcopy
```

#### Shell Completions:
```bash
# Generate shell completions (e.g. Zsh)
nut completions zsh > ~/.zfunc/_nut
```

#### Manage multiple accounts:
```bash
# List all accounts:
nut accounts

# Switch default active account:
nut account default "Work"

# Upload to a specific account:
nut upload --account "Personal" photo.jpg
```

---

### 2. GUI Usage

Launch the desktop app via `nut-gui` or from your system applications menu. Drag and drop any files into the window, configure your remote destination folder, toggle public share link creation, and click **Upload All**.

---

## Project Structure

```
.
├── nextcloud_client/         # Core Rust backend library (WebDAV, OCS API, Keyring, Config)
├── cli/                      # Terminal CLI executable (`nut`)
├── gui/                      # Desktop GUI application (Tauri v2 + React frontend)
├── docs/                     # Detailed guides and developer documentation
├── scripts/                  # Packaging and build helper scripts
├── Tasks.md                  # Canonical project roadmap and task tracking
└── README.md
```

---

## License

This project is licensed under the [MIT License](LICENSE).
