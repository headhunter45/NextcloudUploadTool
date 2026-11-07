# Package Manager Manifests

This directory contains distribution manifests for installing **Nextcloud Upload Tool (`nut`)** via platform package managers:

| Directory | Package Manager | Targets |
|---|---|---|
| [`homebrew/Formula/nut.rb`](./homebrew/Formula/nut.rb) | Homebrew Formula | macOS (`arm64`, `x86_64`) & Linux (`arm64`, `x86_64`) CLI + shell completions |
| [`homebrew/Casks/nextcloud-upload-tool.rb`](./homebrew/Casks/nextcloud-upload-tool.rb) | Homebrew Cask | macOS Desktop GUI (`.app` / `.dmg`) |
| [`winget/`](./winget/) | Windows Package Manager (`winget`) | Windows `x64` CLI (`.zip`) & Desktop GUI installer (`.exe`) |
| [`chocolatey/`](./chocolatey/) | Chocolatey (`choco`) | Windows `x64` CLI (`nut.exe`) |
| [`aur/`](./aur/) | Arch User Repository (`PKGBUILD` & `.SRCINFO`) | Arch Linux (`x86_64`, `aarch64`) CLI + shell completions |

## Updating Version and Checksums

When publishing a new release, run [`scripts/update-manifests.sh`](../scripts/update-manifests.sh) with the release version and `SHA256SUMS` file:

```bash
./scripts/update-manifests.sh 0.1.0 path/to/SHA256SUMS
```

