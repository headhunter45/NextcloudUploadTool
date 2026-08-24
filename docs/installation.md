# Installation Guide

**Nextcloud Upload Tool (`nut`)** is available as a standalone command-line tool and a desktop GUI application across macOS, Windows, and Linux.

---

## 1. Pre-built Binaries & Installers

Download pre-built releases for your operating system from the [Releases](https://github.com/majinnaibu/nextcloud-upload-tool/releases) page.

### macOS (Apple Silicon & Intel)
- **GUI Desktop App**: Download the `.dmg` installer, open it, and drag `Nextcloud Upload Tool.app` into `/Applications`.
- **CLI Binary**:
  ```bash
  # Apple Silicon (M1/M2/M3/M4)
  curl -fsSL https://github.com/majinnaibu/nextcloud-upload-tool/releases/latest/download/nut-aarch64-apple-darwin.tar.gz | tar -xz
  sudo mv nut /usr/local/bin/

  # Intel x86_64
  curl -fsSL https://github.com/majinnaibu/nextcloud-upload-tool/releases/latest/download/nut-x86_64-apple-darwin.tar.gz | tar -xz
  sudo mv nut /usr/local/bin/
  ```

### Linux (Debian, Ubuntu, Fedora, Arch, Generic)
- **Debian / Ubuntu (`.deb`)**:
  ```bash
  sudo dpkg -i nextcloud-upload-tool_0.1.0_amd64.deb
  sudo apt-get install -f
  ```
- **Fedora / RHEL (`.rpm`)**:
  ```bash
  sudo rpm -i nextcloud-upload-tool-0.1.0-1.x86_64.rpm
  ```
- **Universal AppImage**:
  ```bash
  chmod +x Nextcloud_Upload_Tool_0.1.0_amd64.AppImage
  ./Nextcloud_Upload_Tool_0.1.0_amd64.AppImage
  ```
- **Static CLI Binary (musl libc - zero external dependencies)**:
  ```bash
  curl -fsSL https://github.com/majinnaibu/nextcloud-upload-tool/releases/latest/download/nut-x86_64-unknown-linux-musl.tar.gz | tar -xz
  sudo mv nut /usr/local/bin/
  ```

### Windows
- **GUI Installer (`.msi` / NSIS `.exe`)**: Download and run `Nextcloud-Upload-Tool-Setup.exe` or `Nextcloud-Upload-Tool.msi`. Follow the installer wizard.
- **Standalone CLI**: Download `nut-x86_64-pc-windows-msvc.zip`, extract `nut.exe`, and add it to your system `%PATH%`.

---

## 2. Building from Source

### Prerequisites
- **Rust toolchain** (1.75+): Install via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node.js** (v20+) and **npm** (for GUI frontend build)
- **Platform Development Libraries**:
  - **Linux**: `sudo apt-get install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev libssl-dev patchelf`
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: Visual Studio C++ Build Tools

### Build the CLI (`nut`)
```bash
git clone https://github.com/majinnaibu/nextcloud-upload-tool.git
cd nextcloud-upload-tool

cargo build --release -p nut
# The binary is placed at target/release/nut
```

### Build the Desktop GUI
```bash
cd gui
npm install
npm run build
npm run tauri build
# The packaged bundle is located in gui/src-tauri/target/release/bundle/
```
